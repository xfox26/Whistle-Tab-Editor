import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from '../server/api.js';

const PORT = 3599;
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

// Criar contexto anônimo / incognito completamente limpo (sem cookies ou localStorage prévio)
const incognitoContext = await browser.createBrowserContext();
const page = await incognitoContext.newPage();

const errors = [];
page.on('pageerror', err => {
    console.error('[Browser Error]', err.message);
    errors.push(err.message);
});

await page.setViewport({ width: 1280, height: 800 });
await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 600));

console.log('\n--- 1. TESTE DE USUÁRIO NOVO (PRIMEIRO ACESSO / ABA ANÔNIMA) ---');

// Avaliação da primeira música carregada
const firstSongData = await page.evaluate(() => {
    const titleInput = document.getElementById('song-title');
    const readonlyBanner = document.getElementById('readonly-mode-banner');
    const bannerStyle = window.getComputedStyle(readonlyBanner);
    const remixBtn = document.getElementById('btn-remix-tune');
    const firstSongItem = document.querySelector('.song-item.active');
    
    return {
        titleValue: titleInput ? titleInput.value : '',
        titleReadOnly: titleInput ? titleInput.readOnly : false,
        bannerVisible: bannerStyle.display === 'flex',
        remixBtnVisible: remixBtn ? window.getComputedStyle(remixBtn).display !== 'none' : false,
        activeSongTitle: firstSongItem ? firstSongItem.querySelector('.song-item-title').textContent : ''
    };
});

console.log('1.1. Título da música ativa:', firstSongData.activeSongTitle);
console.log('1.2. Campo de título em modo leitura (readOnly):', firstSongData.titleReadOnly);
console.log('1.3. Banner "Partitura Protegida (Modo Leitura)" visível:', firstSongData.bannerVisible);
console.log('1.4. Botão "Remixar / Criar Variação" visível:', firstSongData.remixBtnVisible);

if (!firstSongData.titleReadOnly) {
    throw new Error('A primeira música aberta para um usuário novo DEVE estar em modo somente leitura (readOnly: true)!');
}
if (!firstSongData.bannerVisible) {
    throw new Error('O banner de modo somente leitura DEVE estar visível para a primeira música!');
}

console.log('\n--- 2. TESTE DA SEGUNDA MÚSICA DO REPERTÓRIO (SEM TAGS "MINHA" OU "APENAS LOCAL") ---');

const morrisonSongData = await page.evaluate(() => {
    const songItems = Array.from(document.querySelectorAll('.song-item'));
    const morrisonItem = songItems.find(el => {
        const title = el.querySelector('.song-item-title');
        return title && title.textContent.toLowerCase().includes('morrison');
    });

    if (!morrisonItem) return null;

    const badges = Array.from(morrisonItem.querySelectorAll('.song-badges span')).map(s => s.textContent.trim());
    return {
        title: morrisonItem.querySelector('.song-item-title').textContent,
        badges
    };
});

console.log('2.1. Música Morrison encontrada:', morrisonSongData);
if (morrisonSongData) {
    const hasMinha = morrisonSongData.badges.some(b => b.includes('Minha'));
    const hasLocal = morrisonSongData.badges.some(b => b.includes('Apenas local'));
    console.log('2.2. Possui tag "Minha":', hasMinha);
    console.log('2.3. Possui tag "Apenas local":', hasLocal);

    if (hasMinha) throw new Error('Música do repertório curado NÃO pode ter a tag "Minha"!');
    if (hasLocal) throw new Error('Música do repertório curado NÃO pode ter a tag "Apenas local"!');
} else {
    throw new Error('Morrison\'s Jig não foi encontrada no repertório!');
}

console.log('\n--- 3. TESTE DO BOTÃO DE RESET DE FÁBRICA NA CENTRAL DE IMPORTAÇÃO/EXPORTAÇÃO ---');

// Abrir modal da central de importação/exportação
await page.click('#btn-open-export-center');
await new Promise(r => setTimeout(r, 200));

// Clicar na aba Importar
await page.click('#tab-btn-import');
await new Promise(r => setTimeout(r, 200));

// Verificar se o botão de reset está visível
const resetBtnVisible = await page.$eval('#btn-factory-reset-storage', el => {
    const s = window.getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden';
});
console.log('3.1. Botão "Zerar e Redefinir Dados Locais" visível:', resetBtnVisible);
if (!resetBtnVisible) throw new Error('Botão #btn-factory-reset-storage deveria estar visível na aba Importar!');

// Configurar aceitação automática do confirm()
page.on('dialog', async dialog => {
    console.log('3.2. Caixa de confirmação disparada com mensagem:', dialog.message().slice(0, 50) + '...');
    await dialog.accept();
});

// Clicar no botão de reset
await page.$eval('#btn-factory-reset-storage', el => {
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
    el.click();
});
await new Promise(r => setTimeout(r, 600));

// Verificar se o modal fechou e o catálogo voltou para o estado curado limpo
const modalClosed = await page.$eval('#export-center-modal', el => {
    const s = window.getComputedStyle(el);
    return s.display === 'none' || !el.classList.contains('open');
});
console.log('3.3. Modal fechado após reset:', modalClosed);
if (!modalClosed) throw new Error('O modal deveria fechar automaticamente após o reset!');

const afterResetTitleReadOnly = await page.$eval('#song-title', el => el.readOnly);
console.log('3.4. Música após reset em modo leitura:', afterResetTitleReadOnly);
if (!afterResetTitleReadOnly) throw new Error('Após o reset, a música reaberta deve estar em modo somente leitura!');

if (errors.length > 0) {
    throw new Error(`Erros no navegador: ${errors.join(', ')}`);
}

console.log('\n✅ TODOS OS TESTES DE USUÁRIO NOVO E RESET DE FÁBRICA PASSARAM COM SUCESSO!');
await browser.close();
server.close();
process.exit(0);
