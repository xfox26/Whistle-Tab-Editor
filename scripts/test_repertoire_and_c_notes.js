/**
 * TESTE AUTOMATIZADO: AUDITORIA DO REPERTÓRIO CURADO, NOTAS C (DÓ) E SÍNTESE ACÚSTICA
 */

import assert from 'node:assert';
import { CURATED_REPERTOIRE } from '../repertoire.js';
import { NOTE_FREQUENCIES, WHISTLE_KEYS_DATA, STANDARD_FINGERINGS } from '../src/config/whistleData.js';
import { getTransposedFrequency, scheduleWhistleVoice } from '../src/audio/synthEngine.js';
import { listTunes, getTuneById } from '../server/db.js';

console.log('--- INICIANDO AUDITORIA DO REPERTÓRIO, NOTAS C E SÍNTESE DE ÁUDIO ---\n');

// =========================================================================
// [Teste 1] Auditoria Completa das 17 Músicas do Repertório Curado
// =========================================================================
console.log('[Teste 1] Auditando integridade melódica e tessitura das 17 músicas curadas...');
assert.strictEqual(CURATED_REPERTOIRE.length, 17, 'O repertório curado deve conter exatamente 17 músicas.');

const songsWithC = [];
CURATED_REPERTOIRE.forEach((song, idx) => {
    assert(song.id, `Música #${idx + 1} deve ter id válido`);
    assert(song.title, `Música #${idx + 1} deve ter título válido`);
    assert(Array.isArray(song.notes) && song.notes.length > 0, `Música ${song.title} deve ter array de notas`);

    const noteNames = song.notes
        .filter(n => n.note && !['BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END', 'REST'].includes(n.note))
        .map(n => n.note);

    // Nenhuma música curada deve conter C6 na 1ª oitava
    const c6Notes = noteNames.filter(n => n === 'C6');
    assert.strictEqual(c6Notes.length, 0, `Música "${song.title}" (${song.id}) não deve conter C6 errôneo.`);

    const c5Notes = noteNames.filter(n => n === 'C5');
    if (c5Notes.length > 0) {
        songsWithC.push({ id: song.id, title: song.title, count: c5Notes.length });
    }
});

console.log(`✓ 17 músicas auditadas. Músicas com C natural (C5 - 1046.50Hz):`);
songsWithC.forEach(s => console.log(`   - ${s.title} (${s.id}): ${s.count} nota(s) C5`));
assert.strictEqual(songsWithC.length, 5, 'Exatamente 5 músicas do repertório curado utilizam Dó natural (C5).');

// =========================================================================
// [Teste 2] Auditoria do Banco de Dados SQLite Ativo (data/tinwhistle.db)
// =========================================================================
console.log('\n[Teste 2] Verificando persistência e ausência de C6 no banco de dados SQLite...');
const dbResult = listTunes({ limit: 100 });
assert(dbResult.total >= 17, 'O banco de dados deve conter ao menos as 17 músicas da biblioteca');

songsWithC.forEach(curated => {
    const tune = getTuneById(curated.id);
    assert(tune, `Música ${curated.title} (${curated.id}) deve existir no banco de dados`);
    const notesJson = JSON.stringify(tune.notes);
    assert(!notesJson.includes('"C6"'), `Música no banco de dados não deve conter "C6": ${curated.title}`);
    assert(notesJson.includes('"C5"'), `Música no banco de dados deve conter "C5": ${curated.title}`);
});
console.log('✓ Banco de dados SQLite 100% sincronizado com as notas C5 corretas.');

// =========================================================================
// [Teste 3] Verificação Acústica e Frequências Físicas
// =========================================================================
console.log('\n[Teste 3] Verificando frequências acústicas e dedilhados de C5 e C6...');
assert.strictEqual(NOTE_FREQUENCIES['C5'], 1046.50, 'Frequência de C5 deve ser 1046.50 Hz (1ª oitava)');
assert.strictEqual(NOTE_FREQUENCIES['C6'], 2093.00, 'Frequência de C6 deve ser 2093.00 Hz (2ª oitava)');
assert.strictEqual(NOTE_FREQUENCIES['C#6'], 1108.73, 'Frequência de C#6 deve ser 1108.73 Hz (1ª oitava)');
assert.strictEqual(NOTE_FREQUENCIES['C#7'], 2217.46, 'Frequência de C#7 deve ser 2217.46 Hz (2ª oitava)');

// Dedilhado padrão de C natural: [0, 1, 1, 1, 1, 0] (oxxx xo)
assert.deepStrictEqual(STANDARD_FINGERINGS['C5'], [0, 1, 1, 1, 1, 0], 'Dedilhado de C5 deve ser oxxx xo');
assert.deepStrictEqual(STANDARD_FINGERINGS['C6'], [0, 1, 1, 1, 1, 0], 'Dedilhado de C6 deve ser oxxx xo');

