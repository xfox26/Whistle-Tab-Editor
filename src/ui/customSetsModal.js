/* ==========================================================================
   MODAL CONSTRUTOR DE SETS PERSONALIZADOS (ITEM 3.5)
   ========================================================================== */

import { escapeHTML } from '../config/whistleData.js';
import {
    getAllSets,
    getLocalizedSetText,
    createCustomSet,
    updateCustomSet,
    deleteCustomSet
} from './libraryMastery.js';
import { t } from '../i18n/index.js';
import { showNotificationToast } from '../utils/toast.js';

export function createCustomSetsController(ctx) {
    let modalEl = null;
    let editingSetId = null;
    let draftSongIds = [];

    function getSongTitleById(songId) {
        const songs = ctx.getSongs ? ctx.getSongs() : [];
        const found = songs.find(s => s.id === songId);
        return found ? found.title : songId;
    }

    function populateSongSelect() {
        const selectEl = document.getElementById('cset-song-select');
        if (!selectEl) return;
        const songs = ctx.getSongs ? ctx.getSongs() : [];
        const sorted = [...songs].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        selectEl.innerHTML = sorted.map(s => {
            const key = s.key || 'D';
            const rhythm = s.rhythm || '';
            const meta = rhythm ? `${key} • ${rhythm}` : key;
            return `<option value="${escapeHTML(s.id)}">${escapeHTML(s.title)} (${escapeHTML(meta)})</option>`;
        }).join('');
    }

    function renderDraftSongsList() {
        const listEl = document.getElementById('cset-songs-list');
        if (!listEl) return;

        if (draftSongIds.length === 0) {
            listEl.innerHTML = `<li class="cset-empty-msg">${escapeHTML(t('customSets.emptyDraft'))}</li>`;
            return;
        }

        listEl.innerHTML = draftSongIds.map((songId, idx) => {
            const title = getSongTitleById(songId);
            const disableUp = idx === 0 ? 'disabled' : '';
            const disableDown = idx === draftSongIds.length - 1 ? 'disabled' : '';
            return `
                <li class="cset-song-row" data-idx="${idx}">
                    <span class="cset-song-order">${idx + 1}.</span>
                    <span class="cset-song-name">${escapeHTML(title)}</span>
                    <div class="cset-order-btns">
                        <button type="button" class="btn btn-secondary btn-xs cset-move-up" data-idx="${idx}" ${disableUp} title="${escapeHTML(t('customSets.moveUp'))}" aria-label="${escapeHTML(t('customSets.moveUp'))}">▲</button>
                        <button type="button" class="btn btn-secondary btn-xs cset-move-down" data-idx="${idx}" ${disableDown} title="${escapeHTML(t('customSets.moveDown'))}" aria-label="${escapeHTML(t('customSets.moveDown'))}">▼</button>
                        <button type="button" class="btn btn-danger btn-xs cset-remove-song" data-idx="${idx}" title="${escapeHTML(t('customSets.removeSong'))}" aria-label="${escapeHTML(t('customSets.removeSong'))}">&times;</button>
                    </div>
                </li>
            `;
        }).join('');
    }

    function renderSetsList() {
        const container = document.getElementById('csets-list');
        if (!container) return;

        const allSets = getAllSets();
        container.innerHTML = allSets.map(set => {
            const { title, description } = getLocalizedSetText(set);
            const isCustom = Boolean(set.isCustom);
            const badgeLabel = isCustom ? t('customSets.badgeCustom') : t('customSets.badgeTraditional');
            const badgeClass = isCustom ? 'cset-badge-custom' : 'cset-badge-trad';
            const tuneNames = (set.songIds || []).map((id, i) => `${i + 1}. ${getSongTitleById(id)}`).join(' → ');

            const editControls = isCustom ? `
                <button type="button" class="btn btn-secondary btn-xs cset-edit-btn" data-set-id="${escapeHTML(set.id)}">${escapeHTML(t('customSets.editBtn'))}</button>
                <button type="button" class="btn btn-danger btn-xs cset-delete-btn" data-set-id="${escapeHTML(set.id)}">${escapeHTML(t('customSets.deleteBtn'))}</button>
            ` : '';

            return `
                <div class="cset-card" data-set-id="${escapeHTML(set.id)}">
                    <div class="cset-card-header">
                        <div class="cset-card-title-row">
                            <strong class="cset-card-title">${escapeHTML(title)}</strong>
                            <span class="cset-badge ${badgeClass}">${escapeHTML(badgeLabel)}</span>
                        </div>
                        <span class="cset-count-label">${escapeHTML(t('customSets.tuneCount', { count: (set.songIds || []).length }))}</span>
                    </div>
                    ${description ? `<div class="cset-card-desc">${escapeHTML(description)}</div>` : ''}
                    <div class="cset-card-tunes">${escapeHTML(tuneNames)}</div>
                    <div class="cset-card-actions">
                        <button type="button" class="btn btn-primary btn-xs cset-play-btn" data-set-id="${escapeHTML(set.id)}">▶ ${escapeHTML(t('customSets.playBtn'))}</button>
                        ${editControls}
                    </div>
                </div>
            `;
        }).join('');
    }

    function resetBuilderForm() {
        editingSetId = null;
        draftSongIds = [];
        const titleInput = document.getElementById('cset-title-input');
        const heading = document.getElementById('cset-form-heading');
        if (titleInput) titleInput.value = '';
        if (heading) heading.textContent = t('customSets.newSetHeading');
        renderDraftSongsList();
    }

    function startEditSet(setId) {
        const allSets = getAllSets();
        const found = allSets.find(s => s.id === setId && s.isCustom);
        if (!found) return;

        editingSetId = found.id;
        draftSongIds = [...(found.songIds || [])];
        const titleInput = document.getElementById('cset-title-input');
        const heading = document.getElementById('cset-form-heading');
        if (titleInput) titleInput.value = found.title || '';
        if (heading) heading.textContent = t('customSets.editSetHeading');
        renderDraftSongsList();
    }

    function handleSaveSet() {
        const titleInput = document.getElementById('cset-title-input');
        const title = titleInput ? titleInput.value.trim() : '';
        if (!title) {
            showNotificationToast(t('customSets.nameRequired'));
            if (titleInput) titleInput.focus();
            return;
        }
        if (draftSongIds.length < 1) {
            showNotificationToast(t('customSets.minSongsRequired'));
            return;
        }

        if (editingSetId) {
            updateCustomSet(editingSetId, { title, songIds: draftSongIds });
            showNotificationToast(t('customSets.updatedToast', { title }));
        } else {
            createCustomSet({ title, songIds: draftSongIds });
            showNotificationToast(t('customSets.createdToast', { title }));
        }
        resetBuilderForm();
        renderSetsList();
    }

    function open() {
        if (!modalEl) modalEl = document.getElementById('custom-sets-modal');
        if (!modalEl) return;
        populateSongSelect();
        renderSetsList();
        renderDraftSongsList();
        modalEl.style.display = 'flex';
        modalEl.classList.add('open');
    }

    function close() {
        if (!modalEl) modalEl = document.getElementById('custom-sets-modal');
        if (!modalEl) return;
        modalEl.style.display = 'none';
        modalEl.classList.remove('open');
    }

    function init() {
        modalEl = document.getElementById('custom-sets-modal');
        if (!modalEl) return;

        const btnOpen = document.getElementById('btn-open-custom-sets');
        const btnClose = document.getElementById('btn-close-custom-sets');
        const btnCloseDone = document.getElementById('btn-close-custom-sets-done');
        const btnAddSong = document.getElementById('btn-cset-add-song');
        const btnSave = document.getElementById('btn-cset-save');
        const btnReset = document.getElementById('btn-cset-reset');
        const songsListEl = document.getElementById('cset-songs-list');
        const setsListEl = document.getElementById('csets-list');

        if (btnOpen) btnOpen.addEventListener('click', open);
        if (btnClose) btnClose.addEventListener('click', close);
        if (btnCloseDone) btnCloseDone.addEventListener('click', close);

        modalEl.addEventListener('click', (e) => {
            if (e.target === modalEl) close();
        });

        if (btnAddSong) {
            btnAddSong.addEventListener('click', () => {
                const selectEl = document.getElementById('cset-song-select');
                if (!selectEl || !selectEl.value) return;
                draftSongIds.push(selectEl.value);
                renderDraftSongsList();
            });
        }

        if (btnSave) btnSave.addEventListener('click', handleSaveSet);
        if (btnReset) btnReset.addEventListener('click', resetBuilderForm);

        if (songsListEl) {
            songsListEl.addEventListener('click', (e) => {
                const upBtn = e.target.closest('.cset-move-up');
                const downBtn = e.target.closest('.cset-move-down');
                const rmBtn = e.target.closest('.cset-remove-song');

                if (upBtn) {
                    const idx = parseInt(upBtn.dataset.idx, 10);
                    if (idx > 0 && idx < draftSongIds.length) {
                        [draftSongIds[idx - 1], draftSongIds[idx]] = [draftSongIds[idx], draftSongIds[idx - 1]];
                        renderDraftSongsList();
                    }
                } else if (downBtn) {
                    const idx = parseInt(downBtn.dataset.idx, 10);
                    if (idx >= 0 && idx < draftSongIds.length - 1) {
                        [draftSongIds[idx], draftSongIds[idx + 1]] = [draftSongIds[idx + 1], draftSongIds[idx]];
                        renderDraftSongsList();
                    }
                } else if (rmBtn) {
                    const idx = parseInt(rmBtn.dataset.idx, 10);
                    if (idx >= 0 && idx < draftSongIds.length) {
                        draftSongIds.splice(idx, 1);
                        renderDraftSongsList();
                    }
                }
            });
        }

        if (setsListEl) {
            setsListEl.addEventListener('click', (e) => {
                const playBtn = e.target.closest('.cset-play-btn');
                const editBtn = e.target.closest('.cset-edit-btn');
                const delBtn = e.target.closest('.cset-delete-btn');

                if (playBtn) {
                    const setId = playBtn.dataset.setId;
                    if (ctx.activateSet && ctx.activateSet(setId, true)) {
                        close();
                    }
                } else if (editBtn) {
                    startEditSet(editBtn.dataset.setId);
                } else if (delBtn) {
                    const setId = delBtn.dataset.setId;
                    if (deleteCustomSet(setId)) {
                        if (editingSetId === setId) resetBuilderForm();
                        renderSetsList();
                        showNotificationToast(t('customSets.deletedToast'));
                    }
                }
            });
        }
    }

    return { init, open, close, renderSetsList };
}
