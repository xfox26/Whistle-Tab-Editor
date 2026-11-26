import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

import { WHISTLE_KEYS_DATA } from '../src/config/whistleData.js';
import {
    getNoteStaffInfo,
    computeBeamGroups,
    createStaffClefSVG,
    createStaffNoteSVG,
    createStaffMeasureBarSVG,
    createMiniStaffSVG
} from '../src/editor/sheetNotation.js';
import { parseABCNotation } from '../src/parsers/abcCodec.js';
import { generateSongSVG } from '../src/export/exporters.js';
import { handleApiRequest } from '../server/api.js';

console.log('--- 🎼 [TESTES DO MODO PARTITURA (EXIBIÇÃO, EDIÇÃO & EXPORTAÇÃO)] ---');

// --------------------------------------------------------------------------
// 1. TESTES UNITÁRIOS DE NOTAÇÃO EM PAUTA (TODAS AS 7 AFINAÇÕES)
// --------------------------------------------------------------------------
console.log('\n[Teste 1] Validando getNoteStaffInfo nas 7 afinações (D, C, G, A, Bb, F, Eb)...');

// Flauta em D: D5 -> D4 (step -1, sem acidente), F#5 -> F#4 (step 1, #), C#6 -> C#5 (step 5, #), D6 -> D5 (step 6)
const d5InD = getNoteStaffInfo('D5', 'D');
assert.equal(d5InD.letter, 'D');
assert.equal(d5InD.accidental, '');
assert.equal(d5InD.step, -1);
assert.equal(d5InD.stemDir, 'up');

const fs5InD = getNoteStaffInfo('F#5', 'D');
assert.equal(fs5InD.letter, 'F');
assert.equal(fs5InD.accidental, '#');
assert.equal(fs5InD.step, 1);

const cs6InD = getNoteStaffInfo('C#6', 'D');
assert.equal(cs6InD.letter, 'C');
assert.equal(cs6InD.accidental, '#');
assert.equal(cs6InD.step, 5);
assert.equal(cs6InD.stemDir, 'down');

const bbInD = getNoteStaffInfo('A#5', 'D');
assert.equal(bbInD.letter, 'B');
assert.equal(bbInD.accidental, 'b');
assert.equal(bbInD.step, 4);

// Flauta em C: D5 -> C4 (step -2, 1 linha suplementar inferior)
const lowC = getNoteStaffInfo('D5', 'C');
assert.equal(lowC.letter, 'C');
assert.equal(lowC.accidental, '');
assert.equal(lowC.step, -2);
assert.equal(lowC.ledgerLines.length, 1);

// Flauta em Bb: D5 -> Bb4? (semitones +8 -> MIDI 70 = Bb4, step 4, bemol explícito)
const lowBb = getNoteStaffInfo('D5', 'Bb');
assert.equal(lowBb.letter, 'B');
assert.equal(lowBb.accidental, 'b');

// Validar que TODAS as notas de TODAS as 7 afinações produzem info válida e acidentes explícitos coerentes
for (const [keyName, keyData] of Object.entries(WHISTLE_KEYS_DATA)) {
    for (const [noteId, noteMeta] of Object.entries(keyData.notes)) {
        const info = getNoteStaffInfo(noteId, keyName);
        if (noteId === 'REST') {
            assert.equal(info.isRest, true);
            continue;
        }
        assert.equal(info.isRest, false);
        assert.ok(Number.isFinite(info.step), `step inválido para ${keyName}:${noteId}`);
        assert.ok(info.y >= 2 && info.y <= 108, `y fora do viewBox (${info.y}) para ${keyName}:${noteId}`);
        const suffix = noteMeta.display.slice(1);
        const expectedAcc = suffix.includes('#') ? '#' : (suffix.includes('b') ? 'b' : '');
        assert.equal(info.accidental, expectedAcc, `Acidente divergente em ${keyName}:${noteId} (${noteMeta.display})`);
    }
}
console.log('✓ Mapeamento de pauta e acidentes explícitos validados nas 7 afinações.');

