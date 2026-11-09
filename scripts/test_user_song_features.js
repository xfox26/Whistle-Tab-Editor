import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from '../server/api.js';

const PORT = 3588;
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
        } else {
            const ext = path.extname(fpath);
            res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
            fs.createReadStream(fpath).pipe(res);
        }
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
page.on('console', msg => {
    console.log('[Browser Log]', msg.text());
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

    console.log('\n--- Teste 1: Acompanhamento da Partitura Curada Inicial ---');
    const curAccompaniment = await page.evaluate(() => {
        const t = window.tinWhistleTest;
        const song = t ? t.getCurrentSong() : null;
        const bs = t ? t.getBackingSettings() : null;
        return {
            title: song ? song.title : null,
            bodhranActive: bs ? bs.bodhranActive : null,
            guitarActive: bs ? bs.guitarActive : null,
            hasSongAccompaniment: Boolean(song && song.accompaniment)
        };
    });
    console.log('Dados da música inicial:', curAccompaniment);
    assert(curAccompaniment.hasSongAccompaniment === true, 'Música curada inicial possui objeto accompaniment');

    console.log('\n--- Teste 2: Criação de Nova Música com Acompanhamento Desligado ---');
    await page.click('#btn-new-song');
    await new Promise(r => setTimeout(r, 500));

    const newSongStatus = await page.evaluate(() => {
        const t = window.tinWhistleTest;
        const song = t ? t.getCurrentSong() : null;
        const acc = song ? song.accompaniment : null;
        const bs = t ? t.getBackingSettings() : null;
        const metroChecked = document.getElementById('toggle-metronome').checked;
        return {
            id: song ? song.id : null,
            title: song ? song.title : null,
            isPublic: song ? song.is_public : null,
            accBodhran: acc ? acc.bodhranActive : null,
            accGuitar: acc ? acc.guitarActive : null,
            accMetro: acc ? acc.metronomeActive : null,
            bsBodhran: bs ? bs.bodhranActive : null,
            bsGuitar: bs ? bs.guitarActive : null,
            metroChecked
        };
    });
    console.log('Status da nova música criada:', newSongStatus);
    assert(newSongStatus.accBodhran === false, 'Novo acompanhamento tem bodhranActive = false');
    assert(newSongStatus.accGuitar === false, 'Novo acompanhamento tem guitarActive = false');
    assert(newSongStatus.accMetro === false, 'Novo acompanhamento tem metronomeActive = false');
    assert(newSongStatus.bsBodhran === false, 'backingSettings.bodhranActive atualizado para false');
    assert(newSongStatus.bsGuitar === false, 'backingSettings.guitarActive atualizado para false');
    assert(newSongStatus.metroChecked === false, 'toggleMetronome desmarcado para nova música');

    console.log('\n--- Teste 3: Tag Pública / Privada na Barra Lateral ---');
    const badgeText = await page.evaluate((songId) => {
        const item = document.querySelector(`.song-item[data-id="${songId}"]`);
        if (!item) return null;
        const tags = Array.from(item.querySelectorAll('.badge-tag')).map(el => el.textContent.trim());
        return tags;
    }, newSongStatus.id);
    console.log('Tags na sidebar para a nova música:', badgeText);
    assert(badgeText.includes('💻 Minha'), 'Música do usuário contém a tag "💻 Minha"');
    assert(badgeText.some(t => t.includes('Privada')), 'Música do usuário contém a tag "🔒 Privada"');

    console.log('\n--- Teste 4: Tentar Publicar sem Login abre Modal de Autenticação ---');
    await page.evaluate(() => {
        const btnToggle = document.getElementById('btn-song-visibility-toggle');
        if (btnToggle) btnToggle.click();
    });
    await new Promise(r => setTimeout(r, 400));

    const authModalState = await page.evaluate(() => {
        const authModal = document.getElementById('auth-modal');
        const isVisible = authModal && window.getComputedStyle(authModal).display !== 'none';
        return { isVisible };
    });
    console.log('Estado do modal de autenticação:', authModalState);
    assert(authModalState.isVisible === true, 'Modal de login/cadastro é aberto automaticamente');

    console.log('\n--- Teste 5: Cadastro/Login e Publicação Automática ---');
    const testUsername = 'bardo_' + Math.floor(Math.random() * 899999 + 100000);
    await page.evaluate(() => {
        const tabRegister = document.getElementById('tab-auth-register');
        if (tabRegister) tabRegister.click();
    });
    await new Promise(r => setTimeout(r, 200));

    await page.type('#register-displayname', 'Bardo Valente');
    await page.type('#register-username', testUsername);
    await page.type('#register-password', 'senhaSegura123');
    await page.evaluate(() => {
        const form = document.getElementById('form-auth-register');
        if (form) form.requestSubmit();
    });

    await new Promise(r => setTimeout(r, 1500));

    const checkSuccessView = await page.evaluate(() => {
        const t = window.tinWhistleTest;
        const successBox = document.getElementById('auth-register-success');
        const errBox = document.getElementById('register-error-msg');
        return {
            currentBard: t ? t.getCurrentBard() : null,
            successVisible: successBox ? successBox.style.display : null,
            errorMsg: errBox ? errBox.textContent : null
        };
    });
    console.log('Status após submissão de cadastro:', checkSuccessView);

    // Clica no botão concluir cadastro
    await page.evaluate(() => {
        const btnFinish = document.getElementById('btn-finish-auth-success');
        if (btnFinish) btnFinish.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    const afterAuthState = await page.evaluate(() => {
        const t = window.tinWhistleTest;
        const song = t ? t.getCurrentSong() : null;
        const item = song ? document.querySelector(`.song-item[data-id="${song.id}"]`) : null;
        const tags = item ? Array.from(item.querySelectorAll('.badge-tag')).map(el => el.textContent.trim()) : [];
        const visToggleText = document.getElementById('vis-toggle-text') ? document.getElementById('vis-toggle-text').textContent.trim() : '';
        return {
            id: song ? song.id : null,
            isPublic: song ? song.is_public : null,
            tags,
            visToggleText
        };
    });
    console.log('Estado pós-autenticação e publicação automática:', afterAuthState);
    assert(afterAuthState.isPublic === 1, 'Partitura foi automaticamente publicada (is_public === 1)');
    assert(afterAuthState.visToggleText.includes('Pública'), 'Botão de visibilidade exibe "Pública"');
    assert(afterAuthState.tags.some(t => t.includes('Pública')), 'Sidebar exibe tag "🌍 Pública"');

    console.log('\n--- Teste 6: Salvar Acompanhamento na Música do Usuário e Alternar ---');
    // Ativa bodhran e metrônomo para a música do usuário
    await page.evaluate(() => {
        const metro = document.getElementById('toggle-metronome');
        if (metro) {
            metro.checked = true;
            metro.dispatchEvent(new Event('change'));
        }
        const t = window.tinWhistleTest;
        const bs = t ? t.getBackingSettings() : {};
        bs.bodhranActive = true;
        bs.bodhranVolume = 0.88;
        if (t) t.saveCurrentSongAccompaniment();
    });
    await new Promise(r => setTimeout(r, 400));

    // Seleciona outra música ("Amazing Grace")
    await page.evaluate(() => {
        window.tinWhistleTest.selectSong('amazing-grace');
    });
    await new Promise(r => setTimeout(r, 400));

    const amazingGraceSettings = await page.evaluate(() => {
        const t = window.tinWhistleTest;
        const bs = t ? t.getBackingSettings() : {};
        return {
            metroChecked: document.getElementById('toggle-metronome').checked,
            bodhranVol: bs.bodhranVolume
        };
    });
    console.log('Configurações aplicadas para Amazing Grace:', amazingGraceSettings);

    // Volta para a música do usuário
    await page.evaluate((songId) => {
        window.tinWhistleTest.selectSong(songId);
    }, afterAuthState.id || newSongStatus.id);
    await new Promise(r => setTimeout(r, 400));

    const restoredSettings = await page.evaluate(() => {
        const t = window.tinWhistleTest;
        const bs = t ? t.getBackingSettings() : {};
        return {
            metroChecked: document.getElementById('toggle-metronome').checked,
            bodhranActive: bs.bodhranActive,
            bodhranVol: bs.bodhranVolume
        };
    });
    console.log('Configurações restauradas na música do usuário:', restoredSettings);
    assert(restoredSettings.metroChecked === true, 'Metrônomo restaurado ativo para a música do usuário');
    assert(restoredSettings.bodhranActive === true, 'Bodhrán restaurado ativo');
    assert(Math.abs(restoredSettings.bodhranVol - 0.88) < 0.01, 'Volume do Bodhrán (88%) preservado na música');

} catch (err) {
    console.error('Erro na execução do teste:', err);
    failed = true;
} finally {
    await browser.close();
    server.close();
    if (errors.length > 0) {
        console.warn(`[Page Errors Detectados]: ${errors.length}`);
    }
    if (failed) {
        console.error('\n❌ TESTES FALHARAM!');
        process.exit(1);
    } else {
        console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
        process.exit(0);
    }
}
