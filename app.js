/* ==========================================================================
   CELTIC WHISTLE TABS - CONTROLADOR PRINCIPAL & ORQUESTRAÇÃO DE UI (ES6 MODULE)
   ========================================================================== */

import {
    STANDARD_FINGERINGS,
    NOTE_FREQUENCIES,
    WHISTLE_KEYS_DATA,
    NOTE_DISPLAY_NAMES,
    DEFAULT_SONGS,
    NOTE_TO_SEMITONES,
    SEMITONES_TO_NOTE,
    DRONE_KEY_FREQUENCIES,
    NOTE_STRINGS,
    ZOOM_LEVELS,
    ZOOM_LABELS,
    getWhistleKeyData,
    getNoteDisplayName,
    isNoteOctave2,
    getNoteNotationText,
    getOrnamentSymbol,
    cycleNextOrnament,
    getWhistleSemitoneOffset,
    calculateWhistleKeyDelta,
    getMeasureBeatsPerBar,
    escapeHTML
} from './src/config/whistleData.js';

import {
    loadCatalogAndUserSongs,
    persistUserSongs,
    loadSavedTheme,
    saveThemeToStorage,
    loadSavedDisplayPrefs,
    saveDisplayPrefsToStorage
} from './src/state/store.js';

import {
    getOrCreateNoiseBuffer,
    getTransposedFrequency,
    scheduleWhistleVoice,
    playMetronomeClickOnContext,
    playHitFeedbackOnContext
} from './src/audio/synthEngine.js';

import {
    playBodhranHit,
    playCelticStringStrum,
    scheduleBackingTrackStep,
    inferCelticChord
} from './src/audio/backingTracks.js';

import {
    getSharedAudioBuffer,
    detectWhistlePitch,
    autoCorrelatePitch,
    noteFromPitchVal,
    frequencyFromNoteNumberVal,
    centsOffFromPitchVal
} from './src/audio/pitchEngine.js';

import {
    parseStringOfNotes as parseStringOfNotesForKey,
    noteObjToNotation,
    noteKeyToNotation
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
    createMeasureBarSVG,
    getDurationSymbol,
    createMiniFingeringSVG
} from './src/ui/svgTemplates.js';

function updateTextInputHelp(whistleKey) {
    const helpEl = document.querySelector('.text-input-help');
    if (!helpEl) return;
    const keyData = getWhistleKeyData(whistleKey);
    helpEl.innerHTML = `<strong>Nova Notação (${keyData.name}):</strong> ${keyData.helpText}`;
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
let repeatHasPlayed = false; // Controle de repetição no playback

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

// Estado interno do Play-Along
let isPlayAlongRunning = false;
let playAlongMode = 'step'; // 'step' (espera a nota) | 'flow' (no ritmo / tempo real)
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
let playAlongFlowStepPending = false;
let playAlongFlowNoteWasHit = false;
let playAlongFlowRestViolated = false;

// Controle de articulação, pausas e notas repetidas
let playAlongWaitingForRelease = false;
let playAlongReleaseSilenceCount = 0;
let playAlongRestSilenceCount = 0;

// Limiar adaptativo de corte de ruído (Noise Gate)
let micNoiseThreshold = parseFloat(localStorage.getItem('whistle_noise_threshold')) || 0.035;
let isCalibratingNoise = false;
let calibRafId = null;

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
// ESTADO & ELEMENTOS DA FASE 10: ÁUDIO POLIFÔNICO & BACKING TRACKS
// ==========================================================================
let backingSettings = {
    bodhranActive: true,
    bodhranVolume: 0.75,
    guitarActive: true,
    guitarVolume: 0.65,
    guitarInstrument: 'dadgad',
    rhythmStyle: 'auto',
    whistleVolume: 1.0
};

try {
    const savedBacking = localStorage.getItem('celtic_backing_settings');
    if (savedBacking) {
        backingSettings = Object.assign(backingSettings, JSON.parse(savedBacking));
    }
} catch (e) {}

const btnOpenBackingTracks = document.getElementById('btn-open-backing-tracks');
const backingTracksModal = document.getElementById('backing-tracks-modal');
const btnCloseBackingModal = document.getElementById('btn-close-backing-modal');
const btnCloseBackingModalDone = document.getElementById('btn-close-backing-modal-done');
const btnTestBackingAudio = document.getElementById('btn-test-backing-audio');

const toggleBodhran = document.getElementById('toggle-bodhran');
const sliderBodhranVol = document.getElementById('slider-bodhran-vol');
const valBodhranVol = document.getElementById('val-bodhran-vol');
const selectBodhranStyle = document.getElementById('select-bodhran-style');

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

// 3. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
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
    setupDynamicSongHeader();
    setupBackingTracksModal();
    setupAudioDemoRecorder();
    setupPhase4VisualsAndExport();
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
    const loaded = loadCatalogAndUserSongs();
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
    updateOfflineSyncIndicator();
}

// 4. OPERAÇÕES DE MÚSICA (CRUD)
function createNewSong() {
    const id = 'user-song-' + Date.now();
    const bardAuthor = currentBard 
        ? (currentBard.displayName || currentBard.display_name || currentBard.username) 
        : 'Compositor';
    const newSong = {
        id: id,
        title: 'Minha Composição',
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
        notes: []
    };
    userSongs.unshift(newSong);
    songs.unshift(newSong);
    saveSongsToStorage();
    updateOfflineSyncIndicator();
    renderSidebar();
    selectSong(id);
    expandEditorHeader();
    if (songTitleEl) {
        songTitleEl.focus();
        songTitleEl.select();
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
            if (isCurrentSongReadOnly) {
                if (typeof showToast === 'function') {
                    showToast('Música em modo protegido (leitura). Use "Remixar" para editar.', 'info');
                } else {
                    alert('Música em modo protegido (leitura). Use "Remixar" para editar.');
                }
                const readonlyBanner = document.getElementById('readonly-mode-banner');
                if (readonlyBanner) {
                    readonlyBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }
            if (document.body.dataset.appMode !== 'studio') {
                setAppMode('studio');
            }
            expandEditorHeader();
            if (editorHeader) {
                editorHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            if (songTitleEl) {
                songTitleEl.focus();
                songTitleEl.select();
            }
        });
    }
}