// --------------------------------------------------------------------------
// 2. TESTES UNITÁRIOS DE EXPORTAÇÃO SVG (MODO TAB vs MODO PARTITURA)
// --------------------------------------------------------------------------
console.log('\n[Teste 2] Validando exportação SVG seguindo o modo ativo...');

const sampleSong = {
    title: 'Teste Partitura',
    artist: 'Tradicional',
    key: 'D',
    timeSignature: '6/8',
    tempo: 110,
    rhythm: 'jig',
    notes: [
        { note: 'D5', duration: 0.5, chord: 'D' },
        { note: 'F#5', duration: 0.5, ornament: 'cut' },
        { note: 'A5', duration: 1.0, lyric: 'la' },
        { note: 'BAR', duration: 0 },
        { note: 'C#6', duration: 1.5 },
        { note: 'REST', duration: 0.5 },
        { note: 'D6', duration: 2.0 },
        { note: 'DOUBLE_BAR', duration: 0 }
    ]
};

const tabSvg = generateSongSVG(sampleSong, { notationMode: 'tab' });
const sheetSvg = generateSongSVG(sampleSong, { notationMode: 'sheet' });

assert.ok(tabSvg.includes('whistle-line'), 'SVG em modo Tablatura deve conter whistle-line');
assert.ok(!tabSvg.includes('staff-clef-symbol'), 'SVG em modo Tablatura não deve conter clave');

assert.ok(sheetSvg.includes('staff-clef-symbol'), 'SVG em modo Partitura deve conter Clave de Sol');
assert.ok(sheetSvg.includes('staff-time-sig'), 'SVG em modo Partitura deve conter Fórmula de Compasso');
assert.ok(sheetSvg.includes('staff-line'), 'SVG em modo Partitura deve conter linhas da pauta');
assert.ok(sheetSvg.includes('staff-accidental'), 'SVG em modo Partitura deve conter acidentes explícitos (#/b)');
assert.ok(sheetSvg.includes('staff-rest'), 'SVG em modo Partitura deve conter pausa musical');
assert.ok(sheetSvg.includes('staff-beam'), 'SVG em modo Partitura deve conter barras de união (beaming)');
assert.ok(!sheetSvg.includes('whistle-line'), 'SVG em modo Partitura não deve conter furos de tablatura');
console.log('✓ Exportação SVG alterna perfeitamente entre Tablatura e Partitura.');

// --------------------------------------------------------------------------
// 2B. VALIDAÇÃO COM THESESSION.ORG (#239 THE BALLYDESMOND + TOP 5 POPULARES)
// --------------------------------------------------------------------------
console.log('\n[Teste 2B] Validando Beaming, G>B, Tercinas, Ties/Slurs e Casas 1ª/2ª vez com repertório TheSession.org...');

const ballydesmondABC = `X: 1
T: The Ballydesmond
R: polka
M: 2/4
L: 1/8
K: Ador
|:AB|c2 B2|A2 GA|Bd ed|g2 ed|
ea ge|dB G>B|ce dB|A2:|
|:cd|ea ag|dg gd|ea ab|g2 ed|
ea ge|dB G>B|ce dB|A2:|`;

const ballySong = parseABCNotation(ballydesmondABC);
assert.equal(ballySong.rhythm, 'polka', 'R: polka deve mapear para rhythm="polka"');
assert.equal(ballySong.timeSignature, '2/4');
const ballyLineBreaks = ballySong.notes.filter(n => n.note === 'LINEBREAK').length;
assert.equal(ballyLineBreaks, 3, 'The Ballydesmond (4 linhas ABC) deve gerar 3 LINEBREAKs');
const dottedEighths = ballySong.notes.filter(n => Math.abs(n.duration - 0.75) < 0.02);
const sixteenths = ballySong.notes.filter(n => Math.abs(n.duration - 0.25) < 0.02);
assert.equal(dottedEighths.length, 2, 'Duas ocorrências de G>B devem gerar 2 colcheias pontuadas (0.75t)');
assert.equal(sixteenths.length, 2, 'Duas ocorrências de G>B devem gerar 2 semicolcheias (0.25t)');
const ballyBeams = computeBeamGroups(ballySong.notes, ballySong.timeSignature, ballySong.key);
assert.ok(ballyBeams.groups.length >= 16, `Esperado >= 16 grupos de beam em The Ballydesmond, obtido ${ballyBeams.groups.length}`);
const ballySvg = generateSongSVG(ballySong, { notationMode: 'sheet' });
assert.ok(ballySvg.includes('staff-beamlet'), 'G>B em The Ballydesmond deve gerar meia-barra (beamlet) no SVG');

