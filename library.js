'use strict';

const db = require.main.require('./src/database');
const user = require.main.require('./src/user');
const groups = require.main.require('./src/groups');
const meta = require.main.require('./src/meta');
const notifications = require.main.require('./src/notifications');
const routeHelpers = require.main.require('./src/routes/helpers');
const controllerHelpers = require.main.require('./src/controllers/helpers');
const topics = require.main.require('./src/topics');

const controllers = require('./lib/controllers');

const plugin = {};

plugin.init = async (params) => {
	const { router } = params;
	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/internalnotes', controllers.renderAdminPage);
};

plugin.addRoutes = async ({ router, middleware, helpers }) => {
	const ensurePrivileged = async (req, res, next) => {
		const allowed = await canViewNotes(req.uid);
		if (!allowed) {
			return controllerHelpers.formatApiResponse(403, res, new Error('[[error:no-privileges]]'));
		}
		next();
	};

	// --- Assignment routes (registered before /:noteId to avoid param collision) ---

	routeHelpers.setupApiRoute(router, 'get', '/internalnotes/:tid/assign', [middleware.ensureLoggedIn, ensurePrivileged], async (req, res) => {
		const assignee = await getAssignee(req.params.tid);
		helpers.formatApiResponse(200, res, { assignee });
	});

	routeHelpers.setupApiRoute(router, 'put', '/internalnotes/:tid/assign', [middleware.ensureLoggedIn, ensurePrivileged], async (req, res) => {
		const { type, id } = req.body;
		if (!type || !id) {
			return helpers.formatApiResponse(400, res, new Error('[[error:invalid-data]]'));
		}
		const assignee = await assignTopic(req.params.tid, type, id, req.uid);
		helpers.formatApiResponse(200, res, { assignee });
	});

	routeHelpers.setupApiRoute(router, 'delete', '/internalnotes/:tid/assign', [middleware.ensureLoggedIn, ensurePrivileged], async (req, res) => {
		await unassignTopic(req.params.tid);
		helpers.formatApiResponse(200, res, {});
	});

	// --- Group search route ---

	routeHelpers.setupApiRoute(router, 'get', '/internalnotes/groups/search', [middleware.ensureLoggedIn, ensurePrivileged], async (req, res) => {
		const query = (req.query.query || '').trim();
		if (query.length < 1) {
			return helpers.formatApiResponse(200, res, { groups: [] });
		}
		const groupList = await groups.search(query, { sort: 'count', filterHidden: true });
		const results = groupList
			.filter(g => g && !groups.isPrivilegeGroup(g.name))
			.slice(0, 15)
			.map(g => ({
				name: g.name,
				slug: g.slug,
				memberCount: g.memberCount,
				icon: g.icon || '',
				labelColor: g.labelColor || '',
			}));
		helpers.formatApiResponse(200, res, { groups: results });
	});

	// --- Notes routes ---

	routeHelpers.setupApiRoute(router, 'get', '/internalnotes/:tid', [middleware.ensureLoggedIn, ensurePrivileged], async (req, res) => {
		const notes = await getNotes(req.params.tid);
		helpers.formatApiResponse(200, res, { notes });
	});

	routeHelpers.setupApiRoute(router, 'post', '/internalnotes/:tid', [middleware.ensureLoggedIn, ensurePrivileged], async (req, res) => {
		const { content } = req.body;
		if (!content || !content.trim()) {
			return helpers.formatApiResponse(400, res, new Error('[[error:invalid-data]]'));
		}
		const note = await createNote(req.params.tid, req.uid, content.trim());
		helpers.formatApiResponse(200, res, { note });
	});

	routeHelpers.setupApiRoute(router, 'delete', '/internalnotes/:tid/:noteId', [middleware.ensureLoggedIn, ensurePrivileged], async (req, res) => {
		await deleteNote(req.params.tid, req.params.noteId);
		helpers.formatApiResponse(200, res, {});
	});
};