function updateSongDisplayBanner(song) {
    if (!song) return;
    if (bannerSongTitle) bannerSongTitle.textContent = song.title || 'Sem Título';
    if (bannerArtist) bannerArtist.textContent = `Compositor: ${song.artist || 'Tradicional'}`;
    if (bannerKey) bannerKey.textContent = `Tom: ${song.key || 'D'}`;
    if (bannerTime) bannerTime.textContent = `Compasso: ${song.timeSignature || '4/4'}`;
    if (bannerTempo) bannerTempo.textContent = `${song.tempo || 110} BPM`;

    // Título Compacto Mobile da Barra Superior (Fase 11)
    const mbTopTitle = document.getElementById('mobile-top-title');
    const mbTopKey = document.getElementById('mobile-top-key');
    if (mbTopTitle) mbTopTitle.textContent = song.title || 'Sem Título';
    if (mbTopKey) mbTopKey.textContent = `Tom ${song.key || song.whistleKey || 'D'}`;


    if (bannerSongBadge) {
        let catLabel = '🍀 Celta';
        let catClass = 'tag-celtic';
        if (song.category === 'pop') {
            catLabel = '🎬 Filmes';
            catClass = 'tag-pop';
        } else if (song.category === 'rock') {
            catLabel = '🎸 Rock';
            catClass = 'tag-rock';
        } else if (song.category === 'anime') {
            catLabel = '⛩️ Anime';
            catClass = 'tag-anime';
        } else if (song.category === 'other') {
            catLabel = '🎶 Outro';
            catClass = 'tag-other';
        } else if (song.category === 'traditional') {
            catLabel = '📜 Folclore';
            catClass = 'tag-traditional';
        }
        
        if (!song.isCurated) {
            catLabel = '⭐ Minha';
            catClass = 'tag-mysong';
        } else if (song.isUserModified) {
            catLabel = '✏️ Editada';
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
        btnPlayAudioDemo.querySelector('span:last-child').textContent = 'Demo do Autor';
    }

    if (btnOpenDemoRecorder) {
        // Apenas o autor da partitura pode gravar demo (ou ao criar nova música)
        const canRecord = !isSongReadOnly(song);
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
    if (!Array.isArray(song.notes) || song.notes.length === 0) {
        try {
            const res = await fetch(`/api/tunes/${encodeURIComponent(song.id)}`);
            if (res.ok) {
                const fullTune = await res.json();
                song.notes = fullTune.notes || [];
                song.timeSignature = fullTune.time_signature || song.timeSignature;
            }
        } catch (e) {
            console.warn('[Song] Falha ao carregar partitura da nuvem:', e);
        }
    }
    
    currentSong = song;
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
            if (confirm(`Deseja redefinir a música "${song.title}" para a versão original da curadoria?`)) {
                userSongs.splice(uIdx, 1);
                localStorage.setItem('celtic_whistle_tabs_user', JSON.stringify(userSongs));
                const original = (typeof CURATED_REPERTOIRE !== 'undefined') ? CURATED_REPERTOIRE.find(c => c.id === id) : null;
                if (original) {
                    const idx = songs.findIndex(s => s.id === id);
                    if (idx !== -1) songs[idx] = JSON.parse(JSON.stringify(original));
                }
                renderSidebar();
                selectSong(id);
                alert(`"${song.title}" restaurada para a partitura original de curadoria!`);
            }
            return;
        } else {
            alert('Esta música pertence ao repertório nativo curado da biblioteca e está em sua versão de referência.');
            return;
        }
    }
    
    if (confirm(`Deseja mesmo excluir a música "${song.title}"?`)) {
        stopPlayback();
        userSongs = userSongs.filter(s => s.id !== id);
        songs = songs.filter(s => s.id !== id);
        localStorage.setItem('celtic_whistle_tabs_user', JSON.stringify(userSongs));
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
    
    currentSong.title = songTitleEl.value || 'Sem Título';
    currentSong.artist = songArtistEl.value;
    currentSong.key = whistleKeyEl.value;
    if (songTimeSignatureEl) currentSong.timeSignature = songTimeSignatureEl.value;
    currentSong.tempo = parseInt(songTempoEl.value) || 120;
    if (songCategoryEl) currentSong.category = songCategoryEl.value;
    if (songDifficultyEl) currentSong.difficulty = songDifficultyEl.value;
    if (songRhythmEl) currentSong.rhythm = songRhythmEl.value;
    
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

// 5. RENDERIZAÇÃO DA SIDEBAR & FILTROS RICOS (FASE 3 & 8)
function renderSidebar() {
    updateActiveFiltersBadge();
    const query = (searchInput.value || '').toLowerCase().trim();

    // Se o filtro Comunidade estiver ativo, busca da API comunitária
    if (selectedCategory === 'community') {
        fetchAndRenderCommunityTunes(query);
        return;
    }

    // Se o filtro Minhas Músicas estiver ativo, busca da nuvem pessoal e mescla com locais
    if (selectedCategory === 'my-songs') {
        fetchAndRenderMyCloudAndLocalTunes(query);
        return;
    }

    songListEl.innerHTML = '';
    
    const filteredSongs = songs.filter(s => {
        // 1. Busca Textual
        const matchesQuery = !query || 
            (s.title && s.title.toLowerCase().includes(query)) || 
            (s.artist && s.artist.toLowerCase().includes(query)) ||
            (s.rhythm && s.rhythm.toLowerCase().includes(query));
            
        // 2. Categoria
        let matchesCategory = true;
        if (selectedCategory === 'favorites') matchesCategory = favoriteSongIds.has(s.id);
        else if (selectedCategory === 'celtic') matchesCategory = (s.category === 'celtic');
        else if (selectedCategory === 'pop') matchesCategory = (s.category === 'pop');
        else if (selectedCategory === 'rock') matchesCategory = (s.category === 'rock');
        else if (selectedCategory === 'anime') matchesCategory = (s.category === 'anime');
        else if (selectedCategory === 'other') matchesCategory = (s.category === 'other');
        else if (selectedCategory === 'my-songs') matchesCategory = (!s.isCurated || s.isUserModified);
        
        // 3. Dificuldade
        let matchesDifficulty = true;
        if (selectedDifficulty !== 'all') {
            matchesDifficulty = (s.difficulty === selectedDifficulty);
        }
        
        // 4. Ritmo
        let matchesRhythm = true;
        if (selectedRhythm !== 'all') {
            matchesRhythm = (s.rhythm === selectedRhythm);
        }
        
        return matchesQuery && matchesCategory && matchesDifficulty && matchesRhythm;
    });
    
    // Atualizar contador e status de filtros
    if (songsCountBadge) {
        songsCountBadge.textContent = `${filteredSongs.length} de ${songs.length} músicas`;
    }
    
    if (btnResetFilters) {
        const hasFilters = (query || selectedCategory !== 'all' || selectedDifficulty !== 'all' || selectedRhythm !== 'all');
        btnResetFilters.style.display = hasFilters ? 'inline' : 'none';
    }
    
    if (filteredSongs.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.style.padding = '20px 12px';
        emptyLi.style.textAlign = 'center';
        emptyLi.style.color = 'var(--text-muted)';
        emptyLi.style.fontSize = '0.85rem';
        emptyLi.innerHTML = `
            <p>Nenhuma música encontrada com os filtros atuais.</p>
            <button class="btn btn-secondary btn-sm" style="margin-top: 10px;">Limpar Filtros</button>
        `;
        const resetBtn = emptyLi.querySelector('button');
        if (resetBtn) resetBtn.addEventListener('click', resetSidebarFilters);
        songListEl.appendChild(emptyLi);
        return;
    }

    // 5. Ordenação do Repertório
    const diffWeights = { 'iniciante': 1, 'intermediario': 2, 'avancado': 3 };
    filteredSongs.sort((a, b) => {
        if (currentSongSort === 'popular') {
            return (b.likes || 0) - (a.likes || 0);
        } else if (currentSongSort === 'remixes') {
            return (b.remix_count || 0) - (a.remix_count || 0) || (b.likes || 0) - (a.likes || 0);
        } else if (currentSongSort === 'title-asc') {
            return (a.title || '').localeCompare(b.title || '', 'pt-BR');
        } else if (currentSongSort === 'title-desc') {
            return (b.title || '').localeCompare(a.title || '', 'pt-BR');
        } else if (currentSongSort === 'key') {
            return (a.key || 'D').localeCompare(b.key || 'D');
        } else if (currentSongSort === 'difficulty-asc') {
            return (diffWeights[a.difficulty] || 1) - (diffWeights[b.difficulty] || 1);
        } else if (currentSongSort === 'difficulty-desc') {
            return (diffWeights[b.difficulty] || 1) - (diffWeights[a.difficulty] || 1);
        }
        return 0; // default (ordem original da curadoria)
    });
    
    const fragment = document.createDocumentFragment();

    filteredSongs.forEach(song => {
        const li = document.createElement('li');
        li.className = 'song-item';
        if (currentSong && song.id === currentSong.id) {
            li.classList.add('active');
        }
        li.dataset.id = song.id;
        li.onclick = () => selectSong(song.id);
        
        // Badge de Categoria
        let catLabel = '🍀 Celta';
        let catClass = 'tag-celtic';
        if (song.isCommunity) {
            catLabel = '🌍 Comunidade';
            catClass = 'tag-community';
        } else if (song.category === 'pop') {
            catLabel = '🎬 Filmes';
            catClass = 'tag-pop';
        } else if (song.category === 'rock') {
            catLabel = '🎸 Rock';
            catClass = 'tag-rock';
        } else if (song.category === 'anime') {
            catLabel = '⛩️ Anime';
            catClass = 'tag-anime';
        } else if (song.category === 'other') {
            catLabel = '🎶 Outro';
            catClass = 'tag-other';
        } else if (song.category === 'traditional') {
            catLabel = '📜 Folclore';
            catClass = 'tag-traditional';
        }
        
        if (!song.isCurated && !song.isCommunity) {
            catLabel = '💻 Minha';
            catClass = 'tag-mysong';
        } else if (song.isUserModified) {
            catLabel = '✏️ Editada';
            catClass = 'tag-mysong';
        }
        
        // Estrelas de Dificuldade
        let diffLabel = '★☆☆';
        if (song.difficulty === 'intermediario') diffLabel = '★★☆';
        else if (song.difficulty === 'avancado') diffLabel = '★★★';
        
        // Rótulo de Ritmo
        const rhythmNames = {
            'jig': 'Jig',
            'reel': 'Reel',
            'waltz': 'Valsa',
            'polka': 'Polka',
            'air': 'Slow Air',
            'soundtrack': 'Trilha'
        };
        const rhythmLabel = rhythmNames[song.rhythm] || song.timeSignature || '';
        const isFav = favoriteSongIds.has(song.id);
        const hasLiked = userLikedTuneIds.has(song.id);
        const heartIcon = hasLiked ? '❤️' : '🤍';

        let authorMeta = song.author_name ? ` • Por ${escapeHTML(song.author_name)}` : '';
        if (song.parent_author) {
            authorMeta += ` (Variação de ${escapeHTML(song.parent_author)})`;
        }

        const isLocalOnly = !song.isCurated && !song.isCommunity && (song.syncStatus === 'pending' || !song.isCloud);
        const isRemixTune = Boolean(song.parent_id || song.parent_author);

        let actionsHtml = '';
        if (song.isCommunity) {
            const canAdmin = Boolean(currentBard && currentBard.isAdmin);
            const adminBtn = canAdmin ? `
                <button type="button" class="btn-admin-delete-tune" data-id="${song.id}" data-title="${escapeHTML(song.title)}" title="[Admin] Excluir tablatura" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 6px; color: #f87171; padding: 3px 6px; font-size: 0.75rem; cursor: pointer;">
                    🗑️
                </button>
            ` : '';
            actionsHtml = `
                <button type="button" class="btn-like-community ${hasLiked ? 'liked' : ''}" data-id="${song.id}" title="${hasLiked ? 'Descurtir partitura' : 'Curtir partitura'}" style="background: ${hasLiked ? 'rgba(244, 63, 94, 0.2)' : 'rgba(0,0,0,0.3)'}; border: 1px solid ${hasLiked ? 'rgba(244, 63, 94, 0.5)' : 'rgba(255,255,255,0.1)'}; border-radius: 6px; color: #f43f5e; padding: 3px 6px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 3px;">
                    ${heartIcon} <span class="like-count">${song.likes || 0}</span>
                </button>
                ${adminBtn}
            `;
        } else if (!song.isCurated) {
            actionsHtml = `
                <button class="btn-icon delete" title="Excluir Música">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
        } else if (song.isUserModified) {
            actionsHtml = `
                <button class="btn-icon reset" title="Restaurar Versão Original">
                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
                </button>
            `;
        } else {
            actionsHtml = `
                <span title="Música Oficial da Curadoria" style="color: var(--gold-primary); font-size: 13px; opacity: 0.6; padding-right: 4px;">✓</span>
            `;
        }

        li.innerHTML = `
            <div class="song-item-info">
                <div class="song-item-title-row">
                    <button type="button" class="btn-fav-star ${isFav ? 'active' : ''}" title="${isFav ? 'Remover dos favoritos' : 'Favoritar música'}">★</button>
                    <span class="song-item-title">${escapeHTML(song.title)}</span>
                </div>
                <span class="song-item-meta">${escapeHTML(song.artist || 'Tradicional')}${authorMeta} • ${song.key} • ${song.tempo} BPM</span>
                <div class="song-badges">
                    <span class="badge-tag ${catClass}">${catLabel}</span>
                    ${isRemixTune ? `<span class="badge-tag" style="background: rgba(245, 158, 11, 0.2); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.4);" title="Variação de ${escapeHTML(song.parent_author || 'Original')}">🔀 Remix</span>` : ''}
                    ${isLocalOnly ? `<span class="badge-offline-sync" title="Partitura guardada apenas na memória local deste aparelho">💾 Apenas local</span>` : ''}
                    <span class="badge-key">Tom ${song.key || 'D'}</span>
                    ${song.difficulty ? `<span class="badge-diff" title="Dificuldade: ${song.difficulty}">${diffLabel}</span>` : ''}
                    ${rhythmLabel ? `<span class="badge-rhythm">${rhythmLabel}</span>` : ''}
                    ${song.remix_count ? `<span class="badge-diff" title="${song.remix_count} variações criadas pela comunidade">🔀 ${song.remix_count}</span>` : ''}
                </div>
            </div>
            <div class="song-item-actions" style="opacity: 1; display: flex; align-items: center; gap: 6px;">
                ${actionsHtml}
            </div>
        `;
        
        const btnFav = li.querySelector('.btn-fav-star');
        if (btnFav) {
            btnFav.onclick = (e) => toggleFavorite(song.id, e);
        }

        const btnLike = li.querySelector('.btn-like-community');
        if (btnLike) {
            btnLike.onclick = (e) => {
                e.stopPropagation();
                handleToggleLike(song.id, btnLike);
            };
        }

        const adminDel = li.querySelector('.btn-admin-delete-tune');
        if (adminDel) {
            adminDel.onclick = async (e) => {
                e.stopPropagation();
                const songTitle = adminDel.dataset.title;
                if (!confirm(`[Moderação] Tem certeza que deseja excluir a música "${songTitle}" permanentemente da comunidade?`)) {
                    return;
                }
                try {
                    const delRes = await fetch(`/api/tunes/${song.id}`, { method: 'DELETE', credentials: 'include' });
                    const delData = await delRes.json();
                    if (!delRes.ok) throw new Error(delData.error || 'Erro ao excluir');
                    alert('Música removida com sucesso pela moderação.');
                    const idx = songs.findIndex(s => s.id === song.id);
                    if (idx !== -1) songs.splice(idx, 1);
                    li.remove();
                } catch (err) {
                    alert('Erro ao excluir: ' + err.message);
                }
            };
        }

        const btnDel = li.querySelector('.btn-icon.delete');
        if (btnDel) {
            btnDel.onclick = (e) => deleteSong(song.id, e);
        }
        const btnReset = li.querySelector('.btn-icon.reset');
        if (btnReset) {
            btnReset.onclick = (e) => deleteSong(song.id, e);
        }
        
        fragment.appendChild(li);
    });

    songListEl.appendChild(fragment);
}

function updatePrintSheetHeader(song) {
    if (!song) return;
    const printTitleEl = document.getElementById('print-sheet-title');
    const printArtistEl = document.getElementById('print-meta-artist');
    const printKeyEl = document.getElementById('print-meta-key');
    const printTimeEl = document.getElementById('print-meta-time');
    const printTempoEl = document.getElementById('print-meta-tempo');
    const printRhythmEl = document.getElementById('print-meta-rhythm');

    if (printTitleEl) printTitleEl.textContent = song.title || 'Melodia Sem Título';
    if (printArtistEl) printArtistEl.textContent = `Autor: ${song.artist || 'Tradicional'}`;
    if (printKeyEl) {
        const keyData = getWhistleKeyData(whistleKeyEl ? whistleKeyEl.value : song.key);
        printKeyEl.textContent = `Flauta em ${keyData.name || song.key || 'D'}`;
    }
    if (printTimeEl) printTimeEl.textContent = `Compasso: ${song.timeSignature || '4/4'}`;
    if (printTempoEl) printTempoEl.textContent = `${song.tempo || 110} BPM`;
    if (printRhythmEl) {
        const rMap = {
            'reel': 'Reel (4/4)',
            'jig': 'Jig (6/8)',
            'waltz': 'Valsa (3/4)',
            'polka': 'Polka (2/4)',
            'air': 'Slow Air',
            'soundtrack': 'Trilha Sonora',
            'other': 'Melodia'
        };
        printRhythmEl.textContent = rMap[song.rhythm] || (song.rhythm ? song.rhythm.toUpperCase() : 'Celta');
    }
}

function renderTab() {
    // Sincroniza o cabeçalho editorial de impressão
    if (currentSong) {
        updatePrintSheetHeader(currentSong);
    }

    // Remove notas anteriores, barras e quebras de linha
    const cards = tabSheetEl.querySelectorAll('.note-card, .line-break, .measure-bar-card');
    cards.forEach(c => c.remove());
    
    if (!currentSong || currentSong.notes.length === 0) {
        emptyMessageEl.style.display = 'flex';
        updateSelectionToolbar();
        return;
    }
    
    emptyMessageEl.style.display = 'none';

    if (playbackStartIndex >= currentSong.notes.length) {
        playbackStartIndex = 0;
    }
    
    // Injetar gradiente SVG global para meio-furo se não existir
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
    const fragment = document.createDocumentFragment();
    const currentKey = currentSong ? (currentSong.key || 'D') : (whistleKeyEl ? whistleKeyEl.value : 'D');
    const holeYPositions = [15, 30, 45, 60, 75, 90];
    const durLabels = {
        '0.25': 'Semicolcheia (0.25t)',
        '0.5': 'Colcheia (0.5t)',
        '1': 'Semínima (1t)',
        '1.5': 'Semínima pontuada (1.5t)',
        '2': 'Mínima (2t)',
        '3': 'Mínima pontuada (3t)',
        '4': 'Semibreve (4t)'
    };

    currentSong.notes.forEach((noteObj, index) => {
        // 1. Quebra de Linha
        if (noteObj.note === 'LINEBREAK') {
            const br = document.createElement('div');
            br.className = 'line-break';
            br.dataset.index = index;
            br.innerHTML = `
                <button class="line-break-btn" title="Remover quebra de linha">Quebra de Linha &times;</button>
            `;
            br.querySelector('.line-break-btn').onclick = (e) => {
                e.stopPropagation();
                removeNote(index);
            };
            fragment.appendChild(br);
            return;
        }

        // 2. Barras de Compasso (Measure Bars: BAR, DOUBLE_BAR, REPEAT_START, REPEAT_END)
        if (['BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END'].includes(noteObj.note)) {
            const barCard = document.createElement('div');
            barCard.className = `measure-bar-card ${selectedIndices.has(index) ? 'is-selected' : ''}`;
            barCard.dataset.index = index;
            barCard.title = `Barra de Compasso (${noteObj.note}) - Compasso #${measureNumber}`;
            
            barCard.innerHTML = `
                <button class="measure-bar-btn-delete" title="Excluir Barra">&times;</button>
                <div class="measure-number">${measureNumber}</div>
                ${createMeasureBarSVG(noteObj.note)}
            `;

            barCard.addEventListener('click', (e) => {
                if (e.target.closest('.measure-bar-btn-delete')) return;
                if (e.shiftKey && lastSelectedNoteIndex !== -1) {
                    selectRangeNotes(lastSelectedNoteIndex, index);
                } else {
                    selectSingleNote(index);
                }
            });

            barCard.querySelector('.measure-bar-btn-delete').onclick = (e) => {
                e.stopPropagation();
                if (isCurrentSongReadOnly) return;
                removeNote(index);
            };

            fragment.appendChild(barCard);
            measureNumber++;
            return;
        }

        // 3. Notas Musicais e Pausas (REST)
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
        card.title = 'Clique para selecionar / iniciar reprodução (Shift+Clique para selecionar bloco)';
        
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

        card.innerHTML = `
            <button class="note-card-delete" title="Remover">&times;</button>
            <div class="note-card-chord ${chordDisplay ? '' : 'empty'}" title="Clique para editar Acorde/Cifra">${escapeHTML(chordDisplay || '+')}</div>
            <div class="note-card-ornament ${ornamentDisplay ? '' : 'empty'}" data-type="${noteObj.ornament || ''}" title="Ornamento: ${noteObj.ornament || 'Nenhum'} (clique para alternar)">${ornamentDisplay}</div>
            <div class="${pitchClass}">${isRest ? 'Pausa' : displayName}</div>
            ${svgContent}
            <div class="note-card-duration-symbol" title="Duração: ${durTitle} - Clique para alterar" data-index="${index}">${getDurationSymbol(noteObj.duration)}</div>
            <input type="text" class="note-card-lyric" value="${escapeHTML(noteObj.lyric || '')}" placeholder="..." title="Sílaba da letra">
            <div class="note-card-duration-bar" data-duration="${noteObj.duration}"></div>
        `;
        
        // Clique no cartão (Seleção e Início de Reprodução)
        card.addEventListener('click', (e) => {
            if (e.target.closest('.note-card-delete') || 
                e.target.closest('.note-card-duration-symbol') || 
                e.target.closest('.note-card-lyric') ||
                e.target.closest('.note-card-chord') ||
                e.target.closest('.note-card-ornament')) {
                return;
            }
            
            if (e.shiftKey && lastSelectedNoteIndex !== -1) {
                selectRangeNotes(lastSelectedNoteIndex, index);
            } else {
                selectSingleNote(index);
            }

            setPlaybackStartIndex(index);
            
            if (!isPlaying) {
                playSingleNoteSound(noteObj);
            }
        });

        // Duplo clique: toca a nota
        card.addEventListener('dblclick', () => {
            playSingleNoteSound(noteObj);
        });

        // Clique no Acorde/Cifra
        const chordEl = card.querySelector('.note-card-chord');
        chordEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isCurrentSongReadOnly) return;
            const currentChord = noteObj.chord || '';
            const newChord = prompt('Digite o Acorde / Cifra para esta nota (ex: D, Em, G, A7) ou deixe em branco para remover:', currentChord);
            if (newChord !== null) {
                pushHistoryState('Alterar Acorde');
                noteObj.chord = newChord.trim();
                saveSongsToStorage();
                renderTab();
            }
        });

        // Clique no Ornamento (Alternar sequencialmente)
        const ornamentEl = card.querySelector('.note-card-ornament');
        ornamentEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isCurrentSongReadOnly) return;
            pushHistoryState('Alterar Ornamento');
            noteObj.ornament = cycleNextOrnament(noteObj.ornament);
            saveSongsToStorage();
            renderTab();
            playSingleNoteSound(noteObj);
        });

        // Deletar Nota
        card.querySelector('.note-card-delete').onclick = (e) => {
            e.stopPropagation();
            if (isCurrentSongReadOnly) return;
            removeNote(index);
        };

        // Alternar duração
        const durSymbol = card.querySelector('.note-card-duration-symbol');
        if (durSymbol) {
            durSymbol.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isCurrentSongReadOnly) return;
                pushHistoryState('Alterar Duração');
                const nextDurations = {
                    '0.5': 1.0,
                    '1': 2.0,
                    '1.0': 2.0,
                    '2': 4.0,
                    '2.0': 4.0,
                    '4': 0.5,
                    '4.0': 0.5
                };
                const currentDur = noteObj.duration !== undefined ? String(noteObj.duration) : '1';
                noteObj.duration = nextDurations[currentDur] || 1.0;
                saveSongsToStorage();
                renderTab();
                playSingleNoteSound(noteObj);
            });
        }

        // Editar letra
        const lyricInput = card.querySelector('.note-card-lyric');
        if (isCurrentSongReadOnly) {
            lyricInput.readOnly = true;
        } else {
            lyricInput.addEventListener('input', (e) => {
                currentSong.notes[index].lyric = e.target.value;
                saveSongsToStorage();
            });
        }
        lyricInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });
        lyricInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });
        
        fragment.appendChild(card);
    });
    
    tabSheetEl.appendChild(fragment);
    updateTextNotesInput();
    updateSelectionToolbar();
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
    const modeBtns = document.querySelectorAll('.mode-tab-btn');
    const textPanel = document.getElementById('mode-text-panel');
    const buttonsPanel = document.getElementById('mode-buttons-panel');
    
    if (!modeBtns.length || !textPanel || !buttonsPanel) return;
    
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const mode = btn.dataset.mode;
            if (mode === 'text') {
                textPanel.style.display = 'flex';
                buttonsPanel.style.display = 'none';
                if (textNotesInputEl) {
                    textNotesInputEl.focus();
                }
            } else {
                textPanel.style.display = 'none';
                buttonsPanel.style.display = 'flex';
            }
        });
    });
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
        const freq = getTransposedFrequency(noteObj.note, whistleKeyEl ? whistleKeyEl.value : 'D');
        if (freq > 0) {
            playWhistleSynth(freq, 0.4, audioCtx.currentTime, noteObj.ornament);
        }
    } catch (e) {
        console.error("Falha ao tocar áudio: ", e);
    }
}

// O sintetizador que cria a assinatura sonora da Tin Whistle celta com suporte a ornamentos
function playWhistleSynth(frequency, duration, startTime, ornament = null) {
    scheduleWhistleVoice(audioCtx, frequency, duration, startTime, ornament);
}

// Som do metrônomo para manter o tempo (com acento diferenciado no tempo forte do compasso)
function playMetronomeClick(startTime, isDownbeat = false) {
    playMetronomeClickOnContext(audioCtx, startTime, isDownbeat);
}

