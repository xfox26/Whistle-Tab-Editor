/* ==========================================================================
   LABORATÓRIO DE ORNAMENTOS IRLANDESES (SUBMODO DO MODO TREINO — ITEM 3.3)
   Decomposição dedo-a-dedo, câmera lenta (25% / 50% / 100%) e loop contínuo.
   ========================================================================== */

import {
    STANDARD_FINGERINGS,
    WHISTLE_KEYS_DATA,
    getDiatonicCutNote,
    getDiatonicStrikeNote
} from '../config/whistleData.js';
import { getTransposedFrequency, scheduleWhistleVoice } from '../audio/synthEngine.js';
import { t } from '../i18n/index.js';

const ORNAMENT_TYPES = ['cut', 'strike', 'roll', 'roll_short', 'cran', 'slide'];
const BASE_NOTE_OPTIONS = ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'D6', 'E6', 'F#6', 'G6', 'A6'];

function buildMiniWhistleSVG(holes) {
    const yPos = [10, 20, 30, 40, 50, 60];
    let body = `<rect x="2" y="2" width="16" height="66" rx="8" class="olab-whistle-body" />`;
    (holes || [0, 0, 0, 0, 0, 0]).forEach((state, idx) => {
        const cls = state === 1 ? 'hole-closed' : state === 0.5 ? 'hole-half' : 'hole-open';
        body += `<circle cx="10" cy="${yPos[idx]}" r="3.8" class="${cls}" />`;
    });
    return `<svg class="olab-whistle-svg" viewBox="0 0 20 70" width="20" height="70" aria-hidden="true">${body}</svg>`;
}

function formatHolesCode(holes) {
    const sym = (v) => (v === 1 ? 'X' : v === 0.5 ? '◑' : 'O');
    return `${holes.slice(0, 3).map(sym).join('')} ${holes.slice(3, 6).map(sym).join('')}`;
}

function getNoteDisplayName(noteKey, whistleKey) {
    const keyData = WHISTLE_KEYS_DATA[whistleKey] || WHISTLE_KEYS_DATA.D;
    return keyData.notes[noteKey]?.display || noteKey;
}

/**
 * Decompõe o ornamento em passos individuais dedo-a-dedo com durações reais (ms).
 */
export function decomposeOrnamentSteps(ornamentType, baseNoteKey, whistleKey = 'D') {
    const baseNote = STANDARD_FINGERINGS[baseNoteKey] ? baseNoteKey : 'G5';
    const cutNote = getDiatonicCutNote(baseNote);
    const strikeNote = getDiatonicStrikeNote(baseNote);

    const makeStep = (roleKey, noteKey, durationMs) => {
        const fingering = STANDARD_FINGERINGS[noteKey] || STANDARD_FINGERINGS[baseNote];
        const freq = getTransposedFrequency(noteKey, whistleKey) || getTransposedFrequency(baseNote, whistleKey);
        return {
            role: t(roleKey),
            noteKey,
            display: getNoteDisplayName(noteKey, whistleKey),
            fingering,
            code: formatHolesCode(fingering),
            durationMs,
            freq
        };
    };

    if (ornamentType === 'cut') {
        return [
            makeStep('ornamentLab.stepCutGrace', cutNote, 35),
            makeStep('ornamentLab.stepMainNote', baseNote, 420)
        ];
    }

    if (ornamentType === 'strike') {
        return [
            makeStep('ornamentLab.stepStrikeGrace', strikeNote, 35),
            makeStep('ornamentLab.stepMainNote', baseNote, 420)
        ];
    }

    if (ornamentType === 'roll') {
        return [
            makeStep('ornamentLab.stepAttack', baseNote, 70),
            makeStep('ornamentLab.stepCutGrace', cutNote, 35),
            makeStep('ornamentLab.stepReturn', baseNote, 70),
            makeStep('ornamentLab.stepStrikeGrace', strikeNote, 35),
            makeStep('ornamentLab.stepSustain', baseNote, 320)
        ];
    }

    if (ornamentType === 'roll_short') {
        return [
            makeStep('ornamentLab.stepCutGrace', cutNote, 35),
            makeStep('ornamentLab.stepReturn', baseNote, 70),
            makeStep('ornamentLab.stepStrikeGrace', strikeNote, 35),
            makeStep('ornamentLab.stepSustain', baseNote, 340)
        ];
    }

    if (ornamentType === 'cran') {
        const c1 = baseNote === 'D5' ? 'E5' : cutNote;
        const c2 = baseNote === 'D5' ? 'F#5' : cutNote;
        const c3 = baseNote === 'D5' ? 'A5' : cutNote;
        return [
            makeStep('ornamentLab.stepAttack', baseNote, 50),
            makeStep('ornamentLab.stepCut1', c1, 35),
            makeStep('ornamentLab.stepReturn', baseNote, 50),
            makeStep('ornamentLab.stepCut2', c2, 35),
            makeStep('ornamentLab.stepReturn', baseNote, 50),
            makeStep('ornamentLab.stepCut3', c3, 35),
            makeStep('ornamentLab.stepSustain', baseNote, 300)
        ];
    }

    // slide
    return [
        makeStep('ornamentLab.stepSlideStart', strikeNote, 80),
        makeStep('ornamentLab.stepMainNote', baseNote, 400)
    ];
}

