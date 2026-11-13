/* ==========================================================================
   MOTOR DE PLAY-ALONG INTERATIVO POR MICROFONE, CALIBRAÇÃO DE RUÍDO & MAESTRIA
   ========================================================================== */

import {
    WHISTLE_KEYS_DATA,
    NOTE_STRINGS,
    isNoteOctave2,
    getMeasureBeatsPerBar,
    escapeHTML
} from '../config/whistleData.js';
import { getTransposedFrequency, playHitFeedbackOnContext } from '../audio/synthEngine.js';
import { scheduleBackingTrackStep } from '../audio/backingTracks.js';
import {
    getSharedAudioBuffer,
    detectWhistlePitch,
    noteFromPitchVal,
    centsOffFromPitchVal
} from '../audio/pitchEngine.js';
import { createMiniFingeringSVG } from '../ui/svgTemplates.js';
import {
    getCachedSongTessitura,
    saveSongMastery,
    getSimilarTuneRecommendations
} from '../ui/libraryMastery.js';
import { t } from '../i18n/index.js';
import { showNotificationToast } from '../utils/toast.js';

export function createPlayAlongController(ctx) {
    let isPlayAlongRunning = false;
    let playAlongMode = 'step'; // 'step' | 'flow'
    let playAlongCurrentIndex = 0;
    let playAlongTotalNotes = 0;
    let playAlongHits = 0;
    let playAlongAttempts = 0;
    let playAlongCombo = 0;
    let playAlongMaxCombo = 0;
    let playAlongToleranceCents = 35;
    let playAlongNoteConfirmedCount = 0;
    let playAlongAudioContext = null;
    let playAlongMicStream = null;
    let playAlongBiquad = null;
    let playAlongAnalyser = null;
    let playAlongRafId = null;
    let playAlongFlowTimer = null;
    let playAlongFlowNoteWasHit = false;
    let playAlongFlowRestViolated = false;
    let playAlongMeasureBeatPos = 0;

    let playAlongWaitingForRelease = false;
    let playAlongReleaseSilenceCount = 0;
    let playAlongRestSilenceCount = 0;

    let isCalibratingNoise = false;
    let calibRafId = null;
    let activePlayAlongTargetEl = null;

    function applyNoiseGateUI() {
        const micNoiseThreshold = ctx.getMicNoiseThreshold();
        if (ctx.playalongVuGate) {
            const percent = Math.min(95, Math.max(5, Math.round(micNoiseThreshold * 500)));
            ctx.playalongVuGate.style.left = `${percent}%`;
        }
        if (ctx.playalongNoiseHint) {
            const isCalib = localStorage.getItem('whistle_noise_calibrated') === 'true';
            const pctStr = (micNoiseThreshold * 100).toFixed(1) + '%';
            ctx.playalongNoiseHint.textContent = isCalib
                ? t('playalong.noiseCutCalibrated', { pct: pctStr })
                : t('playalong.noiseCutDefault', { pct: pctStr });
        }
    }

    function openMicCalibrationModal() {
        if (ctx.micCalibrationModal) {
            ctx.micCalibrationModal.classList.add('open');
            ctx.micCalibrationModal.style.display = 'flex';
        }
        if (ctx.calibProgressSection) ctx.calibProgressSection.style.display = 'none';
        if (ctx.calibResultSection) ctx.calibResultSection.style.display = 'none';
        if (ctx.btnStartCalibration) {
            ctx.btnStartCalibration.style.display = 'inline-flex';
            const span = ctx.btnStartCalibration.querySelector('span');
            if (span) span.textContent = t('micCalib.startBtn');
        }
        if (ctx.btnFinishCalibration) ctx.btnFinishCalibration.style.display = 'none';
    }

    function closeMicCalibrationModal() {
        if (isCalibratingNoise) {
            isCalibratingNoise = false;
            if (calibRafId) {
                cancelAnimationFrame(calibRafId);
                calibRafId = null;
            }
        }
        if (ctx.micCalibrationModal) {
            ctx.micCalibrationModal.classList.remove('open');
            ctx.micCalibrationModal.style.display = 'none';
        }
    }

    async function startNoiseCalibration() {
        if (isCalibratingNoise) return;

        const micState = ctx.getMicState();
        let analyser = playAlongAnalyser || micState.micAnalyser;
        let audioCtx = playAlongAudioContext || micState.micAudioContext;

        if (!analyser || !audioCtx || audioCtx.state !== 'running') {
            const ok = await startPlayAlongMic();
            if (!ok) {
                showNotificationToast(t('toasts.micAccessError'));
                return;
            }
            analyser = playAlongAnalyser;
            audioCtx = playAlongAudioContext;
        }

        isCalibratingNoise = true;
        if (ctx.btnStartCalibration) ctx.btnStartCalibration.style.display = 'none';
        if (ctx.btnFinishCalibration) ctx.btnFinishCalibration.style.display = 'none';
        if (ctx.calibProgressSection) ctx.calibProgressSection.style.display = 'block';
        if (ctx.calibResultSection) ctx.calibResultSection.style.display = 'none';
        if (ctx.calibStatusText) ctx.calibStatusText.textContent = t('micCalib.listeningEnvironment');

        const startTime = performance.now();
        const duration = 2000;
        let peakRms = 0;
        let sumRms = 0;
        let sampleCount = 0;

        const buf = new Float32Array(analyser.fftSize);

        function sampleLoop() {
            if (!isCalibratingNoise) return;

            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);

            analyser.getFloatTimeDomainData(buf);
            let rms = 0;
            for (let i = 0; i < buf.length; i++) {
                rms += buf[i] * buf[i];
            }
            rms = Math.sqrt(rms / buf.length);

            sumRms += rms;
            sampleCount++;
            if (rms > peakRms) peakRms = rms;

            if (ctx.calibTimerDisplay) {
                const remaining = Math.max(0, (duration - elapsed) / 1000).toFixed(1);
                ctx.calibTimerDisplay.textContent = `${remaining}s`;
            }
            if (ctx.calibProgressFill) {
                ctx.calibProgressFill.style.width = `${Math.round(progress * 100)}%`;
            }
            if (ctx.calibLiveFill) {
                ctx.calibLiveFill.style.width = `${Math.min(100, Math.round(rms * 500))}%`;
            }

            if (elapsed < duration) {
                calibRafId = requestAnimationFrame(sampleLoop);
            } else {
                isCalibratingNoise = false;
                calibRafId = null;

                const avgRms = sampleCount > 0 ? (sumRms / sampleCount) : peakRms;
                const calculatedThreshold = Math.max(0.026, Math.min(0.085, (peakRms * 1.45) + 0.006));

                ctx.setMicNoiseThreshold(calculatedThreshold);
                localStorage.setItem('whistle_noise_threshold', calculatedThreshold.toFixed(4));
                localStorage.setItem('whistle_noise_calibrated', 'true');

                applyNoiseGateUI();

                if (ctx.calibProgressSection) ctx.calibProgressSection.style.display = 'none';
                if (ctx.calibResultSection) ctx.calibResultSection.style.display = 'block';

                if (ctx.calibResultNoise) {
                    ctx.calibResultNoise.textContent = t('micCalib.peakAvgNoise', {
                        peak: (peakRms * 100).toFixed(1),
                        avg: (avgRms * 100).toFixed(1)
                    });
                }
                if (ctx.calibResultThreshold) {
                    ctx.calibResultThreshold.textContent = `${(calculatedThreshold * 100).toFixed(1)}%`;
                }
                if (ctx.calibResultBadge) {
                    ctx.calibResultBadge.textContent = t('micCalib.eliminatedBadge');
                }

                if (ctx.btnFinishCalibration) ctx.btnFinishCalibration.style.display = 'inline-flex';
                if (ctx.btnStartCalibration) {
                    ctx.btnStartCalibration.style.display = 'inline-flex';
                    const span = ctx.btnStartCalibration.querySelector('span');
                    if (span) span.textContent = t('micCalib.startBtn');
                }
            }
        }

        calibRafId = requestAnimationFrame(sampleLoop);
    }

    function resetNoiseCalibrationDefault() {
        ctx.setMicNoiseThreshold(0.035);
        localStorage.setItem('whistle_noise_threshold', '0.0350');
        localStorage.removeItem('whistle_noise_calibrated');
        applyNoiseGateUI();

        if (ctx.calibResultSection) ctx.calibResultSection.style.display = 'block';
        if (ctx.calibProgressSection) ctx.calibProgressSection.style.display = 'none';
        if (ctx.calibResultNoise) ctx.calibResultNoise.textContent = t('micCalib.defaultNoMeasure');
        if (ctx.calibResultThreshold) ctx.calibResultThreshold.textContent = '3.5%';
        if (ctx.calibResultBadge) ctx.calibResultBadge.textContent = t('micCalib.restoredFactoryCut');

        if (ctx.btnFinishCalibration) ctx.btnFinishCalibration.style.display = 'inline-flex';
    }

    function getPlayableNoteIndices(respectRepeats = null) {
        const currentSong = ctx.getCurrentSong();
        if (!currentSong || !Array.isArray(currentSong.notes)) return [];
        const nonPlayable = ['BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END', 'LINEBREAK', '|', '||', '|:', ':|'];

        const shouldRespect = (respectRepeats !== null)
            ? !!respectRepeats
            : (ctx.togglePaRespectRepeats ? ctx.togglePaRespectRepeats.checked : false);

        if (!shouldRespect) {
            const indices = [];
            currentSong.notes.forEach((item, idx) => {
                if (item && item.type !== 'bar' && item.note && !nonPlayable.includes(item.note)) {
                    indices.push(idx);
                }
            });
            return indices;
        }

        const indices = [];
        const playedRepeats = new Set();
        let idx = 0;
        const maxSteps = Math.max(100, currentSong.notes.length * 4);
        let steps = 0;

        while (idx < currentSong.notes.length && steps < maxSteps) {
            steps++;
            const item = currentSong.notes[idx];
            if (!item) {
                idx++;
                continue;
            }

            if (item.note === 'REPEAT_END') {
                if (!playedRepeats.has(idx)) {
                    playedRepeats.add(idx);
                    let target = 0;
                    for (let k = idx - 1; k >= 0; k--) {
                        if (currentSong.notes[k].note === 'REPEAT_START' || currentSong.notes[k].note === 'REPEAT_END') {
                            target = k + 1;
                            break;
                        }
                    }
                    idx = target;
                    continue;
                } else {
                    idx++;
                    continue;
                }
            }

            if (item.type !== 'bar' && item.note && !nonPlayable.includes(item.note)) {
                indices.push(idx);
            }
            idx++;
        }

        return indices;
    }

    function clearPlayAlongVisuals() {
        activePlayAlongTargetEl = null;
        const container = ctx.tabSheetEl || document;
        const allNoteEls = container.querySelectorAll('.note-card, .note-item');
        allNoteEls.forEach(el => {
            el.classList.remove('playalong-target', 'playalong-hit', 'playalong-near', 'playalong-miss');
        });
    }

    function updatePlayAlongStatsUI() {
        if (ctx.paStatProgress) {
            ctx.paStatProgress.textContent = `${playAlongHits} / ${playAlongTotalNotes}`;
        }
        if (ctx.paStatAccuracy) {
            const acc = playAlongAttempts > 0 ? Math.round((playAlongHits / playAlongAttempts) * 100) : 100;
            ctx.paStatAccuracy.textContent = `${acc}%`;
        }
        if (ctx.paStatCombo) {
            ctx.paStatCombo.textContent = `${playAlongCombo}x 🔥`;
        }
        if (ctx.paProgressBar) {
            const pct = playAlongTotalNotes > 0 ? Math.min(100, Math.round((playAlongCurrentIndex / playAlongTotalNotes) * 100)) : 0;
            ctx.paProgressBar.style.width = `${pct}%`;
        }
    }

    function getWhistleNoteTarget(noteIndex) {
        const currentSong = ctx.getCurrentSong();
        const playable = getPlayableNoteIndices();
        if (noteIndex < 0 || noteIndex >= playable.length || !currentSong) return null;
        const realIndex = playable[noteIndex];
        const songNote = currentSong.notes[realIndex];
        if (!songNote) return null;

        if (songNote.note === 'REST') {
            return {
                realIndex,
                rawNote: 'REST',
                display: t('notes.rest'),
                cleanNote: 'REST',
                isRest: true,
                duration: parseFloat(songNote.duration) || 1.0,
                isSecondOctave: false,
                expectedFreq: 0,
                expectedMidi: -1,
                fingering: null
            };
        }

        const currentKey = ctx.whistleKeyEl ? ctx.whistleKeyEl.value : 'D';
        const keyData = WHISTLE_KEYS_DATA[currentKey];
        const noteKey = songNote.note;
        const noteInfo = keyData?.notes[noteKey];

        const displayStr = noteInfo ? noteInfo.display : noteKey;
        const cleanNote = displayStr.replace(/[0-9]/g, '');
        const isSecondOctave = isNoteOctave2(noteKey, currentKey);
        const expectedFreq = getTransposedFrequency(noteKey, currentKey);
        const expectedMidi = expectedFreq > 0 ? noteFromPitchVal(expectedFreq) : -1;

        return {
            realIndex,
            rawNote: noteKey,
            display: displayStr,
            cleanNote: cleanNote.toUpperCase(),
            isRest: false,
            duration: parseFloat(songNote.duration) || 1.0,
            isSecondOctave,
            expectedFreq,
            expectedMidi,
            fingering: songNote.fingering || (noteInfo ? noteInfo.fingering : null)
        };
    }

    function updatePlayAlongTargetUI() {
        const target = getWhistleNoteTarget(playAlongCurrentIndex);

        if (activePlayAlongTargetEl) {
            activePlayAlongTargetEl.classList.remove('playalong-target');
            activePlayAlongTargetEl = null;
        }

        if (!target) {
            if (ctx.paTargetNote) ctx.paTargetNote.textContent = t('playalong.finished');
            if (ctx.paTargetFingerings) ctx.paTargetFingerings.innerHTML = '';
            return;
        }

        const targetEl = ctx.tabSheetEl ? ctx.tabSheetEl.querySelector(`.note-card[data-index="${target.realIndex}"]`) : null;
        if (targetEl) {
            targetEl.classList.add('playalong-target');
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            activePlayAlongTargetEl = targetEl;
        }

        if (ctx.paTargetNote) {
            ctx.paTargetNote.textContent = target.display;
        }

        if (ctx.paTargetFingerings) {
            if (target.isRest) {
                ctx.paTargetFingerings.innerHTML = `<span class="pa-rest-badge">${t('playalong.restBadge')}</span>`;
            } else if (target.fingering) {
                ctx.paTargetFingerings.innerHTML = createMiniFingeringSVG(target.fingering);
            } else {
                ctx.paTargetFingerings.innerHTML = '';
            }
        }
    }

    function initPlayAlongSession() {
        clearPlayAlongVisuals();
        playAlongHits = 0;
        playAlongAttempts = 0;
        playAlongCombo = 0;
        playAlongMaxCombo = 0;
        playAlongNoteConfirmedCount = 0;
        playAlongFlowNoteWasHit = false;
        playAlongFlowRestViolated = false;
        playAlongMeasureBeatPos = 0;

        playAlongWaitingForRelease = false;
        playAlongReleaseSilenceCount = 0;
        playAlongRestSilenceCount = 0;

        const playable = getPlayableNoteIndices();
        playAlongTotalNotes = playable.length;
        playAlongCurrentIndex = 0;

        updatePlayAlongStatsUI();
        updatePlayAlongTargetUI();

        if (ctx.playalongStatusIndicator) {
            ctx.playalongStatusIndicator.textContent = playAlongTotalNotes > 0
                ? t('playalong.readyWithCount', { count: playAlongTotalNotes })
                : t('playalong.noNotesCurrent');
        }
    }

    function setPlayAlongModeSub(mode) {
        if (isPlayAlongRunning) {
            stopPlayAlong();
        }
        playAlongMode = mode;
        if (ctx.btnPaModeStep && ctx.btnPaModeFlow) {
            if (mode === 'step') {
                ctx.btnPaModeStep.classList.add('active');
                ctx.btnPaModeFlow.classList.remove('active');
                if (ctx.playalongModeHint) {
                    ctx.playalongModeHint.textContent = t('playalong.stepHint');
                }
            } else {
                ctx.btnPaModeFlow.classList.add('active');
                ctx.btnPaModeStep.classList.remove('active');
                if (ctx.playalongModeHint) {
                    ctx.playalongModeHint.textContent = t('playalong.flowHint');
                }
            }
        }
        initPlayAlongSession();
    }

    function showPlayAlongResultModal() {
        if (ctx.playalongResultModal) {
            ctx.playalongResultModal.style.display = 'flex';
        }
    }

    function hidePlayAlongResultModal() {
        if (ctx.playalongResultModal) {
            ctx.playalongResultModal.style.display = 'none';
        }
    }

    function updatePlayAlongMasteryUI(songId, mastery) {
        const badgeEl = document.getElementById('pa-mastery-current-badge');
        const buttons = document.querySelectorAll('.pa-mastery-actions .btn-mastery-choice');

        const statusLabels = {
            learning: t('sidebar.filterLearning'),
            practicing: t('sidebar.filterPracticing'),
            mastered: t('sidebar.filterMastered')
        };

        if (badgeEl) {
            badgeEl.textContent = statusLabels[mastery.status] || statusLabels.learning;
        }

        buttons.forEach(btn => {
            const btnStatus = btn.dataset.mastery;
            btn.classList.toggle('active', btnStatus === mastery.status);
            btn.onclick = () => {
                const updated = saveSongMastery(songId, { status: btnStatus });
                updatePlayAlongMasteryUI(songId, updated);
                showNotificationToast(t('toasts.masteryUpdated', { status: statusLabels[btnStatus] }));
                ctx.renderSidebar();
            };
        });
    }

    function renderRecommendationsUI(currentTune) {
        const recGrid = document.getElementById('pa-rec-grid');
        if (!recGrid) return;

        const recommendations = getSimilarTuneRecommendations(currentTune, ctx.getSongs(), 2);
        if (!recommendations || recommendations.length === 0) {
            recGrid.innerHTML = `<p class="empty-list-state">${t('sidebar.emptySearch')}</p>`;
            return;
        }

        const rhythmNames = {
            'jig': t('rhythms.jig'),
            'reel': t('rhythms.reel'),
            'waltz': t('rhythms.waltz'),
            'polka': t('rhythms.polka'),
            'air': t('rhythms.air'),
            'soundtrack': t('rhythms.soundtrack')
        };

        recGrid.innerHTML = recommendations.map(rec => {
            const rName = rhythmNames[rec.rhythm] || rec.timeSignature || '';
            const tess = getCachedSongTessitura(rec);
            const octBadge = tess.rangeType === 'octave1' ? t('sidebar.badgeOctave1') : t('sidebar.badgeOctave12');
            return `
                <div class="pa-rec-card">
                    <div>
                        <div class="pa-rec-card-title">${escapeHTML(rec.title)}</div>
                        <div class="pa-rec-card-meta">
                            <span>🎵 ${escapeHTML(rec.artist || t('editor.traditional'))}</span>
                            <span>•</span>
                            <span>${t('sidebar.keyPrefix', { key: rec.key || 'D' })}</span>
                            ${rName ? `<span>• ${rName}</span>` : ''}
                            <span>• ${octBadge}</span>
                        </div>
                    </div>
                    <button type="button" class="btn btn-primary btn-sm btn-play-rec" data-rec-id="${rec.id}">
                        ${t('paResult.playRecommended')}
                    </button>
                </div>
            `;
        }).join('');

        recGrid.querySelectorAll('.btn-play-rec').forEach(btn => {
            btn.addEventListener('click', () => {
                const recId = btn.dataset.recId;
                hidePlayAlongResultModal();
                ctx.selectSong(recId);
            });
        });
    }

    function finishPlayAlongSession() {
        stopPlayAlong();

        const total = playAlongTotalNotes || 1;
        const accuracy = Math.round((playAlongHits / total) * 100);

        let starCount = 1;
        let title = t('paResult.heroTitleGood');
        let subtitle = t('paResult.heroSubGood');

        if (accuracy >= 90) {
            starCount = 3;
            title = t('paResult.heroTitle');
            subtitle = t('paResult.heroSubtitle');
        } else if (accuracy >= 70) {
            starCount = 2;
            title = t('paResult.heroTitleGreat');
            subtitle = t('paResult.heroSubGreat');
        }

        if (ctx.paResultStars) {
            let starsHtml = '';
            for (let i = 1; i <= 3; i++) {
                starsHtml += `<span class="star-item ${i <= starCount ? 'gold' : ''}">★</span>`;
            }
            ctx.paResultStars.innerHTML = starsHtml;
        }

        if (ctx.paResultTitle) ctx.paResultTitle.textContent = title;
        if (ctx.paResultSubtitle) ctx.paResultSubtitle.textContent = subtitle;
        if (ctx.paResultAccuracy) ctx.paResultAccuracy.textContent = `${accuracy}%`;
        if (ctx.paResultHits) ctx.paResultHits.textContent = `${playAlongHits} / ${total}`;
        if (ctx.paResultMaxCombo) ctx.paResultMaxCombo.textContent = `${playAlongMaxCombo}x 🔥`;

        const currentSong = ctx.getCurrentSong();
        if (currentSong) {
            const autoMastery = saveSongMastery(currentSong.id, {
                bestAccuracy: accuracy,
                bestScore: playAlongHits,
                maxBpm: currentSong.tempo || 110,
                played: true
            });

            updatePlayAlongMasteryUI(currentSong.id, autoMastery);
            renderRecommendationsUI(currentSong);
            ctx.renderSidebar();
        }

        showPlayAlongResultModal();
    }

    function playHitFeedbackSound() {
        playHitFeedbackOnContext(playAlongAudioContext);
    }

    function handlePlayAlongStepHit() {
        const playable = getPlayableNoteIndices();
        const realIndex = playable[playAlongCurrentIndex];
        const noteEl = ctx.tabSheetEl ? ctx.tabSheetEl.querySelector(`.note-card[data-index="${realIndex}"]`) : null;

        if (noteEl) {
            noteEl.classList.remove('playalong-target');
            noteEl.classList.add('playalong-hit');
        }
        if (activePlayAlongTargetEl === noteEl) {
            activePlayAlongTargetEl = null;
        }

        const justHitTarget = getWhistleNoteTarget(playAlongCurrentIndex);

        playHitFeedbackSound();
        playAlongHits++;
        playAlongAttempts++;
        playAlongCombo++;
        if (playAlongCombo > playAlongMaxCombo) {
            playAlongMaxCombo = playAlongCombo;
        }

        playAlongCurrentIndex++;
        updatePlayAlongStatsUI();

        if (playAlongCurrentIndex >= playable.length) {
            finishPlayAlongSession();
        } else {
            const nextTarget = getWhistleNoteTarget(playAlongCurrentIndex);
            if (nextTarget) {
                if (nextTarget.isRest) {
                    playAlongWaitingForRelease = false;
                    playAlongRestSilenceCount = 0;
                } else if (justHitTarget && !justHitTarget.isRest && nextTarget.rawNote === justHitTarget.rawNote) {
                    playAlongWaitingForRelease = true;
                    playAlongReleaseSilenceCount = 0;
                    playAlongNoteConfirmedCount = 0;
                } else {
                    playAlongWaitingForRelease = false;
                    playAlongNoteConfirmedCount = 0;
                }
            }

            updatePlayAlongTargetUI();
        }
    }

    function checkPlayAlongNoteMatch(detectedName, detectedOctave, cents, detectedMidi) {
        const target = getWhistleNoteTarget(playAlongCurrentIndex);
        const paBreathHint = document.getElementById('pa-breath-hint');
        if (!target || target.isRest) {
            if (paBreathHint) {
                paBreathHint.textContent = '';
                paBreathHint.className = 'pa-breath-hint';
            }
            return;
        }

        const targetClean = target.cleanNote;
        const isMidiPitchClassMatch = (typeof detectedMidi === 'number' && target.expectedMidi > 0)
            ? ((detectedMidi % 12) === (target.expectedMidi % 12))
            : false;
        const isNameMatch = isMidiPitchClassMatch ||
            (detectedName.toUpperCase() === targetClean) ||
            (targetClean === 'F#' && detectedName === 'Gb') ||
            (targetClean === 'C#' && detectedName === 'Db') ||
            (targetClean === 'G#' && detectedName === 'Ab') ||
            (targetClean === 'BB' && detectedName === 'A#') ||
            (targetClean === 'EB' && detectedName === 'D#') ||
            (targetClean === 'AB' && detectedName === 'G#') ||
            (targetClean === 'DB' && detectedName === 'C#');

        const isCentTolerated = Math.abs(cents) <= playAlongToleranceCents;
        const isOctaveMatch = (typeof detectedMidi === 'number' && target.expectedMidi > 0)
            ? (detectedMidi === target.expectedMidi)
            : true;

        if (isMidiPitchClassMatch && !isOctaveMatch) {
            if (ctx.paPitchVerdict) ctx.paPitchVerdict.classList.remove('hit');
            if (paBreathHint) {
                if (detectedMidi < target.expectedMidi) {
                    paBreathHint.className = 'pa-breath-hint hint-blow-harder';
                    paBreathHint.textContent = t('playalong.tipFirm');
                    if (ctx.paPitchVerdict) ctx.paPitchVerdict.textContent = t('playalong.upToOctave2');
                } else {
                    paBreathHint.className = 'pa-breath-hint hint-blow-softer';
                    paBreathHint.textContent = t('playalong.tipSoft');
                    if (ctx.paPitchVerdict) ctx.paPitchVerdict.textContent = t('playalong.downToOctave1');
                }
            }
            return;
        }

        if (isNameMatch && isCentTolerated) {
            if (ctx.paPitchVerdict) {
                ctx.paPitchVerdict.textContent = t('playalong.tuneHit');
                ctx.paPitchVerdict.classList.add('hit');
            }
            if (paBreathHint) {
                paBreathHint.className = 'pa-breath-hint hint-in-tune';
                paBreathHint.textContent = t('playalong.perfectEmbouchure');
            }

            playAlongNoteConfirmedCount++;
            if (playAlongNoteConfirmedCount >= 2) {
                playAlongNoteConfirmedCount = 0;
                if (playAlongMode === 'step') {
                    handlePlayAlongStepHit();
                } else {
                    playAlongFlowNoteWasHit = true;
                }
            }
        } else if (ctx.paPitchVerdict) {
            ctx.paPitchVerdict.classList.remove('hit');
            if (isNameMatch) {
                if (cents > 20) {
                    ctx.paPitchVerdict.textContent = t('playalong.slightlySharp');
                    if (paBreathHint) {
                        paBreathHint.className = 'pa-breath-hint hint-blow-softer';
                        paBreathHint.textContent = t('playalong.softenBlowing');
                    }
                } else if (cents < -20) {
                    ctx.paPitchVerdict.textContent = t('playalong.slightlyFlat');
                    if (paBreathHint) {
                        paBreathHint.className = 'pa-breath-hint hint-blow-harder';
                        paBreathHint.textContent = t('playalong.firmBlowing');
                    }
                } else {
                    ctx.paPitchVerdict.textContent = cents > 0 ? t('playalong.slightlyHigh') : t('playalong.slightlyLow');
                }
            } else {
                ctx.paPitchVerdict.textContent = t('playalong.heardExpected', { heard: detectedName, expected: target.display });
                if (paBreathHint) {
                    paBreathHint.textContent = '';
                    paBreathHint.className = 'pa-breath-hint';
                }
            }
        }
    }

    function updatePlayAlongAudioLoop() {
        if (!isPlayAlongRunning || !playAlongAnalyser || !playAlongAudioContext) return;

        if (playAlongAudioContext.state === 'suspended') {
            playAlongAudioContext.resume().catch(() => {});
        }

        const buf = getSharedAudioBuffer(playAlongAnalyser.fftSize);
        playAlongAnalyser.getFloatTimeDomainData(buf);
        const sampleRate = playAlongAudioContext.sampleRate;
        const micNoiseThreshold = ctx.getMicNoiseThreshold();

        const result = detectWhistlePitch(buf, sampleRate, micNoiseThreshold);
        const rms = result.rms;
        const pitch = result.pitch;

        if (ctx.playalongVuFill) {
            const vuWidth = Math.min(100, Math.round(rms * 500));
            ctx.playalongVuFill.style.width = `${vuWidth}%`;
            ctx.playalongVuFill.classList.toggle('above-gate', rms >= micNoiseThreshold);
        }

        const isSoundPresent = (pitch > 0 && pitch >= 250 && pitch <= 2400 && rms >= micNoiseThreshold);
        const target = getWhistleNoteTarget(playAlongCurrentIndex);

        if (target) {
            if (target.isRest) {
                if (ctx.paHeardNote) ctx.paHeardNote.textContent = isSoundPresent ? t('playalong.soundBlowing') : t('playalong.soundSilence');
                if (ctx.paHeardCents) ctx.paHeardCents.textContent = isSoundPresent ? `${pitch.toFixed(1)} Hz` : '—';
                if (ctx.paGaugeNeedle) ctx.paGaugeNeedle.style.left = '50%';

                if (isSoundPresent) {
                    playAlongRestSilenceCount = 0;
                    if (playAlongMode === 'flow') {
                        playAlongFlowRestViolated = true;
                    }
                    if (ctx.paPitchVerdict) {
                        ctx.paPitchVerdict.textContent = t('playalong.restObserve');
                        ctx.paPitchVerdict.classList.remove('hit');
                    }
                } else {
                    playAlongRestSilenceCount++;
                    if (ctx.paPitchVerdict) {
                        ctx.paPitchVerdict.textContent = t('playalong.restDone');
                        ctx.paPitchVerdict.classList.add('hit');
                    }
                    if (playAlongMode === 'step' && playAlongRestSilenceCount >= 8) {
                        playAlongRestSilenceCount = 0;
                        playAlongWaitingForRelease = false;
                        handlePlayAlongStepHit();
                    }
                }

                playAlongRafId = requestAnimationFrame(updatePlayAlongAudioLoop);
                return;
            }

            if (playAlongMode === 'step' && playAlongWaitingForRelease) {
                if (isSoundPresent) {
                    playAlongReleaseSilenceCount = 0;
                    playAlongNoteConfirmedCount = 0;
                    if (ctx.paPitchVerdict) {
                        ctx.paPitchVerdict.textContent = t('playalong.restPauseBeforeNext');
                        ctx.paPitchVerdict.classList.remove('hit');
                    }
                    if (ctx.paHeardNote) ctx.paHeardNote.textContent = t('playalong.continuousBlowing');
                    playAlongRafId = requestAnimationFrame(updatePlayAlongAudioLoop);
                    return;
                } else {
                    playAlongReleaseSilenceCount++;
                    if (playAlongReleaseSilenceCount >= 3) {
                        playAlongWaitingForRelease = false;
                        playAlongReleaseSilenceCount = 0;
                        if (ctx.paPitchVerdict) {
                            ctx.paPitchVerdict.textContent = t('playalong.restReadyNext');
                            ctx.paPitchVerdict.classList.remove('hit');
                        }
                    }
                    playAlongRafId = requestAnimationFrame(updatePlayAlongAudioLoop);
                    return;
                }
            }
        }

        if (isSoundPresent) {
            const noteNumber = noteFromPitchVal(pitch);
            const noteName = NOTE_STRINGS[noteNumber % 12];
            const octave = Math.floor(noteNumber / 12) - 1;
            const noteFullName = `${noteName}${octave}`;
            const cents = centsOffFromPitchVal(pitch, noteNumber);

            if (ctx.paHeardNote) {
                ctx.paHeardNote.textContent = noteFullName;
                ctx.paHeardNote.classList.toggle('in-tune', Math.abs(cents) <= playAlongToleranceCents);
            }

            if (ctx.paHeardCents) {
                ctx.paHeardCents.textContent = `${pitch.toFixed(1)} Hz (${cents > 0 ? '+' : ''}${cents}¢)`;
            }

            if (ctx.paGaugeNeedle) {
                const clampedCents = Math.max(-50, Math.min(50, cents));
                ctx.paGaugeNeedle.style.left = `${50 + clampedCents}%`;
            }

            checkPlayAlongNoteMatch(noteName, octave, cents, noteNumber);
        } else {
            if (ctx.paPitchVerdict && !ctx.paPitchVerdict.classList.contains('hit')) {
                ctx.paPitchVerdict.textContent = t('playalong.waitingSound');
            }
            const paBreathHint = document.getElementById('pa-breath-hint');
            if (paBreathHint) {
                paBreathHint.textContent = '';
                paBreathHint.className = 'pa-breath-hint';
            }
            playAlongNoteConfirmedCount = 0;
        }

        playAlongRafId = requestAnimationFrame(updatePlayAlongAudioLoop);
    }

    async function startPlayAlongMic() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showNotificationToast(t('toasts.noMicSupport'));
            return false;
        }

        try {
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtxClass) {
                showNotificationToast(t('toasts.noWebAudioSupport'));
                return false;
            }

            playAlongAudioContext = new AudioCtxClass();
            if (playAlongAudioContext.state === 'suspended') {
                await playAlongAudioContext.resume();
            }

            try {
                playAlongMicStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: true
                    },
                    video: false
                });
            } catch (constrErr) {
                console.warn('Fallback getUserMedia simples:', constrErr);
                playAlongMicStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            }

            const source = playAlongAudioContext.createMediaStreamSource(playAlongMicStream);
            playAlongBiquad = playAlongAudioContext.createBiquadFilter();
            playAlongBiquad.type = 'bandpass';
            playAlongBiquad.frequency.setValueAtTime(950, playAlongAudioContext.currentTime);
            playAlongBiquad.Q.setValueAtTime(0.7, playAlongAudioContext.currentTime);

            playAlongAnalyser = playAlongAudioContext.createAnalyser();
            playAlongAnalyser.fftSize = 2048;

            const silenceGain = playAlongAudioContext.createGain();
            silenceGain.gain.setValueAtTime(0, playAlongAudioContext.currentTime);

            source.connect(playAlongBiquad);
            playAlongBiquad.connect(playAlongAnalyser);
            playAlongAnalyser.connect(silenceGain);
            silenceGain.connect(playAlongAudioContext.destination);

            if (ctx.playalongMicBadge) {
                ctx.playalongMicBadge.textContent = t('playalong.micOn');
                ctx.playalongMicBadge.classList.add('active');
            }

            isPlayAlongRunning = true;
            updatePlayAlongAudioLoop();
            return true;
        } catch (err) {
            console.error('Erro ao acessar microfone no Play-Along:', err);
            showNotificationToast(t('toasts.micAccessError'));
            return false;
        }
    }

    function stopPlayAlongMic() {
        if (playAlongRafId) {
            cancelAnimationFrame(playAlongRafId);
            playAlongRafId = null;
        }
        if (playAlongBiquad) {
            try { playAlongBiquad.disconnect(); } catch (e) {}
            playAlongBiquad = null;
        }
        if (playAlongMicStream) {
            playAlongMicStream.getTracks().forEach(track => track.stop());
            playAlongMicStream = null;
        }
        if (playAlongAudioContext) {
            playAlongAudioContext.close().catch(() => {});
            playAlongAudioContext = null;
        }

        if (ctx.playalongMicBadge) {
            ctx.playalongMicBadge.textContent = t('playalong.micOff');
            ctx.playalongMicBadge.classList.remove('active');
        }
        if (ctx.playalongVuFill) ctx.playalongVuFill.style.width = '0%';
        if (ctx.paHeardNote) {
            ctx.paHeardNote.textContent = '--';
            ctx.paHeardNote.classList.remove('in-tune');
        }
        if (ctx.paHeardCents) ctx.paHeardCents.textContent = '0.0 Hz (0¢)';
        if (ctx.paGaugeNeedle) ctx.paGaugeNeedle.style.left = '50%';
        if (ctx.paPitchVerdict) {
            ctx.paPitchVerdict.textContent = t('playalong.waitingSound');
            ctx.paPitchVerdict.classList.remove('hit');
        }
    }

    function startPlayAlongFlowLoop() {
        const currentSong = ctx.getCurrentSong();
        const playable = getPlayableNoteIndices();
        if (!currentSong || playAlongCurrentIndex >= playable.length) return;

        const bpm = parseInt(ctx.songTempoEl.value, 10) || 110;
        const speedMultiplier = parseFloat(ctx.playSpeedSelect.value) || 1.0;
        const baseInterval = (60 / (bpm * speedMultiplier)) * 1000;

        const realIndex = playable[playAlongCurrentIndex];
        const songNote = currentSong.notes[realIndex];
        const isRest = songNote.note === 'REST';
        const durRatio = parseFloat(songNote.duration) || 1.0;
        const noteDurationMs = baseInterval * durRatio;

        playAlongFlowNoteWasHit = false;
        playAlongFlowRestViolated = false;
        updatePlayAlongTargetUI();

        const audioCtx = ctx.getAudioCtx();
        if (!isRest && ctx.togglePaBackingAudio && ctx.togglePaBackingAudio.checked) {
            try {
                ctx.initAudio();
                const activeAudioCtx = ctx.getAudioCtx();
                const key = ctx.whistleKeyEl ? ctx.whistleKeyEl.value : 'D';
                const freq = getTransposedFrequency(songNote.note, key);
                if (freq > 0) {
                    ctx.playWhistleSynth(freq, (noteDurationMs / 1000) * 0.9, activeAudioCtx.currentTime, songNote.ornament, songNote.note, key, !!songNote.slur);
                }
            } catch (e) {}
        }

        if (ctx.togglePaAccompaniment && ctx.togglePaAccompaniment.checked) {
            try {
                ctx.initAudio();
                const activeAudioCtx = ctx.getAudioCtx();
                const backingSettings = ctx.getBackingSettings();
                const effectiveRhythm = (backingSettings.rhythmStyle && backingSettings.rhythmStyle !== 'auto')
                    ? backingSettings.rhythmStyle
                    : (currentSong ? (currentSong.rhythm || currentSong.timeSignature || 'reel') : 'reel');

                const beatsPerBar = getMeasureBeatsPerBar(currentSong ? currentSong.timeSignature : '4/4');
                const noteBeats = durRatio;
                const startBeat = playAlongMeasureBeatPos || 0;
                const now = activeAudioCtx.currentTime;

                scheduleBackingTrackStep(activeAudioCtx, songNote, now, noteDurationMs / 1000, bpm * speedMultiplier, startBeat, beatsPerBar, {
                    bodhranActive: backingSettings.bodhranActive,
                    bodhranVolume: backingSettings.bodhranVolume,
                    guitarActive: backingSettings.guitarActive,
                    guitarVolume: backingSettings.guitarVolume,
                    guitarInstrument: backingSettings.guitarInstrument,
                    rhythmStyle: effectiveRhythm,
                    swing: backingSettings.swing || 'straight',
                    songKey: ctx.whistleKeyEl ? ctx.whistleKeyEl.value : (currentSong ? currentSong.key : 'D')
                });

                playAlongMeasureBeatPos = (startBeat + noteBeats) % beatsPerBar;
            } catch (e) {}
        }

        playAlongFlowTimer = setTimeout(() => {
            if (!isPlayAlongRunning || playAlongMode !== 'flow') return;

            const noteEl = ctx.tabSheetEl ? ctx.tabSheetEl.querySelector(`.note-card[data-index="${realIndex}"]`) : null;

            playAlongAttempts++;
            const isSuccess = isRest ? !playAlongFlowRestViolated : playAlongFlowNoteWasHit;

            if (isSuccess) {
                playAlongHits++;
                playAlongCombo++;
                if (playAlongCombo > playAlongMaxCombo) playAlongMaxCombo = playAlongCombo;
                if (noteEl) {
                    noteEl.classList.remove('playalong-target');
                    noteEl.classList.add('playalong-hit');
                }
            } else {
                playAlongCombo = 0;
                if (noteEl) {
                    noteEl.classList.remove('playalong-target');
                    noteEl.classList.add('playalong-miss');
                }
            }
            if (activePlayAlongTargetEl === noteEl) {
                activePlayAlongTargetEl = null;
            }

            playAlongCurrentIndex++;
            updatePlayAlongStatsUI();

            if (playAlongCurrentIndex >= playable.length) {
                finishPlayAlongSession();
            } else {
                startPlayAlongFlowLoop();
            }
        }, noteDurationMs);
    }

    function setPlayAlongToolbarCollapsed(collapsed) {
        const toolbar = ctx.playalongToolbar || document.getElementById('playalong-toolbar');
        if (!toolbar) return;
        toolbar.classList.toggle('toolbar-collapsed', Boolean(collapsed));
        const toggleBtn = document.getElementById('btn-toggle-playalong-toolbar');
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            const labelSpan = toggleBtn.querySelector('.toolbar-collapse-label');
            if (labelSpan) {
                labelSpan.textContent = collapsed ? t('playalong.expandSettings') : t('playalong.collapseSettings');
            }
        }
    }

    function syncPlayAlongQuickButton(running) {
        const quickBtn = document.getElementById('btn-playalong-quick-toggle');
        if (!quickBtn) return;
        quickBtn.classList.toggle('running', Boolean(running));
        const playIcon = quickBtn.querySelector('.icon-pa-play');
        const pauseIcon = quickBtn.querySelector('.icon-pa-pause');
        const label = document.getElementById('playalong-quick-label');
        if (playIcon) playIcon.style.display = running ? 'none' : 'inline-block';
        if (pauseIcon) pauseIcon.style.display = running ? 'inline-block' : 'none';
        if (label) label.textContent = running ? t('playalong.stop') : t('playalong.start');
    }

    function startPlayAlong() {
        const currentSong = ctx.getCurrentSong();
        if (!currentSong || currentSong.notes.length === 0) {
            showNotificationToast(t('toasts.loadSongFirst'));
            return;
        }

        const playable = getPlayableNoteIndices();
        if (playable.length === 0) {
            showNotificationToast(t('toasts.noValidNotes'));
            return;
        }

        if (playAlongCurrentIndex >= playable.length) {
            initPlayAlongSession();
        }

        startPlayAlongMic().then((ok) => {
            if (!ok) return;

            ctx.requestScreenWakeLock(false);
            updatePlayAlongTargetUI();
            if (window.innerWidth <= 860) {
                setPlayAlongToolbarCollapsed(true);
            }

            if (ctx.btnPlayAlongToggle) {
                ctx.btnPlayAlongToggle.classList.add('running');
                const playIcon = ctx.btnPlayAlongToggle.querySelector('.icon-pa-play');
                const pauseIcon = ctx.btnPlayAlongToggle.querySelector('.icon-pa-pause');
                if (playIcon) playIcon.style.display = 'none';
                if (pauseIcon) pauseIcon.style.display = 'inline-block';
                if (ctx.playalongToggleLabel) ctx.playalongToggleLabel.textContent = t('playalong.stop');
            }
            syncPlayAlongQuickButton(true);

            if (ctx.playalongStatusIndicator) {
                ctx.playalongStatusIndicator.textContent = playAlongMode === 'step'
                    ? t('playalong.stepHint')
                    : t('playalong.flowHint');
            }

            if (playAlongMode === 'flow') {
                startPlayAlongFlowLoop();
            }
        });
    }

    function stopPlayAlong() {
        isPlayAlongRunning = false;
        if (playAlongFlowTimer) {
            clearTimeout(playAlongFlowTimer);
            playAlongFlowTimer = null;
        }

        playAlongWaitingForRelease = false;
        playAlongReleaseSilenceCount = 0;
        playAlongRestSilenceCount = 0;
        playAlongMeasureBeatPos = 0;

        stopPlayAlongMic();
        ctx.releaseScreenWakeLock(false);

        if (ctx.btnPlayAlongToggle) {
            ctx.btnPlayAlongToggle.classList.remove('running');
            const playIcon = ctx.btnPlayAlongToggle.querySelector('.icon-pa-play');
            const pauseIcon = ctx.btnPlayAlongToggle.querySelector('.icon-pa-pause');
            if (playIcon) playIcon.style.display = 'inline-block';
            if (pauseIcon) pauseIcon.style.display = 'none';
            if (ctx.playalongToggleLabel) ctx.playalongToggleLabel.textContent = t('playalong.start');
        }
        syncPlayAlongQuickButton(false);

        if (ctx.playalongStatusIndicator) {
            ctx.playalongStatusIndicator.textContent = t('playalong.pausedStatus');
        }
    }

    function togglePlayAlong() {
        if (isPlayAlongRunning) {
            stopPlayAlong();
        } else {
            startPlayAlong();
        }
    }

    function restartPlayAlong() {
        if (isPlayAlongRunning) {
            stopPlayAlong();
        }
        initPlayAlongSession();
    }

    function setupPlayAlongMode() {
        if (ctx.btnPlayAlongToggle) ctx.btnPlayAlongToggle.addEventListener('click', togglePlayAlong);
        const quickToggle = document.getElementById('btn-playalong-quick-toggle');
        if (quickToggle) quickToggle.addEventListener('click', togglePlayAlong);
        const collapseBtn = document.getElementById('btn-toggle-playalong-toolbar');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                const toolbar = ctx.playalongToolbar || document.getElementById('playalong-toolbar');
                const isCollapsed = toolbar ? toolbar.classList.contains('toolbar-collapsed') : false;
                setPlayAlongToolbarCollapsed(!isCollapsed);
            });
        }
        if (ctx.btnPlayAlongRestart) ctx.btnPlayAlongRestart.addEventListener('click', restartPlayAlong);
        if (ctx.btnPaModeStep) ctx.btnPaModeStep.addEventListener('click', () => setPlayAlongModeSub('step'));
        if (ctx.btnPaModeFlow) ctx.btnPaModeFlow.addEventListener('click', () => setPlayAlongModeSub('flow'));

        if (ctx.playalongToleranceSelect) {
            ctx.playalongToleranceSelect.addEventListener('change', (e) => {
                playAlongToleranceCents = parseInt(e.target.value, 10) || 35;
            });
        }

        if (ctx.togglePaRespectRepeats) {
            ctx.togglePaRespectRepeats.addEventListener('change', () => {
                initPlayAlongSession();
            });
        }

        if (ctx.btnClosePaResult) ctx.btnClosePaResult.addEventListener('click', hidePlayAlongResultModal);
        if (ctx.btnPaResultContinue) ctx.btnPaResultContinue.addEventListener('click', hidePlayAlongResultModal);
        if (ctx.btnPaResultReplay) {
            ctx.btnPaResultReplay.addEventListener('click', () => {
                hidePlayAlongResultModal();
                restartPlayAlong();
                startPlayAlong();
            });
        }

        if (ctx.btnPaCalibrate) ctx.btnPaCalibrate.addEventListener('click', openMicCalibrationModal);
        if (ctx.btnTunerCalibrate) ctx.btnTunerCalibrate.addEventListener('click', openMicCalibrationModal);
        if (ctx.btnCloseCalibration) ctx.btnCloseCalibration.addEventListener('click', closeMicCalibrationModal);
        if (ctx.btnStartCalibration) ctx.btnStartCalibration.addEventListener('click', startNoiseCalibration);
        if (ctx.btnCalibResetDefault) ctx.btnCalibResetDefault.addEventListener('click', resetNoiseCalibrationDefault);
        if (ctx.btnFinishCalibration) ctx.btnFinishCalibration.addEventListener('click', closeMicCalibrationModal);

        applyNoiseGateUI();
    }

    return {
        getIsPlayAlongRunning: () => isPlayAlongRunning,
        setPlayAlongToolbarCollapsed,
        setupPlayAlongMode,
        initPlayAlongSession,
        clearPlayAlongVisuals,
        startPlayAlong,
        stopPlayAlong,
        togglePlayAlong,
        restartPlayAlong,
        updatePlayAlongMasteryUI,
        renderRecommendationsUI
    };
}