// Controle de posição rítmica do metrônomo e compensação de drift no playback
let playbackMeasureBeatPos = 0;
let playbackExpectedTimeMs = 0;

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
    
    initAudio();
    isPlaying = true;
    repeatHasPlayed = false;
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
    repeatHasPlayed = false;
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
    
    // Remover destaque de reprodução de todas as notas
    document.querySelectorAll('.note-card').forEach(card => {
        card.classList.remove('playing');
    });
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
            playbackMeasureBeatPos = 0;
        }
    }
    
    if (currentPlayIndex >= notesCount) {
        stopPlayback();
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

    // Tratamento de Fim de Repetição (:|)
    if (noteObj.note === 'REPEAT_END') {
        playbackMeasureBeatPos = 0;
        if (!repeatHasPlayed) {
            repeatHasPlayed = true;
            // Procurar último REPEAT_START anterior
            let repeatTarget = 0;
            for (let i = currentPlayIndex - 1; i >= 0; i--) {
                if (currentSong.notes[i].note === 'REPEAT_START') {
                    repeatTarget = i + 1;
                    break;
                }
            }
            currentPlayIndex = repeatTarget;
            playNextStep();
            return;
        } else {
            repeatHasPlayed = false;
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
    
    // Destacar nota visualmente
    document.querySelectorAll('.note-card').forEach((card) => {
        if (parseInt(card.dataset.index) === currentPlayIndex) {
            card.classList.add('playing');
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        } else {
            card.classList.remove('playing');
        }
    });
    
    // Tocar Áudio da Flauta
    const now = audioCtx.currentTime;
    const freq = getTransposedFrequency(noteObj.note, whistleKeyEl.value);
    const whistleVol = backingSettings.whistleVolume !== undefined ? backingSettings.whistleVolume : 1.0;
    
    if (freq > 0 && whistleVol > 0.001) {
        playWhistleSynth(freq, realDuration * 0.95, now, noteObj.ornament);
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

    // Agendamento de Acompanhamento Celta (Bodhrán & Violão DADGAD / Bouzouki - Fase 10)
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
            alert('Música salva com sucesso localmente!');
        });
    }
    
    // Barra de Pesquisa
    searchInput.addEventListener('input', renderSidebar);
    
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
            if (confirm("Tem certeza de que deseja apagar todas as notas desta música?")) {
                pushHistoryState('Limpar Tudo');
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

function importSongsJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            
            if (Array.isArray(parsed)) {
                // Importar várias músicas
                if (confirm(`Deseja importar ${parsed.length} músicas? Isso será mesclado com a sua biblioteca existente.`)) {
                    parsed.forEach(song => {
                        // Forçar novos ids e registrar em userSongs para persistência
                        song.id = 'song-' + Date.now() + Math.random().toString(36).substr(2, 5);
                        song.isCurated = false;
                        userSongs.unshift(song);
                        songs.unshift(song);
                    });
                    saveSongsToStorage();
                    renderSidebar();
                    selectSong(songs[0].id);
                }
            } else if (parsed && parsed.title) {
                // Importar uma única música
                parsed.id = 'song-' + Date.now();
                parsed.isCurated = false;
                userSongs.unshift(parsed);
                songs.unshift(parsed);
                saveSongsToStorage();
                renderSidebar();
                selectSong(parsed.id);
                alert(`Música "${parsed.title}" importada com sucesso!`);
            } else {
                alert("Arquivo JSON inválido. Verifique o formato.");
            }
        } catch (err) {
            alert("Erro ao ler o arquivo JSON: " + err.message);
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
            textNotesErrorEl.textContent = parseResult.error;
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
    const fromData = getWhistleKeyData(fromKey);
    const toData = getWhistleKeyData(toKey);

    if (fromKey === toKey) {
        fluteConvertPreview.innerHTML = `
            <div class="preview-item">
                <span>Flautas de origem e destino idênticas. Nenhuma alteração de dedilhado necessária.</span>
            </div>
        `;
        return;
    }

    const delta = calculateWhistleKeyDelta(fromKey, toKey);
    const sign = delta > 0 ? `+${delta}` : `${delta}`;
    const desc = delta > 0 ? `${delta} semitom(ns) acima` : `${Math.abs(delta)} semitom(ns) abaixo`;

    fluteConvertPreview.innerHTML = `
        <div class="preview-item">
            <strong>Diferença de Afinação:</strong> ${sign} semitom(ns) (${desc}).
        </div>
        <div class="preview-explanation">
            Para que a melodia continue soando com a mesma altura real na flauta <strong>${toData.name}</strong>, a tablatura será transposta em <strong>${sign} semitom(ns)</strong> e o tom da flauta ativa passará a ser <strong>${toData.name}</strong>.
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
        showTransposeFeedback('A tablatura atual está vazia. Adicione notas antes de transpor.', 'warning');
        return false;
    }

    if (semitonesDelta === 0 && (!newKey || newKey === currentSong.key)) {
        showTransposeFeedback('Nenhuma alteração de tom necessária.', 'info');
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

    let msg = `Transposição aplicada com sucesso (${modifiedNotesCount} notas)!`;
    if (newKey) {
        const keyData = getWhistleKeyData(newKey);
        msg = `Tablatura adaptada com sucesso para flauta em ${keyData.name}!`;
    }
    if (adjustedCount > 0) {
        msg += ` (${adjustedCount} notas ajustadas por oitava para caber na flauta).`;
    }
    if (approxCount > 0) {
        msg += ` (${approxCount} notas cromáticas aproximadas para a escala da flauta).`;
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
    showTransposeFeedback('Transposição revertida com sucesso!', 'info');
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
                showTransposeFeedback('A flauta de origem e de destino são iguais.', 'warning');
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
                showABCFeedback(res.error, 'error');
                return;
            }

            pushHistoryState('Importar Notação ABC');
            const newId = 'song-abc-' + Date.now();
            const importedSong = {
                id: newId,
                title: res.title,
                artist: res.artist,
                key: res.key,
                timeSignature: res.timeSignature,
                tempo: res.tempo,
                isCurated: false,
                notes: res.notes
            };

            userSongs.unshift(importedSong);
            songs.unshift(importedSong);
            saveSongsToStorage();
            renderSidebar();
            selectSong(newId);
            closeABCModal();
            alert(`Melodia "${importedSong.title}" importada com sucesso (${res.notes.length} elementos)!`);
        });
    }

    // Botão Copiar ABC
    if (btnCopyAbc && exportAbcTextarea) {
        btnCopyAbc.addEventListener('click', () => {
            exportAbcTextarea.select();
            navigator.clipboard.writeText(exportAbcTextarea.value).then(() => {
                showABCFeedback('Código ABC copiado para a área de transferência com sucesso!', 'success');
            }).catch(() => {
                document.execCommand('copy');
                showABCFeedback('Código ABC copiado!', 'success');
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
            showABCFeedback(`Arquivo "${sanitizedTitle}.abc" gerado para download!`, 'success');
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
                showABCFeedback(`Arquivo "${file.name}" carregado. Clique em "Importar para o Editor".`, 'success');
            };
            reader.readAsText(file);
            e.target.value = '';
        });
    }
}

// ==========================================================================
// 12. FASE 2: MODO PRÁTICA (PLAY-ALONG, LOOP A-B, DRONE, SPEED TRAINER & MIC)
// ==========================================================================

function setupPracticeMode() {
    // 1. Alternador de Modos (Estúdio vs Prática vs Play-Along)
    if (btnModeStudio) {
        btnModeStudio.addEventListener('click', () => setAppMode('studio'));
    }
    if (btnModePractice) {
        btnModePractice.addEventListener('click', () => setAppMode('practice'));
    }
    if (btnModePlayAlong) {
        btnModePlayAlong.addEventListener('click', () => setAppMode('playalong'));
    }

    // 2. Controles de Loop A-B
    if (btnSetLoopA) {
        btnSetLoopA.addEventListener('click', () => {
            const idx = getSelectedOrActiveIndex();
            if (idx === -1) {
                alert('Selecione uma nota na partitura para definir como início [A] do loop.');
                return;
            }
            setLoopA(idx);
        });
    }

    if (btnSetLoopB) {
        btnSetLoopB.addEventListener('click', () => {
            const idx = getSelectedOrActiveIndex();
            if (idx === -1) {
                alert('Selecione uma nota na partitura para definir como fim [B] do loop.');
                return;
            }
            setLoopB(idx);
        });
    }

    if (toggleLoopAb) {
        toggleLoopAb.addEventListener('change', (e) => {
            isLoopActive = e.target.checked;
            if (isLoopActive && (loopAIndex === -1 || loopBIndex === -1)) {
                if (currentSong && currentSong.notes.length > 0) {
                    if (loopAIndex === -1) loopAIndex = 0;
                    if (loopBIndex === -1) loopBIndex = currentSong.notes.length - 1;
                }
            }
            loopCycleCount = 0;
            if (trainerCycleBadge) trainerCycleBadge.textContent = 'Ciclo #0';
            updateLoopVisuals();
            updateLoopStatusText();
        });
    }

    if (btnClearLoop) {
        btnClearLoop.addEventListener('click', clearLoop);
    }

    // 3. Speed Trainer
    if (toggleSpeedTrainer) {
        toggleSpeedTrainer.addEventListener('change', (e) => {
            isSpeedTrainerActive = e.target.checked;
            loopCycleCount = 0;
            if (trainerCycleBadge) {
                trainerCycleBadge.textContent = 'Ciclo #0';
            }
        });
    }

    if (speedTrainerStepEl) {
        speedTrainerStepEl.addEventListener('change', (e) => {
            speedTrainerStep = parseInt(e.target.value) || 4;
        });
    }

    // 4. Bordão Celta (Drone)
    if (btnToggleDrone) {
        btnToggleDrone.addEventListener('click', toggleDrone);
    }

    if (droneVolumeEl) {
        droneVolumeEl.addEventListener('input', (e) => {
            setDroneVolume(parseFloat(e.target.value));
        });
    }

    // 5. Controles de Visualização & Zoom
    if (btnZoomIn) {
        btnZoomIn.addEventListener('click', () => changeZoom(1));
    }
    if (btnZoomOut) {
        btnZoomOut.addEventListener('click', () => changeZoom(-1));
    }
    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', toggleFullscreen);
    }

    // 6. Afinador e Escuta por Microfone (Play-Along)
    if (btnToggleMic) {
        btnToggleMic.addEventListener('click', toggleMicrophone);
    }

    document.querySelectorAll('input[name="tuner-mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            micTunerMode = e.target.value;
            if (tunerStatusMsg) {
                if (micTunerMode === 'follow') {
                    tunerStatusMsg.textContent = 'Modo Play-Along: Compare o que você toca com a melodia na tela!';
                } else {
                    tunerStatusMsg.textContent = 'Modo Afinador Livre: Afine sua Tin Whistle nota por nota.';
                }
            }
        });
    });

    // Atualização de bordão quando troca afinação da flauta
    if (whistleKeyEl) {
        whistleKeyEl.addEventListener('change', () => {
            updateDroneFrequencies();
        });
    }

    updateDroneUI();
    updateLoopStatusText();
}

function setAppMode(mode) {
    currentAppMode = mode;
    document.body.dataset.appMode = mode;
    
    // Resetar classes do body e botões de aba
    document.body.classList.remove('mode-practice', 'mode-playalong');
    if (btnModeStudio) btnModeStudio.classList.remove('active');
    if (btnModePractice) btnModePractice.classList.remove('active');
    if (btnModePlayAlong) btnModePlayAlong.classList.remove('active');

    // Desativar processos e microfones em andamento ao trocar de modo
    if (isMicListening) stopMic();
    if (isPlayAlongRunning) stopPlayAlong();
    if (isCountingIn) cancelCountIn();

    if (mode === 'practice') {
        if (songDisplayBanner) songDisplayBanner.classList.remove('active-in-studio');
        document.body.classList.add('mode-practice');
        if (btnModePractice) btnModePractice.classList.add('active');
        if (practiceToolbar) practiceToolbar.style.display = 'flex';
        if (practiceBottomPanel) practiceBottomPanel.style.display = 'flex';
        if (playalongToolbar) playalongToolbar.style.display = 'none';
        if (playalongBottomPanel) playalongBottomPanel.style.display = 'none';
        clearPlayAlongVisuals();
        updateSongDisplayBanner(currentSong);
        
        if (tabSheetEl) {
            tabSheetEl.classList.remove('zoom-sm', 'zoom-md', 'zoom-lg', 'zoom-xl');
            tabSheetEl.classList.add(`zoom-${ZOOM_LEVELS[currentZoomIndex]}`);
        }
    } else if (mode === 'playalong') {
        if (songDisplayBanner) songDisplayBanner.classList.remove('active-in-studio');
        document.body.classList.add('mode-playalong');
        if (btnModePlayAlong) btnModePlayAlong.classList.add('active');
        if (playalongToolbar) playalongToolbar.style.display = 'flex';
        if (playalongBottomPanel) playalongBottomPanel.style.display = 'flex';
        if (practiceToolbar) practiceToolbar.style.display = 'none';
        if (practiceBottomPanel) practiceBottomPanel.style.display = 'none';
        
        updateSongDisplayBanner(currentSong);
        initPlayAlongSession();
        
        if (tabSheetEl) {
            tabSheetEl.classList.remove('zoom-sm', 'zoom-md', 'zoom-lg', 'zoom-xl');
            tabSheetEl.classList.add(`zoom-${ZOOM_LEVELS[currentZoomIndex]}`);
        }
    } else {
        // Modo Estúdio (Criação & Edição)
        if (btnModeStudio) btnModeStudio.classList.add('active');
        if (practiceToolbar) practiceToolbar.style.display = 'none';
        if (practiceBottomPanel) practiceBottomPanel.style.display = 'none';
        if (playalongToolbar) playalongToolbar.style.display = 'none';
        if (playalongBottomPanel) playalongBottomPanel.style.display = 'none';
        clearPlayAlongVisuals();
        updateSongDisplayBanner(currentSong);
        if (editorHeader && editorHeader.classList.contains('collapsed')) {
            if (songDisplayBanner) songDisplayBanner.classList.add('active-in-studio');
        } else {
            if (songDisplayBanner) songDisplayBanner.classList.remove('active-in-studio');
        }
    }

    updateReadOnlyBannerVisibility();
}

function getSelectedOrActiveIndex() {
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

// -------------------------------------------------------------
// FUNÇÕES DE LOOP A-B
// -------------------------------------------------------------
function setLoopA(idx) {
    loopAIndex = idx;
    if (loopBIndex !== -1 && loopAIndex > loopBIndex) {
        const temp = loopAIndex;
        loopAIndex = loopBIndex;
        loopBIndex = temp;
    }
    if (loopBIndex === -1 && currentSong && currentSong.notes.length > 0) {
        loopBIndex = currentSong.notes.length - 1;
    }
    isLoopActive = true;
    if (toggleLoopAb) toggleLoopAb.checked = true;
    loopCycleCount = 0;
    if (trainerCycleBadge) trainerCycleBadge.textContent = 'Ciclo #0';
    updateLoopVisuals();
    updateLoopStatusText();
}

function setLoopB(idx) {
    loopBIndex = idx;
    if (loopAIndex !== -1 && loopBIndex < loopAIndex) {
        const temp = loopAIndex;
        loopAIndex = loopBIndex;
        loopBIndex = temp;
    }
    if (loopAIndex === -1) {
        loopAIndex = 0;
    }
    isLoopActive = true;
    if (toggleLoopAb) toggleLoopAb.checked = true;
    loopCycleCount = 0;
    if (trainerCycleBadge) trainerCycleBadge.textContent = 'Ciclo #0';
    updateLoopVisuals();
    updateLoopStatusText();
}

function clearLoop() {
    loopAIndex = -1;
    loopBIndex = -1;
    isLoopActive = false;
    loopCycleCount = 0;
    if (toggleLoopAb) toggleLoopAb.checked = false;
    if (trainerCycleBadge) trainerCycleBadge.textContent = 'Ciclo #0';
    updateLoopVisuals();
    updateLoopStatusText();
}

function updateLoopVisuals() {
    document.querySelectorAll('.note-card').forEach(card => {
        const idx = parseInt(card.dataset.index);
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
    if (!loopStatusText) return;
    if (loopAIndex === -1 && loopBIndex === -1) {
        loopStatusText.textContent = 'Selecione uma nota e marque [A] e [B]';
    } else if (loopAIndex !== -1 && loopBIndex === -1) {
        loopStatusText.textContent = `Ponto [A]: Nota #${loopAIndex + 1} (Defina [B])`;
    } else {
        const start = Math.min(loopAIndex, loopBIndex);
        const end = Math.max(loopAIndex, loopBIndex);
        loopStatusText.textContent = `Loop: Notas #${start + 1} a #${end + 1} (${end - start + 1} notas)`;
    }
}

// -------------------------------------------------------------
// FUNÇÕES DO BORDÃO CELTA (DRONE)
// -------------------------------------------------------------
function toggleDrone() {
    if (isDroneActive) {
        stopDrone();
    } else {
        startDrone();
    }
}

function startDrone() {
    initAudio();
    if (droneGainNode) stopDrone();

    const key = whistleKeyEl ? whistleKeyEl.value : 'D';
    const freqs = DRONE_KEY_FREQUENCIES[key] || DRONE_KEY_FREQUENCIES['D'];
    const now = audioCtx.currentTime;

    droneGainNode = audioCtx.createGain();
    const targetVol = parseFloat(droneVolumeEl ? droneVolumeEl.value : 0.25) || 0.25;
    droneGainNode.gain.setValueAtTime(0.001, now);
    droneGainNode.gain.exponentialRampToValueAtTime(Math.max(0.001, targetVol), now + 0.3);

    // Filtro para timbre de bordão de Uilleann Pipes
    droneFilter = audioCtx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(800, now);
    droneFilter.Q.setValueAtTime(2.0, now);

    // Oscilador 1: Fundamental (Tônica)
    droneOsc1 = audioCtx.createOscillator();
    droneOsc1.type = 'sawtooth';
    droneOsc1.frequency.setValueAtTime(freqs.tonic, now);

    // Oscilador 2: Quinta justa + ligeiro detune
    droneOsc2 = audioCtx.createOscillator();
    droneOsc2.type = 'triangle';
    droneOsc2.frequency.setValueAtTime(freqs.fifth, now);
    droneOsc2.detune.setValueAtTime(4, now);

    droneOsc1.connect(droneFilter);
    droneOsc2.connect(droneFilter);
    droneFilter.connect(droneGainNode);
    droneGainNode.connect(audioCtx.destination);

    droneOsc1.start(now);
    droneOsc2.start(now);

    isDroneActive = true;
    updateDroneUI();
}

function stopDrone() {
    if (!droneGainNode || !audioCtx) {
        isDroneActive = false;
        updateDroneUI();
        return;
    }
    const now = audioCtx.currentTime;
    try {
        droneGainNode.gain.setValueAtTime(droneGainNode.gain.value, now);
        droneGainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        setTimeout(() => {
            if (droneOsc1) { droneOsc1.stop(); droneOsc1.disconnect(); droneOsc1 = null; }
            if (droneOsc2) { droneOsc2.stop(); droneOsc2.disconnect(); droneOsc2 = null; }
            if (droneGainNode) { droneGainNode.disconnect(); droneGainNode = null; }
        }, 220);
    } catch(e) {
        // Fallback seguro
    }
    isDroneActive = false;
    updateDroneUI();
}

function setDroneVolume(vol) {
    if (droneGainNode && audioCtx && isDroneActive) {
        const now = audioCtx.currentTime;
        droneGainNode.gain.setValueAtTime(droneGainNode.gain.value, now);
        droneGainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), now + 0.05);
    }
}

function updateDroneFrequencies() {
    if (!isDroneActive || !audioCtx) return;
    const key = whistleKeyEl ? whistleKeyEl.value : 'D';
    const freqs = DRONE_KEY_FREQUENCIES[key] || DRONE_KEY_FREQUENCIES['D'];
    const now = audioCtx.currentTime;
    if (droneOsc1) droneOsc1.frequency.setValueAtTime(freqs.tonic, now);
    if (droneOsc2) droneOsc2.frequency.setValueAtTime(freqs.fifth, now);
    updateDroneUI();
}

function updateDroneUI() {
    const key = whistleKeyEl ? whistleKeyEl.value : 'D';
    const freqs = DRONE_KEY_FREQUENCIES[key] || DRONE_KEY_FREQUENCIES['D'];
    if (droneStatusText) {
        droneStatusText.textContent = `Tom ${key}: ${freqs.label}`;
    }
    if (btnToggleDrone && droneBtnLabel) {
        if (isDroneActive) {
            btnToggleDrone.classList.add('active');
            droneBtnLabel.textContent = 'Bordão Ativo';
        } else {
            btnToggleDrone.classList.remove('active');
            droneBtnLabel.textContent = 'Ligar Bordão';
        }
    }
}

