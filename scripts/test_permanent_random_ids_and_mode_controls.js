import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from '../server/api.js';

const PORT = 3591;
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

const incognitoContext = await browser.createBrowserContext();
const page = await incognitoContext.newPage();

const errors = [];
page.on('pageerror', err => {
    console.error('[Browser Error]', err.message);
    errors.push(err.message);
});

let failed = false;
function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FALHA: ${message}`);
        failed = true;
    } else {
        console.log(`✅ OK: ${message}`);
    }
}

try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    console.log('\n--- 1. PONTO 3 & 4: BOTÕES TRANSPOR E ACOMPANHAMENTO POR MODO ---');
    // Em Concerning Hobbits (curadoria / somente leitura) em modo Studio:
    const studioButtonsState = await page.evaluate(() => {
        const btnTranspose = document.getElementById('btn-open-transpose');
        const btnBacking = document.getElementById('btn-open-backing-tracks');
        const btnDemo = document.getElementById('btn-open-demo-recorder');
        const btnBannerEdit = document.getElementById('btn-banner-edit-song');
        return {
            transposeDisabled: btnTranspose ? btnTranspose.disabled : null,
            transposeDisplay: btnTranspose ? window.getComputedStyle(btnTranspose).display : null,
            backingDisabled: btnBacking ? btnBacking.disabled : null,
            demoDisplay: btnDemo ? window.getComputedStyle(btnDemo).display : null,
            bannerEditDisplay: btnBannerEdit ? window.getComputedStyle(btnBannerEdit).display : null
        };
    });
    console.log('Modo Estúdio (música somente leitura):', studioButtonsState);
    assert(studioButtonsState.transposeDisabled === true, 'No modo Estúdio (readOnly), botão Transpor está desabilitado');
    assert(studioButtonsState.backingDisabled === true, 'No modo Estúdio (readOnly), botão Acompanhamento está desabilitado');
    assert(studioButtonsState.demoDisplay === 'none', 'No modo Estúdio (readOnly), botão Gravar Demo está oculto');

    // Trocar para Modo Treino:
    await page.click('#btn-mode-practice');
    await new Promise(r => setTimeout(r, 400));

    const practiceButtonsState = await page.evaluate(() => {
        const btnTranspose = document.getElementById('btn-open-transpose');
        const btnBacking = document.getElementById('btn-open-backing-tracks');
        const btnDemo = document.getElementById('btn-open-demo-recorder');
        const btnBannerEdit = document.getElementById('btn-banner-edit-song');
        const mbEdit = document.getElementById('btn-mobile-edit-meta');
        return {
            transposeDisplay: btnTranspose ? window.getComputedStyle(btnTranspose).display : null,
            backingDisabled: btnBacking ? btnBacking.disabled : null,
            demoDisplay: btnDemo ? window.getComputedStyle(btnDemo).display : null,
            bannerEditDisplay: btnBannerEdit ? window.getComputedStyle(btnBannerEdit).display : null,
            mbEditDisplay: mbEdit ? window.getComputedStyle(mbEdit).display : null
        };
    });
    console.log('Modo Treino:', practiceButtonsState);
    assert(practiceButtonsState.transposeDisplay === 'none', 'No modo Treino, botão Transpor NÃO aparece (display: none)');
    assert(practiceButtonsState.backingDisabled === false, 'No modo Treino, botão Acompanhamento está disponível (habilitado)');
    assert(practiceButtonsState.demoDisplay === 'none', 'No modo Treino, botão Gravar Demo NÃO aparece');
    assert(practiceButtonsState.bannerEditDisplay === 'none', 'No modo Treino, botão Editar do banner NÃO aparece');
    assert(practiceButtonsState.mbEditDisplay === 'none', 'No modo Treino, lápis de editar mobile NÃO aparece');

    // Trocar para Modo Play-Along:
    await page.click('#btn-mode-playalong');
    await new Promise(r => setTimeout(r, 400));

    const playalongButtonsState = await page.evaluate(() => {
        const btnTranspose = document.getElementById('btn-open-transpose');
        const btnBacking = document.getElementById('btn-open-backing-tracks');
        const btnDemo = document.getElementById('btn-open-demo-recorder');
        return {
            transposeDisplay: btnTranspose ? window.getComputedStyle(btnTranspose).display : null,
            backingDisabled: btnBacking ? btnBacking.disabled : null,
            demoDisplay: btnDemo ? window.getComputedStyle(btnDemo).display : null
        };
    });
    console.log('Modo Play-Along:', playalongButtonsState);
    assert(playalongButtonsState.transposeDisplay === 'none', 'No modo Play-Along, botão Transpor NÃO aparece');
    assert(playalongButtonsState.backingDisabled === false, 'No modo Play-Along, botão Acompanhamento está disponível (habilitado)');
    assert(playalongButtonsState.demoDisplay === 'none', 'No modo Play-Along, botão Gravar Demo NÃO aparece');

    // Voltar para modo Estúdio
    await page.click('#btn-mode-studio');
    await new Promise(r => setTimeout(r, 400));

    console.log('\n--- 2. PONTO 1: CRIAÇÃO DE MÚSICA COM ID ALEATÓRIO E SEM DUPLICAÇÃO AO PUBLICAR ---');
    // Criar nova música
    await page.click('#btn-new-song');
    await new Promise(r => setTimeout(r, 400));

    const createdSongData = await page.evaluate(() => {
        const t = window.tinWhistleTest;
        const song = t.getCurrentSong();
        const urlParams = new URLSearchParams(window.location.search);
        return {
            id: song.id,
            urlTune: urlParams.get('tune'),
            isPublic: song.is_public,
            isUserSongPrefixed: song.id.startsWith('user-song-'),
            isLength8: song.id.length === 8
        };
    });
    console.log('Música criada:', createdSongData);
    assert(createdSongData.isUserSongPrefixed === false, 'ID da nova música NÃO possui prefixo user-song-');
    assert(createdSongData.isLength8 === true, 'ID da nova música possui 8 caracteres aleatórios');
    assert(createdSongData.urlTune === createdSongData.id, 'URL reflete exatamente o ID de 8 caracteres');

    const uniqueSongTitle = 'Composição Única Bardo ' + Date.now();
    await page.evaluate((uTitle) => {
        const input = document.getElementById('song-title');
        if (input) {
            input.value = uTitle;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }, uniqueSongTitle);
    await new Promise(r => setTimeout(r, 700));

    // Cadastro de bardo para sincronizar na nuvem
    const testUsername = 'bardo_test_' + Math.floor(Math.random() * 89999 + 10000);
    await page.click('#btn-song-visibility-toggle');
    await new Promise(r => setTimeout(r, 300));
    await page.click('#tab-auth-register');
    await new Promise(r => setTimeout(r, 200));
    await page.type('#register-displayname', 'Bardo Testador');
    await page.type('#register-username', testUsername);
    await page.type('#register-password', 'segredo123');
    await page.evaluate(() => {
        const form = document.getElementById('form-auth-register');
        if (form) form.requestSubmit();
    });
    await new Promise(r => setTimeout(r, 1200));
    await page.click('#btn-finish-auth-success');
    await new Promise(r => setTimeout(r, 1500));

    const afterPublishData = await page.evaluate((args) => {
        const { originalId, uTitle } = args;
        const t = window.tinWhistleTest;
        const current = t.getCurrentSong();
        const urlParams = new URLSearchParams(window.location.search);
        const matchingItems = document.querySelectorAll(`.song-item[data-id="${originalId}"]`);
        const allMatchingTitles = Array.from(document.querySelectorAll('.song-item-title'))
            .filter(el => el.textContent.trim() === uTitle);
        const item = matchingItems[0];
        const badges = item ? Array.from(item.querySelectorAll('.badge-tag, .badge-offline-sync')).map(b => b.textContent.trim()) : [];
        return {
            currentId: current.id,
            sameId: current.id === originalId,
            urlTune: urlParams.get('tune'),
            sameUrl: urlParams.get('tune') === originalId,
            matchingItemsCount: matchingItems.length,
            titleOccurrencesCount: allMatchingTitles.length,
            badges
        };
    }, { originalId: createdSongData.id, uTitle: uniqueSongTitle });

    console.log('Dados após publicação:', afterPublishData);
    assert(afterPublishData.sameId === true, 'Ao publicar, o ID da música permaneceu rigorosamente o mesmo');
    assert(afterPublishData.sameUrl === true, 'Ao publicar, a URL permaneceu rigorosamente a mesma (?tune=ID)');
    assert(afterPublishData.titleOccurrencesCount === 1, 'Aparece APENAS 1 registro na biblioteca (sem duplicações)');
    assert(afterPublishData.badges.some(b => b.includes('Pública')), 'Música possui a tag 🌍 Pública');
    assert(!afterPublishData.badges.some(b => b.includes('Apenas local')), 'Música sincronizada com DB NÃO possui a tag 💾 Apenas local');

    console.log('\n--- 3. PONTO 2: ACOMPANHAMENTO NÃO PERSISTE NO MODO TREINO / PLAY-ALONG ---');
    // Mudar para modo Treino e alterar acompanhamento
    await page.click('#btn-mode-practice');
    await new Promise(r => setTimeout(r, 300));

    await page.evaluate(() => {
        const t = window.tinWhistleTest;
        const bs = t.getBackingSettings();
        bs.bodhranActive = true;
        bs.bodhranVolume = 0.99;
        t.saveCurrentSongAccompaniment();
    });
    await new Promise(r => setTimeout(r, 300));

    // Trocar para outra música e voltar
    await page.evaluate(() => {
        window.tinWhistleTest.selectSong('DkuEQVzq'); // Concerning Hobbits
    });
    await new Promise(r => setTimeout(r, 400));

    await page.evaluate((id) => {
        window.tinWhistleTest.selectSong(id);
    }, createdSongData.id);
    await new Promise(r => setTimeout(r, 400));

    const songAccAfterSwitch = await page.evaluate(() => {
        const t = window.tinWhistleTest;
        const song = t.getCurrentSong();
        return song.accompaniment;
    });
    console.log('Acompanhamento da música após voltar:', songAccAfterSwitch);
    assert(songAccAfterSwitch.bodhranActive === false, 'Alterações feitas no Modo Treino NÃO foram salvas na partitura');

    console.log('\n--- 4. PONTO 5: BOTÕES GRAVAR DEMO E EDITAR NO MODO ESTÚDIO EM PARTITURA EDITÁVEL ---');
    // Voltar para Modo Estúdio
    await page.click('#btn-mode-studio');
    await new Promise(r => setTimeout(r, 300));

    const editableStudioButtons = await page.evaluate(() => {
        const btnDemo = document.getElementById('btn-open-demo-recorder');
        const btnBannerEdit = document.getElementById('btn-banner-edit-song');
        return {
            demoDisplay: btnDemo ? window.getComputedStyle(btnDemo).display : null,
            bannerEditDisplay: btnBannerEdit ? window.getComputedStyle(btnBannerEdit).display : null
        };
    });
    console.log('Botões no modo Estúdio para música própria:', editableStudioButtons);
    assert(editableStudioButtons.demoDisplay !== 'none', 'Botão Gravar Demo visível no modo Estúdio para música do autor');
    assert(editableStudioButtons.bannerEditDisplay !== 'none', 'Botão Editar Banner visível no modo Estúdio para música do autor');

} catch (err) {
    console.error('\n❌ TESTE FALHOU:', err);
    failed = true;
} finally {
    await browser.close();
    server.close();
    if (failed) {
        process.exit(1);
    } else {
        console.log('\n🎉 TODOS OS 5 PONTOS DO FEEDBACK FORAM VALIDADOS COM SUCESSO TOTAL!');
        process.exit(0);
    }
}
