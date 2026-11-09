import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from '../server/api.js';

const PORT = 3567;
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
});

await new Promise(r => server.listen(PORT, r));
console.log(`[TestServer] Rodando em http://localhost:${PORT}`);

const chromePath = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : '/usr/bin/chromium';
const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
});

const page = await browser.newPage();
const errors = [];
page.on('pageerror', err => {
    console.error('[Browser Error]', err.message);
    errors.push(err.message);
});
page.on('console', msg => {
    if (msg.type() === 'error') console.error('[Console Error]', msg.text());
});

await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle2' });

console.log('\n--- TESTE BUG 1: LÁPIS E METADADOS ---');
const bannerDisplay = await page.$eval('#song-display-banner', el => window.getComputedStyle(el).display);
console.log('1.1. #song-display-banner display no mobile:', bannerDisplay);
if (bannerDisplay !== 'none') throw new Error('#song-display-banner deveria estar oculto no mobile!');

const pencilVisible = await page.$eval('#btn-mobile-edit-meta', el => {
    const s = window.getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden';
});
console.log('1.2. #btn-mobile-edit-meta está visível:', pencilVisible);
if (!pencilVisible) throw new Error('#btn-mobile-edit-meta deveria estar visível na barra de topo!');

// Clicar no botão do lápis para abrir edição de metadados
await page.click('#btn-mobile-edit-meta');
await new Promise(r => setTimeout(r, 200));

const editorHeaderVisible = await page.$eval('.editor-header', el => {
    return !el.classList.contains('collapsed') && window.getComputedStyle(el).display !== 'none';
});
console.log('1.3. .editor-header expandido após clique no lápis:', editorHeaderVisible);
if (!editorHeaderVisible) throw new Error('.editor-header deveria estar visível após clicar no lápis!');

// Alterar título e clicar em Concluir
await page.evaluate(() => {
    const input = document.getElementById('song-title');
    input.value = 'Hino da Vitória Mobile';
    input.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.click('#btn-collapse-editor-header');
await new Promise(r => setTimeout(r, 200));

const editorHeaderCollapsed = await page.$eval('.editor-header', el => el.classList.contains('collapsed'));
const updatedTitle = await page.$eval('#mobile-top-title', el => el.textContent.trim());
console.log('1.4. .editor-header recolhido após concluir:', editorHeaderCollapsed);
console.log('1.5. #mobile-top-title atualizado:', updatedTitle);
if (!editorHeaderCollapsed) throw new Error('.editor-header deveria estar recolhido após clicar em concluir!');
if (updatedTitle !== 'Hino da Vitória Mobile') throw new Error(`Título esperado "Hino da Vitória Mobile", obteve "${updatedTitle}"`);


console.log('\n--- TESTE BUG 2: BLUR PRESO & BOTÃO >> BIBLIOTECA ---');
const floatingBtnDisplay = await page.$eval('#btn-sidebar-floating-open', el => window.getComputedStyle(el).display);
console.log('2.1. #btn-sidebar-floating-open display:', floatingBtnDisplay);
if (floatingBtnDisplay !== 'none') throw new Error('#btn-sidebar-floating-open deve estar oculto no mobile!');

// Abrir gaveta lateral pelo botão hambúrguer
await page.click('#sidebar-toggle');
await new Promise(r => setTimeout(r, 200));

let sidebarOpen = await page.$eval('.sidebar', el => el.classList.contains('open'));
let backdropActive = await page.$eval('#sidebar-backdrop', el => el.classList.contains('active') && window.getComputedStyle(el).display !== 'none');
console.log('2.2. Gaveta aberta:', sidebarOpen, '| Backdrop ativo:', backdropActive);
if (!sidebarOpen || !backdropActive) throw new Error('Sidebar e Backdrop deveriam estar ativos ao abrir!');

// Fechar gaveta pelo botão de recolher da sidebar
await page.click('#btn-toggle-sidebar-collapse');
await new Promise(r => setTimeout(r, 300));

sidebarOpen = await page.$eval('.sidebar', el => el.classList.contains('open'));
let backdropHidden = await page.$eval('#sidebar-backdrop', el => {
    const s = window.getComputedStyle(el);
    return !el.classList.contains('active') && (s.display === 'none' || s.opacity === '0');
});
console.log('2.3. Gaveta fechada via recolher:', !sidebarOpen, '| Backdrop desativado (sem blur):', backdropHidden);
if (sidebarOpen || !backdropHidden) throw new Error('Gaveta e Backdrop deveriam estar completamente fechados sem blur!');

// Testar fechamento ao selecionar música na lista
await page.click('#sidebar-toggle');
await new Promise(r => setTimeout(r, 200));
const firstSong = await page.$('.song-item');
if (firstSong) {
    await firstSong.click();
    await new Promise(r => setTimeout(r, 300));
    sidebarOpen = await page.$eval('.sidebar', el => el.classList.contains('open'));
    backdropHidden = await page.$eval('#sidebar-backdrop', el => {
        const s = window.getComputedStyle(el);
        return !el.classList.contains('active') && (s.display === 'none' || s.opacity === '0');
    });
    console.log('2.4. Gaveta fechada ao selecionar música:', !sidebarOpen, '| Backdrop desativado:', backdropHidden);
    if (sidebarOpen || !backdropHidden) throw new Error('Gaveta e Backdrop deveriam fechar ao selecionar música!');
}


console.log('\n--- TESTE BUG 3: MENU DE TRÊS PONTOS ---');
// Clicar no botão de 3 pontos
await page.click('#btn-mobile-more-actions');
await new Promise(r => setTimeout(r, 200));

const dropdownVisible = await page.$eval('#mobile-more-dropdown', el => {
    const s = window.getComputedStyle(el);
    return s.display === 'flex' && el.classList.contains('show');
});
console.log('3.1. Menu de 3 pontos aberto:', dropdownVisible);
if (!dropdownVisible) throw new Error('Menu dropdown de 3 pontos não abriu!');

// Clicar em Opções de Exibição (#mb-act-view)
await page.click('#mb-act-view');
await new Promise(r => setTimeout(r, 300));

const viewModalOpen = await page.$eval('#view-options-modal', el => {
    const s = window.getComputedStyle(el);
    return s.display === 'flex' && el.classList.contains('open');
});
console.log('3.2. Modal Opções de Exibição abriu:', viewModalOpen);
if (!viewModalOpen) throw new Error('Modal de opções de exibição deveria estar aberto!');

// Fechar o modal de opções de exibição
await page.click('#btn-close-view-options-done');
await new Promise(r => setTimeout(r, 200));

// Testar Central de Exportação (#mb-act-export)
await page.click('#btn-mobile-more-actions');
await new Promise(r => setTimeout(r, 200));
await page.click('#mb-act-export');
await new Promise(r => setTimeout(r, 300));

const exportModalOpen = await page.$eval('#export-center-modal', el => {
    const s = window.getComputedStyle(el);
    return s.display === 'flex' && el.classList.contains('open');
});
console.log('3.3. Modal Central de Importação/Exportação abriu:', exportModalOpen);
if (!exportModalOpen) throw new Error('Modal de importação/exportação deveria estar aberto!');

await page.click('#btn-close-export-center-ok');
await new Promise(r => setTimeout(r, 200));

if (errors.length > 0) {
    throw new Error(`Erros de runtime no navegador: ${errors.join(', ')}`);
}

console.log('\n✅ TODOS OS TESTES PASSARAM COM SUCESSO ABSOLUTO!');
await browser.close();
server.close();
process.exit(0);