// -------------------------------------------------------------
// FUNÇÕES DE COUNT-IN (CONTAGEM REGRESSIVA)
// -------------------------------------------------------------
function startCountIn() {
    // Count-in é exclusivo da tela de prática
    if (currentAppMode !== 'practice') {
        startPlayback();
        return;
    }
    initAudio();
    isCountingIn = true;
    if (!countInOverlay || !countInNum) {
        startPlayback();
        return;
    }

    const bpm = parseInt(songTempoEl.value) || 120;
    const beatInterval = (60 / bpm) * 1000;
    const timeSig = songTimeSignatureEl ? songTimeSignatureEl.value : '4/4';

    let totalBeats = 4;
    if (timeSig === '3/4') totalBeats = 3;
    else if (timeSig === '6/8') totalBeats = 2;
    else if (timeSig === '2/4') totalBeats = 2;
    else if (timeSig === '9/8') totalBeats = 3;
    else if (timeSig === '12/8') totalBeats = 4;

    countInOverlay.style.display = 'flex';
    if (countInInfo) {
        countInInfo.textContent = `Andamento: ${bpm} BPM • ${timeSig}`;
    }

    let currentBeat = 1;

    function countStep() {
        if (!isCountingIn) return;

        countInNum.textContent = currentBeat;
        countInNum.style.animation = 'none';
        void countInNum.offsetWidth;
        countInNum.style.animation = 'pulseNum 0.35s ease-out';

        // Clique do metrônomo no áudio
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
            countInTimeout = setTimeout(() => {
                countInOverlay.style.display = 'none';
                isCountingIn = false;
                startPlayback();
            }, beatInterval);
        } else {
            currentBeat++;
            countInTimeout = setTimeout(countStep, beatInterval);
        }
    }

    countStep();
}

function cancelCountIn() {
    isCountingIn = false;
    if (countInTimeout) clearTimeout(countInTimeout);
    if (countInOverlay) countInOverlay.style.display = 'none';
}

// -------------------------------------------------------------
// ZOOM E TELA CHEIA
// -------------------------------------------------------------
function changeZoom(delta) {
    currentZoomIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, currentZoomIndex + delta));
    if (tabSheetEl) {
        tabSheetEl.classList.remove('zoom-sm', 'zoom-md', 'zoom-lg', 'zoom-xl');
        tabSheetEl.classList.add(`zoom-${ZOOM_LEVELS[currentZoomIndex]}`);
    }
    if (zoomIndicator) {
        zoomIndicator.textContent = ZOOM_LABELS[currentZoomIndex];
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
    }
}

// -------------------------------------------------------------
// AFINADOR & ESCUTA POR MICROFONE (PLAY-ALONG)
// -------------------------------------------------------------
function toggleMicrophone() {
    if (isMicListening) {
        stopMic();
    } else {
        startMic();
    }
}

async function startMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Seu navegador não suporta captura de microfone.');
        return;
    }

    try {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtxClass) {
            alert('Seu navegador não suporta Web Audio API.');
            return;
        }

        micAudioContext = new AudioCtxClass();
        if (micAudioContext.state === 'suspended') {
            await micAudioContext.resume();
        }

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

        // Filtro Biquad Passa-Faixa para Tin Whistle (250Hz - 2200Hz, frequência central 950Hz, Q 0.7)
        // Arquitetura validada com sucesso no test-mic.html
        micBiquad = micAudioContext.createBiquadFilter();
        micBiquad.type = 'bandpass';
        micBiquad.frequency.setValueAtTime(950, micAudioContext.currentTime);
        micBiquad.Q.setValueAtTime(0.7, micAudioContext.currentTime);

        micAnalyser = micAudioContext.createAnalyser();
        micAnalyser.fftSize = 2048;

        // Nó de ganho zero para manter o grafo rodando ativamente no Android/Chrome sem feedback
        const silenceGain = micAudioContext.createGain();
        silenceGain.gain.setValueAtTime(0, micAudioContext.currentTime);

        source.connect(micBiquad);
        micBiquad.connect(micAnalyser);
        micAnalyser.connect(silenceGain);
        silenceGain.connect(micAudioContext.destination);

        isMicListening = true;
        if (btnToggleMic && micBtnLabel) {
            btnToggleMic.classList.add('btn-danger');
            btnToggleMic.classList.remove('btn-primary');
            micBtnLabel.textContent = 'Parar Microfone';
        }
        if (tunerStatusMsg) tunerStatusMsg.textContent = 'Escutando som da flauta... Toque uma nota!';
        updatePitchLoop();
    } catch (err) {
        console.error('Erro ao acessar microfone:', err);
        alert('Não foi possível acessar o microfone. Verifique as permissões do seu navegador.');
    }
}

function stopMic() {
    isMicListening = false;
    if (micRafId) cancelAnimationFrame(micRafId);
    if (micBiquad) {
        try { micBiquad.disconnect(); } catch (e) {}
        micBiquad = null;
    }
    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        micStream = null;
    }
    if (micAudioContext) {
        micAudioContext.close().catch(() => {});
        micAudioContext = null;
    }
    if (btnToggleMic && micBtnLabel) {
        btnToggleMic.classList.remove('btn-danger');
        btnToggleMic.classList.add('btn-primary');
        micBtnLabel.textContent = 'Ativar Microfone';
    }
    if (tunerDetectedNote) {
        tunerDetectedNote.textContent = '--';
        tunerDetectedNote.classList.remove('in-tune');
    }
    if (tunerDetectedFreq) tunerDetectedFreq.textContent = '0.0 Hz';
    if (tunerNeedle) tunerNeedle.style.left = '50%';
    if (tunerStatusMsg) tunerStatusMsg.textContent = 'Microfone desativado.';
}

function updatePitchLoop() {
    if (!isMicListening || !micAnalyser) return;

    if (micAudioContext && micAudioContext.state === 'suspended') {
        micAudioContext.resume().catch(() => {});
    }

    const buf = getSharedAudioBuffer(micAnalyser.fftSize);
    micAnalyser.getFloatTimeDomainData(buf);
    const sampleRate = micAudioContext.sampleRate;
    const pitch = autoCorrelatePitch(buf, sampleRate, micNoiseThreshold);

    if (pitch !== -1 && pitch >= 200 && pitch <= 3000) {
        const noteNumber = noteFromPitchVal(pitch);
        const noteName = NOTE_STRINGS[noteNumber % 12];
        const octave = Math.floor(noteNumber / 12) - 1;
        const noteFullName = `${noteName}${octave}`;
        const cents = centsOffFromPitchVal(pitch, noteNumber);

        if (tunerDetectedNote) {
            tunerDetectedNote.textContent = noteFullName;
            if (Math.abs(cents) <= 8) {
                tunerDetectedNote.classList.add('in-tune');
            } else {
                tunerDetectedNote.classList.remove('in-tune');
            }
        }

        if (tunerDetectedFreq) {
            tunerDetectedFreq.textContent = `${pitch.toFixed(1)} Hz (${cents > 0 ? '+' : ''}${cents}¢)`;
        }

        if (tunerNeedle) {
            const clampedCents = Math.max(-50, Math.min(50, cents));
            const percent = 50 + (clampedCents);
            tunerNeedle.style.left = `${percent}%`;
        }

        // Feedback contextual (Afinador Livre vs Play-Along)
        if (micTunerMode === 'follow' && isPlaying && currentSong && currentPlayIndex >= 0 && currentPlayIndex < currentSong.notes.length) {
            const currentTabNote = currentSong.notes[currentPlayIndex];
            const currentTabNoteKey = currentTabNote.note;
            const currentWhistleKey = whistleKeyEl ? whistleKeyEl.value : 'D';
            const noteObjInfo = WHISTLE_KEYS_DATA[currentWhistleKey]?.notes[currentTabNoteKey];
            const targetNoteDisplay = noteObjInfo ? noteObjInfo.display : currentTabNoteKey;
            const expectedFreq = getTransposedFrequency(currentTabNoteKey, currentWhistleKey);
            const expectedMidi = expectedFreq > 0 ? noteFromPitchVal(expectedFreq) : -1;

            if (expectedMidi !== -1 && (noteNumber === expectedMidi || (noteNumber % 12) === (expectedMidi % 12))) {
                if (tunerStatusMsg) tunerStatusMsg.innerHTML = `<span style="color: var(--emerald-primary); font-weight: bold;">✓ Nota Correta! (${targetNoteDisplay})</span>`;
            } else {
                if (tunerStatusMsg) tunerStatusMsg.textContent = `Tocando: ${noteFullName} | Esperado: ${targetNoteDisplay}`;
            }
        } else {
            if (tunerStatusMsg) {
                if (Math.abs(cents) <= 5) {
                    tunerStatusMsg.innerHTML = '<span style="color: var(--emerald-primary);">Perfeitamente afinado!</span>';
                } else if (cents < -5) {
                    tunerStatusMsg.textContent = 'Levemente baixo (pressione o bocal para afinar mais alto)';
                } else {
                    tunerStatusMsg.textContent = 'Levemente alto (puxe o bocal para afinar mais baixo)';
                }
            }
        }
    }

    micRafId = requestAnimationFrame(updatePitchLoop);
}

// ==========================================================================
// 13. FASE 3 & 9: FILTROS DE BIBLIOTECA, BADGE & COLAPSO DO MENU LATERAL
// ==========================================================================
let isSidebarFiltersOpen = false;

function updateActiveFiltersBadge() {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedDifficulty !== 'all') count++;
    if (selectedRhythm !== 'all') count++;
    if (currentSongSort && currentSongSort !== 'default') count++;

    if (activeFiltersBadge) {
        if (count > 0) {
            activeFiltersBadge.textContent = count;
            activeFiltersBadge.style.display = 'inline-flex';
        } else {
            activeFiltersBadge.style.display = 'none';
        }
    }
    if (btnResetFiltersQuick) {
        btnResetFiltersQuick.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

function toggleSidebarFilters() {
    isSidebarFiltersOpen = !isSidebarFiltersOpen;
    if (sidebarFiltersPanel) {
        sidebarFiltersPanel.style.display = isSidebarFiltersOpen ? 'flex' : 'none';
    }
    if (btnToggleFilters) {
        btnToggleFilters.classList.toggle('open', isSidebarFiltersOpen);
    }
}

function setupSidebarFiltersAndCollapse() {
    // 0. Toggle de Filtros Retráteis (Fase 9)
    if (btnToggleFilters) {
        btnToggleFilters.addEventListener('click', toggleSidebarFilters);
    }
    if (btnResetFiltersQuick) {
        btnResetFiltersQuick.addEventListener('click', (e) => {
            e.stopPropagation();
            resetSidebarFilters();
        });
    }

    // 1. Alternância de Categorias (Pills)
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            selectedCategory = pill.dataset.category || 'all';
            updateActiveFiltersBadge();
            renderSidebar();
        });
    });

    // 2. Filtro de Dificuldade
    if (filterDifficulty) {
        filterDifficulty.addEventListener('change', (e) => {
            selectedDifficulty = e.target.value;
            updateActiveFiltersBadge();
            renderSidebar();
        });
    }

    // 3. Filtro de Ritmo
    if (filterRhythm) {
        filterRhythm.addEventListener('change', (e) => {
            selectedRhythm = e.target.value;
            updateActiveFiltersBadge();
            renderSidebar();
        });
    }

    // 4. Botão Limpar Filtros
    if (btnResetFilters) {
        btnResetFilters.addEventListener('click', resetSidebarFilters);
    }

    // 5. Botões de Colapso e Expansão do Menu Lateral
    if (btnToggleSidebarCollapse) {
        btnToggleSidebarCollapse.addEventListener('click', () => {
            if (window.innerWidth <= 860) {
                setMobileSidebarOpen(false);
            } else {
                toggleSidebarCollapse();
            }
        });
    }

    if (btnSidebarFloatingOpen) {
        btnSidebarFloatingOpen.addEventListener('click', () => {
            setSidebarCollapse(false);
        });
    }
    
    updateActiveFiltersBadge();
}

function resetSidebarFilters() {
    selectedCategory = 'all';
    selectedDifficulty = 'all';
    selectedRhythm = 'all';
    currentSongSort = 'default';
    if (searchInput) searchInput.value = '';
    if (filterDifficulty) filterDifficulty.value = 'all';
    if (filterRhythm) filterRhythm.value = 'all';
    if (sortSongsSelect) sortSongsSelect.value = 'default';
    
    document.querySelectorAll('.filter-pill').forEach(p => {
        if (p.dataset.category === 'all') p.classList.add('active');
        else p.classList.remove('active');
    });
    
    updateActiveFiltersBadge();
    renderSidebar();
}

function toggleSidebarCollapse() {
    const isCollapsed = sidebarEl ? sidebarEl.classList.contains('collapsed') : false;
    setSidebarCollapse(!isCollapsed);
}

function setSidebarCollapse(collapse) {
    if (!sidebarEl) return;
    
    if (collapse) {
        sidebarEl.classList.add('collapsed');
        if (btnSidebarFloatingOpen && window.innerWidth > 860) {
            btnSidebarFloatingOpen.style.display = 'inline-flex';
        }
        localStorage.setItem('sidebar_collapsed', 'true');
    } else {
        sidebarEl.classList.remove('collapsed');
        if (btnSidebarFloatingOpen) btnSidebarFloatingOpen.style.display = 'none';
        localStorage.setItem('sidebar_collapsed', 'false');
    }
    
    // Forçar recálculo de layout para a tablatura aproveitar 100% da largura da tela
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 150);
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
        if (wakeLockLabel && manual) wakeLockLabel.textContent = 'Não Suportado';
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
            if (wakeLockLabel) wakeLockLabel.textContent = 'Tela Ativa (ON)';
        } else {
            btnToggleWakeLock.classList.remove('wake-lock-on');
            if (wakeLockLabel) wakeLockLabel.textContent = 'Tela Ativa';
        }
    }

    const mbWakelockLabel = document.getElementById('mb-wakelock-label');
    const mbActWakelock = document.getElementById('mb-act-wakelock');
    if (mbActWakelock) {
        if (isActive) {
            mbActWakelock.classList.add('wake-lock-on');
            if (mbWakelockLabel) mbWakelockLabel.textContent = 'Tela Ativa (Ligada)';
        } else {
            mbActWakelock.classList.remove('wake-lock-on');
            if (mbWakelockLabel) mbWakelockLabel.textContent = 'Manter Tela Acesa';
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
            if (wakeLockManualActive || isPlaying || (typeof isPlayAlongRunning !== 'undefined' && isPlayAlongRunning)) {
                await requestScreenWakeLock(false);
            }
        }
    });
}

// ==========================================================================
// 14. FASE 5: MOTOR DE PLAY-ALONG INTERATIVO POR MICROFONE
// ==========================================================================

function setupPlayAlongMode() {
    // 1. Botão Iniciar / Pausar Play-Along
    if (btnPlayAlongToggle) {
        btnPlayAlongToggle.addEventListener('click', togglePlayAlong);
    }

    // 2. Botão Reiniciar
    if (btnPlayAlongRestart) {
        btnPlayAlongRestart.addEventListener('click', restartPlayAlong);
    }

    // 3. Seletores de Sub-Modos (Passo a Passo vs No Ritmo)
    if (btnPaModeStep) {
        btnPaModeStep.addEventListener('click', () => setPlayAlongModeSub('step'));
    }
    if (btnPaModeFlow) {
        btnPaModeFlow.addEventListener('click', () => setPlayAlongModeSub('flow'));
    }

    // 4. Seletor de Tolerância de Afinação
    if (playalongToleranceSelect) {
        playalongToleranceSelect.addEventListener('change', (e) => {
            playAlongToleranceCents = parseInt(e.target.value) || 35;
        });
    }

    // 5. Botões do Modal de Resultado
    if (btnClosePaResult) {
        btnClosePaResult.addEventListener('click', hidePlayAlongResultModal);
    }
    if (btnPaResultContinue) {
        btnPaResultContinue.addEventListener('click', hidePlayAlongResultModal);
    }
    if (btnPaResultReplay) {
        btnPaResultReplay.addEventListener('click', () => {
            hidePlayAlongResultModal();
            restartPlayAlong();
            startPlayAlong();
        });
    }

    // 6. Calibração de Ruído Ambiente (Noise Gate)
    if (btnPaCalibrate) {
        btnPaCalibrate.addEventListener('click', openMicCalibrationModal);
    }
    if (btnTunerCalibrate) {
        btnTunerCalibrate.addEventListener('click', openMicCalibrationModal);
    }
    if (btnCloseCalibration) {
        btnCloseCalibration.addEventListener('click', closeMicCalibrationModal);
    }
    if (btnStartCalibration) {
        btnStartCalibration.addEventListener('click', startNoiseCalibration);
    }
    if (btnCalibResetDefault) {
        btnCalibResetDefault.addEventListener('click', resetNoiseCalibrationDefault);
    }
    if (btnFinishCalibration) {
        btnFinishCalibration.addEventListener('click', closeMicCalibrationModal);
    }

    applyNoiseGateUI();
}

// ==========================================================================
// ROTINAS DE CALIBRAÇÃO DE RUÍDO DO MICROFONE (NOISE GATE)
// ==========================================================================

function applyNoiseGateUI() {
    if (playalongVuGate) {
        const percent = Math.min(95, Math.max(5, Math.round(micNoiseThreshold * 500)));
        playalongVuGate.style.left = `${percent}%`;
    }
    if (playalongNoiseHint) {
        const isCalib = localStorage.getItem('whistle_noise_calibrated') === 'true';
        const pctStr = (micNoiseThreshold * 100).toFixed(1) + '%';
        playalongNoiseHint.textContent = `Corte de ruído: ${isCalib ? 'Calibrado' : 'Padrão'} (${pctStr})`;
    }
}

function openMicCalibrationModal() {
    if (micCalibrationModal) {
        micCalibrationModal.classList.add('open');
        micCalibrationModal.style.display = 'flex';
    }

    if (calibProgressSection) calibProgressSection.style.display = 'none';
    if (calibResultSection) calibResultSection.style.display = 'none';
    if (btnStartCalibration) {
        btnStartCalibration.style.display = 'inline-flex';
        const span = btnStartCalibration.querySelector('span');
        if (span) span.textContent = 'Iniciar Calibração (2s)';
    }
    if (btnFinishCalibration) btnFinishCalibration.style.display = 'none';
}

function closeMicCalibrationModal() {
    if (isCalibratingNoise) {
        isCalibratingNoise = false;
        if (calibRafId) {
            cancelAnimationFrame(calibRafId);
            calibRafId = null;
        }
    }
    if (micCalibrationModal) {
        micCalibrationModal.classList.remove('open');
        micCalibrationModal.style.display = 'none';
    }
}

