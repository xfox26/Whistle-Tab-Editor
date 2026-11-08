/**
 * Roteador da API RESTful do Tin Whistle Live
 * Processa requisições /api/ com tratamento seguro de JSON, CORS e validação.
 */

import crypto from 'node:crypto';
import { saveTune, getTuneById, listTunes, likeTune, countTunes, getDbDriver } from './db.js';

// Gera um ID curto e amigável de 8 caracteres alfanuméricos (ex: 'k8F2pQxM')
function generateShortId() {
    return crypto.randomBytes(6).toString('base64url').slice(0, 8);
}

// Utilitário para enviar respostas JSON
function sendJSON(res, statusCode, data) {
    const payload = JSON.stringify(data);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-cache'
    });
    res.end(payload);
}

// Leitor assíncrono de corpo de requisição POST com limite de 1 MB
function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1024 * 1024) { // Limite de 1MB para proteger contra abusos
                req.destroy();
                reject(new Error('Payload muito grande (máximo 1MB)'));
            }
        });
        req.on('end', () => {
            if (!body) return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch (err) {
                reject(new Error('JSON inválido'));
            }
        });
        req.on('error', reject);
    });
}

/**
 * Manipulador principal de requisições da API
 * Retorna true se a requisição foi tratada pela API, false se não for rota /api/
 */
export async function handleApiRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // Resposta padrão para pre-flight CORS
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end();
        return true;
    }

    // 1. Healthcheck: GET /api/health
    if (req.method === 'GET' && pathname === '/api/health') {
        sendJSON(res, 200, {
            status: 'ok',
            service: 'Tin Whistle Live API',
            version: '1.0.0',
            driver: getDbDriver(),
            tunesCount: countTunes(),
            timestamp: new Date().toISOString()
        });
        return true;
    }

    // 2. Listar músicas da comunidade: GET /api/tunes
    if (req.method === 'GET' && pathname === '/api/tunes') {
        const q = url.searchParams.get('q') || '';
        const category = url.searchParams.get('category') || 'all';
        const key = url.searchParams.get('key') || 'all';
        const difficulty = url.searchParams.get('difficulty') || 'all';
        const sort = url.searchParams.get('sort') || 'recent';
        const limit = parseInt(url.searchParams.get('limit'), 10) || 50;
        const offset = parseInt(url.searchParams.get('offset'), 10) || 0;

        try {
            const data = listTunes({ q, category, key, difficulty, sort, limit, offset });
            sendJSON(res, 200, data);
        } catch (err) {
            console.error('[API] Erro ao listar músicas:', err);
            sendJSON(res, 500, { error: 'Falha ao buscar músicas' });
        }
        return true;
    }

    // 3. Curtir música: POST /api/tunes/:id/like
    const likeMatch = pathname.match(/^\/api\/tunes\/([a-zA-Z0-9_-]+)\/like$/);
    if (req.method === 'POST' && likeMatch) {
        const id = likeMatch[1];
        const result = likeTune(id);
        if (!result) {
            sendJSON(res, 404, { error: 'Música não encontrada' });
        } else {
            sendJSON(res, 200, { success: true, id, likes: result.likes });
        }
        return true;
    }

    // 4. Obter música completa: GET /api/tunes/:id
    const tuneMatch = pathname.match(/^\/api\/tunes\/([a-zA-Z0-9_-]+)$/);
    if (req.method === 'GET' && tuneMatch) {
        const id = tuneMatch[1];
        const tune = getTuneById(id);
        if (!tune) {
            sendJSON(res, 404, { error: 'Música não encontrada' });
        } else {
            sendJSON(res, 200, tune);
        }
        return true;
    }

    // 5. Compartilhar / Criar música na comunidade: POST /api/tunes
    if (req.method === 'POST' && pathname === '/api/tunes') {
        try {
            const body = await readJsonBody(req);

            if (!body.title || typeof body.title !== 'string') {
                sendJSON(res, 400, { error: 'O título da música é obrigatório' });
                return true;
            }

            if (!Array.isArray(body.notes) && typeof body.notes !== 'string') {
                sendJSON(res, 400, { error: 'A tablatura (notas) é obrigatória' });
                return true;
            }

            const newTune = {
                id: body.id && /^[a-zA-Z0-9_-]{4,20}$/.test(body.id) ? body.id : generateShortId(),
                title: body.title.trim(),
                artist: (body.artist || 'Tradicional').trim(),
                key: (body.key || 'D').toUpperCase().trim(),
                tempo: Math.min(280, Math.max(40, parseInt(body.tempo, 10) || 110)),
                time_signature: body.time_signature || body.timeSignature || '4/4',
                category: body.category || 'celtic',
                difficulty: body.difficulty || 'iniciante',
                rhythm: body.rhythm || 'reel',
                notes: body.notes,
                author_name: (body.author_name || body.author || 'Bardo Viajante').trim()
            };

            const saved = saveTune(newTune);
            const host = req.headers.host || 'tinwhistle.live';
            const protocol = req.headers['x-forwarded-proto'] || 'https';
            const shareUrl = `${protocol}://${host}/?tune=${saved.id}`;

            sendJSON(res, 201, {
                success: true,
                id: saved.id,
                shareUrl,
                tune: saved
            });
        } catch (err) {
            console.error('[API] Erro ao salvar música:', err);
            sendJSON(res, 400, { error: err.message || 'Dados inválidos' });
        }
        return true;
    }

    // Se começou com /api/ mas não bateu nenhuma rota
    if (pathname.startsWith('/api/')) {
        sendJSON(res, 404, { error: 'Rota da API não encontrada' });
        return true;
    }

    return false;
}
