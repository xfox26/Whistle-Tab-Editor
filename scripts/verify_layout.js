import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from '../server/api.js';

console.log('--- 📱 [AUTOMATED LAYOUT & RESPONSIVENESS VERIFICATION] ---');

const PORT = 3899;
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
console.log(`[Layout Test] Servidor de auditoria ativo em http://localhost:${PORT}`);

const chromePath = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : '/usr/bin/chromium';
const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
});

const viewports = [
    { name: 'Mobile_SE_375x667', width: 375, height: 667, category: 'Mobile Compact' },
    { name: 'Mobile_iPhone14_390x844', width: 390, height: 844, category: 'Mobile Modern' },
    { name: 'Mobile_Pixel_412x915', width: 412, height: 915, category: 'Mobile Large' },
    { name: 'Tablet_iPad_768x1024', width: 768, height: 1024, category: 'Tablet' },
    { name: 'Desktop_Laptop_1280x800', width: 1280, height: 800, category: 'Desktop' }
];

const SCREENSHOT_DIR = path.join(PUBLIC_DIR, 'audit-screenshots', 'layout');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let allPassed = true;
const summary = [];

try {
    for (const vp of viewports) {
        console.log(`\n🔍 Verificando layout em [${vp.category}] ${vp.name} (${vp.width}x${vp.height})...`);
        const page = await browser.newPage();
        await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
        await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle2', timeout: 15000 });

        // Aguarda renderização da partitura
        await page.waitForSelector('#tab-sheet', { timeout: 8000 });

        // Auditoria de Layout e Transbordamento Horizontal
        const audit = await page.evaluate((width, height) => {
            const docWidth = document.documentElement.scrollWidth;
            const bodyWidth = document.body.scrollWidth;
            const hasDocOverflow = docWidth > width || bodyWidth > width;

            // Busca elementos que transbordam da tela (desconsiderando scrollbars internas de partitura/drawer)
            const overflowing = [];
            const allElements = Array.from(document.querySelectorAll('*'));
            for (const el of allElements) {
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) continue;
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden') continue;

                if (rect.right > width + 2) {
                    let parent = el.parentElement;
                    let hasLegitScroll = false;
                    while (parent && parent !== document.body) {
                        const pStyle = window.getComputedStyle(parent);
                        if (pStyle.overflowX === 'auto' || pStyle.overflowX === 'scroll') {
                            hasLegitScroll = true;
                            break;
                        }
                        parent = parent.parentElement;
                    }
                    if (hasLegitScroll) continue;

                    const id = el.id ? `#${el.id}` : '';
                    const cls = el.className && typeof el.className === 'string' ? `.${el.className.split(' ').filter(Boolean).slice(0, 2).join('.')}` : '';
                    overflowing.push({
                        tag: el.tagName.toLowerCase(),
                        selector: `${el.tagName.toLowerCase()}${id}${cls}`,
                        right: Math.round(rect.right),
                        overflow: Math.round(rect.right - width)
                    });
                }
            }

            // Checagem de componentes vitais
            const nav = document.querySelector('.app-mode-nav');
            const navRect = nav ? nav.getBoundingClientRect() : null;
            const navFits = navRect ? navRect.right <= width + 2 : false;

            const tabSheet = document.querySelector('#tab-sheet');
            const sheetExists = Boolean(tabSheet);

            const notesRendered = document.querySelectorAll('.note-card, .whistle-svg').length > 0;

            return {
                docWidth,
                hasDocOverflow,
                overflowingElements: overflowing.slice(0, 5),
                navFits,
                sheetExists,
                notesRendered
            };
        }, vp.width, vp.height);

        // Tirar screenshot de evidência
        const screenshotPath = path.join(SCREENSHOT_DIR, `${vp.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        const viewportPassed = !audit.hasDocOverflow && audit.navFits && audit.sheetExists;
        if (!viewportPassed) {
            allPassed = false;
            console.error(`❌ FALHA de layout em ${vp.name}:`);
            if (audit.hasDocOverflow) console.error(`   - Transbordamento horizontal detectado: docWidth=${audit.docWidth}px vs viewport=${vp.width}px`);
            if (audit.overflowingElements.length > 0) {
                console.error(`   - Elementos transbordando:`, audit.overflowingElements);
            }
            if (!audit.navFits) console.error(`   - Barra superior (.app-mode-nav) extrapolou largura da janela.`);
            if (!audit.sheetExists) console.error(`   - Área de partitura (#tab-sheet) não renderizada.`);
        } else {
            console.log(`✓ Layout aprovado (Zero overflow, Barra de navegação ajustada, Partitura renderizada). Screenshot salvo: ${path.relative(PUBLIC_DIR, screenshotPath)}`);
        }

        summary.push({
            name: vp.name,
            passed: viewportPassed,
            docWidth: audit.docWidth,
            vpWidth: vp.width
        });

        await page.close();
    }
} finally {
    await browser.close();
    server.close();
}

console.log('\n=======================================================');
if (allPassed) {
    console.log('🎉 SUCESSO: Todos os testes de layout e responsividade foram aprovados sem quebras!');
    console.log('=======================================================\n');
    process.exit(0);
} else {
    console.error('❌ FALHA: Foram detectadas quebras de layout em um ou mais viewports!');
    console.error('=======================================================\n');
    process.exit(1);
}