async function startNoiseCalibration() {
    if (isCalibratingNoise) return;

    // Garantir acesso ao microfone com o filtro biquad ativo
    let analyser = playAlongAnalyser || micAnalyser;
    let audioCtx = playAlongAudioContext || micAudioContext;

    if (!analyser || !audioCtx || audioCtx.state !== 'running') {
        const ok = await startPlayAlongMic();
        if (!ok) {
            alert('Não foi possível acessar o microfone para calibrar. Verifique as permissões de áudio do seu navegador.');
            return;
        }
        analyser = playAlongAnalyser;
        audioCtx = playAlongAudioContext;
    }

    isCalibratingNoise = true;
    if (btnStartCalibration) btnStartCalibration.style.display = 'none';
    if (btnFinishCalibration) btnFinishCalibration.style.display = 'none';
    if (calibProgressSection) calibProgressSection.style.display = 'block';
    if (calibResultSection) calibResultSection.style.display = 'none';
    if (calibStatusText) calibStatusText.textContent = 'Ouvindo ruído do ambiente... Mantenha silêncio!';

    const startTime = performance.now();
    const duration = 2000; // 2 segundos
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
        if (rms > peakRms) {
            peakRms = rms;
        }

        // Atualizar interface em tempo real
        if (calibTimerDisplay) {
            const remaining = Math.max(0, (duration - elapsed) / 1000).toFixed(1);
            calibTimerDisplay.textContent = `${remaining}s`;
        }
        if (calibProgressFill) {
            calibProgressFill.style.width = `${Math.round(progress * 100)}%`;
        }
        if (calibLiveFill) {
            calibLiveFill.style.width = `${Math.min(100, Math.round(rms * 500))}%`;
        }

        if (elapsed < duration) {
            calibRafId = requestAnimationFrame(sampleLoop);
        } else {
            isCalibratingNoise = false;
            calibRafId = null;

            const avgRms = sampleCount > 0 ? (sumRms / sampleCount) : peakRms;
            // Limiar calculado com margem de segurança de 45% acima do pico de ruído
            const calculatedThreshold = Math.max(0.026, Math.min(0.085, (peakRms * 1.45) + 0.006));

            micNoiseThreshold = calculatedThreshold;
            localStorage.setItem('whistle_noise_threshold', calculatedThreshold.toFixed(4));
            localStorage.setItem('whistle_noise_calibrated', 'true');

            applyNoiseGateUI();

            if (calibProgressSection) calibProgressSection.style.display = 'none';
            if (calibResultSection) calibResultSection.style.display = 'block';

            if (calibResultNoise) {
                calibResultNoise.textContent = `${(peakRms * 100).toFixed(1)}% (Pico) / ${(avgRms * 100).toFixed(1)}% (Médio)`;
            }
            if (calibResultThreshold) {
                calibResultThreshold.textContent = `${(calculatedThreshold * 100).toFixed(1)}%`;
            }
            if (calibResultBadge) {
                calibResultBadge.textContent = '✓ Ruído do ambiente eliminado com sucesso!';
            }

            if (btnFinishCalibration) btnFinishCalibration.style.display = 'inline-flex';
            if (btnStartCalibration) {
                btnStartCalibration.style.display = 'inline-flex';
                const span = btnStartCalibration.querySelector('span');
                if (span) span.textContent = 'Recalibrar (2s)';
            }
        }
    }

    calibRafId = requestAnimationFrame(sampleLoop);
}

function resetNoiseCalibrationDefault() {
    micNoiseThreshold = 0.035;
    localStorage.setItem('whistle_noise_threshold', '0.0350');
    localStorage.removeItem('whistle_noise_calibrated');
    applyNoiseGateUI();

    if (calibResultSection) calibResultSection.style.display = 'block';
    if (calibProgressSection) calibProgressSection.style.display = 'none';
    if (calibResultNoise) calibResultNoise.textContent = 'Padrão (Sem medição)';
    if (calibResultThreshold) calibResultThreshold.textContent = '3.5%';
    if (calibResultBadge) calibResultBadge.textContent = 'Restaurado para o corte de fábrica (3.5%)';

    if (btnFinishCalibration) btnFinishCalibration.style.display = 'inline-flex';
}

function setPlayAlongModeSub(mode) {
    if (isPlayAlongRunning) {
        stopPlayAlong();
    }
    playAlongMode = mode;
    if (btnPaModeStep && btnPaModeFlow) {
        if (mode === 'step') {
            btnPaModeStep.classList.add('active');
            btnPaModeFlow.classList.remove('active');
            if (playalongModeHint) {
                playalongModeHint.textContent = 'A partitura espera você tocar cada nota com a flauta antes de avançar.';
            }
        } else {
            btnPaModeFlow.classList.add('active');
            btnPaModeStep.classList.remove('active');
            if (playalongModeHint) {
                playalongModeHint.textContent = 'A música corre no andamento (BPM) e você deve acertar as notas no ritmo.';
            }
        }
    }
    initPlayAlongSession();
}

function getPlayableNoteIndices() {
    if (!currentSong || !Array.isArray(currentSong.notes)) return [];
    // Barras de compasso e quebras de linha são elementos estruturais; pausas (REST) são eventos musicais válidos
    const nonPlayable = ['BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END', 'LINEBREAK', '|', '||', '|:', ':|'];
    const indices = [];
    currentSong.notes.forEach((item, idx) => {
        if (item && item.type !== 'bar' && item.note && !nonPlayable.includes(item.note)) {
            indices.push(idx);
        }
    });
    return indices;
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

    // Resetar controle de articulação / pausa
    playAlongWaitingForRelease = false;
    playAlongReleaseSilenceCount = 0;
    playAlongRestSilenceCount = 0;

    const playable = getPlayableNoteIndices();
    playAlongTotalNotes = playable.length;
    playAlongCurrentIndex = 0;

    updatePlayAlongStatsUI();
    updatePlayAlongTargetUI();

    if (playalongStatusIndicator) {
        playalongStatusIndicator.textContent = playAlongTotalNotes > 0
            ? `Pronto para tocar (${playAlongTotalNotes} eventos). Clique em Iniciar.`
            : 'Nenhuma nota encontrada na música atual.';
    }
}

function clearPlayAlongVisuals() {
    const allNoteEls = document.querySelectorAll('.note-card, .note-item');
    allNoteEls.forEach(el => {
        el.classList.remove('playalong-target', 'playalong-hit', 'playalong-near', 'playalong-miss');
    });
}

function updatePlayAlongStatsUI() {
    if (paStatProgress) {
        paStatProgress.textContent = `${playAlongHits} / ${playAlongTotalNotes}`;
    }
    if (paStatAccuracy) {
        const acc = playAlongAttempts > 0 ? Math.round((playAlongHits / playAlongAttempts) * 100) : 100;
        paStatAccuracy.textContent = `${acc}%`;
    }
    if (paStatCombo) {
        paStatCombo.textContent = `${playAlongCombo}x 🔥`;
    }
    if (paProgressBar) {
        const pct = playAlongTotalNotes > 0 ? Math.min(100, Math.round((playAlongCurrentIndex / playAlongTotalNotes) * 100)) : 0;
        paProgressBar.style.width = `${pct}%`;
    }
}

function getWhistleNoteTarget(noteIndex) {
    const playable = getPlayableNoteIndices();
    if (noteIndex < 0 || noteIndex >= playable.length) return null;
    const realIndex = playable[noteIndex];
    const songNote = currentSong.notes[realIndex];
    if (!songNote) return null;

    if (songNote.note === 'REST') {
        return {
            realIndex: realIndex,
            rawNote: 'REST',
            display: '𝄾 Pausa',
            cleanNote: 'REST',
            isRest: true,
            duration: parseFloat(songNote.duration) || 1.0,
            isSecondOctave: false,
            expectedFreq: 0,
            expectedMidi: -1,
            fingering: null
        };
    }

    const currentKey = whistleKeyEl ? whistleKeyEl.value : 'D';
    const keyData = WHISTLE_KEYS_DATA[currentKey];
    const noteKey = songNote.note;
    const noteInfo = keyData?.notes[noteKey];

    // Mapeamento do nome base da nota e oitava
    const displayStr = noteInfo ? noteInfo.display : noteKey;
    const cleanNote = displayStr.replace(/[0-9]/g, '');
    
    // Mapeamento de frequência real transposta e MIDI esperado (resolve sustenidos/bemóis e 7 afinações)
    const isSecondOctave = isNoteOctave2(noteKey, currentKey);
    const expectedFreq = getTransposedFrequency(noteKey, currentKey);
    const expectedMidi = expectedFreq > 0 ? noteFromPitchVal(expectedFreq) : -1;
    
    return {
        realIndex: realIndex,
        rawNote: noteKey,
        display: displayStr,
        cleanNote: cleanNote.toUpperCase(),
        isRest: false,
        duration: parseFloat(songNote.duration) || 1.0,
        isSecondOctave: isSecondOctave,
        expectedFreq: expectedFreq,
        expectedMidi: expectedMidi,
        fingering: songNote.fingering || (noteInfo ? noteInfo.fingering : null)
    };
}

