/* ==========================================================================
   CELTIC WHISTLE TABS - CONTROLADOR PRINCIPAL & ORQUESTRAÇÃO DE UI (ES6 MODULE)
   ========================================================================== */

import { CURATED_REPERTOIRE } from './repertoire.js';

function generateRandomTuneId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let result = '';
    const bytes = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
        for (let i = 0; i < length; i++) {
            result += chars[bytes[i] % chars.length];
        }
    } else {
        for (let i = 0; i < length; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
    }
    return result;
}

import {
    STANDARD_FINGERINGS,
    NOTE_TO_SEMITONES,
    SEMITONES_TO_NOTE,
    getWhistleKeyData,
    calculateWhistleKeyDelta,
    getMeasureBeatsPerBar,
    escapeHTML
} from './src/config/whistleData.js';

import {
    loadCatalogAndUserSongs,
    persistUserSongs,
    saveUserSongsSafely,
    getLastStorageStatus
} from './src/state/store.js';

import {
    getOrCreateNoiseBuffer,
    getTransposedFrequency,
    scheduleWhistleVoice,
    playMetronomeClickOnContext
} from './src/audio/synthEngine.js';

import {
    playBodhranHit,
    playCelticStringStrum,
    scheduleBackingTrackStep
} from './src/audio/backingTracks.js';

import {
    parseStringOfNotes as parseStringOfNotesForKey,
    noteObjToNotation
} from './src/parsers/textCodec.js';

import {
    parseABCNotation,
    exportSongToABC
} from './src/parsers/abcCodec.js';

import {
    generateSongSVG as buildSongSVG,
    generateMIDIData,
    renderSongToWAV
} from './src/export/exporters.js';

import {
    createMiniFingeringSVG
} from './src/ui/svgTemplates.js';

import {
    initI18n,
    getCurrentLanguage,
    setLanguage,
    t,
    applyTranslationsToDOM,
    getAvailableLanguages
} from './src/i18n/index.js';

import {
    getCachedSongTessitura,
    invalidateTessituraCache
} from './src/ui/libraryMastery.js';

import { showNotificationToast, debounce } from './src/utils/toast.js';
import { createAuthController } from './src/auth/authClient.js';
import { createTabRenderer } from './src/editor/tabRenderer.js';
import { createSidebarController } from './src/sidebar/sidebarController.js';
import { createPracticeController } from './src/modes/practiceMode.js';
import { createPlayAlongController } from './src/modes/playAlongMode.js';
import { createFingeringChartController } from './src/ui/fingeringChartModal.js';
import { createOrnamentLabController } from './src/ui/ornamentLab.js';

function updateTextInputHelp(whistleKey) {
    const helpEl = document.querySelector('.text-input-help');
    if (!helpEl) return;
    const keyData = getWhistleKeyData(whistleKey);
    const lowTokens = (keyData.orderOct1 || []).map(id => keyData.notes[id]?.text).filter(Boolean).join(', ');
    const highTokens = (keyData.orderOct2 || []).map(id => keyData.notes[id]?.text).filter(Boolean).join(', ');
    const flat7Id = (keyData.orderSpecials || [])[0];
    const flat7Token = flat7Id ? (keyData.notes[flat7Id]?.text || '') : '';
    const keyLabel = t(`whistleKeys.${whistleKey}`) || keyData.name;
    const descHtml = t('editor.helpNotesTemplate', {
        low: escapeHTML(lowTokens),
        flat7: escapeHTML(flat7Token),
        high: escapeHTML(highTokens),
        space: escapeHTML(t('editor.spaceKey'))
    });
    helpEl.innerHTML = `<strong>${escapeHTML(t('editor.newNotationPrefix', { name: keyLabel }))}:</strong> ${descHtml}`;
}

// Injetar cabeçalho Accept-Language automaticamente nas requisições da API REST
if (typeof window !== 'undefined' && window.fetch) {
    const nativeFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        if (typeof url === 'string' && url.startsWith('/api')) {
            const headers = new Headers(options.headers || {});
            if (!headers.has('Accept-Language')) {
                headers.set('Accept-Language', getCurrentLanguage());
            }
            options.headers = headers;
        }
        return nativeFetch.call(this, url, options);
    };
}


// 2. ESTADO DA APLICAÇÃO
let songs = [];
let currentSong = null;
let audioCtx = null;
let playbackTimeout = null;
let currentPlayIndex = -1;
let playbackStartIndex = 0;
let isPlaying = false;
let metronomeOsc = null;

// Novo Estado para Histórico, Seleção, Clipboard e Edição
let undoStack = [];
let redoStack = [];
const maxUndoHistory = 50;
let selectedIndices = new Set();
let lastSelectedNoteIndex = -1;
let clipboardNotes = [];
let playedRepeatEnds = new Set(); // Controle de múltiplos ritornelos (:|) no playback
let currentBard = null;
let userLikedTuneIds = new Set();
let isCurrentSongReadOnly = false;
let playbackMeasureBeatPos = 0;
let playbackExpectedTimeMs = 0;

// Elementos da UI
const songListEl = document.getElementById('song-list');
const btnNewSong = document.getElementById('btn-new-song');
const btnSaveSong = document.getElementById('btn-save-song');
const btnExportJson = document.getElementById('btn-export-json');
const btnExportAll = document.getElementById('btn-export-all');
const importFileEl = document.getElementById('import-file');
const btnPrint = document.getElementById('btn-print');
const btnHelp = document.getElementById('btn-help');
const searchInput = document.getElementById('search-input');

const songTitleEl = document.getElementById('song-title');
const songArtistEl = document.getElementById('song-artist');
const whistleKeyEl = document.getElementById('whistle-key');
const songTimeSignatureEl = document.getElementById('song-time-signature');
const songTempoEl = document.getElementById('song-tempo');
const songCategoryEl = document.getElementById('song-category');
const songDifficultyEl = document.getElementById('song-difficulty');
const songRhythmEl = document.getElementById('song-rhythm');

// Banner de Leitura Compacto (Modos Treino e Play-Along)
const songDisplayBanner = document.getElementById('song-display-banner');
const bannerSongTitle = document.getElementById('banner-song-title');
const bannerSongBadge = document.getElementById('banner-song-badge');
const bannerArtist = document.getElementById('banner-artist');
const bannerKey = document.getElementById('banner-key');
const bannerTime = document.getElementById('banner-time');
const bannerTempo = document.getElementById('banner-tempo');

const tabSheetEl = document.getElementById('tab-sheet');
const emptyMessageEl = document.getElementById('empty-message');
const textNotesInputEl = document.getElementById('text-notes-input');
const textNotesErrorEl = document.getElementById('text-notes-error');

const btnPlay = document.getElementById('btn-play');
const btnStop = document.getElementById('btn-stop');
const playSpeedSelect = document.getElementById('play-speed-select');
const toggleMetronome = document.getElementById('toggle-metronome');
const btnClearTab = document.getElementById('btn-clear-tab');

// Elementos da Toolbar de Edição, Seleção e Histórico
const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
const btnInsertBar = document.getElementById('btn-insert-bar');
const btnInsertDoubleBar = document.getElementById('btn-insert-double-bar');
const btnInsertRepeatStart = document.getElementById('btn-insert-repeat-start');
const btnInsertRepeatEnd = document.getElementById('btn-insert-repeat-end');
const btnInsertLinebreak = document.getElementById('btn-insert-linebreak');
const editInsertionModeEl = document.getElementById('edit-insertion-mode');
const selectionStatusBadge = document.getElementById('selection-status-badge');
const btnCopySelection = document.getElementById('btn-copy-selection');
const btnPasteSelection = document.getElementById('btn-paste-selection');
const btnDuplicateSelection = document.getElementById('btn-duplicate-selection');
const btnDeleteSelection = document.getElementById('btn-delete-selection');
const btnClearSelection = document.getElementById('btn-clear-selection');
const btnLoopSelection = document.getElementById('btn-loop-selection');

// Elementos de Acordes e Teclado
const keyboardChordInput = document.getElementById('keyboard-chord-input');
const btnApplyChord = document.getElementById('btn-apply-chord');

// Elementos do Modal ABC
const btnOpenAbc = document.getElementById('btn-open-abc');
const abcModal = document.getElementById('abc-modal');
const btnCloseAbc = document.getElementById('btn-close-abc');
const btnCloseAbcDone = document.getElementById('btn-close-abc-done');
const importAbcTextarea = document.getElementById('import-abc-textarea');
const exportAbcTextarea = document.getElementById('export-abc-textarea');
const btnApplyImportAbc = document.getElementById('btn-apply-import-abc');
const btnCopyAbc = document.getElementById('btn-copy-abc');
const btnDownloadAbc = document.getElementById('btn-download-abc');
const abcFileInput = document.getElementById('abc-file-input');
const abcFeedback = document.getElementById('abc-feedback');

// Elementos do Modal de Transposição
const btnOpenTranspose = document.getElementById('btn-open-transpose');
const transposeModal = document.getElementById('transpose-modal');
const btnCloseTranspose = document.getElementById('btn-close-transpose');
const btnCloseTransposeDone = document.getElementById('btn-close-transpose-done');
const btnUndoTranspose = document.getElementById('btn-undo-transpose');
const transposeFromKeyEl = document.getElementById('transpose-from-key');
const transposeToKeyEl = document.getElementById('transpose-to-key');
const btnApplyFluteTranspose = document.getElementById('btn-apply-flute-transpose');
const btnApplyCustomSemitones = document.getElementById('btn-apply-custom-semitones');
const customSemitonesSelect = document.getElementById('custom-semitones-select');
const chkFluteAutofold = document.getElementById('chk-flute-autofold');
const chkPitchAutofold = document.getElementById('chk-pitch-autofold');
const fluteConvertPreview = document.getElementById('flute-convert-preview');
const transposeFeedback = document.getElementById('transpose-feedback');

const helpModal = document.getElementById('help-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCloseModalOk = document.getElementById('btn-close-modal-ok');

const sidebarToggleBtn = document.getElementById('sidebar-toggle');
const sidebarEl = document.getElementById('sidebar');

// ==========================================
// ESTADO & ELEMENTOS DA FASE 2: MODO PRÁTICA
// ==========================================
let currentAppMode = 'studio'; // 'studio' | 'practice'

// Loop A-B
let loopAIndex = -1;
let loopBIndex = -1;
let isLoopActive = false;
let loopCycleCount = 0;

// Speed Trainer
let isSpeedTrainerActive = false;
let speedTrainerStep = 4;

// Bordão Celta (Drone)
let isDroneActive = false;
let droneGainNode = null;
let droneOsc1 = null;
let droneOsc2 = null;
let droneFilter = null;

// Count-in (Contagem Regressiva)
let isCountInActive = true;
let isCountingIn = false;
let countInTimeout = null;

// Zoom da Tablatura
let currentZoomIndex = 1; // 100%

// Afinador & Escuta por Microfone (Play-Along)
let micStream = null;
let micAudioContext = null;
let micBiquad = null;
let micAnalyser = null;
let micRafId = null;
let isMicListening = false;
let micTunerMode = 'free'; // 'free' | 'follow'

// Elementos DOM do Modo Prática
const btnModeStudio = document.getElementById('btn-mode-studio');
const btnModePractice = document.getElementById('btn-mode-practice');
const practiceToolbar = document.getElementById('practice-toolbar');
const practiceBottomPanel = document.getElementById('practice-bottom-panel');

const btnSetLoopA = document.getElementById('btn-set-loop-a');
const btnSetLoopB = document.getElementById('btn-set-loop-b');
const toggleLoopAb = document.getElementById('toggle-loop-ab');
const btnClearLoop = document.getElementById('btn-clear-loop');
const loopStatusText = document.getElementById('loop-status-text');

const toggleSpeedTrainer = document.getElementById('toggle-speed-trainer');
const speedTrainerStepEl = document.getElementById('speed-trainer-step');
const trainerCycleBadge = document.getElementById('trainer-cycle-badge');

const btnToggleDrone = document.getElementById('btn-toggle-drone');
const droneBtnLabel = document.getElementById('drone-btn-label');
const droneVolumeEl = document.getElementById('drone-volume');
const droneStatusText = document.getElementById('drone-status-text');

const btnToggleDronePa = document.getElementById('btn-toggle-drone-pa');
const dronePaBtnLabel = document.getElementById('drone-pa-btn-label');
const droneVolumePaEl = document.getElementById('drone-volume-pa');
const dronePaStatusText = document.getElementById('drone-pa-status-text');

const toggleCountIn = document.getElementById('toggle-count-in');
const countInOverlay = document.getElementById('count-in-overlay');
const countInNum = document.getElementById('count-in-num');
const countInInfo = document.getElementById('count-in-info');

const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const zoomIndicator = document.getElementById('zoom-indicator');
const btnFullscreen = document.getElementById('btn-fullscreen');

const btnToggleMic = document.getElementById('btn-toggle-mic');
const micBtnLabel = document.getElementById('mic-btn-label');
const tunerDetectedNote = document.getElementById('tuner-detected-note');
const tunerDetectedFreq = document.getElementById('tuner-detected-freq');
const tunerNeedle = document.getElementById('tuner-needle');
const tunerStatusMsg = document.getElementById('tuner-status-msg');

// ==========================================================================
// ESTADO & ELEMENTOS DA FASE 5: PLAY-ALONG INTERATIVO POR MICROFONE
// ==========================================================================
const btnModePlayAlong = document.getElementById('btn-mode-playalong');
const playalongToolbar = document.getElementById('playalong-toolbar');
const playalongBottomPanel = document.getElementById('playalong-bottom-panel');

const btnPlayAlongToggle = document.getElementById('btn-playalong-toggle');
const playalongToggleLabel = document.getElementById('playalong-toggle-label');
const btnPlayAlongRestart = document.getElementById('btn-playalong-restart');
const playalongStatusIndicator = document.getElementById('playalong-status-indicator');

const btnPaModeStep = document.getElementById('btn-pa-mode-step');
const btnPaModeFlow = document.getElementById('btn-pa-mode-flow');
const playalongModeHint = document.getElementById('playalong-mode-hint');

const playalongToleranceSelect = document.getElementById('playalong-tolerance-select');
const togglePaBackingAudio = document.getElementById('toggle-pa-backing-audio');
const togglePaAccompaniment = document.getElementById('toggle-pa-accompaniment');
const togglePaRespectRepeats = document.getElementById('toggle-pa-respect-repeats');
const playalongVuFill = document.getElementById('playalong-vu-fill');
const playalongVuGate = document.getElementById('playalong-vu-gate');
const playalongMicBadge = document.getElementById('playalong-mic-badge');
const playalongNoiseHint = document.getElementById('playalong-noise-hint');
const btnPaCalibrate = document.getElementById('btn-pa-calibrate');
const btnTunerCalibrate = document.getElementById('btn-tuner-calibrate');

// Modal de Calibração de Ruído Ambiente
const micCalibrationModal = document.getElementById('mic-calibration-modal');
const btnCloseCalibration = document.getElementById('btn-close-calibration');
const btnStartCalibration = document.getElementById('btn-start-calibration');
const btnCalibResetDefault = document.getElementById('btn-calib-reset-default');
const btnFinishCalibration = document.getElementById('btn-finish-calibration');
const calibProgressSection = document.getElementById('calibration-progress-section');
const calibTimerDisplay = document.getElementById('calibration-timer-display');
const calibProgressFill = document.getElementById('calibration-progress-fill');
const calibLiveFill = document.getElementById('calibration-live-fill');
const calibStatusText = document.getElementById('calibration-status-text');
const calibResultSection = document.getElementById('calibration-result-section');
const calibResultNoise = document.getElementById('calib-result-noise');
const calibResultThreshold = document.getElementById('calib-result-threshold');
const calibResultBadge = document.getElementById('calib-result-badge');

// Elementos do HUD do Play-Along
const paTargetNote = document.getElementById('pa-target-note');
const paTargetFingerings = document.getElementById('pa-target-fingerings');
const paHeardNote = document.getElementById('pa-heard-note');
const paHeardCents = document.getElementById('pa-heard-cents');
const paPitchVerdict = document.getElementById('pa-pitch-verdict');
const paGaugeNeedle = document.getElementById('pa-gauge-needle');
const paStatProgress = document.getElementById('pa-stat-progress');
const paStatAccuracy = document.getElementById('pa-stat-accuracy');
const paStatCombo = document.getElementById('pa-stat-combo');
const paProgressBar = document.getElementById('pa-progress-bar');

// Modal de Resultado do Play-Along
const playalongResultModal = document.getElementById('playalong-result-modal');
const btnClosePaResult = document.getElementById('btn-close-pa-result');
const paResultStars = document.getElementById('pa-result-stars');
const paResultTitle = document.getElementById('pa-result-title');
const paResultSubtitle = document.getElementById('pa-result-subtitle');
const paResultAccuracy = document.getElementById('pa-result-accuracy');
const paResultHits = document.getElementById('pa-result-hits');
const paResultMaxCombo = document.getElementById('pa-result-max-combo');
const btnPaResultReplay = document.getElementById('btn-pa-result-replay');
const btnPaResultContinue = document.getElementById('btn-pa-result-continue');

// Limiar adaptativo de corte de ruído (Noise Gate)
let micNoiseThreshold = parseFloat(localStorage.getItem('whistle_noise_threshold')) || 0.035;

// ==========================================================================
// ESTADO & ELEMENTOS DA FASE 3: BIBLIOTECA, CURADORIA, FILTROS & SIDEBAR
// ==========================================================================
let userSongs = [];
let selectedCategory = 'all';
let selectedDifficulty = 'all';
let selectedRhythm = 'all';

// Favoritos ⭐ e Ordenação da Sidebar
let favoriteSongIds = new Set();
let currentSongSort = 'default';
const sortSongsSelect = document.getElementById('sort-songs-select');

// Modo Estante Compacto & Screen Wake Lock
let isStandModeActive = false;
const btnToggleStandMode = document.getElementById('btn-toggle-stand-mode');
let wakeLockSentinel = null;
let wakeLockManualActive = false;
const btnToggleWakeLock = document.getElementById('btn-toggle-wake-lock');
const wakeLockLabel = document.getElementById('wake-lock-label');

const btnToggleSidebarCollapse = document.getElementById('btn-toggle-sidebar-collapse');
const btnSidebarFloatingOpen = document.getElementById('btn-sidebar-floating-open');
const filterDifficulty = document.getElementById('filter-difficulty');
const filterRhythm = document.getElementById('filter-rhythm');
const songsCountBadge = document.getElementById('songs-count-badge');
const btnResetFilters = document.getElementById('btn-reset-filters');

// Elementos da Fase 9: Layout Limpo, Filtros Retráteis & Cabeçalho Dinâmico
const btnToggleFilters = document.getElementById('btn-toggle-filters');
const activeFiltersBadge = document.getElementById('active-filters-badge');
const btnResetFiltersQuick = document.getElementById('btn-reset-filters-quick');
const sidebarFiltersPanel = document.getElementById('sidebar-filters');
const editorHeader = document.querySelector('.editor-header');
const btnCollapseEditorHeader = document.getElementById('btn-collapse-editor-header');
const btnBannerEditSong = document.getElementById('btn-banner-edit-song');

// ==========================================================================
// ESTADO & ELEMENTOS DA FASE 14: TESSITURA, MAESTRIA & SETS TRADICIONAIS
// ==========================================================================
let selectedRange = 'all';
let selectedMastery = 'all';
let currentFilteredSongs = [];

const filterRange = document.getElementById('filter-range');
const filterMastery = document.getElementById('filter-mastery');
const btnRandomTune = document.getElementById('btn-random-tune');
const btnSetModeToggle = document.getElementById('btn-set-mode-toggle');
const btnNextSetTune = document.getElementById('btn-next-set-tune');

// ==========================================================================
// ESTADO & ELEMENTOS DA FASE 10: ÁUDIO POLIFÔNICO & BACKING TRACKS
// ==========================================================================
let pendingPublishAfterAuth = false;

let backingSettings = {
    bodhranActive: false,
    bodhranVolume: 0.75,
    guitarActive: false,
    guitarVolume: 0.65,
    guitarInstrument: 'dadgad',
    rhythmStyle: 'auto',
    swing: 'straight',
    whistleVolume: 1.0
};

function applySongAccompaniment(song) {
    if (!song) return;
    const acc = song.accompaniment || {};

    // 1. Metrônomo
    if (toggleMetronome) {
        toggleMetronome.checked = Boolean(acc.metronomeActive);
    }

    // 2. Backing Tracks Celta (Bodhrán & Violão/Bouzouki)
    backingSettings.bodhranActive = acc.bodhranActive !== undefined ? Boolean(acc.bodhranActive) : false;
    backingSettings.bodhranVolume = acc.bodhranVolume !== undefined ? Number(acc.bodhranVolume) : 0.75;
    backingSettings.guitarActive = acc.guitarActive !== undefined ? Boolean(acc.guitarActive) : false;
    backingSettings.guitarVolume = acc.guitarVolume !== undefined ? Number(acc.guitarVolume) : 0.65;
    backingSettings.guitarInstrument = acc.guitarInstrument || 'dadgad';
    backingSettings.rhythmStyle = acc.rhythmStyle || 'auto';
    backingSettings.swing = acc.swing || 'straight';
    backingSettings.whistleVolume = acc.whistleVolume !== undefined ? Number(acc.whistleVolume) : 1.0;

    syncBackingModalUI();
}

function saveCurrentSongAccompaniment() {
    if (!currentSong) return;
    const currentMode = document.body.dataset.appMode || currentAppMode || 'studio';
    if (currentMode !== 'studio') {
        return; // Não persiste alterações feitas nos modos Treino ou Play-Along
    }
    if (!currentSong.accompaniment) currentSong.accompaniment = {};

    currentSong.accompaniment = {
        metronomeActive: Boolean(toggleMetronome && toggleMetronome.checked),
        bodhranActive: Boolean(backingSettings.bodhranActive),
        bodhranVolume: backingSettings.bodhranVolume !== undefined ? backingSettings.bodhranVolume : 0.75,
        guitarActive: Boolean(backingSettings.guitarActive),
        guitarVolume: backingSettings.guitarVolume !== undefined ? backingSettings.guitarVolume : 0.65,
        guitarInstrument: backingSettings.guitarInstrument || 'dadgad',
        rhythmStyle: backingSettings.rhythmStyle || 'auto',
        swing: backingSettings.swing || 'straight',
        whistleVolume: backingSettings.whistleVolume !== undefined ? backingSettings.whistleVolume : 1.0
    };

    if (!isSongReadOnly(currentSong)) {
        saveSongsToStorage();
        triggerPublicTuneAutoSync();
    }
}

const btnOpenBackingTracks = document.getElementById('btn-open-backing-tracks');
const backingTracksModal = document.getElementById('backing-tracks-modal');
const btnCloseBackingModal = document.getElementById('btn-close-backing-modal');
const btnCloseBackingModalDone = document.getElementById('btn-close-backing-modal-done');
const btnTestBackingAudio = document.getElementById('btn-test-backing-audio');

const toggleBodhran = document.getElementById('toggle-bodhran');
const sliderBodhranVol = document.getElementById('slider-bodhran-vol');
const valBodhranVol = document.getElementById('val-bodhran-vol');
const selectBodhranStyle = document.getElementById('select-bodhran-style');
const selectCelticSwing = document.getElementById('select-celtic-swing');

const toggleGuitar = document.getElementById('toggle-guitar');
const sliderGuitarVol = document.getElementById('slider-guitar-vol');
const valGuitarVol = document.getElementById('val-guitar-vol');
const selectGuitarInstrument = document.getElementById('select-guitar-instrument');

const sliderWhistleVol = document.getElementById('slider-whistle-vol');
const valWhistleVol = document.getElementById('val-whistle-vol');

// Elementos do Gravador de Demonstração em Áudio Real (30s)
const btnPlayAudioDemo = document.getElementById('btn-play-audio-demo');
const btnOpenDemoRecorder = document.getElementById('btn-open-demo-recorder');
const audioDemoModal = document.getElementById('audio-demo-modal');
const btnCloseDemoModal = document.getElementById('btn-close-demo-modal');
const btnCloseDemoModalOk = document.getElementById('btn-close-demo-modal-ok');
const btnStartRecordDemo = document.getElementById('btn-start-record-demo');
const btnStopRecordDemo = document.getElementById('btn-stop-record-demo');
const btnDiscardRecordDemo = document.getElementById('btn-discard-record-demo');
const btnSaveRecordDemo = document.getElementById('btn-save-record-demo');
const btnDeleteSavedDemo = document.getElementById('btn-delete-saved-demo');
const demoAudioPlayer = document.getElementById('demo-audio-player');
const demoTimerDisplay = document.getElementById('demo-timer-display');
const demoProgressBar = document.getElementById('demo-progress-bar');
const demoRecorderBox = document.getElementById('demo-recorder-box');
const demoPreviewBox = document.getElementById('demo-preview-box');
const demoExistingBox = document.getElementById('demo-existing-box');

let activeDemoAudioInstance = null;

// ==========================================================================
// 2.1. INSTANCIAÇÃO DOS CONTROLADORES MODULARES (PASSO 1.3)
// ==========================================================================
const updateLoopState = (p) => {
    if ('loopAIndex' in p) loopAIndex = p.loopAIndex;
    if ('loopBIndex' in p) loopBIndex = p.loopBIndex;
    if ('isLoopActive' in p) isLoopActive = p.isLoopActive;
    if ('loopCycleCount' in p) loopCycleCount = p.loopCycleCount;
};

const authController = createAuthController({
    getCurrentBard: () => currentBard,
    setCurrentBard: (v) => { currentBard = v; },
    loadUserLikes: (...args) => loadUserLikes(...args),
    userLikedTuneIds,
    updateOfflineSyncIndicator: (...args) => updateOfflineSyncIndicator(...args),
    getCurrentSong: () => currentSong,
    setEditorReadOnlyMode: (...args) => setEditorReadOnlyMode(...args),
    isSongReadOnly: (...args) => isSongReadOnly(...args),
    renderSidebar: (...args) => renderSidebar(...args),
    syncOfflineTunes: (...args) => syncOfflineTunes(...args),
    getPendingPublishAfterAuth: () => pendingPublishAfterAuth,
    setPendingPublishAfterAuth: (v) => { pendingPublishAfterAuth = v; },
    toggleSongVisibility: (...args) => toggleSongVisibility(...args)
});

const tabRenderer = createTabRenderer({
    getCurrentSong: () => currentSong,
    whistleKeyEl,
    songTimeSignatureEl,
    tabSheetEl,
    emptyMessageEl,
    btnToggleLoop: null,
    pushHistoryState: (...args) => pushHistoryState(...args),
    saveSongsToStorage: (...args) => saveSongsToStorage(...args),
    playSingleNoteSound: (...args) => playSingleNoteSound(...args),
    clearPlaybackTimeout: () => { if (playbackTimeout) { clearTimeout(playbackTimeout); playbackTimeout = null; } },
    setCurrentPlayIndex: (v) => { currentPlayIndex = v; },
    setPlaybackMeasureBeatPos: (v) => { playbackMeasureBeatPos = v; },
    setPlaybackExpectedTimeMs: (v) => { playbackExpectedTimeMs = v; },
    playNextStep: (...args) => playNextStep(...args),
    getSelectedIndices: () => selectedIndices,
    setLoopState: updateLoopState,
    getLoopState: () => ({ isLoopActive, loopAIndex, loopBIndex, loopCycleCount }),
    getIsPlaying: () => isPlaying,
    getIsCurrentSongReadOnly: () => isCurrentSongReadOnly,
    removeNote: (...args) => removeNote(...args),
    getLastSelectedNoteIndex: () => lastSelectedNoteIndex,
    selectRangeNotes: (...args) => selectRangeNotes(...args),
    selectSingleNote: (...args) => selectSingleNote(...args),
    updateTextNotesInput: (...args) => updateTextNotesInput(...args),
    setPlaybackStartIndex: (...args) => setPlaybackStartIndex(...args),
    getPlaybackStartIndex: () => playbackStartIndex,
    setPlaybackStartIndexValue: (v) => { playbackStartIndex = v; },
    updateSelectionToolbar: (...args) => updateSelectionToolbar(...args)
});

const sidebarController = createSidebarController({
    getAudioCtx: () => audioCtx,
    initAudio: (...args) => initAudio(...args),
    getSongs: () => songs,
    getCurrentFilteredSongs: () => currentFilteredSongs,
    setCurrentFilteredSongs: (v) => { currentFilteredSongs = v; },
    getCurrentSong: () => currentSong,
    getCurrentBard: () => currentBard,
    getFilters: () => ({
        selectedCategory,
        selectedDifficulty,
        selectedRhythm,
        selectedRange,
        selectedMastery,
        currentSongSort
    }),
    setFilters: (p) => {
        if ('selectedCategory' in p) selectedCategory = p.selectedCategory;
        if ('selectedDifficulty' in p) selectedDifficulty = p.selectedDifficulty;
        if ('selectedRhythm' in p) selectedRhythm = p.selectedRhythm;
        if ('selectedRange' in p) selectedRange = p.selectedRange;
        if ('selectedMastery' in p) selectedMastery = p.selectedMastery;
        if ('currentSongSort' in p) currentSongSort = p.currentSongSort;
    },
    favoriteSongIds,
    userLikedTuneIds,
    selectSong: (...args) => selectSong(...args),
    startPlayback: (...args) => startPlayback(...args),
    setMobileSidebarOpen: (...args) => setMobileSidebarOpen(...args),
    toggleFavorite: (...args) => toggleFavorite(...args),
    handleToggleLike: (...args) => handleToggleLike(...args),
    deleteSong: (...args) => deleteSong(...args),
    fetchAndRenderCommunityTunes: (...args) => fetchAndRenderCommunityTunes(...args),
    fetchAndRenderMyCloudAndLocalTunes: (...args) => fetchAndRenderMyCloudAndLocalTunes(...args),
    btnSetModeToggle,
    btnNextSetTune,
    btnRandomTune,
    activeFiltersBadge,
    btnResetFiltersQuick,
    sidebarFiltersPanel,
    btnToggleFilters,
    searchInput,
    filterDifficulty,
    filterRhythm,
    filterRange,
    filterMastery,
    sortSongsSelect,
    sidebarEl,
    btnSidebarFloatingOpen,
    btnResetFilters,
    btnToggleSidebarCollapse,
    songListEl,
    songsCountBadge
});

const practiceController = createPracticeController({
    getSelectedIndices: () => selectedIndices,
    getCurrentSong: () => currentSong,
    getCurrentPlayIndex: () => currentPlayIndex,
    getPlaybackStartIndex: () => playbackStartIndex,
    tabSheetEl,
    getLoopState: () => ({ isLoopActive, loopAIndex, loopBIndex, loopCycleCount }),
    setLoopState: updateLoopState,
    loopStatusText,
    toggleLoopAb,
    trainerCycleBadge,
    btnClearLoop,
    toggleSpeedTrainer,
    speedTrainerStepEl,
    setSpeedTrainerActive: (v) => { isSpeedTrainerActive = v; },
    setSpeedTrainerStep: (v) => { speedTrainerStep = v; },
    whistleKeyEl,
    songTempoEl,
    songTimeSignatureEl,
    droneStatusText,
    dronePaStatusText,
    btnToggleDrone,
    droneBtnLabel,
    btnToggleDronePa,
    dronePaBtnLabel,
    droneVolumeEl,
    droneVolumePaEl,
    getIsDroneActive: () => isDroneActive,
    setIsDroneActive: (v) => { isDroneActive = v; },
    getDroneNodes: () => ({ droneGainNode, droneFilter, droneOsc1, droneOsc2 }),
    setDroneNodes: (n) => {
        if ('droneGainNode' in n) droneGainNode = n.droneGainNode;
        if ('droneFilter' in n) droneFilter = n.droneFilter;
        if ('droneOsc1' in n) droneOsc1 = n.droneOsc1;
        if ('droneOsc2' in n) droneOsc2 = n.droneOsc2;
    },
    getCurrentAppMode: () => currentAppMode,
    setCurrentAppMode: (m) => { currentAppMode = m; },
    onLeavePracticeMode: () => { if (typeof ornamentLabController !== 'undefined') ornamentLabController.closePanel(); },
    initAudio: (...args) => initAudio(...args),
    getAudioCtx: () => audioCtx,
    getIsCountingIn: () => isCountingIn,
    setIsCountingIn: (v) => { isCountingIn = v; },
    getCountInTimeout: () => countInTimeout,
    setCountInTimeout: (t) => { countInTimeout = t; },
    countInOverlay,
    countInNum,
    countInInfo,
    startPlayback: (...args) => startPlayback(...args),
    getCurrentZoomIndex: () => currentZoomIndex,
    setCurrentZoomIndex: (v) => { currentZoomIndex = v; },
    zoomIndicator,
    getMicState: () => ({ isMicListening, micAnalyser, micAudioContext, micStream, micBiquad, micRafId, micTunerMode }),
    setMicState: (p) => {
        if ('isMicListening' in p) isMicListening = p.isMicListening;
        if ('micAnalyser' in p) micAnalyser = p.micAnalyser;
        if ('micAudioContext' in p) micAudioContext = p.micAudioContext;
        if ('micStream' in p) micStream = p.micStream;
        if ('micBiquad' in p) micBiquad = p.micBiquad;
        if ('micRafId' in p) micRafId = p.micRafId;
        if ('micTunerMode' in p) micTunerMode = p.micTunerMode;
    },
    getMicNoiseThreshold: () => micNoiseThreshold,
    getIsPlaying: () => isPlaying,
    tunerDetectedNote,
    tunerDetectedFreq,
    tunerNeedle,
    tunerStatusMsg,
    btnToggleMic,
    micBtnLabel,
    btnModeStudio,
    btnModePractice,
    btnModePlayAlong,
    practiceToolbar,
    practiceBottomPanel,
    playalongToolbar,
    playalongBottomPanel,
    songDisplayBanner,
    editorHeader,
    btnOpenBackingTracks,
    btnBannerEditSong,
    btnOpenDemoRecorder,
    getIsPlayAlongRunning: () => playAlongController.getIsPlayAlongRunning(),
    stopPlayAlong: (...args) => stopPlayAlong(...args),
    clearPlayAlongVisuals: (...args) => clearPlayAlongVisuals(...args),
    updateSongDisplayBanner: (...args) => updateSongDisplayBanner(...args),
    initPlayAlongSession: (...args) => initPlayAlongSession(...args),
    isSongReadOnly: (...args) => isSongReadOnly(...args),
    updateReadOnlyBannerVisibility: (...args) => updateReadOnlyBannerVisibility(...args),
    btnSetLoopA,
    btnSetLoopB,
    toggleMetronome,
    saveCurrentSongAccompaniment: (...args) => saveCurrentSongAccompaniment(...args),
    btnZoomIn,
    btnZoomOut,
    btnFullscreen
});

const playAlongController = createPlayAlongController({
    getMicNoiseThreshold: () => micNoiseThreshold,
    setMicNoiseThreshold: (v) => { micNoiseThreshold = v; },
    getMicState: () => ({ micAnalyser, micAudioContext }),
    getCurrentSong: () => currentSong,
    getSongs: () => songs,
    selectSong: (...args) => selectSong(...args),
    renderSidebar: (...args) => renderSidebar(...args),
    initAudio: (...args) => initAudio(...args),
    getAudioCtx: () => audioCtx,
    playWhistleSynth: (...args) => playWhistleSynth(...args),
    getBackingSettings: () => backingSettings,
    requestScreenWakeLock: (...args) => requestScreenWakeLock(...args),
    releaseScreenWakeLock: (...args) => releaseScreenWakeLock(...args),
    tabSheetEl,
    whistleKeyEl,
    songTempoEl,
    playSpeedSelect,
    playalongVuGate,
    playalongNoiseHint,
    micCalibrationModal,
    calibProgressSection,
    calibResultSection,
    btnStartCalibration,
    btnFinishCalibration,
    calibStatusText,
    calibTimerDisplay,
    calibProgressFill,
    calibLiveFill,
    calibResultNoise,
    calibResultThreshold,
    calibResultBadge,
    togglePaRespectRepeats,
    paStatProgress,
    paStatAccuracy,
    paStatCombo,
    paProgressBar,
    paTargetNote,
    paTargetFingerings,
    playalongStatusIndicator,
    btnPaModeStep,
    btnPaModeFlow,
    playalongModeHint,
    playalongResultModal,
    paResultStars,
    paResultTitle,
    paResultSubtitle,
    paResultAccuracy,
    paResultHits,
    paResultMaxCombo,
    paPitchVerdict,
    playalongVuFill,
    paHeardNote,
    paHeardCents,
    paGaugeNeedle,
    playalongMicBadge,
    togglePaBackingAudio,
    togglePaAccompaniment,
    btnPlayAlongToggle,
    playalongToggleLabel,
    btnPlayAlongRestart,
    playalongToleranceSelect,
    btnClosePaResult,
    btnPaResultContinue,
    btnPaResultReplay,
    btnPaCalibrate,
    btnTunerCalibrate,
    btnCloseCalibration,
    btnCalibResetDefault,
    playalongToolbar
});

const fingeringChartController = createFingeringChartController({
    initAudio: () => initAudio(),
    getAudioCtx: () => audioCtx,
    getCurrentWhistleKey: () => (whistleKeyEl ? whistleKeyEl.value : 'D'),
    setAppMode: (mode) => setAppMode(mode),
    closeMobileMoreDropdown: () => {
        const dd = document.getElementById('mobile-more-dropdown');
        if (dd) {
            dd.classList.remove('show');
            dd.style.display = 'none';
        }
    }
});

const ornamentLabController = createOrnamentLabController({
    initAudio: () => initAudio(),
    getAudioCtx: () => audioCtx,
    getCurrentWhistleKey: () => (whistleKeyEl ? whistleKeyEl.value : 'D')
});

// Delegações finas para compatibilidade de chamadas internas em app.js
const updateUserButtonUI = (...a) => authController.updateUserButtonUI(...a);
const initAuth = (...a) => authController.initAuth(...a);
const setupAuthListeners = (...a) => authController.setupAuthListeners(...a);

const closeActivePopover = (...a) => tabRenderer.closeActivePopover(...a);
const updatePrintSheetHeader = (...a) => tabRenderer.updatePrintSheetHeader(...a);
const openChordPopover = (...a) => tabRenderer.openChordPopover(...a);
const openDurationPopover = (...a) => tabRenderer.openDurationPopover(...a);
const seekPlaybackToNote = (...a) => tabRenderer.seekPlaybackToNote(...a);
const loopSelection = (...a) => tabRenderer.loopSelection(...a);
const loopMeasure = (...a) => tabRenderer.loopMeasure(...a);
const renderTab = (...a) => tabRenderer.renderTab(...a);

const stopSongPreview = (...a) => sidebarController.stopSongPreview(...a);
const startSongPreview = (...a) => sidebarController.startSongPreview(...a);
const handleRandomTunePick = (...a) => sidebarController.handleRandomTunePick(...a);
const initSetModeControls = (...a) => sidebarController.initSetModeControls(...a);
const advanceToNextSetTune = (...a) => sidebarController.advanceToNextSetTune(...a);
const updateActiveFiltersBadge = (...a) => sidebarController.updateActiveFiltersBadge(...a);
const toggleSidebarFilters = (...a) => sidebarController.toggleSidebarFilters(...a);
const setupSidebarFiltersAndCollapse = (...a) => sidebarController.setupSidebarFiltersAndCollapse(...a);
const resetSidebarFilters = (...a) => sidebarController.resetSidebarFilters(...a);
const toggleSidebarCollapse = (...a) => sidebarController.toggleSidebarCollapse(...a);
const setSidebarCollapse = (...a) => sidebarController.setSidebarCollapse(...a);
const renderSidebar = (...a) => sidebarController.renderSidebar(...a);

const setupPracticeMode = (...a) => practiceController.setupPracticeMode(...a);
const setAppMode = (...a) => practiceController.setAppMode(...a);
const getSelectedOrActiveIndex = (...a) => practiceController.getSelectedOrActiveIndex(...a);
const setLoopA = (...a) => practiceController.setLoopA(...a);
const setLoopB = (...a) => practiceController.setLoopB(...a);
const clearLoop = (...a) => practiceController.clearLoop(...a);
const updateLoopVisuals = (...a) => practiceController.updateLoopVisuals(...a);
const updateLoopStatusText = (...a) => practiceController.updateLoopStatusText(...a);
const toggleDrone = (...a) => practiceController.toggleDrone(...a);
const startDrone = (...a) => practiceController.startDrone(...a);
const stopDrone = (...a) => practiceController.stopDrone(...a);
const setDroneVolume = (...a) => practiceController.setDroneVolume(...a);
const updateDroneFrequencies = (...a) => practiceController.updateDroneFrequencies(...a);
const updateDroneUI = (...a) => practiceController.updateDroneUI(...a);
const startCountIn = (...a) => practiceController.startCountIn(...a);
const cancelCountIn = (...a) => practiceController.cancelCountIn(...a);
const changeZoom = (...a) => practiceController.changeZoom(...a);
const toggleFullscreen = (...a) => practiceController.toggleFullscreen(...a);
const toggleMicrophone = (...a) => practiceController.toggleMicrophone(...a);
const startMic = (...a) => practiceController.startMic(...a);
const stopMic = (...a) => practiceController.stopMic(...a);
const updatePitchLoop = (...a) => practiceController.updatePitchLoop(...a);

const setupPlayAlongMode = (...a) => playAlongController.setupPlayAlongMode(...a);
const initPlayAlongSession = (...a) => playAlongController.initPlayAlongSession(...a);
const clearPlayAlongVisuals = (...a) => playAlongController.clearPlayAlongVisuals(...a);
const startPlayAlong = (...a) => playAlongController.startPlayAlong(...a);
const stopPlayAlong = (...a) => playAlongController.stopPlayAlong(...a);
const togglePlayAlong = (...a) => playAlongController.togglePlayAlong(...a);
const restartPlayAlong = (...a) => playAlongController.restartPlayAlong(...a);
const updatePlayAlongMasteryUI = (...a) => playAlongController.updatePlayAlongMasteryUI(...a);
const renderRecommendationsUI = (...a) => playAlongController.renderRecommendationsUI(...a);

function updateLanguageUI(lang) {
    const available = getAvailableLanguages();
    const current = available.find(l => l.code === lang) || available[0];
    
    const flagEl = document.getElementById('desktop-lang-flag');
    const labelEl = document.getElementById('desktop-lang-label');
    if (flagEl) flagEl.textContent = current.flag;
    if (labelEl) labelEl.textContent = current.short;

    // Atualiza opções desktop
    document.querySelectorAll('.lang-option-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Atualiza pills mobile
    document.querySelectorAll('.btn-lang-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.lang === lang);
    });
}

function setupLanguageSelector() {
    const btnToggle = document.getElementById('btn-lang-toggle');
    const dropdown = document.getElementById('lang-dropdown');
    
    // Atualiza estado visual inicial
    updateLanguageUI(getCurrentLanguage());
    
    if (btnToggle && dropdown) {
        btnToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = dropdown.style.display === 'flex';
            dropdown.style.display = isVisible ? 'none' : 'flex';
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#lang-selector-wrapper')) {
                dropdown.style.display = 'none';
            }
        });
    }
    
    // Opções desktop
    document.querySelectorAll('.lang-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lang = btn.dataset.lang;
            if (lang) {
                setLanguage(lang);
                if (dropdown) dropdown.style.display = 'none';
            }
        });
    });
    
    // Opções mobile
    document.querySelectorAll('.btn-lang-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            e.stopPropagation();
            const lang = pill.dataset.lang;
            if (lang) {
                setLanguage(lang);
            }
        });
    });
    
    // Ouvinte global de mudança de idioma
    window.addEventListener('languagechange', (e) => {
        const lang = e.detail.lang;
        updateLanguageUI(lang);
        renderTab();
        if (typeof renderSidebar === 'function') {
            renderSidebar();
        }
        if (typeof updateSongDisplayBanner === 'function' && currentSong) {
            updateSongDisplayBanner(currentSong);
        }
        if (typeof updateReadOnlyBanner === 'function') {
            updateReadOnlyBanner();
        }
        if (typeof updatePrintSheetHeader === 'function') {
            updatePrintSheetHeader(currentSong);
        }
        if (typeof updateUserButtonUI === 'function') {
            updateUserButtonUI();
        }
        if (typeof updateDroneUI === 'function') {
            updateDroneUI();
        }
        if (typeof updateLoopStatusText === 'function') {
            updateLoopStatusText();
        }
        if (typeof updateOfflineSyncIndicator === 'function') {
            updateOfflineSyncIndicator();
        }
        if (typeof updateTextInputHelp === 'function') {
            updateTextInputHelp(whistleKeyEl ? whistleKeyEl.value : (currentSong ? currentSong.key : 'D'));
        }
    });
}

