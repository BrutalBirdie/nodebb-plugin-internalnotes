'use strict';

(async () => {
	const hooks = await app.require('hooks');
	const alerts = await app.require('alerts');
	const api = await app.require('api');
	const translator = await app.require('translator');

	let notesPanel = null;

	function t(key) {
		return new Promise((resolve) => {
			translator.translate('[[internalnotes:' + key + ']]', resolve);
		});
	}

	async function buildNotesPanel() {
		if (notesPanel) {
			notesPanel.remove();
		}

		const [panelTitle, placeholder, addNote] = await Promise.all([
			t('panel-title'),
			t('placeholder'),
			t('add-note'),
		]);

		const panel = document.createElement('div');
		panel.id = 'internal-notes-panel';
		panel.className = 'internal-notes-panel hidden';
		panel.innerHTML = `
			<div class="internal-notes-header">
				<h5><i class="fa fa-sticky-note"></i> ${escapeHtml(panelTitle)}</h5>
				<button class="btn btn-sm btn-link internal-notes-close" title="Close"><i class="fa fa-times"></i></button>
			</div>
			<div class="internal-notes-assignee"></div>
			<div class="internal-notes-list"></div>
			<div class="internal-notes-form">
				<textarea class="form-control internal-notes-input" rows="3" placeholder="${escapeHtml(placeholder)}"></textarea>
				<button class="btn btn-primary btn-sm internal-notes-submit mt-2">${escapeHtml(addNote)}</button>
			</div>
		`;
		document.body.appendChild(panel);
		notesPanel = panel;

		panel.querySelector('.internal-notes-close').addEventListener('click', () => {
			panel.classList.add('hidden');
		});

		panel.querySelector('.internal-notes-submit').addEventListener('click', () => {
			submitNote();
		});

		panel.querySelector('.internal-notes-input').addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
				submitNote();
			}
		});

		return panel;
	}

	function getTid() {
		return ajaxify.data && ajaxify.data.tid;
	}

	// --- Notes ---

	async function submitNote() {
		const tid = getTid();
		if (!tid) {
			return;
		}
		const textarea = notesPanel.querySelector('.internal-notes-input');
		const content = textarea.value.trim();
		if (!content) {
			return;
		}
		try {
			await api.post(`/plugins/internalnotes/${tid}`, { content });
			textarea.value = '';
			await loadNotes(tid);
			alerts.success(await t('note-added'));
		} catch (err) {
			alerts.error(err.message || '[[error:unknown]]');
		}
	}

	async function loadNotes(tid) {
		if (!notesPanel) {
			return;
		}
		try {
			const { notes } = await api.get(`/plugins/internalnotes/${tid}`, {});
			await renderNotes(notes || [], tid);
		} catch (err) {
			const msg = await t('error-loading');
			notesPanel.querySelector('.internal-notes-list').innerHTML =
				'<p class="text-muted p-3">' + escapeHtml(msg) + '</p>';
		}
	}

	async function renderNotes(notes, tid) {
		const list = notesPanel.querySelector('.internal-notes-list');
		const [noNotes, deleteNoteTitle, confirmDelete, noteDeleted] = await Promise.all([
			t('no-notes'),
			t('delete-note'),
			t('confirm-delete'),
			t('note-deleted'),
		]);
		if (!notes.length) {
			list.innerHTML = '<p class="text-muted p-3">' + escapeHtml(noNotes) + '</p>';
			return;
		}
		list.innerHTML = notes.map(note => `
			<div class="internal-note" data-note-id="${note.noteId}">
				<div class="internal-note-meta">
					<img src="${note.user.picture || ''}" class="avatar avatar-xs" alt="" onerror="this.style.display='none'" />
					<strong>${escapeHtml(note.user.username || 'Unknown')}</strong>
					<span class="timeago text-muted" title="${note.timestampISO}">${note.timestampISO}</span>
					<button class="btn btn-xs btn-link text-danger delete-note" data-note-id="${note.noteId}" title="${escapeHtml(deleteNoteTitle)}">
						<i class="fa fa-trash"></i>
					</button>
				</div>
				<div class="internal-note-content">${escapeHtml(note.content)}</div>
			</div>
		`).join('');

		list.querySelectorAll('.delete-note').forEach((btn) => {
			btn.addEventListener('click', async () => {
				const noteId = btn.getAttribute('data-note-id');
				if (confirm(confirmDelete)) {
					try {
						await api.del(`/plugins/internalnotes/${tid}/${noteId}`, {});
						await loadNotes(tid);
						alerts.success(noteDeleted);
					} catch (err) {
						alerts.error(err.message || (await t('error-loading')));
					}
				}
			});
		});

		if (jQuery && jQuery.fn.timeago) {
			jQuery('.internal-note .timeago').timeago();
		}
	}

	// --- Assignee display ---

	async function loadAssignee(tid) {
		if (!notesPanel) {
			return;
		}
		try {
			const { assignee } = await api.get(`/plugins/internalnotes/${tid}/assign`, {});
			await renderAssignee(assignee, tid);
		} catch {
			// silently fail
		}
	}

	async function renderAssignee(assignee, tid) {
		const container = notesPanel.querySelector('.internal-notes-assignee');
		const [notAssigned, assignedTo, unassignTitle, unassigned] = await Promise.all([
			t('not-assigned'),
			t('assigned-to'),
			t('unassign'),
			t('unassigned'),
		]);
		if (!assignee) {
			container.innerHTML = `
				<div class="assignee-info">
					<span class="text-muted"><i class="fa fa-user"></i> ${escapeHtml(notAssigned)}</span>
				</div>
			`;
			return;
		}

		let label;
		if (assignee.type === 'group') {
			const g = assignee.group;
			const icon = g.icon ? `<i class="${escapeHtml(g.icon)}"></i> ` : '';
			label = `${icon}<strong>${escapeHtml(g.name)}</strong> <span class="text-muted">(${g.memberCount} members)</span>`;
		} else {
			const u = assignee.user;
			const pic = u.picture ? `<img src="${u.picture}" class="avatar avatar-xs" alt="" onerror="this.style.display='none'" /> ` : '';
			label = `${pic}<strong>${escapeHtml(u.username)}</strong>`;
		}

		container.innerHTML = `
			<div class="assignee-info">
				<i class="fa ${assignee.type === 'group' ? 'fa-users' : 'fa-user'}"></i>
				${escapeHtml(assignedTo)} ${label}
				<button class="btn btn-xs btn-link text-danger unassign-topic" title="${escapeHtml(unassignTitle)}">
					<i class="fa fa-times"></i>
				</button>
			</div>
		`;
		container.querySelector('.unassign-topic').addEventListener('click', async () => {
			try {
				await api.del(`/plugins/internalnotes/${tid}/assign`, {});
				await loadAssignee(tid);
				alerts.success(unassigned);
			} catch (err) {
				alerts.error(err.message || (await t('error-loading')));
			}
		});
	}

	// --- Assign modal ---

	async function showAssignModal(tid) {
		let selectedType = null;
		let selectedId = null;

		const [
			assignToMyself,
			tabUser,
			tabGroup,
			searchUserPlaceholder,
			searchGroupPlaceholder,
			selectedLabel,
			assignModalTitle,
			cancelLabel,
			assignConfirmLabel,
			selectTargetFirst,
			assignedSuccess,
		] = await Promise.all([
			t('assign-to-myself'),
			t('tab-user'),
			t('tab-group'),
			t('search-user-placeholder'),
			t('search-group-placeholder'),
			t('selected'),
			t('assign-modal-title'),
			t('cancel'),
			t('assign-confirm'),
			t('select-target-first'),
			t('assigned-success'),
		]);

		const bodyHtml = `
			<div class="assign-modal-body">
				<button type="button" class="btn btn-outline-primary w-100 mb-3" id="assign-self-btn">
					<i class="fa fa-hand-pointer-o me-1"></i> ${escapeHtml(assignToMyself)}
				</button>
				<hr />
				<ul class="nav nav-tabs mb-3">
					<li class="nav-item">
						<a href="#" class="nav-link active assign-tab-link" data-pane="pane-user">
							<i class="fa fa-user me-1"></i> ${escapeHtml(tabUser)}
						</a>
					</li>
					<li class="nav-item">
						<a href="#" class="nav-link assign-tab-link" data-pane="pane-group">
							<i class="fa fa-users me-1"></i> ${escapeHtml(tabGroup)}
						</a>
					</li>
				</ul>
				<div id="pane-user" class="assign-tab-pane">
					<div class="mb-3 position-relative">
						<input type="text" class="form-control" id="assign-user-input" placeholder="${escapeHtml(searchUserPlaceholder)}" autocomplete="off" />
						<div id="assign-user-suggestions" class="list-group assign-suggestions"></div>
					</div>
				</div>
				<div id="pane-group" class="assign-tab-pane" style="display:none;">
					<div class="mb-3 position-relative">
						<input type="text" class="form-control" id="assign-group-input" placeholder="${escapeHtml(searchGroupPlaceholder)}" autocomplete="off" />
						<div id="assign-group-suggestions" class="list-group assign-suggestions"></div>
					</div>
				</div>
				<div id="assign-selection" class="alert alert-secondary d-none mt-2">
					<small class="text-muted">${escapeHtml(selectedLabel)}:</small>
					<strong id="assign-selection-label"></strong>
				</div>
			</div>
		`;

		const dialog = bootbox.dialog({
			title: '<i class="fa fa-user-plus me-2"></i> ' + escapeHtml(assignModalTitle),
			message: bodyHtml,
			buttons: {
				cancel: {
					label: cancelLabel,
					className: 'btn-secondary',
				},
				confirm: {
					label: assignConfirmLabel,
					className: 'btn-primary',
					callback: async function () {
						if (!selectedType || !selectedId) {
							alerts.error(selectTargetFirst);
							return false;
						}
						try {
							await api.put(`/plugins/internalnotes/${tid}/assign`, { type: selectedType, id: selectedId });
							await loadAssignee(tid);
							alerts.success(assignedSuccess);
						} catch (err) {
							alerts.error(err.message || (await t('error-loading')));
						}
					},
				},
			},
			onShown: function () {
				const modalEl = dialog[0] || dialog.get(0);

				// Tab switching
				modalEl.querySelectorAll('.assign-tab-link').forEach((link) => {
					link.addEventListener('click', (e) => {
						e.preventDefault();
						const targetPane = link.getAttribute('data-pane');
						modalEl.querySelectorAll('.assign-tab-link').forEach(l => l.classList.remove('active'));
						link.classList.add('active');
						modalEl.querySelectorAll('.assign-tab-pane').forEach(p => { p.style.display = 'none'; });
						const pane = modalEl.querySelector('#' + targetPane);
						if (pane) {
							pane.style.display = '';
						}
					});
				});

				function setSelection(type, id, displayLabel) {
					selectedType = type;
					selectedId = id;
					const label = modalEl.querySelector('#assign-selection-label');
					const box = modalEl.querySelector('#assign-selection');
					if (label) {
						label.textContent = displayLabel;
					}
					if (box) {
						box.classList.remove('d-none');
					}
				}

				// "Assign to myself"
				const selfBtn = modalEl.querySelector('#assign-self-btn');
				if (selfBtn) {
					selfBtn.addEventListener('click', async () => {
						try {
							await api.put(`/plugins/internalnotes/${tid}/assign`, { type: 'user', id: app.user.uid });
							dialog.modal('hide');
							await loadAssignee(tid);
							alerts.success(assignedSuccess);
						} catch (err) {
							alerts.error(err.message || (await t('error-loading')));
						}
					});
				}

				// User search
				setupSearchInput(
					modalEl.querySelector('#assign-user-input'),
					modalEl.querySelector('#assign-user-suggestions'),
					async (query) => {
						const result = await api.get(`/api/users`, { query, section: 'sort-posts' });
						return (result && result.users ? result.users : []).slice(0, 10).map(u => ({
							id: u.uid,
							label: u.username,
							picture: u.picture || '',
							icon: null,
						}));
					},
					(item) => {
						setSelection('user', item.id, item.label);
					}
				);

				// Group search
				setupSearchInput(
					modalEl.querySelector('#assign-group-input'),
					modalEl.querySelector('#assign-group-suggestions'),
					async (query) => {
						const result = await api.get(`/plugins/internalnotes/groups/search`, { query });
						return (result && result.groups ? result.groups : []).map(g => ({
							id: g.name,
							label: g.name,
							picture: '',
							icon: g.icon || 'fa-users',
							memberCount: g.memberCount,
						}));
					},
					(item) => {
						setSelection('group', item.id, item.label);
					}
				);
			},
		});
	}

	function setupSearchInput(input, suggestionsContainer, searchFn, onSelect) {
		let debounceTimer;
		input.addEventListener('input', () => {
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(async () => {
				const query = input.value.trim();
				if (query.length < 2) {
					suggestionsContainer.innerHTML = '';
					return;
				}
				try {
					const items = await searchFn(query);
					suggestionsContainer.innerHTML = items.map(item => {
						let visual;
						if (item.icon) {
							visual = `<i class="fa ${escapeHtml(item.icon)} me-2"></i>`;
						} else if (item.picture) {
							visual = `<img src="${item.picture}" class="avatar avatar-xs me-2" alt="" onerror="this.style.display='none'" />`;
						} else {
							visual = '';
						}
						const extra = item.memberCount !== undefined ? ` <span class="text-muted">(${item.memberCount})</span>` : '';
						return `
							<button type="button" class="list-group-item list-group-item-action suggestion-item" data-id="${escapeHtml(String(item.id))}">
								${visual}${escapeHtml(item.label)}${extra}
							</button>
						`;
					}).join('');
					suggestionsContainer.querySelectorAll('.suggestion-item').forEach((el) => {
						el.addEventListener('click', () => {
							const id = el.getAttribute('data-id');
							const matchedItem = items.find(i => String(i.id) === id);
							if (matchedItem) {
								input.value = matchedItem.label;
								suggestionsContainer.innerHTML = '';
								onSelect(matchedItem);
							}
						});
					});
				} catch {
					suggestionsContainer.innerHTML = '';
				}
			}, 300);
		});
	}

	// --- Helpers ---

	function escapeHtml(str) {
		const div = document.createElement('div');
		div.textContent = str;
		return div.innerHTML;
	}

	async function openNotesPanel() {
		const tid = getTid();
		if (!tid) {
			return;
		}
		if (!notesPanel) {
			notesPanel = await buildNotesPanel();
		}
		notesPanel.classList.remove('hidden');
		await loadNotes(tid);
		await loadAssignee(tid);
	}

	// --- Page lifecycle ---

	hooks.on('action:ajaxify.end', () => {
		const tid = getTid();
		if (!tid) {
			if (notesPanel) {
				notesPanel.classList.add('hidden');
			}
			return;
		}
		if (ajaxify.data.canViewInternalNotes) {
			renderBadges();
		}
	});

	async function renderBadges() {
		const tid = getTid();
		if (!tid) {
			return;
		}

		const existingBadge = document.getElementById('internal-notes-badge');
		if (existingBadge) {
			existingBadge.remove();
		}
		const existingAssigneeBadge = document.getElementById('assignee-badge');
		if (existingAssigneeBadge) {
			existingAssigneeBadge.remove();
		}

		// Target the topic title in main content only (not the site title in header)
		const topicTitle = document.querySelector('#content [component="topic/title"]') ||
			document.querySelector('#content .topic-title') ||
			document.querySelector('[component="topic/header"] [component="topic/title"]') ||
			document.querySelector('[component="topic/header"] .topic-title') ||
			document.querySelector('#content [component="topic/header"]');

		// Prefer the title's container so the badge sits next to the title text
		const badgeContainer = topicTitle && topicTitle.classList && topicTitle.classList.contains('topic-title')
			? topicTitle
			: topicTitle && topicTitle.parentElement && topicTitle.parentElement.classList.contains('topic-title')
				? topicTitle.parentElement
				: topicTitle;

		if (badgeContainer && ajaxify.data.internalNoteCount > 0) {
			const badge = document.createElement('span');
			badge.id = 'internal-notes-badge';
			badge.className = 'badge bg-warning text-dark ms-2 internal-notes-badge';
			badge.style.cursor = 'pointer';
			badge.innerHTML = `<i class="fa fa-sticky-note"></i> ${ajaxify.data.internalNoteCount}`;
			badge.addEventListener('click', openNotesPanel);
			badgeContainer.appendChild(badge);
		}

		if (ajaxify.data.assignee && badgeContainer) {
			const assignedToLabel = await new Promise((resolve) => {
				translator.translate('[[internalnotes:assigned-to]]', resolve);
			});
			const a = ajaxify.data.assignee;
			const badge = document.createElement('span');
			badge.id = 'assignee-badge';
			badge.style.cursor = 'pointer';
			if (a.type === 'group') {
				const icon = a.group.icon ? `<i class="${escapeHtml(a.group.icon)}"></i> ` : '<i class="fa fa-users"></i> ';
				badge.className = 'badge bg-info text-dark ms-2 assignee-badge';
				badge.innerHTML = icon + escapeHtml(assignedToLabel) + ' ' + escapeHtml(a.group.name);
			} else {
				badge.className = 'badge bg-info text-dark ms-2 assignee-badge';
				badge.innerHTML = '<i class="fa fa-user"></i> ' + escapeHtml(assignedToLabel) + ' ' + escapeHtml(a.user.username);
			}
			badge.addEventListener('click', openNotesPanel);
			badgeContainer.appendChild(badge);
		}
	}

	// --- Thread tool click handlers ---

	$(document).on('click', '.toggle-internal-notes', () => {
		openNotesPanel();
	});

	$(document).on('click', '.assign-topic-user', () => {
		const tid = getTid();
		if (tid) {
			showAssignModal(tid);
		}
	});
})();
