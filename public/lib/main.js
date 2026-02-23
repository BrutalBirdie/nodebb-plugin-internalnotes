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

		const [panelTitle, placeholder, addNote, closeLabel] = await Promise.all([
			t('panel-title'),
			t('placeholder'),
			t('add-note'),
			t('close'),
		]);

		const panel = document.createElement('div');
		panel.id = 'internal-notes-panel';
		panel.className = 'internal-notes-panel hidden';
		panel.innerHTML = `
			<div class="internal-notes-header">
				<h5><i class="fa fa-sticky-note"></i> ${escapeHtml(panelTitle)}</h5>
			</div>
			<div class="internal-notes-assignee"></div>
			<div class="internal-notes-list"></div>
			<div class="internal-notes-form">
				<textarea class="form-control internal-notes-input" rows="3" placeholder="${escapeHtml(placeholder)}"></textarea>
				<div class="internal-notes-form-actions mt-2">
					<button type="button" class="btn btn-primary btn-sm internal-notes-submit">${escapeHtml(addNote)}</button>
					<button type="button" class="btn btn-secondary btn-sm internal-notes-close">${escapeHtml(closeLabel)}</button>
				</div>
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
		} catch (_) {
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
		const [notAssigned, assignChangeLabel, assignedTo, unassignTitle, unassigned] = await Promise.all([
			t('not-assigned'),
			t('assign-change'),
			t('assigned-to'),
			t('unassign'),
			t('unassigned'),
		]);
		if (!assignee) {
			container.innerHTML = `
				<div class="assignee-info">
					<span class="text-muted"><i class="fa fa-user"></i> ${escapeHtml(notAssigned)}</span>
					<button type="button" class="btn btn-xs btn-primary ms-2 assign-from-panel">
						<i class="fa fa-user-plus me-1"></i> ${escapeHtml(assignChangeLabel)}
					</button>
				</div>
			`;
			container.querySelector('.assign-from-panel').addEventListener('click', () => showAssignModal(tid));
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
				<button type="button" class="btn btn-xs btn-link assign-from-panel" title="${escapeHtml(assignChangeLabel)}">
					<i class="fa fa-pencil"></i>
				</button>
				<button type="button" class="btn btn-xs btn-link text-danger unassign-topic" title="${escapeHtml(unassignTitle)}">
					<i class="fa fa-times"></i>
				</button>
			</div>
		`;
		container.querySelector('.assign-from-panel').addEventListener('click', () => showAssignModal(tid));
		container.querySelector('.unassign-topic').addEventListener('click', async () => {
			try {
				await api.del(`/plugins/internalnotes/${tid}/assign`, {});
				await loadAssignee(tid);
				renderBadges();
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
			assignNoOne,
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
			unassigned,
		] = await Promise.all([
			t('assign-to-myself'),
			t('assign-no-one'),
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
			t('unassigned'),
		]);

		const bodyHtml = `
			<div class="assign-modal-body">
				<button type="button" class="btn btn-outline-primary w-100 mb-2" id="assign-self-btn">
					<i class="fa fa-hand-pointer-o me-1"></i> ${escapeHtml(assignToMyself)}
				</button>
				<button type="button" class="btn btn-outline-secondary w-100 mb-3" id="assign-no-one-btn">
					<i class="fa fa-user-times me-1"></i> ${escapeHtml(assignNoOne)}
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
				<div id="assign-quick-select" class="assign-quick-select mb-3" title=""></div>
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

				// Quick-select: assignable users (avatars)
				const quickSelectEl = modalEl.querySelector('#assign-quick-select');
				if (quickSelectEl) {
					api.get('/plugins/internalnotes/assignable-users', {})
						.then((payload) => {
							const users = (payload && payload.users) ? payload.users : [];
							if (users.length === 0) {
								quickSelectEl.style.display = 'none';
								return;
							}
							quickSelectEl.style.display = 'flex';
							const safeAttr = (str) => (str == null ? '' : String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'));
							quickSelectEl.innerHTML = users.map((u) => {
								const picture = (u.picture && u.picture.length) ? escapeHtml(u.picture) : '';
								const name = u.username || '';
								const uid = parseInt(u.uid, 10);
								const titleAttr = safeAttr(name);
								if (picture) {
									return `<button type="button" class="assign-quick-select-avatar btn btn-link p-0 me-1" data-uid="${uid}" data-username="${titleAttr}" title="${titleAttr}"><img src="${picture}" alt="" class="rounded" /></button>`;
								}
								return `<button type="button" class="assign-quick-select-avatar btn btn-link p-0 me-1" data-uid="${uid}" data-username="${titleAttr}" title="${titleAttr}"><span class="assign-quick-select-fallback rounded"><i class="fa fa-user"></i></span></button>`;
							}).join('');
							quickSelectEl.querySelectorAll('.assign-quick-select-avatar').forEach((btn) => {
								btn.addEventListener('click', () => {
									const uid = btn.getAttribute('data-uid');
									const username = btn.getAttribute('data-username'); // browser decodes HTML entities
									if (uid && username !== null) {
										setSelection('user', uid, username);
										// Switch to User tab
										modalEl.querySelectorAll('.assign-tab-link').forEach(l => l.classList.remove('active'));
										const userTab = modalEl.querySelector('.assign-tab-link[data-pane="pane-user"]');
										if (userTab) {
											userTab.classList.add('active');
										}
										modalEl.querySelectorAll('.assign-tab-pane').forEach(p => { p.style.display = 'none'; });
										const paneUser = modalEl.querySelector('#pane-user');
										if (paneUser) {
											paneUser.style.display = '';
										}
									}
								});
							});
						})
						.catch(() => {
							quickSelectEl.style.display = 'none';
						});
				}

				// "Assign to myself"
				const selfBtn = modalEl.querySelector('#assign-self-btn');
				if (selfBtn) {
					selfBtn.addEventListener('click', async () => {
						try {
							await api.put(`/plugins/internalnotes/${tid}/assign`, { type: 'user', id: app.user.uid });
							dialog.modal('hide');
							if (notesPanel && !notesPanel.classList.contains('hidden')) {
								await loadAssignee(tid);
							}
							renderBadges();
							alerts.success(assignedSuccess);
						} catch (err) {
							alerts.error(err.message || (await t('error-loading')));
						}
					});
				}

				// "Assign to no one"
				const noOneBtn = modalEl.querySelector('#assign-no-one-btn');
				if (noOneBtn) {
					noOneBtn.addEventListener('click', async () => {
						try {
							await api.del(`/plugins/internalnotes/${tid}/assign`, {});
							dialog.modal('hide');
							if (notesPanel && !notesPanel.classList.contains('hidden')) {
								await loadAssignee(tid);
							}
							renderBadges();
							alerts.success(unassigned);
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

	// --- Helpers for badge visibility (topic/list pages) ---

	function canViewInternalNotesOnPage() {
		return !!(ajaxify.data && (
			ajaxify.data.canViewInternalNotes === true ||
			(ajaxify.data.topic && ajaxify.data.topic.canViewInternalNotes === true)
		));
	}

	// --- Buttons in component="sidebar/right" (collapsed = no "open" class = icon only; expanded = "open" = icon + text) ---

	function isSidebarRightCollapsed(sidebarRight) {
		if (!sidebarRight) return true;
		// Expanded when this element or any ancestor has class "open"
		const hasOpen = sidebarRight.classList.contains('open') ||
			(sidebarRight.parentElement && sidebarRight.parentElement.classList.contains('open'));
		return !hasOpen;
	}

	function updateSidebarRightCollapsedState(wrap) {
		const sidebarRight = document.querySelector('[component="sidebar/right"]');
		if (!sidebarRight || !wrap) return;
		const collapsed = isSidebarRightCollapsed(sidebarRight);
		wrap.classList.toggle('internal-notes-sidebar-actions--collapsed', collapsed);
	}

	async function renderSidebarRightButtons() {
		const tid = getTid();
		if (!tid || !canViewInternalNotesOnPage()) {
			return;
		}
		const sidebarRight = document.querySelector('[component="sidebar/right"]');
		if (!sidebarRight) {
			return;
		}
		const existing = sidebarRight.querySelector('.internal-notes-sidebar-actions');
		if (existing) {
			if (existing._internalNotesResizeObserver) existing._internalNotesResizeObserver.disconnect();
			if (existing._internalNotesMutationObserver) existing._internalNotesMutationObserver.disconnect();
			existing.remove();
		}
		const [notesLabel, assignLabel] = await Promise.all([
			t('thread-tool-notes'),
			t('thread-tool-assign'),
		]);
		const wrap = document.createElement('div');
		wrap.className = 'internal-notes-sidebar-actions';
		wrap.innerHTML = `
			<div class="internal-notes-sidebar-item" role="group">
				<button type="button" class="toggle-internal-notes internal-notes-sidebar-btn" title="${escapeHtml(notesLabel)}">
					<i class="fa fa-sticky-note" aria-hidden="true"></i>
					<span class="internal-notes-sidebar-btn-text">${escapeHtml(notesLabel)}</span>
				</button>
				<button type="button" class="assign-topic-user internal-notes-sidebar-btn" title="${escapeHtml(assignLabel)}">
					<i class="fa fa-user-plus" aria-hidden="true"></i>
					<span class="internal-notes-sidebar-btn-text">${escapeHtml(assignLabel)}</span>
				</button>
			</div>
		`;
		// Insert right after <ul id="logged-in-menu"> when present; otherwise append at end of sidebar
		const loggedInMenu = document.querySelector('#logged-in-menu');
		if (loggedInMenu) {
			loggedInMenu.after(wrap);
		} else if (window.getComputedStyle(sidebarRight).flexDirection === 'column-reverse') {
			sidebarRight.insertBefore(wrap, sidebarRight.firstChild);
		} else {
			sidebarRight.appendChild(wrap);
		}

		updateSidebarRightCollapsedState(wrap);
		requestAnimationFrame(() => updateSidebarRightCollapsedState(wrap));
		const ro = new ResizeObserver(() => updateSidebarRightCollapsedState(wrap));
		ro.observe(sidebarRight);
		wrap._internalNotesResizeObserver = ro;
		const mo = new MutationObserver(() => updateSidebarRightCollapsedState(wrap));
		mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
		mo.observe(sidebarRight, { attributes: true, attributeFilter: ['class'] });
		wrap._internalNotesMutationObserver = mo;
	}

	// --- Page lifecycle ---

	hooks.on('action:ajaxify.end', () => {
		const tid = getTid();
		if (!tid && notesPanel) {
			notesPanel.classList.add('hidden');
		}
		// Run for both single-topic page and topic list pages (category, recent, etc.)
		renderBadges();
		// Topic page: inject Internal Notes & Assign Topic into the far-right sidebar (component="sidebar/right")
		renderSidebarRightButtons();
	});

	function getTopicDataForTid(tid) {
		if (ajaxify.data.tid === tid) {
			return ajaxify.data;
		}
		const topics = ajaxify.data.topics || ajaxify.data.category?.topics || [];
		return topics.find(t => t && t.tid === tid) || null;
	}

	function getBadgeContainer(headerEl, isCurrentTopic) {
		// On topic view, prefer the main .topic-title in #content so badges always show next to the title
		if (isCurrentTopic) {
			const inContent = document.querySelector('#content .topic-title') ||
				document.querySelector('#content [component="topic/header"] .topic-title');
			const titleComponent = document.querySelector('#content [component="topic/title"]');
			if (inContent) {
				return inContent;
			}
			if (titleComponent && titleComponent.parentElement && titleComponent.parentElement.classList.contains('topic-title')) {
				return titleComponent.parentElement;
			}
		}
		const titleEl = headerEl.querySelector('[component="topic/title"]') || headerEl.querySelector('.topic-title');
		if (titleEl && titleEl.classList.contains('topic-title')) {
			return titleEl;
		}
		if (titleEl && titleEl.parentElement && titleEl.parentElement.classList.contains('topic-title')) {
			return titleEl.parentElement;
		}
		return headerEl;
	}

	async function renderBadges() {
		const headers = document.querySelectorAll('[component="topic/header"]');
		const isTopicPage = ajaxify.data.tid && canViewInternalNotesOnPage();
		// If no headers found but we're on the topic page, use a single "virtual" pass with #content .topic-title
		const headerList = headers.length ? Array.from(headers) : (isTopicPage ? [document.body] : []);

		headerList.forEach((headerEl) => {
			const row = headerEl.closest && headerEl.closest('[data-tid]');
			// On topic view there may be no [data-tid] parent; use current topic id. On list pages, get tid from row.
			const tid = row ? parseInt(row.getAttribute('data-tid'), 10) : (ajaxify.data.tid || null);
			if (!tid) {
				return;
			}

			const topic = getTopicDataForTid(tid);
			if (!topic || !topic.canViewInternalNotes) {
				return;
			}

			const isCurrentTopic = ajaxify.data.tid === tid;
			const badgeContainer = getBadgeContainer(headerEl, isCurrentTopic);
			if (!badgeContainer) {
				return;
			}
			// Remove any existing badges we added (from this container to avoid duplicates)
			badgeContainer.querySelectorAll('.internal-notes-badge, .assignee-badge').forEach((el) => el.remove());

			if (topic.internalNoteCount > 0) {
				const badge = document.createElement('span');
				badge.id = 'internal-notes-badge-' + tid;
				badge.className = 'badge bg-warning text-dark ms-2 internal-notes-badge';
				badge.style.cursor = 'pointer';
				badge.innerHTML = '<i class="fa fa-sticky-note"></i> ' + topic.internalNoteCount;
				badge.addEventListener('click', (e) => {
					e.preventDefault();
					if (isCurrentTopic) {
						openNotesPanel();
					} else {
						const path = topic.slug ? 'topic/' + topic.slug : 'topic/' + topic.tid;
						ajaxify.go(path, undefined, true);
					}
				});
				badgeContainer.appendChild(badge);
			}

			if (topic.assignee) {
				const a = topic.assignee;
				const badge = document.createElement('span');
				badge.id = 'assignee-badge-' + tid;
				badge.className = 'badge bg-info text-dark ms-2 assignee-badge';
				badge.style.cursor = 'pointer';
				if (a.type === 'group') {
					const g = a.group;
					const iconClass = g.icon || 'fa fa-users';
					const iconHtml = g.labelColor
						? '<span class="assignee-badge-icon" style="background:' + escapeHtml(g.labelColor) + ';color:#fff"><i class="' + escapeHtml(iconClass) + '"></i></span> '
						: '<i class="fa ' + (g.icon ? escapeHtml(g.icon.replace(/^fa\s+/, '')) : 'fa-users') + '"></i> ';
					badge.innerHTML = iconHtml + escapeHtml(g.name);
				} else {
					const u = a.user;
					const avatarHtml = u.picture
						? '<img class="assignee-badge-avatar" src="' + escapeHtml(u.picture) + '" alt="" onerror="this.style.display=\'none\';var n=this.nextElementSibling;if(n)n.style.display=\'inline\'">' +
							'<i class="fa fa-user assignee-badge-fallback" style="display:none"></i> '
						: '<i class="fa fa-user"></i> ';
					badge.innerHTML = avatarHtml + escapeHtml(u.username);
				}
				badge.addEventListener('click', (e) => {
					e.preventDefault();
					if (isCurrentTopic) {
						openNotesPanel();
					} else {
						const path = topic.slug ? 'topic/' + topic.slug : 'topic/' + topic.tid;
						ajaxify.go(path, undefined, true);
					}
				});
				badgeContainer.appendChild(badge);
			}
		});
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