// 3. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    initI18n();
    setupLanguageSelector();
    loadFavorites();
    loadSongs();
    setupEventListeners();
    setupEditorToolbar();
    setupKeyboardTabs();
    setupEditorModeTabs();
    setupNoteInputEvents();
    setupTransposeModal();
    setupABCModal();
    setupPracticeMode();
    setupPlayAlongMode();
    setupSidebarFiltersAndCollapse();
    tabRenderer.setupTabSheetDelegation();
    sidebarController.setupSidebarListDelegation();
    setupDynamicSongHeader();
    setupBackingTracksModal();
    setupAudioDemoRecorder();
    setupPhase4VisualsAndExport();
    initSetModeControls();
    initStandMode();
    setupScreenWakeLock();
    initSongSort();
    setupPWA();
    setupMobileNavigation();
    setupCommunityAndShare();
    checkSharedTuneInURL();
    initAuth();
    setupAuthListeners();
    setupReadOnlyAndRemix();
    setupOfflineSync();
    syncCommunityTunesToCatalog();
    const initialKey = currentSong ? (currentSong.key || 'D') : (whistleKeyEl ? whistleKeyEl.value : 'D');
    renderKeyboard(initialKey);
    updateTextInputHelp(initialKey);
});

// Carrega as músicas do repertório curado e do armazenamento local do usuário
function loadSongs() {
    const loaded = loadCatalogAndUserSongs(CURATED_REPERTOIRE);
    songs = loaded.songs;
    userSongs = loaded.userSongs;

    const savedCollapse = localStorage.getItem('sidebar_collapsed') === 'true';
    if (savedCollapse && window.innerWidth > 900) {
        setSidebarCollapse(true);
    }

    updateOfflineSyncIndicator();
    renderSidebar();

    if (songs.length > 0) {
        selectSong(songs[0].id);
    } else {
        createNewSong();
    }
}

function saveSongsToStorage() {
    userSongs = persistUserSongs(userSongs, currentSong);
    const status = getLastStorageStatus();
    if (status && status.quotaExceeded) {
        showNotificationToast(t('toasts.storageQuotaWarning'));
    }
    updateOfflineSyncIndicator();
    triggerPublicTuneAutoSync();
}

// 4. OPERAÇÕES DE MÚSICA (CRUD)
function createNewSong() {
    const id = generateRandomTuneId(8);
    const bardAuthor = currentBard 
        ? (currentBard.displayName || currentBard.display_name || currentBard.username) 
        : t('editor.composerFallback');
    const newSong = {
        id: id,
        title: t('editor.newSongTitle'),
        artist: bardAuthor,
        category: (songCategoryEl ? songCategoryEl.value : 'celtic') || 'celtic',
        difficulty: (songDifficultyEl ? songDifficultyEl.value : 'iniciante') || 'iniciante',
        rhythm: (songRhythmEl ? songRhythmEl.value : 'reel') || 'reel',
        key: 'D',
        timeSignature: '4/4',
        tempo: 110,
        isCurated: false,
        isCommunity: false,
        isCloud: false,
        is_public: 0,
        syncStatus: 'pending',
        accompaniment: {
            metronomeActive: false,
            bodhranActive: false,
            bodhranVolume: 0.75,
            guitarActive: false,
            guitarVolume: 0.65,
            guitarInstrument: 'dadgad',
            rhythmStyle: 'auto',
            whistleVolume: 1.0
        },
        notes: []
    };
    userSongs.unshift(newSong);
    songs.unshift(newSong);
    currentSong = newSong;
    saveSongsToStorage();
    updateOfflineSyncIndicator();
    renderSidebar();
    selectSong(id);
    expandEditorHeader();
    if (songTitleEl) {
        songTitleEl.focus();
        songTitleEl.select();
    }

    // Se estiver autenticado, cria rascunho privado imediatamente no backend preservando o ID único
    if (currentBard) {
        fetch('/api/tunes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                id: newSong.id,
                title: newSong.title,
                artist: newSong.artist,
                key: newSong.key,
                tempo: newSong.tempo,
                timeSignature: newSong.timeSignature,
                category: newSong.category,
                difficulty: newSong.difficulty,
                rhythm: newSong.rhythm,
                notes: newSong.notes,
                accompaniment: newSong.accompaniment,
                is_public: 0
            })
        }).then(res => {
            if (res.ok) {
                newSong.isCloud = true;
                newSong.syncStatus = 'synced';
                const uIdx = userSongs.findIndex(s => s.id === newSong.id);
                if (uIdx !== -1) {
                    userSongs[uIdx].isCloud = true;
                    userSongs[uIdx].syncStatus = 'synced';
                }
                saveSongsToStorage();
                updateOfflineSyncIndicator();
                renderSidebar();
            }
        }).catch(err => {
            console.warn('[Sync] Rascunho salvo localmente, sincronização posterior pendente:', err);
        });
    }
}

// ==========================================================================
// CABEÇALHO DINÂMICO & MODO ESTÚDIO COMPACTO (FASE 9)
// ==========================================================================
function collapseEditorHeader() {
    if (editorHeader) editorHeader.classList.add('collapsed');
    const currentMode = document.body.dataset.appMode || 'studio';
    if (currentMode === 'studio' && songDisplayBanner) {
        songDisplayBanner.classList.add('active-in-studio');
    }
}

function expandEditorHeader() {
    if (editorHeader) editorHeader.classList.remove('collapsed');
    if (songDisplayBanner) songDisplayBanner.classList.remove('active-in-studio');
}

function setupDynamicSongHeader() {
    if (btnCollapseEditorHeader) {
        btnCollapseEditorHeader.addEventListener('click', () => {
            updateCurrentSongMetadata();
            collapseEditorHeader();
        });
    }

    if (btnBannerEditSong) {
        btnBannerEditSong.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isCurrentSongReadOnly) {
                const readonlyBanner = document.getElementById('readonly-mode-banner');
                if (readonlyBanner) {
                    readonlyBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }
            expandEditorHeader();
            if (songTitleEl) {
                songTitleEl.focus();
                songTitleEl.select();
            }
        });
    }

    if (songDisplayBanner) {
        songDisplayBanner.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('a')) return;
            const currentMode = document.body.dataset.appMode || 'studio';
            if (currentMode === 'studio') {
                if (isCurrentSongReadOnly) {
                    const readonlyBanner = document.getElementById('readonly-mode-banner');
                    if (readonlyBanner) {
                        readonlyBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    return;
                }
                expandEditorHeader();
                if (songTitleEl) {
                    songTitleEl.focus();
                    songTitleEl.select();
                }
            }
        });
    }

    // Botão de Lápis para Edição de Metadados na Barra Superior Mobile (Fase 11)
    const btnMobileEditMeta = document.getElementById('btn-mobile-edit-meta');
    if (btnMobileEditMeta) {
        btnMobileEditMeta.addEventListener('click', (e) => {
            e.stopPropagation();
            if (document.body.dataset.appMode !== 'studio') {
                setAppMode('studio');
            }
            expandEditorHeader();
            if (editorHeader) {
                editorHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            if (isCurrentSongReadOnly) {
                if (typeof showNotificationToast === 'function') {
                    showNotificationToast(t('toasts.readOnlyMode'));
                } else if (typeof showToast === 'function') {
                    showToast(t('toasts.readOnlyMode'), 'info');
                }
            } else if (songTitleEl) {
                songTitleEl.focus();
                songTitleEl.select();
            }
        });
    }
}

function updateSongDisplayBanner(song) {
    if (!song) return;
    if (bannerSongTitle) bannerSongTitle.textContent = song.title || t('editor.untitled');
    if (bannerArtist) bannerArtist.textContent = t('editor.composerLabel', { composer: song.artist || t('editor.traditional') });
    if (bannerKey) bannerKey.textContent = t('editor.keyLabel', { key: song.key || 'D' });
    if (bannerTime) bannerTime.textContent = t('editor.timeLabel', { time: song.timeSignature || '4/4' });
    if (bannerTempo) bannerTempo.textContent = `${song.tempo || 110} BPM`;

    // Título Compacto Mobile da Barra Superior (Fase 11)
    const mbTopTitle = document.getElementById('mobile-top-title');
    const mbTopKey = document.getElementById('mobile-top-key');
    if (mbTopTitle) mbTopTitle.textContent = song.title || t('editor.untitled');
    if (mbTopKey) mbTopKey.textContent = t('sidebar.keyPrefix', { key: song.key || song.whistleKey || 'D' });

    if (bannerSongBadge) {
        let catLabel = t('sidebar.filterCeltic');
        let catClass = 'tag-celtic';
        if (song.category === 'pop') {
            catLabel = t('sidebar.filterMovies');
            catClass = 'tag-pop';
        } else if (song.category === 'rock') {
            catLabel = t('sidebar.filterRock');
            catClass = 'tag-rock';
        } else if (song.category === 'anime') {
            catLabel = t('sidebar.filterAnime');
            catClass = 'tag-anime';
        } else if (song.category === 'other') {
            catLabel = t('editor.catOtherOpt');
            catClass = 'tag-other';
        } else if (song.category === 'traditional') {
            catLabel = t('sidebar.catFolklore');
            catClass = 'tag-traditional';
        }
        
        if (!song.isCurated) {
            catLabel = t('sidebar.badgeMy');
            catClass = 'tag-mysong';
        } else if (song.isUserModified) {
            catLabel = t('sidebar.badgeEdited');
            catClass = 'tag-mysong';
        }
        
        bannerSongBadge.className = `badge-tag ${catClass}`;
        bannerSongBadge.textContent = catLabel;
    }

    // Controle da Demonstração em Áudio Real (Fase 10)
    const hasAudioDemo = !!(song.audio_demo || song.audioDemo);
    if (btnPlayAudioDemo) {
        btnPlayAudioDemo.style.display = hasAudioDemo ? 'inline-flex' : 'none';
        btnPlayAudioDemo.classList.remove('playing');
        const demoSpan = btnPlayAudioDemo.querySelector('span:last-child');
        if (demoSpan) demoSpan.textContent = t('banner.authorDemo');
    }

    const isStudio = (document.body.dataset.appMode || currentAppMode || 'studio') === 'studio';
    const isReadOnly = isSongReadOnly(song);

    if (btnBannerEditSong) {
        btnBannerEditSong.style.display = isStudio ? '' : 'none';
    }
    const mbEdit = document.getElementById('btn-mobile-edit-meta');
    if (mbEdit) {
        mbEdit.style.display = isStudio ? '' : 'none';
    }

    if (btnOpenDemoRecorder) {
        // Apenas o autor da partitura pode gravar demo e somente no modo estúdio
        const canRecord = isStudio && !isReadOnly;
        btnOpenDemoRecorder.style.display = canRecord ? 'inline-flex' : 'none';
    }

    if (activeDemoAudioInstance) {
        activeDemoAudioInstance.pause();
        activeDemoAudioInstance = null;
    }
}

