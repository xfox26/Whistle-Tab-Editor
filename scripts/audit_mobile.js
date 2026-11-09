import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from '../server/api.js';

// Servidor temporário de teste
const PORT = 3456;
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
console.log(`[Audit] Servidor temporário rodando em http://localhost:${PORT}`);

const chromePath = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : '/usr/bin/chromium';
const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
});

const viewports = [
    { name: 'iPhone SE (Pequeno)', width: 375, height: 667 },
    { name: 'iPhone 14 / Mobile Moderno', width: 390, height: 844 },
    { name: 'Android Grande / Pixel', width: 412, height: 915 },
    { name: 'iPad Vertical (Tablet)', width: 768, height: 1024 }
];

const results = [];

for (const vp of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle2' });

    // Avaliação no DOM
    const auditData = await page.evaluate((vpWidth, vpHeight) => {
        const issues = [];
        const docWidth = document.documentElement.scrollWidth;
        const bodyWidth = document.body.scrollWidth;
        const hasHorizontalOverflow = docWidth > vpWidth || bodyWidth > vpWidth;

        // Procurar elementos que extrapolam a largura da tela
        const allElements = Array.from(document.querySelectorAll('*'));
        const overflowingElements = [];

        for (const el of allElements) {
            const rect = el.getBoundingClientRect();
            // Ignorar elementos ocultos
            if (rect.width === 0 && rect.height === 0) continue;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') continue;

            if (rect.right > vpWidth + 2) {
                // Se o elemento estiver dentro de um container com rolagem horizontal intencional, não é defeito de layout
                let p = el.parentElement;
                let isLegitScroll = false;
                while (p && p !== document.body) {
                    const ps = window.getComputedStyle(p);
                    if (ps.overflowX === 'auto' || ps.overflowX === 'scroll') {
                        isLegitScroll = true;
                        break;
                    }
                    p = p.parentElement;
                }
                if (isLegitScroll) continue;

                const id = el.id ? `#${el.id}` : '';
                const cls = el.className && typeof el.className === 'string' ? `.${el.className.split(' ').filter(Boolean).slice(0, 2).join('.')}` : '';
                const tag = el.tagName.toLowerCase();
                overflowingElements.push({
                    selector: `${tag}${id}${cls}`,
                    right: Math.round(rect.right),
                    overflow: Math.round(rect.right - vpWidth),
                    text: (el.innerText || '').slice(0, 30).trim()
                });
            }
        }


        // Testar scroll container
        const scrollContainers = [
            { name: 'window', el: document.documentElement, maxScroll: document.documentElement.scrollHeight - window.innerHeight },
            { name: '.main-content', el: document.querySelector('.main-content'), maxScroll: document.querySelector('.main-content') ? document.querySelector('.main-content').scrollHeight - document.querySelector('.main-content').clientHeight : 0 }
        ];

        // Verificar tap targets < 40px
        const smallClickables = [];
        const clickables = Array.from(document.querySelectorAll('button, a, input, select, .btn, .note-btn'));
        for (const btn of clickables) {
            const r = btn.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && (r.width < 38 || r.height < 38)) {
                smallClickables.push({
                    text: (btn.innerText || btn.getAttribute('aria-label') || btn.title || btn.id || 'btn').slice(0, 20).trim(),
                    w: Math.round(r.width),
                    h: Math.round(r.height)
                });
            }
        }

        return {
            hasHorizontalOverflow,
            docWidth,
            overflowingCount: overflowingElements.length,
            overflowingSamples: overflowingElements.slice(0, 8),
            smallClickablesCount: smallClickables.length,
            smallClickablesSamples: smallClickables.slice(0, 5)
        };
    }, vp.width, vp.height);

    // Tirar screenshot
    fs.mkdirSync('./audit-screenshots', { recursive: true });
    const screenshotPath = `./audit-screenshots/${vp.name.replace(/[^a-z0-9]/gi, '_')}.png`;
    await page.screenshot({ path: screenshotPath });

    results.push({ viewport: vp, audit: auditData, screenshot: screenshotPath });
    await page.close();
}

await browser.close();
server.close();

console.log(JSON.stringify(results, null, 2));