export function createOrnamentLabController(ctx) {
    const panel = document.getElementById('ornament-lab-panel');
    const btnToggle = document.getElementById('btn-open-ornament-lab');
    const btnClose = document.getElementById('btn-close-ornament-lab');
    const typeSelect = document.getElementById('olab-type-select');
    const noteSelect = document.getElementById('olab-note-select');
    const speedBtns = document.querySelectorAll('.olab-speed-btn');
    const loopCheckbox = document.getElementById('olab-loop-toggle');
    const btnPlay = document.getElementById('olab-play-btn');
    const descEl = document.getElementById('olab-desc-text');
    const stepsTrack = document.getElementById('olab-steps-track');

    let selectedType = 'roll';
    let selectedNote = 'G5';
    let selectedSpeed = 0.5; // 0.25 | 0.5 | 1.0
    let isPlaying = false;
    let stepTimers = [];
    let loopTimer = null;

    function clearTimers() {
        stepTimers.forEach(id => clearTimeout(id));
        stepTimers = [];
        if (loopTimer) {
            clearTimeout(loopTimer);
            loopTimer = null;
        }
    }

    function stopPlayback() {
        isPlaying = false;
        clearTimers();
        if (stepsTrack) {
            stepsTrack.querySelectorAll('.olab-step-card').forEach(c => c.classList.remove('is-active-step'));
        }
        if (btnPlay) {
            btnPlay.classList.remove('playing');
            btnPlay.textContent = t('ornamentLab.playBtn');
        }
    }

    function populateNoteOptions() {
        if (!noteSelect) return;
        const whistleKey = ctx.getCurrentWhistleKey ? ctx.getCurrentWhistleKey() : 'D';
        const prev = noteSelect.value || selectedNote;
        noteSelect.innerHTML = '';
        BASE_NOTE_OPTIONS.forEach(nk => {
            const opt = document.createElement('option');
            opt.value = nk;
            opt.textContent = `${getNoteDisplayName(nk, whistleKey)} (${nk})`;
            noteSelect.appendChild(opt);
        });
        if (BASE_NOTE_OPTIONS.includes(prev)) {
            noteSelect.value = prev;
        }
        selectedNote = noteSelect.value || 'G5';
    }

    function renderSteps() {
        if (!stepsTrack) return;
        const whistleKey = ctx.getCurrentWhistleKey ? ctx.getCurrentWhistleKey() : 'D';
        const steps = decomposeOrnamentSteps(selectedType, selectedNote, whistleKey);

        if (descEl) {
            descEl.textContent = t(`ornamentLab.desc_${selectedType}`);
        }

        stepsTrack.innerHTML = '';
        steps.forEach((step, idx) => {
            const scaledMs = Math.round(step.durationMs / selectedSpeed);
            const card = document.createElement('div');
            card.className = 'olab-step-card';
            card.dataset.stepIndex = String(idx);
            card.innerHTML = `
                <div class="olab-step-badge">${idx + 1}. ${step.role}</div>
                <div class="olab-step-note">${step.display}</div>
                <div class="olab-step-svg">${buildMiniWhistleSVG(step.fingering)}</div>
                <div class="olab-step-code">${step.code}</div>
                <div class="olab-step-ms">${scaledMs} ms</div>
            `;
            stepsTrack.appendChild(card);
        });
    }

    function scheduleCycle() {
        if (!isPlaying) return;
        clearTimers();

        const whistleKey = ctx.getCurrentWhistleKey ? ctx.getCurrentWhistleKey() : 'D';
        const steps = decomposeOrnamentSteps(selectedType, selectedNote, whistleKey);

        if (typeof ctx.initAudio === 'function') ctx.initAudio();
        const audioCtx = typeof ctx.getAudioCtx === 'function' ? ctx.getAudioCtx() : null;
        if (!audioCtx) {
            stopPlayback();
            return;
        }

        let offsetMs = 0;
        const baseTime = audioCtx.currentTime + 0.04;

        steps.forEach((step, idx) => {
            const scaledMs = Math.round(step.durationMs / selectedSpeed);
            const startSec = baseTime + (offsetMs / 1000);
            const durSec = Math.max(0.03, scaledMs / 1000);

            scheduleWhistleVoice(audioCtx, step.freq, durSec, startSec, null, step.noteKey, whistleKey, idx > 0);

            const tId = setTimeout(() => {
                if (!isPlaying || !stepsTrack) return;
                stepsTrack.querySelectorAll('.olab-step-card').forEach((c, cIdx) => {
                    c.classList.toggle('is-active-step', cIdx === idx);
                });
            }, offsetMs);
            stepTimers.push(tId);

            offsetMs += scaledMs;
        });

        const pauseBetweenMs = 450;
        loopTimer = setTimeout(() => {
            if (!isPlaying) return;
            if (stepsTrack) {
                stepsTrack.querySelectorAll('.olab-step-card').forEach(c => c.classList.remove('is-active-step'));
            }
            if (loopCheckbox && loopCheckbox.checked) {
                scheduleCycle();
            } else {
                stopPlayback();
            }
        }, offsetMs + pauseBetweenMs);
    }

    function startPlayback() {
        isPlaying = true;
        if (btnPlay) {
            btnPlay.classList.add('playing');
            btnPlay.textContent = t('ornamentLab.stopBtn');
        }
        scheduleCycle();
    }

    function openPanel() {
        if (!panel) return;
        populateNoteOptions();
        renderSteps();
        panel.style.display = 'block';
        if (btnToggle) {
            btnToggle.classList.add('active');
            btnToggle.setAttribute('aria-expanded', 'true');
        }
    }

    function closePanel() {
        stopPlayback();
        if (panel) panel.style.display = 'none';
        if (btnToggle) {
            btnToggle.classList.remove('active');
            btnToggle.setAttribute('aria-expanded', 'false');
        }
    }

    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            const isOpen = panel && panel.style.display !== 'none';
            if (isOpen) closePanel();
            else openPanel();
        });
    }

    if (btnClose) btnClose.addEventListener('click', closePanel);

    if (typeSelect) {
        typeSelect.addEventListener('change', () => {
            selectedType = ORNAMENT_TYPES.includes(typeSelect.value) ? typeSelect.value : 'roll';
            if (selectedType === 'cran' && noteSelect) {
                selectedNote = 'D5';
                noteSelect.value = 'D5';
            }
            const wasPlaying = isPlaying;
            stopPlayback();
            renderSteps();
            if (wasPlaying) startPlayback();
        });
    }

    if (noteSelect) {
        noteSelect.addEventListener('change', () => {
            selectedNote = noteSelect.value || 'G5';
            const wasPlaying = isPlaying;
            stopPlayback();
            renderSteps();
            if (wasPlaying) startPlayback();
        });
    }

    speedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = parseFloat(btn.dataset.olabSpeed);
            if (!Number.isNaN(val) && val > 0) {
                selectedSpeed = val;
                speedBtns.forEach(b => b.classList.toggle('active', b === btn));
                const wasPlaying = isPlaying;
                stopPlayback();
                renderSteps();
                if (wasPlaying) startPlayback();
            }
        });
    });

    if (btnPlay) {
        btnPlay.addEventListener('click', () => {
            if (isPlaying) stopPlayback();
            else startPlayback();
        });
    }

    return {
        openPanel,
        closePanel,
        refresh: () => {
            if (panel && panel.style.display !== 'none') {
                populateNoteOptions();
                renderSteps();
            }
        }
    };
}