plugin.addAdminNavigation = (header) => {
	header.plugins.push({
		route: '/plugins/internalnotes',
		icon: 'fa-sticky-note',
		name: 'Internal Notes',
	});
	return header;
};

plugin.addInternalNotesToTopic = async (data) => {
	if (!data || !data.topic) {
		return data;
	}
	const allowed = await canViewNotes(data.uid);
	data.topic.canViewInternalNotes = allowed;
	if (allowed) {
		data.topic.assignee = await getAssignee(data.topic.tid);
		data.topic.internalNoteCount = await db.sortedSetCard(`internalnotes:tid:${data.topic.tid}`);
	}
	return data;
};

plugin.addThreadTools = async (data) => {
	const allowed = await canViewNotes(data.uid);
	if (allowed) {
		data.tools.push({
			title: '[[internalnotes:thread-tool-notes]]',
			class: 'toggle-internal-notes',
			icon: 'fa-sticky-note',
		});
		data.tools.push({
			title: '[[internalnotes:thread-tool-assign]]',
			class: 'assign-topic-user',
			icon: 'fa-user-plus',
		});
	}
	return data;
};

plugin.purgeTopicNotes = async ({ topic }) => {
	if (!topic || !topic.tid) {
		return;
	}
	const tid = topic.tid;
	const noteIds = await db.getSortedSetRange(`internalnotes:tid:${tid}`, 0, -1);
	const keys = noteIds.map(id => `internalnote:${id}`);
	await db.deleteAll(keys);
	await db.delete(`internalnotes:tid:${tid}`);
	await db.deleteObjectFields(`topic:${tid}`, ['assignee', 'assigneeType']);
};

// --- Permission helpers ---

async function canViewNotes(uid) {
	if (parseInt(uid, 10) <= 0) {
		return false;
	}
	const [isAdmin, isGlobalMod] = await Promise.all([
		user.isAdministrator(uid),
		user.isGlobalModerator(uid),
	]);
	if (isAdmin || isGlobalMod) {
		return true;
	}
	const settings = await meta.settings.get('internalnotes');
	if (settings.allowCategoryMods === 'on') {
		const isModOfAny = await user.isModeratorOfAnyCategory(uid);
		return isModOfAny;
	}
	return false;
}

// --- Notes CRUD ---

async function getNotes(tid) {
	const noteIds = await db.getSortedSetRevRange(`internalnotes:tid:${tid}`, 0, -1);
	if (!noteIds.length) {
		return [];
	}
	const keys = noteIds.map(id => `internalnote:${id}`);
	const notes = await db.getObjects(keys);
	const uids = [...new Set(notes.filter(Boolean).map(n => n.uid))];
	const userData = await user.getUsersFields(uids, ['uid', 'username', 'picture', 'userslug']);
	const userMap = {};
	userData.forEach((u) => {
		userMap[u.uid] = u;
	});
	return notes.filter(Boolean).map((note) => ({
		...note,
		user: userMap[note.uid] || {},
		timestampISO: new Date(parseInt(note.timestamp, 10)).toISOString(),
	}));
}

async function createNote(tid, uid, content) {
	const noteId = await db.incrObjectField('global', 'nextInternalNoteId');
	const timestamp = Date.now();
	const note = {
		noteId,
		tid: parseInt(tid, 10),
		uid: parseInt(uid, 10),
		content,
		timestamp,
	};
	await Promise.all([
		db.setObject(`internalnote:${noteId}`, note),
		db.sortedSetAdd(`internalnotes:tid:${tid}`, timestamp, noteId),
	]);
	const userData = await user.getUserFields(uid, ['uid', 'username', 'picture', 'userslug']);
	return {
		...note,
		user: userData,
		timestampISO: new Date(timestamp).toISOString(),
	};
}