// Transposição para outras afinações
const transC5inC = getTransposedFrequency('C5', 'C'); // Em C (Dó), flauta transpositora 2 semitons abaixo
assert(Math.abs(transC5inC - (1046.50 * Math.pow(2, -2/12))) < 0.1, 'Transposição para flauta em C deve respeitar semitons');
console.log('✓ Frequências fundamentais, semitons e digitações de C validados.');

// =========================================================================
// [Teste 4] Auditoria do Motor de Síntese Web Audio (synthEngine.js)
// =========================================================================
console.log('\n[Teste 4] Validando gerador de som (chiff, filtros e vibrato adaptativo)...');

function createMockAudioContext() {
    const events = [];
    return {
        currentTime: 0,
        sampleRate: 44100,
        destination: { name: 'destination' },
        createOscillator() {
            return {
                type: 'sine',
                frequency: {
                    setValueAtTime: (val, t) => events.push({ target: 'osc.freq', method: 'setValueAtTime', val, time: t }),
                    linearRampToValueAtTime: (val, t) => events.push({ target: 'osc.freq', method: 'linearRampToValueAtTime', val, time: t }),
                    exponentialRampToValueAtTime: (val, t) => events.push({ target: 'osc.freq', method: 'exponentialRampToValueAtTime', val, time: t })
                },
                connect() {},
                start(t) { events.push({ target: 'osc', method: 'start', time: t }); },
                stop(t) { events.push({ target: 'osc', method: 'stop', time: t }); }
            };
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
                Q: { setValueAtTime: (val, t) => events.push({ target: 'filter.Q', val, time: t }) },
                frequency: {
                    setValueAtTime: (val, t) => events.push({ target: 'filter.freq', val, time: t })
                },
                connect() {}
            };
        },
        createBuffer(ch, size, sr) {
            return { getChannelData: () => new Float32Array(size) };
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

// 4.1 Validando nota C5 rápida (duração 0.2s - reel/jig)
const mockCtxFast = createMockAudioContext();
scheduleWhistleVoice(mockCtxFast, NOTE_FREQUENCIES['C5'], 0.2, 0.5, null, 'C5', 'D', false);
const eventsFast = mockCtxFast.getEvents();

// Q do bandpass deve ser 3.5 (sopro aerodinâmico natural)
const bandpassQEvent = eventsFast.find(e => e.target === 'filter.Q' && Math.abs(e.val - 3.5) < 0.01);
assert(bandpassQEvent, 'O filtro do sopro (chiff) deve ter Q natural calibrado em 3.5');

// Em nota rápida (< 0.28s), vibrato inicial deve ser 0 para estabilidade de afinação
const gainEventsFast = eventsFast.filter(e => e.target === 'gain' && e.method === 'setValueAtTime');
assert(gainEventsFast.some(e => e.val === 0 && e.time === 0.5), 'Nota rápida deve manter vibrato inicial nulo');
console.log('✓ Q do filtro de ruído calibrado em 3.5 (elimina chiado/ressonância artificial).');
console.log('✓ Notas rápidas (< 0.28s) tocam com afinação estável sem vibrato prematuro.');

// 4.2 Validando nota sustentada (duração 0.6s) com entrada expressiva gradual do vibrato
const mockCtxLong = createMockAudioContext();
scheduleWhistleVoice(mockCtxLong, NOTE_FREQUENCIES['C5'], 0.6, 1.0, null, 'C5', 'D', false);
const eventsLong = mockCtxLong.getEvents();
const vibratoRamp = eventsLong.find(e => e.target === 'gain' && e.method === 'linearRampToValueAtTime');
assert(vibratoRamp, 'Nota sustentada deve acionar rampa linear de vibrato expressivo');
console.log('✓ Notas longas sustentadas aplicam entrada expressiva de vibrato estilo celta.');

// 4.3 Validando compensação acústica para notas agudas da 2ª oitava (> 1200 Hz)
const mockCtxHigh = createMockAudioContext();
scheduleWhistleVoice(mockCtxHigh, NOTE_FREQUENCIES['C6'], 0.4, 2.0, null, 'C6', 'D', false);
const eventsHigh = mockCtxHigh.getEvents();
// Ganho de pico de nota normal é 0.20 * 0.84 = 0.168
const highPeakGain = eventsHigh.find(e => e.target === 'gain' && e.method === 'linearRampToValueAtTime' && Math.abs(e.val - 0.168) < 0.01);
assert(highPeakGain, `A segunda oitava deve aplicar atenuação compensada de Fletcher-Munson (pico ~0.168, obtido: ${JSON.stringify(highPeakGain)})`);
console.log('✓ Compensação de ganho para notas agudas da 2ª oitava aplicada com sucesso.');

console.log('\n=========================================================================');
console.log(' TODAS AS AUDITORIAS DO REPERTÓRIO E SÍNTESE FORAM APROVADAS COM 100%! ');
console.log('=========================================================================\n');
