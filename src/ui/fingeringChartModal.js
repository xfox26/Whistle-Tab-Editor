/* ==========================================================================
   MODAL INTERATIVO: TABELA DE DIGITAÇÃO, MEIO-FUROS & ALTERNATIVAS
   ========================================================================== */

import { WHISTLE_KEYS_DATA } from '../config/whistleData.js';
import { scheduleWhistleVoice } from '../audio/synthEngine.js';
import {
    detectWhistlePitch,
    getSharedAudioBuffer,
    noteFromPitchVal,
    centsOffFromPitchVal,
    getReferenceA4
} from '../audio/pitchEngine.js';
import { t } from '../i18n/index.js';

const CHROMATIC_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

function getNoteNameFromSemitones(d5OffsetSemitones) {
    // D5 é MIDI 74 (D=2, oitava 5 => 12*(5+1)+2 = 74)
    const midi = 74 + d5OffsetSemitones;
    const name = CHROMATIC_NAMES[((midi % 12) + 12) % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${name}${octave}`;
}

function getFrequencyFromSemitones(d5OffsetSemitones) {
    // D5 = 587.3295 Hz em A4=440Hz (ou proporcional a getReferenceA4())
    const a4 = getReferenceA4();
    const d5Hz = a4 * Math.pow(2, 5 / 12); // D5 está 5 semitons acima de A4 (69 -> 74)
    return d5Hz * Math.pow(2, d5OffsetSemitones / 12);
}

function formatFingeringCode(holes) {
    const sym = (v) => (v === 1 ? 'X' : v === 0.5 ? '◑' : 'O');
    return `${holes.slice(0, 3).map(sym).join('')} ${holes.slice(3, 6).map(sym).join('')}`;
}

function buildChartDiagramSVG(holes) {
    const yPos = [11, 23, 35, 47, 59, 71];
    let body = `<rect x="2" y="2" width="18" height="78" rx="9" class="fc-whistle-body" />`;
    holes.forEach((state, idx) => {
        const y = yPos[idx];
        const cls = state === 1 ? 'hole-closed' : state === 0.5 ? 'hole-half' : 'hole-open';
        body += `<circle cx="11" cy="${y}" r="4.3" class="${cls}" />`;
    });
    return `<svg class="fc-whistle-svg" viewBox="0 0 22 82" width="22" height="82" aria-hidden="true">${body}</svg>`;
}

/**
 * Monta os itens da tabela para o tom escolhido.
 */
function buildChartEntriesForKey(whistleKey) {
    const keyData = WHISTLE_KEYS_DATA[whistleKey] || WHISTLE_KEYS_DATA.D;
    const baseSemi = keyData.semitones || 0;

    const makeEntry = ({ id, semitoneFromRoot, fingering, octave, category, labelKey, tipKey, noteKeyHint }) => {
        const totalSemi = baseSemi + semitoneFromRoot;
        const noteName = getNoteNameFromSemitones(totalSemi);
        const freq = getFrequencyFromSemitones(totalSemi);
        return {
            id,
            noteName,
            freq,
            fingering,
            code: formatFingeringCode(fingering),
            octave,
            category, // 'standard' | 'halfhole' | 'alt'
            label: labelKey ? t(labelKey) : '',
            tip: tipKey ? t(tipKey) : '',
            noteKeyHint: noteKeyHint || 'D5'
        };
    };

    return [
        // 1ª Oitava Diatônica
        makeEntry({ id: 'd1', semitoneFromRoot: 0, fingering: [1, 1, 1, 1, 1, 1], octave: 1, category: 'standard', noteKeyHint: 'D5' }),
        makeEntry({ id: 'd2', semitoneFromRoot: 2, fingering: [1, 1, 1, 1, 1, 0], octave: 1, category: 'standard', noteKeyHint: 'E5' }),
        makeEntry({ id: 'd3', semitoneFromRoot: 4, fingering: [1, 1, 1, 1, 0, 0], octave: 1, category: 'standard', noteKeyHint: 'F#5' }),
        makeEntry({ id: 'd4', semitoneFromRoot: 5, fingering: [1, 1, 1, 0, 0, 0], octave: 1, category: 'standard', noteKeyHint: 'G5' }),
        makeEntry({ id: 'd5', semitoneFromRoot: 7, fingering: [1, 1, 0, 0, 0, 0], octave: 1, category: 'standard', noteKeyHint: 'A5' }),
        makeEntry({ id: 'd6', semitoneFromRoot: 9, fingering: [1, 0, 0, 0, 0, 0], octave: 1, category: 'standard', noteKeyHint: 'B5' }),
        makeEntry({ id: 'd7', semitoneFromRoot: 11, fingering: [0, 0, 0, 0, 0, 0], octave: 1, category: 'standard', noteKeyHint: 'C#6' }),

        // 2ª Oitava Diatônica (+ alternativa do 1')
        makeEntry({ id: 'o1', semitoneFromRoot: 12, fingering: [0, 1, 1, 1, 1, 1], octave: 2, category: 'standard', labelKey: 'fingeringChart.stdOct2', noteKeyHint: 'D6' }),
        makeEntry({ id: 'o1-alt', semitoneFromRoot: 12, fingering: [1, 1, 1, 1, 1, 1], octave: 2, category: 'alt', labelKey: 'fingeringChart.overblowAlt', tipKey: 'fingeringChart.tipOverblow', noteKeyHint: 'D6' }),
        makeEntry({ id: 'o2', semitoneFromRoot: 14, fingering: [1, 1, 1, 1, 1, 0], octave: 2, category: 'standard', noteKeyHint: 'E6' }),
        makeEntry({ id: 'o3', semitoneFromRoot: 16, fingering: [1, 1, 1, 1, 0, 0], octave: 2, category: 'standard', noteKeyHint: 'F#6' }),
        makeEntry({ id: 'o4', semitoneFromRoot: 17, fingering: [1, 1, 1, 0, 0, 0], octave: 2, category: 'standard', noteKeyHint: 'G6' }),
        makeEntry({ id: 'o5', semitoneFromRoot: 19, fingering: [1, 1, 0, 0, 0, 0], octave: 2, category: 'standard', noteKeyHint: 'A6' }),
        makeEntry({ id: 'o6', semitoneFromRoot: 21, fingering: [1, 0, 0, 0, 0, 0], octave: 2, category: 'standard', noteKeyHint: 'B6' }),
        makeEntry({ id: 'o7', semitoneFromRoot: 23, fingering: [0, 0, 0, 0, 0, 0], octave: 2, category: 'standard', noteKeyHint: 'C#7' }),

        // Meio-Furos & Cross-Fingerings (Cromáticas e 7ª menor)
        makeEntry({ id: 'b2-hh', semitoneFromRoot: 1, fingering: [1, 1, 1, 1, 1, 0.5], octave: 1, category: 'halfhole', labelKey: 'fingeringChart.halfHole6', tipKey: 'fingeringChart.tipHalfHole', noteKeyHint: 'D5' }),
        makeEntry({ id: 'b3-hh', semitoneFromRoot: 3, fingering: [1, 1, 1, 1, 0.5, 0], octave: 1, category: 'halfhole', labelKey: 'fingeringChart.halfHole5', tipKey: 'fingeringChart.tipHalfHole', noteKeyHint: 'E5' }),
        makeEntry({ id: 'b3-alt', semitoneFromRoot: 3, fingering: [1, 1, 1, 0.5, 1, 1], octave: 1, category: 'alt', labelKey: 'fingeringChart.crossAlt', tipKey: 'fingeringChart.tipCross', noteKeyHint: 'E5' }),
        makeEntry({ id: 's4-hh', semitoneFromRoot: 6, fingering: [1, 1, 0.5, 0, 0, 0], octave: 1, category: 'halfhole', labelKey: 'fingeringChart.halfHole3', tipKey: 'fingeringChart.tipHalfHole', noteKeyHint: 'G5' }),
        makeEntry({ id: 'b6-hh', semitoneFromRoot: 8, fingering: [1, 0.5, 0, 0, 0, 0], octave: 1, category: 'halfhole', labelKey: 'fingeringChart.halfHole2', tipKey: 'fingeringChart.tipHalfHole', noteKeyHint: 'A5' }),
        makeEntry({ id: 'b6-alt', semitoneFromRoot: 8, fingering: [1, 0, 1, 1, 1, 0], octave: 1, category: 'alt', labelKey: 'fingeringChart.crossAlt', tipKey: 'fingeringChart.tipCross', noteKeyHint: 'A5' }),
        makeEntry({ id: 'b7-std', semitoneFromRoot: 10, fingering: [0, 1, 1, 0, 0, 0], octave: 1, category: 'alt', labelKey: 'fingeringChart.crossOxxOoo', tipKey: 'fingeringChart.tipCrossB7', noteKeyHint: 'C5' }),
        makeEntry({ id: 'b7-alt', semitoneFromRoot: 10, fingering: [0, 1, 1, 1, 1, 0], octave: 1, category: 'alt', labelKey: 'fingeringChart.crossOxxXxo', tipKey: 'fingeringChart.tipCrossB7Alt', noteKeyHint: 'C5' }),
        makeEntry({ id: 'b7-hh', semitoneFromRoot: 10, fingering: [0.5, 0, 0, 0, 0, 0], octave: 1, category: 'halfhole', labelKey: 'fingeringChart.halfHole1', tipKey: 'fingeringChart.tipHalfHole', noteKeyHint: 'C5' }),
        makeEntry({ id: 'b7-2-std', semitoneFromRoot: 22, fingering: [0, 1, 1, 0, 0, 0], octave: 2, category: 'alt', labelKey: 'fingeringChart.crossOxxOoo', tipKey: 'fingeringChart.tipCrossB7', noteKeyHint: 'C6' }),
        makeEntry({ id: 'b7-2-alt', semitoneFromRoot: 22, fingering: [0, 1, 1, 1, 1, 0], octave: 2, category: 'alt', labelKey: 'fingeringChart.crossOxxXxo', tipKey: 'fingeringChart.tipCrossB7Alt', noteKeyHint: 'C6' })
    ];
}

export function createFingeringChartController(ctx) {
    const modal = document.getElementById('fingering-chart-modal');
    const btnOpenDesktop = document.getElementById('btn-open-fingering-chart');
    const btnOpenMobile = document.getElementById('mb-act-fingering');
    const btnClose = document.getElementById('btn-close-fingering-chart');
    const btnDone = document.getElementById('btn-close-fingering-chart-done');

    const keySelect = document.getElementById('fc-key-select');
    const filterTabs = document.querySelectorAll('.fc-filter-btn');
    const gridEl = document.getElementById('fc-cards-grid');

    const selectedTitleEl = document.getElementById('fc-selected-note-title');
    const selectedMetaEl = document.getElementById('fc-selected-note-meta');
    const btnTunerToggle = document.getElementById('btn-fc-tuner-toggle');
    const btnOpenPracticeTuner = document.getElementById('btn-fc-open-practice-tuner');
    const tunerReadoutEl = document.getElementById('fc-tuner-readout');
    const tunerStatusEl = document.getElementById('fc-tuner-status');

    let activeKey = 'D';
    let activeFilter = 'all';
    let selectedEntry = null;

    // Estado local do mini-afinador instantâneo no modal
    let micStream = null;
    let micSource = null;
    let micAnalyser = null;
    let micAudioCtx = null;
    let tunerRafId = null;
    let isTunerRunning = false;

    function stopMiniTuner() {
        isTunerRunning = false;
        if (tunerRafId) {
            cancelAnimationFrame(tunerRafId);
            tunerRafId = null;
        }
        if (micSource) {
            try { micSource.disconnect(); } catch (_) {}
            micSource = null;
        }
        if (micStream) {
            micStream.getTracks().forEach(track => track.stop());
            micStream = null;
        }
        micAnalyser = null;
        if (btnTunerToggle) {
            btnTunerToggle.classList.remove('active');
            btnTunerToggle.textContent = t('fingeringChart.testTunerBtn');
        }
        if (tunerReadoutEl) {
            tunerReadoutEl.textContent = '--';
            tunerReadoutEl.classList.remove('in-tune', 'off-tune');
        }
        if (tunerStatusEl) {
            tunerStatusEl.textContent = t('fingeringChart.tunerIdle');
        }
    }

    function updateMiniTunerLoop() {
        if (!isTunerRunning || !micAnalyser || !micAudioCtx) return;

        const buf = getSharedAudioBuffer(micAnalyser.fftSize);
        micAnalyser.getFloatTimeDomainData(buf);
        const pitch = detectWhistlePitch(buf, micAudioCtx.sampleRate, 0.03);

        if (pitch > 0) {
            const a4 = getReferenceA4();
            const detectedMidi = noteFromPitchVal(pitch, a4);
            const detectedName = `${CHROMATIC_NAMES[((detectedMidi % 12) + 12) % 12]}${Math.floor(detectedMidi / 12) - 1}`;

            let cents = centsOffFromPitchVal(pitch, detectedMidi, a4);
            let statusText = `${detectedName} (${pitch.toFixed(1)} Hz)`;

            if (selectedEntry) {
                const targetCents = Math.round(1200 * Math.log2(pitch / selectedEntry.freq));
                cents = targetCents;
                const absCents = Math.abs(targetCents);
                if (absCents <= 12) {
                    statusText = t('fingeringChart.tunerInTune', { note: selectedEntry.noteName, cents: `${targetCents >= 0 ? '+' : ''}${targetCents}¢` });
                    if (tunerReadoutEl) {
                        tunerReadoutEl.classList.add('in-tune');
                        tunerReadoutEl.classList.remove('off-tune');
                    }
                } else {
                    const dirKey = targetCents < 0 ? 'fingeringChart.tunerFlat' : 'fingeringChart.tunerSharp';
                    statusText = t(dirKey, { note: selectedEntry.noteName, cents: `${targetCents >= 0 ? '+' : ''}${targetCents}¢` });
                    if (tunerReadoutEl) {
                        tunerReadoutEl.classList.remove('in-tune');
                        tunerReadoutEl.classList.add('off-tune');
                    }
                }
            } else if (tunerReadoutEl) {
                tunerReadoutEl.classList.toggle('in-tune', Math.abs(cents) <= 10);
                tunerReadoutEl.classList.toggle('off-tune', Math.abs(cents) > 10);
            }

            if (tunerReadoutEl) {
                tunerReadoutEl.textContent = `${detectedName} • ${cents >= 0 ? '+' : ''}${cents}¢`;
            }
            if (tunerStatusEl) {
                tunerStatusEl.textContent = statusText;
            }
        }

        tunerRafId = requestAnimationFrame(updateMiniTunerLoop);
    }

    async function startMiniTuner() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (tunerStatusEl) tunerStatusEl.textContent = t('fingeringChart.tunerNoMic');
            return;
        }
        try {
            if (tunerStatusEl) tunerStatusEl.textContent = t('fingeringChart.tunerStarting');
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!micAudioCtx || micAudioCtx.state === 'closed') {
                micAudioCtx = new AudioCtx();
            }
            if (micAudioCtx.state === 'suspended') {
                await micAudioCtx.resume();
            }
            micSource = micAudioCtx.createMediaStreamSource(micStream);
            micAnalyser = micAudioCtx.createAnalyser();
            micAnalyser.fftSize = 2048;
            micSource.connect(micAnalyser);

            isTunerRunning = true;
            if (btnTunerToggle) {
                btnTunerToggle.classList.add('active');
                btnTunerToggle.textContent = t('fingeringChart.stopTunerBtn');
            }
            if (tunerStatusEl) tunerStatusEl.textContent = t('fingeringChart.tunerListening');
            updateMiniTunerLoop();
        } catch (err) {
            stopMiniTuner();
            if (tunerStatusEl) tunerStatusEl.textContent = t('fingeringChart.tunerMicDenied');
        }
    }

    function playEntryAudio(entry) {
        try {
            if (typeof ctx.initAudio === 'function') ctx.initAudio();
            const audioCtx = typeof ctx.getAudioCtx === 'function' ? ctx.getAudioCtx() : null;
            if (!audioCtx) return;
            scheduleWhistleVoice(audioCtx, entry.freq, 0.55, audioCtx.currentTime, null, entry.noteKeyHint, activeKey, false);
        } catch (e) {
            console.error('[FingeringChart] Audio error:', e);
        }
    }

    function selectEntry(entry, { playSound = true } = {}) {
        selectedEntry = entry;
        if (selectedTitleEl) {
            selectedTitleEl.textContent = `${entry.noteName} (${entry.code})`;
        }
        if (selectedMetaEl) {
            const octaveLabel = entry.octave === 2 ? t('fingeringChart.octave2') : t('fingeringChart.octave1');
            selectedMetaEl.textContent = `${entry.freq.toFixed(1)} Hz • ${octaveLabel}${entry.tip ? ` • ${entry.tip}` : ''}`;
        }
        if (gridEl) {
            gridEl.querySelectorAll('.fc-note-card').forEach(btn => {
                btn.classList.toggle('is-selected', btn.dataset.entryId === entry.id);
            });
        }
        if (playSound) playEntryAudio(entry);
    }

    function renderGrid() {
        if (!gridEl) return;
        const allEntries = buildChartEntriesForKey(activeKey);
        const filtered = activeFilter === 'all'
            ? allEntries
            : allEntries.filter(item => item.category === activeFilter);

        gridEl.innerHTML = '';

        filtered.forEach(entry => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = `fc-note-card fc-cat-${entry.category}`;
            card.dataset.entryId = entry.id;
            if (selectedEntry && selectedEntry.id === entry.id) {
                card.classList.add('is-selected');
            }

            const catLabel = entry.category === 'halfhole'
                ? t('fingeringChart.badgeHalfHole')
                : entry.category === 'alt'
                    ? t('fingeringChart.badgeAlt')
                    : `${entry.octave}ª`;

            card.setAttribute('aria-label', `${entry.noteName}, ${entry.code}, ${entry.freq.toFixed(1)} Hz`);
            card.innerHTML = `
                <div class="fc-card-top">
                    <span class="fc-note-name">${entry.noteName}</span>
                    <span class="fc-cat-badge fc-badge-${entry.category}">${catLabel}</span>
                </div>
                <div class="fc-card-diagram">
                    ${buildChartDiagramSVG(entry.fingering)}
                </div>
                <div class="fc-card-code">${entry.code}</div>
                <div class="fc-card-freq">${entry.freq.toFixed(1)} Hz</div>
                ${entry.label ? `<div class="fc-card-sub">${entry.label}</div>` : ''}
            `;

            card.addEventListener('click', () => selectEntry(entry, { playSound: true }));
            gridEl.appendChild(card);
        });

        if (filtered.length > 0 && (!selectedEntry || !filtered.some(e => e.id === selectedEntry.id))) {
            selectEntry(filtered[0], { playSound: false });
        }
    }

    function openModal() {
        if (!modal) return;
        const editorKey = ctx.getCurrentWhistleKey ? ctx.getCurrentWhistleKey() : 'D';
        if (editorKey && WHISTLE_KEYS_DATA[editorKey]) {
            activeKey = editorKey;
            if (keySelect) keySelect.value = activeKey;
        }
        renderGrid();
        modal.style.display = 'flex';
        if (keySelect) setTimeout(() => keySelect.focus(), 50);
    }

    function closeModal() {
        stopMiniTuner();
        if (modal) modal.style.display = 'none';
    }

    if (btnOpenDesktop) btnOpenDesktop.addEventListener('click', openModal);
    if (btnOpenMobile) {
        btnOpenMobile.addEventListener('click', (e) => {
            e.stopPropagation();
            if (ctx.closeMobileMoreDropdown) ctx.closeMobileMoreDropdown();
            openModal();
        });
    }
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnDone) btnDone.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    if (keySelect) {
        keySelect.addEventListener('change', () => {
            activeKey = keySelect.value || 'D';
            selectedEntry = null;
            renderGrid();
        });
    }

    filterTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            activeFilter = btn.dataset.fcFilter || 'all';
            filterTabs.forEach(b => b.classList.toggle('active', b === btn));
            renderGrid();
        });
    });

    if (btnTunerToggle) {
        btnTunerToggle.addEventListener('click', () => {
            if (isTunerRunning) stopMiniTuner();
            else startMiniTuner();
        });
    }

    if (btnOpenPracticeTuner) {
        btnOpenPracticeTuner.addEventListener('click', () => {
            closeModal();
            if (typeof ctx.setAppMode === 'function') {
                ctx.setAppMode('practice');
            }
        });
    }

    return {
        openModal,
        closeModal,
        refreshTranslations: () => {
            if (modal && modal.style.display !== 'none') renderGrid();
        }
    };
}
