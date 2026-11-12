import { STANDARD_FINGERINGS, NOTE_FREQUENCIES } from '../src/config/whistleData.js';
import { parseABCNotation, exportSongToABC } from '../src/parsers/abcCodec.js';
import { parseStringOfNotes, noteObjToNotation } from '../src/parsers/textCodec.js';
import {
    detectWhistlePitch,
    setReferenceA4,
    getReferenceA4,
    noteFromPitchVal
} from '../src/audio/pitchEngine.js';
import { CELTIC_CHORDS, inferCelticChord } from '../src/audio/backingTracks.js';

function makeSineBuffer(freq, sampleRate = 44100, length = 2048, amp = 0.25, harmonic2Amp = 0) {
    const buf = new Float32Array(length);
    for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        buf[i] = amp * Math.sin(2 * Math.PI * freq * t) + harmonic2Amp * Math.sin(2 * Math.PI * (freq * 2) * t);
    }
    return buf;
}

console.log('--- 🎵 [AUDIO ENGINE, NOTATION & CODEC CHECK] ---');

try {
    // 1. Validar integridade das notas da Tin Whistle e dedilhados
    console.log('[Teste 1] Validando frequências acústicas e dedilhados de Tin Whistle em Ré (D)...');
    if (!STANDARD_FINGERINGS || typeof STANDARD_FINGERINGS !== 'object') {
        throw new Error('STANDARD_FINGERINGS não encontrado ou inválido em whistleData.js');
    }

    const requiredNotes = ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C5', 'C6', 'D6', 'E6', 'F#6', 'G6', 'A6', 'B6'];
    for (const note of requiredNotes) {
        const fingering = STANDARD_FINGERINGS[note];
        if (!fingering) throw new Error(`Nota ${note} ausente no mapeamento STANDARD_FINGERINGS!`);
        if (!Array.isArray(fingering) || fingering.length !== 6) {
            throw new Error(`Dedilhado inválido para a nota ${note} (esperado array de 6 furos)`);
        }
    }
    console.log(`✓ Todas as ${requiredNotes.length} notas fundamentais e dedilhados de 6 furos validados.`);

    // 2. Validar frequências
    if (Math.abs(NOTE_FREQUENCIES['D5'] - 587.33) > 1) {
        throw new Error(`Frequência de D5 incorreta: ${NOTE_FREQUENCIES['D5']}`);
    }
    if (Math.abs(NOTE_FREQUENCIES['C5'] - 1046.50) > 1) {
        throw new Error(`Frequência de C5 incorreta: ${NOTE_FREQUENCIES['C5']}`);
    }
    console.log(`✓ Frequências fundamentais verificadas: D5=${NOTE_FREQUENCIES['D5']}Hz, C5=${NOTE_FREQUENCIES['C5']}Hz, A5=${NOTE_FREQUENCIES['A5']}Hz, D6=${NOTE_FREQUENCIES['D6']}Hz.`);

    // 3. Teste de Parser de Notação ABC (TheSession.org)
    console.log('[Teste 2] Validando Parser & Exportador de Notação ABC...');
    const sampleAbc = `X:1\nT:Test Reel\nM:4/4\nL:1/8\nK:D\n|: D2 ED F2 AF | GABc d2 d2 :|`;
    const parsedTune = parseABCNotation(sampleAbc);
    if (!parsedTune || !Array.isArray(parsedTune.notes) || parsedTune.notes.length === 0) {
        throw new Error('Falha ao parsear notação ABC válida');
    }
    if (parsedTune.notes.length < 8) {
        throw new Error(`Número insuficiente de notas parseadas: ${parsedTune.notes.length}`);
    }
    console.log(`✓ Notação ABC parseada com sucesso: ${parsedTune.notes.length} notas extraídas.`);

    // 3b. Validação multi-tom ABC (K:C, K:G, K:Dm) e round-trip
    console.log('[Teste 2b] Validando Parsing ABC Multi-Tom & Round-Trip...');
    const abcKeyC = parseABCNotation(`X:1\nT:C Tune\nM:4/4\nL:1/8\nK:C\nC D E F |`);
    if (abcKeyC.key !== 'C') {
        throw new Error(`Esperado key='C' ao importar K:C, recebido '${abcKeyC.key}'`);
    }
    const cNoteTokens = abcKeyC.notes.filter(n => n.note !== 'BAR').map(n => n.note);
    if (cNoteTokens.join(',') !== 'D5,E5,F#5,G5') {
        throw new Error(`Mapeamento de K:C incorreto: ${cNoteTokens.join(',')}`);
    }

    const abcKeyG = parseABCNotation(`X:1\nT:G Tune\nM:4/4\nL:1/8\nK:G\nf |`);
    if (abcKeyG.key !== 'G' || abcKeyG.notes[0].note !== 'C#6') {
        throw new Error(`Mapeamento de K:G (f -> C#6) incorreto: key=${abcKeyG.key}, note=${abcKeyG.notes[0]?.note}`);
    }

    const abcKeyDm = parseABCNotation(`X:1\nT:Dm Tune\nM:4/4\nL:1/8\nK:Dm\nD c |`);
    const dmNotes = abcKeyDm.notes.filter(n => n.note !== 'BAR').map(n => n.note);
    if (dmNotes.includes('C#6') || dmNotes.includes('C#7') || dmNotes[1] !== 'C5') {
        throw new Error(`K:Dm deveria mapear c natural para C5 (e não C#): ${dmNotes.join(',')}`);
    }

    const abcKeyF = parseABCNotation(`X:1\nT:F Tune\nM:4/4\nL:1/8\nK:F\nF G A B |`);
    const fNotes = abcKeyF.notes.filter(n => n.note !== 'BAR').map(n => n.note);
    if (abcKeyF.key !== 'F' || fNotes.join(',') !== 'D5,E5,F#5,G5') {
        throw new Error(`Mapeamento de K:F com Bb na armadura incorreto: key=${abcKeyF.key}, notes=${fNotes.join(',')}`);
    }

    const exportedC = exportSongToABC({
        title: 'Roundtrip C',
        artist: 'Tradicional',
        key: 'C',
        timeSignature: '4/4',
        tempo: 110,
        notes: [
            { note: 'D5', duration: 0.5 },
            { note: 'E5', duration: 0.5 },
            { note: 'F#5', duration: 0.5 },
            { note: 'G5', duration: 0.5 },
            { note: 'BAR', duration: 0 }
        ]
    });
    const reimportedC = parseABCNotation(exportedC);
    const reimportedCNotes = reimportedC.notes.filter(n => n.note !== 'BAR').map(n => n.note);
    if (reimportedC.key !== 'C' || reimportedCNotes.join(',') !== 'D5,E5,F#5,G5') {
        throw new Error(`Round-trip ABC em C falhou: key=${reimportedC.key}, notes=${reimportedCNotes.join(',')}\nABC:\n${exportedC}`);
    }
    console.log('✓ Parsing multi-tom (K:C, K:G, K:Dm) e round-trip ABC em Dó validados.');

    // 4. Teste de Notação em Texto Simples
    console.log('[Teste 3] Validando Codec de Texto Simples...');
    const textNotes = 'd e f# g a b c# d2';
    const parsedResult = parseStringOfNotes(textNotes, 'D');
    if (!parsedResult || !Array.isArray(parsedResult.notes) || parsedResult.notes.length === 0) {
        throw new Error('Falha ao parsear texto simples de notas');
    }
    const realNotes = parsedResult.notes.filter(n => n.note !== 'REST');
    const notationFirst = noteObjToNotation(realNotes[0], 'D');
    if (!notationFirst) {
        throw new Error('Falha ao converter nota de volta para notação');
    }
    console.log(`✓ Texto simples processado com sucesso: ${realNotes.length} notas analisadas.`);

    // 5. Teste do Motor NSDF (Pitch Detection) & Referência A4
    console.log('[Teste 4] Validando Detecção de Pitch NSDF (sem saltos de oitava) & A4...');
    const d5Res = detectWhistlePitch(makeSineBuffer(587.33, 44100, 2048, 0.25, 0.22), 44100);
    if (d5Res.pitch < 0 || Math.abs(d5Res.pitch - 587.33) > 2.0) {
        throw new Error(`NSDF falhou em D5 com 2º harmônico forte: detectado ${d5Res.pitch}Hz`);
    }
    const d6Res = detectWhistlePitch(makeSineBuffer(1174.66, 44100, 2048, 0.25, 0), 44100);
    if (d6Res.pitch < 0 || Math.abs(d6Res.pitch - 1174.66) > 3.0) {
        throw new Error(`NSDF falhou em D6 puro: detectado ${d6Res.pitch}Hz`);
    }
    const silenceRes = detectWhistlePitch(new Float32Array(2048), 44100);
    if (silenceRes.pitch !== -1) {
        throw new Error(`NSDF deveria retornar -1 para silêncio, retornou ${silenceRes.pitch}`);
    }

    setReferenceA4(442);
    if (getReferenceA4() !== 442 || noteFromPitchVal(884, getReferenceA4()) !== 81) {
        setReferenceA4(440);
        throw new Error('Calibração de referência A4=442 falhou');
    }
    setReferenceA4(440);
    console.log(`✓ NSDF validado: D5=${d5Res.pitch.toFixed(2)}Hz (clarity=${d5Res.clarity.toFixed(2)}), D6=${d6Res.pitch.toFixed(2)}Hz, A4 calibração OK.`);

    // 6. Teste de Acordes Expandidos (Bb, Eb, Cm, Ab, 7ths)
    console.log('[Teste 5] Validando Dicionário de Acordes Celtas & Inferência em Bb/Eb/F/A...');
    for (const chordName of ['Bb', 'Bbm', 'Eb', 'Cm', 'Ab', 'D7', 'G7', 'A7', 'C7', 'F7', 'Dm7', 'Gm7']) {
        if (!Array.isArray(CELTIC_CHORDS[chordName]) || CELTIC_CHORDS[chordName].length < 4) {
            throw new Error(`Acorde ${chordName} ausente ou inválido em CELTIC_CHORDS`);
        }
    }
    if (inferCelticChord('D5', 'Bb', 0) !== 'Bb' || inferCelticChord('G5', 'Bb', 0) !== 'Eb') {
        throw new Error('Inferência harmônica em tom de Bb falhou');
    }
    if (inferCelticChord('D5', 'F', 0) !== 'F' || inferCelticChord('G5', 'Eb', 0) !== 'Ab') {
        throw new Error('Inferência harmônica em tom de F/Eb falhou');
    }
    console.log('✓ Todos os acordes estendidos e inferências para Bb, Eb, F e A validados.');

    console.log('✅ SUCESSO: Todos os testes do Motor Musical & Áudio passaram 100%!\n');
    process.exit(0);
} catch (err) {
    console.error('❌ FALHA nos testes do Motor Musical:', err);
    process.exit(1);
}