// #1 Cooley's (Tercinas (3 + barras de 4 colcheias)
const cooleysABC = `X: 1
T: Cooley's
R: reel
M: 4/4
L: 1/8
K: Emin
|:D|EBBA B2 EB|B2 AB dBAG|(3FED AD BDAD|FDFA dAFD|`;
const cooleysSong = parseABCNotation(cooleysABC);
assert.equal(cooleysSong.rhythm, 'reel');
const tripletNotes = cooleysSong.notes.filter(n => n.tuplet === 3);
assert.equal(tripletNotes.length, 3, 'Tercina (3FED em Cooley\'s deve marcar 3 notas com tuplet=3');
const cooleysBeams = computeBeamGroups(cooleysSong.notes, '4/4', cooleysSong.key);
assert.ok(cooleysBeams.groups.some(g => g.tupletNum === 3), 'Grupo da tercina deve expor tupletNum=3');
assert.ok(cooleysBeams.groups.some(g => g.indices.length === 4), 'Reel 4/4 deve gerar grupos de 4 colcheias');
const cooleysSvg = generateSongSVG(cooleysSong, { notationMode: 'sheet' });
assert.ok(cooleysSvg.includes('staff-tuplet-num'), 'SVG de Cooley\'s deve renderizar o número 3 da tercina');

// #3 The Kesh + #4 Morrison's Jig (6/8 ternário, ligadura '-' tie, slur '(...)', casas '|1' / ':|2')
const keshABC = `X: 1
T: The Kesh
R: jig
M: 6/8
L: 1/8
K: Gmaj
|:G3 GAB|A3 ABd|edd gdd|1 edB dBA:|2 edB (dB)G|G3- G2:|`;
const keshSong = parseABCNotation(keshABC);
assert.equal(keshSong.rhythm, 'jig');
const keshBeams = computeBeamGroups(keshSong.notes, '6/8', keshSong.key);
assert.ok(keshBeams.groups.some(g => g.indices.length === 3), 'Jig 6/8 deve agrupar 3 colcheias por pulso');
assert.ok(keshSong.notes.some(n => n.volta === '1'), 'Casa |1 deve ser parseada');
assert.ok(keshSong.notes.some(n => n.volta === '2'), 'Casa :|2 deve ser parseada');
assert.ok(keshSong.notes.some(n => n.tie === true), 'Ligadura de prolongamento (-) deve ser parseada');
assert.ok(keshSong.notes.some(n => n.slurStart && !n.slurEnd), 'Slur (...) deve ser parseado');
const keshSvg = generateSongSVG(keshSong, { notationMode: 'sheet' });
assert.ok(keshSvg.includes('staff-volta'), 'SVG deve renderizar colchetes de casa 1ª/2ª vez');
assert.ok(keshSvg.includes('staff-tie-arc'), 'SVG deve renderizar arco de ligadura (tie)');
assert.ok(keshSvg.includes('staff-slur-arc'), 'SVG deve renderizar arco de expressão (slur)');

