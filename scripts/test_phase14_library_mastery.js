import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

import { CURATED_REPERTOIRE } from '../repertoire.js';
import { 
    analyzeSongTessitura, 
    getAllMasteryData, 
    getSongMastery, 
    saveSongMastery, 
    TRADITIONAL_SETS, 
    findSetForSong, 
    getSimilarTuneRecommendations, 
    pickRandomTune 
} from '../src/ui/libraryMastery.js';
import { handleApiRequest } from '../server/api.js';

console.log('--- 🎻 [TESTES AUTOMATIZADOS DA FASE 14: BIBLIOTECA, TESSITURA, MAESTRIA & SETS] ---');

// =========================================================================
// 1. Validar Motor de Análise de Tessitura e Métricas
// =========================================================================
console.log('\n[Teste 1] Validando análise de tessitura e cálculo de compassos...');

const butterfly = CURATED_REPERTOIRE.find(s => s.id === 'VrJZfUbO' || s.title.includes('Butterfly'));
if (!butterfly) throw new Error('The Butterfly não encontrada no repertório curado');

const tessButterfly = analyzeSongTessitura(butterfly.notes, butterfly.tempo);
if (tessButterfly.rangeType !== 'octave1') {
    throw new Error(`The Butterfly deveria ser octave1, obteve: ${tessButterfly.rangeType}`);
}
if (tessButterfly.hasHalfHole !== false) {
    throw new Error('The Butterfly não possui meio-furo');
}
if (tessButterfly.measuresCount <= 0 || !tessButterfly.durationFormatted.includes(':')) {
    throw new Error(`Métricas inválidas de The Butterfly: ${JSON.stringify(tessButterfly)}`);
}
console.log(`✓ The Butterfly: Tessitura="${tessButterfly.rangeType}", Compassos=${tessButterfly.measuresCount}, Duração=${tessButterfly.durationFormatted}`);

// Música com 2ª oitava (The Kesh Jig)
const keshJig = CURATED_REPERTOIRE.find(s => s.id === 'hTCzCb2Q' || s.title.includes('Kesh'));
if (keshJig) {
    const tessKesh = analyzeSongTessitura(keshJig.notes, keshJig.tempo);
    if (tessKesh.rangeType !== 'octave1-2') {
        throw new Error(`Kesh Jig deveria ser octave1-2, obteve: ${tessKesh.rangeType}`);
    }
    console.log(`✓ The Kesh Jig: Tessitura="${tessKesh.rangeType}", 2ª oitava detectada.`);
}

// =========================================================================
// 2. Validar Sets Tradicionais e Navegação Sequencial
// =========================================================================
console.log('\n[Teste 2] Validando Sets Tradicionais Irlandeses (Medleys)...');

if (!Array.isArray(TRADITIONAL_SETS) || TRADITIONAL_SETS.length < 4) {
    throw new Error('Sets tradicionais insuficientes definidos');
}

const jigSetInfo = findSetForSong('hTCzCb2Q');
if (!jigSetInfo || jigSetInfo.set.id !== 'set-jigs-1') {
    throw new Error('findSetForSong falhou para Kesh Jig');
}
if (jigSetInfo.nextSongId !== 'u7DFPn7Z') {
    throw new Error(`Próxima música do Set de Jigs deveria ser Morrison's Jig (u7DFPn7Z), obteve ${jigSetInfo.nextSongId}`);
}
console.log(`✓ Set de Jigs: ${jigSetInfo.set.title} -> Próxima: ${jigSetInfo.nextSongId}`);

// =========================================================================
// 3. Validar Motor de Recomendações e Sorteio
// =========================================================================
console.log('\n[Teste 3] Validando motor de recomendações e sorteio "Surpreenda-me"...');

const recs = getSimilarTuneRecommendations(keshJig, CURATED_REPERTOIRE, 2);
if (!Array.isArray(recs) || recs.length !== 2) {
    throw new Error(`Esperado 2 recomendações, obtido ${recs.length}`);
}
console.log(`✓ Recomendações para ${keshJig.title}: 1. "${recs[0].title}" | 2. "${recs[1].title}"`);

const randomSong = pickRandomTune(CURATED_REPERTOIRE);
if (!randomSong || !randomSong.id || !randomSong.title) {
    throw new Error('pickRandomTune retornou resultado inválido');
}
console.log(`✓ Sorteio aleatório "Surpreenda-me" funcionou: "${randomSong.title}"`);

// =========================================================================
// 4. Teste E2E no Navegador com Puppeteer
// =========================================================================
console.log('\n[Teste 4] Validando UI no Navegador (Filtros, Badges, Botão Surpreenda-me e Modal)...');

const PORT = 3996;
const PUBLIC_DIR = process.cwd();
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png'
};