async function selectSong(id) {
    playbackStartIndex = 0;
    stopPlayback();
    const song = songs.find(s => s.id === id);
    if (!song) return;

    // Se as notas ainda não foram baixadas (listagem leve da comunidade)
    if (song.isCommunity && (!Array.isArray(song.notes) || song.notes.length === 0)) {
        try {
            const res = await fetch(`/api/tunes/${encodeURIComponent(song.id)}`);
            if (res.ok) {
                const fullTune = await res.json();
                song.notes = fullTune.notes || [];
                song.timeSignature = fullTune.time_signature || song.timeSignature;
                if (fullTune.accompaniment) {
                    song.accompaniment = fullTune.accompaniment;
                }
            }
        } catch (e) {
            console.warn('[Song] Falha ao carregar partitura da nuvem:', e);
        }
    }
    
    currentSong = song;
    applySongAccompaniment(song);
    lastTransposedState = null;
    if (btnUndoTranspose) btnUndoTranspose.disabled = true;
    
    // Resetar histórico e seleção para a nova música
    undoStack = [];
    redoStack = [];
    clearSelection();
    updateHistoryButtons();
    
    // Atualizar UI com os metadados da música
    songTitleEl.value = song.title;
    songArtistEl.value = song.artist || 'Tradicional';
    whistleKeyEl.value = song.key || 'D';
    if (songTimeSignatureEl) songTimeSignatureEl.value = song.timeSignature || '4/4';
    songTempoEl.value = song.tempo || 110;
    if (songCategoryEl) songCategoryEl.value = song.category || 'celtic';
    if (songDifficultyEl) songDifficultyEl.value = song.difficulty || 'iniciante';
    if (songRhythmEl) songRhythmEl.value = song.rhythm || 'reel';
    
    // Aplicar Modo Somente Leitura se for partitura protegida
    const isReadOnly = isSongReadOnly(song);
    setEditorReadOnlyMode(isReadOnly, song);
    updateVisibilityToggleUI(song.is_public, isReadOnly);

    // Sincronizar URL para a música selecionada (?tune=ID)
    updateUrlForSong(song.id);

    // No modo estúdio, inicia contraído para visualização compacta e partitura despoluída
    collapseEditorHeader();

    // Atualizar banner compacto de leitura
    updateSongDisplayBanner(song);
    
    // Marcar item ativo na barra lateral
    document.querySelectorAll('.song-item').forEach(item => {
        if (item.dataset.id === id) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    renderKeyboard(song.key || 'D');
    updateTextInputHelp(song.key || 'D');
    renderTab();
    updateTextNotesInput();

    // No celular, fecha o menu lateral e esconde o backdrop automaticamente ao selecionar uma música
    if (window.innerWidth <= 860) {
        setMobileSidebarOpen(false);
    }
}

function deleteSong(id, event) {
    if (event) event.stopPropagation();
    
    const song = songs.find(s => s.id === id);
    if (!song) return;
    
    if (song.isCurated) {
        const uIdx = userSongs.findIndex(s => s.id === id);
        if (uIdx !== -1) {
            if (confirm(t('confirms.resetTune', { title: song.title }))) {
                userSongs.splice(uIdx, 1);
                saveUserSongsSafely(userSongs, currentSong ? currentSong.id : null);
                const original = (typeof CURATED_REPERTOIRE !== 'undefined') ? CURATED_REPERTOIRE.find(c => c.id === id) : null;
                if (original) {
                    const idx = songs.findIndex(s => s.id === id);
                    if (idx !== -1) songs[idx] = JSON.parse(JSON.stringify(original));
                }
                renderSidebar();
                selectSong(id);
                showNotificationToast(t('toasts.tuneRestored', { title: song.title }));
            }
            return;
        } else {
            showNotificationToast(t('toasts.curatedReference'));
            return;
        }
    }
    
    if (confirm(t('confirms.deleteTune', { title: song.title }))) {
        stopPlayback();
        userSongs = userSongs.filter(s => s.id !== id);
        songs = songs.filter(s => s.id !== id);
        saveUserSongsSafely(userSongs, currentSong ? currentSong.id : null);
        renderSidebar();
        
        if (currentSong && currentSong.id === id) {
            if (songs.length > 0) {
                selectSong(songs[0].id);
            } else {
                createNewSong();
            }
        }
    }
}

function updateCurrentSongMetadata() {
    if (!currentSong || isCurrentSongReadOnly) return;
    
    currentSong.title = songTitleEl.value || t('editor.untitled');
    currentSong.artist = songArtistEl.value;
    currentSong.key = whistleKeyEl.value;
    if (songTimeSignatureEl) currentSong.timeSignature = songTimeSignatureEl.value;
    currentSong.tempo = parseInt(songTempoEl.value) || 120;
    if (songCategoryEl) currentSong.category = songCategoryEl.value;
    if (songDifficultyEl) currentSong.difficulty = songDifficultyEl.value;
    if (songRhythmEl) currentSong.rhythm = songRhythmEl.value;
    
    invalidateTessituraCache(currentSong);
    updateSongDisplayBanner(currentSong);
    
    // Atualizar na lista
    const idx = songs.findIndex(s => s.id === currentSong.id);
    if (idx !== -1) {
        songs[idx] = currentSong;
        saveSongsToStorage();
        
        // Atualiza apenas o texto na barra lateral para evitar re-render total do DOM durante a digitação
        const sidebarTitle = document.querySelector(`.song-item[data-id="${currentSong.id}"] .song-item-title`);
        if (sidebarTitle) sidebarTitle.textContent = currentSong.title;
        const sidebarMeta = document.querySelector(`.song-item[data-id="${currentSong.id}"] .song-item-meta`);
        if (sidebarMeta) sidebarMeta.textContent = `${currentSong.artist || 'Tradicional'} • ${currentSong.key} • ${currentSong.tempo} BPM`;
    }
}

// -----------------------------------------------------------------------------
// HISTÓRICO: DESFAZER / REFAZER (UNDO / REDO)
// -----------------------------------------------------------------------------
function pushHistoryState(action = '') {
    if (!currentSong) return;
    if (undoStack.length >= maxUndoHistory) {
        undoStack.shift();
    }
    undoStack.push({
        action,
        notes: JSON.parse(JSON.stringify(currentSong.notes)),
        title: currentSong.title,
        artist: currentSong.artist,
        key: currentSong.key,
        timeSignature: currentSong.timeSignature || '4/4',
        tempo: currentSong.tempo
    });
    redoStack = [];
    updateHistoryButtons();
}

function undo() {
    if (undoStack.length === 0 || !currentSong) return;
    redoStack.push({
        notes: JSON.parse(JSON.stringify(currentSong.notes)),
        title: currentSong.title,
        artist: currentSong.artist,
        key: currentSong.key,
        timeSignature: currentSong.timeSignature || '4/4',
        tempo: currentSong.tempo
    });
    const prev = undoStack.pop();
    currentSong.notes = prev.notes;
    currentSong.title = prev.title;
    currentSong.artist = prev.artist;
    currentSong.key = prev.key;
    currentSong.timeSignature = prev.timeSignature || '4/4';
    currentSong.tempo = prev.tempo;
    
    if (songTitleEl) songTitleEl.value = currentSong.title;
    if (songArtistEl) songArtistEl.value = currentSong.artist;
    if (whistleKeyEl) whistleKeyEl.value = currentSong.key;
    if (songTimeSignatureEl) songTimeSignatureEl.value = currentSong.timeSignature;
    if (songTempoEl) songTempoEl.value = currentSong.tempo;

    saveSongsToStorage();
    renderTab();
    updateHistoryButtons();
}

function redo() {
    if (redoStack.length === 0 || !currentSong) return;
    undoStack.push({
        notes: JSON.parse(JSON.stringify(currentSong.notes)),
        title: currentSong.title,
        artist: currentSong.artist,
        key: currentSong.key,
        timeSignature: currentSong.timeSignature || '4/4',
        tempo: currentSong.tempo
    });
    const next = redoStack.pop();
    currentSong.notes = next.notes;
    currentSong.title = next.title;
    currentSong.artist = next.artist;
    currentSong.key = next.key;
    currentSong.timeSignature = next.timeSignature || '4/4';
    currentSong.tempo = next.tempo;
    
    if (songTitleEl) songTitleEl.value = currentSong.title;
    if (songArtistEl) songArtistEl.value = currentSong.artist;
    if (whistleKeyEl) whistleKeyEl.value = currentSong.key;
    if (songTimeSignatureEl) songTimeSignatureEl.value = currentSong.timeSignature;
    if (songTempoEl) songTempoEl.value = currentSong.tempo;

    saveSongsToStorage();
    renderTab();
    updateHistoryButtons();
}

function updateHistoryButtons() {
    if (btnUndo) btnUndo.disabled = (undoStack.length === 0);
    if (btnRedo) btnRedo.disabled = (redoStack.length === 0);
}

// -----------------------------------------------------------------------------
// SELEÇÃO, CLIPBOARD E OPERAÇÕES EM BLOCO
// -----------------------------------------------------------------------------
function selectSingleNote(index) {
    if (!currentSong || index < 0 || index >= currentSong.notes.length) {
        clearSelection();
        return;
    }
    selectedIndices = new Set([index]);
    lastSelectedNoteIndex = index;
    updateSelectionToolbar();
    updateSelectionVisualHighlights();
    
    // Atualizar campo de acorde com o acorde da nota selecionada
    if (keyboardChordInput) {
        keyboardChordInput.value = currentSong.notes[index].chord || '';
    }
}

function selectRangeNotes(startIndex, endIndex) {
    if (!currentSong) return;
    const start = Math.max(0, Math.min(startIndex, endIndex));
    const end = Math.min(currentSong.notes.length - 1, Math.max(startIndex, endIndex));
    selectedIndices.clear();
    for (let i = start; i <= end; i++) {
        selectedIndices.add(i);
    }
    lastSelectedNoteIndex = endIndex;
    updateSelectionToolbar();
    updateSelectionVisualHighlights();
}

function clearSelection() {
    selectedIndices.clear();
    lastSelectedNoteIndex = -1;
    updateSelectionToolbar();
    updateSelectionVisualHighlights();
}

function updateSelectionVisualHighlights() {
    const allCards = tabSheetEl.querySelectorAll('.note-card, .measure-bar-card');
    allCards.forEach(c => {
        const idx = parseInt(c.dataset.index);
        if (selectedIndices.has(idx)) {
            c.classList.add('is-selected');
        } else {
            c.classList.remove('is-selected');
        }
    });
}

function updateSelectionToolbar() {
    const count = selectedIndices.size;
    if (selectionStatusBadge) {
        if (count === 0) {
            selectionStatusBadge.textContent = 'Nenhuma nota selecionada';
            selectionStatusBadge.classList.remove('has-selection');
        } else if (count === 1) {
            const idx = Array.from(selectedIndices)[0];
            const n = currentSong && currentSong.notes[idx];
            let name = n ? (n.note === 'REST' ? 'Pausa' : n.note) : '';
            selectionStatusBadge.textContent = `Nota #${idx + 1} (${name})`;
            selectionStatusBadge.classList.add('has-selection');
        } else {
            selectionStatusBadge.textContent = `${count} notas selecionadas`;
            selectionStatusBadge.classList.add('has-selection');
        }
    }
    if (btnCopySelection) btnCopySelection.disabled = (count === 0);
    if (btnPasteSelection) btnPasteSelection.disabled = isCurrentSongReadOnly || (clipboardNotes.length === 0);
    if (btnDuplicateSelection) btnDuplicateSelection.disabled = isCurrentSongReadOnly || (count === 0);
    if (btnDeleteSelection) btnDeleteSelection.disabled = isCurrentSongReadOnly || (count === 0);
    if (btnLoopSelection) btnLoopSelection.disabled = (count < 2);
    if (btnClearSelection) btnClearSelection.style.display = (count > 0 ? 'inline-flex' : 'none');
}

function copySelection() {
    if (!currentSong || selectedIndices.size === 0) return;
    const sorted = Array.from(selectedIndices).sort((a, b) => a - b);
    clipboardNotes = sorted.map(idx => JSON.parse(JSON.stringify(currentSong.notes[idx])));
    updateSelectionToolbar();
}

function pasteSelection() {
    if (!currentSong || isCurrentSongReadOnly || clipboardNotes.length === 0) return;
    pushHistoryState('Colar Notas');
    let targetIndex = currentSong.notes.length;
    if (selectedIndices.size > 0) {
        targetIndex = Math.max(...Array.from(selectedIndices)) + 1;
    }
    const clones = clipboardNotes.map(n => JSON.parse(JSON.stringify(n)));
    currentSong.notes.splice(targetIndex, 0, ...clones);
    saveSongsToStorage();
    renderTab();
    selectRangeNotes(targetIndex, targetIndex + clones.length - 1);
}

function duplicateSelection() {
    if (!currentSong || isCurrentSongReadOnly || selectedIndices.size === 0) return;
    copySelection();
    pasteSelection();
}

function deleteSelection() {
    if (!currentSong || isCurrentSongReadOnly || selectedIndices.size === 0) return;
    pushHistoryState('Excluir Seleção');
    const sorted = Array.from(selectedIndices).sort((a, b) => b - a);
    sorted.forEach(idx => {
        currentSong.notes.splice(idx, 1);
    });
    clearSelection();
    saveSongsToStorage();
    renderTab();
}

function setPlaybackStartIndex(index) {
    if (!currentSong || index < 0 || index >= currentSong.notes.length) return;
    playbackStartIndex = index;
    currentPlayIndex = index;
    playedRepeatEnds.clear();
    updatePlaybackStartUI();
    
    if (isPlaying) {
        if (playbackTimeout) clearTimeout(playbackTimeout);
        playNextStep();
    }
}

function updatePlaybackStartUI() {
    const cards = tabSheetEl.querySelectorAll('.note-card');
    cards.forEach(card => {
        const cardIndex = parseInt(card.dataset.index);
        if (cardIndex === playbackStartIndex) {
            card.classList.add('playback-start');
        } else {
            card.classList.remove('playback-start');
        }
    });
}

function removeNote(index) {
    if (!currentSong || isCurrentSongReadOnly) return;
    pushHistoryState('Remover Nota');
    currentSong.notes.splice(index, 1);
    if (playbackStartIndex > index) {
        playbackStartIndex--;
    } else if (playbackStartIndex >= currentSong.notes.length) {
        playbackStartIndex = Math.max(0, currentSong.notes.length - 1);
    }
    clearSelection();
    saveSongsToStorage();
    renderTab();
    updateTextNotesInput();
}

// -----------------------------------------------------------------------------
// INSERÇÃO E EDIÇÃO NO MEIO DA MELODIA VIA TECLADO VIRTUAL
// -----------------------------------------------------------------------------
function handleVirtualKeyboardNote(noteName, duration) {
    if (!currentSong) return;
    if (isCurrentSongReadOnly) {
        playSingleNoteSound({ note: noteName });
        return;
    }
    pushHistoryState('Adicionar / Editar Nota');

    const ornamentRadio = document.querySelector('input[name="note-ornament"]:checked');
    const ornament = ornamentRadio ? ornamentRadio.value : '';
    const chord = keyboardChordInput ? keyboardChordInput.value.trim() : '';
    const mode = editInsertionModeEl ? editInsertionModeEl.value : 'replace';

    const newNoteObj = {
        note: noteName,
        duration: duration,
        lyric: '',
        chord: chord,
        ornament: ornament
    };

    if (selectedIndices.size === 1) {
        const targetIdx = Array.from(selectedIndices)[0];
        if (mode === 'replace') {
            const existing = currentSong.notes[targetIdx];
            newNoteObj.lyric = existing.lyric || '';
            if (!chord && existing.chord) newNoteObj.chord = existing.chord;
            if (!ornament && existing.ornament) newNoteObj.ornament = existing.ornament;
            currentSong.notes[targetIdx] = newNoteObj;
            
            // Avança seleção sequencial para a próxima nota (se houver)
            if (targetIdx + 1 < currentSong.notes.length) {
                selectSingleNote(targetIdx + 1);
            } else {
                selectSingleNote(targetIdx);
            }
        } else if (mode === 'insert-after') {
            currentSong.notes.splice(targetIdx + 1, 0, newNoteObj);
            selectSingleNote(targetIdx + 1);
        } else if (mode === 'insert-before') {
            currentSong.notes.splice(targetIdx, 0, newNoteObj);
            selectSingleNote(targetIdx);
        } else {
            currentSong.notes.push(newNoteObj);
            selectSingleNote(currentSong.notes.length - 1);
        }
    } else {
        currentSong.notes.push(newNoteObj);
        selectSingleNote(currentSong.notes.length - 1);
    }

    saveSongsToStorage();
    renderTab();
    playSingleNoteSound(newNoteObj);
}

function appendNote(noteName, duration) {
    handleVirtualKeyboardNote(noteName, duration);
}

function insertMeasureBar(barType) {
    if (!currentSong || isCurrentSongReadOnly) return;
    pushHistoryState('Inserir Barra de Compasso');
    const barObj = { note: barType, duration: 0 };
    let targetIdx = currentSong.notes.length;
    if (selectedIndices.size > 0) {
        targetIdx = Math.max(...Array.from(selectedIndices)) + 1;
    }
    currentSong.notes.splice(targetIdx, 0, barObj);
    saveSongsToStorage();
    renderTab();
    selectSingleNote(targetIdx);
}

function setupEditorToolbar() {
    if (btnUndo) btnUndo.onclick = () => undo();
    if (btnRedo) btnRedo.onclick = () => redo();
    
    if (btnInsertBar) btnInsertBar.onclick = () => insertMeasureBar('BAR');
    if (btnInsertDoubleBar) btnInsertDoubleBar.onclick = () => insertMeasureBar('DOUBLE_BAR');
    if (btnInsertRepeatStart) btnInsertRepeatStart.onclick = () => insertMeasureBar('REPEAT_START');
    if (btnInsertRepeatEnd) btnInsertRepeatEnd.onclick = () => insertMeasureBar('REPEAT_END');
    if (btnInsertLinebreak) btnInsertLinebreak.onclick = () => insertMeasureBar('LINEBREAK');

    if (btnCopySelection) btnCopySelection.onclick = () => copySelection();
    if (btnPasteSelection) btnPasteSelection.onclick = () => pasteSelection();
    if (btnDuplicateSelection) btnDuplicateSelection.onclick = () => duplicateSelection();
    if (btnDeleteSelection) btnDeleteSelection.onclick = () => deleteSelection();
    if (btnLoopSelection) btnLoopSelection.onclick = () => loopSelection();
    if (btnClearSelection) btnClearSelection.onclick = () => clearSelection();

    if (btnApplyChord) {
        btnApplyChord.onclick = () => {
            const chord = keyboardChordInput ? keyboardChordInput.value.trim() : '';
            if (selectedIndices.size > 0 && currentSong) {
                pushHistoryState('Aplicar Acorde');
                selectedIndices.forEach(idx => {
                    if (currentSong.notes[idx]) {
                        currentSong.notes[idx].chord = chord;
                    }
                });
                saveSongsToStorage();
                renderTab();
            }
        };
    }
}

// 6. EVENTOS DA KEYBOARD VIRTUAL
function setupKeyboardTabs() {
    const tabBtns = document.querySelectorAll('.kb-tab-btn');
    const tabContents = document.querySelectorAll('.kb-tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

function setupEditorModeTabs() {
    const textPanel = document.getElementById('mode-text-panel');
    const buttonsPanel = document.getElementById('mode-buttons-panel');
    const btnToggleToText = document.getElementById('btn-toggle-input-mode');
    const btnToggleToKb = document.getElementById('btn-toggle-back-keyboard');
    
    if (btnToggleToText && textPanel && buttonsPanel) {
        btnToggleToText.addEventListener('click', () => {
            buttonsPanel.style.display = 'none';
            textPanel.style.display = 'flex';
            if (typeof updateTextNotesInput === 'function') {
                updateTextNotesInput();
            }
            if (typeof textNotesInputEl !== 'undefined' && textNotesInputEl) {
                textNotesInputEl.focus();
            }
        });
    }

    if (btnToggleToKb && textPanel && buttonsPanel) {
        btnToggleToKb.addEventListener('click', () => {
            textPanel.style.display = 'none';
            buttonsPanel.style.display = 'flex';
        });
    }

    const modeBtns = document.querySelectorAll('.mode-tab-btn');
    if (modeBtns.length && textPanel && buttonsPanel) {
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const mode = btn.dataset.mode;
                if (mode === 'text') {
                    textPanel.style.display = 'flex';
                    buttonsPanel.style.display = 'none';
                    if (typeof textNotesInputEl !== 'undefined' && textNotesInputEl) {
                        textNotesInputEl.focus();
                    }
                } else {
                    textPanel.style.display = 'none';
                    buttonsPanel.style.display = 'flex';
                }
            });
        });
    }
}

function setupNoteInputEvents() {
    const noteBtns = document.querySelectorAll('.note-btn');
    noteBtns.forEach(btn => {
        btn.onclick = () => {
            const noteName = btn.dataset.note;
            const durationEl = document.querySelector('input[name="note-duration"]:checked');
            const duration = durationEl ? (parseFloat(durationEl.value) || 1.0) : 1.0;
            appendNote(noteName, duration);
        };
    });
}

function renderKeyboard(whistleKey) {
    whistleKey = whistleKey || (currentSong ? currentSong.key : 'D') || 'D';
    const keyData = getWhistleKeyData(whistleKey);
    
    const oct1Container = document.querySelector('#octave-1 .note-buttons');
    const oct2Container = document.querySelector('#octave-2 .note-buttons');
    const specialContainer = document.querySelector('#special-notes .note-buttons');
    
    if (!oct1Container || !oct2Container || !specialContainer) return;

    function createMiniFingeringSVG(fingering) {
        const yPositions = [5, 11, 17, 23, 29, 35];
        let circles = '';
        fingering.forEach((state, idx) => {
            const y = yPositions[idx];
            if (state === 1) {
                circles += `<circle cx="5" cy="${y}" r="3" fill="currentColor"/>`;
            } else if (state === 0.5) {
                circles += `<circle cx="5" cy="${y}" r="3" fill="currentColor" opacity="0.6"/>`;
            } else {
                circles += `<circle cx="5" cy="${y}" r="3" stroke="currentColor" fill="none"/>`;
            }
        });
        return `
            <svg class="fingering-mini" viewBox="0 0 10 40" width="10" height="40">
                ${circles}
            </svg>
        `;
    }

    // 1ª Oitava
    oct1Container.innerHTML = keyData.orderOct1.map(noteId => {
        const n = keyData.notes[noteId];
        return `
            <button class="note-btn" data-note="${noteId}">
                <span class="note-name">${n.name}</span>
                ${createMiniFingeringSVG(n.fingering)}
            </button>
        `;
    }).join('');

    // 2ª Oitava
    oct2Container.innerHTML = keyData.orderOct2.map(noteId => {
        const n = keyData.notes[noteId];
        return `
            <button class="note-btn octave2" data-note="${noteId}">
                <span class="note-name">${n.name}</span>
                ${createMiniFingeringSVG(n.fingering)}
            </button>
        `;
    }).join('');

    // Especiais & Pausa
    const specialsHtml = keyData.orderSpecials.map(noteId => {
        const n = keyData.notes[noteId];
        const isOct2 = n.octave2 ? ' octave2' : '';
        return `
            <button class="note-btn${isOct2}" data-note="${noteId}">
                <span class="note-name">${n.name}</span>
                ${createMiniFingeringSVG(n.fingering)}
            </button>
        `;
    }).join('');

    specialContainer.innerHTML = `
        ${specialsHtml}
        <button class="note-btn special" data-note="REST">
            <span class="note-name">𝄾 Pausa</span>
            <span class="note-symbol-big">Rest</span>
        </button>
    `;

    setupNoteInputEvents();
}

// 7. SINTETIZADOR DE ÁUDIO (WEB AUDIO API)
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    getOrCreateNoiseBuffer(audioCtx);
}

// Toca uma única nota isoladamente
function playSingleNoteSound(noteObj) {
    if (!noteObj || ['LINEBREAK', 'BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END'].includes(noteObj.note)) return;
    try {
        initAudio();
        const key = whistleKeyEl ? whistleKeyEl.value : 'D';
        const freq = getTransposedFrequency(noteObj.note, key);
        if (freq > 0) {
            playWhistleSynth(freq, 0.4, audioCtx.currentTime, noteObj.ornament, noteObj.note, key, !!noteObj.slur);
        }
    } catch (e) {
        console.error("Falha ao tocar áudio: ", e);
    }
}

// O sintetizador que cria a assinatura sonora da Tin Whistle celta com suporte a ornamentos diatônicos e ligaduras
function playWhistleSynth(frequency, duration, startTime, ornament = null, noteKey = null, whistleKey = 'D', isSlurred = false) {
    scheduleWhistleVoice(audioCtx, frequency, duration, startTime, ornament, noteKey, whistleKey, isSlurred);
}

// Som do metrônomo para manter o tempo (com acento diferenciado no tempo forte do compasso)
function playMetronomeClick(startTime, isDownbeat = false) {
    playMetronomeClickOnContext(audioCtx, startTime, isDownbeat);
}

// 8. CONTROLES DO SEQUENCIADOR (PLAY/PAUSE/STOP)
function togglePlay() {
    if (isPlaying) {
        pausePlayback();
    } else {
        // Verificar se deve acionar o Count-in de 1 compasso antes de iniciar (apenas no Modo Prática)
        const startTarget = (isLoopActive && loopAIndex >= 0) ? loopAIndex : playbackStartIndex;
        const atBeginning = (currentPlayIndex === -1 || currentPlayIndex === 0 || currentPlayIndex === startTarget);
        if (currentAppMode === 'practice' && toggleCountIn && toggleCountIn.checked && atBeginning && !isCountingIn) {
            startCountIn();
        } else {
            startPlayback();
        }
    }
}

function startPlayback() {
    if (!currentSong || currentSong.notes.length === 0) return;

    if (currentAppMode === 'practice' && window.innerWidth <= 860 && practiceController && typeof practiceController.setPracticeToolbarCollapsed === 'function') {
        practiceController.setPracticeToolbarCollapsed(true);
    }

    initAudio();
    isPlaying = true;
    playedRepeatEnds.clear();
    playbackMeasureBeatPos = 0;
    playbackExpectedTimeMs = performance.now();
    requestScreenWakeLock(false);
    
    // Atualizar UI
    btnPlay.querySelector('.icon-play').style.display = 'none';
    btnPlay.querySelector('.icon-pause').style.display = 'block';
    
    // Definir índice inicial respeitando Loop A-B ou ponto de início
    if (currentPlayIndex === -1 || currentPlayIndex >= currentSong.notes.length) {
        if (isLoopActive && loopAIndex >= 0 && loopAIndex < currentSong.notes.length) {
            currentPlayIndex = loopAIndex;
        } else {
            currentPlayIndex = (playbackStartIndex >= 0 && playbackStartIndex < currentSong.notes.length) ? playbackStartIndex : 0;
        }
    }
    
    playNextStep();
}