function updatePlayAlongTargetUI() {
    const target = getWhistleNoteTarget(playAlongCurrentIndex);
    
    // Atualizar classe na tablatura
    const allNoteEls = document.querySelectorAll('.note-card, .note-item');
    allNoteEls.forEach(el => el.classList.remove('playalong-target'));

    if (!target) {
        if (paTargetNote) paTargetNote.textContent = 'FIM';
        if (paTargetFingerings) paTargetFingerings.innerHTML = '';
        return;
    }

    // Destacar nota ou pausa alvo atual na tablatura usando data-index
    const targetEl = tabSheetEl ? tabSheetEl.querySelector(`.note-card[data-index="${target.realIndex}"]`) : null;
    if (targetEl) {
        targetEl.classList.add('playalong-target');
        // Rolar suavemente para o elemento alvo mantendo-o visível
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    if (paTargetNote) {
        paTargetNote.textContent = target.display;
    }

    // Mini visualização dos furos da flauta ou badge de pausa
    if (paTargetFingerings) {
        if (target.isRest) {
            paTargetFingerings.innerHTML = '<span class="pa-rest-badge">𝄾 Pausa (Silêncio)</span>';
        } else if (target.fingering) {
            paTargetFingerings.innerHTML = createMiniFingeringSVG(target.fingering);
        } else {
            paTargetFingerings.innerHTML = '';
        }
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

function startPlayAlong() {
    if (!currentSong || currentSong.notes.length === 0) {
        alert('Carregue ou crie uma música primeiro para tocar no Play-Along.');
        return;
    }

    const playable = getPlayableNoteIndices();
    if (playable.length === 0) {
        alert('A música atual não contém notas válidas para tocar.');
        return;
    }

    if (playAlongCurrentIndex >= playable.length) {
        initPlayAlongSession();
    }

    startPlayAlongMic().then((ok) => {
        if (!ok) return;

        requestScreenWakeLock(false);
        updatePlayAlongTargetUI();

        if (btnPlayAlongToggle) {
            btnPlayAlongToggle.classList.add('running');
            const playIcon = btnPlayAlongToggle.querySelector('.icon-pa-play');
            const pauseIcon = btnPlayAlongToggle.querySelector('.icon-pa-pause');
            if (playIcon) playIcon.style.display = 'none';
            if (pauseIcon) pauseIcon.style.display = 'inline-block';
            if (playalongToggleLabel) playalongToggleLabel.textContent = 'Pausar Play-Along';
        }

        if (playalongStatusIndicator) {
            playalongStatusIndicator.textContent = playAlongMode === 'step'
                ? 'Escutando sua flauta... Toque a nota destacada!'
                : 'Música em andamento! Acompanhe as notas no ritmo.';
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

    stopPlayAlongMic();
    releaseScreenWakeLock(false);

    if (btnPlayAlongToggle) {
        btnPlayAlongToggle.classList.remove('running');
        const playIcon = btnPlayAlongToggle.querySelector('.icon-pa-play');
        const pauseIcon = btnPlayAlongToggle.querySelector('.icon-pa-pause');
        if (playIcon) playIcon.style.display = 'inline-block';
        if (pauseIcon) pauseIcon.style.display = 'none';
        if (playalongToggleLabel) playalongToggleLabel.textContent = 'Iniciar Play-Along';
    }

    if (playalongStatusIndicator) {
        playalongStatusIndicator.textContent = 'Play-Along pausado.';
    }
}

async function startPlayAlongMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Seu navegador não suporta captura de microfone.');
        return false;
    }

    try {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtxClass) {
            alert('Seu navegador não suporta Web Audio API.');
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

        // Filtro Biquad Passa-Faixa para Tin Whistle (250Hz - 2200Hz, frequência central 950Hz, Q 0.7)
        // Arquitetura validada com sucesso em test-mic.html
        playAlongBiquad = playAlongAudioContext.createBiquadFilter();
        playAlongBiquad.type = 'bandpass';
        playAlongBiquad.frequency.setValueAtTime(950, playAlongAudioContext.currentTime);
        playAlongBiquad.Q.setValueAtTime(0.7, playAlongAudioContext.currentTime);

        playAlongAnalyser = playAlongAudioContext.createAnalyser();
        playAlongAnalyser.fftSize = 2048;

        // Nó de ganho mudo conectado ao destination para manter o grafo rodando ativamente sem eco/feedback
        const silenceGain = playAlongAudioContext.createGain();
        silenceGain.gain.setValueAtTime(0, playAlongAudioContext.currentTime);

        // Conectar fonte -> filtro biquad -> analisador -> silêncio -> saída
        source.connect(playAlongBiquad);
        playAlongBiquad.connect(playAlongAnalyser);
        playAlongAnalyser.connect(silenceGain);
        silenceGain.connect(playAlongAudioContext.destination);

        if (playalongMicBadge) {
            playalongMicBadge.textContent = 'Microfone ouvindo (Filtro Ativo)';
            playalongMicBadge.classList.add('active');
        }

        // CRÍTICO: Definir isPlayAlongRunning = true ANTES de iniciar o loop de animação!
        isPlayAlongRunning = true;
        updatePlayAlongAudioLoop();
        return true;
    } catch (err) {
        console.error('Erro ao acessar microfone no Play-Along:', err);
        alert('Não foi possível acessar o microfone. Verifique as permissões de áudio no seu navegador.');
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

    if (playalongMicBadge) {
        playalongMicBadge.textContent = 'Microfone desligado';
        playalongMicBadge.classList.remove('active');
    }
    if (playalongVuFill) {
        playalongVuFill.style.width = '0%';
    }
    if (paHeardNote) {
        paHeardNote.textContent = '--';
        paHeardNote.classList.remove('in-tune');
    }
    if (paHeardCents) {
        paHeardCents.textContent = '0.0 Hz (0¢)';
    }
    if (paGaugeNeedle) {
        paGaugeNeedle.style.left = '50%';
    }
    if (paPitchVerdict) {
        paPitchVerdict.textContent = 'Aguardando som...';
        paPitchVerdict.classList.remove('hit');
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

    const result = detectWhistlePitch(buf, sampleRate, micNoiseThreshold);
    const rms = result.rms;
    const pitch = result.pitch;

    // Atualização do VU Meter com resposta sensível ao sopro e destaque de Noise Gate
    if (playalongVuFill) {
        const vuWidth = Math.min(100, Math.round(rms * 500));
        playalongVuFill.style.width = `${vuWidth}%`;
        if (rms >= micNoiseThreshold) {
            playalongVuFill.classList.add('above-gate');
        } else {
            playalongVuFill.classList.remove('above-gate');
        }
    }

    const isSoundPresent = (pitch > 0 && pitch >= 250 && pitch <= 2400 && rms >= micNoiseThreshold);
    const target = getWhistleNoteTarget(playAlongCurrentIndex);

    if (target) {
        // CASO 1: O ALVO ATUAL É UMA PAUSA (REST)
        if (target.isRest) {
            if (paHeardNote) paHeardNote.textContent = isSoundPresent ? 'Sopro!' : 'Silêncio';
            if (paHeardCents) paHeardCents.textContent = isSoundPresent ? `${pitch.toFixed(1)} Hz` : '—';
            if (paGaugeNeedle) paGaugeNeedle.style.left = '50%';

            if (isSoundPresent) {
                // Usuário está soprando quando deveria estar em pausa
                playAlongRestSilenceCount = 0;
                if (playAlongMode === 'flow') {
                    playAlongFlowRestViolated = true;
                }
                if (paPitchVerdict) {
                    paPitchVerdict.textContent = 'Aguarde em silêncio (faça a pausa)...';
                    paPitchVerdict.classList.remove('hit');
                }
            } else {
                // Silêncio observado corretamente
                playAlongRestSilenceCount++;
                if (paPitchVerdict) {
                    paPitchVerdict.textContent = '✓ Pausa observada...';
                    paPitchVerdict.classList.add('hit');
                }
                // No modo Passo a Passo: avança automaticamente após silêncio estável (~130ms)
                if (playAlongMode === 'step' && playAlongRestSilenceCount >= 8) {
                    playAlongRestSilenceCount = 0;
                    playAlongWaitingForRelease = false;
                    handlePlayAlongStepHit();
                }
            }

            playAlongRafId = requestAnimationFrame(updatePlayAlongAudioLoop);
            return;
        }

        // CASO 2: AGUARDANDO RELEASE / PAUSA ENTRE NOTAS IGUAIS
        if (playAlongMode === 'step' && playAlongWaitingForRelease) {
            if (isSoundPresent) {
                // Usuário continua segurando o sopro da nota anterior
                playAlongReleaseSilenceCount = 0;
                playAlongNoteConfirmedCount = 0;
                if (paPitchVerdict) {
                    paPitchVerdict.textContent = 'Interrompa o sopro (faça a pausa) antes da próxima nota';
                    paPitchVerdict.classList.remove('hit');
                }
                if (paHeardNote) paHeardNote.textContent = 'Sopro contínuo';
                playAlongRafId = requestAnimationFrame(updatePlayAlongAudioLoop);
                return;
            } else {
                // Interrupção do sopro / silêncio detectado
                playAlongReleaseSilenceCount++;
                if (playAlongReleaseSilenceCount >= 3) { // ~50ms de interrupção
                    playAlongWaitingForRelease = false;
                    playAlongReleaseSilenceCount = 0;
                    if (paPitchVerdict) {
                        paPitchVerdict.textContent = 'Pronto! Toque a nota agora.';
                        paPitchVerdict.classList.remove('hit');
                    }
                }
                playAlongRafId = requestAnimationFrame(updatePlayAlongAudioLoop);
                return;
            }
        }
    }

    // CASO 3: PROCESSAMENTO DA NOTA MUSICAL
    if (isSoundPresent) {
        const noteNumber = noteFromPitchVal(pitch);
        const noteName = NOTE_STRINGS[noteNumber % 12];
        const octave = Math.floor(noteNumber / 12) - 1;
        const noteFullName = `${noteName}${octave}`;
        const cents = centsOffFromPitchVal(pitch, noteNumber);

        if (paHeardNote) {
            paHeardNote.textContent = noteFullName;
            if (Math.abs(cents) <= playAlongToleranceCents) {
                paHeardNote.classList.add('in-tune');
            } else {
                paHeardNote.classList.remove('in-tune');
            }
        }

        if (paHeardCents) {
            paHeardCents.textContent = `${pitch.toFixed(1)} Hz (${cents > 0 ? '+' : ''}${cents}¢)`;
        }

        if (paGaugeNeedle) {
            const clampedCents = Math.max(-50, Math.min(50, cents));
            const percent = 50 + clampedCents;
            paGaugeNeedle.style.left = `${percent}%`;
        }

        // Comparação com a Nota Alvo (incluindo número MIDI para equivalência enarmônica e oitava)
        checkPlayAlongNoteMatch(noteName, octave, cents, noteNumber);
    } else {
        if (paPitchVerdict && !paPitchVerdict.classList.contains('hit')) {
            paPitchVerdict.textContent = 'Aguardando som...';
        }
        playAlongNoteConfirmedCount = 0;
    }

    playAlongRafId = requestAnimationFrame(updatePlayAlongAudioLoop);
}

function checkPlayAlongNoteMatch(detectedName, detectedOctave, cents, detectedMidi) {
    const target = getWhistleNoteTarget(playAlongCurrentIndex);
    if (!target || target.isRest) return;

    // Comparar por classe de altura MIDI (resolve todos os enarmônicos: Bb/A#, Eb/D#, Ab/G#, Db/C#, Gb/F#)
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

    if (isNameMatch && isCentTolerated) {
        if (paPitchVerdict) {
            paPitchVerdict.textContent = '✓ Afinado!';
            paPitchVerdict.classList.add('hit');
        }

        playAlongNoteConfirmedCount++;

        // Confirmação temporal rápida (~50-70ms estável na nota)
        if (playAlongNoteConfirmedCount >= 2) {
            playAlongNoteConfirmedCount = 0;

            if (playAlongMode === 'step') {
                handlePlayAlongStepHit();
            } else {
                playAlongFlowNoteWasHit = true;
            }
        }
    } else {
        if (paPitchVerdict) {
            paPitchVerdict.classList.remove('hit');
            if (isNameMatch) {
                paPitchVerdict.textContent = cents > 0 ? 'Levemente alto' : 'Levemente baixo';
            } else {
                paPitchVerdict.textContent = `Ouvido: ${detectedName} | Esperado: ${target.display}`;
            }
        }
    }
}

function playHitFeedbackSound() {
    playHitFeedbackOnContext(playAlongAudioContext);
}

function handlePlayAlongStepHit() {
    const playable = getPlayableNoteIndices();
    const realIndex = playable[playAlongCurrentIndex];
    const noteEl = tabSheetEl ? tabSheetEl.querySelector(`.note-card[data-index="${realIndex}"]`) : null;

    if (noteEl) {
        noteEl.classList.remove('playalong-target');
        noteEl.classList.add('playalong-hit');
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
        // Conclusão com sucesso de toda a música!
        finishPlayAlongSession();
    } else {
        const nextTarget = getWhistleNoteTarget(playAlongCurrentIndex);

        // Se a próxima nota for idêntica à recém-tocada (mesma nota e oitava), exige corte de sopro/pausa antes de aceitar
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

// Modo No Ritmo (Avaliação Sincronizada com o Andamento / BPM)
function startPlayAlongFlowLoop() {
    const playable = getPlayableNoteIndices();
    if (playAlongCurrentIndex >= playable.length) return;

    const bpm = parseInt(songTempoEl.value) || 110;
    const speedMultiplier = parseFloat(playSpeedSelect.value) || 1.0;
    const baseInterval = (60 / (bpm * speedMultiplier)) * 1000;

    const realIndex = playable[playAlongCurrentIndex];
    const songNote = currentSong.notes[realIndex];
    const isRest = songNote.note === 'REST';
    const durRatio = parseFloat(songNote.duration) || 1.0;
    const noteDurationMs = baseInterval * durRatio;

    playAlongFlowNoteWasHit = false;
    playAlongFlowRestViolated = false;
    updatePlayAlongTargetUI();

    // Tocar áudio guia se habilitado (apenas para notas musicais)
    if (!isRest && togglePaBackingAudio && togglePaBackingAudio.checked) {
        try {
            initAudio();
            const freq = getTransposedFrequency(songNote.note, whistleKeyEl ? whistleKeyEl.value : 'D');
            if (freq > 0) {
                playWhistleSynth(freq, (noteDurationMs / 1000) * 0.9, audioCtx.currentTime, songNote.ornament);
            }
        } catch (e) {}
    }

    playAlongFlowTimer = setTimeout(() => {
        if (!isPlayAlongRunning || playAlongMode !== 'flow') return;

        const noteEl = tabSheetEl ? tabSheetEl.querySelector(`.note-card[data-index="${realIndex}"]`) : null;

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

        playAlongCurrentIndex++;
        updatePlayAlongStatsUI();

        if (playAlongCurrentIndex >= playable.length) {
            finishPlayAlongSession();
        } else {
            startPlayAlongFlowLoop();
        }
    }, noteDurationMs);
}

function finishPlayAlongSession() {
    stopPlayAlong();

    const total = playAlongTotalNotes || 1;
    const accuracy = Math.round((playAlongHits / total) * 100);

    let starCount = 1;
    let title = 'Bom Ensaio Celta!';
    let subtitle = 'Continue praticando para aprimorar sua afinação e precisão.';

    if (accuracy >= 90) {
        starCount = 3;
        title = 'Performance Céltica Excepcional!';
        subtitle = 'Precisão primorosa de afinação e ritmo digna de um mestre de Tin Whistle!';
    } else if (accuracy >= 70) {
        starCount = 2;
        title = 'Ótima Interpretação!';
        subtitle = 'Você tocou a grande maioria das notas com muita afinação e segurança.';
    }

    if (paResultStars) {
        let starsHtml = '';
        for (let i = 1; i <= 3; i++) {
            starsHtml += `<span class="star-item ${i <= starCount ? 'gold' : ''}">★</span>`;
        }
        paResultStars.innerHTML = starsHtml;
    }

    if (paResultTitle) paResultTitle.textContent = title;
    if (paResultSubtitle) paResultSubtitle.textContent = subtitle;
    if (paResultAccuracy) paResultAccuracy.textContent = `${accuracy}%`;
    if (paResultHits) paResultHits.textContent = `${playAlongHits} / ${total}`;
    if (paResultMaxCombo) paResultMaxCombo.textContent = `${playAlongMaxCombo}x 🔥`;

    showPlayAlongResultModal();
}

function showPlayAlongResultModal() {
    if (playalongResultModal) {
        playalongResultModal.style.display = 'flex';
    }
}

function hidePlayAlongResultModal() {
    if (playalongResultModal) {
        playalongResultModal.style.display = 'none';
    }
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
            alert(`A música "${currentSong ? currentSong.title : 'Melodia'}" foi salva com sucesso no armazenamento local!`);
        });
    }

    // ABA IMPORTAR: Importação de ABC
    if (btnImportCenterAbcApply && importCenterAbcTextarea) {
        btnImportCenterAbcApply.addEventListener('click', () => {
            const text = importCenterAbcTextarea.value.trim();
            if (!text) {
                if (importCenterAbcFeedback) {
                    importCenterAbcFeedback.className = 'abc-feedback error';
                    importCenterAbcFeedback.textContent = 'Por favor, cole o código ABC antes de importar.';
                    importCenterAbcFeedback.style.display = 'block';
                }
                return;
            }

            const res = parseABCNotation(text);
            if (res.error) {
                if (importCenterAbcFeedback) {
                    importCenterAbcFeedback.className = 'abc-feedback error';
                    importCenterAbcFeedback.textContent = res.error;
                    importCenterAbcFeedback.style.display = 'block';
                }
                return;
            }

            pushHistoryState('Importar Notação ABC');
            const newId = 'song-abc-' + Date.now();
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
                notes: res.notes || []
            };

            userSongs.unshift(importedSong);
            songs.unshift(importedSong);
            saveSongsToStorage();
            renderSidebar();
            selectSong(newId);
            closeExportModal();
            alert(`Melodia "${importedSong.title}" importada com sucesso (${res.notes.length} notas)!`);
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
                    importCenterAbcFeedback.textContent = `Arquivo "${file.name}" carregado. Clique em "Importar Notação ABC".`;
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
                importCenterJsonFeedback.textContent = 'Arquivo de backup processado com sucesso!';
                importCenterJsonFeedback.style.display = 'block';
            }
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
        btnExportPng.textContent = 'Gerando PNG em Alta Definição...';
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
                        btnExportPng.textContent = 'Baixar Imagem PNG (300 DPI)';
                    }

                    if (!pngBlob) {
                        alert('Não foi possível gerar o arquivo PNG.');
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
                    btnExportPng.textContent = 'Baixar Imagem PNG (300 DPI)';
                }
                alert('Erro ao converter imagem para PNG: ' + err.message);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            if (btnExportPng) {
                btnExportPng.disabled = false;
                btnExportPng.textContent = 'Baixar Imagem PNG (300 DPI)';
            }
            alert('Falha ao processar arquivo SVG para gerar imagem.');
        };

        img.src = url;
    } catch (e) {
        if (btnExportPng) {
            btnExportPng.disabled = false;
            btnExportPng.textContent = 'Baixar Imagem PNG (300 DPI)';
        }
        alert('Erro ao iniciar exportação PNG: ' + e.message);
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
        alert('Erro ao gerar arquivo MIDI: ' + e.message);
    }
}

async function downloadSongWAV() {
    if (!currentSong) return;

    if (btnExportWav) {
        btnExportWav.disabled = true;
        btnExportWav.textContent = 'Renderizando Áudio Celta...';
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
        alert('Falha ao renderizar áudio: ' + e.message);
    } finally {
        if (btnExportWav) {
            btnExportWav.disabled = false;
            btnExportWav.textContent = 'Baixar Áudio WAV (.wav)';
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
                mbWakelockLabel.textContent = (isLocked || wakeLockManualActive) ? 'Tela Ativa (Ligada)' : 'Manter Tela Acesa';
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
                const shareBtn = document.getElementById('btn-open-share-modal');
                if (shareBtn) {
                    shareBtn.click();
                }
            });
        }
    }
}


// ==========================================================================
// 17. FASE 8: PLATAFORMA COMUNITÁRIA & COMPARTILHAMENTO DE MÚSICAS NA NUVEM
// ==========================================================================

const btnOpenShareModal = document.getElementById('btn-open-share-modal');
const shareTuneModal = document.getElementById('share-tune-modal');
const btnCloseShareModal = document.getElementById('btn-close-share-modal');
const btnCancelShare = document.getElementById('btn-cancel-share');
const btnPublishTune = document.getElementById('btn-publish-tune');
const sharePreviewTitle = document.getElementById('share-preview-title');
const sharePreviewMeta = document.getElementById('share-preview-meta');
const shareAuthorInput = document.getElementById('share-author-input');
const shareSuccessBox = document.getElementById('share-success-box');
const shareGeneratedUrl = document.getElementById('share-generated-url');
const btnCopyShareUrl = document.getElementById('btn-copy-share-url');
const btnShareWhatsapp = document.getElementById('btn-share-whatsapp');
const btnShareTelegram = document.getElementById('btn-share-telegram');

function setupCommunityAndShare() {
    const shareCloudAuthorBadge = document.getElementById('share-cloud-author-badge');
    const shareVisPublic = document.getElementById('share-vis-public');
    const shareVisPrivate = document.getElementById('share-vis-private');

    // 1. Abrir Modal de Compartilhamento / Nuvem
    if (btnOpenShareModal) {
        btnOpenShareModal.addEventListener('click', () => {
            if (!currentSong) {
                alert('Selecione ou crie uma música primeiro para compartilhar.');
                return;
            }

            const isAuthorOfCloudSong = Boolean(
                currentSong.isCloud || 
                (currentBard && currentSong.user_id && currentSong.user_id === currentBard.id)
            );

            if (sharePreviewTitle) {
                sharePreviewTitle.textContent = currentSong.title || 'Melodia Sem Título';
            }
            if (sharePreviewMeta) {
                const noteCount = (currentSong.notes || []).filter(n => !['LINEBREAK', 'BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END'].includes(n.note)).length;
                sharePreviewMeta.textContent = `${currentSong.artist || 'Tradicional'} • Tom ${currentSong.key || 'D'} • ${currentSong.tempo || 110} BPM • ${noteCount} notas`;
            }

            // Autor pré-preenchido
            if (shareAuthorInput) {
                if (currentBard) {
                    shareAuthorInput.value = currentBard.displayName || currentBard.username;
                    shareAuthorInput.disabled = true; // Bardo logado não precisa alterar autor
                } else {
                    const savedAuthor = localStorage.getItem('tinwhistle_author_nickname');
                    shareAuthorInput.value = savedAuthor || 'Bardo Viajante';
                    shareAuthorInput.disabled = false;
                }
            }

            // Exibição de autoria na nuvem
            if (shareCloudAuthorBadge) {
                shareCloudAuthorBadge.style.display = isAuthorOfCloudSong ? 'block' : 'none';
            }

            // Visibilidade inicial
            if (shareVisPublic && shareVisPrivate) {
                if (currentSong.is_public === 0) {
                    shareVisPrivate.checked = true;
                } else {
                    shareVisPublic.checked = true;
                }
            }

            if (shareSuccessBox) shareSuccessBox.style.display = 'none';

            if (btnPublishTune) {
                btnPublishTune.disabled = false;
                if (isAuthorOfCloudSong) {
                    btnPublishTune.innerHTML = `
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        Salvar Alterações na Nuvem
                    `;
                } else {
                    btnPublishTune.innerHTML = `
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                        Publicar na Nuvem & Gerar Link
                    `;
                }
            }

            if (shareTuneModal) shareTuneModal.style.display = 'flex';
        });
    }

    const closeShare = () => {
        if (shareTuneModal) shareTuneModal.style.display = 'none';
    };
    if (btnCloseShareModal) btnCloseShareModal.addEventListener('click', closeShare);
    if (btnCancelShare) btnCancelShare.addEventListener('click', closeShare);

    // 2. Publicar ou Atualizar na API
    if (btnPublishTune) {
        btnPublishTune.addEventListener('click', async () => {
            if (!currentSong) return;
            const author = (shareAuthorInput ? shareAuthorInput.value.trim() : '') || 'Bardo Viajante';
            if (!currentBard) {
                localStorage.setItem('tinwhistle_author_nickname', author);
            }

            const isPublic = shareVisPublic ? shareVisPublic.checked : true;
            const isAuthorOfCloudSong = Boolean(
                currentSong.isCloud || 
                (currentBard && currentSong.user_id && currentSong.user_id === currentBard.id)
            );

            btnPublishTune.disabled = true;
            btnPublishTune.textContent = isAuthorOfCloudSong ? 'Salvando na Nuvem...' : 'Publicando...';

            try {
                const payload = {
                    title: currentSong.title,
                    artist: currentSong.artist || 'Tradicional',
                    key: currentSong.key || 'D',
                    tempo: currentSong.tempo || 110,
                    timeSignature: currentSong.timeSignature || '4/4',
                    category: currentSong.category || 'celtic',
                    difficulty: currentSong.difficulty || 'iniciante',
                    rhythm: currentSong.rhythm || 'reel',
                    notes: currentSong.notes || [],
                    author_name: author,
                    is_public: isPublic
                };

                let res;
                let result;

                if (isAuthorOfCloudSong && currentSong.id && !currentSong.id.startsWith('user-song-')) {
                    // Atualiza música existente na nuvem mantendo o ID
                    res = await fetch(`/api/tunes/${currentSong.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(payload)
                    });
                } else {
                    // Cria nova música na nuvem
                    res = await fetch('/api/tunes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(payload)
                    });
                }

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || 'Erro ao comunicar com o servidor');
                }

                result = await res.json();
                const updatedTune = result.tune || result;
                currentSong.id = updatedTune.id;
                currentSong.isCloud = true;
                currentSong.user_id = updatedTune.user_id || (currentBard ? currentBard.id : null);
                currentSong.is_public = updatedTune.is_public !== undefined ? updatedTune.is_public : (isPublic ? 1 : 0);

                const shareUrl = `${window.location.origin}/?tune=${updatedTune.id}`;

                if (shareGeneratedUrl) shareGeneratedUrl.value = shareUrl;
                if (btnShareWhatsapp) {
                    const text = encodeURIComponent(`Olha essa tablatura de Tin Whistle: "${currentSong.title}"!\nAbra e toque direto no navegador: ${shareUrl}`);
                    btnShareWhatsapp.href = `https://api.whatsapp.com/send?text=${text}`;
                }
                if (btnShareTelegram) {
                    const text = encodeURIComponent(`Tablatura de Tin Whistle: "${currentSong.title}"`);
                    btnShareTelegram.href = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`;
                }

                if (shareSuccessBox) {
                    const successTitle = shareSuccessBox.querySelector('span');
                    if (successTitle) {
                        successTitle.textContent = isPublic 
                            ? '✓ Tablatura publicada na comunidade com sucesso!' 
                            : '✓ Salvo como rascunho privado na sua nuvem!';
                    }
                    shareSuccessBox.style.display = 'block';
                }

                btnPublishTune.textContent = isAuthorOfCloudSong ? 'Salvo na Nuvem! ✓' : 'Publicado! ✓';

                // Atualiza perfil de bardos com novas contagens
                if (currentBard) {
                    initAuth();
                }

            } catch (err) {
                console.error('[Share] Erro:', err);
                alert('Não foi possível salvar na nuvem: ' + err.message);
                btnPublishTune.disabled = false;
                btnPublishTune.textContent = 'Tentar Novamente';
            }
        });
    }

    // 3. Copiar Link
    if (btnCopyShareUrl) {
        btnCopyShareUrl.addEventListener('click', async () => {
            if (!shareGeneratedUrl || !shareGeneratedUrl.value) return;
            try {
                await navigator.clipboard.writeText(shareGeneratedUrl.value);
                const originalText = btnCopyShareUrl.textContent;
                btnCopyShareUrl.textContent = 'Copiado! ✓';
                setTimeout(() => { btnCopyShareUrl.textContent = originalText; }, 2000);
            } catch (e) {
                shareGeneratedUrl.select();
                document.execCommand('copy');
                alert('Link copiado!');
            }
        });
    }
}

// 3.2. Renderizar "Minhas Músicas" combinando Nuvem do Bardo e LocalStorage
async function fetchAndRenderMyCloudAndLocalTunes(query = '') {
    songListEl.innerHTML = `
        <li style="padding: 20px 12px; text-align: center; color: var(--gold-primary); font-size: 0.85rem;">
            <span>☁️ Carregando suas músicas da nuvem...</span>
        </li>
    `;

    let cloudTunes = [];
    if (currentBard) {
        try {
            const res = await fetch('/api/my-tunes', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                cloudTunes = (data.tunes || []).map(t => ({
                    ...t,
                    isCloud: true,
                    isCurated: false
                }));
            }
        } catch (e) {
            console.warn('[My Tunes] Falha ao buscar nuvem:', e);
        }
    }

    // Músicas locais do localStorage
    const localUserTunes = (userSongs || []).map(t => ({ ...t, isCloud: false, isCurated: false }));

    // Evita duplicar se a música local já tiver o mesmo ID da nuvem
    const cloudIds = new Set(cloudTunes.map(t => t.id));
    const combinedTunes = [
        ...cloudTunes,
        ...localUserTunes.filter(t => !cloudIds.has(t.id))
    ];

    // Filtro de busca textual
    const filtered = combinedTunes.filter(t => {
        if (!query) return true;
        return (t.title && t.title.toLowerCase().includes(query)) ||
               (t.artist && t.artist.toLowerCase().includes(query));
    });

    if (songsCountBadge) {
        songsCountBadge.textContent = `${filtered.length} músicas suas`;
    }

    songListEl.innerHTML = '';
    const fragment = document.createDocumentFragment();

    // Se o bardo NÃO estiver logado, exibe banner convidativo no topo
    if (!currentBard) {
        const guestBanner = document.createElement('li');
        guestBanner.className = 'guest-cloud-banner';
        guestBanner.style.cssText = 'padding: 12px; margin-bottom: 8px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px; font-size: 0.8rem; color: var(--text-light); text-align: center;';
        guestBanner.innerHTML = `
            <div style="font-weight: 700; color: #6ee7b7; margin-bottom: 4px;">☁️ Suas Músicas na Nuvem</div>
            <p style="margin: 0 0 8px 0; font-size: 0.76rem; color: var(--text-muted); line-height: 1.3;">
                Faça login para salvar seus rascunhos na nuvem com backup automático e edição em qualquer aparelho!
            </p>
            <button type="button" class="btn btn-primary btn-sm" id="btn-login-from-mysongs" style="width: 100%; justify-content: center;">
                👤 Entrar na Guilda dos Bardos
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
        emptyLi.style.cssText = 'padding: 24px 12px; text-align: center; color: var(--text-muted); font-size: 0.85rem;';
        emptyLi.innerHTML = `
            <p>Você ainda não criou nenhuma música.</p>
            <button class="btn btn-primary btn-sm" id="btn-create-first-song" style="margin-top: 10px;">Compor Nova Melodia</button>
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

        const isPublic = tune.is_public !== 0;
        const isLocalOnly = !tune.isCloud || tune.syncStatus === 'pending';
        const isRemixTune = Boolean(tune.parent_id || tune.parent_author);
        const statusBadge = tune.isCloud 
            ? (isPublic 
                ? `<span class="badge-tag" style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.35);">🌍 Pública</span>` 
                : `<span class="badge-tag" style="background: rgba(245, 158, 11, 0.2); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.35);">🔒 Privada</span>`)
            : `<span class="badge-tag" style="background: rgba(255, 255, 255, 0.08); color: var(--text-muted); border: 1px solid rgba(255,255,255,0.15);">📱 Local</span>`;

        li.innerHTML = `
            <div class="song-item-info">
                <div class="song-item-title-row">
                    <span class="song-item-title">${escapeHTML(tune.title)}</span>
                </div>
                <span class="song-item-meta">${escapeHTML(tune.artist || 'Tradicional')} • Tom ${tune.key || 'D'} • ${tune.tempo || 110} BPM</span>
                <div class="song-badges">
                    ${statusBadge}
                    ${isRemixTune ? `<span class="badge-tag" style="background: rgba(245, 158, 11, 0.2); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.4);" title="Variação de ${escapeHTML(tune.parent_author || 'Original')}">🔀 Variação</span>` : ''}
                    ${isLocalOnly ? `<span class="badge-offline-sync" title="Partitura guardada apenas na memória local deste aparelho">💾 Apenas local</span>` : ''}
                    <span class="badge-key">Tom ${tune.key || 'D'}</span>
                    ${tune.isCloud && tune.likes ? `<span class="badge-diff" style="color: #f43f5e;">❤️ ${tune.likes}</span>` : ''}
                </div>
            </div>
            <div class="song-item-actions" style="opacity: 1; display: flex; gap: 4px;">
                ${tune.isCloud ? `
                    <button type="button" class="btn-icon btn-toggle-vis" title="${isPublic ? 'Tornar Privada (Ocultar da comunidade)' : 'Publicar na Comunidade'}" style="color: ${isPublic ? 'var(--emerald-primary)' : 'var(--gold-primary)'};">
                        ${isPublic ? '🔒' : '🚀'}
                    </button>
                ` : (currentBard ? `
                    <button type="button" class="btn-icon btn-upload-cloud" title="Enviar para a sua nuvem" style="color: var(--gold-primary);">
                        ☁️
                    </button>
                ` : '')}
                <button type="button" class="btn-icon delete btn-delete-mysong" title="Excluir Música">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;

        // Abrir ao clicar
        li.addEventListener('click', async (e) => {
            if (e.target.closest('.song-item-actions')) return;

            if (tune.isCloud) {
                // Se notas já estão em memória
                const inMem = songs.find(s => s.id === tune.id);
                if (inMem && Array.isArray(inMem.notes) && inMem.notes.length > 0) {
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
                    const exIdx = songs.findIndex(s => s.id === fullTune.id);
                    if (exIdx !== -1) songs[exIdx] = fullTune;
                    else songs.unshift(fullTune);
                    selectSong(fullTune.id);
                } catch (err) {
                    alert('Erro ao abrir música da nuvem: ' + err.message);
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
                const newVis = !isPublic;
                try {
                    const vRes = await fetch(`/api/tunes/${tune.id}/visibility`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ is_public: newVis })
                    });
                    if (vRes.ok) {
                        fetchAndRenderMyCloudAndLocalTunes(query);
                    }
                } catch (err) {
                    alert('Erro ao alterar visibilidade: ' + err.message);
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
                            title: localSong.title,
                            artist: localSong.artist || 'Tradicional',
                            key: localSong.key || 'D',
                            tempo: localSong.tempo || 110,
                            timeSignature: localSong.timeSignature || '4/4',
                            category: localSong.category || 'celtic',
                            difficulty: localSong.difficulty || 'iniciante',
                            rhythm: localSong.rhythm || 'reel',
                            notes: localSong.notes || [],
                            is_public: false // Começa privada
                        })
                    });
                    if (res.ok) {
                        fetchAndRenderMyCloudAndLocalTunes(query);
                    }
                } catch (e) {
                    alert('Erro ao enviar para nuvem: ' + e.message);
                }
            });
        }

        // Excluir música
        const delBtn = li.querySelector('.btn-delete-mysong');
        if (delBtn) {
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm(`Tem certeza que deseja excluir "${tune.title}"?`)) return;

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
                        alert('Erro ao excluir da nuvem: ' + err.message);
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

// 4. Carregar música compartilhada se presente na URL (?tune=XYZ)
async function checkSharedTuneInURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const tuneId = urlParams.get('tune');
    if (!tuneId) return;

    try {
        const res = await fetch(`/api/tunes/${encodeURIComponent(tuneId)}`);
        if (!res.ok) return;
        const tune = await res.json();

        // Adiciona à lista de músicas como comunitária
        tune.isCurated = false;
        tune.isCommunity = true;
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
    }
}

// ==========================================
// CONTROLE DE LIKES ÚNICOS E CATÁLOGO COMUNITÁRIO
// ==========================================
let userLikedTuneIds = new Set();

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
        alert('É necessário entrar na guilda para curtir uma partitura.');
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
                    btn.style.background = 'rgba(244, 63, 94, 0.2)';
                    btn.style.borderColor = 'rgba(244, 63, 94, 0.5)';
                    btn.title = 'Descurtir partitura';
                    btn.innerHTML = `❤️ <span class="like-count">${data.likes}</span>`;
                } else {
                    btn.classList.remove('liked');
                    btn.style.background = 'rgba(0,0,0,0.3)';
                    btn.style.borderColor = 'rgba(255,255,255,0.1)';
                    btn.title = 'Curtir partitura';
                    btn.innerHTML = `🤍 <span class="like-count">${data.likes}</span>`;
                }
            });
        } else {
            alert(data.error || 'Erro ao processar curtida.');
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
        <li style="padding: 24px 12px; text-align: center; color: var(--gold-primary); font-size: 0.85rem;">
            <span>🌍 Buscando tablaturas na comunidade...</span>
        </li>
    `;

    try {
        let sortParam = 'popular';
        if (currentSongSort === 'remixes') sortParam = 'remixes';
        else if (currentSongSort === 'title-asc' || currentSongSort === 'title-desc') sortParam = 'title';
        const res = await fetch(`/api/tunes?q=${encodeURIComponent(query)}&sort=${sortParam}`);
        if (!res.ok) throw new Error('Servidor da comunidade indisponível');
        const data = await res.json();
        const tunes = data.tunes || [];

        if (songsCountBadge) {
            songsCountBadge.textContent = `${tunes.length} músicas na comunidade`;
        }

        if (tunes.length === 0) {
            songListEl.innerHTML = `
                <li style="padding: 24px 12px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                    <p>Nenhuma música compartilhada encontrada.</p>
                    <button class="btn btn-primary btn-sm" id="btn-be-first-sharer" style="margin-top: 10px;">Seja o primeiro a compartilhar!</button>
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
                ? `<span class="badge-tag" style="background: rgba(234, 179, 8, 0.2); color: #fde047; border: 1px solid rgba(234, 179, 8, 0.4);">⭐ Curadoria Oficial</span>`
                : `<span class="badge-tag" style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.35);">🌍 Comunidade</span>`;

            const canAdminModerate = Boolean(currentBard && currentBard.isAdmin);
            const adminActionsHtml = canAdminModerate ? `
                <button type="button" class="btn-admin-delete-tune" data-id="${tune.id}" data-title="${escapeHTML(tune.title)}" title="[Admin] Excluir tablatura por moderação" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 6px; color: #f87171; padding: 4px 6px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">
                    🗑️
                </button>
            ` : '';

            const hasLiked = userLikedTuneIds.has(tune.id);
            const heartIcon = hasLiked ? '❤️' : '🤍';
            const likeBtnStyle = hasLiked 
                ? 'background: rgba(244, 63, 94, 0.2); border: 1px solid rgba(244, 63, 94, 0.5); border-radius: 6px; color: #f43f5e; padding: 3px 6px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 3px;'
                : 'background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #f43f5e; padding: 3px 6px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 3px;';

            let authorMeta = tune.author_name ? ` • Por ${escapeHTML(tune.author_name)}` : '';
            if (tune.parent_author) {
                authorMeta += ` (Variação de ${escapeHTML(tune.parent_author)})`;
            }

            li.innerHTML = `
                <div class="song-item-info">
                    <div class="song-item-title-row">
                        <span class="song-item-title">${escapeHTML(tune.title)}</span>
                    </div>
                    <span class="song-item-meta">${escapeHTML(tune.artist || 'Tradicional')}${authorMeta}</span>
                    <div class="song-badges">
                        ${badgeTagHtml}
                        ${tune.parent_author ? `<span class="badge-tag" style="background: rgba(245, 158, 11, 0.2); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.4);" title="Variação de ${escapeHTML(tune.parent_author)}">🔀 Remix</span>` : ''}
                        <span class="badge-key">Tom ${tune.key || 'D'}</span>
                        <span class="badge-rhythm">${tune.tempo || 110} BPM</span>
                        ${tune.remix_count ? `<span class="badge-diff" title="${tune.remix_count} variações criadas pela comunidade">🔀 ${tune.remix_count}</span>` : ''}
                    </div>
                </div>
                <div class="song-item-actions" style="opacity: 1; display: flex; align-items: center; gap: 6px;">
                    <button type="button" class="btn-like-community ${hasLiked ? 'liked' : ''}" data-id="${tune.id}" title="${hasLiked ? 'Descurtir partitura' : 'Curtir partitura'}" style="${likeBtnStyle}">
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
                    alert('Erro ao carregar partitura da comunidade: ' + err.message);
                }
            });

            // Botão de Moderação do Administrador
            const adminDelBtn = li.querySelector('.btn-admin-delete-tune');
            if (adminDelBtn) {
                adminDelBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const songTitle = adminDelBtn.dataset.title;
                    if (!confirm(`[Moderação] Tem certeza que deseja excluir a música "${songTitle}" permanentemente da comunidade?`)) {
                        return;
                    }

                    try {
                        const delRes = await fetch(`/api/tunes/${tune.id}`, {
                            method: 'DELETE',
                            credentials: 'include'
                        });
                        const delData = await delRes.json();
                        if (!delRes.ok) throw new Error(delData.error || 'Erro ao excluir música.');
                        alert('Música removida com sucesso pela moderação.');
                        li.remove();
                    } catch (err) {
                        alert('Erro ao excluir música: ' + err.message);
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
            <li style="padding: 24px 12px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                <p>⚠️ Não foi possível conectar ao servidor da comunidade.</p>
                <p style="font-size: 0.78rem; opacity: 0.8; margin-top: 4px;">As músicas do seu catálogo local continuam 100% disponíveis!</p>
            </li>
        `;
    }
}

// ==========================================================================
// SISTEMA DE CONTAS & PERFIL DO BARDO (FASE 8.2 - ETAPA 1)
// ==========================================================================

let currentBard = null;

function updateUserButtonUI() {
    const userBtnLabel = document.getElementById('user-btn-label');
    const userAvatarBadge = document.getElementById('user-avatar-badge');
    const userIconSvg = document.getElementById('user-icon-svg');
    const shareAuthorInput = document.getElementById('share-author-input');

    if (currentBard) {
        const dName = currentBard.displayName || currentBard.display_name || currentBard.username || 'B';
        const initial = dName[0].toUpperCase();
        if (userAvatarBadge) {
            userAvatarBadge.textContent = initial;
            userAvatarBadge.style.display = 'inline-flex';
            if (currentBard.isAdmin) {
                userAvatarBadge.style.boxShadow = '0 0 8px rgba(234, 179, 8, 0.8)';
                userAvatarBadge.style.border = '1px solid #fde047';
            } else {
                userAvatarBadge.style.boxShadow = 'none';
                userAvatarBadge.style.border = 'none';
            }
        }
        if (userIconSvg) userIconSvg.style.display = 'none';
        if (userBtnLabel) {
            const shortName = dName.split(' ')[0];
            userBtnLabel.textContent = currentBard.isAdmin ? `👑 ${shortName} ▾` : `${shortName} ▾`;
        }
        if (shareAuthorInput && !shareAuthorInput.value) {
            shareAuthorInput.value = dName;
        }
    } else {
        if (userAvatarBadge) userAvatarBadge.style.display = 'none';
        if (userIconSvg) userIconSvg.style.display = 'inline-block';
        if (userBtnLabel) userBtnLabel.textContent = 'Entrar';
    }
}

async function initAuth() {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.user) {
            currentBard = {
                ...data.user,
                displayName: data.user.displayName || data.user.display_name || data.user.username,
                isAdmin: Boolean(data.user.isAdmin || data.user.is_admin),
                stats: data.stats || { tunesCount: 0, totalLikes: 0 }
            };
            console.log('[Auth] Bardo conectado:', currentBard.displayName, currentBard.isAdmin ? '(Admin)' : '');
            await loadUserLikes();
        } else {
            currentBard = null;
            userLikedTuneIds.clear();
        }
        updateUserButtonUI();
        updateOfflineSyncIndicator();
        if (currentSong) {
            setEditorReadOnlyMode(isSongReadOnly(currentSong), currentSong);
        }
    } catch (e) {
        console.warn('[Auth] Não foi possível verificar sessão:', e);
        currentBard = null;
        userLikedTuneIds.clear();
        updateUserButtonUI();
        updateOfflineSyncIndicator();
        if (currentSong) {
            setEditorReadOnlyMode(isSongReadOnly(currentSong), currentSong);
        }
    }
}

function setupAuthListeners() {
    const btnOpenUserModal = document.getElementById('btn-open-user-modal');
    const authModal = document.getElementById('auth-modal');
    const profileModal = document.getElementById('profile-modal');
    const btnCloseAuth = document.getElementById('btn-close-auth');
    const btnCloseProfile = document.getElementById('btn-close-profile');

    const tabAuthLogin = document.getElementById('tab-auth-login');
    const tabAuthRegister = document.getElementById('tab-auth-register');
    const formAuthLogin = document.getElementById('form-auth-login');
    const formAuthRegister = document.getElementById('form-auth-register');
    const authRegisterSuccess = document.getElementById('auth-register-success');
    const loginErrorMsg = document.getElementById('login-error-msg');
    const registerErrorMsg = document.getElementById('register-error-msg');
    const recoveryPhraseBox = document.getElementById('auth-recovery-phrase-box');
    const btnCopyRecoveryPhrase = document.getElementById('btn-copy-recovery-phrase');
    const btnFinishAuthSuccess = document.getElementById('btn-finish-auth-success');

    const formProfileEdit = document.getElementById('form-profile-edit');
    const profileEditName = document.getElementById('profile-edit-name');
    const profileViewDisplayname = document.getElementById('profile-view-displayname');
    const profileViewUsername = document.getElementById('profile-view-username');
    const profileAvatarLarge = document.getElementById('profile-avatar-large');
    const profileStatsTunes = document.getElementById('profile-stats-tunes-count');
    const profileStatsLikes = document.getElementById('profile-stats-likes-count');
    const profileAdminBadge = document.getElementById('profile-admin-badge');
    const profileUpdateMsg = document.getElementById('profile-update-msg');
    const btnProfileLogout = document.getElementById('btn-profile-logout');

    const openAuthTab = (tab) => {
        if (!tabAuthLogin || !tabAuthRegister) return;
        if (tab === 'login') {
            tabAuthLogin.classList.add('active');
            tabAuthRegister.classList.remove('active');
            tabAuthLogin.style.borderBottomColor = 'var(--emerald-primary)';
            tabAuthLogin.style.color = 'var(--emerald-primary)';
            tabAuthRegister.style.borderBottomColor = 'transparent';
            tabAuthRegister.style.color = 'var(--text-muted)';
            if (formAuthLogin) formAuthLogin.style.display = 'block';
            if (formAuthRegister) formAuthRegister.style.display = 'none';
            if (authRegisterSuccess) authRegisterSuccess.style.display = 'none';
        } else {
            tabAuthRegister.classList.add('active');
            tabAuthLogin.classList.remove('active');
            tabAuthRegister.style.borderBottomColor = 'var(--emerald-primary)';
            tabAuthRegister.style.color = 'var(--emerald-primary)';
            tabAuthLogin.style.borderBottomColor = 'transparent';
            tabAuthLogin.style.color = 'var(--text-muted)';
            if (formAuthLogin) formAuthLogin.style.display = 'none';
            if (formAuthRegister) formAuthRegister.style.display = 'block';
            if (authRegisterSuccess) authRegisterSuccess.style.display = 'none';
        }
        if (loginErrorMsg) loginErrorMsg.style.display = 'none';
        if (registerErrorMsg) registerErrorMsg.style.display = 'none';
    };

    if (tabAuthLogin) tabAuthLogin.addEventListener('click', () => openAuthTab('login'));
    if (tabAuthRegister) tabAuthRegister.addEventListener('click', () => openAuthTab('register'));

    const openModal = () => {
        if (currentBard) {
            // Abre perfil
            const dName = currentBard.displayName || currentBard.display_name || currentBard.username;
            if (profileViewDisplayname) profileViewDisplayname.textContent = dName;
            if (profileViewUsername) profileViewUsername.textContent = `@${currentBard.username}`;
            if (profileAvatarLarge) profileAvatarLarge.textContent = (dName || 'B')[0].toUpperCase();
            if (profileEditName) profileEditName.value = dName;
            if (profileStatsTunes) profileStatsTunes.textContent = currentBard.stats ? currentBard.stats.tunesCount : 0;
            if (profileStatsLikes) profileStatsLikes.textContent = `❤️ ${currentBard.stats ? currentBard.stats.totalLikes : 0}`;
            if (profileAdminBadge) {
                profileAdminBadge.style.display = currentBard.isAdmin ? 'inline-block' : 'none';
            }
            if (profileUpdateMsg) profileUpdateMsg.style.display = 'none';
            if (profileModal) profileModal.style.display = 'flex';
        } else {
            // Abre login/cadastro
            openAuthTab('login');
            if (authModal) authModal.style.display = 'flex';
            setTimeout(() => {
                const userInput = document.getElementById('login-username');
                if (userInput) userInput.focus();
            }, 100);
        }
    };

    const closeModals = () => {
        if (authModal) authModal.style.display = 'none';
        if (profileModal) profileModal.style.display = 'none';
    };

    if (btnOpenUserModal) btnOpenUserModal.addEventListener('click', openModal);
    if (btnCloseAuth) btnCloseAuth.addEventListener('click', closeModals);
    if (btnCloseProfile) btnCloseProfile.addEventListener('click', closeModals);

    // Fechar ao clicar no backdrop
    [authModal, profileModal].forEach(m => {
        if (m) {
            m.addEventListener('click', (e) => {
                if (e.target === m) closeModals();
            });
        }
    });

    // 1. Submit Login
    if (formAuthLogin) {
        formAuthLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            const btnSubmit = document.getElementById('btn-submit-login');

            if (loginErrorMsg) loginErrorMsg.style.display = 'none';
            if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = 'Entrando...'; }

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Falha ao autenticar.');

                currentBard = {
                    ...data.user,
                    displayName: data.user.displayName || data.user.display_name || data.user.username,
                    isAdmin: Boolean(data.user.isAdmin || data.user.is_admin),
                    stats: data.stats || { tunesCount: 0, totalLikes: 0 }
                };
                await loadUserLikes();
                updateUserButtonUI();
                updateOfflineSyncIndicator();
                if (currentSong) {
                    setEditorReadOnlyMode(isSongReadOnly(currentSong), currentSong);
                }
                closeModals();
                renderSidebar();
                syncOfflineTunes(false);
                console.log('[Auth] Login realizado com sucesso:', currentBard.displayName, currentBard.isAdmin ? '(Admin)' : '');
            } catch (err) {
                if (loginErrorMsg) {
                    loginErrorMsg.textContent = err.message;
                    loginErrorMsg.style.display = 'block';
                }
            } finally {
                if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = 'Entrar na Guilda'; }
            }
        });
    }

    // 2. Submit Cadastro
    if (formAuthRegister) {
        formAuthRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            const displayName = document.getElementById('register-displayname').value.trim();
            const username = document.getElementById('register-username').value.trim();
            const password = document.getElementById('register-password').value;
            const btnSubmit = document.getElementById('btn-submit-register');

            if (registerErrorMsg) registerErrorMsg.style.display = 'none';
            if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = 'Registrando bardo...'; }

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ displayName, username, password })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Falha ao cadastrar.');

                currentBard = {
                    ...data.user,
                    displayName: data.user.displayName || data.user.display_name || data.user.username,
                    isAdmin: Boolean(data.user.isAdmin || data.user.is_admin),
                    stats: data.stats || { tunesCount: 0, totalLikes: 0 }
                };
                await loadUserLikes();
                updateUserButtonUI();
                updateOfflineSyncIndicator();
                if (currentSong) {
                    setEditorReadOnlyMode(isSongReadOnly(currentSong), currentSong);
                }
                renderSidebar();
                syncOfflineTunes(false);

                // Exibe vista de sucesso com frase mnemônica
                if (formAuthRegister) formAuthRegister.style.display = 'none';
                if (recoveryPhraseBox) recoveryPhraseBox.textContent = data.recoveryPhrase;
                if (authRegisterSuccess) authRegisterSuccess.style.display = 'block';
            } catch (err) {
                if (registerErrorMsg) {
                    registerErrorMsg.textContent = err.message;
                    registerErrorMsg.style.display = 'block';
                }
            } finally {
                if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = 'Tornar-se um Bardo'; }
            }
        });
    }

    // 3. Copiar frase de recuperação
    if (btnCopyRecoveryPhrase && recoveryPhraseBox) {
        btnCopyRecoveryPhrase.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(recoveryPhraseBox.textContent.trim());
                btnCopyRecoveryPhrase.textContent = 'Copiada com sucesso! ✓';
                setTimeout(() => { btnCopyRecoveryPhrase.textContent = '📋 Copiar Frase de Recuperação'; }, 2000);
            } catch (e) {
                alert('Frase copiada!');
            }
        });
    }

    if (btnFinishAuthSuccess) {
        btnFinishAuthSuccess.addEventListener('click', () => {
            closeModals();
            updateUserButtonUI();
            renderSidebar();
        });
    }

    // 4. Editar nome de exibição no Perfil
    if (formProfileEdit) {
        formProfileEdit.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = profileEditName.value.trim();
            const btnSave = document.getElementById('btn-save-profile-name');

            if (profileUpdateMsg) profileUpdateMsg.style.display = 'none';
            if (btnSave) { btnSave.disabled = true; btnSave.textContent = 'Salvando...'; }

            try {
                const res = await fetch('/api/auth/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ displayName: newName })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Erro ao atualizar.');

                currentBard.displayName = data.user.display_name || data.user.displayName || newName;
                if (profileViewDisplayname) profileViewDisplayname.textContent = currentBard.displayName;
                if (profileAvatarLarge) profileAvatarLarge.textContent = (currentBard.displayName || 'B')[0].toUpperCase();
                updateUserButtonUI();
                renderSidebar();

                if (profileUpdateMsg) {
                    profileUpdateMsg.textContent = '✓ Nome atualizado com sucesso!';
                    profileUpdateMsg.style.display = 'block';
                }
            } catch (err) {
                alert('Erro ao salvar nome: ' + err.message);
            } finally {
                if (btnSave) { btnSave.disabled = false; btnSave.textContent = 'Salvar'; }
            }
        });
    }

    // 5. Logout
    if (btnProfileLogout) {
        btnProfileLogout.addEventListener('click', async () => {
            try {
                await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
            } catch (e) {}
            currentBard = null;
            userLikedTuneIds.clear();
            updateUserButtonUI();
            updateOfflineSyncIndicator();
            if (currentSong) {
                setEditorReadOnlyMode(isSongReadOnly(currentSong), currentSong);
            }
            closeModals();
            renderSidebar();
            console.log('[Auth] Bardo desconectado.');
        });
    }
}

