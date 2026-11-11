import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

import pt from '../src/i18n/pt.js';
import en from '../src/i18n/en.js';
import es from '../src/i18n/es.js';
import { 
    initI18n, 
    getCurrentLanguage, 
    setLanguage, 
    t, 
    getAvailableLanguages 
} from '../src/i18n/index.js';
import { getNoteDisplayName } from '../src/config/whistleData.js';
import { handleApiRequest } from '../server/api.js';

console.log('--- 🌐 [TESTES AUTOMATIZADOS DA FASE 15: i18n & MULTI-IDIOMAS] ---');

// 1. Validar paridade e integridade dos dicionários
console.log('\n[Teste 1] Validando integridade e paridade dos dicionários (PT, EN, ES)...');

function extractKeys(obj, prefix = '') {
    let keys = [];
    for (const [k, v] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            keys = keys.concat(extractKeys(v, fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    return keys;
}

const ptKeys = extractKeys(pt);
const enKeys = extractKeys(en);
const esKeys = extractKeys(es);

console.log(`✓ Chaves encontradas: PT (${ptKeys.length}), EN (${enKeys.length}), ES (${esKeys.length})`);

const missingInEn = ptKeys.filter(k => !enKeys.includes(k));
const missingInEs = ptKeys.filter(k => !esKeys.includes(k));

if (missingInEn.length > 0) {
    throw new Error(`Chaves faltando no dicionário EN: ${missingInEn.join(', ')}`);
}
if (missingInEs.length > 0) {
    throw new Error(`Chaves faltando no dicionário ES: ${missingInEs.join(', ')}`);
}
console.log('✓ 100% de paridade entre os 3 dicionários confirmada.');

// 2. Validar função t() e interpolação
console.log('\n[Teste 2] Validando função t() e interpolação de variáveis...');

setLanguage('pt');
if (t('modes.studio') !== 'Estúdio') throw new Error(`Falha na tradução PT: ${t('modes.studio')}`);

setLanguage('en');
if (t('modes.studio') !== 'Studio') throw new Error(`Falha na tradução EN: ${t('modes.studio')}`);

setLanguage('es');
if (t('modes.studio') !== 'Estudio') throw new Error(`Falha na tradução ES: ${t('modes.studio')}`);

const interpolated = t('sidebar.resultsCount', { shown: 7, total: 17 });
if (!interpolated.includes('7') || !interpolated.includes('17')) {
    throw new Error(`Falha na interpolação: ${interpolated}`);
}
console.log(`✓ Interpolação confirmada: "${interpolated}"`);

// 3. Validar nomenclatura musical integrada
console.log('\n[Teste 3] Validando tradução de termos musicais (whistleData)...');
setLanguage('pt');
const restPt = getNoteDisplayName('REST', 'D');
setLanguage('en');
const restEn = getNoteDisplayName('REST', 'D');
setLanguage('es');
const restEs = getNoteDisplayName('REST', 'D');

if (restPt !== 'Pausa' || restEn !== 'Rest' || restEs !== 'Silencio') {
    throw new Error(`Falha na nomenclatura de Pausa: PT="${restPt}", EN="${restEn}", ES="${restEs}"`);
}
console.log(`✓ Nomenclatura musical traduzida: PT="${restPt}", EN="${restEn}", ES="${restEs}"`);

// 4. Validar respostas da API REST com Accept-Language
console.log('\n[Teste 4] Validando respostas traduzidas da API REST com cabeçalho Accept-Language...');
const PORT = 3988;
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

async function fetchApiErrorWithLang(lang) {
    const res = await fetch(`http://localhost:${PORT}/api/rota-inexistente`, {
        headers: { 'Accept-Language': lang }
    });
    return await res.json();
}

const errEn = await fetchApiErrorWithLang('en');
const errPt = await fetchApiErrorWithLang('pt-BR');
const errEs = await fetchApiErrorWithLang('es-ES');

if (!errEn.error || errEn.error !== 'API endpoint not found') throw new Error(`Falha API EN: ${JSON.stringify(errEn)}`);
if (!errPt.error || errPt.error !== 'Rota da API não encontrada') throw new Error(`Falha API PT: ${JSON.stringify(errPt)}`);
if (!errEs.error || errEs.error !== 'Ruta de la API no encontrada') throw new Error(`Falha API ES: ${JSON.stringify(errEs)}`);

console.log(`✓ API retornou mensagens traduzidas:`);
console.log(`   - EN: "${errEn.error}"`);
console.log(`   - PT: "${errPt.error}"`);
console.log(`   - ES: "${errEs.error}"`);

// 5. Teste Interativo E2E no Navegador com Puppeteer
console.log('\n[Teste 5] Validando troca interativa de idiomas no Navegador (DOM & UI)...');
const chromePath = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : '/usr/bin/chromium';
const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
});

try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle2' });

    await page.waitForSelector('#btn-lang-toggle');
    console.log('✓ Seletor de idioma desktop detectado no DOM.');

    // Trocar para Inglês via UI
    await page.click('#btn-lang-toggle');
    await page.waitForSelector('.lang-option-btn[data-lang="en"]');
    await page.click('.lang-option-btn[data-lang="en"]');

    // Verificar se DOM foi atualizado para inglês
    const htmlLangEn = await page.$eval('html', el => el.getAttribute('lang'));
    const studioTextEn = await page.$eval('#btn-mode-studio span', el => el.textContent.trim());
    const newSongTextEn = await page.$eval('#btn-new-song span', el => el.textContent.trim());

    if (htmlLangEn !== 'en') throw new Error(`html lang esperado "en", obtido "${htmlLangEn}"`);
    if (!studioTextEn.includes('Studio')) throw new Error(`Esperado "Studio", obtido "${studioTextEn}"`);
    if (!newSongTextEn.includes('New Tune')) throw new Error(`Esperado "New Tune", obtido "${newSongTextEn}"`);
    console.log(`✓ Interface traduzida para Inglês: [${studioTextEn}] | [${newSongTextEn}]`);

    // Trocar para Espanhol via UI
    await page.click('#btn-lang-toggle');
    await page.click('.lang-option-btn[data-lang="es"]');

    const htmlLangEs = await page.$eval('html', el => el.getAttribute('lang'));
    const studioTextEs = await page.$eval('#btn-mode-studio span', el => el.textContent.trim());
    const newSongTextEs = await page.$eval('#btn-new-song span', el => el.textContent.trim());

    if (htmlLangEs !== 'es') throw new Error(`html lang esperado "es", obtido "${htmlLangEs}"`);
    if (!studioTextEs.includes('Estudio')) throw new Error(`Esperado "Estudio", obtido "${studioTextEs}"`);
    if (!newSongTextEs.includes('Nueva Melodía')) throw new Error(`Esperado "Nueva Melodía", obtido "${newSongTextEs}"`);
    console.log(`✓ Interface traduzida para Espanhol: [${studioTextEs}] | [${newSongTextEs}]`);

    // Trocar para Português via UI
    await page.click('#btn-lang-toggle');
    await page.click('.lang-option-btn[data-lang="pt"]');

    const htmlLangPt = await page.$eval('html', el => el.getAttribute('lang'));
    const studioTextPt = await page.$eval('#btn-mode-studio span', el => el.textContent.trim());
    const newSongTextPt = await page.$eval('#btn-new-song span', el => el.textContent.trim());

    if (htmlLangPt !== 'pt') throw new Error(`html lang esperado "pt", obtido "${htmlLangPt}"`);
    if (!studioTextPt.includes('Estúdio')) throw new Error(`Esperado "Estúdio", obtido "${studioTextPt}"`);
    if (!newSongTextPt.includes('Nova Melodia')) throw new Error(`Esperado "Nova Melodia", obtido "${newSongTextPt}"`);
    console.log(`✓ Interface restaurada para Português: [${studioTextPt}] | [${newSongTextPt}]`);

    // 6. Teste Mobile do Seletor
    console.log('\n[Teste 6] Validando seletor de idiomas no menu mobile [⋯]...');
    await page.setViewport({ width: 390, height: 844 });
    await page.click('#btn-mobile-more-actions');
    await page.waitForSelector('.btn-lang-pill[data-lang="en"]');
    await page.click('.btn-lang-pill[data-lang="en"]');

    const studioTextMobileEn = await page.$eval('#btn-mode-studio span', el => el.textContent.trim());
    if (!studioTextMobileEn.includes('Studio')) throw new Error(`Falha mobile EN: ${studioTextMobileEn}`);
    console.log(`✓ Seletor mobile por pílulas funcionou perfeitamente.`);

} finally {
    await browser.close();
    server.close();
}

console.log('\n=========================================================================');
console.log('🎉 TODOS OS TESTES DA FASE 15 (i18n) FORAM CONCLUÍDOS COM 100% DE SUCESSO!');
console.log('=========================================================================\n');
process.exit(0);