function pausePlayback() {
    isPlaying = false;
    cancelCountIn();
    if (playbackTimeout) clearTimeout(playbackTimeout);
    releaseScreenWakeLock(false);
    
    // Atualizar UI
    btnPlay.querySelector('.icon-play').style.display = 'block';
    btnPlay.querySelector('.icon-pause').style.display = 'none';
}

function stopPlayback() {
    isPlaying = false;
    playedRepeatEnds.clear();
    playbackMeasureBeatPos = 0;
    cancelCountIn();
    if (playbackTimeout) clearTimeout(playbackTimeout);
    releaseScreenWakeLock(false);
    
    if (isLoopActive && loopAIndex >= 0 && loopAIndex < currentSong.notes.length) {
        currentPlayIndex = loopAIndex;
    } else {
        currentPlayIndex = (playbackStartIndex >= 0 && currentSong && playbackStartIndex < currentSong.notes.length) ? playbackStartIndex : 0;
    }
    
    // Atualizar UI
    btnPlay.querySelector('.icon-play').style.display = 'block';
    btnPlay.querySelector('.icon-pause').style.display = 'none';
    
    // Remover destaque de reprodução em O(1)
    tabRenderer.clearActivePlayingNote();
}

function playNextStep() {
    if (!isPlaying || !currentSong) return;
    
    const notesCount = currentSong.notes.length;
    
    // Verificação e controle de Loop A-B
    if (isLoopActive && loopAIndex >= 0 && loopBIndex >= 0) {
        const loopStart = Math.min(loopAIndex, loopBIndex);
        const loopEnd = Math.max(loopAIndex, loopBIndex);
        
        if (currentPlayIndex < loopStart) {
            currentPlayIndex = loopStart;
            playbackMeasureBeatPos = 0;
        } else if (currentPlayIndex > loopEnd) {
            // Ciclo completo do trecho em loop atingido!
            loopCycleCount++;
            if (trainerCycleBadge) {
                trainerCycleBadge.textContent = `Ciclo #${loopCycleCount}`;
            }
            
            // Aceleração automática do Speed Trainer
            if (toggleSpeedTrainer && toggleSpeedTrainer.checked) {
                const currentBpm = parseInt(songTempoEl.value) || 120;
                const step = parseInt(speedTrainerStepEl ? speedTrainerStepEl.value : 4) || 4;
                const newBpm = Math.min(260, currentBpm + step);
                songTempoEl.value = newBpm;
                updateCurrentSongMetadata();
                if (trainerCycleBadge) {
                    trainerCycleBadge.textContent = `Ciclo #${loopCycleCount} (${newBpm} BPM)`;
                }
            }
            
            currentPlayIndex = loopStart;
            playedRepeatEnds.clear();
            playbackMeasureBeatPos = 0;
        }
    }
    
    if (currentPlayIndex >= notesCount) {
        stopPlayback();
        if (sidebarController.getIsSetModeActive()) {
            advanceToNextSetTune();
        }
        return;
    }
    
    const noteObj = currentSong.notes[currentPlayIndex];
    
    // Tratamento de Quebras de Linha e Barras Simples / Início de Repetição (avanço instantâneo)
    if (noteObj.note === 'LINEBREAK' || noteObj.note === 'BAR' || noteObj.note === 'DOUBLE_BAR' || noteObj.note === 'REPEAT_START') {
        if (noteObj.note !== 'LINEBREAK') {
            playbackMeasureBeatPos = 0; // Barra de compasso alinha o tempo 1 do próximo compasso
        }
        currentPlayIndex++;
        playNextStep();
        return;
    }

    // Tratamento de Fim de Repetição (:|) com suporte a ritornelos múltiplos (AABB / AABBCC)
    if (noteObj.note === 'REPEAT_END') {
        playbackMeasureBeatPos = 0;
        if (!playedRepeatEnds.has(currentPlayIndex)) {
            playedRepeatEnds.add(currentPlayIndex);
            // Procurar último REPEAT_START anterior ou início da seção correspondente
            let repeatTarget = 0;
            for (let i = currentPlayIndex - 1; i >= 0; i--) {
                if (currentSong.notes[i].note === 'REPEAT_START' || currentSong.notes[i].note === 'REPEAT_END') {
                    repeatTarget = i + 1;
                    break;
                }
            }
            currentPlayIndex = repeatTarget;
            playNextStep();
            return;
        } else {
            currentPlayIndex++;
            playNextStep();
            return;
        }
    }

    const bpm = parseInt(songTempoEl.value) || 120;
    const speedMultiplier = parseFloat(playSpeedSelect.value) || 1.0;
    
    const beatDuration = (60 / bpm) / speedMultiplier;
    const noteBeats = parseFloat(noteObj.duration) || 1.0;
    const realDuration = noteBeats * beatDuration;
    
    // Destacar nota visualmente em O(1)
    tabRenderer.setActivePlayingNoteIndex(currentPlayIndex);
    
    // Tocar Áudio da Flauta (com ornamentos diatônicos e ligaduras autênticas)
    const now = audioCtx.currentTime;
    const freq = getTransposedFrequency(noteObj.note, whistleKeyEl.value);
    const whistleVol = backingSettings.whistleVolume !== undefined ? backingSettings.whistleVolume : 1.0;
    
    if (freq > 0 && whistleVol > 0.001) {
        playWhistleSynth(freq, realDuration * 0.95, now, noteObj.ornament, noteObj.note, whistleKeyEl.value, !!noteObj.slur);
    }

    // Metrônomo inteligente baseado nos pulsos reais do compasso
    const timeSig = songTimeSignatureEl ? songTimeSignatureEl.value : (currentSong.timeSignature || '4/4');
    const beatsPerBar = getMeasureBeatsPerBar(timeSig);
    const startBeat = playbackMeasureBeatPos;
    const endBeat = startBeat + noteBeats;

    if (toggleMetronome && toggleMetronome.checked) {
        const firstPulse = Math.ceil(startBeat - 1e-6);
        for (let b = firstPulse; b < endBeat - 1e-6; b++) {
            const offsetBeats = Math.max(0, b - startBeat);
            const clickTime = now + (offsetBeats * beatDuration);
            const isDownbeat = (Math.abs(b % beatsPerBar) < 1e-4);
            playMetronomeClick(clickTime, isDownbeat);
        }
    }

    // Agendamento de Acompanhamento Celta (Bodhrán & Violão DADGAD / Bouzouki com Groove Contínuo e Swing - Fase 12)
    const effectiveRhythm = (backingSettings.rhythmStyle && backingSettings.rhythmStyle !== 'auto')
        ? backingSettings.rhythmStyle
        : (currentSong ? (currentSong.rhythm || currentSong.timeSignature || 'reel') : 'reel');

    scheduleBackingTrackStep(audioCtx, noteObj, now, realDuration, bpm, startBeat, beatsPerBar, {
        bodhranActive: backingSettings.bodhranActive,
        bodhranVolume: backingSettings.bodhranVolume,
        guitarActive: backingSettings.guitarActive,
        guitarVolume: backingSettings.guitarVolume,
        guitarInstrument: backingSettings.guitarInstrument,
        rhythmStyle: effectiveRhythm,
        swing: backingSettings.swing || 'straight',
        songKey: whistleKeyEl ? whistleKeyEl.value : (currentSong ? currentSong.key : 'D')
    });

    playbackMeasureBeatPos = endBeat % beatsPerBar;
    
    // Agendar próximo passo com compensação de drift temporal
    currentPlayIndex++;
    const nowMs = performance.now();
    if (!playbackExpectedTimeMs || nowMs - playbackExpectedTimeMs > 250) {
        playbackExpectedTimeMs = nowMs;
    }
    playbackExpectedTimeMs += realDuration * 1000;
    const nextDelayMs = Math.max(10, playbackExpectedTimeMs - nowMs);
    playbackTimeout = setTimeout(playNextStep, nextDelayMs);
}

// 9. CONFIGURAÇÃO DE ATALHOS & EVENTOS DE UI
function setupEventListeners() {
    // Ações de Gravação e Metadados
    songTitleEl.addEventListener('input', updateCurrentSongMetadata);
    songArtistEl.addEventListener('input', updateCurrentSongMetadata);
    const handleWhistleKeyChange = () => {
        updateCurrentSongMetadata();
        const key = whistleKeyEl.value;
        renderKeyboard(key);
        renderTab();
        updateTextNotesInput();
        updateTextInputHelp(key);
    };
    whistleKeyEl.addEventListener('change', handleWhistleKeyChange);
    whistleKeyEl.addEventListener('input', handleWhistleKeyChange);
    songTempoEl.addEventListener('input', updateCurrentSongMetadata);
    if (songTimeSignatureEl) {
        songTimeSignatureEl.addEventListener('change', updateCurrentSongMetadata);
    }
    if (songCategoryEl) {
        songCategoryEl.addEventListener('change', () => {
            updateCurrentSongMetadata();
            renderSidebar();
        });
    }
    if (songDifficultyEl) {
        songDifficultyEl.addEventListener('change', () => {
            updateCurrentSongMetadata();
            renderSidebar();
        });
    }
    if (songRhythmEl) {
        songRhythmEl.addEventListener('change', () => {
            updateCurrentSongMetadata();
            renderSidebar();
        });
    }
    
    btnNewSong.addEventListener('click', createNewSong);
    if (btnSaveSong) {
        btnSaveSong.addEventListener('click', () => {
            updateCurrentSongMetadata();
            showNotificationToast(t('toasts.savedLocal'));
        });
    }
    
    // Barra de Pesquisa (com debounce de 150ms para suavizar filtragem)
    searchInput.addEventListener('input', debounce(() => renderSidebar(), 150));
    
    // Controles de Playback
    btnPlay.addEventListener('click', togglePlay);
    btnStop.addEventListener('click', () => {
        if (!isPlaying && currentPlayIndex === playbackStartIndex && playbackStartIndex !== 0) {
            setPlaybackStartIndex(0);
        } else {
            stopPlayback();
        }
    });
    btnClearTab.addEventListener('click', () => {
        if (isCurrentSongReadOnly) return;
        if (currentSong && currentSong.notes.length > 0) {
            if (confirm(t('confirms.clearNotes'))) {
                pushHistoryState(t('practice.clearAll'));
                currentSong.notes = [];
                playbackStartIndex = 0;
                stopPlayback();
                saveSongsToStorage();
                renderTab();
            }
        }
    });

    // Fechar sidebar ao selecionar música no mobile
    songListEl.addEventListener('click', () => {
        if (window.innerWidth <= 860) {
            setMobileSidebarOpen(false);
        }
    });

    
    // Ajuda e Modais
    btnHelp.addEventListener('click', () => helpModal.classList.add('open'));
    btnCloseModal.addEventListener('click', () => helpModal.classList.remove('open'));
    btnCloseModalOk.addEventListener('click', () => helpModal.classList.remove('open'));
    
    // Fecha o modal ao clicar fora dele
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.classList.remove('open');
        }
    });
    
    // Importação e Exportação
    if (btnExportJson) btnExportJson.addEventListener('click', exportCurrentSongJSON);
    if (btnExportAll) btnExportAll.addEventListener('click', exportAllSongsJSON);
    if (importFileEl) importFileEl.addEventListener('change', importSongsJSON);
    
    // Entrada de Notas por Texto
    if (textNotesInputEl) {
        textNotesInputEl.addEventListener('input', handleTextNotesInput);
        textNotesInputEl.addEventListener('blur', () => {
            if (currentSong) {
                // Ao perder o foco, normaliza o valor exibido preservando durações, cifras e ornamentos
                const whistleKey = whistleKeyEl ? whistleKeyEl.value : (currentSong.key || 'D');
                textNotesInputEl.value = currentSong.notes.map(n => noteObjToNotation(n, whistleKey)).join('');
                textNotesInputEl.classList.remove('invalid');
                textNotesErrorEl.style.display = 'none';
                textNotesErrorEl.textContent = '';
            }
        });
        textNotesInputEl.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });
    }

    // Impressão
    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            stopPlayback();
            triggerPrintTab();
        });
    }

    // Compasso
    if (songTimeSignatureEl) {
        songTimeSignatureEl.addEventListener('change', updateCurrentSongMetadata);
    }

    // Atalhos do Teclado Global
    document.addEventListener('keydown', (e) => {
        // Se estiver em input ou textarea
        const inInput = (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA');

        // Ctrl+Z (Desfazer)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
            if (!inInput) {
                e.preventDefault();
                undo();
                return;
            }
        }

        // Ctrl+Y ou Ctrl+Shift+Z (Refazer)
        if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || 
            ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
            if (!inInput) {
                e.preventDefault();
                redo();
                return;
            }
        }

        // Ignorar demais atalhos se o usuário estiver digitando em campo de texto
        if (inInput) return;
        
        // Ctrl+C (Copiar)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
            e.preventDefault();
            copySelection();
            return;
        }

        // Ctrl+V (Colar)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
            e.preventDefault();
            pasteSelection();
            return;
        }

        // Delete ou Backspace (Excluir Notas Selecionadas)
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedIndices.size > 0) {
                e.preventDefault();
                deleteSelection();
                return;
            }
        }

        // Seta Direita (Avançar Seleção)
        if (e.key === 'ArrowRight' && currentSong) {
            e.preventDefault();
            if (selectedIndices.size > 0) {
                const current = Math.max(...Array.from(selectedIndices));
                if (current + 1 < currentSong.notes.length) {
                    selectSingleNote(current + 1);
                }
            } else if (currentSong.notes.length > 0) {
                selectSingleNote(0);
            }
            return;
        }

        // Seta Esquerda (Retroceder Seleção)
        if (e.key === 'ArrowLeft' && currentSong) {
            e.preventDefault();
            if (selectedIndices.size > 0) {
                const current = Math.min(...Array.from(selectedIndices));
                if (current - 1 >= 0) {
                    selectSingleNote(current - 1);
                }
            } else if (currentSong.notes.length > 0) {
                selectSingleNote(currentSong.notes.length - 1);
            }
            return;
        }

        if (e.code === 'Space') {
            e.preventDefault();
            togglePlay();
        } else if (e.code === 'Escape') {
            clearSelection();
            stopPlayback();
        }
    });
}

// 10. IMPORTAÇÃO E EXPORTAÇÃO JSON
function exportCurrentSongJSON() {
    if (!currentSong) return;
    updateCurrentSongMetadata();
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentSong, null, 4));
    const downloadAnchor = document.createElement('a');
    
    // Nome do arquivo baseado no título da música
    const sanitizedTitle = currentSong.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `tab_${sanitizedTitle}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function exportAllSongsJSON() {
    if (songs.length === 0) return;
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(songs, null, 4));
    const downloadAnchor = document.createElement('a');
    
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `celtic_whistle_tabs_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function normalizeImportedSong(raw) {
    const newId = generateRandomTuneId(8);
    const bardAuthor = currentBard 
        ? (currentBard.displayName || currentBard.display_name || currentBard.username) 
        : (raw.author_name || raw.artist || 'Compositor');

    const acc = raw.accompaniment ? JSON.parse(JSON.stringify(raw.accompaniment)) : {};
    delete acc.droneActive;
    delete acc.droneVolume;

    const tuneKey = (raw.key || raw.whistleKey || 'D').toUpperCase().trim();
    let importedNotes = [];
    if (Array.isArray(raw.notes) && raw.notes.length > 0) {
        importedNotes = raw.notes;
    } else if (typeof raw.notes === 'string' && raw.notes.trim()) {
        const parsed = parseStringOfNotesForKey(raw.notes, tuneKey);
        importedNotes = parsed.notes || [];
    } else if (typeof raw.notesRaw === 'string' && raw.notesRaw.trim()) {
        const parsed = parseStringOfNotesForKey(raw.notesRaw, tuneKey);
        importedNotes = parsed.notes || [];
    }

    const imported = {
        id: newId,
        title: (raw.title || 'Música Importada').trim(),
        artist: (raw.artist || bardAuthor).trim(),
        category: raw.category || 'celtic',
        difficulty: raw.difficulty || 'iniciante',
        rhythm: raw.rhythm || 'reel',
        key: tuneKey,
        timeSignature: raw.timeSignature || raw.time_signature || '4/4',
        tempo: Math.min(280, Math.max(40, parseInt(raw.tempo || raw.bpm, 10) || 110)),
        isCurated: false,
        isCommunity: false,
        isCloud: false,
        is_public: 0,
        syncStatus: 'pending',
        accompaniment: {
            metronomeActive: Boolean(acc.metronomeActive),
            bodhranActive: Boolean(acc.bodhranActive),
            bodhranVolume: acc.bodhranVolume !== undefined ? Number(acc.bodhranVolume) : 0.75,
            guitarActive: Boolean(acc.guitarActive),
            guitarVolume: acc.guitarVolume !== undefined ? Number(acc.guitarVolume) : 0.65,
            guitarInstrument: acc.guitarInstrument || 'dadgad',
            rhythmStyle: acc.rhythmStyle || 'auto',
            whistleVolume: acc.whistleVolume !== undefined ? Number(acc.whistleVolume) : 1.0
        },
        notes: importedNotes
    };

    return imported;
}

async function syncImportedSongToCloud(song) {
    if (!currentBard) return;
    try {
        const res = await fetch('/api/tunes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                id: song.id,
                title: song.title,
                artist: song.artist,
                key: song.key,
                tempo: song.tempo,
                timeSignature: song.timeSignature,
                category: song.category,
                difficulty: song.difficulty,
                rhythm: song.rhythm,
                notes: song.notes,
                accompaniment: song.accompaniment,
                is_public: 0
            })
        });
        if (res.ok) {
            song.isCloud = true;
            song.syncStatus = 'synced';
            const uIdx = userSongs.findIndex(s => s.id === song.id);
            if (uIdx !== -1) {
                userSongs[uIdx].isCloud = true;
                userSongs[uIdx].syncStatus = 'synced';
            }
            const sIdx = songs.findIndex(s => s.id === song.id);
            if (sIdx !== -1) {
                songs[sIdx].isCloud = true;
                songs[sIdx].syncStatus = 'synced';
            }
            if (currentSong && currentSong.id === song.id) {
                currentSong.isCloud = true;
                currentSong.syncStatus = 'synced';
            }
            saveSongsToStorage();
            updateOfflineSyncIndicator();
            renderSidebar();
            console.log('[Import Sync] Sincronizado com sucesso na nuvem:', song.id);
        } else {
            console.warn('[Import Sync] Falha HTTP ao sincronizar:', res.status, await res.text());
        }
    } catch (e) {
        console.warn('[Import Sync] Erro ao sincronizar música importada na nuvem:', e);
    }
}

function importSongsJSON(event) {
    console.log('[Import] importSongsJSON acionado. Arquivos:', event.target?.files?.length);
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            
            if (Array.isArray(parsed)) {
                // Importar várias músicas
                if (confirm(t('confirms.importCount', { count: parsed.length }))) {
                    const importedList = [];
                    parsed.forEach(rawSong => {
                        const song = normalizeImportedSong(rawSong);
                        userSongs.unshift(song);
                        songs.unshift(song);
                        importedList.push(song);
                    });
                    saveSongsToStorage();
                    renderSidebar();
                    if (importedList.length > 0) {
                        selectSong(importedList[0].id);
                        for (const s of importedList) {
                            await syncImportedSongToCloud(s);
                        }
                    }
                }
            } else if (parsed && parsed.title) {
                // Importar uma única música
                const song = normalizeImportedSong(parsed);
                userSongs.unshift(song);
                songs.unshift(song);
                saveSongsToStorage();
                renderSidebar();
                selectSong(song.id);
                await syncImportedSongToCloud(song);
                showNotificationToast(t('toasts.songImported', { title: song.title }));
            } else {
                showNotificationToast(t('toasts.invalidJson'));
            }
        } catch (err) {
            showNotificationToast(t('toasts.jsonReadError', { error: err.message }));
        }
    };
    reader.readAsText(file);
    // Limpar o valor do input para permitir carregar o mesmo arquivo novamente
    event.target.value = '';
}

// 12. PARSER E SINCRONIZAÇÃO DE NOTAS POR TEXTO
function parseStringOfNotes(text) {
    const whistleKey = whistleKeyEl ? whistleKeyEl.value : (currentSong ? currentSong.key : 'D') || 'D';
    return parseStringOfNotesForKey(text, whistleKey);
}

function updateTextNotesInput() {
    if (!textNotesInputEl || !currentSong) return;
    if (document.activeElement === textNotesInputEl) return;
    
    const whistleKey = whistleKeyEl ? whistleKeyEl.value : (currentSong.key || 'D');
    const textValue = currentSong.notes.map(n => noteObjToNotation(n, whistleKey)).join('');
    textNotesInputEl.value = textValue;
    
    textNotesInputEl.classList.remove('invalid');
    textNotesErrorEl.style.display = 'none';
    textNotesErrorEl.textContent = '';
}

let textNotesDebounceTimer = null;
let lastTextEditUndoTime = 0;

function handleTextNotesInput() {
    if (!currentSong || isCurrentSongReadOnly) return;

    if (textNotesDebounceTimer) {
        clearTimeout(textNotesDebounceTimer);
    }

    textNotesDebounceTimer = setTimeout(() => {
        if (!currentSong) return;
        const text = textNotesInputEl.value;
        const parseResult = parseStringOfNotes(text);
        
        if (parseResult.error) {
            textNotesInputEl.classList.add('invalid');
            textNotesErrorEl.style.display = 'block';
            textNotesErrorEl.textContent = parseResult.errorKey
                ? t(parseResult.errorKey, parseResult.errorParams || {})
                : parseResult.error;
            return;
        }
        
        textNotesInputEl.classList.remove('invalid');
        textNotesErrorEl.style.display = 'none';
        textNotesErrorEl.textContent = '';
        
        const parsedNotes = parseResult.notes;
        
        // Agrupa snapshots de Undo quando o usuário digita continuamente (< 1.2s entre teclas)
        const now = Date.now();
        if (now - lastTextEditUndoTime > 1200) {
            pushHistoryState('Editar por Texto');
        }
        lastTextEditUndoTime = now;

        const oldNotes = currentSong.notes;
        const newNotes = parsedNotes.map((newObj, idx) => {
            const oldNote = oldNotes[idx];
            if (oldNote && oldNote.note === newObj.note) {
                return {
                    ...oldNote,
                    duration: newObj.duration || oldNote.duration,
                    chord: newObj.chord || oldNote.chord,
                    ornament: newObj.ornament !== undefined ? newObj.ornament : oldNote.ornament
                };
            }
            return newObj;
        });
        
        currentSong.notes = newNotes;
        saveSongsToStorage();
        renderTab();
    }, 150);
}

// ==========================================================================
// 13. FERRAMENTA DE TRANSPOSIÇÃO DE TOM & FLAUTA
// ==========================================================================

let lastTransposedState = null;

function updateFluteConvertPreview() {
    if (!fluteConvertPreview || !transposeFromKeyEl || !transposeToKeyEl) return;
    const fromKey = transposeFromKeyEl.value;
    const toKey = transposeToKeyEl.value;
    const toKeyLabel = escapeHTML(t(`whistleKeys.${toKey}`) || getWhistleKeyData(toKey).name);

    if (fromKey === toKey) {
        fluteConvertPreview.innerHTML = `
            <div class="preview-item">
                <span>${escapeHTML(t('transpose.sameFlutesPreview'))}</span>
            </div>
        `;
        return;
    }

    const delta = calculateWhistleKeyDelta(fromKey, toKey);
    const sign = delta > 0 ? `+${delta}` : `${delta}`;
    const desc = delta > 0
        ? t('transpose.semitonesAbove', { count: delta })
        : t('transpose.semitonesBelow', { count: Math.abs(delta) });

    fluteConvertPreview.innerHTML = `
        <div class="preview-item">
            <strong>${escapeHTML(t('transpose.diffLabel'))}</strong> ${escapeHTML(sign)} (${escapeHTML(desc)}).
        </div>
        <div class="preview-explanation">
            ${t('transpose.convertExplainHtml', { to: toKeyLabel, sign: escapeHTML(sign) })}
        </div>
    `;
}

function showTransposeFeedback(msg, type = 'success') {
    if (!transposeFeedback) return;
    transposeFeedback.className = `transpose-feedback ${type}`;
    transposeFeedback.textContent = msg;
    transposeFeedback.style.display = 'block';
}

function clearTransposeFeedback() {
    if (!transposeFeedback) return;
    transposeFeedback.style.display = 'none';
    transposeFeedback.textContent = '';
}

function transposeCurrentSong(semitonesDelta, newKey = null, autoFold = true) {
    if (!currentSong || !currentSong.notes || currentSong.notes.length === 0) {
        showTransposeFeedback(t('transpose.emptyTab'), 'warning');
        return false;
    }

    if (semitonesDelta === 0 && (!newKey || newKey === currentSong.key)) {
        showTransposeFeedback(t('transpose.noChangeNeeded'), 'info');
        return false;
    }

    // Salvar estado anterior para desfazer
    lastTransposedState = {
        notes: JSON.parse(JSON.stringify(currentSong.notes)),
        key: currentSong.key || (whistleKeyEl ? whistleKeyEl.value : 'D') || 'D'
    };
    if (btnUndoTranspose) btnUndoTranspose.disabled = false;

    let adjustedCount = 0;
    let approxCount = 0;
    let modifiedNotesCount = 0;

    const DIATONIC_SEMITONES = [0, 2, 4, 5, 7, 9, 10, 11, 12, 14, 16, 17, 19, 21, 22, 23];

    currentSong.notes = currentSong.notes.map(noteItem => {
        if (!noteItem || noteItem.note === 'REST' || noteItem.note === 'LINEBREAK') {
            return noteItem;
        }

        const currSemitone = NOTE_TO_SEMITONES[noteItem.note];
        if (currSemitone === undefined) {
            return noteItem;
        }

        let targetSemitone = currSemitone + semitonesDelta;

        if (autoFold) {
            while (targetSemitone < 0) {
                targetSemitone += 12;
                adjustedCount++;
            }
            while (targetSemitone > 23) {
                targetSemitone -= 12;
                adjustedCount++;
            }
        } else {
            if (targetSemitone < 0) { targetSemitone = 0; adjustedCount++; }
            if (targetSemitone > 23) { targetSemitone = 23; adjustedCount++; }
        }

        if (!DIATONIC_SEMITONES.includes(targetSemitone)) {
            approxCount++;
        }

        const newNoteName = SEMITONES_TO_NOTE[targetSemitone] || 'D5';
        modifiedNotesCount++;

        return {
            ...noteItem,
            note: newNoteName,
            fingering: [...(STANDARD_FINGERINGS[newNoteName] || [0, 0, 0, 0, 0, 0])]
        };
    });

    if (newKey) {
        currentSong.key = newKey;
        if (whistleKeyEl) whistleKeyEl.value = newKey;
        if (transposeFromKeyEl) transposeFromKeyEl.value = newKey;
        renderKeyboard(newKey);
        updateTextInputHelp(newKey);
    }

    saveSongsToStorage();
    renderTab();
    updateTextNotesInput();

    let msg = t('transpose.appliedSuccess', { count: modifiedNotesCount });
    if (newKey) {
        const keyLabel = t(`whistleKeys.${newKey}`) || getWhistleKeyData(newKey).name;
        msg = t('transpose.fluteAdaptedSuccess', { key: keyLabel });
    }
    if (adjustedCount > 0) {
        msg += t('transpose.octaveAdjustedSuffix', { count: adjustedCount });
    }
    if (approxCount > 0) {
        msg += t('transpose.chromaticApproxSuffix', { count: approxCount });
    }
    showTransposeFeedback(msg, 'success');
    return true;
}

