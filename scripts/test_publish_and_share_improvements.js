import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from '../server/api.js';
import { saveTune } from '../server/db.js';

const PORT = 3598;
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

try {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();

    const errors = [];
    page.on('pageerror', err => {
        console.error('[Browser Error]', err.message);
        errors.push(err.message);
    });

    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`http://localhost:${PORT}/?lang=pt`, { waitUntil: 'networkidle2' });

    console.log('\n--- 1. VERIFICAÇÃO DE REMOÇÃO DE ELEMENTOS OBSOLETOS ---');
    const oldShareBtnExists = await page.evaluate(() => Boolean(document.getElementById('btn-open-share-modal')));
    const oldShareModalExists = await page.evaluate(() => Boolean(document.getElementById('share-tune-modal')));
    console.log('1.1. Botão antigo (#btn-open-share-modal) removido:', !oldShareBtnExists);
    console.log('1.2. Modal antigo (#share-tune-modal) removido:', !oldShareModalExists);
    if (oldShareBtnExists || oldShareModalExists) {
        throw new Error('Elementos antigos de compartilhamento ainda existem no DOM.');
    }

    console.log('\n--- 2. VERIFICAÇÃO DO BOTÃO TOGGLE DE VISIBILIDADE NO EDITOR ---');
    const toggleExists = await page.evaluate(() => Boolean(document.getElementById('btn-song-visibility-toggle')));
    console.log('2.1. Botão toggle (#btn-song-visibility-toggle) presente:', toggleExists);
    if (!toggleExists) {
        throw new Error('Botão toggle de visibilidade não foi encontrado.');
    }

    // Em música curada inicial (somente leitura)
    const toggleDisabled = await page.evaluate(() => {
        const btn = document.getElementById('btn-song-visibility-toggle');
        return btn.disabled || btn.classList.contains('is-disabled');
    });
    console.log('2.2. Toggle protegido/desabilitado em música curada inicial:', toggleDisabled);
    if (!toggleDisabled) {
        throw new Error('Toggle de visibilidade deveria estar protegido em música do acervo oficial.');
    }

    console.log('\n--- 3. CRIAÇÃO DE NOVA MÚSICA E ALTERNÂNCIA PRIVADO <-> PÚBLICO ---');
    // Criar nova música
    await page.evaluate(() => {
        document.getElementById('btn-new-song').click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Verificar se nova música inicia como Privada
    const initialText = await page.evaluate(() => document.getElementById('vis-toggle-text').textContent.trim());
    console.log('3.1. Estado inicial da nova música:', initialText);
    if (initialText !== 'Privada') {
        throw new Error(`Esperado "Privada", recebido "${initialText}"`);
    }

    // Clicar no toggle para tentar tornar Pública (abre modal de auth pois não está logado)
    await page.evaluate(() => {
        document.getElementById('btn-song-visibility-toggle').click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Realizar cadastro de bardo para prosseguir com a publicação
    const testUsername = 'bardo_share_' + Math.floor(Math.random() * 89999 + 10000);
    await page.evaluate(() => {
        const tabRegister = document.getElementById('tab-auth-register');
        if (tabRegister) tabRegister.click();
    });
    await new Promise(r => setTimeout(r, 200));
    await page.type('#register-displayname', 'Bardo Teste');
    await page.type('#register-username', testUsername);
    await page.type('#register-password', 'password123');
    await page.evaluate(() => {
        const form = document.getElementById('form-auth-register');
        if (form) form.requestSubmit();
    });
    await new Promise(r => setTimeout(r, 1200));

    // Conclui cadastro e aciona publicação pendente
    await page.evaluate(() => {
        const btnFinish = document.getElementById('btn-finish-auth-success');
        if (btnFinish) btnFinish.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    const publicText = await page.evaluate(() => document.getElementById('vis-toggle-text').textContent.trim());
    const isPublicClass = await page.evaluate(() => document.getElementById('btn-song-visibility-toggle').classList.contains('is-public'));
    const urlAfterPublish = await page.evaluate(() => window.location.search);
    console.log('3.2. Estado após alternar para Pública:', publicText, '| Classe is-public:', isPublicClass);
    console.log('3.3. URL atualizada com ?tune=ID:', urlAfterPublish);

    if (publicText !== 'Pública' || !isPublicClass || !urlAfterPublish.includes('tune=')) {
        throw new Error('Falha ao alternar visibilidade para Pública ou sincronizar URL.');
    }

    const currentTuneId = await page.evaluate(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('tune');
    });

    // Alternar de volta para Privada
    await page.evaluate(() => {
        document.getElementById('btn-song-visibility-toggle').click();
    });
    await new Promise(r => setTimeout(r, 600));

    const privateAgainText = await page.evaluate(() => document.getElementById('vis-toggle-text').textContent.trim());
    console.log('3.4. Estado após alternar para Privada novamente:', privateAgainText);
    if (privateAgainText !== 'Privada') {
        throw new Error(`Esperado "Privada", recebido "${privateAgainText}"`);
    }

    console.log('\n--- 4. AUTO-SINCRONIZAÇÃO EM TEMPO REAL PARA MÚSICAS PÚBLICAS ---');
    // Torna pública novamente
    await page.evaluate(() => {
        document.getElementById('btn-song-visibility-toggle').click();
    });
    await new Promise(r => setTimeout(r, 600));

    const testUpdatedTitle = 'Melodia Teste Auto-Sync ' + Date.now();
    await page.evaluate((newTitle) => {
        const titleInput = document.getElementById('song-title');
        titleInput.value = newTitle;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }, testUpdatedTitle);

    // Aguardar debounce de 600ms + tempo de rede
    await new Promise(r => setTimeout(r, 1200));

    // Fazer requisição direta ao backend para conferir se o título foi persistido
    const apiRes = await fetch(`http://localhost:${PORT}/api/tunes/${encodeURIComponent(currentTuneId)}`);
    if (!apiRes.ok) {
        throw new Error(`Falha ao buscar tune da API após auto-sync: status ${apiRes.status}`);
    }
    const apiTune = await apiRes.json();
    console.log('4.1. Título persistido no backend via Auto-Sync:', apiTune.title);
    if (apiTune.title !== testUpdatedTitle) {
        throw new Error(`Auto-sync falhou: esperado "${testUpdatedTitle}", obtido "${apiTune.title}"`);
    }
    console.log('4.2. Auto-sync validado com sucesso!');

    console.log('\n--- 5. ACESSO DIRETO POR URL & TRATAMENTO DE MÚSICA PRIVADA DE TERCEIROS ---');
    // Salvar no banco uma melodia privada de terceiro
    const privateTuneId = 'tune_secret_private_test';
    saveTune({
        id: privateTuneId,
        title: 'Segredo Privado de Outro Bardo',
        artist: 'Autor Desconhecido',
        key: 'D',
        tempo: 120,
        time_signature: '4/4',
        category: 'celtic',
        difficulty: 'iniciante',
        rhythm: 'reel',
        notes: [{ note: 'D', duration: 1 }],
        author_name: 'Outro Bardo',
        user_id: 'usr_outrobardo_999',
        is_public: 0,
        is_curated: 0
    });

    // Abrir nova página em contexto incognito isolado acessando diretamente a música privada
    const freshContext = await browser.createBrowserContext();
    const page2 = await freshContext.newPage();
    await page2.setViewport({ width: 1280, height: 800 });
    await page2.goto(`http://localhost:${PORT}/?tune=${privateTuneId}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const page2Url = await page2.evaluate(() => window.location.search);
    const page2Title = await page2.evaluate(() => {
        const el = document.getElementById('song-title');
        return el ? el.value : '';
    });
    console.log('5.1. URL após tentar acessar melodia privada (não deve ser a privada):', page2Url);
    console.log('5.2. Partitura ativa na tela (deve ter carregado catálogo curado):', page2Title);

    if (page2Url.includes(privateTuneId) || page2Title === 'Segredo Privado de Outro Bardo') {
        throw new Error('Falha de segurança/privacidade: melodia privada de terceiro foi acessada por URL direta.');
    }
    console.log('5.3. Redirecionamento amigável e proteção de privacidade validados!');
    await page2.close();
    await freshContext.close();

    console.log('\n--- 6. BOTÃO DE COMPARTILHAMENTO NATIVO MOBILE ---');
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 300));

    const mobileShareVisible = await page.evaluate(() => {
        const btn = document.getElementById('btn-mobile-native-share');
        if (!btn) return false;
        const rect = btn.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && window.getComputedStyle(btn).display !== 'none';
    });
    console.log('6.1. Botão #btn-mobile-native-share visível em viewport mobile (390x844):', mobileShareVisible);
    if (!mobileShareVisible) {
        throw new Error('Botão de compartilhamento nativo não está visível no topo mobile.');
    }

    // Testar acionamento do compartilhamento (com navigator.clipboard fallback)
    const toastMessage = await page.evaluate(async () => {
        const btn = document.getElementById('btn-mobile-native-share');
        btn.click();
        await new Promise(r => setTimeout(r, 400));
        const toast = document.querySelector('.notification-toast');
        return toast ? toast.textContent.trim() : null;
    });
    console.log('6.2. Notificação disparada no compartilhamento:', toastMessage);

    console.log('\n✅ TODOS OS 6 PONTOS DO PLANO DE PUBLICAÇÃO & COMPARTILHAMENTO PASSARAM COM SUCESSO ABSOLUTO!\n');

} catch (err) {
    console.error('\n❌ TESTE FALHOU:', err);
    process.exit(1);
} finally {
    await browser.close();
    server.close();
    process.exit(0);
}