// #5 The Banshee (4/4 com espaços explícitos quebrando beam)
const bansheeABC = `X: 1
T: The Banshee
R: reel
M: 4/4
L: 1/8
K: Gmaj
|:G2 GD EDEG|AGAB d2 Bd|BAGE ED D2:|`;
const bansheeSong = parseABCNotation(bansheeABC);
const bansheeBeams = computeBeamGroups(bansheeSong.notes, '4/4', bansheeSong.key);
assert.ok(bansheeBeams.groups.some(g => g.indices.length === 4), 'EDEG e AGAB em The Banshee devem formar grupos de 4 colcheias');
console.log('✓ Repertório TheSession.org (#239 + Top 5: Cooley\'s, Drowsy Maggie, The Kesh, Morrison\'s, The Banshee) 100% validado!');

// --------------------------------------------------------------------------
// 3. TESTES E2E NO NAVEGADOR (DESKTOP + MOBILE + PERSISTÊNCIA + EDIÇÃO)
// --------------------------------------------------------------------------
console.log('\n[Teste 3] Validando fluxo E2E no Chromium (Desktop, Edição, Reload e Mobile)...');

const ROOT = process.cwd();
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.woff2': 'font/woff2'
};

const server = http.createServer(async (req, res) => {
    const urlPath = (req.url || '/').split('?')[0];
    if (urlPath.startsWith('/api/')) {
        return handleApiRequest(req, res);
    }
    const safePath = urlPath === '/' ? '/index.html' : urlPath;
    const fullPath = path.join(ROOT, safePath);
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
    }
    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(fullPath).pipe(res);
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

const chromePath = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => fs.existsSync(p));
assert.ok(chromePath, 'Chromium/Chrome não encontrado no sistema');

const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});

