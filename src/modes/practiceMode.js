/* ==========================================================================
   MODO TREINO: LOOP A-B, SPEED TRAINER, BORDÃO CELTA, COUNT-IN, ZOOM & AFINADOR
   ========================================================================== */

import {
    WHISTLE_KEYS_DATA,
    DRONE_KEY_FREQUENCIES,
    NOTE_STRINGS,
    ZOOM_LEVELS,
    ZOOM_LABELS,
    getDroneFifthLabel
} from '../config/whistleData.js';
import { getTransposedFrequency } from '../audio/synthEngine.js';
import {
    getSharedAudioBuffer,
    autoCorrelatePitch,
    noteFromPitchVal,
    centsOffFromPitchVal
} from '../audio/pitchEngine.js';
import { t } from '../i18n/index.js';
import { showNotificationToast } from '../utils/toast.js';

export function createPracticeController(ctx) {
    function getSelectedOrActiveIndex() {
        const selectedIndices = ctx.getSelectedIndices();
        const currentSong = ctx.getCurrentSong();
        const currentPlayIndex = ctx.getCurrentPlayIndex();
        const playbackStartIndex = ctx.getPlaybackStartIndex();

        if (selectedIndices.size > 0) {
            const sorted = Array.from(selectedIndices).sort((a, b) => a - b);
            return sorted[0];
        }
        if (currentPlayIndex >= 0 && currentSong && currentPlayIndex < currentSong.notes.length) {
            return currentPlayIndex;
        }
        if (playbackStartIndex >= 0 && currentSong && playbackStartIndex < currentSong.notes.length) {
            return playbackStartIndex;
        }
        return -1;
    }

    function updateLoopVisuals() {
        const { isLoopActive, loopAIndex, loopBIndex } = ctx.getLoopState();
        const cards = ctx.tabSheetEl ? ctx.tabSheetEl.querySelectorAll('.note-card') : document.querySelectorAll('.note-card');
        cards.forEach(card => {
            const idx = parseInt(card.dataset.index, 10);
            card.classList.remove('loop-marker-a', 'loop-marker-b', 'in-loop');
            if (idx === loopAIndex) card.classList.add('loop-marker-a');
            if (idx === loopBIndex) card.classList.add('loop-marker-b');
            if (isLoopActive && loopAIndex !== -1 && loopBIndex !== -1) {
                const start = Math.min(loopAIndex, loopBIndex);
                const end = Math.max(loopAIndex, loopBIndex);
                if (idx >= start && idx <= end) {
                    card.classList.add('in-loop');
                }
            }
        });
    }

    function updateLoopStatusText() {
        const loopStatusText = ctx.loopStatusText;
        if (!loopStatusText) return;
        const { loopAIndex, loopBIndex } = ctx.getLoopState();
        if (loopAIndex === -1 && loopBIndex === -1) {
            loopStatusText.textContent = t('practice.loopStatusDefault');
        } else if (loopAIndex !== -1 && loopBIndex === -1) {
            loopStatusText.textContent = t('practice.loopStatusA', { a: loopAIndex + 1 });
        } else {
            const start = Math.min(loopAIndex, loopBIndex);
            const end = Math.max(loopAIndex, loopBIndex);
            loopStatusText.textContent = t('practice.loopStatusRange', { a: start + 1, b: end + 1, count: end - start + 1 });
        }
    }

    function setLoopA(idx) {
        const currentSong = ctx.getCurrentSong();
        const prev = ctx.getLoopState();
        let loopAIndex = idx;
        let loopBIndex = prev.loopBIndex;
        if (loopBIndex !== -1 && loopAIndex > loopBIndex) {
            const temp = loopAIndex;
            loopAIndex = loopBIndex;
            loopBIndex = temp;
        }
        if (loopBIndex === -1 && currentSong && currentSong.notes.length > 0) {
            loopBIndex = currentSong.notes.length - 1;
        }
        ctx.setLoopState({
            loopAIndex,
            loopBIndex,
            isLoopActive: true,
            loopCycleCount: 0
        });
        if (ctx.toggleLoopAb) ctx.toggleLoopAb.checked = true;
        if (ctx.trainerCycleBadge) ctx.trainerCycleBadge.textContent = 'Ciclo #0';
        updateLoopVisuals();
        updateLoopStatusText();
    }

    function setLoopB(idx) {
        const prev = ctx.getLoopState();
        let loopAIndex = prev.loopAIndex;
        let loopBIndex = idx;
        if (loopAIndex !== -1 && loopBIndex < loopAIndex) {
            const temp = loopAIndex;
            loopAIndex = loopBIndex;
            loopBIndex = temp;
        }
        if (loopAIndex === -1) {
            loopAIndex = 0;
        }
        ctx.setLoopState({
            loopAIndex,
            loopBIndex,
            isLoopActive: true,
            loopCycleCount: 0
        });
        if (ctx.toggleLoopAb) ctx.toggleLoopAb.checked = true;
        if (ctx.trainerCycleBadge) ctx.trainerCycleBadge.textContent = 'Ciclo #0';
        updateLoopVisuals();
        updateLoopStatusText();
    }

    function clearLoop() {
        ctx.setLoopState({
            loopAIndex: -1,
            loopBIndex: -1,
            isLoopActive: false,
            loopCycleCount: 0
        });
        if (ctx.toggleLoopAb) ctx.toggleLoopAb.checked = false;
        if (ctx.trainerCycleBadge) ctx.trainerCycleBadge.textContent = 'Ciclo #0';
        updateLoopVisuals();
        updateLoopStatusText();
    }

    function updateDroneUI() {
        const key = ctx.whistleKeyEl ? ctx.whistleKeyEl.value : 'D';
        const fifth = getDroneFifthLabel(key);
        const statusText = t('practice.droneStatus', { key, fifth });
        const isDroneActive = ctx.getIsDroneActive();

        if (ctx.droneStatusText) ctx.droneStatusText.textContent = statusText;
        if (ctx.dronePaStatusText) ctx.dronePaStatusText.textContent = statusText;

        if (ctx.btnToggleDrone && ctx.droneBtnLabel) {
            btnClassAndLabel(ctx.btnToggleDrone, ctx.droneBtnLabel, isDroneActive);
        }
        if (ctx.btnToggleDronePa && ctx.dronePaBtnLabel) {
            btnClassAndLabel(ctx.btnToggleDronePa, ctx.dronePaBtnLabel, isDroneActive);
        }
    }

    function btnClassAndLabel(btn, labelEl, active) {
        if (active) {
            btn.classList.add('active');
            labelEl.textContent = t('practice.droneActive');
        } else {
            btn.classList.remove('active');
            labelEl.textContent = t('practice.droneStart');
        }
    }

    function startDrone() {
        const currentMode = document.body.dataset.appMode || ctx.getCurrentAppMode() || 'studio';
        if (currentMode === 'studio') {
            showNotificationToast(t('toasts.droneExclusive'));
            return;
        }
        ctx.initAudio();
        const audioCtx = ctx.getAudioCtx();
        const droneNodes = ctx.getDroneNodes();
        if (droneNodes.droneGainNode) stopDrone();

        const key = ctx.whistleKeyEl ? ctx.whistleKeyEl.value : 'D';
        const freqs = DRONE_KEY_FREQUENCIES[key] || DRONE_KEY_FREQUENCIES['D'];
        const now = audioCtx.currentTime;

        const droneGainNode = audioCtx.createGain();
        const activeVolEl = currentMode === 'playalong' && ctx.droneVolumePaEl ? ctx.droneVolumePaEl : ctx.droneVolumeEl;
        const targetVol = parseFloat(activeVolEl ? activeVolEl.value : 0.25) || 0.25;
        droneGainNode.gain.setValueAtTime(0.001, now);
        droneGainNode.gain.exponentialRampToValueAtTime(Math.max(0.001, targetVol), now + 0.3);

        const droneFilter = audioCtx.createBiquadFilter();
        droneFilter.type = 'lowpass';
        droneFilter.frequency.setValueAtTime(800, now);
        droneFilter.Q.setValueAtTime(2.0, now);

        const droneOsc1 = audioCtx.createOscillator();
        droneOsc1.type = 'sawtooth';
        droneOsc1.frequency.setValueAtTime(freqs.tonic, now);

        const droneOsc2 = audioCtx.createOscillator();
        droneOsc2.type = 'triangle';
        droneOsc2.frequency.setValueAtTime(freqs.fifth, now);
        droneOsc2.detune.setValueAtTime(4, now);

        droneOsc1.connect(droneFilter);
        droneOsc2.connect(droneFilter);
        droneFilter.connect(droneGainNode);
        droneGainNode.connect(audioCtx.destination);

        droneOsc1.start(now);
        droneOsc2.start(now);

        ctx.setDroneNodes({ droneGainNode, droneFilter, droneOsc1, droneOsc2 });
        ctx.setIsDroneActive(true);
        updateDroneUI();
    }

    function stopDrone() {
        const audioCtx = ctx.getAudioCtx();
        const nodes = ctx.getDroneNodes();
        if (!nodes.droneGainNode || !audioCtx) {
            ctx.setIsDroneActive(false);
            updateDroneUI();
            return;
        }
        const now = audioCtx.currentTime;
        try {
            nodes.droneGainNode.gain.setValueAtTime(nodes.droneGainNode.gain.value, now);
            nodes.droneGainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
            const { droneOsc1, droneOsc2, droneGainNode } = nodes;
            setTimeout(() => {
                if (droneOsc1) { droneOsc1.stop(); droneOsc1.disconnect(); }
                if (droneOsc2) { droneOsc2.stop(); droneOsc2.disconnect(); }
                if (droneGainNode) { droneGainNode.disconnect(); }
                ctx.setDroneNodes({ droneGainNode: null, droneFilter: null, droneOsc1: null, droneOsc2: null });
            }, 220);
        } catch (e) {
            // Fallback seguro
        }
        ctx.setIsDroneActive(false);
        updateDroneUI();
    }

    function toggleDrone() {
        if (ctx.getIsDroneActive()) {
            stopDrone();
        } else {
            startDrone();
        }
    }

    function setDroneVolume(vol) {
        const audioCtx = ctx.getAudioCtx();
        const { droneGainNode } = ctx.getDroneNodes();
        if (droneGainNode && audioCtx && ctx.getIsDroneActive()) {
            const now = audioCtx.currentTime;
            droneGainNode.gain.setValueAtTime(droneGainNode.gain.value, now);
            droneGainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), now + 0.05);
        }
    }

    function updateDroneFrequencies() {
        const audioCtx = ctx.getAudioCtx();
        const { droneOsc1, droneOsc2 } = ctx.getDroneNodes();
        if (!ctx.getIsDroneActive() || !audioCtx) return;
        const key = ctx.whistleKeyEl ? ctx.whistleKeyEl.value : 'D';
        const freqs = DRONE_KEY_FREQUENCIES[key] || DRONE_KEY_FREQUENCIES['D'];
        const now = audioCtx.currentTime;
        if (droneOsc1) droneOsc1.frequency.setValueAtTime(freqs.tonic, now);
        if (droneOsc2) droneOsc2.frequency.setValueAtTime(freqs.fifth, now);
        updateDroneUI();
    }

    function cancelCountIn() {
        ctx.setIsCountingIn(false);
        const timer = ctx.getCountInTimeout();
        if (timer) clearTimeout(timer);
        if (ctx.countInOverlay) ctx.countInOverlay.style.display = 'none';
    }

    function startCountIn() {
        if (ctx.getCurrentAppMode() !== 'practice') {
            ctx.startPlayback();
            return;
        }
        ctx.initAudio();
        const audioCtx = ctx.getAudioCtx();
        ctx.setIsCountingIn(true);
        if (!ctx.countInOverlay || !ctx.countInNum) {
            ctx.startPlayback();
            return;
        }

        const bpm = parseInt(ctx.songTempoEl.value, 10) || 120;
        const beatInterval = (60 / bpm) * 1000;
        const timeSig = ctx.songTimeSignatureEl ? ctx.songTimeSignatureEl.value : '4/4';

        let totalBeats = 4;
        if (timeSig === '3/4') totalBeats = 3;
        else if (timeSig === '6/8') totalBeats = 2;
        else if (timeSig === '2/4') totalBeats = 2;
        else if (timeSig === '9/8') totalBeats = 3;
        else if (timeSig === '12/8') totalBeats = 4;

        ctx.countInOverlay.style.display = 'flex';
        if (ctx.countInInfo) {
            ctx.countInInfo.textContent = t('practice.countInInfo', { bpm, time: timeSig });
        }

        let currentBeat = 1;

        function countStep() {
            if (!ctx.getIsCountingIn()) return;

            ctx.countInNum.textContent = currentBeat;
            ctx.countInNum.style.animation = 'none';
            void ctx.countInNum.offsetWidth;
            ctx.countInNum.style.animation = 'pulseNum 0.35s ease-out';

            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(currentBeat === 1 ? 1400 : 900, now);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.06);

            if (currentBeat >= totalBeats) {
                ctx.setCountInTimeout(setTimeout(() => {
                    ctx.countInOverlay.style.display = 'none';
                    ctx.setIsCountingIn(false);
                    ctx.startPlayback();
                }, beatInterval));
            } else {
                currentBeat++;
                ctx.setCountInTimeout(setTimeout(countStep, beatInterval));
            }
        }

        countStep();
    }

    function changeZoom(delta) {
        const nextZoom = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, ctx.getCurrentZoomIndex() + delta));
        ctx.setCurrentZoomIndex(nextZoom);
        if (ctx.tabSheetEl) {
            ctx.tabSheetEl.classList.remove('zoom-sm', 'zoom-md', 'zoom-lg', 'zoom-xl');
            ctx.tabSheetEl.classList.add(`zoom-${ZOOM_LEVELS[nextZoom]}`);
        }
        if (ctx.zoomIndicator) {
            ctx.zoomIndicator.textContent = ZOOM_LABELS[nextZoom];
        }
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
    }

    function updatePitchLoop() {
        const micState = ctx.getMicState();
        if (!micState.isMicListening || !micState.micAnalyser) return;

        if (micState.micAudioContext && micState.micAudioContext.state === 'suspended') {
            micState.micAudioContext.resume().catch(() => {});
        }

        const buf = getSharedAudioBuffer(micState.micAnalyser.fftSize);
        micState.micAnalyser.getFloatTimeDomainData(buf);
        const sampleRate = micState.micAudioContext.sampleRate;
        const pitch = autoCorrelatePitch(buf, sampleRate, ctx.getMicNoiseThreshold());

        if (pitch !== -1 && pitch >= 200 && pitch <= 3000) {
            const noteNumber = noteFromPitchVal(pitch);
            const noteName = NOTE_STRINGS[noteNumber % 12];
            const octave = Math.floor(noteNumber / 12) - 1;
            const noteFullName = `${noteName}${octave}`;
            const cents = centsOffFromPitchVal(pitch, noteNumber);

            if (ctx.tunerDetectedNote) {
                ctx.tunerDetectedNote.textContent = noteFullName;
                ctx.tunerDetectedNote.classList.toggle('in-tune', Math.abs(cents) <= 8);
            }

            if (ctx.tunerDetectedFreq) {
                ctx.tunerDetectedFreq.textContent = `${pitch.toFixed(1)} Hz (${cents > 0 ? '+' : ''}${cents}¢)`;
            }

            if (ctx.tunerNeedle) {
                const clampedCents = Math.max(-50, Math.min(50, cents));
                ctx.tunerNeedle.style.left = `${50 + clampedCents}%`;
            }

            const currentSong = ctx.getCurrentSong();
            const currentPlayIndex = ctx.getCurrentPlayIndex();
            if (micState.micTunerMode === 'follow' && ctx.getIsPlaying() && currentSong && currentPlayIndex >= 0 && currentPlayIndex < currentSong.notes.length) {
                const currentTabNote = currentSong.notes[currentPlayIndex];
                const currentTabNoteKey = currentTabNote.note;
                const currentWhistleKey = ctx.whistleKeyEl ? ctx.whistleKeyEl.value : 'D';
                const noteObjInfo = WHISTLE_KEYS_DATA[currentWhistleKey]?.notes[currentTabNoteKey];
                const targetNoteDisplay = noteObjInfo ? noteObjInfo.display : currentTabNoteKey;
                const expectedFreq = getTransposedFrequency(currentTabNoteKey, currentWhistleKey);
                const expectedMidi = expectedFreq > 0 ? noteFromPitchVal(expectedFreq) : -1;

                if (expectedMidi !== -1 && (noteNumber === expectedMidi || (noteNumber % 12) === (expectedMidi % 12))) {
                    if (ctx.tunerStatusMsg) ctx.tunerStatusMsg.innerHTML = `<span style="color: var(--emerald-primary); font-weight: bold;">${t('tuner.correctNote', { note: targetNoteDisplay })}</span>`;
                } else if (ctx.tunerStatusMsg) {
                    ctx.tunerStatusMsg.textContent = t('tuner.playingExpected', { playing: noteFullName, expected: targetNoteDisplay });
                }
            } else if (ctx.tunerStatusMsg) {
                if (Math.abs(cents) <= 5) {
                    ctx.tunerStatusMsg.innerHTML = `<span style="color: var(--emerald-primary); font-weight: 600;">${t('tuner.perfectTuning')}</span>`;
                } else if (cents < -5) {
                    ctx.tunerStatusMsg.textContent = t('tuner.slightlyLowPush');
                } else {
                    ctx.tunerStatusMsg.textContent = t('tuner.slightlyHighPull');
                }
            }
        }

        ctx.setMicState({ micRafId: requestAnimationFrame(updatePitchLoop) });
    }

    async function startMic() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showNotificationToast(t('toasts.noMicSupport'));
            return;
        }

        try {
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtxClass) {
                showNotificationToast(t('toasts.noWebAudioSupport'));
                return;
            }

            const micAudioContext = new AudioCtxClass();
            if (micAudioContext.state === 'suspended') {
                await micAudioContext.resume();
            }

            let micStream;
            try {
                micStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: true
                    },
                    video: false
                });
            } catch (constrErr) {
                console.warn('Fallback getUserMedia simples:', constrErr);
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            }

            const source = micAudioContext.createMediaStreamSource(micStream);
            const micBiquad = micAudioContext.createBiquadFilter();
            micBiquad.type = 'bandpass';
            micBiquad.frequency.setValueAtTime(950, micAudioContext.currentTime);
            micBiquad.Q.setValueAtTime(0.7, micAudioContext.currentTime);

            const micAnalyser = micAudioContext.createAnalyser();
            micAnalyser.fftSize = 2048;

            const silenceGain = micAudioContext.createGain();
            silenceGain.gain.setValueAtTime(0, micAudioContext.currentTime);

            source.connect(micBiquad);
            micBiquad.connect(micAnalyser);
            micAnalyser.connect(silenceGain);
            silenceGain.connect(micAudioContext.destination);

            ctx.setMicState({
                micAudioContext,
                micStream,
                micBiquad,
                micAnalyser,
                isMicListening: true
            });

            if (ctx.btnToggleMic && ctx.micBtnLabel) {
                ctx.btnToggleMic.classList.add('btn-danger');
                ctx.btnToggleMic.classList.remove('btn-primary');
                ctx.micBtnLabel.textContent = t('tuner.deactivateMic');
            }
            if (ctx.tunerStatusMsg) ctx.tunerStatusMsg.textContent = t('playalong.listenStatus');
            updatePitchLoop();
        } catch (err) {
            console.error('Erro ao acessar microfone:', err);
            showNotificationToast(t('toasts.micAccessError'));
        }
    }

    function stopMic() {
        const micState = ctx.getMicState();
        ctx.setMicState({ isMicListening: false });
        if (micState.micRafId) cancelAnimationFrame(micState.micRafId);
        if (micState.micBiquad) {
            try { micState.micBiquad.disconnect(); } catch (e) {}
        }
        if (micState.micStream) {
            micState.micStream.getTracks().forEach(track => track.stop());
        }
        if (micState.micAudioContext) {
            micState.micAudioContext.close().catch(() => {});
        }
        ctx.setMicState({
            micRafId: null,
            micBiquad: null,
            micStream: null,
            micAudioContext: null
        });

        if (ctx.btnToggleMic && ctx.micBtnLabel) {
            ctx.btnToggleMic.classList.remove('btn-danger');
            ctx.btnToggleMic.classList.add('btn-primary');
            ctx.micBtnLabel.textContent = t('tuner.activateMic');
        }
        if (ctx.tunerDetectedNote) {
            ctx.tunerDetectedNote.textContent = '--';
            ctx.tunerDetectedNote.classList.remove('in-tune');
        }
        if (ctx.tunerDetectedFreq) ctx.tunerDetectedFreq.textContent = '0.0 Hz';
        if (ctx.tunerNeedle) ctx.tunerNeedle.style.left = '50%';
        if (ctx.tunerStatusMsg) ctx.tunerStatusMsg.textContent = t('tuner.micDisabled');
    }

    function toggleMicrophone() {
        if (ctx.getMicState().isMicListening) {
            stopMic();
        } else {
            startMic();
        }
    }

    function setAppMode(mode) {
        ctx.setCurrentAppMode(mode);
        document.body.dataset.appMode = mode;

        document.body.classList.remove('mode-practice', 'mode-playalong');
        if (ctx.btnModeStudio) ctx.btnModeStudio.classList.remove('active');
        if (ctx.btnModePractice) ctx.btnModePractice.classList.remove('active');
        if (ctx.btnModePlayAlong) ctx.btnModePlayAlong.classList.remove('active');

        if (ctx.getMicState().isMicListening) stopMic();
        if (ctx.getIsPlayAlongRunning()) ctx.stopPlayAlong();
        if (ctx.getIsCountingIn()) cancelCountIn();
        if (mode === 'studio' && ctx.getIsDroneActive()) stopDrone();

        const currentSong = ctx.getCurrentSong();
        const zoomLevelClass = `zoom-${ZOOM_LEVELS[ctx.getCurrentZoomIndex()]}`;

        if (mode === 'practice') {
            if (ctx.songDisplayBanner) ctx.songDisplayBanner.classList.remove('active-in-studio');
            document.body.classList.add('mode-practice');
            if (ctx.btnModePractice) ctx.btnModePractice.classList.add('active');
            if (ctx.practiceToolbar) ctx.practiceToolbar.style.display = 'flex';
            if (ctx.practiceBottomPanel) ctx.practiceBottomPanel.style.display = 'flex';
            if (ctx.playalongToolbar) ctx.playalongToolbar.style.display = 'none';
            if (ctx.playalongBottomPanel) ctx.playalongBottomPanel.style.display = 'none';
            ctx.clearPlayAlongVisuals();
            ctx.updateSongDisplayBanner(currentSong);

            if (ctx.tabSheetEl) {
                ctx.tabSheetEl.classList.remove('zoom-sm', 'zoom-md', 'zoom-lg', 'zoom-xl');
                ctx.tabSheetEl.classList.add(zoomLevelClass);
            }
        } else if (mode === 'playalong') {
            if (ctx.songDisplayBanner) ctx.songDisplayBanner.classList.remove('active-in-studio');
            document.body.classList.add('mode-playalong');
            if (ctx.btnModePlayAlong) ctx.btnModePlayAlong.classList.add('active');
            if (ctx.playalongToolbar) ctx.playalongToolbar.style.display = 'flex';
            if (ctx.playalongBottomPanel) ctx.playalongBottomPanel.style.display = 'flex';
            if (ctx.practiceToolbar) ctx.practiceToolbar.style.display = 'none';
            if (ctx.practiceBottomPanel) ctx.practiceBottomPanel.style.display = 'none';

            ctx.updateSongDisplayBanner(currentSong);
            ctx.initPlayAlongSession();

            if (ctx.tabSheetEl) {
                ctx.tabSheetEl.classList.remove('zoom-sm', 'zoom-md', 'zoom-lg', 'zoom-xl');
                ctx.tabSheetEl.classList.add(zoomLevelClass);
            }
        } else {
            if (ctx.btnModeStudio) ctx.btnModeStudio.classList.add('active');
            if (ctx.practiceToolbar) ctx.practiceToolbar.style.display = 'none';
            if (ctx.practiceBottomPanel) ctx.practiceBottomPanel.style.display = 'none';
            if (ctx.playalongToolbar) ctx.playalongToolbar.style.display = 'none';
            if (ctx.playalongBottomPanel) ctx.playalongBottomPanel.style.display = 'none';
            ctx.clearPlayAlongVisuals();
            ctx.updateSongDisplayBanner(currentSong);
            if (ctx.editorHeader && ctx.editorHeader.classList.contains('collapsed')) {
                if (ctx.songDisplayBanner) ctx.songDisplayBanner.classList.add('active-in-studio');
            } else if (ctx.songDisplayBanner) {
                ctx.songDisplayBanner.classList.remove('active-in-studio');
            }
        }

        const isStudio = mode === 'studio';
        const isReadOnly = ctx.isSongReadOnly(currentSong);
        const btnOpenTranspose = document.getElementById('btn-open-transpose');
        if (btnOpenTranspose) {
            if (!isStudio) {
                btnOpenTranspose.style.display = 'none';
            } else {
                btnOpenTranspose.style.display = '';
                btnOpenTranspose.disabled = isReadOnly;
                btnOpenTranspose.title = isReadOnly
                    ? t('readonly.transposeProtected')
                    : t('transpose.title');
            }
        }

        if (ctx.btnOpenBackingTracks) {
            if (isStudio && isReadOnly) {
                ctx.btnOpenBackingTracks.disabled = true;
                ctx.btnOpenBackingTracks.title = t('readonly.backingProtected');
            } else {
                ctx.btnOpenBackingTracks.disabled = false;
                ctx.btnOpenBackingTracks.title = t('readonly.backingTitle');
            }
        }

        if (ctx.btnBannerEditSong) {
            ctx.btnBannerEditSong.style.display = isStudio ? '' : 'none';
        }
        const mbEdit = document.getElementById('btn-mobile-edit-meta');
        if (mbEdit) {
            mbEdit.style.display = isStudio ? '' : 'none';
        }
        if (ctx.btnOpenDemoRecorder) {
            ctx.btnOpenDemoRecorder.style.display = (isStudio && !isReadOnly) ? 'inline-flex' : 'none';
        }

        ctx.updateReadOnlyBannerVisibility();
    }

    function setupPracticeMode() {
        if (ctx.btnModeStudio) ctx.btnModeStudio.addEventListener('click', () => setAppMode('studio'));
        if (ctx.btnModePractice) ctx.btnModePractice.addEventListener('click', () => setAppMode('practice'));
        if (ctx.btnModePlayAlong) ctx.btnModePlayAlong.addEventListener('click', () => setAppMode('playalong'));

        if (ctx.btnSetLoopA) {
            ctx.btnSetLoopA.addEventListener('click', () => {
                const idx = getSelectedOrActiveIndex();
                if (idx === -1) {
                    showNotificationToast(t('toasts.selectLoopA'));
                    return;
                }
                setLoopA(idx);
            });
        }

        if (ctx.btnSetLoopB) {
            ctx.btnSetLoopB.addEventListener('click', () => {
                const idx = getSelectedOrActiveIndex();
                if (idx === -1) {
                    showNotificationToast(t('toasts.selectLoopB'));
                    return;
                }
                setLoopB(idx);
            });
        }

        if (ctx.toggleLoopAb) {
            ctx.toggleLoopAb.addEventListener('change', (e) => {
                const currentSong = ctx.getCurrentSong();
                const prev = ctx.getLoopState();
                const isLoopActive = e.target.checked;
                let loopAIndex = prev.loopAIndex;
                let loopBIndex = prev.loopBIndex;
                if (isLoopActive && (loopAIndex === -1 || loopBIndex === -1)) {
                    if (currentSong && currentSong.notes.length > 0) {
                        if (loopAIndex === -1) loopAIndex = 0;
                        if (loopBIndex === -1) loopBIndex = currentSong.notes.length - 1;
                    }
                }
                ctx.setLoopState({
                    isLoopActive,
                    loopAIndex,
                    loopBIndex,
                    loopCycleCount: 0
                });
                if (ctx.trainerCycleBadge) ctx.trainerCycleBadge.textContent = 'Ciclo #0';
                updateLoopVisuals();
                updateLoopStatusText();
            });
        }

        if (ctx.btnClearLoop) {
            ctx.btnClearLoop.addEventListener('click', clearLoop);
        }

        if (ctx.toggleSpeedTrainer) {
            ctx.toggleSpeedTrainer.addEventListener('change', (e) => {
                ctx.setSpeedTrainerActive(e.target.checked);
                ctx.setLoopState({ loopCycleCount: 0 });
                if (ctx.trainerCycleBadge) {
                    ctx.trainerCycleBadge.textContent = 'Ciclo #0';
                }
            });
        }

        if (ctx.speedTrainerStepEl) {
            ctx.speedTrainerStepEl.addEventListener('change', (e) => {
                ctx.setSpeedTrainerStep(parseInt(e.target.value, 10) || 4);
            });
        }

        if (ctx.btnToggleDrone) ctx.btnToggleDrone.addEventListener('click', toggleDrone);
        if (ctx.btnToggleDronePa) ctx.btnToggleDronePa.addEventListener('click', toggleDrone);

        if (ctx.droneVolumeEl) {
            ctx.droneVolumeEl.addEventListener('input', (e) => {
                const vol = parseFloat(e.target.value);
                setDroneVolume(vol);
                if (ctx.droneVolumePaEl) ctx.droneVolumePaEl.value = vol;
            });
        }

        if (ctx.droneVolumePaEl) {
            ctx.droneVolumePaEl.addEventListener('input', (e) => {
                const vol = parseFloat(e.target.value);
                setDroneVolume(vol);
                if (ctx.droneVolumeEl) ctx.droneVolumeEl.value = vol;
            });
        }

        if (ctx.toggleMetronome) {
            ctx.toggleMetronome.addEventListener('change', () => {
                ctx.saveCurrentSongAccompaniment();
            });
        }

        if (ctx.btnZoomIn) ctx.btnZoomIn.addEventListener('click', () => changeZoom(1));
        if (ctx.btnZoomOut) ctx.btnZoomOut.addEventListener('click', () => changeZoom(-1));
        if (ctx.btnFullscreen) ctx.btnFullscreen.addEventListener('click', toggleFullscreen);
        if (ctx.btnToggleMic) ctx.btnToggleMic.addEventListener('click', toggleMicrophone);

        document.querySelectorAll('input[name="tuner-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                ctx.setMicState({ micTunerMode: e.target.value });
                if (ctx.tunerStatusMsg) {
                    ctx.tunerStatusMsg.textContent = (e.target.value === 'follow')
                        ? t('tuner.playalongCompareHint')
                        : t('tuner.freeModeHint');
                }
            });
        });

        if (ctx.whistleKeyEl) {
            ctx.whistleKeyEl.addEventListener('change', () => {
                updateDroneFrequencies();
            });
        }

        updateDroneUI();
        updateLoopStatusText();
    }

    return {
        setupPracticeMode,
        setAppMode,
        getSelectedOrActiveIndex,
        setLoopA,
        setLoopB,
        clearLoop,
        updateLoopVisuals,
        updateLoopStatusText,
        toggleDrone,
        startDrone,
        stopDrone,
        setDroneVolume,
        updateDroneFrequencies,
        updateDroneUI,
        startCountIn,
        cancelCountIn,
        changeZoom,
        toggleFullscreen,
        toggleMicrophone,
        startMic,
        stopMic,
        updatePitchLoop
    };
}
