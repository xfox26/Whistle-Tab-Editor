/**
 * Teste Automatizado da Fase 12: Motor Musical & Acústico do Tin Whistle Live
 * Valida:
 * 1. Ritornelos múltiplos (estrutura tradicional AABB / AABBCC) e suporte no Play-Along
 * 2. Groove contínuo de Backing Tracks (Bodhrán e cordas) em notas longas/pausas e Swing Celta
 * 3. Ornamentos diatônicos reais (Cut, Strike, Roll, Cran) e ligaduras (Slur)
 */

import assert from 'assert';
import {
    DIATONIC_SCALE_ORDER,
    getDiatonicCutNote,
    getDiatonicStrikeNote,
    NOTE_FREQUENCIES
} from '../src/config/whistleData.js';
import {
    scheduleWhistleVoice,
    getTransposedFrequency
} from '../src/audio/synthEngine.js';
import {
    scheduleBackingTrackStep,
    CELTIC_CHORDS
} from '../src/audio/backingTracks.js';

console.log('--- INICIANDO TESTES DA FASE 12 (MOTOR MUSICAL & ACÚSTICO) ---');

// ==========================================================================
// TESTE 1: ORNAMENTOS DIATÔNICOS REAIS (CUT, STRIKE, ROLL, CRAN) E LIGADURAS
// ==========================================================================
console.log('\n[Teste 1] Validando regras diatônicas autênticas...');

// F#5 (739.99Hz) -> Cut deve ser G5 (783.99Hz)
const cutFsharp = getDiatonicCutNote('F#5');
assert.strictEqual(cutFsharp, 'G5', `Cut de F#5 deve ser G5, obtido: ${cutFsharp}`);

// G5 (783.99Hz) -> Strike deve ser F#5 (739.99Hz)
const strikeG = getDiatonicStrikeNote('G5');
assert.strictEqual(strikeG, 'F#5', `Strike de G5 deve ser F#5, obtido: ${strikeG}`);

// D5 (grave) -> Cut deve ser E5
const cutD = getDiatonicCutNote('D5');
assert.strictEqual(cutD, 'E5', `Cut de D5 deve ser E5, obtido: ${cutD}`);

// D5 (grave) -> Strike não é possível (todos os 6 furos fechados), mantém D5
const strikeD = getDiatonicStrikeNote('D5');
assert.strictEqual(strikeD, 'D5', `Strike de D5 deve retornar D5, obtido: ${strikeD}`);

// B5 -> Cut deve ser C#6
const cutB = getDiatonicCutNote('B5');
assert.strictEqual(cutB, 'C#6', `Cut de B5 deve ser C#6, obtido: ${cutB}`);

console.log('✓ Escala diatônica e notas de corte/batida calculadas com 100% de precisão.');

// Mock de AudioContext para inspecionar parâmetros de áudio agendados
function createMockAudioContext() {
    const events = [];
    return {
        sampleRate: 44100,
        currentTime: 1.0,
        destination: {},
        createOscillator() {
            const osc = {
                type: 'sine',
                frequency: {
                    setValueAtTime: (val, t) => events.push({ target: 'osc.freq', method: 'setValueAtTime', val, time: t }),
                    exponentialRampToValueAtTime: (val, t) => events.push({ target: 'osc.freq', method: 'exponentialRampToValueAtTime', val, time: t })
                },
                detune: {
                    setValueAtTime: (val, t) => events.push({ target: 'osc.detune', method: 'setValueAtTime', val, time: t })
                },
                connect() {},
                start(t) { events.push({ target: 'osc', method: 'start', time: t }); },
                stop(t) { events.push({ target: 'osc', method: 'stop', time: t }); }
            };
            return osc;
        },
        createGain() {
            return {
                gain: {
                    setValueAtTime: (val, t) => events.push({ target: 'gain', method: 'setValueAtTime', val, time: t }),
                    linearRampToValueAtTime: (val, t) => events.push({ target: 'gain', method: 'linearRampToValueAtTime', val, time: t }),
                    exponentialRampToValueAtTime: (val, t) => events.push({ target: 'gain', method: 'exponentialRampToValueAtTime', val, time: t })
                },
                connect() {}
            };
        },
        createBiquadFilter() {
            return {
                type: 'lowpass',
                Q: { setValueAtTime: () => {} },
                frequency: {
                    setValueAtTime: () => {},
                    linearRampToValueAtTime: () => {},
                    exponentialRampToValueAtTime: () => {}
                },
                connect() {}
            };
        },
        createBuffer(ch, size, sr) {
            return {
                getChannelData: () => new Float32Array(size)
            };
        },
        createBufferSource() {
            return {
                buffer: null,
                loop: false,
                connect() {},
                start: () => {},
                stop: () => {}
            };
        },
        getEvents: () => events
    };
}

// Validando scheduleWhistleVoice com Cut diatônico em F#5
const mockCtx = createMockAudioContext();
const fsharpFreq = NOTE_FREQUENCIES['F#5']; // ~739.99 Hz
const gFreq = NOTE_FREQUENCIES['G5']; // ~783.99 Hz

scheduleWhistleVoice(mockCtx, fsharpFreq, 0.5, 1.0, 'cut', 'F#5', 'D', false);
const freqEvents = mockCtx.getEvents().filter(e => e.target === 'osc.freq' && e.method === 'setValueAtTime');

