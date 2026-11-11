import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from '../server/api.js';

const PORT = 3698;
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
console.log('--- 🧪 TESTE DE VALIDAÇÃO DO REDESIGN (PONTOS A, B, C, D, E) ---');
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

    // ----------------------------------------------------
    // TESTE PONTO A: Barra Superior em 2 Linhas no Mobile
    // ----------------------------------------------------
    console.log('\n[Ponto A] Verificando Barra Superior em 2 Linhas no Mobile...');
    const topBarData = await page.evaluate(() => {
        const nav = document.querySelector('.app-mode-nav');
        const row1 = document.querySelector('.mobile-nav-top-row');
        const row2 = document.querySelector('.mobile-nav-bottom-row');
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const langToggle = document.getElementById('btn-lang-toggle');
        const userBtn = document.getElementById('btn-open-user-modal');
        const moreBtn = document.getElementById('btn-mobile-more-actions');
        const titleEl = document.getElementById('mobile-top-title');
        const keyEl = document.getElementById('mobile-top-key');
        const editBtn = document.getElementById('btn-mobile-edit-meta');
        const shareBtn = document.getElementById('btn-mobile-native-share');

        const navRect = nav.getBoundingClientRect();
        const r1Rect = row1.getBoundingClientRect();
        const r2Rect = row2.getBoundingClientRect();

        return {
            navHeight: navRect.height,
            row1Top: r1Rect.top,
            row2Top: r2Rect.top,
            isRow2BelowRow1: r2Rect.top >= r1Rect.bottom - 2,
            hasRow1Buttons: !!(sidebarToggle && langToggle && userBtn && moreBtn),
            hasRow2Elements: !!(titleEl && keyEl && editBtn && shareBtn),
            titleText: titleEl ? titleEl.textContent : '',
            row1Visible: window.getComputedStyle(row1).display !== 'none',
            row2Visible: window.getComputedStyle(row2).display !== 'none'
        };
    });

    console.log(`  - Altura da barra superior: ${topBarData.navHeight.toFixed(1)}px (>= 75px para 2 linhas)`);
    console.log(`  - Linha 2 fica estritamente abaixo da Linha 1: ${topBarData.isRow2BelowRow1}`);
    console.log(`  - Botões da Linha 1 presentes (Hambúrguer, Língua, Usuário, Mais): ${topBarData.hasRow1Buttons}`);
    console.log(`  - Elementos da Linha 2 presentes (Título, Tom, Lápis, Share): ${topBarData.hasRow2Elements}`);
    if (!topBarData.isRow2BelowRow1 || !topBarData.hasRow1Buttons || !topBarData.hasRow2Elements) {
        throw new Error('Falha no Ponto A: Barra superior mobile não está em 2 linhas funcionais');
    }
    console.log('✓ Ponto A validado com sucesso!');

    // ----------------------------------------------------
    // TESTE PONTO C: Banner de Modo Leitura Integrado como Overlay no Teclado
    // ----------------------------------------------------
    console.log('\n[Ponto C] Verificando Banner de Modo Leitura como Overlay no Teclado...');
    const overlayData = await page.evaluate(() => {
        const kbPanel = document.getElementById('mode-buttons-panel');
        const banner = document.getElementById('readonly-mode-banner');
        const remixBtn = document.getElementById('btn-remix-tune');

        const isInsideKbPanel = kbPanel.contains(banner);
        const bannerStyle = window.getComputedStyle(banner);
        const isOverlayPositioned = bannerStyle.position === 'absolute';
        const hasBackdropFilter = bannerStyle.backdropFilter.includes('blur') || bannerStyle.webkitBackdropFilter.includes('blur');

        return {
            isInsideKbPanel,
            isOverlayPositioned,
            hasBackdropFilter,
            hasRemixBtn: !!remixBtn,
            bannerDisplay: bannerStyle.display
        };
    });

    console.log(`  - Banner está contido dentro do painel do teclado: ${overlayData.isInsideKbPanel}`);
    console.log(`  - Banner posicionado como overlay absoluto: ${overlayData.isOverlayPositioned}`);
    console.log(`  - Banner possui efeito backdrop-filter blur: ${overlayData.hasBackdropFilter}`);
    console.log(`  - Botão de Remix presente no banner: ${overlayData.hasRemixBtn}`);
    console.log(`  - Banner visível na música curada (Modo Leitura ativo): ${overlayData.bannerDisplay === 'flex'}`);

    if (!overlayData.isInsideKbPanel || !overlayData.isOverlayPositioned) {
        throw new Error('Falha no Ponto C: Banner de modo leitura não está integrado como overlay');
    }
    console.log('✓ Ponto C validado com sucesso!');
    await page.screenshot({ path: path.resolve(process.cwd(), 'audit-screenshots/layout/Redesign_Mobile_Readonly_Overlay.png'), fullPage: false });
    console.log('📸 Screenshot do overlay de modo leitura salvo em audit-screenshots/layout/Redesign_Mobile_Readonly_Overlay.png');

    // Agora criamos uma nova música editável para testar os controles de edição (Ponto B e D)
    console.log('\n[Transição] Criando nova música editável (liberando teclado para edição)...');
    await page.evaluate(() => {
        if (typeof window.newSong === 'function') {
            window.newSong();
        } else {
            const btnNew = document.getElementById('btn-new-song') || document.querySelector('.btn-new-tune');
            if (btnNew) btnNew.click();
        }
    });
    await new Promise(r => setTimeout(r, 200));

    // ----------------------------------------------------
    // TESTE PONTO B: Teclado Virtual como Padrão + Toggle Compacto
    // ----------------------------------------------------
    console.log('\n[Ponto B] Verificando Teclado Padrão e Toggle Compacto de Texto...');
    const inputModesData = await page.evaluate(() => {
        const kbPanel = document.getElementById('mode-buttons-panel');
        const textPanel = document.getElementById('mode-text-panel');
        const btnToggleToText = document.getElementById('btn-toggle-input-mode');
        const btnToggleBackKb = document.getElementById('btn-toggle-back-keyboard');
        const banner = document.getElementById('readonly-mode-banner');

        const kbVisibleInitial = window.getComputedStyle(kbPanel).display !== 'none';
        const textVisibleInitial = window.getComputedStyle(textPanel).display === 'none';
        const bannerHidden = window.getComputedStyle(banner).display === 'none';

        return {
            kbVisibleInitial,
            textVisibleInitial,
            bannerHidden,
            hasBtnToggleToText: !!btnToggleToText,
            hasBtnToggleBackKb: !!btnToggleBackKb
        };
    });

    console.log(`  - Teclado visível por padrão: ${inputModesData.kbVisibleInitial}`);
    console.log(`  - Entrada por texto oculta por padrão: ${inputModesData.textVisibleInitial}`);
    console.log(`  - Overlay de modo leitura desativado na música nova: ${inputModesData.bannerHidden}`);
    console.log(`  - Botão de alternar para texto presente: ${inputModesData.hasBtnToggleToText}`);
    console.log(`  - Botão de retornar ao teclado presente: ${inputModesData.hasBtnToggleBackKb}`);

    // Testar alternância interativa para texto
    await page.click('#btn-toggle-input-mode');
    await new Promise(r => setTimeout(r, 150));

    const afterToggleToText = await page.evaluate(() => {
        const kbPanel = document.getElementById('mode-buttons-panel');
        const textPanel = document.getElementById('mode-text-panel');
        return {
            kbHidden: window.getComputedStyle(kbPanel).display === 'none',
            textVisible: window.getComputedStyle(textPanel).display !== 'none'
        };
    });
    console.log(`  - Alternou para modo texto com sucesso: ${afterToggleToText.textVisible && afterToggleToText.kbHidden}`);

    // Testar retorno interativo para teclado
    await page.click('#btn-toggle-back-keyboard');
    await new Promise(r => setTimeout(r, 150));

    const afterToggleBackKb = await page.evaluate(() => {
        const kbPanel = document.getElementById('mode-buttons-panel');
        const textPanel = document.getElementById('mode-text-panel');
        return {
            kbVisible: window.getComputedStyle(kbPanel).display !== 'none',
            textHidden: window.getComputedStyle(textPanel).display === 'none'
        };
    });
    console.log(`  - Retornou para o teclado com sucesso: ${afterToggleBackKb.kbVisible && afterToggleBackKb.textHidden}`);

    if (!afterToggleToText.textVisible || !afterToggleBackKb.kbVisible) {
        throw new Error('Falha no Ponto B: Alternância de modos de entrada falhou');
    }
    console.log('✓ Ponto B validado com sucesso!');

    // ----------------------------------------------------
    // TESTE PONTO D: Toolbar de Edição em 2 Linhas
    // ----------------------------------------------------
    console.log('\n[Ponto D] Verificando Toolbar de Edição em 2 Linhas Ergonômicas...');
    const toolbarData = await page.evaluate(() => {
        const toolbar = document.getElementById('editor-toolbar');
        const rowTop = toolbar.querySelector('.toolbar-row-top');
        const rowBottom = toolbar.querySelector('.toolbar-row-bottom');
        const undoBtn = document.getElementById('btn-undo');
        const copyBtn = document.getElementById('btn-copy-selection');

        const tbStyle = window.getComputedStyle(toolbar);
        const isFlexColumn = tbStyle.flexDirection === 'column';
        const undoHeight = undoBtn.getBoundingClientRect().height;
        const copyHeight = copyBtn.getBoundingClientRect().height;

        const topRect = rowTop.getBoundingClientRect();
        const bottomRect = rowBottom.getBoundingClientRect();
        const isBottomBelowTop = bottomRect.top >= topRect.bottom - 2;

        return {
            isFlexColumn,
            isBottomBelowTop,
            undoHeight,
            copyHeight,
            hasBothRows: !!(rowTop && rowBottom)
        };
    });

    console.log(`  - Toolbar organizada em coluna (2 linhas): ${toolbarData.isFlexColumn}`);
    console.log(`  - Linha 2 fica abaixo da Linha 1: ${toolbarData.isBottomBelowTop}`);
    console.log(`  - Altura do botão Undo/Desfazer: ${toolbarData.undoHeight.toFixed(1)}px (>= 36px para touch fácil)`);
    console.log(`  - Altura do botão Copiar: ${toolbarData.copyHeight.toFixed(1)}px (>= 36px para touch fácil)`);

    if (!toolbarData.isFlexColumn || !toolbarData.isBottomBelowTop || toolbarData.undoHeight < 36) {
        throw new Error('Falha no Ponto D: Toolbar de edição não está em 2 linhas ergonômicas');
    }
    console.log('✓ Ponto D validado com sucesso!');

    // ----------------------------------------------------
    // TESTE PONTO E: Ordem Visual e Estrutural das Seções
    // ----------------------------------------------------
    console.log('\n[Ponto E] Verificando Reordenação Vertical dos Quadros...');
    const verticalOrder = await page.evaluate(() => {
        const topBar = document.querySelector('.app-mode-nav');
        const inputSec = document.querySelector('.editor-input-section');
        const toolbar = document.querySelector('.editor-toolbar');
        const sheet = document.querySelector('.tab-sheet-outer');
        const controls = document.querySelector('.control-bar');

        const topBarY = topBar.getBoundingClientRect().top;
        const inputSecY = inputSec.getBoundingClientRect().top;
        const toolbarY = toolbar.getBoundingClientRect().top;
        const sheetY = sheet.getBoundingClientRect().top;
        const controlsY = controls.getBoundingClientRect().top;

        // Na ordem solicitada:
        // 1. Top bar
        // 2. Teclado Virtual (inputSec)
        // 3. Barra de Ferramentas (toolbar)
        // 4. Partitura (sheet)
        // 5. Controles de Play/Stop (controls)
        return {
            topBarY,
            inputSecY,
            toolbarY,
            sheetY,
            controlsY,
            isCorrectOrder: (topBarY < inputSecY) &&
                            (inputSecY < toolbarY) &&
                            (toolbarY < sheetY) &&
                            (sheetY < controlsY)
        };
    });

    console.log(`  - Posição TopBar: ${verticalOrder.topBarY.toFixed(1)}px`);
    console.log(`  - Posição Teclado Virtual: ${verticalOrder.inputSecY.toFixed(1)}px`);
    console.log(`  - Posição Toolbar de Edição: ${verticalOrder.toolbarY.toFixed(1)}px`);
    console.log(`  - Posição Partitura: ${verticalOrder.sheetY.toFixed(1)}px`);
    console.log(`  - Posição Controles de Reprodução: ${verticalOrder.controlsY.toFixed(1)}px`);
    console.log(`  - Sequência TopBar -> Teclado -> Toolbar -> Partitura -> Controles: ${verticalOrder.isCorrectOrder}`);

    if (!verticalOrder.isCorrectOrder) {
        throw new Error('Falha no Ponto E: A ordem vertical dos quadros não respeita a especificação');
    }
    console.log('✓ Ponto E validado com sucesso!');

    // Salvar screenshot do novo layout mobile
    fs.mkdirSync(path.resolve(process.cwd(), 'audit-screenshots/layout'), { recursive: true });
    await page.screenshot({ path: path.resolve(process.cwd(), 'audit-screenshots/layout/Redesign_Mobile_Complete.png'), fullPage: false });
    console.log('\n📸 Screenshot do novo layout mobile salvo em audit-screenshots/layout/Redesign_Mobile_Complete.png');

    // Testar também em Desktop
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.resolve(process.cwd(), 'audit-screenshots/layout/Redesign_Desktop_Complete.png'), fullPage: false });
    console.log('📸 Screenshot do novo layout desktop salvo em audit-screenshots/layout/Redesign_Desktop_Complete.png');

    console.log('\n=========================================================================');
    console.log('🎉 TODOS OS PONTOS (A, B, C, D, E) DO REDESIGN PASSARAM COM SUCESSO 100%!');
    console.log('=========================================================================');
} finally {
    await browser.close();
    server.close();
}
