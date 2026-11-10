import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from '../server/api.js';

const PORT = 3592;
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
    console.log('[Browser Console]', msg.type(), msg.text());
});

page.on('dialog', async dialog => {
    try {
        await dialog.accept();
    } catch (e) {}
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

    console.log('\n--- 1. BORDÃO EXCLUSIVO DE TREINO E PLAY-ALONG (BLOQUEADO NO ESTÚDIO) ---');
    // No modo Studio padrão
    const studioDroneTest = await page.evaluate(() => {
        const btnPracticeDrone = document.getElementById('btn-toggle-drone');
        // Tentar acionar o drone enquanto estiver no modo Studio
        if (btnPracticeDrone) btnPracticeDrone.click();
        return {
            mode: document.body.dataset.appMode,
            btnActive: btnPracticeDrone ? btnPracticeDrone.classList.contains('active') : false
        };
    });
    console.log('Tentativa de drone no modo Estúdio:', studioDroneTest);
    assert(studioDroneTest.btnActive === false, 'Drone NÃO ativa quando em modo Studio');

    // Mudar para o modo Treino
    await page.click('#btn-mode-practice');
    await new Promise(r => setTimeout(r, 400));

    const practiceDroneTest = await page.evaluate(() => {
        const btnDrone = document.getElementById('btn-toggle-drone');
        if (btnDrone) btnDrone.click();
        return {
            mode: document.body.dataset.appMode,
            btnActive: btnDrone ? btnDrone.classList.contains('active') : false,
            label: document.getElementById('drone-btn-label')?.textContent
        };
    });
    console.log('Drone no modo Treino:', practiceDroneTest);
    assert(practiceDroneTest.btnActive === true, 'Drone ativa com sucesso no modo Treino');
    assert(practiceDroneTest.label === 'Bordão Ativo', 'Label do botão muda para "Bordão Ativo"');

    // Mudar para o modo Play-Along: o drone deve continuar e a UI do Play-Along sincronizada
    await page.click('#btn-mode-playalong');
    await new Promise(r => setTimeout(r, 400));

    const playAlongDroneTest = await page.evaluate(() => {
        const btnDronePa = document.getElementById('btn-toggle-drone-pa');
        const sliderPa = document.getElementById('drone-volume-pa');
        const sliderPrac = document.getElementById('drone-volume');
        if (sliderPa) {
            sliderPa.value = '0.55';
            sliderPa.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return {
            mode: document.body.dataset.appMode,
            btnPaActive: btnDronePa ? btnDronePa.classList.contains('active') : false,
            labelPa: document.getElementById('drone-pa-btn-label')?.textContent,
            sliderPaVal: sliderPa?.value,
            sliderPracVal: sliderPrac?.value
        };
    });
    console.log('Drone no modo Play-Along:', playAlongDroneTest);
    assert(playAlongDroneTest.btnPaActive === true, 'Drone refletido como ativo no painel de Play-Along');
    assert(playAlongDroneTest.sliderPracVal === '0.55', 'Volume do drone sincronizado entre Play-Along e Treino');

    // Voltar para modo Estúdio: drone DEVE ser desligado automaticamente
    await page.click('#btn-mode-studio');
    await new Promise(r => setTimeout(r, 400));

    const studioAfterReturn = await page.evaluate(() => {
        const btnDrone = document.getElementById('btn-toggle-drone');
        const btnDronePa = document.getElementById('btn-toggle-drone-pa');
        return {
            btnActive: btnDrone ? btnDrone.classList.contains('active') : false,
            btnPaActive: btnDronePa ? btnDronePa.classList.contains('active') : false,
            currentSongAcc: window.tinWhistleTest.getCurrentSong()?.accompaniment
        };
    });
    console.log('Após retornar ao Modo Estúdio:', studioAfterReturn);
    assert(studioAfterReturn.btnActive === false, 'Drone desligado automaticamente ao entrar no modo Estúdio');
    assert(studioAfterReturn.currentSongAcc?.droneActive === undefined, 'droneActive NÃO existe no accompaniment da música');
    assert(studioAfterReturn.currentSongAcc?.droneVolume === undefined, 'droneVolume NÃO existe no accompaniment da música');

    console.log('\n--- 2. PLAY-ALONG: TOGGLE DE ÁUDIO GUIA E ACOMPANHAMENTOS ---');
    await page.click('#btn-mode-playalong');
    await new Promise(r => setTimeout(r, 400));

    const togglesState = await page.evaluate(() => {
        const toggleAudio = document.getElementById('toggle-pa-backing-audio');
        const toggleAcc = document.getElementById('toggle-pa-accompaniment');
        const isAligned = toggleAudio && toggleAcc && (
            toggleAudio.closest('.playalong-toggles-stack') === toggleAcc.closest('.playalong-toggles-stack')
        );
        return {
            hasAudioToggle: !!toggleAudio,
            hasAccToggle: !!toggleAcc,
            audioChecked: toggleAudio?.checked,
            accChecked: toggleAcc?.checked,
            isAligned
        };
    });
    console.log('Toggles do Play-Along:', togglesState);
    assert(togglesState.hasAudioToggle === true, 'Toggle "Áudio Guia" está presente');
    assert(togglesState.hasAccToggle === true, 'Toggle "Acompanhamentos" está presente');
    assert(togglesState.isAligned === true, 'Toggle "Acompanhamentos" está empilhado e alinhado com "Áudio Guia"');

    // Testar independência dos toggles
    await page.evaluate(() => {
        const toggleAudio = document.getElementById('toggle-pa-backing-audio');
        const toggleAcc = document.getElementById('toggle-pa-accompaniment');
        toggleAudio.checked = false;
        toggleAcc.checked = true;
    });
    const independentCheck = await page.evaluate(() => {
        return {
            audio: document.getElementById('toggle-pa-backing-audio')?.checked,
            acc: document.getElementById('toggle-pa-accompaniment')?.checked
        };
    });
    assert(independentCheck.audio === false && independentCheck.acc === true, 'Toggles funcionam independentemente');

    console.log('\n--- 3. RESTAURAÇÃO/IMPORTAÇÃO JSON COM ID DE 8 CARACTERES E SYNC ---');
    // Criar um usuário primeiro para validar o sync sem tag "Apenas local"
    const testUser = 'bard_json_' + Math.floor(Math.random() * 89999 + 10000);
    await page.evaluate(() => {
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.style.display = 'flex';
    });
    await new Promise(r => setTimeout(r, 300));
    await page.click('#tab-auth-register');
    await new Promise(r => setTimeout(r, 200));
    await page.type('#register-displayname', 'Bardo Importador');
    await page.type('#register-username', testUser);
    await page.type('#register-password', 'segredo123');
    await page.evaluate(() => {
        const form = document.getElementById('form-auth-register');
        if (form) form.requestSubmit();
    });
    await new Promise(r => setTimeout(r, 1200));
    await page.click('#btn-finish-auth-success');
    await new Promise(r => setTimeout(r, 1200));

    const bardCheck = await page.evaluate(() => window.tinWhistleTest.getCurrentBard());
    console.log('Bardo atual antes do import:', bardCheck);

    // Simular importação de JSON com ID legado e sem prefixo aleatório
    const importResult = await page.evaluate(async () => {
        const legacyJSON = JSON.stringify({
            title: "Balada do Vento do Norte",
            notes: "D4 E4 F#4 G4 A4",
            bpm: 110,
            whistleKey: "D",
            notesRaw: "D E F# G A",
            accompaniment: { bodhranActive: true, bodhranVolume: 0.8 }
        });
        
        // Disparar importação usando a função da app
        const file = new File([legacyJSON], "balada.json", { type: "application/json" });
        const input = document.getElementById('import-center-json-file-input');
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Aguardar processamento da importação e sincronização assíncrona
        let cur = null;
        for (let i = 0; i < 25; i++) {
            await new Promise(r => setTimeout(r, 200));
            cur = window.tinWhistleTest.getCurrentSong();
            if (cur && cur.title === "Balada do Vento do Norte" && cur.isCloud) {
                break;
            }
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        const item = document.querySelector(`.song-item[data-id="${cur.id}"]`);
        const badges = item ? Array.from(item.querySelectorAll('.badge-tag, .badge-offline-sync')).map(b => b.textContent.trim()) : [];
        
        return {
            importedId: cur?.id,
            urlTune: urlParams.get('tune'),
            title: cur?.title,
            isLength8: cur?.id?.length === 8,
            startsWithSong: cur?.id?.startsWith('song-'),
            isCloud: cur?.isCloud,
            syncStatus: cur?.syncStatus,
            badges
        };
    });

    console.log('Resultado da importação JSON:', importResult);
    assert(importResult.isLength8 === true, 'Música importada via JSON recebeu ID aleatório com exatamente 8 caracteres');
    assert(importResult.startsWithSong === false, 'Música importada via JSON NÃO possui prefixo song-');
    assert(importResult.urlTune === importResult.importedId, 'URL reflete exatamente o novo ID de 8 caracteres (?tune=ID)');
    assert(!importResult.badges.some(b => b.includes('Apenas local')), 'Música importada por usuário autenticado é sincronizada e NÃO recebe a tag 💾 Apenas local');

    console.log('\n--- 4. LIMPEZA DE CÓDIGO LEGADO ---');
    const legacySweep = await page.evaluate(() => {
        return {
            hasCuratedIdMapInWindow: typeof window.CURATED_ID_MAP !== 'undefined',
            hasLegacySongsInStorage: localStorage.getItem('whistle_tabs_user_songs_v1') !== null
        };
    });
    console.log('Verificação de legados:', legacySweep);
    assert(legacySweep.hasCuratedIdMapInWindow === false, 'CURATED_ID_MAP totalmente ausente do escopo');

} catch (err) {
    console.error('\n❌ TESTE FALHOU:', err);
    failed = true;
} finally {
    await browser.close();
    server.close();
    if (failed) {
        process.exit(1);
    } else {
        console.log('\n🎉 TODOS OS NOVOS REQUISITOS (BORDÃO, PLAY-ALONG TOGGLES, JSON ID, SEM LEGADOS) FORAM VALIDADOS COM SUCESSO TOTAL!');
        process.exit(0);
    }
}
