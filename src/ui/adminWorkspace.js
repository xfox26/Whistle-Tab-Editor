/* ==========================================================================
   PAINEL ADMINISTRATIVO COMPLETO (USUÁRIOS, MÚSICAS, IMPORTADOR ABC/ZIP,
   VISÃO GERAL, AUDITORIA E BACKUP JSON)
   ========================================================================== */

import { t } from '../i18n/index.js';
import { showNotificationToast } from '../utils/toast.js';
import { parseABCNotation } from '../parsers/abcCodec.js';
import { analyzeSongTessitura } from './libraryMastery.js';
import { analyzeABCWhistleFit } from './whistleFitAnalyzer.js';
import { extractAbcFilesFromZip, splitABCTunes } from '../utils/zipReader.js';

const WHISTLE_KEYS = ['D', 'C', 'Eb', 'F', 'G', 'A', 'Bb'];
const RHYTHMS = ['reel', 'jig', 'waltz', 'polka', 'air', 'soundtrack'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const CATEGORIES = ['Celta', 'Filmes', 'Rock', 'Anime', 'Folclore'];

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function inferRhythmFromTimeSignature(ts = '4/4') {
    const clean = String(ts || '').trim();
    if (clean === '6/8' || clean === '9/8' || clean === '12/8') return 'jig';
    if (clean === '3/4' || clean === '3/8') return 'waltz';
    if (clean === '2/4') return 'polka';
    if (clean === '4/4' || clean === '2/2' || clean === 'C' || clean === 'C|') return 'reel';
    return 'air';
}

function inferDifficultyFromNotes(notes, tempo) {
    const tess = analyzeSongTessitura(notes, tempo);
    if (tess.hasHalfHole) return 'advanced';
    if (tess.range === 'octave1-2') return 'intermediate';
    return 'beginner';
}

function formatShortDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

export function createAdminWorkspaceController({ onCatalogUpdated, getCurrentBard } = {}) {
    const workspace = document.getElementById('admin-workspace');
    if (!workspace) {
        return { open: () => {}, close: () => {} };
    }

    let activeTab = 'overview';
    let cachedUsers = [];
    let cachedTunes = [];
    let selectedTuneIds = new Set();
    let editingTuneId = null;
    let batchItems = [];

    const btnBack = document.getElementById('btn-admin-back');
    const tabButtons = workspace.querySelectorAll('.admin-tab-btn');
    const tabPanels = workspace.querySelectorAll('.admin-tab-panel');

    function switchTab(tabName) {
        activeTab = tabName;
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.adminTab === tabName);
        });
        tabPanels.forEach(panel => {
            panel.style.display = panel.dataset.adminPanel === tabName ? 'block' : 'none';
        });

        if (tabName === 'overview') loadOverview();
        else if (tabName === 'users') loadUsers();
        else if (tabName === 'tunes') loadTunes();
        else if (tabName === 'audit') loadAuditLogs();
    }

    function open() {
        workspace.style.display = 'flex';
        document.body.classList.add('admin-open');
        switchTab(activeTab || 'overview');
    }

    function close() {
        workspace.style.display = 'none';
        document.body.classList.remove('admin-open');
    }

    if (btnBack) btnBack.addEventListener('click', close);
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.adminTab));
    });

    async function apiFetch(url, options = {}) {
        const res = await fetch(url, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || `HTTP ${res.status}`);
        }
        return data;
    }

    /* ----------------------------------------------------------------------
       1. VISÃO GERAL & BACKUP JSON
       ---------------------------------------------------------------------- */
    async function loadOverview() {
        const container = document.getElementById('admin-overview-content');
        if (!container) return;
        container.innerHTML = `<div class="admin-loading">${escapeHtml(t('admin.loading'))}</div>`;

        try {
            const { overview } = await apiFetch('/api/admin/overview');
            const u = overview.users || {};
            const tu = overview.tunes || {};
            const rhythms = overview.byRhythm || [];
            const keys = overview.byKey || [];

            container.innerHTML = `
                <div class="admin-kpi-grid">
                    <div class="admin-kpi-card">
                        <div class="admin-kpi-label">${escapeHtml(t('admin.kpiTotalUsers'))}</div>
                        <div class="admin-kpi-value">${u.totalUsers || 0}</div>
                        <div class="admin-kpi-sub">${u.activeUsers || 0} ${escapeHtml(t('admin.statusActive'))} · ${u.suspendedUsers || 0} ${escapeHtml(t('admin.statusSuspended'))} · ${u.bannedUsers || 0} ${escapeHtml(t('admin.statusBanned'))}</div>
                    </div>
                    <div class="admin-kpi-card">
                        <div class="admin-kpi-label">${escapeHtml(t('admin.kpiTotalTunes'))}</div>
                        <div class="admin-kpi-value">${tu.totalTunes || 0}</div>
                        <div class="admin-kpi-sub">${tu.publicTunes || 0} ${escapeHtml(t('admin.publicLabel'))} · ${tu.curatedTunes || 0} ${escapeHtml(t('admin.curatedLabel'))} · ${tu.moderatedTunes || 0} ${escapeHtml(t('admin.moderatedLabel'))}</div>
                    </div>
                    <div class="admin-kpi-card">
                        <div class="admin-kpi-label">${escapeHtml(t('admin.kpiTotalLikes'))}</div>
                        <div class="admin-kpi-value">❤️ ${tu.totalLikes || 0}</div>
                        <div class="admin-kpi-sub">${u.adminUsers || 0} ${escapeHtml(t('admin.adminsLabel'))}</div>
                    </div>
                </div>

                <div class="admin-breakdown-grid">
                    <div class="admin-card">
                        <h4>${escapeHtml(t('admin.byRhythmTitle'))}</h4>
                        <div class="admin-pill-list">
                            ${rhythms.length ? rhythms.map(r => `<span class="admin-stat-pill"><strong>${escapeHtml(r.label)}</strong> <span>${r.count}</span></span>`).join('') : `<span class="admin-muted">—</span>`}
                        </div>
                    </div>
                    <div class="admin-card">
                        <h4>${escapeHtml(t('admin.byKeyTitle'))}</h4>
                        <div class="admin-pill-list">
                            ${keys.length ? keys.map(k => `<span class="admin-stat-pill"><strong>${escapeHtml(k.label)}</strong> <span>${k.count}</span></span>`).join('') : `<span class="admin-muted">—</span>`}
                        </div>
                    </div>
                </div>
            `;
        } catch (err) {
            container.innerHTML = `<div class="admin-error">${escapeHtml(err.message)}</div>`;
        }
    }

    const btnBackup = document.getElementById('btn-admin-backup-json');
    if (btnBackup) {
        btnBackup.addEventListener('click', async () => {
            try {
                btnBackup.disabled = true;
                const data = await apiFetch('/api/admin/backup');
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tinwhistle-backup-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                showNotificationToast(t('admin.backupDownloaded'));
            } catch (err) {
                showNotificationToast(err.message);
            } finally {
                btnBackup.disabled = false;
            }
        });
    }

    /* ----------------------------------------------------------------------
       2. ADMINISTRAÇÃO DE USUÁRIOS
       ---------------------------------------------------------------------- */
    const usersSearch = document.getElementById('admin-users-search');
    const usersStatusFilter = document.getElementById('admin-users-status-filter');
    const btnUsersRefresh = document.getElementById('btn-admin-users-refresh');

    if (usersSearch) usersSearch.addEventListener('input', renderUsersTable);
    if (usersStatusFilter) usersStatusFilter.addEventListener('change', renderUsersTable);
    if (btnUsersRefresh) btnUsersRefresh.addEventListener('click', loadUsers);

    async function loadUsers() {
        const tbody = document.getElementById('admin-users-tbody');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="6" class="admin-loading">${escapeHtml(t('admin.loading'))}</td></tr>`;
        try {
            const data = await apiFetch('/api/admin/users');
            cachedUsers = data.users || [];
            renderUsersTable();
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6" class="admin-error">${escapeHtml(err.message)}</td></tr>`;
        }
    }

    function renderUsersTable() {
        const tbody = document.getElementById('admin-users-tbody');
        if (!tbody) return;

        const q = (usersSearch?.value || '').trim().toLowerCase();
        const statusFilter = usersStatusFilter?.value || 'all';
        const me = typeof getCurrentBard === 'function' ? getCurrentBard() : null;

        const filtered = cachedUsers.filter(u => {
            const st = u.status || 'active';
            if (statusFilter !== 'all' && st !== statusFilter) return false;
            if (!q) return true;
            return (
                (u.username || '').toLowerCase().includes(q) ||
                (u.displayName || '').toLowerCase().includes(q)
            );
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">${escapeHtml(t('admin.noUsersFound'))}</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(u => {
            const st = u.status || 'active';
            const isSelf = me && me.id === u.id;
            const statusClass = st === 'banned' ? 'is-banned' : st === 'suspended' ? 'is-suspended' : 'is-active';
            const statusLabel = st === 'banned'
                ? t('admin.statusBanned')
                : st === 'suspended'
                    ? t('admin.statusSuspended')
                    : t('admin.statusActive');
            const reasonNote = u.banReason ? `<div class="admin-sub-note">${escapeHtml(u.banReason)}</div>` : '';
            const untilNote = (st === 'suspended' && u.suspendedUntil)
                ? `<div class="admin-sub-note">${escapeHtml(t('admin.untilLabel'))}: ${escapeHtml(formatShortDate(u.suspendedUntil))}</div>`
                : '';

            return `
                <tr data-user-id="${escapeHtml(u.id)}">
                    <td>
                        <div class="admin-cell-title">${escapeHtml(u.displayName || u.username)} ${u.isAdmin ? '<span class="admin-role-pill">👑 Admin</span>' : ''}</div>
                        <div class="admin-sub-note">@${escapeHtml(u.username)}</div>
                    </td>
                    <td>
                        <span class="admin-status-pill ${statusClass}">${escapeHtml(statusLabel)}</span>
                        ${untilNote}${reasonNote}
                    </td>
                    <td>${u.tunesCount || 0}</td>
                    <td>❤️ ${u.likesReceived || 0}</td>
                    <td>${escapeHtml(formatShortDate(u.createdAt))}</td>
                    <td>
                        <div class="admin-actions-row">
                            ${st !== 'active' ? `<button type="button" class="btn btn-xs btn-secondary" data-user-act="reactivate" ${isSelf ? 'disabled' : ''}>✅ ${escapeHtml(t('admin.reactivate'))}</button>` : ''}
                            <button type="button" class="btn btn-xs btn-secondary" data-user-act="suspend-24" ${isSelf ? 'disabled' : ''}>⏸️ 24h</button>
                            <button type="button" class="btn btn-xs btn-secondary" data-user-act="suspend-168" ${isSelf ? 'disabled' : ''}>⏸️ 7d</button>
                            ${st !== 'banned' ? `<button type="button" class="btn btn-xs btn-danger" data-user-act="ban" ${isSelf ? 'disabled' : ''}>🚫 ${escapeHtml(t('admin.ban'))}</button>` : ''}
                            <button type="button" class="btn btn-xs btn-secondary" data-user-act="${u.isAdmin ? 'demote' : 'promote'}" ${isSelf ? 'disabled' : ''}>${u.isAdmin ? `⬇️ ${escapeHtml(t('admin.demote'))}` : `👑 ${escapeHtml(t('admin.promote'))}`}</button>
                            <button type="button" class="btn btn-xs btn-secondary" data-user-act="revoke_sessions" title="${escapeHtml(t('admin.revokeSessions'))}">🔑</button>
                            <button type="button" class="btn btn-xs btn-danger" data-user-act="delete" ${isSelf ? 'disabled' : ''} title="${escapeHtml(t('admin.deleteUser'))}">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    const usersTbody = document.getElementById('admin-users-tbody');
    if (usersTbody) {
        usersTbody.addEventListener('click', async (e) => {
            const btn = e.target.closest('button[data-user-act]');
            if (!btn) return;
            const row = btn.closest('tr[data-user-id]');
            const userId = row?.dataset.userId;
            if (!userId) return;

            const act = btn.dataset.userAct;
            try {
                if (act === 'delete') {
                    if (!confirm(t('admin.confirmDeleteUser'))) return;
                    await apiFetch(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
                    showNotificationToast(t('admin.userDeleted'));
                } else if (act === 'ban') {
                    if (!confirm(t('admin.confirmBanUser'))) return;
                    const reason = prompt(t('admin.reasonPrompt'), '') ?? '';
                    await apiFetch(`/api/admin/users/${encodeURIComponent(userId)}/moderation`, {
                        method: 'PATCH',
                        body: JSON.stringify({ action: 'ban', reason })
                    });
                    showNotificationToast(t('admin.userBanned'));
                } else if (act.startsWith('suspend-')) {
                    const durationHours = parseInt(act.split('-')[1], 10) || 24;
                    const reason = prompt(t('admin.reasonPrompt'), '') ?? '';
                    await apiFetch(`/api/admin/users/${encodeURIComponent(userId)}/moderation`, {
                        method: 'PATCH',
                        body: JSON.stringify({ action: 'suspend', durationHours, reason })
                    });
                    showNotificationToast(t('admin.userSuspended'));
                } else {
                    await apiFetch(`/api/admin/users/${encodeURIComponent(userId)}/moderation`, {
                        method: 'PATCH',
                        body: JSON.stringify({ action: act })
                    });
                    showNotificationToast(t('admin.actionApplied'));
                }
                await loadUsers();
                if (act === 'ban' || act === 'delete') {
                    if (typeof onCatalogUpdated === 'function') onCatalogUpdated();
                }
            } catch (err) {
                showNotificationToast(err.message);
            }
        });
    }

    /* ----------------------------------------------------------------------
       3. ADMINISTRAÇÃO DE MÚSICAS
       ---------------------------------------------------------------------- */
    const tunesSearch = document.getElementById('admin-tunes-search');
    const tunesStatusFilter = document.getElementById('admin-tunes-status-filter');
    const tunesKeyFilter = document.getElementById('admin-tunes-key-filter');
    const btnTunesRefresh = document.getElementById('btn-admin-tunes-refresh');
    const tunesSelectAll = document.getElementById('admin-tunes-select-all');
    const btnBulkCurate = document.getElementById('btn-admin-tunes-bulk-curate');
    const btnBulkSuspend = document.getElementById('btn-admin-tunes-bulk-suspend');
    const btnBulkActivate = document.getElementById('btn-admin-tunes-bulk-activate');

    if (tunesSearch) tunesSearch.addEventListener('input', () => renderTunesTable());
    if (tunesStatusFilter) tunesStatusFilter.addEventListener('change', loadTunes);
    if (tunesKeyFilter) tunesKeyFilter.addEventListener('change', loadTunes);
    if (btnTunesRefresh) btnTunesRefresh.addEventListener('click', loadTunes);

    if (tunesSelectAll) {
        tunesSelectAll.addEventListener('change', () => {
            const checked = tunesSelectAll.checked;
            document.querySelectorAll('#admin-tunes-tbody input.admin-tune-check').forEach(cb => {
                cb.checked = checked;
                if (checked) selectedTuneIds.add(cb.dataset.tuneId);
                else selectedTuneIds.delete(cb.dataset.tuneId);
            });
            updateBulkBar();
        });
    }

    function updateBulkBar() {
        const countEl = document.getElementById('admin-tunes-selected-count');
        if (countEl) {
            countEl.textContent = t('admin.selectedCount', { count: selectedTuneIds.size });
        }
    }

    async function applyBulkTunePatch(patch) {
        if (selectedTuneIds.size === 0) return;
        try {
            for (const id of selectedTuneIds) {
                await apiFetch(`/api/admin/tunes/${encodeURIComponent(id)}`, {
                    method: 'PATCH',
                    body: JSON.stringify(patch)
                });
            }
            selectedTuneIds.clear();
            if (tunesSelectAll) tunesSelectAll.checked = false;
            showNotificationToast(t('admin.actionApplied'));
            await loadTunes();
            if (typeof onCatalogUpdated === 'function') onCatalogUpdated();
        } catch (err) {
            showNotificationToast(err.message);
        }
    }

    if (btnBulkCurate) btnBulkCurate.addEventListener('click', () => applyBulkTunePatch({ is_curated: true }));
    if (btnBulkSuspend) btnBulkSuspend.addEventListener('click', () => applyBulkTunePatch({ moderation_status: 'suspended', moderation_reason: 'Moderação em lote' }));
    if (btnBulkActivate) btnBulkActivate.addEventListener('click', () => applyBulkTunePatch({ moderation_status: 'active', moderation_reason: null }));

    async function loadTunes() {
        const tbody = document.getElementById('admin-tunes-tbody');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="7" class="admin-loading">${escapeHtml(t('admin.loading'))}</td></tr>`;
        try {
            const status = tunesStatusFilter?.value || 'all';
            const key = tunesKeyFilter?.value || 'all';
            const data = await apiFetch(`/api/admin/tunes?status=${encodeURIComponent(status)}&key=${encodeURIComponent(key)}`);
            cachedTunes = data.tunes || [];
            renderTunesTable();
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7" class="admin-error">${escapeHtml(err.message)}</td></tr>`;
        }
    }

    function renderTunesTable() {
        const tbody = document.getElementById('admin-tunes-tbody');
        if (!tbody) return;

        const q = (tunesSearch?.value || '').trim().toLowerCase();
        const filtered = cachedTunes.filter(tu => {
            if (!q) return true;
            const author = tu.authorName || tu.author_name || tu.owner_username || '';
            return (
                (tu.title || '').toLowerCase().includes(q) ||
                (tu.artist || '').toLowerCase().includes(q) ||
                author.toLowerCase().includes(q) ||
                (tu.category || '').toLowerCase().includes(q)
            );
        });

        updateBulkBar();

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="admin-empty">${escapeHtml(t('admin.noTunesFound'))}</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(tu => {
            const st = tu.moderationStatus || tu.moderation_status || 'active';
            const modReason = tu.moderationReason ?? tu.moderation_reason ?? '';
            const authorName = tu.authorName || tu.author_name || tu.owner_username || 'Anônimo';
            const isPublic = Boolean(tu.isPublic !== undefined ? tu.isPublic : (tu.is_public === undefined ? true : tu.is_public));
            const isCurated = Boolean(tu.isCurated !== undefined ? tu.isCurated : tu.is_curated);
            const statusClass = st === 'banned' ? 'is-banned' : st === 'suspended' ? 'is-suspended' : 'is-active';
            const statusLabel = st === 'banned'
                ? t('admin.statusBanned')
                : st === 'suspended'
                    ? t('admin.statusSuspended')
                    : t('admin.statusActive');
            const checked = selectedTuneIds.has(tu.id) ? 'checked' : '';
            const isEditing = editingTuneId === tu.id;

            const editRow = isEditing ? `
                <tr class="admin-inline-edit-row" data-edit-tune-id="${escapeHtml(tu.id)}">
                    <td colspan="7">
                        <div class="admin-inline-edit-grid">
                            <label>${escapeHtml(t('admin.colTitle'))}<input type="text" class="form-control modal-form-input" data-field="title" value="${escapeHtml(tu.title)}"></label>
                            <label>${escapeHtml(t('admin.colArtist'))}<input type="text" class="form-control modal-form-input" data-field="artist" value="${escapeHtml(tu.artist || '')}"></label>
                            <label>${escapeHtml(t('admin.colKey'))}
                                <select class="form-control modal-form-input" data-field="key">
                                    ${WHISTLE_KEYS.map(k => `<option value="${k}" ${tu.key === k ? 'selected' : ''}>${k}</option>`).join('')}
                                </select>
                            </label>
                            <label>${escapeHtml(t('admin.colRhythm'))}
                                <select class="form-control modal-form-input" data-field="rhythm">
                                    ${RHYTHMS.map(r => `<option value="${r}" ${tu.rhythm === r ? 'selected' : ''}>${r}</option>`).join('')}
                                </select>
                            </label>
                            <label>${escapeHtml(t('admin.colDifficulty'))}
                                <select class="form-control modal-form-input" data-field="difficulty">
                                    ${DIFFICULTIES.map(d => `<option value="${d}" ${tu.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}
                                </select>
                            </label>
                            <label>${escapeHtml(t('admin.colCategory'))}
                                <select class="form-control modal-form-input" data-field="category">
                                    ${CATEGORIES.map(c => `<option value="${c}" ${tu.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                                </select>
                            </label>
                            <label class="admin-check-label"><input type="checkbox" data-field="is_public" ${isPublic ? 'checked' : ''}> ${escapeHtml(t('admin.publicLabel'))}</label>
                            <label class="admin-check-label"><input type="checkbox" data-field="is_curated" ${isCurated ? 'checked' : ''}> ${escapeHtml(t('admin.curatedLabel'))}</label>
                            <div class="admin-inline-edit-actions">
                                <button type="button" class="btn btn-xs btn-primary" data-tune-act="save-edit">💾 ${escapeHtml(t('admin.saveBtn'))}</button>
                                <button type="button" class="btn btn-xs btn-secondary" data-tune-act="cancel-edit">${escapeHtml(t('admin.cancelBtn'))}</button>
                            </div>
                        </div>
                    </td>
                </tr>
            ` : '';

            return `
                <tr data-tune-id="${escapeHtml(tu.id)}">
                    <td><input type="checkbox" class="admin-tune-check" data-tune-id="${escapeHtml(tu.id)}" ${checked}></td>
                    <td>
                        <div class="admin-cell-title">${escapeHtml(tu.title)}</div>
                        <div class="admin-sub-note">${escapeHtml(tu.artist || 'Tradicional')} · @${escapeHtml(authorName)}</div>
                    </td>
                    <td class="admin-meta-cell">
                        <span class="admin-meta-chip">${escapeHtml(tu.key || 'D')}</span>
                        <span class="admin-meta-chip">${escapeHtml(tu.rhythm || 'reel')}</span>
                        <span class="admin-meta-chip">${escapeHtml(tu.difficulty || 'intermediate')}</span>
                        <span class="admin-meta-chip">${escapeHtml(tu.category || 'Celta')}</span>
                    </td>
                    <td>${isCurated ? '⭐' : '—'} / ${isPublic ? '🌍' : '🔒'}</td>
                    <td>❤️ ${tu.likes || 0}</td>
                    <td>
                        <span class="admin-status-pill ${statusClass}">${escapeHtml(statusLabel)}</span>
                        ${modReason ? `<div class="admin-sub-note">${escapeHtml(modReason)}</div>` : ''}
                    </td>
                    <td>
                        <div class="admin-actions-row">
                            <button type="button" class="btn btn-xs btn-secondary" data-tune-act="edit">✏️</button>
                            ${st !== 'active' ? `<button type="button" class="btn btn-xs btn-secondary" data-tune-act="activate">✅</button>` : `<button type="button" class="btn btn-xs btn-secondary" data-tune-act="suspend">⏸️</button>`}
                            ${st !== 'banned' ? `<button type="button" class="btn btn-xs btn-danger" data-tune-act="ban">🚫</button>` : ''}
                            <button type="button" class="btn btn-xs btn-danger" data-tune-act="delete">🗑️</button>
                        </div>
                    </td>
                </tr>
                ${editRow}
            `;
        }).join('');
    }

    const tunesTbody = document.getElementById('admin-tunes-tbody');
    if (tunesTbody) {
        tunesTbody.addEventListener('change', (e) => {
            const cb = e.target.closest('input.admin-tune-check');
            if (!cb) return;
            if (cb.checked) selectedTuneIds.add(cb.dataset.tuneId);
            else selectedTuneIds.delete(cb.dataset.tuneId);
            updateBulkBar();
        });

        tunesTbody.addEventListener('click', async (e) => {
            const btn = e.target.closest('button[data-tune-act]');
            if (!btn) return;
            const act = btn.dataset.tuneAct;

            if (act === 'save-edit') {
                const editRow = btn.closest('tr[data-edit-tune-id]');
                const tuneId = editRow?.dataset.editTuneId;
                if (!tuneId) return;
                const patch = {
                    title: editRow.querySelector('[data-field="title"]').value.trim(),
                    artist: editRow.querySelector('[data-field="artist"]').value.trim(),
                    key: editRow.querySelector('[data-field="key"]').value,
                    rhythm: editRow.querySelector('[data-field="rhythm"]').value,
                    difficulty: editRow.querySelector('[data-field="difficulty"]').value,
                    category: editRow.querySelector('[data-field="category"]').value,
                    is_public: editRow.querySelector('[data-field="is_public"]').checked,
                    is_curated: editRow.querySelector('[data-field="is_curated"]').checked
                };
                try {
                    await apiFetch(`/api/admin/tunes/${encodeURIComponent(tuneId)}`, {
                        method: 'PATCH',
                        body: JSON.stringify(patch)
                    });
                    editingTuneId = null;
                    showNotificationToast(t('admin.actionApplied'));
                    await loadTunes();
                    if (typeof onCatalogUpdated === 'function') onCatalogUpdated();
                } catch (err) {
                    showNotificationToast(err.message);
                }
                return;
            }

            if (act === 'cancel-edit') {
                editingTuneId = null;
                renderTunesTable();
                return;
            }

            const row = btn.closest('tr[data-tune-id]');
            const tuneId = row?.dataset.tuneId;
            if (!tuneId) return;

            if (act === 'edit') {
                editingTuneId = editingTuneId === tuneId ? null : tuneId;
                renderTunesTable();
                return;
            }

            try {
                if (act === 'delete') {
                    if (!confirm(t('admin.confirmDeleteTune'))) return;
                    await apiFetch(`/api/tunes/${encodeURIComponent(tuneId)}`, { method: 'DELETE' });
                    showNotificationToast(t('admin.tuneDeleted'));
                } else if (act === 'suspend' || act === 'ban') {
                    const reason = prompt(t('admin.reasonPrompt'), '') ?? '';
                    await apiFetch(`/api/admin/tunes/${encodeURIComponent(tuneId)}`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                            moderation_status: act === 'ban' ? 'banned' : 'suspended',
                            moderation_reason: reason
                        })
                    });
                    showNotificationToast(t('admin.actionApplied'));
                } else if (act === 'activate') {
                    await apiFetch(`/api/admin/tunes/${encodeURIComponent(tuneId)}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ moderation_status: 'active', moderation_reason: null })
                    });
                    showNotificationToast(t('admin.actionApplied'));
                }
                await loadTunes();
                if (typeof onCatalogUpdated === 'function') onCatalogUpdated();
            } catch (err) {
                showNotificationToast(err.message);
            }
        });
    }

    /* ----------------------------------------------------------------------
       4. IMPORTADOR ABC / ZIP EM LOTE
       ---------------------------------------------------------------------- */
    const dropzone = document.getElementById('admin-batch-dropzone');
    const fileInput = document.getElementById('admin-batch-file-input');
    const btnSelectFiles = document.getElementById('btn-admin-batch-select');
    const btnApplyBulkMeta = document.getElementById('btn-admin-batch-apply-meta');
    const btnImportBatch = document.getElementById('btn-admin-batch-submit');
    const btnClearBatch = document.getElementById('btn-admin-batch-clear');

    if (btnSelectFiles && fileInput) {
        btnSelectFiles.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            if (e.target.files?.length) {
                await ingestBatchFiles(Array.from(e.target.files));
                fileInput.value = '';
            }
        });
    }

    if (dropzone) {
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
        dropzone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            const files = Array.from(e.dataTransfer?.files || []);
            if (files.length) await ingestBatchFiles(files);
        });
    }

    async function ingestBatchFiles(files) {
        const rawAbcSources = [];

        for (const file of files) {
            const lower = file.name.toLowerCase();
            if (lower.endsWith('.zip')) {
                try {
                    const buf = await file.arrayBuffer();
                    const extracted = await extractAbcFilesFromZip(buf);
                    for (const entry of extracted) {
                        rawAbcSources.push({ name: `${file.name}/${entry.name}`, text: entry.content });
                    }
                } catch (err) {
                    showNotificationToast(`${file.name}: ${err.message}`);
                }
            } else if (lower.endsWith('.abc') || lower.endsWith('.txt')) {
                const text = await file.text();
                rawAbcSources.push({ name: file.name, text });
            }
        }

        const defaultCat = document.getElementById('admin-batch-default-category')?.value || 'Celta';
        const parsedBatch = [];

        for (const src of rawAbcSources) {
            const chunks = splitABCTunes(src.text, src.name);
            for (const chunk of chunks) {
                const parsed = parseABCNotation(chunk.abcText);
                if (parsed.error || !parsed.notes?.length) {
                    parsedBatch.push({
                        include: false,
                        error: parsed.error || t('admin.batchParseError'),
                        sourceFile: chunk.sourceFile,
                        title: src.name,
                        artist: 'Tradicional',
                        key: 'D',
                        tempo: 110,
                        timeSignature: '4/4',
                        rhythm: 'reel',
                        difficulty: 'beginner',
                        category: defaultCat,
                        notes: [],
                        fitStatus: 'error',
                        missingMeta: true
                    });
                    continue;
                }

                const fit = analyzeABCWhistleFit(chunk.abcText);
                const rhythm = inferRhythmFromTimeSignature(parsed.timeSignature);
                const difficulty = inferDifficultyFromNotes(parsed.notes, parsed.tempo);
                const missingTitle = !parsed.title || parsed.title === 'Melodia Celta (ABC)';
                const missingArtist = !parsed.artist || parsed.artist === 'Tradicional';

                parsedBatch.push({
                    include: true,
                    error: null,
                    sourceFile: chunk.sourceFile,
                    title: missingTitle ? src.name.replace(/\.(abc|txt)$/i, '') : parsed.title,
                    artist: parsed.artist || 'Tradicional',
                    key: WHISTLE_KEYS.includes(parsed.key) ? parsed.key : 'D',
                    tempo: parsed.tempo || 110,
                    timeSignature: parsed.timeSignature || '4/4',
                    rhythm,
                    difficulty,
                    category: defaultCat,
                    notes: parsed.notes,
                    fitStatus: fit.status || 'perfect',
                    missingMeta: missingTitle || missingArtist
                });
            }
        }

        batchItems = batchItems.concat(parsedBatch);
        renderBatchPreview();
    }

    function renderBatchPreview() {
        const tbody = document.getElementById('admin-batch-tbody');
        const summaryEl = document.getElementById('admin-batch-summary');
        if (!tbody) return;

        const validCount = batchItems.filter(x => x.include && !x.error).length;
        const missingCount = batchItems.filter(x => x.missingMeta && !x.error).length;
        const errorCount = batchItems.filter(x => x.error).length;

        if (summaryEl) {
            summaryEl.textContent = t('admin.batchSummary', {
                total: batchItems.length,
                valid: validCount,
                missing: missingCount,
                errors: errorCount
            });
        }
        if (btnImportBatch) {
            btnImportBatch.disabled = validCount === 0;
            btnImportBatch.textContent = t('admin.batchSubmitBtn', { count: validCount });
        }

        if (batchItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="admin-empty">${escapeHtml(t('admin.batchEmpty'))}</td></tr>`;
            return;
        }

        tbody.innerHTML = batchItems.map((item, idx) => {
            const fitBadge = item.error
                ? `<span class="admin-status-pill is-banned">✕ ${escapeHtml(item.error)}</span>`
                : item.fitStatus === 'perfect'
                    ? `<span class="admin-status-pill is-active">✓ Fit</span>`
                    : `<span class="admin-status-pill is-suspended">⚠️ ${escapeHtml(item.fitStatus)}</span>`;

            return `
                <tr data-batch-idx="${idx}" class="${item.missingMeta ? 'admin-row-warn' : ''}">
                    <td><input type="checkbox" class="admin-batch-check" ${item.include ? 'checked' : ''} ${item.error ? 'disabled' : ''}></td>
                    <td>
                        <input type="text" class="form-control modal-form-input admin-batch-input" data-b-field="title" value="${escapeHtml(item.title)}" ${item.error ? 'disabled' : ''}>
                        <div class="admin-sub-note">${escapeHtml(item.sourceFile)}</div>
                    </td>
                    <td><input type="text" class="form-control modal-form-input admin-batch-input" data-b-field="artist" value="${escapeHtml(item.artist)}" ${item.error ? 'disabled' : ''}></td>
                    <td>
                        <select class="form-control modal-form-input admin-batch-select" data-b-field="key" ${item.error ? 'disabled' : ''}>
                            ${WHISTLE_KEYS.map(k => `<option value="${k}" ${item.key === k ? 'selected' : ''}>${k}</option>`).join('')}
                        </select>
                    </td>
                    <td>
                        <select class="form-control modal-form-input admin-batch-select" data-b-field="rhythm" ${item.error ? 'disabled' : ''}>
                            ${RHYTHMS.map(r => `<option value="${r}" ${item.rhythm === r ? 'selected' : ''}>${r}</option>`).join('')}
                        </select>
                    </td>
                    <td>
                        <select class="form-control modal-form-input admin-batch-select" data-b-field="difficulty" ${item.error ? 'disabled' : ''}>
                            ${DIFFICULTIES.map(d => `<option value="${d}" ${item.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}
                        </select>
                    </td>
                    <td>
                        <select class="form-control modal-form-input admin-batch-select" data-b-field="category" ${item.error ? 'disabled' : ''}>
                            ${CATEGORIES.map(c => `<option value="${c}" ${item.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </td>
                    <td>${fitBadge}</td>
                </tr>
            `;
        }).join('');
    }

    const batchTbody = document.getElementById('admin-batch-tbody');
    if (batchTbody) {
        batchTbody.addEventListener('change', (e) => {
            const row = e.target.closest('tr[data-batch-idx]');
            if (!row) return;
            const idx = parseInt(row.dataset.batchIdx, 10);
            const item = batchItems[idx];
            if (!item) return;

            if (e.target.classList.contains('admin-batch-check')) {
                item.include = e.target.checked;
                renderBatchPreview();
                return;
            }
            const field = e.target.dataset.bField;
            if (field) {
                item[field] = e.target.value;
                item.missingMeta = !item.title?.trim() || item.artist === 'Tradicional';
            }
        });
    }

    if (btnApplyBulkMeta) {
        btnApplyBulkMeta.addEventListener('click', () => {
            const cat = document.getElementById('admin-batch-default-category')?.value;
            const rhy = document.getElementById('admin-batch-default-rhythm')?.value;
            const diff = document.getElementById('admin-batch-default-difficulty')?.value;
            const artist = document.getElementById('admin-batch-default-artist')?.value.trim();

            for (const item of batchItems) {
                if (item.error) continue;
                if (cat) item.category = cat;
                if (rhy && rhy !== 'auto') item.rhythm = rhy;
                if (diff && diff !== 'auto') item.difficulty = diff;
                if (artist) item.artist = artist;
            }
            renderBatchPreview();
            showNotificationToast(t('admin.actionApplied'));
        });
    }

    if (btnClearBatch) {
        btnClearBatch.addEventListener('click', () => {
            batchItems = [];
            renderBatchPreview();
        });
    }

    if (btnImportBatch) {
        btnImportBatch.addEventListener('click', async () => {
            const toImport = batchItems.filter(x => x.include && !x.error);
            if (toImport.length === 0) return;

            const isPublic = document.getElementById('admin-batch-public')?.checked ?? true;
            const isCurated = document.getElementById('admin-batch-curated')?.checked ?? true;
            const skipDuplicates = document.getElementById('admin-batch-skip-dups')?.checked ?? true;
            const authorName = document.getElementById('admin-batch-default-author')?.value.trim() || 'Curadoria';

            try {
                btnImportBatch.disabled = true;
                const payload = {
                    authorName,
                    skipDuplicates,
                    tunes: toImport.map(x => ({
                        title: x.title.trim(),
                        artist: x.artist.trim() || 'Tradicional',
                        key: x.key,
                        tempo: x.tempo,
                        timeSignature: x.timeSignature,
                        category: x.category,
                        difficulty: x.difficulty,
                        rhythm: x.rhythm,
                        notes: x.notes,
                        isPublic,
                        isCurated
                    }))
                };
                const res = await apiFetch('/api/admin/tunes/batch', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                showNotificationToast(t('admin.batchSuccess', {
                    imported: res.importedCount || 0,
                    skipped: res.skippedCount || 0
                }));
                batchItems = [];
                renderBatchPreview();
                if (typeof onCatalogUpdated === 'function') onCatalogUpdated();
            } catch (err) {
                showNotificationToast(err.message);
            } finally {
                btnImportBatch.disabled = false;
            }
        });
    }

    /* ----------------------------------------------------------------------
       5. LOG DE AUDITORIA
       ---------------------------------------------------------------------- */
    const btnAuditRefresh = document.getElementById('btn-admin-audit-refresh');
    if (btnAuditRefresh) btnAuditRefresh.addEventListener('click', loadAuditLogs);

    async function loadAuditLogs() {
        const tbody = document.getElementById('admin-audit-tbody');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="5" class="admin-loading">${escapeHtml(t('admin.loading'))}</td></tr>`;
        try {
            const data = await apiFetch('/api/admin/audit');
            const logs = data.logs || [];
            if (logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="admin-empty">${escapeHtml(t('admin.noAuditLogs'))}</td></tr>`;
                return;
            }
            tbody.innerHTML = logs.map(l => `
                <tr>
                    <td>${escapeHtml(formatShortDate(l.created_at))}</td>
                    <td>${escapeHtml(l.admin_name || l.admin_id || 'Admin')}</td>
                    <td><span class="admin-meta-chip">${escapeHtml(l.action)}</span></td>
                    <td>${escapeHtml(l.target_type || '')} ${escapeHtml(l.target_id || '')}</td>
                    <td class="admin-audit-details">${escapeHtml(typeof l.details === 'string' ? l.details : JSON.stringify(l.details || {}))}</td>
                </tr>
            `).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="5" class="admin-error">${escapeHtml(err.message)}</td></tr>`;
        }
    }

    return {
        open,
        close,
        switchTab
    };
}
