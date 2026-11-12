/**
 * Servidor HTTP do Tin Whistle Live
 * Porta padrão: 3000 (ou configurável via process.env.PORT)
 * Responde pela API REST (/api/*) e serve arquivos estáticos como fallback.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from './server/api.js';

const PORT = parseInt(process.env.PORT, 10) || 3000;
const PUBLIC_DIR = path.resolve(process.cwd());

const PUBLIC_EXACT_FILES = new Set([
    '/index.html',
    '/app.js',
    '/repertoire.js',
    '/styles.css',
    '/manifest.webmanifest',
    '/sw.js',
    '/favicon.svg',
    '/robots.txt'
]);

const PUBLIC_PREFIXES = ['/css/', '/src/', '/icons/'];

const BLOCKED_PREFIXES = [
    '/server/',
    '/data/',
    '/scripts/',
    '/node_modules/',
    '/audit-screenshots/',
    '/.git/',
    '/.github/'
];

const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=(self)'
};

const HTML_CSP = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    "connect-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'"
].join('; ');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.wav': 'audio/wav',
    '.mid': 'audio/midi',
    '.midi': 'audio/midi'
};

function isPublicAssetPath(pathname) {
    if (!pathname || pathname.includes('\0')) return false;
    const segments = pathname.split('/').filter(Boolean);
    if (segments.some(seg => seg.startsWith('.') || seg === '..')) return false;
    if (BLOCKED_PREFIXES.some(prefix => pathname.startsWith(prefix))) return false;
    if (PUBLIC_EXACT_FILES.has(pathname)) return true;
    return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

const server = http.createServer(async (req, res) => {
    // 1. Tentar responder pela API REST (/api/*)
    const handledByApi = await handleApiRequest(req, res);
    if (handledByApi) return;

    // 2. Servir arquivos estáticos estritamente da allowlist pública
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
        res.end('Method Not Allowed');
        return;
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
        res.end('Bad Request');
        return;
    }

    let reqPath = '/';
    try {
        reqPath = decodeURIComponent(parsedUrl.pathname || '/');
    } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
        res.end('Bad Request');
        return;
    }

    let safePath = path.posix.normalize(reqPath);
    if (safePath === '/' || safePath === '') {
        safePath = '/index.html';
    }

    const segments = safePath.split('/').filter(Boolean);
    const hasDotSegment = segments.some(seg => seg.startsWith('.') || seg === '..');
    const isBlockedPrefix = BLOCKED_PREFIXES.some(prefix => safePath.startsWith(prefix) || `${safePath}/` === prefix);

    if (hasDotSegment || isBlockedPrefix) {
        res.writeHead(403, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
        res.end('Forbidden');
        return;
    }

    const serveIndexHtml = () => {
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        fs.readFile(indexPath, (indexErr, content) => {
            if (indexErr) {
                res.writeHead(404, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
                res.end('404 Not Found');
            } else {
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'no-cache',
                    'Content-Security-Policy': HTML_CSP,
                    ...SECURITY_HEADERS
                });
                res.end(req.method === 'HEAD' ? undefined : content);
            }
        });
    };

    if (!isPublicAssetPath(safePath)) {
        // Caminhos com extensão explícita (ex.: .db, .json, .js, .service, .html) fora da allowlist nunca caem no SPA
        if (path.posix.extname(safePath)) {
            res.writeHead(403, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
            res.end('Forbidden');
            return;
        }
        serveIndexHtml();
        return;
    }

    const filePath = path.resolve(PUBLIC_DIR, `.${safePath}`);

    // Evitar acesso fora da pasta pública (garantindo delimitador path.sep)
    if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
        res.writeHead(403, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            if (path.extname(filePath)) {
                res.writeHead(404, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
                res.end('404 Not Found');
            } else {
                serveIndexHtml();
            }
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const headers = {
            'Content-Type': contentType,
            'Content-Length': stats.size,
            'Cache-Control': ext === '.html' || safePath === '/sw.js' ? 'no-cache' : 'public, max-age=86400',
            ...SECURITY_HEADERS
        };
        if (ext === '.html') {
            headers['Content-Security-Policy'] = HTML_CSP;
        }

        res.writeHead(200, headers);
        if (req.method === 'HEAD') {
            res.end();
            return;
        }

        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Tin Whistle Live] Servidor rodando em http://localhost:${PORT}`);
    console.log(`[Tin Whistle Live] API REST pronta em http://localhost:${PORT}/api/`);
});

// Encerramento gracioso
const shutdown = () => {
    console.log('\n[Tin Whistle Live] Encerrando servidor...');
    server.close(() => {
        console.log('[Tin Whistle Live] Servidor finalizado.');
        process.exit(0);
    });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