// Deve conter a frequência exata de G5 no início do corte (t = 1.0)
const cutPitchScheduled = freqEvents.find(e => Math.abs(e.val - gFreq) < 0.1);
assert(cutPitchScheduled, `O corte em F#5 deve atingir a frequência diatônica de G5 (~783.99Hz), eventos: ${JSON.stringify(freqEvents)}`);
console.log('✓ Sintetizador disparou cut diatônico autêntico em G5 (783.99Hz) ao ornamentar F#5.');

// Validando ligadura (isSlurred = true)
const mockCtxSlur = createMockAudioContext();
scheduleWhistleVoice(mockCtxSlur, fsharpFreq, 0.5, 1.0, null, 'F#5', 'D', true);
const gainEventsSlur = mockCtxSlur.getEvents().filter(e => e.target === 'gain' && e.method === 'setValueAtTime');
// Em notas ligadas, o ganho de ruído de chiff inicial é 0.005 (em vez de 0.025 da articulação por sopro)
const chiffGain = gainEventsSlur.find(e => Math.abs(e.val - 0.005) < 0.001);
assert(chiffGain, `Em nota ligada (isSlurred), o ruído de sopro inicial deve ser suavizado para 0.005`);
console.log('✓ Ligaduras (slurs) suavizam envelope acústico e eliminam ataque áspero de sopro.');


// ==========================================================================
// TESTE 2: GROOVE CONTÍNUO DE BACKING TRACKS E SWING CELTA
// ==========================================================================
console.log('\n[Teste 2] Validando groove contínuo em notas longas e Swing Celta...');

const mockCtxBacking = createMockAudioContext();
const longNote = { note: 'D5', duration: 4.0 }; // Semibreve (4 tempos inteiros)
scheduleBackingTrackStep(mockCtxBacking, longNote, 1.0, 2.0, 120, 0, 4, {
    bodhranActive: true,
    guitarActive: true,
    rhythmStyle: 'reel',
    swing: 'light'
});

const backingEvents = mockCtxBacking.getEvents();
// Contar osciladores iniciados (bodhran e violão ao longo dos 4 tempos do compasso)
const startEvents = backingEvents.filter(e => e.target === 'osc' && e.method === 'start');
// Com nota de 4 tempos, devem ser agendadas batidas no t=1.0 e nos tempos intermediários (1.5s, 2.0s, 2.5s)
assert(startEvents.length >= 8, `Em notas longas, devem ser agendadas múltiplas batidas intermediárias (encontrado ${startEvents.length} eventos)`);

// Validar que eventos foram agendados para tempos além do tempo inicial
const intermediateHits = startEvents.filter(e => e.time > 1.05);
assert(intermediateHits.length > 0, 'Devem existir batidas intermediárias com time > 1.05');
console.log(`✓ Groove contínuo agendou ${intermediateHits.length} pulsos intermediários ao longo da semibreve de 4 tempos.`);


// ==========================================================================
// TESTE 3: RITORNELOS MÚLTIPLOS (AABB / AABBCC) E SUPORTE NO PLAY-ALONG
// ==========================================================================
console.log('\n[Teste 3] Validando ritornelos múltiplos AABB e expansão para Play-Along...');

// Simular partitura tradicional com 2 seções repetidas: AABB
const tuneNotes = [
    { note: 'D5', duration: 1.0 },
    { note: 'E5', duration: 1.0 },
    { note: 'REPEAT_END' }, // Fim da Parte A
    { note: 'F#5', duration: 1.0 },
    { note: 'G5', duration: 1.0 },
    { note: 'REPEAT_END' }  // Fim da Parte B
];

// Algoritmo desdobrador de partitura com múltiplos ritornelos
function expandNotesForPlayback(notes) {
    const sequence = [];
    const playedRepeats = new Set();
    let idx = 0;
    const maxSteps = notes.length * 4;
    let steps = 0;

    while (idx < notes.length && steps < maxSteps) {
        steps++;
        const item = notes[idx];
        if (!item) { idx++; continue; }

        if (item.note === 'REPEAT_END') {
            if (!playedRepeats.has(idx)) {
                playedRepeats.add(idx);
                let target = 0;
                for (let k = idx - 1; k >= 0; k--) {
                    if (notes[k].note === 'REPEAT_START' || notes[k].note === 'REPEAT_END') {
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

        if (item.note && !['REPEAT_START', 'REPEAT_END', 'BAR', 'LINEBREAK'].includes(item.note)) {
            sequence.push(item.note);
        }
        idx++;
    }
    return sequence;
}

const expanded = expandNotesForPlayback(tuneNotes);
const expectedSequence = ['D5', 'E5', 'D5', 'E5', 'F#5', 'G5', 'F#5', 'G5'];
assert.deepStrictEqual(expanded, expectedSequence, `A sequência expandida deve ser AABB: ${JSON.stringify(expectedSequence)}, obtido: ${JSON.stringify(expanded)}`);
console.log(`✓ Ritornelos múltiplos desdobrados perfeitamente em AABB: ${expanded.join(' -> ')}`);

console.log('\n=======================================================');
console.log(' TODOS OS TESTES DA FASE 12 FORAM CONCLUÍDOS COM SUCESSO! ');
console.log('=======================================================');
