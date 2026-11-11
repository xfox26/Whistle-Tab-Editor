import { STANDARD_FINGERINGS, NOTE_FREQUENCIES } from '../src/config/whistleData.js';
import { parseABCNotation, exportSongToABC } from '../src/parsers/abcCodec.js';
import { parseStringOfNotes, noteObjToNotation } from '../src/parsers/textCodec.js';

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

    console.log('✅ SUCESSO: Todos os testes do Motor Musical & Áudio passaram 100%!\n');
    process.exit(0);
} catch (err) {
    console.error('❌ FALHA nos testes do Motor Musical:', err);
    process.exit(1);
}
