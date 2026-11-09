/**
 * Roteador da API RESTful do Tin Whistle Live
 * Processa requisições /api/ com tratamento seguro de JSON, CORS e validação.
 */

import crypto from 'node:crypto';
import { 
    saveTune, 
    getTuneById, 
    listTunes, 
    likeTune, 
    toggleTuneLike,
    getUserLikedTuneIds,
    countTunes, 
    getDbDriver,
    createUser,
    getUserByUsername,
    getUserById,
    updateUserProfile,
    createSession,
    getSession,
    deleteSession,
    getUserStats,
    listUserTunes,
    updateUserTune,
    updateTuneVisibility,
    deleteTune,
    deleteTuneByAdmin,
    listAllUsers,
    deleteUserByAdmin,
    isAdminUser
} from './db.js';

// Lista de palavras temáticas para geração de frase mnemônica de recuperação
const BARD_WORDS = [
    'flauta', 'bardo', 'harpa', 'celta', 'colina', 'brisa', 'orvalho', 'riacho',
    'carvalho', 'pedra', 'shamrock', 'trevo', 'reel', 'jig', 'polka', 'gaita',
    'apito', 'sol', 'lua', 'estrela', 'bosque', 'vento', 'eco', 'cancao',
    'viagem', 'espada', 'escudo', 'nevoa', 'castelo', 'montanha', 'valente', 'chama'
];

function generateRecoveryPhrase() {
    const selected = [];
    const usedIndices = new Set();
    while (selected.length < 8) {
        const idx = Math.floor(Math.random() * BARD_WORDS.length);
        if (!usedIndices.has(idx)) {
            usedIndices.add(idx);
            selected.push(BARD_WORDS[idx]);
        }
    }
    return selected.join(' ');
}

// Criptografia de senhas usando node:crypto scryptSync (seguro e nativo)
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { hash, salt };
}

function verifyPassword(password, hash, salt) {
    try {
        const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
    } catch (e) {
        return false;
    }
}

// Gera um ID curto e amigável de 8 caracteres alfanuméricos (ex: 'k8F2pQxM')
function generateShortId(length = 8) {
    return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

// Utilitário para enviar respostas JSON com cabeçalhos opcionais (ex: Set-Cookie)
function sendJSON(res, statusCode, data, extraHeaders = {}) {
    const payload = JSON.stringify(data);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-cache',
        ...extraHeaders
    });
    res.end(payload);
}

// Extrai sessão do usuário a partir dos Cookies ou do Header Authorization
function extractSessionFromRequest(req) {
    // 1. Tenta header Authorization: Bearer <token>
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        const sess = getSession(token);
        if (sess) return sess;
    }

    // 2. Tenta cookie tinwhistle_session
    const cookieHeader = req.headers['cookie'];
    if (cookieHeader) {
        const match = cookieHeader.match(/(?:^|;\s*)tinwhistle_session=([a-zA-Z0-9_-]+)/);
        if (match) {
            const token = match[1];
            const sess = getSession(token);
            if (sess) return sess;
        }
    }

    return null;
}

// Gera cookie de sessão seguro para 30 dias
function createSessionCookieHeader(token) {
    const maxAge = 30 * 24 * 60 * 60; // 30 dias em segundos
    return `tinwhistle_session=${token}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly`;
}

function createClearCookieHeader() {
    return `tinwhistle_session=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`;
}

