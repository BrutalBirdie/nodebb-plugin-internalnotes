'use strict';

(async () => {
	const hooks = await app.require('hooks');
	const alerts = await app.require('alerts');
	const api = await app.require('api');

	let notesPanel = null;

	function buildNotesPanel() {
		if (notesPanel) {
			notesPanel.remove();
		}

		const panel = document.createElement('div');
		panel.id = 'internal-notes-panel';
		panel.className = 'internal-notes-panel hidden';
		panel.innerHTML = `
			<div class="internal-notes-header">
				<h5><i class="fa fa-sticky-note"></i> [[internalnotes:panel-title]]</h5>
				<button class="btn btn-sm btn-link internal-notes-close" title="Close"><i class="fa fa-times"></i></button>
			</div>
			<div class="internal-notes-assignee"></div>
			<div class="internal-notes-list"></div>
			<div class="internal-notes-form">
				<textarea class="form-control internal-notes-input" rows="3" placeholder="[[internalnotes:placeholder]]"></textarea>
				<button class="btn btn-primary btn-sm internal-notes-submit mt-2">[[internalnotes:add-note]]</button>
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
			alerts.success('[[internalnotes:note-added]]');
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
			renderNotes(notes || [], tid);
		} catch (err) {
			notesPanel.querySelector('.internal-notes-list').innerHTML =
				'<p class="text-muted p-3">[[internalnotes:error-loading]]</p>';
		}
	}

	function renderNotes(notes, tid) {
		const list = notesPanel.querySelector('.internal-notes-list');
		if (!notes.length) {
			list.innerHTML = '<p class="text-muted p-3">[[internalnotes:no-notes]]</p>';
			return;
		}
		list.innerHTML = notes.map(note => `
			<div class="internal-note" data-note-id="${note.noteId}">
				<div class="internal-note-meta">
					<img src="${note.user.picture || ''}" class="avatar avatar-xs" alt="" onerror="this.style.display='none'" />
					<strong>${escapeHtml(note.user.username || 'Unknown')}</strong>
					<span class="timeago text-muted" title="${note.timestampISO}">${note.timestampISO}</span>
					<button class="btn btn-xs btn-link text-danger delete-note" data-note-id="${note.noteId}" title="[[internalnotes:delete-note]]">
						<i class="fa fa-trash"></i>
					</button>
				</div>
				<div class="internal-note-content">${escapeHtml(note.content)}</div>
			</div>
		`).join('');

		list.querySelectorAll('.delete-note').forEach((btn) => {
			btn.addEventListener('click', async () => {
				const noteId = btn.getAttribute('data-note-id');
				if (confirm('[[internalnotes:confirm-delete]]')) {
					try {
						await api.del(`/plugins/internalnotes/${tid}/${noteId}`, {});
						await loadNotes(tid);
						alerts.success('[[internalnotes:note-deleted]]');
					} catch (err) {
						alerts.error(err.message || '[[error:unknown]]');
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
			renderAssignee(assignee, tid);
		} catch {
			// silently fail
		}
	}

	function renderAssignee(assignee, tid) {
		const container = notesPanel.querySelector('.internal-notes-assignee');
		if (!assignee) {
			container.innerHTML = `
				<div class="assignee-info">
					<span class="text-muted"><i class="fa fa-user"></i> [[internalnotes:not-assigned]]</span>
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
				[[internalnotes:assigned-to]] ${label}
				<button class="btn btn-xs btn-link text-danger unassign-topic" title="[[internalnotes:unassign]]">
					<i class="fa fa-times"></i>
				</button>
			</div>
		`;
		container.querySelector('.unassign-topic').addEventListener('click', async () => {
			try {
				await api.del(`/plugins/internalnotes/${tid}/assign`, {});
				await loadAssignee(tid);
				alerts.success('[[internalnotes:unassigned]]');
			} catch (err) {
				alerts.error(err.message || '[[error:unknown]]');
			}
		});
	}

	// --- Assign modal ---

	function showAssignModal(tid) {
		const existing = document.getElementById('assign-topic-modal');
		if (existing) {
			existing.remove();
		}

		const modalHtml = `
			<div class="modal fade" id="assign-topic-modal" tabindex="-1" role="dialog">
				<div class="modal-dialog" role="document">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title"><i class="fa fa-user-plus me-2"></i>[[internalnotes:assign-modal-title]]</h5>
							<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
						</div>
						<div class="modal-body">
							<button type="button" class="btn btn-outline-primary w-100 mb-3" id="assign-self-btn">
								<i class="fa fa-hand-pointer-o me-1"></i> [[internalnotes:assign-to-myself]]
							</button>
							<hr />
							<ul class="nav nav-tabs mb-3" role="tablist">
								<li class="nav-item" role="presentation">
									<button class="nav-link active" id="tab-user" data-bs-toggle="tab" data-bs-target="#pane-user" type="button" role="tab">
										<i class="fa fa-user me-1"></i> [[internalnotes:tab-user]]
									</button>
								</li>
								<li class="nav-item" role="presentation">
									<button class="nav-link" id="tab-group" data-bs-toggle="tab" data-bs-target="#pane-group" type="button" role="tab">
										<i class="fa fa-users me-1"></i> [[internalnotes:tab-group]]
									</button>
								</li>
							</ul>
							<div class="tab-content">
								<div class="tab-pane fade show active" id="pane-user" role="tabpanel">
									<div class="mb-3 position-relative">
										<input type="text" class="form-control" id="assign-user-input" placeholder="[[internalnotes:search-user-placeholder]]" autocomplete="off" />
										<div id="assign-user-suggestions" class="list-group assign-suggestions"></div>
									</div>
								</div>
								<div class="tab-pane fade" id="pane-group" role="tabpanel">
									<div class="mb-3 position-relative">
										<input type="text" class="form-control" id="assign-group-input" placeholder="[[internalnotes:search-group-placeholder]]" autocomplete="off" />
										<div id="assign-group-suggestions" class="list-group assign-suggestions"></div>
									</div>
								</div>
							</div>
							<div id="assign-selection" class="alert alert-secondary d-none">
								<small class="text-muted">[[internalnotes:selected]]:</small>
								<strong id="assign-selection-label"></strong>
							</div>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">[[internalnotes:cancel]]</button>
							<button type="button" class="btn btn-primary" id="assign-confirm" disabled>[[internalnotes:assign-confirm]]</button>
						</div>
					</div>
				</div>
			</div>
		`;

		document.body.insertAdjacentHTML('beforeend', modalHtml);
		const modalEl = document.getElementById('assign-topic-modal');
		const modal = new bootstrap.Modal(modalEl);
		modal.show();

		let selectedType = null;
		let selectedId = null;

		const selectionBox = modalEl.querySelector('#assign-selection');
		const selectionLabel = modalEl.querySelector('#assign-selection-label');
		const confirmBtn = modalEl.querySelector('#assign-confirm');

		function setSelection(type, id, displayLabel) {
			selectedType = type;
			selectedId = id;
			selectionLabel.textContent = displayLabel;
			selectionBox.classList.remove('d-none');
			confirmBtn.disabled = false;
		}

		// "Assign to myself"
		modalEl.querySelector('#assign-self-btn').addEventListener('click', async () => {
			try {
				await api.put(`/plugins/internalnotes/${tid}/assign`, { type: 'user', id: app.user.uid });
				modal.hide();
				await loadAssignee(tid);
				alerts.success('[[internalnotes:assigned-success]]');
			} catch (err) {
				alerts.error(err.message || '[[error:unknown]]');
			}
		});

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

		// Confirm
		confirmBtn.addEventListener('click', async () => {
			if (!selectedType || !selectedId) {
				alerts.error('[[internalnotes:select-target-first]]');
				return;
			}
			try {
				await api.put(`/plugins/internalnotes/${tid}/assign`, { type: selectedType, id: selectedId });
				modal.hide();
				await loadAssignee(tid);
				alerts.success('[[internalnotes:assigned-success]]');
			} catch (err) {
				alerts.error(err.message || '[[error:unknown]]');
			}
		});

		modalEl.addEventListener('hidden.bs.modal', () => {
			modalEl.remove();
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

	function openNotesPanel() {
		const tid = getTid();
		if (!tid) {
			return;
		}
		if (!notesPanel) {
			buildNotesPanel();
		}
		notesPanel.classList.remove('hidden');
		loadNotes(tid);
		loadAssignee(tid);
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

	function renderBadges() {
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

		const topicTitle = document.querySelector('[component="topic/header"]') ||
			document.querySelector('.topic-header') ||
			document.querySelector('h1');

		if (topicTitle && ajaxify.data.internalNoteCount > 0) {
			const badge = document.createElement('span');
			badge.id = 'internal-notes-badge';
			badge.className = 'badge bg-warning text-dark ms-2 internal-notes-badge';
			badge.style.cursor = 'pointer';
			badge.innerHTML = `<i class="fa fa-sticky-note"></i> ${ajaxify.data.internalNoteCount}`;
			badge.addEventListener('click', openNotesPanel);
			topicTitle.appendChild(badge);
		}

		if (ajaxify.data.assignee && topicTitle) {
			const a = ajaxify.data.assignee;
			const badge = document.createElement('span');
			badge.id = 'assignee-badge';
			badge.style.cursor = 'pointer';
			if (a.type === 'group') {
				const icon = a.group.icon ? `<i class="${escapeHtml(a.group.icon)}"></i> ` : '<i class="fa fa-users"></i> ';
				badge.className = 'badge bg-info text-dark ms-2 assignee-badge';
				badge.innerHTML = icon + escapeHtml(a.group.name);
			} else {
				badge.className = 'badge bg-info text-dark ms-2 assignee-badge';
				badge.innerHTML = `<i class="fa fa-user"></i> ${escapeHtml(a.user.username)}`;
			}
			badge.addEventListener('click', openNotesPanel);
			topicTitle.appendChild(badge);
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