function undoTranspose() {
    if (!lastTransposedState || !currentSong) return;
    currentSong.notes = JSON.parse(JSON.stringify(lastTransposedState.notes));
    const prevKey = lastTransposedState.key || 'D';
    if (currentSong.key !== prevKey) {
        currentSong.key = prevKey;
        if (whistleKeyEl) whistleKeyEl.value = prevKey;
        if (transposeFromKeyEl) transposeFromKeyEl.value = prevKey;
        renderKeyboard(prevKey);
        updateTextInputHelp(prevKey);
    }
    saveSongsToStorage();
    renderTab();
    updateTextNotesInput();
    lastTransposedState = null;
    if (btnUndoTranspose) btnUndoTranspose.disabled = true;
    showTransposeFeedback(t('transpose.revertedSuccess'), 'info');
}

function openTransposeModal() {
    clearTransposeFeedback();
    const currentKey = currentSong ? (currentSong.key || 'D') : (whistleKeyEl ? whistleKeyEl.value : 'D');
    if (transposeFromKeyEl) transposeFromKeyEl.value = currentKey;
    if (transposeToKeyEl && transposeToKeyEl.value === currentKey) {
        transposeToKeyEl.value = currentKey === 'D' ? 'C' : 'D';
    }
    updateFluteConvertPreview();
    if (transposeModal) transposeModal.classList.add('open');
}

function closeTransposeModal() {
    if (transposeModal) transposeModal.classList.remove('open');
}

function setupTransposeModal() {
    if (!btnOpenTranspose || !transposeModal) return;

    btnOpenTranspose.addEventListener('click', openTransposeModal);
    if (btnCloseTranspose) btnCloseTranspose.addEventListener('click', closeTransposeModal);
    if (btnCloseTransposeDone) btnCloseTransposeDone.addEventListener('click', closeTransposeModal);

    transposeModal.addEventListener('click', (e) => {
        if (e.target === transposeModal) {
            closeTransposeModal();
        }
    });

    // Abas do Modal de Transposição
    const modalTabBtns = transposeModal.querySelectorAll('.transpose-tab-btn');
    modalTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modalTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.dataset.tab;
            const panels = transposeModal.querySelectorAll('.transpose-tab-panel');
            panels.forEach(panel => {
                panel.style.display = (panel.id === targetId) ? 'flex' : 'none';
            });
            clearTransposeFeedback();
        });
    });

    // Mudança de flautas
    if (transposeFromKeyEl) transposeFromKeyEl.addEventListener('change', updateFluteConvertPreview);
    if (transposeToKeyEl) transposeToKeyEl.addEventListener('change', updateFluteConvertPreview);

    // Botão Converter Flauta
    if (btnApplyFluteTranspose) {
        btnApplyFluteTranspose.addEventListener('click', () => {
            const fromKey = transposeFromKeyEl.value;
            const toKey = transposeToKeyEl.value;
            if (fromKey === toKey) {
                showTransposeFeedback(t('transpose.sameFlutesError'), 'warning');
                return;
            }
            const autoFold = chkFluteAutofold ? chkFluteAutofold.checked : true;
            const delta = calculateWhistleKeyDelta(fromKey, toKey);
            transposeCurrentSong(delta, toKey, autoFold);
        });
    }

    // Botões rápidos de transposição (+1, -1, +2, -2, +12, -12)
    const quickButtons = transposeModal.querySelectorAll('.btn-quick-trans');
    quickButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const semitones = parseInt(btn.dataset.semitones, 10);
            const autoFold = chkPitchAutofold ? chkPitchAutofold.checked : true;
            transposeCurrentSong(semitones, null, autoFold);
        });
    });

    // Botão aplicar semitons personalizados
    if (btnApplyCustomSemitones && customSemitonesSelect) {
        btnApplyCustomSemitones.addEventListener('click', () => {
            const semitones = parseInt(customSemitonesSelect.value, 10);
            const autoFold = chkPitchAutofold ? chkPitchAutofold.checked : true;
            transposeCurrentSong(semitones, null, autoFold);
        });
    }

    // Botão Desfazer
    if (btnUndoTranspose) {
        btnUndoTranspose.addEventListener('click', undoTranspose);
    }
}

// ==========================================================================
// 14. MÓDULO DE NOTAÇÃO ABC (TheSession.org)
// ==========================================================================

function showABCFeedback(msg, type = 'success') {
    if (!abcFeedback) return;
    abcFeedback.className = `abc-feedback ${type}`;
    abcFeedback.textContent = msg;
    abcFeedback.style.display = 'block';
}

function clearABCFeedback() {
    if (!abcFeedback) return;
    abcFeedback.style.display = 'none';
    abcFeedback.textContent = '';
}

function openABCModal() {
    clearABCFeedback();
    if (exportAbcTextarea && currentSong) {
        exportAbcTextarea.value = exportSongToABC(currentSong);
    }
    if (abcModal) abcModal.classList.add('open');
}

function closeABCModal() {
    if (abcModal) abcModal.classList.remove('open');
}

function setupABCModal() {
    if (!btnOpenAbc || !abcModal) return;

    btnOpenAbc.addEventListener('click', openABCModal);
    if (btnCloseAbc) btnCloseAbc.addEventListener('click', closeABCModal);
    if (btnCloseAbcDone) btnCloseAbcDone.addEventListener('click', closeABCModal);

    abcModal.addEventListener('click', (e) => {
        if (e.target === abcModal) closeABCModal();
    });

    // Abas do Modal ABC
    const tabBtns = abcModal.querySelectorAll('.abc-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.dataset.tab;
            const panels = abcModal.querySelectorAll('.abc-tab-panel');
            panels.forEach(panel => {
                panel.style.display = (panel.id === targetId) ? 'block' : 'none';
            });
            clearABCFeedback();
            if (targetId === 'tab-export-abc' && currentSong) {
                exportAbcTextarea.value = exportSongToABC(currentSong);
            }
        });
    });

    // Botão Aplicar Importação ABC
    if (btnApplyImportAbc && importAbcTextarea) {
        btnApplyImportAbc.addEventListener('click', () => {
            const text = importAbcTextarea.value;
            const res = parseABCNotation(text);
            if (res.error) {
                showABCFeedback(res.errorKey ? t(res.errorKey) : res.error, 'error');
                return;
            }

            pushHistoryState('Importar Notação ABC');
            const newId = generateRandomTuneId(8);
            const importedSong = {
                id: newId,
                title: res.title,
                artist: res.artist,
                key: res.key,
                timeSignature: res.timeSignature,
                tempo: res.tempo,
                isCurated: false,
                isCommunity: false,
                isCloud: false,
                is_public: 0,
                syncStatus: 'pending',
                accompaniment: {
                    metronomeActive: false,
                    bodhranActive: false,
                    bodhranVolume: 0.75,
                    guitarActive: false,
                    guitarVolume: 0.65,
                    guitarInstrument: 'dadgad',
                    rhythmStyle: 'auto',
                    whistleVolume: 1.0
                },
                notes: res.notes
            };

            userSongs.unshift(importedSong);
            songs.unshift(importedSong);
            saveSongsToStorage();
            renderSidebar();
            selectSong(newId);
            syncImportedSongToCloud(importedSong);
            closeABCModal();
            showNotificationToast(t('toasts.songImported', { title: importedSong.title }));
        });
    }

    // Botão Copiar ABC
    if (btnCopyAbc && exportAbcTextarea) {
        btnCopyAbc.addEventListener('click', () => {
            exportAbcTextarea.select();
            navigator.clipboard.writeText(exportAbcTextarea.value).then(() => {
                showABCFeedback(t('abc.copiedSuccess'), 'success');
            }).catch(() => {
                document.execCommand('copy');
                showABCFeedback(t('abc.copiedShort'), 'success');
            });
        });
    }

    // Botão Baixar .abc
    if (btnDownloadAbc && exportAbcTextarea && currentSong) {
        btnDownloadAbc.addEventListener('click', () => {
            const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(exportSongToABC(currentSong));
            const downloadAnchor = document.createElement('a');
            const sanitizedTitle = (currentSong.title || 'tune').toLowerCase().replace(/[^a-z0-9]/g, '_');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `${sanitizedTitle}.abc`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showABCFeedback(t('abc.downloaded', { file: `${sanitizedTitle}.abc` }), 'success');
        });
    }

    // Carregar arquivo .abc do disco
    if (abcFileInput && importAbcTextarea) {
        abcFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                importAbcTextarea.value = ev.target.result;
                showABCFeedback(t('abc.fileLoaded', { file: file.name }), 'success');
            };
            reader.readAsText(file);
            e.target.value = '';
        });
    }
}

// ==========================================================================
// FAVORITOS ⭐ & ORDENAÇÃO DO REPERTÓRIO
// ==========================================================================
function loadFavorites() {
    try {
        const stored = localStorage.getItem('tinwhistle_favorite_songs');
        if (stored) {
            favoriteSongIds = new Set(JSON.parse(stored));
        }
    } catch (e) {
        favoriteSongIds = new Set();
    }
}

function saveFavorites() {
    try {
        localStorage.setItem('tinwhistle_favorite_songs', JSON.stringify([...favoriteSongIds]));
    } catch (e) {}
}

function toggleFavorite(songId, event) {
    if (event) event.stopPropagation();
    if (favoriteSongIds.has(songId)) {
        favoriteSongIds.delete(songId);
    } else {
        favoriteSongIds.add(songId);
    }
    saveFavorites();
    renderSidebar();
}

function initSongSort() {
    if (sortSongsSelect) {
        sortSongsSelect.addEventListener('change', (e) => {
            currentSongSort = e.target.value;
            renderSidebar();
        });
    }
}

// ==========================================================================
// MODO ESTANTE COMPACTO (CLEAN STAND MODE)
// ==========================================================================
function initStandMode() {
    const saved = localStorage.getItem('tinwhistle_stand_mode');
    if (saved === 'true') {
        setStandMode(true, false);
    }
    if (btnToggleStandMode) {
        btnToggleStandMode.addEventListener('click', toggleStandMode);
    }
}

function toggleStandMode() {
    setStandMode(!isStandModeActive, true);
}

function setStandMode(active, persist = true) {
    isStandModeActive = active;
    const appContainer = document.querySelector('.app-container');
    if (active) {
        if (appContainer) appContainer.classList.add('stand-mode-active');
        document.body.classList.add('stand-mode-active');
        if (btnToggleStandMode) btnToggleStandMode.classList.add('active');
    } else {
        if (appContainer) appContainer.classList.remove('stand-mode-active');
        document.body.classList.remove('stand-mode-active');
        if (btnToggleStandMode) btnToggleStandMode.classList.remove('active');
    }
    if (persist) {
        localStorage.setItem('tinwhistle_stand_mode', active ? 'true' : 'false');
    }
}

// ==========================================================================
// SCREEN WAKE LOCK API (TELA SEMPRE ACESA DURANTE EXECUÇÃO)
// ==========================================================================
async function requestScreenWakeLock(manual = false) {
    if (manual) wakeLockManualActive = true;
    if (!('wakeLock' in navigator)) {
        if (wakeLockLabel && manual) wakeLockLabel.textContent = t('tuner.notSupported');
        return false;
    }
    try {
        if (!wakeLockSentinel || wakeLockSentinel.released) {
            wakeLockSentinel = await navigator.wakeLock.request('screen');
            wakeLockSentinel.addEventListener('release', () => {
                wakeLockSentinel = null;
                updateWakeLockUI();
            });
        }
        updateWakeLockUI();
        return true;
    } catch (err) {
        console.warn('Wake Lock request falhou:', err);
        updateWakeLockUI();
        return false;
    }
}

async function releaseScreenWakeLock(forceManual = false) {
    if (forceManual) wakeLockManualActive = false;
    if (wakeLockManualActive && !forceManual) return;
    if (wakeLockSentinel) {
        try {
            await wakeLockSentinel.release();
        } catch (e) {}
        wakeLockSentinel = null;
    }
    updateWakeLockUI();
}

function updateWakeLockUI() {
    const isLocked = Boolean(wakeLockSentinel && !wakeLockSentinel.released);
    const isActive = isLocked || wakeLockManualActive;

    if (btnToggleWakeLock) {
        if (isActive) {
            btnToggleWakeLock.classList.add('wake-lock-on');
            if (wakeLockLabel) wakeLockLabel.textContent = t('topbar.wakeLockOnLabel');
        } else {
            btnToggleWakeLock.classList.remove('wake-lock-on');
            if (wakeLockLabel) wakeLockLabel.textContent = t('topbar.wakeLockActive');
        }
    }

    const mbWakelockLabel = document.getElementById('mb-wakelock-label');
    const mbActWakelock = document.getElementById('mb-act-wakelock');
    if (mbActWakelock) {
        if (isActive) {
            mbActWakelock.classList.add('wake-lock-on');
            if (mbWakelockLabel) mbWakelockLabel.textContent = t('topbar.wakeLockMobileOn');
        } else {
            mbActWakelock.classList.remove('wake-lock-on');
            if (mbWakelockLabel) mbWakelockLabel.textContent = t('topbar.wakeLockMobileOff');
        }
    }
}

function setupScreenWakeLock() {
    if (btnToggleWakeLock) {
        btnToggleWakeLock.addEventListener('click', async () => {
            if (wakeLockManualActive || (wakeLockSentinel && !wakeLockSentinel.released)) {
                await releaseScreenWakeLock(true);
            } else {
                await requestScreenWakeLock(true);
            }
        });
    }

    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible') {
            if (wakeLockManualActive || isPlaying || playAlongController.getIsPlayAlongRunning()) {
                await requestScreenWakeLock(false);
            }
        }
    });
}

// ==========================================================================
// 15. FASE 4: VISUALIZAÇÃO, TEMAS & EXPORTAÇÃO (PNG, SVG, WAV, MIDI)
// ==========================================================================

// Elementos de UI da Fase 4
const quickThemeSelect = document.getElementById('quick-theme-select');
const btnOpenViewOptions = document.getElementById('btn-open-view-options');
const btnOpenExportCenter = document.getElementById('btn-open-export-center');

const viewOptionsModal = document.getElementById('view-options-modal');
const btnCloseViewOptions = document.getElementById('btn-close-view-options');
const btnCloseViewOptionsDone = document.getElementById('btn-close-view-options-done');

const chkOptPitch = document.getElementById('chk-opt-pitch');
const chkOptChords = document.getElementById('chk-opt-chords');
const chkOptLyrics = document.getElementById('chk-opt-lyrics');
const chkOptDurations = document.getElementById('chk-opt-durations');
const chkOptOrnaments = document.getElementById('chk-opt-ornaments');
const chkOptFingeringOnly = document.getElementById('chk-opt-fingering-only');

const btnSpacingCompact = document.getElementById('btn-spacing-compact');
const btnSpacingNormal = document.getElementById('btn-spacing-normal');
const btnSpacingWide = document.getElementById('btn-spacing-wide');

const exportCenterModal = document.getElementById('export-center-modal');
const btnCloseExportCenter = document.getElementById('btn-close-export-center');
const btnCloseExportCenterOk = document.getElementById('btn-close-export-center-ok');

const btnExportPng = document.getElementById('btn-export-png');
const btnExportSvg = document.getElementById('btn-export-svg');
const btnExportWav = document.getElementById('btn-export-wav');
const btnExportMidi = document.getElementById('btn-export-midi');
const btnExportCenterAbc = document.getElementById('btn-export-center-abc');
const btnExportCenterJson = document.getElementById('btn-export-center-json');
const btnExportCenterPrint = document.getElementById('btn-export-center-print');

// Estado das Preferências de Exibição
let currentAppTheme = 'celtic';
let displayPrefs = {
    pitch: true,
    chords: true,
    lyrics: true,
    durations: true,
    ornaments: true,
    fingeringOnly: false,
    spacing: 'normal' // 'compact' | 'normal' | 'wide'
};

function setupPhase4VisualsAndExport() {
    loadThemePreference();
    loadDisplayPreferences();
    setupThemeListeners();
    setupViewOptionsListeners();
    setupExportCenterListeners();
}

// --------------------------------------------------------------------------
// GERENCIAMENTO DE TEMAS VISUAIS
// --------------------------------------------------------------------------
function loadThemePreference() {
    const savedTheme = localStorage.getItem('celtic_whistle_theme') || 'celtic';
    setTheme(savedTheme, false);
}

function setTheme(themeId, persist = true) {
    currentAppTheme = themeId;
    document.documentElement.setAttribute('data-theme', themeId);
    
    if (persist) {
        localStorage.setItem('celtic_whistle_theme', themeId);
    }

    if (quickThemeSelect) {
        quickThemeSelect.value = themeId;
    }

    document.querySelectorAll('.theme-card-option').forEach(card => {
        if (card.dataset.themeId === themeId) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

function setupThemeListeners() {
    if (quickThemeSelect) {
        quickThemeSelect.addEventListener('change', (e) => {
            setTheme(e.target.value);
        });
    }

    document.querySelectorAll('.theme-card-option').forEach(card => {
        card.addEventListener('click', () => {
            const themeId = card.dataset.themeId;
            if (themeId) {
                setTheme(themeId);
            }
        });
    });
}

// --------------------------------------------------------------------------
// GERENCIAMENTO DE OPÇÕES DE VISUALIZAÇÃO & LAYOUT
// --------------------------------------------------------------------------
function loadDisplayPreferences() {
    const saved = localStorage.getItem('celtic_whistle_display_prefs');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            displayPrefs = Object.assign(displayPrefs, parsed);
        } catch (e) {
            console.warn('Erro ao carregar displayPrefs:', e);
        }
    }
    syncDisplayCheckboxesUI();
    applyDisplayPreferences();
}

function saveDisplayPreferences() {
    localStorage.setItem('celtic_whistle_display_prefs', JSON.stringify(displayPrefs));
}

function syncDisplayCheckboxesUI() {
    if (chkOptPitch) chkOptPitch.checked = !!displayPrefs.pitch;
    if (chkOptChords) chkOptChords.checked = !!displayPrefs.chords;
    if (chkOptLyrics) chkOptLyrics.checked = !!displayPrefs.lyrics;
    if (chkOptDurations) chkOptDurations.checked = !!displayPrefs.durations;
    if (chkOptOrnaments) chkOptOrnaments.checked = !!displayPrefs.ornaments;
    if (chkOptFingeringOnly) chkOptFingeringOnly.checked = !!displayPrefs.fingeringOnly;

    updateSpacingButtonsUI();
}

function updateSpacingButtonsUI() {
    const sp = displayPrefs.spacing || 'normal';
    if (btnSpacingCompact) btnSpacingCompact.classList.toggle('active', sp === 'compact');
    if (btnSpacingNormal) btnSpacingNormal.classList.toggle('active', sp === 'normal');
    if (btnSpacingWide) btnSpacingWide.classList.toggle('active', sp === 'wide');
}

function applyDisplayPreferences() {
    if (!tabSheetEl) return;

    tabSheetEl.classList.toggle('hide-pitch-names', !displayPrefs.pitch);
    tabSheetEl.classList.toggle('hide-chords', !displayPrefs.chords);
    tabSheetEl.classList.toggle('hide-lyrics', !displayPrefs.lyrics);
    tabSheetEl.classList.toggle('hide-durations', !displayPrefs.durations);
    tabSheetEl.classList.toggle('hide-ornaments', !displayPrefs.ornaments);
    tabSheetEl.classList.toggle('fingering-only', !!displayPrefs.fingeringOnly);

    tabSheetEl.classList.remove('spacing-compact', 'spacing-wide');
    if (displayPrefs.spacing === 'compact') {
        tabSheetEl.classList.add('spacing-compact');
    } else if (displayPrefs.spacing === 'wide') {
        tabSheetEl.classList.add('spacing-wide');
    }
}

function setupViewOptionsListeners() {
    const btnOpen = document.getElementById('btn-open-view-options');
    const modal = document.getElementById('view-options-modal');
    const btnClose = document.getElementById('btn-close-view-options');
    const btnDone = document.getElementById('btn-close-view-options-done');

    const openViewModal = () => {
        syncDisplayCheckboxesUI();
        const m = document.getElementById('view-options-modal');
        if (m) {
            m.style.display = 'flex';
            m.classList.add('open');
        }
    };

    const closeViewModal = () => {
        const m = document.getElementById('view-options-modal');
        if (m) {
            m.classList.remove('open');
            m.style.display = 'none';
        }
    };

    if (btnOpen) btnOpen.addEventListener('click', openViewModal);
    if (btnClose) btnClose.addEventListener('click', closeViewModal);
    if (btnDone) btnDone.addEventListener('click', closeViewModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeViewModal();
        });
    }

    const handlePrefChange = () => {
        displayPrefs.pitch = chkOptPitch ? chkOptPitch.checked : true;
        displayPrefs.chords = chkOptChords ? chkOptChords.checked : true;
        displayPrefs.lyrics = chkOptLyrics ? chkOptLyrics.checked : true;
        displayPrefs.durations = chkOptDurations ? chkOptDurations.checked : true;
        displayPrefs.ornaments = chkOptOrnaments ? chkOptOrnaments.checked : true;
        displayPrefs.fingeringOnly = chkOptFingeringOnly ? chkOptFingeringOnly.checked : false;

        saveDisplayPreferences();
        applyDisplayPreferences();
    };

    [chkOptPitch, chkOptChords, chkOptLyrics, chkOptDurations, chkOptOrnaments, chkOptFingeringOnly].forEach(chk => {
        if (chk) chk.addEventListener('change', handlePrefChange);
    });

    if (btnSpacingCompact) {
        btnSpacingCompact.addEventListener('click', () => {
            displayPrefs.spacing = 'compact';
            updateSpacingButtonsUI();
            saveDisplayPreferences();
            applyDisplayPreferences();
        });
    }
    if (btnSpacingNormal) {
        btnSpacingNormal.addEventListener('click', () => {
            displayPrefs.spacing = 'normal';
            updateSpacingButtonsUI();
            saveDisplayPreferences();
            applyDisplayPreferences();
        });
    }
    if (btnSpacingWide) {
        btnSpacingWide.addEventListener('click', () => {
            displayPrefs.spacing = 'wide';
            updateSpacingButtonsUI();
            saveDisplayPreferences();
            applyDisplayPreferences();
        });
    }
}

// --------------------------------------------------------------------------
// DISPARADOR DE IMPRESSÃO LIMPA (FECHA MODAIS ANTES DE IMPRIMIR)
// --------------------------------------------------------------------------
function triggerPrintTab() {
    stopPlayback();

    // 1. Atualizar e sincronizar o cabeçalho editorial de impressão
    if (currentSong) {
        updatePrintSheetHeader(currentSong);
    }

    // 2. Fechar o modal de exportação/importação e quaisquer outros modais abertos
    const exportModal = document.getElementById('export-center-modal');
    if (exportModal) {
        exportModal.classList.remove('open');
        exportModal.style.display = 'none';
    }
    document.querySelectorAll('.modal-backdrop').forEach(m => {
        m.classList.remove('open');
        m.style.display = 'none';
    });

    // 3. Aguarda um curto intervalo para o motor do navegador atualizar o DOM antes de imprimir
    setTimeout(() => {
        window.print();
    }, 150);
}

// --------------------------------------------------------------------------
// CENTRAL DE IMPORTAÇÃO & EXPORTAÇÃO (MODAL & DISPARADORES)
// --------------------------------------------------------------------------
function setupExportCenterListeners() {
    const btnOpen = document.getElementById('btn-open-export-center');
    const modal = document.getElementById('export-center-modal');
    const btnClose = document.getElementById('btn-close-export-center');
    const btnOk = document.getElementById('btn-close-export-center-ok');

    const tabBtnExport = document.getElementById('tab-btn-export');
    const tabBtnImport = document.getElementById('tab-btn-import');
    const panelExport = document.getElementById('panel-export-center');
    const panelImport = document.getElementById('panel-import-center');

    const btnSaveCurrentSongModal = document.getElementById('btn-save-current-song-modal');
    const btnExportCenterPrint = document.getElementById('btn-export-center-print');
    const btnExportCenterJson = document.getElementById('btn-export-center-json');
    const btnExportCenterAllJson = document.getElementById('btn-export-center-all-json');
    const btnExportCenterAbc = document.getElementById('btn-export-center-abc');

    const btnImportCenterAbcApply = document.getElementById('btn-import-center-abc-apply');
    const importCenterAbcTextarea = document.getElementById('import-center-abc-textarea');
    const importCenterAbcFileInput = document.getElementById('import-center-abc-file-input');
    const importCenterAbcFeedback = document.getElementById('import-center-abc-feedback');
    const importCenterJsonFileInput = document.getElementById('import-center-json-file-input');
    const importCenterJsonFeedback = document.getElementById('import-center-json-feedback');

    const openExportModal = () => {
        const m = document.getElementById('export-center-modal');
        if (m) {
            m.style.display = 'flex';
            m.classList.add('open');
        }
    };

    const closeExportModal = () => {
        const m = document.getElementById('export-center-modal');
        if (m) {
            m.classList.remove('open');
            m.style.display = 'none';
        }
    };

    if (btnOpen) btnOpen.addEventListener('click', openExportModal);
    if (btnClose) btnClose.addEventListener('click', closeExportModal);
    if (btnOk) btnOk.addEventListener('click', closeExportModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeExportModal();
        });
    }

    // Alternância entre as abas Exportar e Importar
    if (tabBtnExport && tabBtnImport && panelExport && panelImport) {
        tabBtnExport.addEventListener('click', () => {
            tabBtnExport.classList.add('active');
            tabBtnImport.classList.remove('active');
            panelExport.style.display = 'block';
            panelImport.style.display = 'none';
        });

        tabBtnImport.addEventListener('click', () => {
            tabBtnImport.classList.add('active');
            tabBtnExport.classList.remove('active');
            panelImport.style.display = 'block';
            panelExport.style.display = 'none';
        });
    }

    // Botões dos formatos de exportação
    if (btnExportPng) btnExportPng.addEventListener('click', () => downloadSongPNG());
    if (btnExportSvg) btnExportSvg.addEventListener('click', () => downloadSongSVG());
    if (btnExportWav) btnExportWav.addEventListener('click', () => downloadSongWAV());
    if (btnExportMidi) btnExportMidi.addEventListener('click', () => downloadSongMIDI());

    // Card de Impressão / Salvar em PDF
    if (btnExportCenterPrint) {
        btnExportCenterPrint.addEventListener('click', () => {
            triggerPrintTab();
        });
    }

    // Cards de Backup JSON
    if (btnExportCenterJson) {
        btnExportCenterJson.addEventListener('click', () => {
            exportCurrentSongJSON();
        });
    }
    if (btnExportCenterAllJson) {
        btnExportCenterAllJson.addEventListener('click', () => {
            exportAllSongsJSON();
        });
    }

    // Link para ABC
    if (btnExportCenterAbc) {
        btnExportCenterAbc.addEventListener('click', () => {
            closeExportModal();
            openABCModal();
        });
    }

    // Salvar alterações na música atual
    if (btnSaveCurrentSongModal) {
        btnSaveCurrentSongModal.addEventListener('click', () => {
            updateCurrentSongMetadata();
            showNotificationToast(t('toasts.savedLocal'));
        });
    }

    // ABA IMPORTAR: Importação de ABC
    if (btnImportCenterAbcApply && importCenterAbcTextarea) {
        btnImportCenterAbcApply.addEventListener('click', () => {
            const text = importCenterAbcTextarea.value.trim();
            if (!text) {
                if (importCenterAbcFeedback) {
                    importCenterAbcFeedback.className = 'abc-feedback error';
                    importCenterAbcFeedback.textContent = t('exportCenter.abcEmpty');
                    importCenterAbcFeedback.style.display = 'block';
                }
                return;
            }

            const res = parseABCNotation(text);
            if (res.error) {
                if (importCenterAbcFeedback) {
                    importCenterAbcFeedback.className = 'abc-feedback error';
                    importCenterAbcFeedback.textContent = res.errorKey ? t(res.errorKey) : res.error;
                    importCenterAbcFeedback.style.display = 'block';
                }
                return;
            }

            pushHistoryState('Importar Notação ABC');
            const newId = generateRandomTuneId(8);
            const importedSong = {
                id: newId,
                title: res.title || 'Melodia ABC Importada',
                artist: res.artist || 'Tradicional',
                category: 'celtic',
                difficulty: 'intermediario',
                rhythm: 'reel',
                key: res.key || 'D',
                timeSignature: res.timeSignature || '4/4',
                tempo: res.tempo || 110,
                isCurated: false,
                isCommunity: false,
                isCloud: false,
                is_public: 0,
                syncStatus: 'pending',
                accompaniment: {
                    metronomeActive: false,
                    bodhranActive: false,
                    bodhranVolume: 0.75,
                    guitarActive: false,
                    guitarVolume: 0.65,
                    guitarInstrument: 'dadgad',
                    rhythmStyle: 'auto',
                    whistleVolume: 1.0
                },
                notes: res.notes || []
            };

            userSongs.unshift(importedSong);
            songs.unshift(importedSong);
            saveSongsToStorage();
            renderSidebar();
            selectSong(newId);
            syncImportedSongToCloud(importedSong);
            closeExportModal();
            showNotificationToast(t('toasts.songImported', { title: importedSong.title }));
        });
    }

    // ABA IMPORTAR: Carregar arquivo .abc do disco
    if (importCenterAbcFileInput && importCenterAbcTextarea) {
        importCenterAbcFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                importCenterAbcTextarea.value = event.target.result;
                if (importCenterAbcFeedback) {
                    importCenterAbcFeedback.className = 'abc-feedback success';
                    importCenterAbcFeedback.textContent = t('exportCenter.abcFileLoaded', { file: file.name });
                    importCenterAbcFeedback.style.display = 'block';
                }
            };
            reader.readAsText(file);
        });
    }

    // ABA IMPORTAR: Restaurar Backup JSON
    if (importCenterJsonFileInput) {
        importCenterJsonFileInput.addEventListener('change', (e) => {
            importSongsJSON(e);
            if (importCenterJsonFeedback) {
                importCenterJsonFeedback.className = 'abc-feedback success';
                importCenterJsonFeedback.textContent = t('exportCenter.backupSuccess');
                importCenterJsonFeedback.style.display = 'block';
            }
        });
    }

    // Botão de Redefinição Total / Reset de Fábrica (Fase 11)
    const btnFactoryResetStorage = document.getElementById('btn-factory-reset-storage');
    if (btnFactoryResetStorage) {
        btnFactoryResetStorage.addEventListener('click', async () => {
            const confirmed = confirm(t('confirms.factoryReset'));
            if (!confirmed) return;

            // 1. Limpar storages locais
            localStorage.clear();
            sessionStorage.clear();

            // 2. Resetar variáveis de estado em memória
            userSongs = [];
            favoriteSongIds.clear();
            userLikedTuneIds.clear();
            selectedIndices.clear();
            clipboardNotes = [];

            // 3. Recarregar catálogo oficial limpo da curadoria
            loadSongs();

            // 4. Fechar o modal
            closeExportModal();

            // 5. Sincronizar catálogo da API
            syncCommunityTunesToCatalog();

            // 6. Notificar usuário com Toast amigável
            showNotificationToast(t('toasts.factoryResetDone'));
        });
    }
}