// ==========================================================================
// FASE 8.3: MODO SOMENTE LEITURA, BOTÃO DE REMIX & SINCRONIZAÇÃO OFFLINE
// ==========================================================================

let isCurrentSongReadOnly = false;

function isSongReadOnly(song) {
    if (!song) return false;
    // 1. Partituras da curadoria nativa são protegidas
    if (song.isCurated) return true;

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
            textNotesInputEl.placeholder = "Partitura protegida em modo somente leitura. Para editar as notas ou cifras, crie o seu remix no botão acima!";
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

    // 4. Banner de Modo Leitura
    const banner = document.getElementById('readonly-mode-banner');
    const creditsTag = document.getElementById('readonly-banner-credits');
    const titleEl = document.getElementById('readonly-banner-title');
    const subtextEl = document.getElementById('readonly-banner-subtext');

    if (banner) {
        if (isCurrentSongReadOnly) {
            if (titleEl) {
                titleEl.textContent = 'Partitura Protegida (Modo Leitura)';
            }
            if (creditsTag) {
                if (song && (song.parent_author || song.parent_id)) {
                    creditsTag.textContent = `🔀 Variação de ${song.parent_author || 'Original'}`;
                    creditsTag.style.display = 'inline-flex';
                } else if (song && song.isCurated) {
                    creditsTag.textContent = '⭐ Repertório da Curadoria';
                    creditsTag.style.display = 'inline-flex';
                } else if (song && song.author_name) {
                    creditsTag.textContent = `👤 Bardo: ${song.author_name}`;
                    creditsTag.style.display = 'inline-flex';
                } else {
                    creditsTag.style.display = 'none';
                }
            }
            if (subtextEl) {
                subtextEl.textContent = 'Você pode tocar, praticar com metrônomo/drone e usar o Play-Along. Para modificar as notas, crie o seu remix!';
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
}

function updateReadOnlyBannerVisibility() {
    const banner = document.getElementById('readonly-mode-banner');
    if (!banner) return;
    const isStudio = (document.body.dataset.appMode || currentAppMode || 'studio') === 'studio';
    if (isCurrentSongReadOnly && isStudio) {
        banner.style.display = 'flex';
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

    // Gera novo ID único
    const newId = 'remix-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);

    const bardName = currentBard 
        ? (currentBard.displayName || currentBard.display_name || currentBard.username) 
        : 'Meu Bardo';

    const remixSong = {
        id: newId,
        title: `${baseTitle} (Variação)`,
        artist: bardName,
        key: currentSong.key || 'D',
        timeSignature: currentSong.timeSignature || '4/4',
        tempo: currentSong.tempo || 110,
        category: currentSong.category || 'celtic',
        difficulty: currentSong.difficulty || 'iniciante',
        rhythm: currentSong.rhythm || 'reel',
        notes: clonedNotes,
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
    localStorage.setItem('celtic_whistle_tabs_user', JSON.stringify(userSongs));

    // Se estiver online e autenticado, tenta sincronizar imediatamente com a nuvem
    if (currentBard && navigator.onLine) {
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
                    is_public: 0,
                    parent_id: remixSong.parent_id,
                    parent_author: remixSong.parent_author
                })
            });
            if (res.ok) {
                remixSong.syncStatus = 'synced';
                remixSong.isCloud = true;
                const uIdx = userSongs.findIndex(s => s.id === remixSong.id);
                if (uIdx !== -1) userSongs[uIdx].syncStatus = 'synced';
                localStorage.setItem('celtic_whistle_tabs_user', JSON.stringify(userSongs));
            }
        } catch (err) {
            console.warn('[Remix] Salvo localmente, pendente de sincronização:', err);
        }
    }

    updateOfflineSyncIndicator();
    renderSidebar();
    await selectSong(remixSong.id);

    showNotificationToast(`🔀 Variação criada com sucesso! Partitura desbloqueada para edição.`);
}