// Leitor assíncrono de corpo de requisição POST/PUT com limite de 1 MB
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
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true'
        });
        res.end();
        return true;
    }

    // Identifica o usuário logado (se houver)
    const currentSession = extractSessionFromRequest(req);
    const currentUser = currentSession ? currentSession.user : null;

    // 1. Healthcheck: GET /api/health
    if (req.method === 'GET' && pathname === '/api/health') {
        sendJSON(res, 200, {
            status: 'ok',
            service: 'Tin Whistle Live API',
            version: '1.1.0',
            driver: getDbDriver(),
            tunesCount: countTunes(),
            timestamp: new Date().toISOString()
        });
        return true;
    }

    // ==========================================
    // ROTAS DE AUTENTICAÇÃO E PERFIL (/api/auth)
    // ==========================================

    // POST /api/auth/register (Cadastro minimalista)
    if (req.method === 'POST' && pathname === '/api/auth/register') {
        try {
            const body = await readJsonBody(req);
            const username = (body.username || '').trim();
            const password = body.password || '';
            const displayName = (body.displayName || body.display_name || username).trim();

            if (!username || !/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
                sendJSON(res, 400, { error: 'Nome de usuário deve ter entre 3 e 24 caracteres alfanuméricos (letras, números ou _).' });
                return true;
            }

            if (!password || password.length < 6) {
                sendJSON(res, 400, { error: 'A senha deve ter no mínimo 6 caracteres.' });
                return true;
            }

            if (displayName.length < 2 || displayName.length > 40) {
                sendJSON(res, 400, { error: 'Nome do bardo deve ter entre 2 e 40 caracteres.' });
                return true;
            }

            // Verifica se usuário já existe
            const existing = getUserByUsername(username);
            if (existing) {
                sendJSON(res, 409, { error: 'Este nome de usuário já está sendo usado por outro bardo.' });
                return true;
            }

            const { hash, salt } = hashPassword(password);
            const userId = 'usr_' + generateShortId(10);
            const recoveryPhrase = generateRecoveryPhrase();

            const newUser = createUser({
                id: userId,
                username,
                passwordHash: hash,
                passwordSalt: salt,
                displayName,
                recoveryPhrase
            });

            // Cria sessão automática ao cadastrar
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 dias
            createSession({
                id: 'ses_' + generateShortId(10),
                userId: newUser.id,
                token,
                expiresAt
            });

            sendJSON(res, 201, {
                success: true,
                user: newUser,
                token,
                recoveryPhrase,
                stats: { tunesCount: 0, totalLikes: 0 }
            }, {
                'Set-Cookie': createSessionCookieHeader(token)
            });
        } catch (err) {
            console.error('[Auth Register]', err);
            sendJSON(res, 500, { error: err.message || 'Falha ao registrar novo bardo' });
        }
        return true;
    }

    // POST /api/auth/login (Login)
    if (req.method === 'POST' && pathname === '/api/auth/login') {
        try {
            const body = await readJsonBody(req);
            const username = (body.username || '').trim();
            const password = body.password || '';

            if (!username || !password) {
                sendJSON(res, 400, { error: 'Informe usuário e senha para entrar.' });
                return true;
            }

            const dbUser = getUserByUsername(username);
            if (!dbUser || !verifyPassword(password, dbUser.password_hash, dbUser.password_salt)) {
                sendJSON(res, 401, { error: 'Usuário ou senha incorretos.' });
                return true;
            }

            // Cria sessão de 30 dias
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
            createSession({
                id: 'ses_' + generateShortId(10),
                userId: dbUser.id,
                token,
                expiresAt
            });

            const userProfile = {
                id: dbUser.id,
                username: dbUser.username,
                displayName: dbUser.display_name,
                display_name: dbUser.display_name,
                isAdmin: Boolean(dbUser.is_admin),
                is_admin: dbUser.is_admin || 0,
                createdAt: dbUser.created_at
            };

            const stats = getUserStats(dbUser.id);

            sendJSON(res, 200, {
                success: true,
                user: userProfile,
                token,
                stats
            }, {
                'Set-Cookie': createSessionCookieHeader(token)
            });
        } catch (err) {
            console.error('[Auth Login]', err);
            sendJSON(res, 500, { error: 'Falha ao autenticar usuário' });
        }
        return true;
    }

    // POST /api/auth/logout (Sair)
    if (req.method === 'POST' && pathname === '/api/auth/logout') {
        if (currentSession) {
            deleteSession(currentSession.token);
        }
        sendJSON(res, 200, { success: true }, {
            'Set-Cookie': createClearCookieHeader()
        });
        return true;
    }

    // GET /api/auth/me (Verifica usuário logado atual)
    if (req.method === 'GET' && pathname === '/api/auth/me') {
        if (!currentUser) {
            sendJSON(res, 200, { user: null });
            return true;
        }

        const stats = getUserStats(currentUser.id);
        sendJSON(res, 200, {
            user: currentUser,
            stats
        });
        return true;
    }

    // PUT /api/auth/profile (Atualiza nome de exibição)
    if (req.method === 'PUT' && pathname === '/api/auth/profile') {
        if (!currentUser) {
            sendJSON(res, 401, { error: 'Não autorizado. Faça login primeiro.' });
            return true;
        }

        try {
            const body = await readJsonBody(req);
            const displayName = (body.displayName || body.display_name || '').trim();

            if (displayName.length < 2 || displayName.length > 40) {
                sendJSON(res, 400, { error: 'Nome do bardo deve ter entre 2 e 40 caracteres.' });
                return true;
            }

            const updated = updateUserProfile(currentUser.id, { displayName });
            const stats = getUserStats(currentUser.id);

            sendJSON(res, 200, {
                success: true,
                user: updated,
                stats
            });
        } catch (err) {
            sendJSON(res, 500, { error: 'Falha ao atualizar perfil' });
        }
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

    // 2.1. Listar minhas músicas da nuvem pessoal: GET /api/my-tunes
    if (req.method === 'GET' && pathname === '/api/my-tunes') {
        if (!currentUser) {
            sendJSON(res, 401, { error: 'Não autorizado. Faça login para acessar suas músicas na nuvem.' });
            return true;
        }

        try {
            const tunes = listUserTunes(currentUser.id);
            sendJSON(res, 200, { success: true, count: tunes.length, tunes });
        } catch (err) {
            console.error('[API] Erro ao listar músicas do usuário:', err);
            sendJSON(res, 500, { error: 'Falha ao buscar suas músicas na nuvem.' });
        }
        return true;
    }

    // 3.0. Buscar músicas curtidas pelo usuário logado: GET /api/user/likes
    if (req.method === 'GET' && pathname === '/api/user/likes') {
        if (!currentUser) {
            sendJSON(res, 200, { success: true, likedTuneIds: [] });
            return true;
        }
        try {
            const likedTuneIds = getUserLikedTuneIds(currentUser.id);
            sendJSON(res, 200, { success: true, likedTuneIds });
        } catch (err) {
            console.error('[API] Erro ao buscar curtidas do usuário:', err);
            sendJSON(res, 500, { error: 'Falha ao buscar curtidas.' });
        }
        return true;
    }

    // 3. Curtir / Descurtir música (1 like por usuário): POST /api/tunes/:id/like
    const likeMatch = pathname.match(/^\/api\/tunes\/([a-zA-Z0-9_-]+)\/like$/);
    if (req.method === 'POST' && likeMatch) {
        if (!currentUser) {
            sendJSON(res, 401, { error: 'É necessário entrar na guilda para curtir uma partitura.' });
            return true;
        }

        const id = likeMatch[1];
        try {
            const result = toggleTuneLike(id, currentUser.id);
            if (!result) {
                sendJSON(res, 404, { error: 'Música não encontrada.' });
            } else {
                sendJSON(res, 200, { success: true, id, liked: result.liked, likes: result.likes });
            }
        } catch (err) {
            console.error('[API] Erro ao alternar curtida:', err);
            sendJSON(res, 500, { error: 'Falha ao processar curtida.' });
        }
        return true;
    }

    // 3.1. Alternar visibilidade pública/privada: POST /api/tunes/:id/visibility
    const visibilityMatch = pathname.match(/^\/api\/tunes\/([a-zA-Z0-9_-]+)\/visibility$/);
    if (req.method === 'POST' && visibilityMatch) {
        if (!currentUser) {
            sendJSON(res, 401, { error: 'Não autorizado. Faça login primeiro.' });
            return true;
        }

        const id = visibilityMatch[1];
        try {
            const body = await readJsonBody(req);
            const isPublic = Boolean(body.is_public !== undefined ? body.is_public : true);
            const updated = updateTuneVisibility(id, currentUser.id, isPublic);
            if (!updated) {
                sendJSON(res, 403, { error: 'Música não encontrada ou você não tem permissão para alterá-la.' });
            } else {
                const host = req.headers.host || 'tinwhistle.live';
                const protocol = req.headers['x-forwarded-proto'] || 'https';
                const shareUrl = `${protocol}://${host}/?tune=${updated.id}`;
                sendJSON(res, 200, { 
                    success: true, 
                    id: updated.id, 
                    is_public: updated.is_public, 
                    shareUrl,
                    message: updated.is_public ? 'Música publicada na comunidade!' : 'Música alterada para rascunho privado.'
                });
            }
        } catch (err) {
            sendJSON(res, 500, { error: err.message || 'Erro ao alterar visibilidade' });
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
            return true;
        }

        // Se for privada e o visitante não for o autor
        if (tune.is_public === 0 && (!currentUser || currentUser.id !== tune.user_id)) {
            sendJSON(res, 403, { error: 'Esta melodia é um rascunho privado do autor.' });
            return true;
        }

        sendJSON(res, 200, tune);
        return true;
    }

    // 4.1. Atualizar música existente do autor: PUT /api/tunes/:id
    if (req.method === 'PUT' && tuneMatch) {
        if (!currentUser) {
            sendJSON(res, 401, { error: 'Não autorizado. Faça login para editar suas músicas.' });
            return true;
        }

        const id = tuneMatch[1];
        try {
            const body = await readJsonBody(req);
            const updated = updateUserTune(id, currentUser.id, body);
            if (!updated) {
                sendJSON(res, 403, { error: 'Música não encontrada ou você não tem permissão para editá-la.' });
            } else {
                const host = req.headers.host || 'tinwhistle.live';
                const protocol = req.headers['x-forwarded-proto'] || 'https';
                const shareUrl = `${protocol}://${host}/?tune=${updated.id}`;
                sendJSON(res, 200, { 
                    success: true, 
                    id: updated.id, 
                    shareUrl,
                    tune: updated 
                });
            }
        } catch (err) {
            sendJSON(res, 500, { error: err.message || 'Erro ao atualizar música.' });
        }
        return true;
    }

    // 4.2. Deletar música da nuvem ou da comunidade (Autor ou Admin)
    if (req.method === 'DELETE' && tuneMatch) {
        if (!currentUser) {
            sendJSON(res, 401, { error: 'Não autorizado. Faça login primeiro.' });
            return true;
        }

        const id = tuneMatch[1];
        let deleted = false;
        if (currentUser.isAdmin) {
            deleted = deleteTuneByAdmin(id, currentUser.id);
        } else {
            deleted = deleteTune(id, currentUser.id);
        }

        if (!deleted) {
            sendJSON(res, 403, { error: 'Música não encontrada ou você não tem permissão para excluí-la.' });
        } else {
            sendJSON(res, 200, { 
                success: true, 
                message: currentUser.isAdmin ? 'Música removida pelo administrador com sucesso.' : 'Música removida da nuvem com sucesso.' 
            });
        }
        return true;
    }

    // 4.3. Listar usuários cadastrados (Admin): GET /api/admin/users
    if (req.method === 'GET' && pathname === '/api/admin/users') {
        if (!currentUser || !currentUser.isAdmin) {
            sendJSON(res, 403, { error: 'Acesso restrito a administradores da guilda.' });
            return true;
        }

        const users = listAllUsers(currentUser.id);
        sendJSON(res, 200, { success: true, count: users.length, users });
        return true;
    }

    // 4.4. Deletar usuário abusivo (Admin): DELETE /api/admin/users/:id
    const userAdminMatch = pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_-]+)$/);
    if (req.method === 'DELETE' && userAdminMatch) {
        if (!currentUser || !currentUser.isAdmin) {
            sendJSON(res, 403, { error: 'Acesso restrito a administradores da guilda.' });
            return true;
        }

        const targetId = userAdminMatch[1];
        const ok = deleteUserByAdmin(targetId, currentUser.id);
        if (!ok) {
            sendJSON(res, 400, { error: 'Não foi possível excluir o usuário (ou você tentou excluir a sua própria conta de administrador).' });
        } else {
            sendJSON(res, 200, { success: true, message: 'Usuário e todas as suas músicas foram removidos com sucesso.' });
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

            const authorName = currentUser 
                ? (currentUser.displayName || currentUser.username) 
                : (body.author_name || body.author || 'Bardo Viajante').trim();

            const newTune = {
                id: body.id && /^[a-zA-Z0-9_-]{4,40}$/.test(body.id) ? body.id : generateShortId(),
                title: body.title.trim(),
                artist: (body.artist || 'Tradicional').trim(),
                key: (body.key || 'D').toUpperCase().trim(),
                tempo: Math.min(280, Math.max(40, parseInt(body.tempo, 10) || 110)),
                time_signature: body.time_signature || body.timeSignature || '4/4',
                category: body.category || 'celtic',
                difficulty: body.difficulty || 'iniciante',
                rhythm: body.rhythm || 'reel',
                notes: body.notes,
                author_name: authorName,
                user_id: currentUser ? currentUser.id : null,
                is_public: body.is_public !== undefined ? (body.is_public ? 1 : 0) : 1,
                parent_id: body.parent_id || null,
                parent_author: body.parent_author || null,
                audio_demo: body.audio_demo || body.audioDemo || null
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

    // 5.1. Salvar ou remover Demonstração em Áudio Real (30s): POST/DELETE /api/tunes/:id/demo
    const demoMatch = pathname.match(/^\/api\/tunes\/([a-zA-Z0-9_-]+)\/demo$/);
    if (demoMatch) {
        if (!currentUser) {
            sendJSON(res, 401, { error: 'Não autorizado. Faça login para gerenciar demonstrações de áudio.' });
            return true;
        }

        const tuneId = demoMatch[1];
        if (req.method === 'POST') {
            try {
                const body = await readJsonBody(req);
                const audioDemo = body.audio_demo || body.audioDemo;
                if (!audioDemo) {
                    sendJSON(res, 400, { error: 'Áudio de demonstração não fornecido.' });
                    return true;
                }
                const updated = updateUserTune(tuneId, currentUser.id, { audio_demo: audioDemo });
                if (!updated) {
                    sendJSON(res, 403, { error: 'Música não encontrada ou você não tem permissão para adicionar a demonstração.' });
                } else {
                    sendJSON(res, 200, { success: true, message: 'Demonstração de áudio salva com sucesso!', tune: updated });
                }
            } catch (err) {
                sendJSON(res, 500, { error: err.message || 'Erro ao salvar áudio.' });
            }
            return true;
        }

        if (req.method === 'DELETE') {
            const updated = updateUserTune(tuneId, currentUser.id, { audio_demo: null });
            if (!updated) {
                sendJSON(res, 403, { error: 'Música não encontrada ou você não tem permissão para alterar esta demonstração.' });
            } else {
                sendJSON(res, 200, { success: true, message: 'Demonstração em áudio removida com sucesso.', tune: updated });
            }
            return true;
        }
    }

    // Se começou com /api/ mas não bateu nenhuma rota
    if (pathname.startsWith('/api/')) {
        sendJSON(res, 404, { error: 'Rota da API não encontrada' });
        return true;
    }

    return false;
}