async function deleteNote(tid, noteId) {
	await Promise.all([
		db.delete(`internalnote:${noteId}`),
		db.sortedSetRemove(`internalnotes:tid:${tid}`, noteId),
	]);
}

// --- Assignment (user or group) ---

async function assignTopic(tid, type, id, callerUid) {
	if (type === 'user') {
		return assignToUser(tid, id, callerUid);
	}
	if (type === 'group') {
		return assignToGroup(tid, id, callerUid);
	}
	throw new Error('[[error:invalid-data]]');
}

async function assignToUser(tid, assigneeUid, callerUid) {
	const parsedUid = parseInt(assigneeUid, 10);
	if (parsedUid <= 0) {
		await unassignTopic(tid);
		return null;
	}
	const exists = await user.exists(parsedUid);
	if (!exists) {
		throw new Error('[[error:no-user]]');
	}

	await db.setObject(`topic:${tid}`, { assignee: parsedUid, assigneeType: 'user' });

	if (parsedUid !== parseInt(callerUid, 10)) {
		const topicData = await topics.getTopicFields(tid, ['title', 'slug']);
		const notifObj = await notifications.create({
			type: 'topic-assign',
			bodyShort: `[[internalnotes:notif-assigned-user, ${topicData.title}]]`,
			nid: `internalnotes:assign:${tid}:uid:${parsedUid}`,
			from: callerUid,
			path: `/topic/${topicData.slug}`,
			tid: tid,
		});
		if (notifObj) {
			await notifications.push(notifObj, [parsedUid]);
		}
	}

	const userData = await user.getUserFields(parsedUid, ['uid', 'username', 'picture', 'userslug']);
	return { type: 'user', user: userData };
}

async function assignToGroup(tid, groupName, callerUid) {
	if (!groupName) {
		await unassignTopic(tid);
		return null;
	}
	const exists = await groups.exists(groupName);
	if (!exists) {
		throw new Error('[[error:no-group]]');
	}

	await db.setObject(`topic:${tid}`, { assignee: groupName, assigneeType: 'group' });

	const topicData = await topics.getTopicFields(tid, ['title', 'slug']);
	const memberUids = await groups.getMembers(groupName, 0, -1);
	const recipientUids = memberUids.filter(uid => uid !== parseInt(callerUid, 10));
	if (recipientUids.length) {
		const notifObj = await notifications.create({
			type: 'topic-assign',
			bodyShort: `[[internalnotes:notif-assigned-group, ${topicData.title}, ${groupName}]]`,
			nid: `internalnotes:assign:${tid}:group:${groupName}`,
			from: callerUid,
			path: `/topic/${topicData.slug}`,
			tid: tid,
		});
		if (notifObj) {
			await notifications.push(notifObj, recipientUids);
		}
	}

	const groupData = await groups.getGroupFields(groupName, ['name', 'slug', 'memberCount', 'icon', 'labelColor']);
	return { type: 'group', group: groupData };
}

async function unassignTopic(tid) {
	await db.deleteObjectFields(`topic:${tid}`, ['assignee', 'assigneeType']);
}

async function getAssignee(tid) {
	const topicData = await db.getObjectFields(`topic:${tid}`, ['assignee', 'assigneeType']);
	if (!topicData || !topicData.assignee) {
		return null;
	}

	if (topicData.assigneeType === 'group') {
		const exists = await groups.exists(topicData.assignee);
		if (!exists) {
			return null;
		}
		const groupData = await groups.getGroupFields(topicData.assignee, ['name', 'slug', 'memberCount', 'icon', 'labelColor']);
		return { type: 'group', group: groupData };
	}

	const uid = parseInt(topicData.assignee, 10);
	if (uid <= 0) {
		return null;
	}
	const exists = await user.exists(uid);
	if (!exists) {
		return null;
	}
	const userData = await user.getUserFields(uid, ['uid', 'username', 'picture', 'userslug']);
	return { type: 'user', user: userData };
}

module.exports = plugin;