try {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('pageerror', err => consoleErrors.push(err.message));

    // Desktop 1366x900
    await page.setViewport({ width: 1366, height: 900 });
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });

    // Estado inicial deve ser Tablatura, com Menu Unificado + Callout de 1ª visita no Desktop
    const initialMode = await page.evaluate(() => ({
        bodyAttr: document.body.dataset.notationMode,
        menuVisible: getComputedStyle(document.getElementById('btn-mobile-more-actions')).display !== 'none',
        discoveryVisible: getComputedStyle(document.getElementById('menu-discovery-callout')).display !== 'none',
        noDupLang: !document.getElementById('btn-lang-toggle'),
        noDupPwa: !document.getElementById('btn-pwa-install'),
        hasWhistleSvg: document.querySelectorAll('#tab-sheet .whistle-svg').length > 0,
        hasStaffSvg: document.querySelectorAll('#tab-sheet .staff-note-svg').length > 0,
        kbFingering: document.querySelectorAll('#octave-1 .fingering-mini').length
    }));
    assert.equal(initialMode.bodyAttr, 'tab');
    assert.equal(initialMode.menuVisible, true);
    assert.equal(initialMode.discoveryVisible, true, 'Balão de descoberta do Menu deve aparecer na 1ª visita');
    assert.equal(initialMode.noDupLang, true, 'Sem seletor de idioma duplicado na barra superior');
    assert.equal(initialMode.noDupPwa, true, 'Sem botão Instalar App duplicado na barra superior');
    assert.equal(initialMode.hasWhistleSvg, true);
    assert.equal(initialMode.hasStaffSvg, false);
    assert.ok(initialMode.kbFingering > 0);

    // Abrir Menu Unificado no Desktop (dispensa o callout de descoberta) e clicar em Partitura
    await page.click('#btn-mobile-more-actions');
    await page.waitForSelector('#mb-notation-sheet', { visible: true });
    const discoveryDismissed = await page.evaluate(() => (
        getComputedStyle(document.getElementById('menu-discovery-callout')).display === 'none'
        && localStorage.getItem('whistle_menu_discovered') === '1'
    ));
    assert.equal(discoveryDismissed, true, 'Balão de descoberta deve ser dispensado ao abrir o menu');

    await page.click('#mb-notation-sheet');
    await page.waitForSelector('#tab-sheet.notation-sheet .staff-clef-card');

    const sheetState = await page.evaluate(() => {
        const stored = JSON.parse(localStorage.getItem('celtic_whistle_display_prefs') || '{}');
        const clefRect = document.querySelector('.staff-clef-card .staff-svg')?.getBoundingClientRect();
        const noteRect = document.querySelector('.note-card .staff-note-svg')?.getBoundingClientRect();
        const barRect = document.querySelector('.measure-bar-card .staff-bar-svg')?.getBoundingClientRect();
        return {
            bodyAttr: document.body.dataset.notationMode,
            storedMode: stored.notationMode,
            clefCount: document.querySelectorAll('#tab-sheet .staff-clef-card').length,
            staffNoteCount: document.querySelectorAll('#tab-sheet .staff-note-svg').length,
            staffBarCount: document.querySelectorAll('#tab-sheet .staff-bar-svg').length,
            beamGroupCount: document.querySelectorAll('#tab-sheet .staff-beam-group').length,
            beamRectCount: document.querySelectorAll('#tab-sheet .staff-beam').length,
            kbStaffMiniCount: document.querySelectorAll('#octave-1 .staff-mini').length,
            kbFingeringCount: document.querySelectorAll('#octave-1 .fingering-mini').length,
            clefNoteDeltaY: (clefRect && noteRect) ? Math.abs(clefRect.top - noteRect.top) : -1,
            noteBarDeltaY: (noteRect && barRect) ? Math.abs(noteRect.top - barRect.top) : -1
        };
    });

    assert.equal(sheetState.bodyAttr, 'sheet');
    assert.equal(sheetState.storedMode, 'sheet');
    assert.ok(sheetState.clefCount >= 1, 'Deve renderizar Clave de Sol na partitura');
    assert.ok(sheetState.staffNoteCount > 0, 'Deve renderizar notas na pauta');
    assert.ok(sheetState.staffBarCount > 0, 'Deve renderizar barras de compasso na pauta');
    assert.ok(sheetState.kbStaffMiniCount >= 7, 'Teclado deve exibir mini-pautas musicais');
    assert.equal(sheetState.kbFingeringCount, 0, 'Teclado não deve exibir furos no modo Partitura');
    assert.ok(sheetState.clefNoteDeltaY >= 0 && sheetState.clefNoteDeltaY <= 1.5, `Clave e nota desalinhadas: ${sheetState.clefNoteDeltaY}px`);
    assert.ok(sheetState.noteBarDeltaY >= 0 && sheetState.noteBarDeltaY <= 1.5, `Nota e barra desalinhadas: ${sheetState.noteBarDeltaY}px`);
    console.log(`✓ Desktop Partitura OK (clave/nota Δy=${sheetState.clefNoteDeltaY.toFixed(2)}px, nota/barra Δy=${sheetState.noteBarDeltaY.toFixed(2)}px).`);

    // Testar persistência após reload
    await page.reload({ waitUntil: 'networkidle0' });
    const afterReload = await page.evaluate(() => ({
        bodyAttr: document.body.dataset.notationMode,
        hasSheetClass: document.getElementById('tab-sheet').classList.contains('notation-sheet'),
        kbStaffMini: document.querySelectorAll('#octave-1 .staff-mini').length
    }));
    assert.equal(afterReload.bodyAttr, 'sheet');
    assert.equal(afterReload.hasSheetClass, true);
    assert.ok(afterReload.kbStaffMini >= 7);
    console.log('✓ Persistência da preferência no localStorage validada após reload.');

    // Testar edição completa em modo Partitura (Nova Música -> inserir 2 colcheias 0.5t com barra de união + barra de compasso)
    await page.click('#btn-new-song');
    await page.waitForSelector('#octave-1 .note-btn[data-note="F#5"]');
    await page.evaluate(() => {
        const eighthRadio = document.querySelector('input[name="note-duration"][value="0.5"]');
        if (eighthRadio) {
            eighthRadio.checked = true;
            eighthRadio.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
    await page.click('#octave-1 .note-btn[data-note="D5"]');
    await page.click('#octave-1 .note-btn[data-note="F#5"]');
    await page.click('#btn-insert-bar');

    const editedState = await page.evaluate(() => ({
        notesCount: document.querySelectorAll('#tab-sheet .note-card .staff-note-svg').length,
        accidentalsCount: document.querySelectorAll('#tab-sheet .note-card .staff-accidental').length,
        barsCount: document.querySelectorAll('#tab-sheet .measure-bar-card .staff-bar-svg').length,
        beamGroupCount: document.querySelectorAll('#tab-sheet .staff-beam-group').length,
        beamRectCount: document.querySelectorAll('#tab-sheet .staff-beam').length
    }));
    assert.equal(editedState.notesCount, 2);
    assert.equal(editedState.accidentalsCount, 1, 'F#5 deve exibir sustenido explícito na partitura');
    assert.equal(editedState.barsCount, 1);
    assert.equal(editedState.beamGroupCount, 1, 'Duas colcheias (0.5t) consecutivas devem formar 1 .staff-beam-group');
    assert.equal(editedState.beamRectCount, 2, 'Cada nota do grupo deve desenhar seu segmento contínuo de .staff-beam');
    console.log('✓ Edição no modo Partitura (teclado com pauta + barras de união + acidentes explícitos + compasso) validada.');

    // Testar compatibilidade com Modo Treino e Modo Play-Along
    await page.click('#btn-mode-practice');
    await page.click('#btn-mode-playalong');
    await page.click('#btn-mode-studio');
    const stillSheet = await page.evaluate(() => document.getElementById('tab-sheet').classList.contains('notation-sheet'));
    assert.equal(stillSheet, true);

    // Validar escala ampliada (~120%) e continuidade das linhas do pentagrama (zero gap visual)
    const visualAudit = await page.evaluate(() => {
        const clef = document.querySelector('#tab-sheet .staff-clef-card');
        const notes = Array.from(document.querySelectorAll('#tab-sheet .note-card'));
        const bar = document.querySelector('#tab-sheet .measure-bar-card');
        const noteSvg = notes[0]?.querySelector('.staff-note-svg');
        const staffLine = noteSvg?.querySelector('.staff-line');
        const svgRect = noteSvg?.getBoundingClientRect();
        const lineRect = staffLine?.getBoundingClientRect();
        const gapClefNote = (clef && notes[0]) ? Math.abs(notes[0].getBoundingClientRect().left - clef.getBoundingClientRect().right) : -1;
        const gapNoteNote = (notes[0] && notes[1]) ? Math.abs(notes[1].getBoundingClientRect().left - notes[0].getBoundingClientRect().right) : -1;
        const gapNoteBar = (notes[1] && bar) ? Math.abs(bar.getBoundingClientRect().left - notes[1].getBoundingClientRect().right) : -1;
        return {
            svgHeight: svgRect ? svgRect.height : 0,
            noteWidth: notes[0] ? notes[0].getBoundingClientRect().width : 0,
            lineCoversSvgLeft: (lineRect && svgRect) ? (lineRect.left <= svgRect.left + 0.5) : false,
            lineCoversSvgRight: (lineRect && svgRect) ? (lineRect.right >= svgRect.right - 0.5) : false,
            gapClefNote,
            gapNoteNote,
            gapNoteBar
        };
    });
    assert.ok(visualAudit.svgHeight >= 110, `Altura da pauta deveria ser >= 110px (atual: ${visualAudit.svgHeight}px)`);
    assert.ok(visualAudit.noteWidth >= 46, `Largura da nota deveria ser >= 46px (atual: ${visualAudit.noteWidth}px)`);
    assert.equal(visualAudit.lineCoversSvgLeft, true, 'Linha da pauta deve cobrir a borda esquerda do card');
    assert.equal(visualAudit.lineCoversSvgRight, true, 'Linha da pauta deve cobrir a borda direita do card');
    assert.ok(visualAudit.gapClefNote <= 0.5, `Gap visual entre clave e nota: ${visualAudit.gapClefNote}px`);
    assert.ok(visualAudit.gapNoteNote <= 0.5, `Gap visual entre notas adjacentes: ${visualAudit.gapNoteNote}px`);
    assert.ok(visualAudit.gapNoteBar <= 0.5, `Gap visual entre nota e barra: ${visualAudit.gapNoteBar}px`);
    console.log(`✓ Escala Partitura (${visualAudit.svgHeight}px x ${visualAudit.noteWidth}px) e continuidade sem gap validadas.`);

    // Validar contraste de TODOS os dropdowns (<select>/<option>) em TODOS os 5 temas visuais
    const themes = ['celtic', 'dark-stage', 'dark-obsidian', 'parchment-light', 'print-mono'];
    for (const theme of themes) {
        const contrastCheck = await page.evaluate((themeId) => {
            document.documentElement.setAttribute('data-theme', themeId);
            function parseRgb(str) {
                const m = String(str || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
            }
            function luminance([r, g, b]) {
                return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            }
            const failures = [];
            const selects = Array.from(document.querySelectorAll('select'));
            for (const sel of selects) {
                const opt = sel.querySelector('option');
                if (!opt) continue;
                const optStyle = getComputedStyle(opt);
                const fg = parseRgb(optStyle.color);
                const bg = parseRgb(optStyle.backgroundColor);
                if (!fg || !bg) {
                    failures.push(`${sel.id || sel.className}: cor inválida (fg=${optStyle.color}, bg=${optStyle.backgroundColor})`);
                    continue;
                }
                const diff = Math.abs(luminance(fg) - luminance(bg));
                if (diff < 0.35) {
                    failures.push(`${sel.id || sel.className}: baixo contraste ΔL=${diff.toFixed(2)} (fg=${optStyle.color}, bg=${optStyle.backgroundColor})`);
                }
            }
            const metronomeBg = getComputedStyle(document.getElementById('metronome-accent-select')).backgroundColor;
            return { totalSelects: selects.length, failures, metronomeBg };
        }, theme);
        assert.ok(contrastCheck.totalSelects > 0);
        assert.equal(contrastCheck.failures.length, 0, `Falha de contraste em dropdowns no tema ${theme}: ${contrastCheck.failures.join('; ')}`);
        assert.notEqual(contrastCheck.metronomeBg, 'rgba(0, 0, 0, 0)', `metronome-accent-select sem fundo no tema ${theme}`);
    }
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'celtic'));
    console.log('✓ Contraste de todos os dropdowns (<select>/<option>) validado nos 5 temas visuais.');

    // Testar Mobile (390x844): menu unificado acessível pelo botão ⋯ sem botões duplicados
    await page.setViewport({ width: 390, height: 844 });
    const mobileMenuCheck = await page.evaluate(() => ({
        menuVisible: getComputedStyle(document.getElementById('btn-mobile-more-actions')).display !== 'none',
        labelHidden: getComputedStyle(document.querySelector('#btn-mobile-more-actions .more-menu-label')).display === 'none'
    }));
    assert.equal(mobileMenuCheck.menuVisible, true);
    assert.equal(mobileMenuCheck.labelHidden, true);

    await page.click('#btn-mobile-more-actions');
    await page.waitForSelector('#mb-notation-tab', { visible: true });
    await page.click('#mb-notation-tab');

    const mobileAfterTab = await page.evaluate(() => ({
        bodyAttr: document.body.dataset.notationMode,
        hasWhistleSvg: document.querySelectorAll('#tab-sheet .whistle-svg').length > 0
    }));
    assert.equal(mobileAfterTab.bodyAttr, 'tab');
    assert.equal(mobileAfterTab.hasWhistleSvg, true);
    console.log('✓ Menu mobile (alternância Partitura ↔ Tablatura) validado.');

    assert.equal(consoleErrors.length, 0, `Erros de console encontrados: ${consoleErrors.join(' | ')}`);
    console.log('\n✅ SUCESSO: Todos os testes do Modo Partitura passaram 100%!');
} finally {
    await browser.close();
    server.close();
}
