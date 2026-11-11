import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from '../server/api.js';

const PORT = 3735;
const PUBLIC_DIR = process.cwd();

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
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

        fs.stat(fpath, (err, stats) => {
            if (err || !stats.isFile()) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            const ext = path.extname(fpath);
            res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
            fs.createReadStream(fpath).pipe(res);
        });
    } catch (e) {
        res.writeHead(500);
        res.end(e.message);
    }
});

await new Promise(r => server.listen(PORT, r));
console.log('--- 🧪 TESTE AUTOMATIZADO DO EXPAND DO LÁPIS DE METADADOS ---');
console.log(`[TestServer] Rodando em http://localhost:${PORT}`);

const chromePath = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : '/usr/bin/chromium';
const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
});

try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle2' });

    // 1. ESTADO INICIAL: cabeçalho deve estar recolhido
    const initialHeaderState = await page.evaluate(() => {
        const h = document.querySelector('.editor-header');
        return {
            isCollapsed: h.classList.contains('collapsed'),
            display: window.getComputedStyle(h).display
        };
    });
    console.log('1.1. Estado inicial do editor-header:', initialHeaderState);
    if (!initialHeaderState.isCollapsed || initialHeaderState.display !== 'none') {
        throw new Error('O cabeçalho deveria iniciar recolhido');
    }

    // 2. CLIQUE NO LÁPIS EM MÚSICA INICIAL (Curada / Leitura)
    console.log('2.1. Clicando no lápis (#btn-mobile-edit-meta) na música inicial...');
    await page.click('#btn-mobile-edit-meta');
    await new Promise(r => setTimeout(r, 300));

    const expandedState = await page.evaluate(() => {
        const h = document.querySelector('.editor-header');
        const r = h.getBoundingClientRect();
        const titleInput = document.getElementById('song-title');
        const artistInput = document.getElementById('song-artist');
        const whistleKey = document.getElementById('whistle-key');
        const timeSig = document.getElementById('song-time-signature');
        const tempo = document.getElementById('song-tempo');
        const cat = document.getElementById('song-category');
        const diff = document.getElementById('song-difficulty');
        const rhythm = document.getElementById('song-rhythm');
        const btnConcluir = document.getElementById('btn-collapse-editor-header');

        return {
            isCollapsed: h.classList.contains('collapsed'),
            display: window.getComputedStyle(h).display,
            height: r.height,
            allFieldsPresent: !!(titleInput && artistInput && whistleKey && timeSig && tempo && cat && diff && rhythm && btnConcluir),
            titleValue: titleInput.value,
            artistValue: artistInput.value,
            keyVal: whistleKey.value,
            tempoVal: tempo.value
        };
    });
    console.log('2.2. Estado do editor-header após clique no lápis:', expandedState);

    if (expandedState.isCollapsed || expandedState.display !== 'flex') {
        throw new Error('O editor-header deveria ter expandido após o clique no lápis!');
    }
    if (expandedState.height < 300) {
        throw new Error(`Altura do cabeçalho insuficiente (${expandedState.height}px). Deve ter altura total >= 300px.`);
    }
    if (!expandedState.allFieldsPresent) {
        throw new Error('Campos de metadados ausentes no quadro expandido!');
    }
    console.log(`✓ Quadro expandiu para ${expandedState.height.toFixed(1)}px mostrando todos os campos!`);

    await page.screenshot({ path: path.resolve(process.cwd(), 'audit-screenshots/layout/pencil_expanded_live.png') });
    console.log('📸 Screenshot salvo: audit-screenshots/layout/pencil_expanded_live.png');

    // 3. RECOLHER VIA BOTÃO CONCLUIR
    console.log('3.1. Clicando no botão Concluir (#btn-collapse-editor-header) para recolher...');
    await page.$eval('#btn-collapse-editor-header', el => el.click());
    await new Promise(r => setTimeout(r, 300));

    const closedState = await page.evaluate(() => {
        const h = document.querySelector('.editor-header');
        return {
            isCollapsed: h.classList.contains('collapsed'),
            display: window.getComputedStyle(h).display
        };
    });
    console.log('3.2. Estado após clicar em Concluir:', closedState);
    if (!closedState.isCollapsed || closedState.display !== 'none') {
        throw new Error('O editor-header deveria ter recolhido ao clicar em Concluir!');
    }
    console.log('✓ Recolhimento pelo botão Concluir funcionando!');

    // 4. MÚSICA EDITÁVEL: Criação de nova melodia, edição e conclusão via botão Concluir
    console.log('4.1. Criando nova música editável...');
    await page.$eval('#btn-new-song', el => el.click());
    await new Promise(r => setTimeout(r, 400));

    // Clica no botão de concluir para recolher
    await page.$eval('#btn-collapse-editor-header', el => el.click());
    await new Promise(r => setTimeout(r, 200));

    // Agora clica no lápis para expandir e editar
    console.log('4.2. Clicando no lápis na música editável...');
    await page.click('#btn-mobile-edit-meta');
    await new Promise(r => setTimeout(r, 300));

    const editableExpanded = await page.evaluate(() => {
        const h = document.querySelector('.editor-header');
        const title = document.getElementById('song-title');
        return {
            isExpanded: !h.classList.contains('collapsed'),
            height: h.getBoundingClientRect().height,
            isFocused: document.activeElement === title
        };
    });
    console.log('4.3. Quadro na música editável:', editableExpanded);
    if (!editableExpanded.isExpanded || editableExpanded.height < 300) {
        throw new Error('Falha ao expandir na música editável');
    }

    // Altera metadados e conclui
    await page.evaluate(() => {
        const title = document.getElementById('song-title');
        title.value = 'Melodia Teste Lapis OK';
        title.dispatchEvent(new Event('input', { bubbles: true }));

        const tempo = document.getElementById('song-tempo');
        tempo.value = 135;
        tempo.dispatchEvent(new Event('input', { bubbles: true }));

        const btn = document.getElementById('btn-collapse-editor-header');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 200));

    const finalTopTitle = await page.$eval('#mobile-top-title', el => el.textContent.trim());
    console.log('4.4. Título atualizado na barra superior:', finalTopTitle);
    if (finalTopTitle !== 'Melodia Teste Lapis OK') {
        throw new Error(`Título esperado "Melodia Teste Lapis OK", obtido: "${finalTopTitle}"`);
    }

    console.log('\n=========================================================================');
    console.log('🎉 TESTE DO EXPAND DO LÁPIS CONCLUÍDO COM 100% DE SUCESSO!');
    console.log('=========================================================================');
} finally {
    await browser.close();
    server.close();
}