function generateSongSVG(song) {
    return buildSongSVG(song, displayPrefs);
}

function downloadSongSVG() {
    if (!currentSong) return;
    const svgContent = generateSongSVG(currentSong);
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const sanitizedTitle = (currentSong.title || 'celtic_tune').toLowerCase().replace(/[^a-z0-9]/g, '_');

    const a = document.createElement('a');
    a.href = url;
    a.download = `tab_${sanitizedTitle}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --------------------------------------------------------------------------
// MOTOR DE EXPORTAÇÃO GRÁFICA PNG (300 DPI ALTA RESOLUÇÃO)
// --------------------------------------------------------------------------
function downloadSongPNG() {
    if (!currentSong) return;

    if (btnExportPng) {
        btnExportPng.disabled = true;
        btnExportPng.textContent = t('exportCenter.pngGenerating');
    }

    try {
        const svgString = generateSongSVG(currentSong);
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
            try {
                const scale = 2.5; // Escala 2.5x para atingir qualidade nítida 300 DPI
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);

                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#fcfbf8';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0);

                canvas.toBlob((pngBlob) => {
                    URL.revokeObjectURL(url);
                    if (btnExportPng) {
                        btnExportPng.disabled = false;
                        btnExportPng.textContent = t('exportCenter.pngBtn');
                    }

                    if (!pngBlob) {
                        showNotificationToast(t('toasts.pngError'));
                        return;
                    }

                    const pngUrl = URL.createObjectURL(pngBlob);
                    const sanitizedTitle = (currentSong.title || 'celtic_tune').toLowerCase().replace(/[^a-z0-9]/g, '_');
                    const a = document.createElement('a');
                    a.href = pngUrl;
                    a.download = `tab_${sanitizedTitle}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(pngUrl);
                }, 'image/png');
            } catch (err) {
                console.error('Erro ao renderizar canvas:', err);
                URL.revokeObjectURL(url);
                if (btnExportPng) {
                    btnExportPng.disabled = false;
                    btnExportPng.textContent = t('exportCenter.pngBtn');
                }
                showNotificationToast(t('toasts.pngConvertError', { error: err.message }));
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            if (btnExportPng) {
                btnExportPng.disabled = false;
                btnExportPng.textContent = t('exportCenter.pngBtn');
            }
            showNotificationToast(t('toasts.svgError'));
        };

        img.src = url;
    } catch (e) {
        if (btnExportPng) {
            btnExportPng.disabled = false;
            btnExportPng.textContent = t('exportCenter.pngBtn');
        }
        showNotificationToast(t('toasts.pngExportError', { error: e.message }));
    }
}

function downloadSongMIDI() {
    if (!currentSong) return;

    try {
        const midiBytes = generateMIDIData(currentSong);
        if (!midiBytes) return;

        const blob = new Blob([midiBytes], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const sanitizedTitle = (currentSong.title || 'celtic_tune').toLowerCase().replace(/[^a-z0-9]/g, '_');

        const a = document.createElement('a');
        a.href = url;
        a.download = `tab_${sanitizedTitle}.mid`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        showNotificationToast(t('toasts.midiError', { error: e.message }));
    }
}

async function downloadSongWAV() {
    if (!currentSong) return;

    if (btnExportWav) {
        btnExportWav.disabled = true;
        btnExportWav.textContent = t('exportCenter.wavRendering');
    }

    try {
        const wavBlob = await renderSongToWAV(currentSong);
        const url = URL.createObjectURL(wavBlob);
        const sanitizedTitle = (currentSong.title || 'celtic_tune').toLowerCase().replace(/[^a-z0-9]/g, '_');

        const a = document.createElement('a');
        a.href = url;
        a.download = `tab_${sanitizedTitle}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('Erro na exportação WAV:', e);
        showNotificationToast(t('toasts.audioRenderError', { error: e.message }));
    } finally {
        if (btnExportWav) {
            btnExportWav.disabled = false;
            btnExportWav.textContent = t('exportCenter.wavBtn');
        }
    }
}

// ==========================================================================
// 15. PWA (SERVICE WORKER & PROMPT DE INSTALAÇÃO NO ANDROID/DESKTOP)
// ==========================================================================
let deferredPwaInstallPrompt = null;

function setupPWA() {
    // 1. Registro do Service Worker com tratamento robusto
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('[PWA] Service Worker registrado com sucesso:', registration.scope);
                })
                .catch((err) => {
                    console.warn('[PWA] Falha ao registrar Service Worker:', err);
                });
        });
    }

    // 2. Captura do evento beforeinstallprompt para exibir botão de instalação personalizado
    const installBtns = document.querySelectorAll('.btn-pwa-install');

    window.addEventListener('beforeinstallprompt', (e) => {
        // Previne a barra mini padrão do navegador para exibir o botão integrado na UI
        e.preventDefault();
        deferredPwaInstallPrompt = e;
        installBtns.forEach(btn => {
            btn.style.display = 'inline-flex';
        });
    });

    installBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!deferredPwaInstallPrompt) return;
            deferredPwaInstallPrompt.prompt();
            const { outcome } = await deferredPwaInstallPrompt.userChoice;
            console.log('[PWA] Resposta de instalação do usuário:', outcome);
            if (outcome === 'accepted') {
                installBtns.forEach(b => b.style.display = 'none');
            }
            deferredPwaInstallPrompt = null;
        });
    });

    window.addEventListener('appinstalled', () => {
        console.log('[PWA] Tin Whistle Live foi instalado com sucesso!');
        installBtns.forEach(b => b.style.display = 'none');
        deferredPwaInstallPrompt = null;
    });
}

// ==========================================================================
// 16. NAVEGAÇÃO MOBILE TOUCH (BOTTOM BAR & SINCRONIZAÇÃO DE MODOS - FASE 11)
// ==========================================================================

function setMobileSidebarOpen(isOpen) {
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebarEl) return;
    if (isOpen) {
        sidebarEl.classList.add('open');
        if (backdrop) {
            backdrop.style.display = 'block';
            requestAnimationFrame(() => backdrop.classList.add('active'));
        }
    } else {
        sidebarEl.classList.remove('open');
        if (backdrop) {
            backdrop.classList.remove('active');
            backdrop.style.display = 'none';
        }
    }
}

function setupMobileNavigation() {
    const mbNavLibrary = document.getElementById('mb-nav-library');
    const mbNavStudio = document.getElementById('mb-nav-studio');
    const mbNavPractice = document.getElementById('mb-nav-practice');
    const mbNavPlayalong = document.getElementById('mb-nav-playalong');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');

    // Ao clicar em "Repertório", abre/fecha a gaveta lateral com backdrop
    if (mbNavLibrary) {
        mbNavLibrary.addEventListener('click', () => {
            if (sidebarEl) {
                setMobileSidebarOpen(!sidebarEl.classList.contains('open'));
            }
        });
    }

    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            if (sidebarEl) {
                setMobileSidebarOpen(!sidebarEl.classList.contains('open'));
            }
        });
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', () => {
            setMobileSidebarOpen(false);
        });
    }

    const syncMobileNav = (mode) => {
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            } else if (btn.id !== 'mb-nav-library') {
                btn.classList.remove('active');
            }
        });
    };

    [mbNavStudio, mbNavPractice, mbNavPlayalong].forEach(btn => {
        if (!btn) return;
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            setAppMode(mode);
            syncMobileNav(mode);
            // Fecha a barra lateral caso esteja aberta
            setMobileSidebarOpen(false);
        });
    });

    // Ouvir mudanças nos botões superiores de modo para manter a barra inferior sincronizada
    document.querySelectorAll('.app-mode-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const mode = tab.dataset.appMode;
            if (mode) syncMobileNav(mode);
        });
    });

    // Menu Suspenso de Mais Ações Mobile (Fase 11)
    const btnMobileMore = document.getElementById('btn-mobile-more-actions');
    const mobileMoreDropdown = document.getElementById('mobile-more-dropdown');
    const mbActPwa = document.getElementById('mb-act-pwa');
    const mbActWakelock = document.getElementById('mb-act-wakelock');
    const mbActView = document.getElementById('mb-act-view');
    const mbActExport = document.getElementById('mb-act-export');
    const mbActShare = document.getElementById('mb-act-share');

    const closeMobileMoreDropdown = () => {
        if (mobileMoreDropdown) {
            mobileMoreDropdown.classList.remove('show');
            mobileMoreDropdown.style.display = 'none';
        }
    };

    if (btnMobileMore && mobileMoreDropdown) {
        btnMobileMore.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = mobileMoreDropdown.classList.contains('show') || mobileMoreDropdown.style.display === 'flex';
            if (isOpen) {
                closeMobileMoreDropdown();
            } else {
                mobileMoreDropdown.classList.add('show');
                mobileMoreDropdown.style.display = 'flex';
            }

            // Sincronizar visibilidade do botão PWA se disponível
            const pwaBtn = document.getElementById('btn-pwa-install');
            if (mbActPwa && pwaBtn) {
                mbActPwa.style.display = (pwaBtn.style.display !== 'none' || Boolean(deferredPwaInstallPrompt)) ? 'flex' : 'none';
            }
            // Sincronizar label do WakeLock
            const mbWakelockLabel = document.getElementById('mb-wakelock-label');
            const isLocked = Boolean(wakeLockSentinel && !wakeLockSentinel.released);
            if (mbWakelockLabel) {
                mbWakelockLabel.textContent = (isLocked || wakeLockManualActive) ? t('topbar.wakeLockMobileOn') : t('topbar.wakeLockMobileOff');
            }
        });

        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (!mobileMoreDropdown.contains(e.target) && !btnMobileMore.contains(e.target)) {
                closeMobileMoreDropdown();
            }
        });

        if (mbActPwa) {
            mbActPwa.addEventListener('click', (e) => {
                e.stopPropagation();
                closeMobileMoreDropdown();
                if (deferredPwaInstallPrompt) {
                    deferredPwaInstallPrompt.prompt();
                    deferredPwaInstallPrompt.userChoice.then(({ outcome }) => {
                        console.log('[PWA] Resposta de instalação do usuário:', outcome);
                        deferredPwaInstallPrompt = null;
                        document.querySelectorAll('.btn-pwa-install').forEach(b => b.style.display = 'none');
                    });
                } else {
                    const pwaBtn = document.getElementById('btn-pwa-install');
                    if (pwaBtn) pwaBtn.click();
                }
            });
        }

        if (mbActWakelock) {
            mbActWakelock.addEventListener('click', async (e) => {
                e.stopPropagation();
                closeMobileMoreDropdown();
                const wakeBtn = document.getElementById('btn-toggle-wake-lock');
                if (wakeBtn) {
                    wakeBtn.click();
                } else {
                    if (wakeLockManualActive || (wakeLockSentinel && !wakeLockSentinel.released)) {
                        await releaseScreenWakeLock(true);
                    } else {
                        await requestScreenWakeLock(true);
                    }
                }
            });
        }

        if (mbActView) {
            mbActView.addEventListener('click', (e) => {
                e.stopPropagation();
                closeMobileMoreDropdown();
                const viewModal = document.getElementById('view-options-modal');
                if (viewModal) {
                    if (typeof syncDisplayCheckboxesUI === 'function') syncDisplayCheckboxesUI();
                    viewModal.style.display = 'flex';
                    viewModal.classList.add('open');
                }
            });
        }

        if (mbActExport) {
            mbActExport.addEventListener('click', (e) => {
                e.stopPropagation();
                closeMobileMoreDropdown();
                const expModal = document.getElementById('export-center-modal');
                if (expModal) {
                    expModal.style.display = 'flex';
                    expModal.classList.add('open');
                }
            });
        }

        if (mbActShare) {
            mbActShare.addEventListener('click', (e) => {
                e.stopPropagation();
                closeMobileMoreDropdown();
                shareTuneNatively();
            });
        }
    }
}


// ==========================================================================
// 17. RECURSO DE PUBLICAÇÃO & COMPARTILHAMENTO MODERNO (FASE 8/12)
// ==========================================================================

let autoSyncDebounceTimer = null;

function updateVisibilityToggleUI(isPublic, isReadOnly) {
    const btnToggle = document.getElementById('btn-song-visibility-toggle');
    const iconEl = document.getElementById('vis-toggle-icon');
    const textEl = document.getElementById('vis-toggle-text');
    if (!btnToggle || !iconEl || !textEl) return;

    if (isReadOnly) {
        btnToggle.disabled = true;
        btnToggle.classList.add('is-disabled');
        btnToggle.classList.remove('is-public');
        iconEl.textContent = '🔒';
        textEl.textContent = t('editor.visCurated');
        btnToggle.title = t('toasts.curatedProtected');
        return;
    }

    btnToggle.disabled = false;
    btnToggle.classList.remove('is-disabled');

    const isPub = Number(isPublic) === 1;
    if (isPub) {
        btnToggle.classList.add('is-public');
        iconEl.textContent = '🌍';
        textEl.textContent = t('editor.visPublic');
        btnToggle.title = t('toasts.madePublic');
    } else {
        btnToggle.classList.remove('is-public');
        iconEl.textContent = '🔒';
        textEl.textContent = t('editor.visPrivate');
        btnToggle.title = t('toasts.madePrivate');
    }
}

async function toggleSongVisibility() {
    if (!currentSong) return;
    if (isSongReadOnly(currentSong)) {
        showNotificationToast(t('toasts.curatedProtected'));
        return;
    }

    const currentVis = currentSong.is_public !== undefined ? currentSong.is_public : 0;
    const newVis = currentVis === 1 ? 0 : 1;
    const btnToggle = document.getElementById('btn-song-visibility-toggle');

    // Se estiver tentando tornar pública sem estar autenticado, abre modal de login/cadastro
    if (newVis === 1 && !currentBard) {
        pendingPublishAfterAuth = true;
        showNotificationToast(t('toasts.loginToShare'));
        const btnOpenUserModal = document.getElementById('btn-open-user-modal');
        if (btnOpenUserModal) btnOpenUserModal.click();
        return;
    }

    if (btnToggle) btnToggle.classList.add('is-saving');
    clearTimeout(autoSyncDebounceTimer);

    try {
        currentSong.is_public = newVis;
        const author = (currentBard ? (currentBard.displayName || currentBard.username) : '') || currentSong.author_name || 'Bardo Viajante';
        const payload = {
            id: currentSong.id,
            title: currentSong.title,
            artist: currentSong.artist || t('editor.traditional'),
            key: currentSong.key || 'D',
            tempo: currentSong.tempo || 110,
            timeSignature: currentSong.timeSignature || '4/4',
            category: currentSong.category || 'celtic',
            difficulty: currentSong.difficulty || 'iniciante',
            rhythm: currentSong.rhythm || 'reel',
            notes: currentSong.notes || [],
            author_name: author,
            accompaniment: currentSong.accompaniment || null,
            is_public: newVis,
            parent_id: currentSong.parent_id || null,
            parent_author: currentSong.parent_author || null
        };

        if (newVis === 1) {
            // Tornando Pública
            let res;
            if (currentSong.isCloud) {
                res = await fetch(`/api/tunes/${encodeURIComponent(currentSong.id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });
                if (res.status === 404) {
                    res = await fetch('/api/tunes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(payload)
                    });
                }
            } else {
                // Primeira sincronização com a API mantendo rigorosamente o mesmo ID
                res = await fetch('/api/tunes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });
            }

            if (res.ok) {
                const data = await res.json();
                const savedTune = data.tune || data;
                currentSong.isCloud = true;
                currentSong.syncStatus = 'synced';
                if (savedTune.user_id) currentSong.user_id = savedTune.user_id;
                updateUrlForSong(currentSong.id);

                const uIdx = userSongs.findIndex(s => s.id === currentSong.id);
                if (uIdx !== -1) {
                    userSongs[uIdx].is_public = 1;
                    userSongs[uIdx].isCloud = true;
                    userSongs[uIdx].syncStatus = 'synced';
                }
                const mIdx = songs.findIndex(s => s.id === currentSong.id);
                if (mIdx !== -1) {
                    songs[mIdx].is_public = 1;
                    songs[mIdx].isCloud = true;
                    songs[mIdx].syncStatus = 'synced';
                }
                showNotificationToast(t('toasts.madePublic'));
            } else {
                throw new Error('Falha na resposta do servidor');
            }
        } else {
            // Tornando Privada
            if (currentSong.isCloud) {
                const res = await fetch(`/api/tunes/${encodeURIComponent(currentSong.id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    console.warn('[Visibility] Aviso ao alterar visibilidade na API:', res.status);
                }
            }
            const uIdx = userSongs.findIndex(s => s.id === currentSong.id);
            if (uIdx !== -1) {
                userSongs[uIdx].is_public = 0;
            }
            const mIdx = songs.findIndex(s => s.id === currentSong.id);
            if (mIdx !== -1) {
                songs[mIdx].is_public = 0;
            }
            showNotificationToast(t('toasts.madePrivate'));
        }

        updateVisibilityToggleUI(newVis, false);
        saveSongsToStorage();
        renderSidebar();

    } catch (err) {
        console.error('[Visibility] Erro ao alternar visibilidade:', err);
        currentSong.is_public = currentVis;
        updateVisibilityToggleUI(currentVis, false);
        showNotificationToast(t('toasts.visibilityError'));
    } finally {
        if (btnToggle) btnToggle.classList.remove('is-saving');
    }
}

function triggerPublicTuneAutoSync() {
    if (!currentSong || isSongReadOnly(currentSong)) return;
    if (!currentBard || !currentSong.id || !currentSong.isCloud) return;

    const targetSong = currentSong;
    clearTimeout(autoSyncDebounceTimer);
    autoSyncDebounceTimer = setTimeout(async () => {
        try {
            const author = (currentBard ? (currentBard.displayName || currentBard.username) : '') || targetSong.author_name || 'Bardo Viajante';
            const payload = {
                title: targetSong.title,
                artist: targetSong.artist || 'Tradicional',
                key: targetSong.key || 'D',
                tempo: targetSong.tempo || 110,
                timeSignature: targetSong.timeSignature || '4/4',
                category: targetSong.category || 'celtic',
                difficulty: targetSong.difficulty || 'iniciante',
                rhythm: targetSong.rhythm || 'reel',
                notes: targetSong.notes || [],
                author_name: author,
                accompaniment: targetSong.accompaniment || null,
                is_public: targetSong.is_public === 1 ? 1 : 0
            };

            const res = await fetch(`/api/tunes/${encodeURIComponent(targetSong.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                console.log('[AutoSync] Música sincronizada automaticamente na nuvem:', targetSong.id);
            } else if (res.status === 404) {
                await fetch('/api/tunes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ ...payload, id: targetSong.id })
                });
            }
        } catch (err) {
            console.warn('[AutoSync] Falha na auto-sincronização da música:', err);
        }
    }, 600);
}

function updateUrlForSong(id) {
    if (!id || typeof window === 'undefined' || !window.history || !window.history.replaceState) return;
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get('tune') !== id) {
        currentUrl.searchParams.set('tune', id);
        window.history.replaceState({ songId: id }, '', currentUrl.toString());
    }
}

async function shareTuneNatively() {
    if (!currentSong) return;
    const shareUrl = window.location.href;
    const songTitle = currentSong.title || 'Partitura';
    const shareData = {
        title: `${songTitle} - Tin Whistle Live`,
        text: `Toque a partitura de "${songTitle}" no Tin Whistle Live:`,
        url: shareUrl
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
        }
    }

    // Fallback: cópia para o clipboard
    copyShareUrlToClipboard(shareUrl);
}

async function copyShareUrlToClipboard(url) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(url);
        } else {
            const tmp = document.createElement('input');
            tmp.value = url;
            document.body.appendChild(tmp);
            tmp.select();
            document.execCommand('copy');
            document.body.removeChild(tmp);
        }
        showNotificationToast(t('toasts.copied'));
    } catch (err) {
        showNotificationToast('Link: ' + url);
    }
}

function setupCommunityAndShare() {
    // 1. Toggle de Visibilidade Privado <-> Público no Editor
    const btnToggle = document.getElementById('btn-song-visibility-toggle');
    if (btnToggle) {
        btnToggle.addEventListener('click', toggleSongVisibility);
    }

    // 2. Botão Nativo de Compartilhar no Topo Mobile
    const btnMobileShare = document.getElementById('btn-mobile-native-share');
    if (btnMobileShare) {
        btnMobileShare.addEventListener('click', shareTuneNatively);
    }

    // 3. Item "Compartilhar Música" no Menu de Mais Opções do Mobile
    const mbActShare = document.getElementById('mb-act-share');
    if (mbActShare) {
        mbActShare.addEventListener('click', () => {
            const mobileMoreDropdown = document.getElementById('mobile-more-dropdown');
            if (mobileMoreDropdown) mobileMoreDropdown.style.display = 'none';
            shareTuneNatively();
        });
    }
}