function updateOfflineSyncIndicator() {
    const btnSync = document.getElementById('btn-sync-offline-tunes');
    if (!btnSync) return;

    const pendingTunes = (userSongs || []).filter(s => !s.isCurated && (s.syncStatus === 'pending' || !s.isCloud));
    if (currentBard && navigator.onLine && pendingTunes.length > 0) {
        btnSync.style.display = 'inline-block';
        btnSync.textContent = `🔄 Sincronizar (${pendingTunes.length})`;
    } else {
        btnSync.style.display = 'none';
    }
}

async function syncOfflineTunes(showToast = true) {
    if (!currentBard) {
        if (showToast) {
            alert('Entre na sua conta de Bardo para sincronizar suas músicas com a nuvem!');
            const userModalBtn = document.getElementById('btn-open-user-modal');
            if (userModalBtn) userModalBtn.click();
        }
        return;
    }

    if (!navigator.onLine) {
        if (showToast) showNotificationToast('⚠️ Sem conexão com a internet no momento.');
        return;
    }

    const pendingTunes = (userSongs || []).filter(s => !s.isCurated && (s.syncStatus === 'pending' || !s.isCloud));
    if (pendingTunes.length === 0) {
        if (showToast) showNotificationToast('✨ Todas as suas partituras já estão sincronizadas com a nuvem!');
        return;
    }

    const btnSync = document.getElementById('btn-sync-offline-tunes');
    if (btnSync) btnSync.textContent = '⏳ Sincronizando...';

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

    localStorage.setItem('celtic_whistle_tabs_user', JSON.stringify(userSongs));
    updateOfflineSyncIndicator();
    renderSidebar();

    if (syncedCount > 0 && showToast) {
        showNotificationToast(`☁️ ${syncedCount} música(s) sincronizada(s) com a nuvem com sucesso!`);
    }
}

function showNotificationToast(message) {
    const existing = document.querySelector('.whistle-toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'whistle-toast-notification';
    toast.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast && toast.parentNode) toast.remove();
    }, 4000);
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
}

function syncBackingModalUI() {
    if (toggleBodhran) toggleBodhran.checked = !!backingSettings.bodhranActive;
    if (sliderBodhranVol) sliderBodhranVol.value = Math.round((backingSettings.bodhranVolume || 0.75) * 100);
    if (valBodhranVol) valBodhranVol.textContent = `${sliderBodhranVol ? sliderBodhranVol.value : 75}%`;
    if (selectBodhranStyle) selectBodhranStyle.value = backingSettings.rhythmStyle || 'auto';

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
                if (lbl) lbl.textContent = 'Demo do Autor';
                return;
            }

            // Parar o sequenciador se estiver tocando para não encavalar
            if (isPlaying) pausePlayback();

            if (!activeDemoAudioInstance || activeDemoAudioInstance.src !== demoUrl) {
                activeDemoAudioInstance = new Audio(demoUrl);
                activeDemoAudioInstance.addEventListener('ended', () => {
                    btnPlayAudioDemo.classList.remove('playing');
                    const lbl = btnPlayAudioDemo.querySelector('span:last-child');
                    if (lbl) lbl.textContent = 'Demo do Autor';
                });
            }

            activeDemoAudioInstance.play().then(() => {
                btnPlayAudioDemo.classList.add('playing');
                const lbl = btnPlayAudioDemo.querySelector('span:last-child');
                if (lbl) lbl.textContent = 'Pausar Demo';
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
        alert('Seu navegador não suporta captura de microfone.');
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
        alert('Não foi possível acessar o microfone para gravação. Verifique as permissões de áudio no seu navegador.');
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
    if (currentBard && currentSong.id && !currentSong.id.startsWith('user-song-')) {
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
    showNotificationToast('🎙️ Demonstração em áudio real salva com sucesso na partitura!');
}

async function deleteSavedDemoFromSong() {
    if (!currentSong) return;
    if (!confirm('Deseja realmente remover a gravação de áudio desta música?')) return;

    currentSong.audio_demo = null;
    currentSong.audioDemo = null;
    saveSongsToStorage();
    updateSongDisplayBanner(currentSong);

    if (currentBard && currentSong.id && !currentSong.id.startsWith('user-song-')) {
        try {
            await fetch(`/api/tunes/${encodeURIComponent(currentSong.id)}/demo`, { method: 'DELETE' });
        } catch (e) {}
    }

    if (audioDemoModal) audioDemoModal.style.display = 'none';
    showNotificationToast('Demonstração em áudio removida.');
}