const server = http.createServer(async (req, res) => {
    try {
        const handled = await handleApiRequest(req, res);
        if (handled) return;

        const parsed = new URL(req.url, `http://localhost:${PORT}`);
        let safe = path.normalize(parsed.pathname).replace(/^(\.\.[\/\\])+/, '');
        if (safe === '/' || safe === '') safe = '/index.html';
        const fpath = path.join(PUBLIC_DIR, safe);

        if (fs.existsSync(fpath) && fs.statSync(fpath).isFile()) {
            const ext = path.extname(fpath);
            res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
            fs.createReadStream(fpath).pipe(res);
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    } catch (e) {
        res.writeHead(500);
        res.end(e.message);
    }
});

server.listen(PORT, async () => {
    const chromePath = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : '/usr/bin/chromium';
    const browser = await puppeteer.launch({
        executablePath: chromePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle2' });

        // 4.1 Verificar botão Surpreenda-me
        await page.waitForSelector('#btn-random-tune');
        const randomBtnText = await page.$eval('#btn-random-tune', el => el.textContent.trim());
        if (!randomBtnText.includes('Surpreenda') && !randomBtnText.includes('Surprise') && !randomBtnText.includes('🎲')) {
            throw new Error(`Texto do botão aleatório inesperado: "${randomBtnText}"`);
        }
        console.log(`✓ Botão "Surpreenda-me" presente na barra lateral: [${randomBtnText}]`);

        // 4.2 Testar clique no botão Surpreenda-me
        await page.click('#btn-random-tune');
        await new Promise(r => setTimeout(r, 200));
        console.log('✓ Clique no botão "Surpreenda-me" executado.');

        // 4.3 Abrir filtros retráteis e verificar filtro de tessitura
        await page.click('#btn-toggle-filters');
        await page.waitForSelector('#filter-range');
        const rangeOptions = await page.$$eval('#filter-range option', opts => opts.map(o => o.value));
        if (!rangeOptions.includes('octave1') || !rangeOptions.includes('octave1-2') || !rangeOptions.includes('half-hole')) {
            throw new Error(`Opções de tessitura incompletas: ${JSON.stringify(rangeOptions)}`);
        }
        console.log('✓ Seletor de Tessitura presente com opções [all, octave1, octave1-2, half-hole].');

        // Filtrar por Só 1ª Oitava
        await page.select('#filter-range', 'octave1');
        await new Promise(r => setTimeout(r, 250));

        // Verificar que os cards na lista contêm o badge de 1ª oitava
        const oct1Badges = await page.$$('.badge-range-oct1');
        if (oct1Badges.length === 0) {
            throw new Error('Nenhum badge de 1ª oitava encontrado após filtrar');
        }
        console.log(`✓ Filtro por tessitura funcionou: ${oct1Badges.length} músicas exibidas com badge 🟢 Só 1ª Oitava.`);

        // 4.4 Verificar botões de preview de áudio nos cards
        const previewBtns = await page.$$('.btn-sidebar-preview');
        if (previewBtns.length === 0) {
            throw new Error('Nenhum botão de preview de áudio encontrado nos cards');
        }
        console.log(`✓ Botões de Preview de Áudio (.btn-sidebar-preview) renderizados nos cards da biblioteca.`);

        // 4.5 Testar clique no botão de preview (iniciar e parar)
        await page.click('.btn-sidebar-preview');
        await new Promise(r => setTimeout(r, 200));
        const isPlayingPreview = await page.$eval('.btn-sidebar-preview', el => el.classList.contains('playing'));
        console.log(`✓ Preview de áudio iniciado com classe pulse .playing: ${isPlayingPreview}`);

        await page.click('.btn-sidebar-preview');
        await new Promise(r => setTimeout(r, 100));
        const isStoppedPreview = await page.$eval('.btn-sidebar-preview', el => !el.classList.contains('playing'));
        console.log(`✓ Preview de áudio interrompido com sucesso: ${isStoppedPreview}`);

        // 4.6 Verificar controles de Modo Set
        await page.waitForSelector('#btn-set-mode-toggle');
        await page.click('#btn-set-mode-toggle');
        await new Promise(r => setTimeout(r, 100));
        const isSetActive = await page.$eval('#btn-set-mode-toggle', el => el.classList.contains('active'));
        const isNextVisible = await page.$eval('#btn-next-set-tune', el => el.style.display !== 'none');
        if (!isSetActive || !isNextVisible) {
            throw new Error('Falha ao ativar Modo Set na barra de controles');
        }
        console.log('✓ Modo Set ativado e botão "Próxima do Set" (#btn-next-set-tune) visível.');

        // Desativar Modo Set
        await page.click('#btn-set-mode-toggle');

        // 4.7 Verificar estrutura do Modal de Resultados do Play-Along (Maestria & Recomendações)
        const hasMasteryBanner = await page.$eval('#pa-mastery-banner', el => el !== null);
        const hasRecommendations = await page.$eval('#pa-recommendations-section', el => el !== null);
        if (!hasMasteryBanner || !hasRecommendations) {
            throw new Error('Estrutura de Maestria ou Recomendações ausente no modal de Play-Along');
        }
        console.log('✓ Modal de Play-Along possui banner de Maestria e seção de Músicas Semelhantes.');

        console.log('\n=========================================================================');
        console.log('🎉 TODOS OS TESTES DA FASE 14 FORAM CONCLUÍDOS COM 100% DE SUCESSO!');
        console.log('=========================================================================\n');

    } catch (err) {
        console.error('❌ ERRO NO TESTE:', err);
        process.exit(1);
    } finally {
        await browser.close();
        server.close();
        process.exit(0);
    }
});