// 3.2. Renderizar "Minhas Músicas" combinando Nuvem do Bardo e LocalStorage
async function fetchAndRenderMyCloudAndLocalTunes(query = '') {
    songListEl.innerHTML = `
        <li class="empty-list-state loading">
            <span>${t('sidebar.loadingCloud')}</span>
        </li>
    `;

    // Músicas locais do localStorage
    const localUserTunes = (userSongs || []).map(t => ({ ...t, isCloud: false, isCurated: false }));
    const localTuneMap = new Map();
    songs.forEach(s => { if (s && s.id) localTuneMap.set(s.id, s); });
    localUserTunes.forEach(s => { if (s && s.id) localTuneMap.set(s.id, s); });

    let cloudTunes = [];
    if (currentBard) {
        try {
            const res = await fetch('/api/my-tunes', { credentials: 'include', cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                cloudTunes = (data.tunes || []).map(t => {
                    const localMatch = localTuneMap.get(t.id);
                    const isActiveCurrent = currentSong && currentSong.id === t.id && !isSongReadOnly(currentSong);
                    return {
                        ...t,
                        title: isActiveCurrent ? (currentSong.title || t.title) : t.title,
                        artist: isActiveCurrent ? (currentSong.artist || t.artist) : t.artist,
                        key: isActiveCurrent ? (currentSong.key || t.key) : t.key,
                        tempo: isActiveCurrent ? (currentSong.tempo || t.tempo) : t.tempo,
                        notes: Array.isArray(t.notes) && t.notes.length > 0
                            ? t.notes
                            : (localMatch && Array.isArray(localMatch.notes) ? localMatch.notes : []),
                        accompaniment: t.accompaniment || (localMatch ? localMatch.accompaniment : null),
                        audio_demo_url: t.audio_demo_url || (localMatch ? localMatch.audio_demo_url : null),
                        isCloud: true,
                        isCurated: false
                    };
                });
            }
        } catch (e) {
            console.warn('[My Tunes] Falha ao buscar nuvem:', e);
        }
    }

    // Evita duplicar se a música local já tiver o mesmo ID da nuvem
    const cloudIds = new Set(cloudTunes.map(t => t.id));
    const combinedTunes = [
        ...cloudTunes,
        ...localUserTunes.filter(t => !cloudIds.has(t.id))
    ];
    window.mySongsCache = combinedTunes;

    // Filtro de busca textual
    const filtered = combinedTunes.filter(t => {
        if (!query) return true;
        return (t.title && t.title.toLowerCase().includes(query)) ||
               (t.artist && t.artist.toLowerCase().includes(query));
    });
    currentFilteredSongs = filtered;

    if (songsCountBadge) {
        songsCountBadge.textContent = t('sidebar.myTunesCount', { count: filtered.length });
    }

    songListEl.innerHTML = '';
    const fragment = document.createDocumentFragment();

    // Se o bardo NÃO estiver logado, exibe banner convidativo no topo
    if (!currentBard) {
        const guestBanner = document.createElement('li');
        guestBanner.className = 'guest-cloud-banner';
        guestBanner.innerHTML = `
            <div class="guest-cloud-title">${t('sidebar.guestCloudTitle')}</div>
            <p class="guest-cloud-desc">
                ${t('sidebar.guestCloudDesc')}
            </p>
            <button type="button" class="btn btn-primary btn-sm" id="btn-login-from-mysongs">
                ${t('sidebar.guestCloudBtn')}
            </button>
        `;
        const loginBtn = guestBanner.querySelector('#btn-login-from-mysongs');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                const btnUserModal = document.getElementById('btn-open-user-modal');
                if (btnUserModal) btnUserModal.click();
            });
        }
        fragment.appendChild(guestBanner);
    }

    if (filtered.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.className = 'empty-list-state';
        emptyLi.innerHTML = `
            <p>${t('sidebar.emptyMyTunes')}</p>
            <button type="button" class="btn btn-primary btn-sm empty-list-action-btn" id="btn-create-first-song">${t('sidebar.composeNewBtn')}</button>
        `;
        const createBtn = emptyLi.querySelector('#btn-create-first-song');
        if (createBtn) createBtn.addEventListener('click', () => createNewSong());
        fragment.appendChild(emptyLi);
        songListEl.appendChild(fragment);
        return;
    }

    filtered.forEach(tune => {
        const li = document.createElement('li');
        li.className = 'song-item my-song-item';
        if (currentSong && tune.id === currentSong.id) li.classList.add('active');
        li.dataset.id = tune.id;

        const isPublic = Number(tune.is_public) === 1;
        const isLocalOnly = !tune.isCloud || tune.syncStatus === 'pending';
        const isRemixTune = Boolean(tune.parent_id || tune.parent_author);
        const visBadge = isPublic
            ? `<span class="badge-tag tag-vis-public" title="${escapeHTML(t('toasts.madePublic'))}">${t('sidebar.badgePublic')}</span>`
            : `<span class="badge-tag tag-vis-private" title="${escapeHTML(t('toasts.madePrivate'))}">${t('sidebar.badgePrivate')}</span>`;

        const hasNotes = Array.isArray(tune.notes) && tune.notes.length > 0;
        let myTessBadges = '';
        let myMetricsMeta = '';
        let myPreviewBtnHtml = '';
        if (hasNotes) {
            const tess = getCachedSongTessitura(tune);
            const rBadge = tess.rangeType === 'octave1'
                ? `<span class="badge-range-oct1">${t('sidebar.badgeOctave1')}</span>`
                : `<span class="badge-range-oct12">${t('sidebar.badgeOctave12')}</span>`;
            const hBadge = tess.hasHalfHole ? `<span class="badge-half-hole">${t('sidebar.badgeHalfHole')}</span>` : '';
            myTessBadges = `${rBadge} ${hBadge}`;
            myMetricsMeta = `<span>• 📏 ${tess.measuresCount}c (${tess.durationFormatted})</span>`;

            const isPv = sidebarController.getCurrentPreviewSongId() === tune.id;
            myPreviewBtnHtml = `
                <button type="button" class="btn-sidebar-preview ${isPv ? 'playing' : ''}" data-id="${tune.id}" title="${isPv ? escapeHTML(t('sidebar.stopPreviewTitle')) : escapeHTML(t('sidebar.previewTitle'))}">
                    <svg viewBox="0 0 24 24" class="icon-pv-play" width="12" height="12" fill="currentColor" style="display: ${isPv ? 'none' : 'block'};"><polygon points="6 4 18 12 6 20 6 4"></polygon></svg>
                    <svg viewBox="0 0 24 24" class="icon-pv-stop" width="12" height="12" fill="currentColor" style="display: ${isPv ? 'block' : 'none'};"><rect x="6" y="6" width="12" height="12"></rect></svg>
                </button>
            `;
        }

        li.innerHTML = `
            <div class="song-item-info">
                <div class="song-item-title-row">
                    <span class="song-item-title">${escapeHTML(tune.title)}</span>
                </div>
                <span class="song-item-meta">${escapeHTML(tune.artist || t('editor.traditional'))}</span>
                <div class="song-item-metrics">
                    <span class="badge-key">${t('sidebar.keyPrefix', { key: tune.key || 'D' })}</span>
                    <span>• ${tune.tempo || 110} BPM</span>
                    ${myMetricsMeta}
                    ${tune.isCloud && tune.likes ? `<span class="song-item-likes">• ❤️ ${tune.likes}</span>` : ''}
                </div>
                <div class="song-badges">
                    <span class="badge-tag tag-mysong">${t('sidebar.badgeMy')}</span>
                    ${visBadge}
                    ${isRemixTune ? `<span class="badge-tag tag-remix" title="${escapeHTML(t('sidebar.variationOf', { parent: tune.parent_author || 'Original' }))}">🔀 Remix</span>` : ''}
                    ${isLocalOnly ? `<span class="badge-offline-sync" title="${t('sidebar.localOnlyTitle')}">${t('sidebar.badgeLocal')}</span>` : ''}
                    ${myTessBadges}
                </div>
            </div>
            <div class="song-item-actions">
                ${myPreviewBtnHtml}
                ${tune.isCloud ? `
                    <button type="button" class="btn-icon btn-toggle-vis ${isPublic ? 'is-public' : ''}" title="${isPublic ? t('toasts.madePrivate') : t('toasts.madePublic')}">
                        ${isPublic ? '🔒' : '🚀'}
                    </button>
                ` : (currentBard ? `
                    <button type="button" class="btn-icon btn-upload-cloud" title="${t('sidebar.syncCloudTitle')}">
                        ☁️
                    </button>
                ` : '')}
                <button type="button" class="btn-icon delete btn-delete-mysong" title="${t('sidebar.deleteTuneTitle')}">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;

        const btnPv = li.querySelector('.btn-sidebar-preview');
        if (btnPv) {
            btnPv.onclick = (e) => {
                e.stopPropagation();
                startSongPreview(tune.id, btnPv);
            };
        }

        // Abrir ao clicar
        li.addEventListener('click', async (e) => {
            if (e.target.closest('.song-item-actions')) return;

            if (tune.isCloud) {
                // Se notas já estão em memória
                const inMem = songs.find(s => s.id === tune.id);
                if (inMem && Array.isArray(inMem.notes) && inMem.notes.length > 0) {
                    inMem.is_public = tune.is_public;
                    inMem.isCloud = true;
                    inMem.syncStatus = 'synced';
                    selectSong(inMem.id);
                    return;
                }
                // Senão, busca notas completas na API
                try {
                    const fullRes = await fetch(`/api/tunes/${tune.id}`, { credentials: 'include' });
                    if (!fullRes.ok) throw new Error('Falha ao abrir da nuvem');
                    const fullTune = await fullRes.json();
                    fullTune.isCloud = true;
                    fullTune.isCurated = false;
                    fullTune.syncStatus = 'synced';
                    const exIdx = songs.findIndex(s => s.id === fullTune.id);
                    if (exIdx !== -1) songs[exIdx] = fullTune;
                    else songs.unshift(fullTune);
                    selectSong(fullTune.id);
                } catch (err) {
                    showNotificationToast(t('toasts.cloudOpenError', { error: err.message }));
                }
            } else {
                selectSong(tune.id);
            }
        });

        // Alternar visibilidade
        const toggleVisBtn = li.querySelector('.btn-toggle-vis');
        if (toggleVisBtn) {
            toggleVisBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (toggleVisBtn.disabled) return;
                toggleVisBtn.disabled = true;
                const newVis = !isPublic;
                try {
                    const activeLocal = (currentSong && currentSong.id === tune.id)
                        ? currentSong
                        : userSongs.find(s => s.id === tune.id);

                    let vRes;
                    if (activeLocal) {
                        clearTimeout(autoSyncDebounceTimer);
                        const author = (currentBard ? (currentBard.displayName || currentBard.username) : '') || activeLocal.author_name || 'Bardo Viajante';
                        const payload = {
                            id: activeLocal.id,
                            title: activeLocal.title || tune.title,
                            artist: activeLocal.artist || t('editor.traditional'),
                            key: activeLocal.key || 'D',
                            tempo: activeLocal.tempo || 110,
                            timeSignature: activeLocal.timeSignature || '4/4',
                            category: activeLocal.category || 'celtic',
                            difficulty: activeLocal.difficulty || 'iniciante',
                            rhythm: activeLocal.rhythm || 'reel',
                            notes: Array.isArray(activeLocal.notes) ? activeLocal.notes : [],
                            author_name: author,
                            accompaniment: activeLocal.accompaniment || null,
                            is_public: newVis ? 1 : 0,
                            parent_id: activeLocal.parent_id || null,
                            parent_author: activeLocal.parent_author || null
                        };
                        vRes = await fetch(`/api/tunes/${encodeURIComponent(tune.id)}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify(payload)
                        });
                        if (vRes.status === 404) {
                            vRes = await fetch('/api/tunes', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify(payload)
                            });
                        }
                    } else {
                        vRes = await fetch(`/api/tunes/${encodeURIComponent(tune.id)}/visibility`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ is_public: newVis })
                        });
                    }

                    const vData = await vRes.json().catch(() => ({}));
                    if (!vRes.ok) {
                        throw new Error(vData.error || 'Falha ao alterar visibilidade');
                    }

                    const updatedPub = vData.tune && vData.tune.is_public !== undefined
                        ? Number(vData.tune.is_public)
                        : (vData.is_public !== undefined ? Number(vData.is_public) : (newVis ? 1 : 0));
                    tune.is_public = updatedPub;

                    const memSong = songs.find(s => s.id === tune.id);
                    if (memSong) {
                        memSong.is_public = updatedPub;
                        memSong.isCloud = true;
                        memSong.syncStatus = 'synced';
                    }

                    const uIdx = userSongs.findIndex(s => s.id === tune.id);
                    if (uIdx !== -1) {
                        userSongs[uIdx].is_public = updatedPub;
                        userSongs[uIdx].isCloud = true;
                        userSongs[uIdx].syncStatus = 'synced';
                    }

                    if (currentSong && currentSong.id === tune.id) {
                        currentSong.is_public = updatedPub;
                        currentSong.isCloud = true;
                        currentSong.syncStatus = 'synced';
                        updateVisibilityToggleUI(updatedPub, isSongReadOnly(currentSong));
                    }

                    saveUserSongsSafely(userSongs, currentSong ? currentSong.id : null);
                    updateOfflineSyncIndicator();
                    showNotificationToast(updatedPub === 1 ? t('toasts.madePublic') : t('toasts.madePrivate'));
                    await fetchAndRenderMyCloudAndLocalTunes(query);
                } catch (err) {
                    toggleVisBtn.disabled = false;
                    showNotificationToast(t('toasts.visibilityChangeError', { error: err.message }));
                }
            });
        }

        // Upload de música local para a nuvem
        const uploadCloudBtn = li.querySelector('.btn-upload-cloud');
        if (uploadCloudBtn) {
            uploadCloudBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                uploadCloudBtn.disabled = true;
                uploadCloudBtn.textContent = '⏳';
                try {
                    const localSong = userSongs.find(s => s.id === tune.id) || tune;
                    const res = await fetch('/api/tunes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            id: localSong.id,
                            title: localSong.title,
                            artist: localSong.artist || 'Tradicional',
                            key: localSong.key || 'D',
                            tempo: localSong.tempo || 110,
                            timeSignature: localSong.timeSignature || '4/4',
                            category: localSong.category || 'celtic',
                            difficulty: localSong.difficulty || 'iniciante',
                            rhythm: localSong.rhythm || 'reel',
                            notes: localSong.notes || [],
                            accompaniment: localSong.accompaniment || null,
                            is_public: false // Começa privada
                        })
                    });
                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || 'Falha ao enviar para a nuvem');
                    }
                    localSong.isCloud = true;
                    localSong.syncStatus = 'synced';
                    localSong.is_public = 0;
                    const memSong = songs.find(s => s.id === localSong.id);
                    if (memSong) {
                        memSong.isCloud = true;
                        memSong.syncStatus = 'synced';
                        memSong.is_public = 0;
                    }
                    if (currentSong && currentSong.id === localSong.id) {
                        currentSong.isCloud = true;
                        currentSong.syncStatus = 'synced';
                        currentSong.is_public = 0;
                        updateVisibilityToggleUI(0, isSongReadOnly(currentSong));
                    }
                    saveUserSongsSafely(userSongs, currentSong ? currentSong.id : null);
                    updateOfflineSyncIndicator();
                    await fetchAndRenderMyCloudAndLocalTunes(query);
                } catch (err) {
                    uploadCloudBtn.disabled = false;
                    uploadCloudBtn.textContent = '☁️';
                    showNotificationToast(t('toasts.cloudSendError', { error: err.message }));
                }
            });
        }

        // Excluir música
        const delBtn = li.querySelector('.btn-delete-mysong');
        if (delBtn) {
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm(t('confirms.deleteTune', { title: tune.title }))) return;

                if (tune.isCloud) {
                    try {
                        const dRes = await fetch(`/api/tunes/${tune.id}`, {
                            method: 'DELETE',
                            credentials: 'include'
                        });
                        if (dRes.ok) {
                            songs = songs.filter(s => s.id !== tune.id);
                            fetchAndRenderMyCloudAndLocalTunes(query);
                            if (currentSong && currentSong.id === tune.id && songs.length > 0) {
                                selectSong(songs[0].id);
                            }
                        }
                    } catch (err) {
                        showNotificationToast(t('toasts.cloudDeleteError', { error: err.message }));
                    }
                } else {
                    deleteSong(tune.id);
                    fetchAndRenderMyCloudAndLocalTunes(query);
                }
            });
        }

        fragment.appendChild(li);
    });

    songListEl.appendChild(fragment);
}

// 4. Carregar música se presente na URL (?tune=XYZ)
async function checkSharedTuneInURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const tuneId = urlParams.get('tune');
    if (!tuneId) return;

    // 1. Já existe na lista local?
    const existing = songs.find(s => s.id === tuneId);
    if (existing) {
        selectSong(existing.id);
        return;
    }

    // 2. Tenta buscar na API comunitária
    try {
        const res = await fetch(`/api/tunes/${encodeURIComponent(tuneId)}`, { credentials: 'include' });
        if (!res.ok) {
            // Se retornar 403 (privada de terceiro), 404 (inexistente) ou outro erro
            showNotificationToast(t('toasts.tuneNotFound'));
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('tune');
            if (window.history && window.history.replaceState) {
                window.history.replaceState({}, '', cleanUrl.pathname || '/');
            }
            if (songs.length > 0) {
                selectSong(songs[0].id);
            }
            return;
        }

        const tune = await res.json();
        tune.isCurated = Boolean(tune.is_curated);
        tune.isCommunity = !tune.isCurated;

        const existsIdx = songs.findIndex(s => s.id === tune.id);
        if (existsIdx !== -1) {
            songs[existsIdx] = tune;
        } else {
            songs.unshift(tune);
        }

        renderSidebar();
        selectSong(tune.id);
        console.log('[Community] Música compartilhada carregada:', tune.title);
    } catch (e) {
        console.warn('[Community] Não foi possível carregar música compartilhada:', e);
        showNotificationToast(t('toasts.networkError'));
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('tune');
        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, '', cleanUrl.pathname || '/');
        }
        if (songs.length > 0) {
            selectSong(songs[0].id);
        }
    }
}

// ==========================================
// CONTROLE DE LIKES ÚNICOS E CATÁLOGO COMUNITÁRIO
// ==========================================

