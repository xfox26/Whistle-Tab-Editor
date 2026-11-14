/* ==========================================================================
   PAINEL DE PRÁTICA E MAESTRIA (ITEM 3.8)
   Resumo consolidado de músicas dominadas, acurácia média e histórico recente
   ========================================================================== */

import { t } from '../i18n/index.js';
import { escapeHTML } from '../config/whistleData.js';
import { computeMasterySummary } from './libraryMastery.js';

function getStatusLabel(status) {
    if (status === 'mastered') return t('masteryDash.statusMastered');
    if (status === 'practicing') return t('masteryDash.statusPracticing');
    return t('masteryDash.statusLearning');
}

function buildMasteryCardHTML(summary) {
    const historyHTML = summary.recentHistory.length > 0
        ? `<div class="mastery-history-section">
               <div class="mastery-history-title">${escapeHTML(t('masteryDash.recentTitle'))}</div>
               <div class="mastery-history-list">
                   ${summary.recentHistory.map(item => `
                       <button type="button" class="mastery-history-item" data-mastery-song-id="${escapeHTML(item.songId)}">
                           <span class="mastery-history-name">${escapeHTML(item.title)}</span>
                           <span class="mastery-history-meta">
                               <span class="mastery-status-pill ${escapeHTML(item.status)}">${escapeHTML(getStatusLabel(item.status))}</span>
                               ${item.bestAccuracy > 0 ? `<span class="mastery-metric">${item.bestAccuracy}%</span>` : ''}
                               ${item.maxBpm > 0 ? `<span class="mastery-metric">${item.maxBpm} BPM</span>` : ''}
                           </span>
                       </button>
                   `).join('')}
               </div>
           </div>`
        : `<p class="mastery-empty-hint">${escapeHTML(t('masteryDash.empty'))}</p>`;

    return `
        <div class="mastery-dash-header">
            <h4>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                <span>${escapeHTML(t('masteryDash.title'))}</span>
            </h4>
        </div>
        <div class="mastery-kpi-grid">
            <div class="mastery-kpi-tile">
                <span class="mastery-kpi-val" data-kpi="mastered">${summary.masteredCount}</span>
                <span class="mastery-kpi-label">${escapeHTML(t('masteryDash.masteredLabel'))}</span>
            </div>
            <div class="mastery-kpi-tile">
                <span class="mastery-kpi-val" data-kpi="accuracy">${summary.averageAccuracy}%</span>
                <span class="mastery-kpi-label">${escapeHTML(t('masteryDash.avgAccuracyLabel'))}</span>
            </div>
            <div class="mastery-kpi-tile">
                <span class="mastery-kpi-val" data-kpi="plays">${summary.totalPlays}</span>
                <span class="mastery-kpi-label">${escapeHTML(t('masteryDash.sessionsLabel'))}</span>
            </div>
            <div class="mastery-kpi-tile">
                <span class="mastery-kpi-val" data-kpi="bpm">${summary.bestMaxBpm > 0 ? summary.bestMaxBpm : '--'}</span>
                <span class="mastery-kpi-label">${escapeHTML(t('masteryDash.maxBpmLabel'))}</span>
            </div>
        </div>
        ${historyHTML}
    `;
}

export function renderMasteryDashboard({ songs = [], onSelectSong = null } = {}) {
    const summary = computeMasterySummary(songs);
    const html = buildMasteryCardHTML(summary);

    const containers = [
        document.getElementById('practice-mastery-card'),
        document.getElementById('profile-mastery-card')
    ].filter(Boolean);

    for (const el of containers) {
        el.innerHTML = html;
        if (typeof onSelectSong === 'function') {
            el.querySelectorAll('.mastery-history-item[data-mastery-song-id]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const songId = btn.dataset.masterySongId;
                    if (!songId) return;
                    const profileModal = document.getElementById('profile-modal');
                    if (profileModal && profileModal.style.display !== 'none') {
                        profileModal.style.display = 'none';
                    }
                    onSelectSong(songId);
                });
            });
        }
    }
}
