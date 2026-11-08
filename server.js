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
const PUBLIC_DIR = process.cwd();

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

const server = http.createServer(async (req, res) => {
    // 1. Tentar responder pela API REST (/api/*)
    const handledByApi = await handleApiRequest(req, res);
    if (handledByApi) return;

    // 2. Servir arquivos estáticos (fallback para desenvolvimento e teste)
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let safePath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '') {
        safePath = '/index.html';
    }

    const filePath = path.join(PUBLIC_DIR, safePath);

    // Evitar acesso fora da pasta pública
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Em rotas não encontradas de SPA, serve o index.html
            const indexPath = path.join(PUBLIC_DIR, 'index.html');
            fs.readFile(indexPath, (indexErr, content) => {
                if (indexErr) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('404 Not Found');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(content);
                }
            });
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': stats.size,
            'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400'
        });

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
