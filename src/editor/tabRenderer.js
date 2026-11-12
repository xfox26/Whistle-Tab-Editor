/* ==========================================================================
   RENDERIZADOR DE PARTITURA, DELEGAÇÃO DE EVENTOS & POPOVERS INLINE
   ========================================================================== */

import {
    STANDARD_FINGERINGS,
    getWhistleKeyData,
    getNoteDisplayName,
    isNoteOctave2,
    getOrnamentSymbol,
    cycleNextOrnament,
    getMeasureBeatsPerBar,
    escapeHTML
} from '../config/whistleData.js';
import { createMeasureBarSVG, getDurationSymbol } from '../ui/svgTemplates.js';
import { t } from '../i18n/index.js';
import { showNotificationToast } from '../utils/toast.js';
import { invalidateTessituraCache } from '../ui/libraryMastery.js';

export function createTabRenderer(ctx) {
    let activeInlinePopover = null;
    let activePlayingCardEl = null;
    let delegationAttached = false;

    function closeActivePopover() {
        if (activeInlinePopover) {
            if (activeInlinePopover.backdrop && activeInlinePopover.backdrop.parentNode) {
                activeInlinePopover.backdrop.remove();
            }
            if (activeInlinePopover.popover && activeInlinePopover.popover.parentNode) {
                activeInlinePopover.popover.remove();
            }
            activeInlinePopover = null;
        }
    }

    function positionPopover(popover, targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const popoverWidth = 260;
        const popoverHeight = 220;

        let left = rect.left + (rect.width / 2) - (popoverWidth / 2);
        left = Math.max(12, Math.min(window.innerWidth - popoverWidth - 12, left));

        let top = rect.bottom + 6;
        if (top + popoverHeight > window.innerHeight - 12) {
            top = Math.max(12, rect.top - popoverHeight - 6);
        }

        popover.style.left = `${Math.round(left)}px`;
        popover.style.top = `${Math.round(top)}px`;
    }

    function updatePrintSheetHeader(song) {
        if (!song) song = ctx.getCurrentSong();
        if (!song) return;
        const printTitleEl = document.getElementById('print-sheet-title');
        const printArtistEl = document.getElementById('print-meta-artist');
        const printKeyEl = document.getElementById('print-meta-key');
        const printTimeEl = document.getElementById('print-meta-time');
        const printTempoEl = document.getElementById('print-meta-tempo');
        const printRhythmEl = document.getElementById('print-meta-rhythm');

        if (printTitleEl) printTitleEl.textContent = song.title || t('editor.untitled');
        if (printArtistEl) printArtistEl.textContent = t('print.author', { artist: song.artist || t('editor.traditional') });
        if (printKeyEl) {
            const keyData = getWhistleKeyData(ctx.whistleKeyEl ? ctx.whistleKeyEl.value : song.key);
            printKeyEl.textContent = t('print.key', { key: keyData.name || song.key || 'D' });
        }
        if (printTimeEl) printTimeEl.textContent = t('print.time', { time: song.timeSignature || '4/4' });
        if (printTempoEl) printTempoEl.textContent = t('print.tempo', { tempo: song.tempo || 110 });
        if (printRhythmEl) {
            const rMap = {
                'reel': t('sidebar.rhythmReel'),
                'jig': t('sidebar.rhythmJig'),
                'waltz': t('sidebar.rhythmWaltz'),
                'polka': t('sidebar.rhythmPolka'),
                'air': t('sidebar.rhythmAir'),
                'soundtrack': t('sidebar.rhythmSoundtrack'),
                'other': t('editor.catOtherOpt')
            };
            printRhythmEl.textContent = rMap[song.rhythm] || (song.rhythm ? song.rhythm.toUpperCase() : t('sidebar.filterCeltic'));
        }
    }

    function openChordPopover(targetElement, noteObj, noteIndex) {
        closeActivePopover();

        const backdrop = document.createElement('div');
        backdrop.className = 'whistle-inline-popover-backdrop';

        const popover = document.createElement('div');
        popover.className = 'whistle-inline-popover chord-popover';

        const currentChord = (noteObj.chord || '').trim();
        const commonChords = ['D', 'G', 'A', 'Bm', 'Em', 'C', 'Am', 'Dm', 'F#m'];

        const chordButtonsHtml = commonChords.map(ch => {
            const isActive = (currentChord === ch) ? ' active' : '';
            return `<button type="button" class="chord-popover-btn${isActive}" data-chord="${ch}">${ch}</button>`;
        }).join('');

        popover.innerHTML = `
            <div class="whistle-popover-header">
                <span class="whistle-popover-title">${t('popovers.chordTitle')}</span>
                <button type="button" class="whistle-popover-close" title="Fechar">&times;</button>
            </div>
            <div class="chord-popover-grid">
                ${chordButtonsHtml}
            </div>
            <div class="chord-popover-custom-row">
                <input type="text" class="chord-popover-input" placeholder="Outro acorde (ex: A7, D/F#)..." value="${escapeHTML(currentChord)}">
                <button type="button" class="chord-popover-apply-btn">OK</button>
            </div>
            ${currentChord ? `<button type="button" class="chord-popover-clear-btn">🗑️ ${t('popovers.clearChord')}</button>` : ''}
        `;

        document.body.appendChild(backdrop);
        document.body.appendChild(popover);
        positionPopover(popover, targetElement);

        activeInlinePopover = { backdrop, popover };

        const applyChord = (newChord) => {
            ctx.pushHistoryState('Alterar Acorde');
            noteObj.chord = (newChord || '').trim();
            ctx.saveSongsToStorage();
            closeActivePopover();
            renderTab();
        };

        backdrop.addEventListener('click', closeActivePopover);
        popover.querySelector('.whistle-popover-close').addEventListener('click', closeActivePopover);

        popover.querySelectorAll('.chord-popover-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                applyChord(btn.dataset.chord);
            });
        });

        const inputEl = popover.querySelector('.chord-popover-input');
        const btnApply = popover.querySelector('.chord-popover-apply-btn');
        btnApply.addEventListener('click', () => {
            applyChord(inputEl.value);
        });
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyChord(inputEl.value);
            } else if (e.key === 'Escape') {
                closeActivePopover();
            }
        });

        const btnClear = popover.querySelector('.chord-popover-clear-btn');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                applyChord('');
            });
        }

        setTimeout(() => inputEl.focus(), 50);
    }

    function openDurationPopover(targetElement, noteObj, noteIndex) {
        closeActivePopover();

        const backdrop = document.createElement('div');
        backdrop.className = 'whistle-inline-popover-backdrop';

        const popover = document.createElement('div');
        popover.className = 'whistle-inline-popover duration-popover';

        const durations = [
            { val: 0.25, name: t('music.sixteenth'), beats: '0.25t' },
            { val: 0.5, name: t('music.eighth'), beats: '0.5t' },
            { val: 1.0, name: t('music.quarter'), beats: '1t' },
            { val: 1.5, name: t('music.dottedQuarter'), beats: '1.5t' },
            { val: 2.0, name: t('music.half'), beats: '2t' },
            { val: 3.0, name: t('music.dottedHalf'), beats: '3t' },
            { val: 4.0, name: t('music.whole'), beats: '4t' }
        ];

        const currentVal = parseFloat(noteObj.duration) || 1.0;

        const itemsHtml = durations.map(d => {
            const isActive = Math.abs(currentVal - d.val) < 0.05 ? ' active' : '';
            const sym = getDurationSymbol(d.val);
            return `
                <div class="duration-popover-item${isActive}" data-val="${d.val}">
                    <span class="dur-sym">${sym}</span>
                    <span class="dur-name">${d.name}</span>
                    <span class="dur-beats">${d.beats}</span>
                </div>
            `;
        }).join('');

        popover.innerHTML = `
            <div class="whistle-popover-header">
                <span class="whistle-popover-title">${t('popovers.durationTitle')}</span>
                <button type="button" class="whistle-popover-close" title="Fechar">&times;</button>
            </div>
            <div class="duration-popover-list">
                ${itemsHtml}
            </div>
        `;

        document.body.appendChild(backdrop);
        document.body.appendChild(popover);
        positionPopover(popover, targetElement);

        activeInlinePopover = { backdrop, popover };

        backdrop.addEventListener('click', closeActivePopover);
        popover.querySelector('.whistle-popover-close').addEventListener('click', closeActivePopover);

        popover.querySelectorAll('.duration-popover-item').forEach(item => {
            item.addEventListener('click', () => {
                const chosen = parseFloat(item.dataset.val);
                ctx.pushHistoryState('Alterar Duração');
                noteObj.duration = chosen;
                ctx.saveSongsToStorage();
                closeActivePopover();
                renderTab();
                ctx.playSingleNoteSound(noteObj);
            });
        });
    }

    function setActivePlayingNoteIndex(index) {
        if (activePlayingCardEl) {
            activePlayingCardEl.classList.remove('playing');
            activePlayingCardEl = null;
        }
        if (index < 0 || !ctx.tabSheetEl) return;
        const nextCard = ctx.tabSheetEl.querySelector(`.note-card[data-index="${index}"]`);
        if (nextCard) {
            nextCard.classList.add('playing');
            nextCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            activePlayingCardEl = nextCard;
        }
    }

    function clearActivePlayingNote() {
        if (activePlayingCardEl) {
            activePlayingCardEl.classList.remove('playing');
            activePlayingCardEl = null;
        }
        if (ctx.tabSheetEl) {
            ctx.tabSheetEl.querySelectorAll('.note-card.playing').forEach(c => c.classList.remove('playing'));
        }
    }

    function seekPlaybackToNote(index) {
        const currentSong = ctx.getCurrentSong();
        if (!currentSong || index < 0 || index >= currentSong.notes.length) return;
        ctx.clearPlaybackTimeout();
        clearActivePlayingNote();

        ctx.setCurrentPlayIndex(index);
        let beatPos = 0;
        for (let i = index - 1; i >= 0; i--) {
            const n = currentSong.notes[i];
            if (['BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END'].includes(n.note)) {
                break;
            }
            if (n.note !== 'LINEBREAK') {
                beatPos += (parseFloat(n.duration) || 1.0);
            }
        }
        ctx.setPlaybackMeasureBeatPos(beatPos);
        ctx.setPlaybackExpectedTimeMs(performance.now());
        ctx.playNextStep();
    }

    function loopSelection() {
        const currentSong = ctx.getCurrentSong();
        const selectedIndices = ctx.getSelectedIndices();
        if (!currentSong || selectedIndices.size < 2) return;
        const sorted = Array.from(selectedIndices).sort((a, b) => a - b);
        const loopA = sorted[0];
        const loopB = sorted[sorted.length - 1];
        ctx.setLoopState({
            loopAIndex: loopA,
            loopBIndex: loopB,
            isLoopActive: true,
            loopCycleCount: 0
        });

        if (ctx.btnToggleLoop) {
            ctx.btnToggleLoop.classList.add('active');
            ctx.btnToggleLoop.title = t('toasts.loopActiveNotes', { a: loopA + 1, b: loopB + 1 });
        }
        showNotificationToast(t('toasts.loopActiveNotes', { a: loopA + 1, b: loopB + 1 }));
        renderTab();
    }

    function loopMeasure(barIndex, mNum) {
        const currentSong = ctx.getCurrentSong();
        if (!currentSong) return;
        let startIdx = 0;
        for (let i = barIndex - 1; i >= 0; i--) {
            const n = currentSong.notes[i];
            if (['BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END'].includes(n.note)) {
                startIdx = i + 1;
                break;
            }
        }
        const measureNotes = [];
        for (let i = startIdx; i < barIndex; i++) {
            const n = currentSong.notes[i];
            if (n && n.note !== 'LINEBREAK') {
                measureNotes.push(i);
            }
        }

        if (measureNotes.length > 0) {
            const loopA = measureNotes[0];
            const loopB = measureNotes[measureNotes.length - 1];
            ctx.setLoopState({
                loopAIndex: loopA,
                loopBIndex: loopB,
                isLoopActive: true,
                loopCycleCount: 0
            });
            if (ctx.btnToggleLoop) {
                ctx.btnToggleLoop.classList.add('active');
            }
            showNotificationToast(t('toasts.loopActiveMeasure', { m: mNum, a: loopA + 1, b: loopB + 1 }));
            renderTab();
            if (ctx.getIsPlaying()) {
                seekPlaybackToNote(loopA);
            }
        } else {
            showNotificationToast(t('toasts.noNotesFound'));
        }
    }

    function setupTabSheetDelegation() {
        const tabSheetEl = ctx.tabSheetEl;
        if (!tabSheetEl || delegationAttached) return;
        delegationAttached = true;

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && activeInlinePopover) {
                closeActivePopover();
            }
        });

        tabSheetEl.addEventListener('click', (e) => {
            const currentSong = ctx.getCurrentSong();
            if (!currentSong || !Array.isArray(currentSong.notes)) return;
            const isReadOnly = ctx.getIsCurrentSongReadOnly();

            // 1. Botão de remover quebra de linha
            const lbBtn = e.target.closest('.line-break-btn');
            if (lbBtn) {
                e.stopPropagation();
                const lbEl = lbBtn.closest('.line-break');
                const idx = lbEl ? parseInt(lbEl.dataset.index, 10) : -1;
                if (idx >= 0) ctx.removeNote(idx);
                return;
            }

            // 2. Card de Barra de Compasso
            const barCard = e.target.closest('.measure-bar-card');
            if (barCard) {
                const idx = parseInt(barCard.dataset.index, 10);
                if (e.target.closest('.measure-bar-btn-loop')) {
                    e.stopPropagation();
                    const mNum = parseInt(barCard.dataset.measureNum, 10) || 1;
                    loopMeasure(idx, mNum);
                    return;
                }
                if (e.target.closest('.measure-bar-btn-delete')) {
                    e.stopPropagation();
                    if (!isReadOnly) ctx.removeNote(idx);
                    return;
                }
                const lastIdx = ctx.getLastSelectedNoteIndex();
                if (e.shiftKey && lastIdx !== -1) {
                    ctx.selectRangeNotes(lastIdx, idx);
                } else {
                    ctx.selectSingleNote(idx);
                }
                return;
            }

            // 3. Card de Nota Musical / Pausa
            const card = e.target.closest('.note-card');
            if (!card) return;
            const index = parseInt(card.dataset.index, 10);
            const noteObj = currentSong.notes[index];
            if (!noteObj) return;

            if (e.target.closest('.note-card-delete')) {
                e.stopPropagation();
                if (!isReadOnly) ctx.removeNote(index);
                return;
            }

            const chordEl = e.target.closest('.note-card-chord');
            if (chordEl) {
                e.stopPropagation();
                if (!isReadOnly) openChordPopover(chordEl, noteObj, index);
                return;
            }

            const ornamentEl = e.target.closest('.note-card-ornament');
            if (ornamentEl) {
                e.stopPropagation();
                if (isReadOnly) return;
                ctx.pushHistoryState('Alterar Ornamento');
                noteObj.ornament = cycleNextOrnament(noteObj.ornament);
                ctx.saveSongsToStorage();
                // Atualização pontual sem reconstruir toda a partitura
                const sym = getOrnamentSymbol(noteObj.ornament);
                const oName = noteObj.ornament || t('editor.none');
                ornamentEl.textContent = sym;
                ornamentEl.dataset.type = noteObj.ornament || '';
                ornamentEl.classList.toggle('empty', !sym);
                ornamentEl.title = t('editor.ornamentCardTooltip', { ornament: oName });
                ctx.updateTextNotesInput();
                ctx.playSingleNoteSound(noteObj);
                return;
            }

            const durSymbol = e.target.closest('.note-card-duration-symbol');
            if (durSymbol) {
                e.stopPropagation();
                if (!isReadOnly) openDurationPopover(durSymbol, noteObj, index);
                return;
            }

            if (e.target.closest('.note-card-lyric')) {
                return;
            }

            const lastIdx = ctx.getLastSelectedNoteIndex();
            if (e.shiftKey && lastIdx !== -1) {
                ctx.selectRangeNotes(lastIdx, index);
            } else {
                ctx.selectSingleNote(index);
            }

            ctx.setPlaybackStartIndex(index);

            if (ctx.getIsPlaying()) {
                seekPlaybackToNote(index);
            } else {
                ctx.playSingleNoteSound(noteObj);
            }
        });

        tabSheetEl.addEventListener('dblclick', (e) => {
            if (e.target.closest('.note-card-delete, .note-card-chord, .note-card-ornament, .note-card-duration-symbol, .note-card-lyric')) {
                return;
            }
            const card = e.target.closest('.note-card');
            if (!card) return;
            const currentSong = ctx.getCurrentSong();
            const index = parseInt(card.dataset.index, 10);
            const noteObj = currentSong && currentSong.notes[index];
            if (noteObj) {
                ctx.playSingleNoteSound(noteObj);
            }
        });

        tabSheetEl.addEventListener('input', (e) => {
            if (!e.target.classList.contains('note-card-lyric')) return;
            if (ctx.getIsCurrentSongReadOnly()) return;
            const card = e.target.closest('.note-card');
            const currentSong = ctx.getCurrentSong();
            if (!card || !currentSong) return;
            const index = parseInt(card.dataset.index, 10);
            if (currentSong.notes[index]) {
                currentSong.notes[index].lyric = e.target.value;
                ctx.saveSongsToStorage();
            }
        });

        tabSheetEl.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('note-card-lyric')) {
                e.stopPropagation();
            }
        });
    }

    function renderTab() {
        const currentSong = ctx.getCurrentSong();
        const tabSheetEl = ctx.tabSheetEl;
        const emptyMessageEl = ctx.emptyMessageEl;

        if (currentSong) {
            invalidateTessituraCache(currentSong);
            updatePrintSheetHeader(currentSong);
        }

        activePlayingCardEl = null;
        const cards = tabSheetEl.querySelectorAll('.note-card, .line-break, .measure-bar-card');
        cards.forEach(c => c.remove());

        if (!currentSong || currentSong.notes.length === 0) {
            emptyMessageEl.style.display = 'flex';
            ctx.updateSelectionToolbar();
            return;
        }

        emptyMessageEl.style.display = 'none';

        if (ctx.getPlaybackStartIndex() >= currentSong.notes.length) {
            ctx.setPlaybackStartIndexValue(0);
        }

        if (!document.getElementById('svg-global-defs')) {
            const defsContainer = document.createElement('div');
            defsContainer.id = 'svg-global-defs';
            defsContainer.style.height = '0';
            defsContainer.style.width = '0';
            defsContainer.style.position = 'absolute';
            defsContainer.style.overflow = 'hidden';
            defsContainer.innerHTML = `
                <svg>
                    <defs>
                        <linearGradient id="half-fill" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="50%" stop-color="currentColor" />
                            <stop offset="50%" stop-color="white" />
                        </linearGradient>
                    </defs>
                </svg>
            `;
            document.body.appendChild(defsContainer);
        }

        let measureNumber = 1;
        let currentMeasureBeats = 0;
        const fragment = document.createDocumentFragment();
        const currentKey = currentSong ? (currentSong.key || 'D') : (ctx.whistleKeyEl ? ctx.whistleKeyEl.value : 'D');
        const holeYPositions = [15, 30, 45, 60, 75, 90];
        const durLabels = {
            '0.25': `${t('music.sixteenth')} (0.25t)`,
            '0.5': `${t('music.eighth')} (0.5t)`,
            '1': `${t('music.quarter')} (1t)`,
            '1.5': `${t('music.dottedQuarter')} (1.5t)`,
            '2': `${t('music.half')} (2t)`,
            '3': `${t('music.dottedHalf')} (3t)`,
            '4': `${t('music.whole')} (4t)`
        };

        const selectedIndices = ctx.getSelectedIndices();
        const playbackStartIndex = ctx.getPlaybackStartIndex();
        const { isLoopActive, loopAIndex, loopBIndex } = ctx.getLoopState();
        const isReadOnly = ctx.getIsCurrentSongReadOnly();

        currentSong.notes.forEach((noteObj, index) => {
            if (noteObj.note === 'LINEBREAK') {
                const br = document.createElement('div');
                br.className = 'line-break';
                br.dataset.index = index;
                br.innerHTML = `
                    <button class="line-break-btn" title="${escapeHTML(t('editor.lineBreakTitle'))}">${escapeHTML(t('editor.lineBreakLabel'))} &times;</button>
                `;
                fragment.appendChild(br);
                return;
            }

            if (['BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END'].includes(noteObj.note)) {
                const barCard = document.createElement('div');
                barCard.className = `measure-bar-card ${selectedIndices.has(index) ? 'is-selected' : ''}`;
                barCard.dataset.index = index;
                barCard.dataset.measureNum = measureNumber;

                const timeSig = ctx.songTimeSignatureEl ? ctx.songTimeSignatureEl.value : (currentSong.timeSignature || '4/4');
                const expectedBeats = getMeasureBeatsPerBar(timeSig);
                let metricBadge = '';
                if (currentMeasureBeats > 0) {
                    const isExact = Math.abs(currentMeasureBeats - expectedBeats) < 0.05;
                    const isAnacrusis = (measureNumber === 1 && currentMeasureBeats < expectedBeats);
                    if (isExact) {
                        metricBadge = `<span class="measure-metric ok" title="${escapeHTML(t('editor.measureCompleteTitle', { beats: currentMeasureBeats, expected: expectedBeats }))}">✓</span>`;
                    } else if (isAnacrusis) {
                        metricBadge = `<span class="measure-metric anacrusis" title="${escapeHTML(t('editor.measureAnacrusisTitle', { beats: currentMeasureBeats, expected: expectedBeats }))}">${currentMeasureBeats}t</span>`;
                    } else {
                        metricBadge = `<span class="measure-metric alert" title="${escapeHTML(t('editor.measureIncompleteTitle', { beats: currentMeasureBeats, expected: expectedBeats }))}">⚠️ ${currentMeasureBeats}t</span>`;
                    }
                }

                barCard.title = t('editor.measureBarTooltip', { type: noteObj.note, num: measureNumber });

                barCard.innerHTML = `
                    <button class="measure-bar-btn-loop" title="${escapeHTML(t('editor.loopMeasureBtnTitle'))}">🔁</button>
                    <button class="measure-bar-btn-delete" title="${escapeHTML(t('editor.deleteBarBtnTitle'))}">&times;</button>
                    <div class="measure-number">${measureNumber}</div>
                    ${metricBadge}
                    ${createMeasureBarSVG(noteObj.note)}
                `;

                fragment.appendChild(barCard);
                currentMeasureBeats = 0;
                measureNumber++;
                return;
            }

            currentMeasureBeats += (parseFloat(noteObj.duration) || 1.0);
            const isRest = noteObj.note === 'REST';
            const isPlaybackStart = (index === playbackStartIndex);
            const isSelected = selectedIndices.has(index);

            const isLoopA = (index === loopAIndex);
            const isLoopB = (index === loopBIndex);
            const isInLoop = (isLoopActive && loopAIndex !== -1 && loopBIndex !== -1 && index >= Math.min(loopAIndex, loopBIndex) && index <= Math.max(loopAIndex, loopBIndex));
            let loopClasses = '';
            if (isLoopA) loopClasses += ' loop-marker-a';
            if (isLoopB) loopClasses += ' loop-marker-b';
            if (isInLoop) loopClasses += ' in-loop';

            const card = document.createElement('div');
            card.className = `note-card${isRest ? ' rest-card' : ''}${isPlaybackStart ? ' playback-start' : ''}${isSelected ? ' is-selected' : ''}${loopClasses}`;
            card.dataset.index = index;
            card.title = t('editor.noteCardTooltip');

            const displayName = getNoteDisplayName(noteObj.note, currentKey);
            const isOctave2 = isNoteOctave2(noteObj.note, currentKey);
            const pitchClass = `note-card-pitch ${isRest ? 'rest' : ''} ${isOctave2 ? 'octave2' : ''}`;

            const fingering = noteObj.fingering || STANDARD_FINGERINGS[noteObj.note] || [0, 0, 0, 0, 0, 0];

            let svgContent = '';
            if (isRest) {
                svgContent = `
                    <svg class="whistle-svg" viewBox="0 0 22 100">
                        <path d="M11,35 L11,65 M6,40 L16,40 M8,50 L14,50 M6,60 L16,60" stroke="var(--parchment-text)" stroke-width="2" fill="none" />
                    </svg>
                `;
            } else {
                let circles = '';
                fingering.forEach((state, hIdx) => {
                    const y = holeYPositions[hIdx];
                    let fillClass = 'open';
                    if (state === 1) fillClass = 'closed';
                    else if (state === 0.5) fillClass = 'half';

                    circles += `<circle cx="11" cy="${y}" r="4.5" class="${fillClass}" data-hole-index="${hIdx}" />`;
                });

                svgContent = `
                    <svg class="whistle-svg" viewBox="0 0 22 105" data-note-index="${index}">
                        <line x1="11" y1="5" x2="11" y2="100" class="body-line" />
                        ${circles}
                    </svg>
                `;
            }

            const durTitle = durLabels[String(noteObj.duration)] || `${noteObj.duration}t`;
            const chordDisplay = noteObj.chord || '';
            const ornamentDisplay = getOrnamentSymbol(noteObj.ornament);
            const ornamentName = noteObj.ornament || t('editor.none');
            const readonlyAttr = isReadOnly ? ' readonly' : '';

            card.innerHTML = `
                <button class="note-card-delete" title="${escapeHTML(t('editor.deleteNote'))}">&times;</button>
                <div class="note-card-chord ${chordDisplay ? '' : 'empty'}" title="${escapeHTML(t('editor.chordCardTooltip'))}">${escapeHTML(chordDisplay || '+')}</div>
                <div class="note-card-ornament ${ornamentDisplay ? '' : 'empty'}" data-type="${noteObj.ornament || ''}" title="${escapeHTML(t('editor.ornamentCardTooltip', { ornament: ornamentName }))}">${ornamentDisplay}</div>
                <div class="${pitchClass}">${isRest ? escapeHTML(t('music.rest')) : displayName}</div>
                ${svgContent}
                <div class="note-card-duration-symbol" title="${escapeHTML(t('editor.durationCardTooltip', { dur: durTitle }))}" data-index="${index}">${getDurationSymbol(noteObj.duration)}</div>
                <input type="text" class="note-card-lyric" value="${escapeHTML(noteObj.lyric || '')}" placeholder="..." title="${escapeHTML(t('editor.lyricTooltip'))}"${readonlyAttr}>
                <div class="note-card-duration-bar" data-duration="${noteObj.duration}"></div>
            `;

            fragment.appendChild(card);
        });

        tabSheetEl.appendChild(fragment);
        ctx.updateTextNotesInput();
        ctx.updateSelectionToolbar();
    }

    return {
        closeActivePopover,
        updatePrintSheetHeader,
        openChordPopover,
        openDurationPopover,
        setActivePlayingNoteIndex,
        clearActivePlayingNote,
        seekPlaybackToNote,
        loopSelection,
        loopMeasure,
        setupTabSheetDelegation,
        renderTab
    };
}