async function loadUserLikes() {
    if (!currentBard) {
        userLikedTuneIds.clear();
        return;
    }
    try {
        const res = await fetch('/api/user/likes', { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            userLikedTuneIds = new Set(data.likedTuneIds || []);
            renderSidebar();
        }
    } catch (e) {
        console.warn('[Likes] Erro ao buscar curtidas do usuário:', e);
    }
}

async function handleToggleLike(tuneId, buttonEl) {
    if (!currentBard) {
        showNotificationToast(t('toasts.loginToLike'));
        const btnOpen = document.getElementById('btn-open-user-modal');
        if (btnOpen) btnOpen.click();
        return;
    }

    try {
        const res = await fetch(`/api/tunes/${encodeURIComponent(tuneId)}/like`, {
            method: 'POST',
            credentials: 'include'
        });
        const data = await res.json();
        if (res.ok) {
            if (data.liked) {
                userLikedTuneIds.add(tuneId);
            } else {
                userLikedTuneIds.delete(tuneId);
            }

            // Atualiza na memória local
            const target = songs.find(s => s.id === tuneId);
            if (target) target.likes = data.likes;

            // Atualiza visualmente todos os botões correspondentes na tela
            document.querySelectorAll(`.btn-like-community[data-id="${tuneId}"]`).forEach(btn => {
                const counter = btn.querySelector('.like-count');
                if (counter) counter.textContent = data.likes;
                if (data.liked) {
                    btn.classList.add('liked');
                    btn.title = t('sidebar.unlikeTitle');
                    btn.innerHTML = `❤️ <span class="like-count">${data.likes}</span>`;
                } else {
                    btn.classList.remove('liked');
                    btn.title = t('sidebar.likeTitle');
                    btn.innerHTML = `🤍 <span class="like-count">${data.likes}</span>`;
                }
            });
        } else {
            showNotificationToast(data.error || t('toasts.likeError'));
        }
    } catch (err) {
        console.warn('[Like] Erro:', err);
    }
}

async function syncCommunityTunesToCatalog() {
    try {
        const res = await fetch('/api/tunes?limit=100');
        if (!res.ok) return;
        const data = await res.json();
        const tunes = data.tunes || [];
        if (!Array.isArray(tunes) || tunes.length === 0) return;

        let hasNew = false;
        tunes.forEach(tune => {
            const existingIdx = songs.findIndex(s => s.id === tune.id);
            if (existingIdx !== -1) {
                songs[existingIdx].likes = tune.likes || 0;
                songs[existingIdx].is_curated = tune.is_curated;
                if (tune.is_curated) songs[existingIdx].isCurated = true;
                if (currentSong && currentSong.id === tune.id) {
                    currentSong.likes = tune.likes || 0;
                    currentSong.is_curated = tune.is_curated;
                    if (tune.is_curated) currentSong.isCurated = true;
                    setEditorReadOnlyMode(isSongReadOnly(currentSong), currentSong);
                }
            } else {
                hasNew = true;
                songs.push({
                    id: tune.id,
                    title: tune.title,
                    artist: tune.artist || 'Tradicional',
                    key: tune.key || 'D',
                    tempo: tune.tempo || 110,
                    timeSignature: tune.time_signature || '4/4',
                    category: tune.category || 'celtic',
                    difficulty: tune.difficulty || 'iniciante',
                    rhythm: tune.rhythm || 'reel',
                    author_name: tune.author_name || 'Bardo',
                    likes: tune.likes || 0,
                    is_curated: Boolean(tune.is_curated),
                    isCurated: Boolean(tune.is_curated),
                    isCommunity: !tune.is_curated,
                    notes: []
                });
            }
        });

        if (hasNew || tunes.length > 0) {
            renderSidebar();
        }
    } catch (e) {
        console.warn('[Catalog] Falha ao sincronizar músicas da comunidade:', e);
    }
}

// 5. Renderizar lista de músicas da comunidade na Sidebar
async function fetchAndRenderCommunityTunes(query = '') {
    songListEl.innerHTML = `
        <li class="empty-list-state loading">
            <span>${t('sidebar.searchingCommunity')}</span>
        </li>
    `;

    try {
        let sortParam = 'popular';
        if (currentSongSort === 'remixes') sortParam = 'remixes';
        else if (currentSongSort === 'title-asc' || currentSongSort === 'title-desc') sortParam = 'title';
        const res = await fetch(`/api/tunes?q=${encodeURIComponent(query)}&sort=${sortParam}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Servidor da comunidade indisponível');
        const data = await res.json();
        const tunes = data.tunes || [];
        window.communityTunesCache = tunes;
        currentFilteredSongs = tunes;

        if (songsCountBadge) {
            songsCountBadge.textContent = t('sidebar.communityCount', { count: tunes.length });
        }

        if (tunes.length === 0) {
            songListEl.innerHTML = `
                <li class="empty-list-state">
                    <p>${t('sidebar.emptySearchCommunity')}</p>
                    <button type="button" class="btn btn-primary btn-sm empty-list-action-btn" id="btn-be-first-sharer">${t('sidebar.beFirstSharer')}</button>
                </li>
            `;
            const beFirstBtn = songListEl.querySelector('#btn-be-first-sharer');
            if (beFirstBtn) beFirstBtn.addEventListener('click', () => {
                if (btnOpenShareModal) btnOpenShareModal.click();
            });
            return;
        }

        const fragment = document.createDocumentFragment();

        tunes.forEach(tune => {
            const li = document.createElement('li');
            li.className = 'song-item community-song-item';
            if (currentSong && tune.id === currentSong.id) li.classList.add('active');
            li.dataset.id = tune.id;

            const isCuratedTune = Boolean(tune.is_curated);
            const badgeTagHtml = isCuratedTune
                ? `<span class="badge-tag tag-curated-official">⭐ ${t('sidebar.curatedOfficial')}</span>`
                : `<span class="badge-tag tag-community">${t('sidebar.filterCommunity')}</span>`;

            const canAdminModerate = Boolean(currentBard && currentBard.isAdmin);
            const adminActionsHtml = canAdminModerate ? `
                <button type="button" class="btn-admin-delete-tune" data-id="${tune.id}" data-title="${escapeHTML(tune.title)}" title="[Admin] ${escapeHTML(t('sidebar.deleteTuneTitle'))}">
                    🗑️
                </button>
            ` : '';

            const hasLiked = userLikedTuneIds.has(tune.id);
            const heartIcon = hasLiked ? '❤️' : '🤍';

            let authorMeta = tune.author_name ? t('sidebar.byAuthor', { author: escapeHTML(tune.author_name) }) : '';
            if (tune.parent_author) {
                authorMeta += t('sidebar.variationOf', { parent: escapeHTML(tune.parent_author) });
            }

            li.innerHTML = `
                <div class="song-item-info">
                    <div class="song-item-title-row">
                        <span class="song-item-title">${escapeHTML(tune.title)}</span>
                    </div>
                    <span class="song-item-meta">${escapeHTML(tune.artist || t('editor.traditional'))}${authorMeta}</span>
                    <div class="song-item-metrics">
                        <span class="badge-key">${t('sidebar.keyPrefix', { key: tune.key || 'D' })}</span>
                        <span>• ${tune.tempo || 110} BPM</span>
                        ${tune.remix_count ? `<span title="${tune.remix_count} variações">• 🔀 ${tune.remix_count}</span>` : ''}
                    </div>
                    <div class="song-badges">
                        ${badgeTagHtml}
                        ${tune.parent_author ? `<span class="badge-tag tag-remix" title="${escapeHTML(t('sidebar.variationOf', { parent: tune.parent_author }))}">🔀 Remix</span>` : ''}
                    </div>
                </div>
                <div class="song-item-actions">
                    <button type="button" class="btn-like-community ${hasLiked ? 'liked' : ''}" data-id="${tune.id}" title="${hasLiked ? t('sidebar.unlikeTitle') : t('sidebar.likeTitle')}">
                        ${heartIcon} <span class="like-count">${tune.likes || 0}</span>
                    </button>
                    ${adminActionsHtml}
                </div>
            `;

            // Ao clicar no card, carrega e seleciona a música
            li.addEventListener('click', async (e) => {
                if (e.target.closest('.btn-like-community') || e.target.closest('.btn-admin-delete-tune')) return;

                // Se a música completa já está na memória
                const inMem = songs.find(s => s.id === tune.id);
                if (inMem && Array.isArray(inMem.notes) && inMem.notes.length > 0) {
                    selectSong(inMem.id);
                    return;
                }

                // Senão, busca o objeto completo com notes via API
                try {
                    const fullRes = await fetch(`/api/tunes/${tune.id}`);
                    if (!fullRes.ok) throw new Error('Falha ao abrir');
                    const fullTune = await fullRes.json();
                    fullTune.isCurated = isCuratedTune;
                    fullTune.isCommunity = !isCuratedTune;
                    fullTune.user_id = tune.user_id || fullTune.user_id;
                    fullTune.author_name = tune.author_name || fullTune.author_name;
                    fullTune.parent_id = tune.parent_id || fullTune.parent_id;
                    fullTune.parent_author = tune.parent_author || fullTune.parent_author;
                    songs.unshift(fullTune);
                    selectSong(fullTune.id);
                } catch (err) {
                    showNotificationToast(t('toasts.communityLoadError', { error: err.message }));
                }
            });

            // Botão de Moderação do Administrador
            const adminDelBtn = li.querySelector('.btn-admin-delete-tune');
            if (adminDelBtn) {
                adminDelBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const songTitle = adminDelBtn.dataset.title;
                    if (!confirm(t('confirms.deleteTunePermanent', { title: songTitle }))) {
                        return;
                    }

                    try {
                        const delRes = await fetch(`/api/tunes/${tune.id}`, {
                            method: 'DELETE',
                            credentials: 'include'
                        });
                        const delData = await delRes.json();
                        if (!delRes.ok) throw new Error(delData.error || 'Erro ao excluir música.');
                        showNotificationToast(t('toasts.deleteSuccess'));
                        li.remove();
                    } catch (err) {
                        showNotificationToast(t('toasts.deleteError', { error: err.message }));
                    }
                });
            }

            // Curtir / Descurtir
            const likeBtn = li.querySelector('.btn-like-community');
            if (likeBtn) {
                likeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleToggleLike(tune.id, likeBtn);
                });
            }

            fragment.appendChild(li);
        });

        songListEl.innerHTML = '';
        songListEl.appendChild(fragment);

    } catch (err) {
        songListEl.innerHTML = `
            <li class="empty-list-state">
                <p>${escapeHTML(t('sidebar.communityError'))}</p>
                <p class="empty-list-sub">${escapeHTML(t('sidebar.communityErrorSub'))}</p>
            </li>
        `;
    }
}

// ==========================================================================
// FASE 8.3: MODO SOMENTE LEITURA, BOTÃO DE REMIX & SINCRONIZAÇÃO OFFLINE
// ==========================================================================

function isSongReadOnly(song) {
    if (!song) return false;
    // 1. Partituras da curadoria nativa são protegidas
    if (song.isCurated || song.is_curated) return true;

    // 2. Partituras da comunidade de outros usuários
    if (song.isCommunity) {
        if (!currentBard) return true;
        if (song.user_id && currentBard.id && song.user_id !== currentBard.id) return true;
    }

    // 3. Partituras da nuvem de outro usuário
    if (song.isCloud && song.user_id && currentBard && song.user_id !== currentBard.id) {
        return true;
    }

    return false;
}

function setEditorReadOnlyMode(isReadOnly, song) {
    isCurrentSongReadOnly = Boolean(isReadOnly);

    if (tabSheetEl) {
        tabSheetEl.classList.toggle('editor-readonly-active', isCurrentSongReadOnly);
    }

    // 1. Inputs de metadados
    if (songTitleEl) songTitleEl.readOnly = isCurrentSongReadOnly;
    if (songArtistEl) songArtistEl.readOnly = isCurrentSongReadOnly;
    if (whistleKeyEl) whistleKeyEl.disabled = isCurrentSongReadOnly;
    if (songTimeSignatureEl) songTimeSignatureEl.disabled = isCurrentSongReadOnly;
    if (songTempoEl) songTempoEl.readOnly = isCurrentSongReadOnly;
    if (songCategoryEl) songCategoryEl.disabled = isCurrentSongReadOnly;
    if (songDifficultyEl) songDifficultyEl.disabled = isCurrentSongReadOnly;
    if (songRhythmEl) songRhythmEl.disabled = isCurrentSongReadOnly;

    // 2. Editor de texto
    if (textNotesInputEl) {
        textNotesInputEl.readOnly = isCurrentSongReadOnly;
        if (isCurrentSongReadOnly) {
            textNotesInputEl.placeholder = t('readonly.textareaPlaceholder');
        } else {
            textNotesInputEl.placeholder = 'Ex: "D"d2fa "G"~b2gb | "A"c#de "D"f#2d2 :|';
        }
    }

    // 3. Botões destrutivos ou de inserção da toolbar
    if (btnClearTab) btnClearTab.disabled = isCurrentSongReadOnly;
    if (btnInsertBar) btnInsertBar.disabled = isCurrentSongReadOnly;
    if (btnInsertDoubleBar) btnInsertDoubleBar.disabled = isCurrentSongReadOnly;
    if (btnInsertRepeatStart) btnInsertRepeatStart.disabled = isCurrentSongReadOnly;
    if (btnInsertRepeatEnd) btnInsertRepeatEnd.disabled = isCurrentSongReadOnly;
    if (btnInsertLinebreak) btnInsertLinebreak.disabled = isCurrentSongReadOnly;
    if (btnPasteSelection) btnPasteSelection.disabled = isCurrentSongReadOnly || !clipboardNotes;
    if (btnDuplicateSelection) btnDuplicateSelection.disabled = isCurrentSongReadOnly || selectedIndices.size === 0;
    if (btnDeleteSelection) btnDeleteSelection.disabled = isCurrentSongReadOnly || selectedIndices.size === 0;

    // 3.1. Controle de Transposição e Acompanhamento
    const isStudio = (document.body.dataset.appMode || currentAppMode || 'studio') === 'studio';
    const btnOpenTranspose = document.getElementById('btn-open-transpose');
    if (btnOpenTranspose) {
        if (!isStudio) {
            btnOpenTranspose.style.display = 'none';
        } else {
            btnOpenTranspose.style.display = '';
            btnOpenTranspose.disabled = isCurrentSongReadOnly;
            btnOpenTranspose.title = isCurrentSongReadOnly
                ? t('readonly.transposeProtected')
                : t('transpose.title');
        }
    }

    const btnOpenBackingTracks = document.getElementById('btn-open-backing-tracks');
    if (btnOpenBackingTracks) {
        if (isStudio && isCurrentSongReadOnly) {
            btnOpenBackingTracks.disabled = true;
            btnOpenBackingTracks.title = t('readonly.backingProtected');
        } else {
            btnOpenBackingTracks.disabled = false;
            btnOpenBackingTracks.title = t('readonly.backingTitle');
        }
    }

    // 4. Banner de Modo Leitura
    const banner = document.getElementById('readonly-mode-banner');
    const creditsTag = document.getElementById('readonly-banner-credits');
    const titleEl = document.getElementById('readonly-banner-title');
    const subtextEl = document.getElementById('readonly-banner-subtext');

    if (banner) {
        if (isCurrentSongReadOnly) {
            if (titleEl) {
                titleEl.textContent = t('readonly.title');
            }
            if (creditsTag) {
                if (song && (song.parent_author || song.parent_id)) {
                    creditsTag.textContent = t('readonly.variationTag', { author: song.parent_author || 'Original' });
                    creditsTag.style.display = 'inline-flex';
                } else if (song && song.isCurated) {
                    creditsTag.textContent = t('readonly.curatedTag');
                    creditsTag.style.display = 'inline-flex';
                } else if (song && song.author_name) {
                    creditsTag.textContent = t('readonly.bardTag', { author: song.author_name });
                    creditsTag.style.display = 'inline-flex';
                } else {
                    creditsTag.style.display = 'none';
                }
            }
            if (subtextEl) {
                subtextEl.textContent = t('readonly.subtext');
            }
        }
        updateReadOnlyBannerVisibility();
    }

    // Estado visual no editor
    const editorHeader = document.querySelector('.editor-header');
    const modeTextPanel = document.getElementById('mode-text-panel');
    const keyboardPanel = document.getElementById('mode-buttons-panel');

    if (editorHeader) editorHeader.classList.toggle('editor-readonly-active', isCurrentSongReadOnly);
    if (modeTextPanel) modeTextPanel.classList.toggle('editor-readonly-active', isCurrentSongReadOnly);
    if (keyboardPanel) keyboardPanel.classList.toggle('editor-readonly-active', isCurrentSongReadOnly);

    updateVisibilityToggleUI(song ? song.is_public : (currentSong ? currentSong.is_public : 0), isCurrentSongReadOnly);
}

function updateReadOnlyBannerVisibility() {
    const banner = document.getElementById('readonly-mode-banner');
    if (!banner) return;
    const isStudio = (document.body.dataset.appMode || currentAppMode || 'studio') === 'studio';
    if (isCurrentSongReadOnly && isStudio) {
        banner.style.display = 'flex';
        const buttonsPanel = document.getElementById('mode-buttons-panel');
        const textPanel = document.getElementById('mode-text-panel');
        if (buttonsPanel && textPanel && buttonsPanel.style.display === 'none') {
            buttonsPanel.style.display = 'flex';
            textPanel.style.display = 'none';
        }
    } else {
        banner.style.display = 'none';
    }
}

async function remixCurrentSong() {
    if (!currentSong) return;

    // Se a música for da comunidade e ainda não tiver as notas completas em memória
    if (!Array.isArray(currentSong.notes) || currentSong.notes.length === 0) {
        try {
            const res = await fetch(`/api/tunes/${encodeURIComponent(currentSong.id)}`);
            if (res.ok) {
                const fullTune = await res.json();
                currentSong.notes = fullTune.notes || [];
                currentSong.timeSignature = fullTune.time_signature || currentSong.timeSignature;
            }
        } catch (e) {
            console.warn('[Remix] Erro ao carregar partitura completa:', e);
        }
    }

    const baseTitle = currentSong.title || 'Melodia';
    const originalAuthor = currentSong.author_name || currentSong.artist || 'Tradicional';
    const originalTuneId = currentSong.id;

    // Clona notas profundamente
    const clonedNotes = JSON.parse(JSON.stringify(currentSong.notes || []));

    // Gera novo ID único aleatório definitivo (8 caracteres)
    const newId = generateRandomTuneId(8);

    const bardName = currentBard 
        ? (currentBard.displayName || currentBard.display_name || currentBard.username) 
        : 'Meu Bardo';

    const remixSong = {
        id: newId,
        title: `${baseTitle} (${t('editor.variationSuffix')})`,
        artist: bardName,
        key: currentSong.key || 'D',
        timeSignature: currentSong.timeSignature || '4/4',
        tempo: currentSong.tempo || 110,
        category: currentSong.category || 'celtic',
        difficulty: currentSong.difficulty || 'iniciante',
        rhythm: currentSong.rhythm || 'reel',
        notes: clonedNotes,
        accompaniment: (() => {
            const acc = currentSong.accompaniment ? JSON.parse(JSON.stringify(currentSong.accompaniment)) : {
                metronomeActive: false,
                bodhranActive: false,
                bodhranVolume: 0.75,
                guitarActive: false,
                guitarVolume: 0.65,
                guitarInstrument: 'dadgad',
                rhythmStyle: 'auto',
                whistleVolume: 1.0
            };
            delete acc.droneActive;
            delete acc.droneVolume;
            return acc;
        })(),
        isCurated: false,
        isCommunity: false,
        isCloud: false,
        is_public: 0, // Criada inicialmente em modo privado
        parent_id: originalTuneId,
        parent_author: originalAuthor,
        parent_title: baseTitle,
        syncStatus: 'pending',
        created_at: new Date().toISOString()
    };

    userSongs.unshift(remixSong);
    songs.unshift(remixSong);
    const remixSaveRes = saveUserSongsSafely(userSongs, remixSong.id);
    if (remixSaveRes.quotaExceeded) {
        showNotificationToast(t('toasts.storageQuotaWarning'));
    }

    // Se estiver autenticado, tenta sincronizar imediatamente com a nuvem
    if (currentBard) {
        try {
            const res = await fetch('/api/tunes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    id: remixSong.id,
                    title: remixSong.title,
                    artist: remixSong.artist,
                    key: remixSong.key,
                    tempo: remixSong.tempo,
                    timeSignature: remixSong.timeSignature,
                    category: remixSong.category,
                    difficulty: remixSong.difficulty,
                    rhythm: remixSong.rhythm,
                    notes: remixSong.notes,
                    accompaniment: remixSong.accompaniment,
                    is_public: 0,
                    parent_id: remixSong.parent_id,
                    parent_author: remixSong.parent_author
                })
            });
            if (res.ok) {
                remixSong.syncStatus = 'synced';
                remixSong.isCloud = true;
                const uIdx = userSongs.findIndex(s => s.id === remixSong.id);
                if (uIdx !== -1) {
                    userSongs[uIdx].syncStatus = 'synced';
                    userSongs[uIdx].isCloud = true;
                }
                saveUserSongsSafely(userSongs, remixSong.id);
            }
        } catch (err) {
            console.warn('[Remix] Salvo localmente, pendente de sincronização:', err);
        }
    }

    updateOfflineSyncIndicator();
    renderSidebar();
    await selectSong(remixSong.id);

    showNotificationToast(t('toasts.variationCreated'));
}

function updateOfflineSyncIndicator() {
    const btnSync = document.getElementById('btn-sync-offline-tunes');
    if (!btnSync) return;

    const pendingTunes = (userSongs || []).filter(s => !s.isCurated && (s.syncStatus === 'pending' || !s.isCloud));
    if (currentBard && navigator.onLine && pendingTunes.length > 0) {
        btnSync.style.display = 'inline-block';
        btnSync.textContent = t('sidebar.syncOfflineCount', { count: pendingTunes.length });
    } else {
        btnSync.style.display = 'none';
    }
}

async function syncOfflineTunes(showToast = true) {
    if (!currentBard) {
        if (showToast) {
            showNotificationToast(t('toasts.loginToSync'));
            const userModalBtn = document.getElementById('btn-open-user-modal');
            if (userModalBtn) userModalBtn.click();
        }
        return;
    }

    if (!navigator.onLine) {
        if (showToast) showNotificationToast(t('toasts.noInternet'));
        return;
    }

    const pendingTunes = (userSongs || []).filter(s => !s.isCurated && (s.syncStatus === 'pending' || !s.isCloud));
    if (pendingTunes.length === 0) {
        if (showToast) showNotificationToast(t('toasts.allSynced'));
        return;
    }

    const btnSync = document.getElementById('btn-sync-offline-tunes');
    if (btnSync) btnSync.textContent = t('sidebar.syncing');

    let syncedCount = 0;
    for (const tune of pendingTunes) {
        try {
            const res = await fetch('/api/tunes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    id: tune.id,
                    title: tune.title,
                    artist: tune.artist,
                    key: tune.key,
                    tempo: tune.tempo,
                    timeSignature: tune.timeSignature,
                    category: tune.category,
                    difficulty: tune.difficulty,
                    rhythm: tune.rhythm,
                    notes: tune.notes,
                    is_public: tune.is_public !== undefined ? tune.is_public : 0,
                    parent_id: tune.parent_id || null,
                    parent_author: tune.parent_author || null
                })
            });
            if (res.ok) {
                tune.syncStatus = 'synced';
                tune.isCloud = true;
                syncedCount++;
            }
        } catch (e) {
            console.warn('[Sync] Falha ao enviar partitura:', tune.title, e);
        }
    }

    saveUserSongsSafely(userSongs, currentSong ? currentSong.id : null);
    updateOfflineSyncIndicator();
    renderSidebar();

    if (syncedCount > 0 && showToast) {
        showNotificationToast(t('toasts.syncedCount', { count: syncedCount }));
    }
}

function setupReadOnlyAndRemix() {
    const btnRemix = document.getElementById('btn-remix-tune');
    if (btnRemix) {
        btnRemix.addEventListener('click', () => {
            remixCurrentSong();
        });
    }
}

function setupOfflineSync() {
    const btnSync = document.getElementById('btn-sync-offline-tunes');
    if (btnSync) {
        btnSync.addEventListener('click', () => {
            syncOfflineTunes(true);
        });
    }

    window.addEventListener('online', () => {
        updateOfflineSyncIndicator();
        syncOfflineTunes(false);
    });

    window.addEventListener('offline', () => {
        updateOfflineSyncIndicator();
    });
}

// ==========================================================================
// 16. FASE 10: ÁUDIO POLIFÔNICO, BACKING TRACKS & DEMONSTRAÇÃO REAL (30s)
// ==========================================================================

function saveBackingSettings() {
    try {
        localStorage.setItem('celtic_backing_settings', JSON.stringify(backingSettings));
    } catch (e) {}
    saveCurrentSongAccompaniment();
}

function syncBackingModalUI() {
    if (toggleBodhran) toggleBodhran.checked = !!backingSettings.bodhranActive;
    if (sliderBodhranVol) sliderBodhranVol.value = Math.round((backingSettings.bodhranVolume || 0.75) * 100);
    if (valBodhranVol) valBodhranVol.textContent = `${sliderBodhranVol ? sliderBodhranVol.value : 75}%`;
    if (selectBodhranStyle) selectBodhranStyle.value = backingSettings.rhythmStyle || 'auto';
    if (selectCelticSwing) selectCelticSwing.value = backingSettings.swing || 'straight';

    if (toggleGuitar) toggleGuitar.checked = !!backingSettings.guitarActive;
    if (sliderGuitarVol) sliderGuitarVol.value = Math.round((backingSettings.guitarVolume || 0.65) * 100);
    if (valGuitarVol) valGuitarVol.textContent = `${sliderGuitarVol ? sliderGuitarVol.value : 65}%`;
    if (selectGuitarInstrument) selectGuitarInstrument.value = backingSettings.guitarInstrument || 'dadgad';

    if (sliderWhistleVol) sliderWhistleVol.value = Math.round((backingSettings.whistleVolume !== undefined ? backingSettings.whistleVolume : 1.0) * 100);
    if (valWhistleVol) valWhistleVol.textContent = `${sliderWhistleVol ? sliderWhistleVol.value : 100}%`;

    // Destaque visual no botão da control bar se algum acompanhamento estiver ligado
    if (btnOpenBackingTracks) {
        btnOpenBackingTracks.classList.toggle('active', !!(backingSettings.bodhranActive || backingSettings.guitarActive));
    }
}

function setupBackingTracksModal() {
    syncBackingModalUI();

    if (btnOpenBackingTracks) {
        btnOpenBackingTracks.addEventListener('click', () => {
            syncBackingModalUI();
            if (backingTracksModal) backingTracksModal.style.display = 'flex';
        });
    }

    const closeBacking = () => {
        if (backingTracksModal) backingTracksModal.style.display = 'none';
    };

    if (btnCloseBackingModal) btnCloseBackingModal.addEventListener('click', closeBacking);
    if (btnCloseBackingModalDone) btnCloseBackingModalDone.addEventListener('click', closeBacking);
    if (backingTracksModal) {
        backingTracksModal.addEventListener('click', (e) => {
            if (e.target === backingTracksModal) closeBacking();
        });
    }

    // Controles do Bodhrán
    if (toggleBodhran) {
        toggleBodhran.addEventListener('change', () => {
            backingSettings.bodhranActive = toggleBodhran.checked;
            saveBackingSettings();
            syncBackingModalUI();
        });
    }

    if (sliderBodhranVol) {
        sliderBodhranVol.addEventListener('input', () => {
            backingSettings.bodhranVolume = parseInt(sliderBodhranVol.value, 10) / 100;
            if (valBodhranVol) valBodhranVol.textContent = `${sliderBodhranVol.value}%`;
            saveBackingSettings();
        });
    }

    if (selectBodhranStyle) {
        selectBodhranStyle.addEventListener('change', () => {
            backingSettings.rhythmStyle = selectBodhranStyle.value;
            saveBackingSettings();
        });
    }

    if (selectCelticSwing) {
        selectCelticSwing.addEventListener('change', () => {
            backingSettings.swing = selectCelticSwing.value;
            saveBackingSettings();
        });
    }

    // Controles do Violão / Bouzouki
    if (toggleGuitar) {
        toggleGuitar.addEventListener('change', () => {
            backingSettings.guitarActive = toggleGuitar.checked;
            saveBackingSettings();
            syncBackingModalUI();
        });
    }

    if (sliderGuitarVol) {
        sliderGuitarVol.addEventListener('input', () => {
            backingSettings.guitarVolume = parseInt(sliderGuitarVol.value, 10) / 100;
            if (valGuitarVol) valGuitarVol.textContent = `${sliderGuitarVol.value}%`;
            saveBackingSettings();
        });
    }

    if (selectGuitarInstrument) {
        selectGuitarInstrument.addEventListener('change', () => {
            backingSettings.guitarInstrument = selectGuitarInstrument.value;
            saveBackingSettings();
        });
    }

    // Controle de Volume da Flauta (Mute / Solo)
    if (sliderWhistleVol) {
        sliderWhistleVol.addEventListener('input', () => {
            backingSettings.whistleVolume = parseInt(sliderWhistleVol.value, 10) / 100;
            if (valWhistleVol) valWhistleVol.textContent = `${sliderWhistleVol.value}%`;
            saveBackingSettings();
        });
    }

    // Botão Testar Sons
    if (btnTestBackingAudio) {
        btnTestBackingAudio.addEventListener('click', () => {
            initAudio();
            const now = audioCtx.currentTime;
            playBodhranHit(audioCtx, 'bass', now, backingSettings.bodhranVolume || 0.75);
            playBodhranHit(audioCtx, 'slap', now + 0.22, (backingSettings.bodhranVolume || 0.75) * 0.85);
            playCelticStringStrum(audioCtx, 'D', now + 0.1, 1.2, backingSettings.guitarVolume || 0.65, false, backingSettings.guitarInstrument || 'dadgad');
        });
    }
}

// --------------------------------------------------------------------------
// GRAVADOR E REPRODUTOR DE DEMONSTRAÇÃO EM ÁUDIO REAL (30s)
// --------------------------------------------------------------------------
let demoMediaRecorder = null;
let demoAudioChunks = [];
let demoRecordTimerInterval = null;
let demoRecordSecondsLeft = 30;
let recordedAudioBase64 = null;
let demoStream = null;

function setupAudioDemoRecorder() {
    // 1. Botão de Tocar Demo no Banner
    if (btnPlayAudioDemo) {
        btnPlayAudioDemo.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!currentSong) return;
            const demoUrl = currentSong.audio_demo || currentSong.audioDemo;
            if (!demoUrl) return;

            if (activeDemoAudioInstance && !activeDemoAudioInstance.paused) {
                activeDemoAudioInstance.pause();
                btnPlayAudioDemo.classList.remove('playing');
                const lbl = btnPlayAudioDemo.querySelector('span:last-child');
                if (lbl) lbl.textContent = t('banner.authorDemo');
                return;
            }

            // Parar o sequenciador se estiver tocando para não encavalar
            if (isPlaying) pausePlayback();

            if (!activeDemoAudioInstance || activeDemoAudioInstance.src !== demoUrl) {
                activeDemoAudioInstance = new Audio(demoUrl);
                activeDemoAudioInstance.addEventListener('ended', () => {
                    btnPlayAudioDemo.classList.remove('playing');
                    const lbl = btnPlayAudioDemo.querySelector('span:last-child');
                    if (lbl) lbl.textContent = t('banner.authorDemo');
                });
            }

            activeDemoAudioInstance.play().then(() => {
                btnPlayAudioDemo.classList.add('playing');
                const lbl = btnPlayAudioDemo.querySelector('span:last-child');
                if (lbl) lbl.textContent = t('banner.pauseDemo');
            }).catch(err => {
                console.warn('Falha ao reproduzir áudio demo:', err);
            });
        });
    }

    // 2. Abrir Modal de Gravação
    if (btnOpenDemoRecorder) {
        btnOpenDemoRecorder.addEventListener('click', (e) => {
            e.stopPropagation();
            openAudioDemoModal();
        });
    }

    const closeDemoModal = () => {
        stopDemoRecording(true);
        if (audioDemoModal) audioDemoModal.style.display = 'none';
    };

    if (btnCloseDemoModal) btnCloseDemoModal.addEventListener('click', closeDemoModal);
    if (btnCloseDemoModalOk) btnCloseDemoModalOk.addEventListener('click', closeDemoModal);
    if (audioDemoModal) {
        audioDemoModal.addEventListener('click', (e) => {
            if (e.target === audioDemoModal) closeDemoModal();
        });
    }

    // Iniciar Gravação
    if (btnStartRecordDemo) {
        btnStartRecordDemo.addEventListener('click', startDemoRecording);
    }

    // Parar Gravação
    if (btnStopRecordDemo) {
        btnStopRecordDemo.addEventListener('click', () => stopDemoRecording(false));
    }

    // Descartar / Regravar
    if (btnDiscardRecordDemo) {
        btnDiscardRecordDemo.addEventListener('click', () => {
            recordedAudioBase64 = null;
            if (demoAudioPlayer) demoAudioPlayer.src = '';
            if (demoRecorderBox) demoRecorderBox.style.display = 'block';
            if (demoPreviewBox) demoPreviewBox.style.display = 'none';
            resetDemoTimerUI();
        });
    }

    // Salvar Demonstração
    if (btnSaveRecordDemo) {
        btnSaveRecordDemo.addEventListener('click', saveDemoAudioToSong);
    }

    // Remover Demonstração Existente
    if (btnDeleteSavedDemo) {
        btnDeleteSavedDemo.addEventListener('click', deleteSavedDemoFromSong);
    }
}

function openAudioDemoModal() {
    resetDemoTimerUI();
    recordedAudioBase64 = null;

    const hasDemo = currentSong && (currentSong.audio_demo || currentSong.audioDemo);
    if (hasDemo) {
        if (demoExistingBox) demoExistingBox.style.display = 'block';
    } else {
        if (demoExistingBox) demoExistingBox.style.display = 'none';
    }

    if (demoRecorderBox) demoRecorderBox.style.display = 'block';
    if (demoPreviewBox) demoPreviewBox.style.display = 'none';
    if (audioDemoModal) audioDemoModal.style.display = 'flex';
}

function resetDemoTimerUI() {
    demoRecordSecondsLeft = 30;
    if (demoTimerDisplay) demoTimerDisplay.textContent = '00:30';
    if (demoProgressBar) demoProgressBar.style.width = '0%';
    if (btnStartRecordDemo) btnStartRecordDemo.style.display = 'inline-block';
    if (btnStopRecordDemo) btnStopRecordDemo.style.display = 'none';
}

async function startDemoRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotificationToast(t('toasts.noMicSupport'));
        return;
    }

    try {
        demoStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        let mimeType = 'audio/webm;codecs=opus';
        if (window.MediaRecorder && !MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/ogg;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = '';
            }
        }

        demoMediaRecorder = mimeType ? new MediaRecorder(demoStream, { mimeType }) : new MediaRecorder(demoStream);
        demoAudioChunks = [];

        demoMediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                demoAudioChunks.push(e.data);
            }
        };

        demoMediaRecorder.onstop = () => {
            if (demoStream) {
                demoStream.getTracks().forEach(t => t.stop());
                demoStream = null;
            }
            if (demoAudioChunks.length > 0) {
                const blob = new Blob(demoAudioChunks, { type: demoMediaRecorder.mimeType || 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    recordedAudioBase64 = reader.result;
                    if (demoAudioPlayer) {
                        demoAudioPlayer.src = recordedAudioBase64;
                    }
                    if (demoRecorderBox) demoRecorderBox.style.display = 'none';
                    if (demoPreviewBox) demoPreviewBox.style.display = 'block';
                };
                reader.readAsDataURL(blob);
            }
        };

        demoMediaRecorder.start(200);

        if (btnStartRecordDemo) btnStartRecordDemo.style.display = 'none';
        if (btnStopRecordDemo) btnStopRecordDemo.style.display = 'inline-block';

        // Timer regressivo de 30 segundos
        demoRecordSecondsLeft = 30;
        clearInterval(demoRecordTimerInterval);
        demoRecordTimerInterval = setInterval(() => {
            demoRecordSecondsLeft--;
            const formatted = `00:${demoRecordSecondsLeft < 10 ? '0' : ''}${Math.max(0, demoRecordSecondsLeft)}`;
            if (demoTimerDisplay) demoTimerDisplay.textContent = formatted;
            if (demoProgressBar) {
                const pct = ((30 - demoRecordSecondsLeft) / 30) * 100;
                demoProgressBar.style.width = `${pct}%`;
            }

            if (demoRecordSecondsLeft <= 0) {
                clearInterval(demoRecordTimerInterval);
                stopDemoRecording(false);
            }
        }, 1000);

    } catch (err) {
        console.warn('Erro ao acessar microfone para demo:', err);
        showNotificationToast(t('toasts.micAccessError'));
    }
}

function stopDemoRecording(isCancel = false) {
    clearInterval(demoRecordTimerInterval);
    if (demoMediaRecorder && demoMediaRecorder.state === 'recording') {
        if (isCancel) {
            demoAudioChunks = [];
        }
        demoMediaRecorder.stop();
    }
    if (demoStream) {
        demoStream.getTracks().forEach(t => t.stop());
        demoStream = null;
    }
    resetDemoTimerUI();
}

async function saveDemoAudioToSong() {
    if (!currentSong || !recordedAudioBase64) return;

    currentSong.audio_demo = recordedAudioBase64;
    saveSongsToStorage();
    updateSongDisplayBanner(currentSong);

    // Se estiver conectado à nuvem e a música for sincronizada, envia para a API
    if (currentBard && currentSong.id && currentSong.isCloud) {
        try {
            await fetch(`/api/tunes/${encodeURIComponent(currentSong.id)}/demo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio_demo: recordedAudioBase64 })
            });
        } catch (e) {
            console.warn('Gravação salva localmente; sincronização na nuvem pendente:', e);
        }
    }

    if (audioDemoModal) audioDemoModal.style.display = 'none';
    showNotificationToast(t('toasts.demoSaved'));
}

async function deleteSavedDemoFromSong() {
    if (!currentSong) return;
    if (!confirm(t('confirms.deleteAudio'))) return;

    currentSong.audio_demo = null;
    currentSong.audioDemo = null;
    saveSongsToStorage();
    updateSongDisplayBanner(currentSong);

    if (currentBard && currentSong.id && currentSong.isCloud) {
        try {
            await fetch(`/api/tunes/${encodeURIComponent(currentSong.id)}/demo`, { method: 'DELETE' });
        } catch (e) {}
    }

    if (audioDemoModal) audioDemoModal.style.display = 'none';
    showNotificationToast(t('toasts.demoRemoved'));
}

// Exportação global para testes automatizados (E2E / Puppeteer), restrita a ambiente local/debug
if (typeof window !== 'undefined') {
    const isLocalOrDebug = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
        || new URLSearchParams(window.location.search).has('debug');
    if (isLocalOrDebug) {
        window.tinWhistleTest = {
            getCurrentSong: () => currentSong,
            getBackingSettings: () => backingSettings,
            getCurrentBard: () => currentBard,
            selectSong,
            createNewSong,
            toggleSongVisibility,
            saveCurrentSongAccompaniment,
            applySongAccompaniment
        };
    }
}





