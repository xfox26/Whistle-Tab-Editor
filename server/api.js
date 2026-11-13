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
    getUserForRecovery,
    updateUserProfile,
    updateUserPassword,
    createSession,
    getSession,
    deleteSession,
    deleteSessionsByUserId,
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
        const idx = crypto.randomInt(0, BARD_WORDS.length);
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

function normalizeRecoveryPhrase(phrase) {
    return String(phrase || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function hashRecoveryPhrase(phrase) {
    const normalized = normalizeRecoveryPhrase(phrase);
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(normalized, salt, 32).toString('hex');
    return `scrypt$${salt}$${hash}`;
}

function verifyRecoveryPhrase(inputPhrase, storedValue) {
    try {
        const normalizedInput = normalizeRecoveryPhrase(inputPhrase);
        const stored = String(storedValue || '');
        if (!normalizedInput || !stored) return false;

        if (stored.startsWith('scrypt$')) {
            const parts = stored.split('$');
            if (parts.length !== 3) return false;
            const [, salt, expectedHash] = parts;
            const testHash = crypto.scryptSync(normalizedInput, salt, 32).toString('hex');
            return crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(testHash, 'hex'));
        }

        // Compatibilidade com contas antigas cuja frase foi salva em texto simples
        const normalizedStored = normalizeRecoveryPhrase(stored);
        const inputDigest = crypto.createHash('sha256').update(normalizedInput).digest();
        const storedDigest = crypto.createHash('sha256').update(normalizedStored).digest();
        return crypto.timingSafeEqual(inputDigest, storedDigest);
    } catch (e) {
        return false;
    }
}

// Gera um ID curto e amigável de 8 caracteres alfanuméricos (ex: 'k8F2pQxM')
function generateShortId(length = 8) {
    return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

const AUDIO_DATA_URL_REGEX = /^data:audio\/(webm|ogg|mp4|mpeg|wav|aac)(?:;[a-z0-9=.+-]+)*;base64,[A-Za-z0-9+/=]+$/i;
function isValidAudioDataUrl(val) {
    return typeof val === 'string' && val.length <= 950 * 1024 && AUDIO_DATA_URL_REGEX.test(val);
}

const API_SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
};

function getCorsHeaders(req) {
    const origin = req?.headers?.origin;
    if (!origin) return {};

    const host = req.headers.host || '';
    const isSameHostOrigin = host && (origin === `https://${host}` || origin === `http://${host}`);
    const isProductionOrigin = origin === 'https://tinwhistle.live' || origin === 'https://www.tinwhistle.live';
    const isLocalDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);

    if (isSameHostOrigin || isProductionOrigin || isLocalDevOrigin) {
        return {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Vary': 'Origin'
        };
    }

    return { 'Vary': 'Origin' };
}

// Rate limiter simples em memória por IP para rotas sensíveis de autenticação
const authRateStore = new Map();
function checkAuthRateLimit(req, bucket, windowMs, maxExternal, maxLocal) {
    const forwarded = req.headers['x-forwarded-for'];
    const rawIp = typeof forwarded === 'string' && forwarded.length > 0
        ? forwarded.split(',')[0].trim()
        : (req.socket?.remoteAddress || 'unknown');
    const isLoopback = rawIp === '127.0.0.1' || rawIp === '::1' || rawIp === '::ffff:127.0.0.1';
    const limit = isLoopback ? maxLocal : maxExternal;
    const key = `${bucket}:${rawIp}`;
    const now = Date.now();

    if (authRateStore.size > 2000) {
        for (const [k, entry] of authRateStore.entries()) {
            if (entry.resetAt <= now) authRateStore.delete(k);
        }
    }

    const current = authRateStore.get(key);
    if (!current || current.resetAt <= now) {
        authRateStore.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true };
    }

    current.count += 1;
    if (current.count > limit) {
        const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
        return { allowed: false, retryAfterSec };
    }
    return { allowed: true };
}

function isSecureRequest(req) {
    const xfProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
    return xfProto === 'https' || Boolean(req?.socket?.encrypted);
}

// Utilitário para enviar respostas JSON com cabeçalhos opcionais (ex: Set-Cookie)
function sendJSON(res, statusCode, data, extraHeaders = {}, req = null) {
    const payload = JSON.stringify(data);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload),
        'Cache-Control': 'no-store',
        ...API_SECURITY_HEADERS,
        ...getCorsHeaders(req),
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
function createSessionCookieHeader(token, req = null) {
    const maxAge = 30 * 24 * 60 * 60; // 30 dias em segundos
    const secureFlag = isSecureRequest(req) ? '; Secure' : '';
    return `tinwhistle_session=${token}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly${secureFlag}`;
}

function createClearCookieHeader(req = null) {
    const secureFlag = isSecureRequest(req) ? '; Secure' : '';
    return `tinwhistle_session=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${secureFlag}`;
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

const API_MESSAGES = {
    unauthorized: {
        pt: 'Não autorizado. Faça login primeiro.',
        en: 'Unauthorized. Please sign in first.',
        es: 'No autorizado. Inicie sesión primero.'
    },
    notFound: {
        pt: 'Rota da API não encontrada',
        en: 'API endpoint not found',
        es: 'Ruta de la API no encontrada'
    },
    tuneNotFound: {
        pt: 'Música não encontrada',
        en: 'Tune not found',
        es: 'Melodía no encontrada'
    },
    invalidJson: {
        pt: 'JSON inválido',
        en: 'Invalid JSON payload',
        es: 'JSON no válido'
    }
};

export function getClientLanguage(req) {
    const raw = (req.headers && req.headers['accept-language'] ? req.headers['accept-language'] : '').toLowerCase();
    if (raw.startsWith('pt')) return 'pt';
    if (raw.startsWith('es')) return 'es';
    return 'en';
}

export function getApiMessage(key, lang = 'en') {
    const entry = API_MESSAGES[key];
    if (!entry) return key;
    return entry[lang] || entry['en'] || key;
}

/**
 * Manipulador principal de requisições da API
 * Retorna true se a requisição foi tratada pela API, false se não for rota /api/
 */
export async function handleApiRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const reply = (statusCode, data, extraHeaders = {}) => sendJSON(res, statusCode, data, extraHeaders, req);

    // Resposta padrão para pre-flight CORS apenas para origens confiáveis
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            ...API_SECURITY_HEADERS,
            ...getCorsHeaders(req)
        });
        res.end();
        return true;
    }

    // Identifica o usuário logado (se houver)
    const currentSession = extractSessionFromRequest(req);
    const currentUser = currentSession ? currentSession.user : null;

    const buildShareUrl = (tuneId) => {
        const host = req.headers.host || 'tinwhistle.live';
        const rawProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
        const protocol = rawProto === 'http' || rawProto === 'https'
            ? rawProto
            : (req.socket?.encrypted ? 'https' : (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https'));
        return `${protocol}://${host}/?tune=${encodeURIComponent(tuneId)}`;
    };

    // 1. Healthcheck: GET /api/health
    if (req.method === 'GET' && pathname === '/api/health') {
        reply(200, {
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
        const rate = checkAuthRateLimit(req, 'register', 60 * 60 * 1000, 15, 60);
        if (!rate.allowed) {
            reply(429, { error: 'Muitas tentativas de cadastro. Tente novamente mais tarde.' }, { 'Retry-After': String(rate.retryAfterSec) });
            return true;
        }
        try {
            const body = await readJsonBody(req);
            const username = (body.username || '').trim();
            const password = body.password || '';
            const displayName = (body.displayName || body.display_name || username).trim();

            if (!username || !/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
                reply(400, { error: 'Nome de usuário deve ter entre 3 e 24 caracteres alfanuméricos (letras, números ou _).' });
                return true;
            }

            if (!password || password.length < 6) {
                reply(400, { error: 'A senha deve ter no mínimo 6 caracteres.' });
                return true;
            }

            if (displayName.length < 2 || displayName.length > 40) {
                reply(400, { error: 'Nome do bardo deve ter entre 2 e 40 caracteres.' });
                return true;
            }

            // Verifica se usuário já existe
            const existing = getUserByUsername(username);
            if (existing) {
                reply(409, { error: 'Este nome de usuário já está sendo usado por outro bardo.' });
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
                recoveryPhrase: hashRecoveryPhrase(recoveryPhrase)
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

            reply(201, {
                success: true,
                user: newUser,
                token,
                recoveryPhrase,
                stats: { tunesCount: 0, totalLikes: 0 }
            }, {
                'Set-Cookie': createSessionCookieHeader(token, req)
            });
        } catch (err) {
            console.error('[Auth Register]', err);
            reply(500, { error: err.message || 'Falha ao registrar novo bardo' });
        }
        return true;
    }

    // POST /api/auth/login (Login)
    if (req.method === 'POST' && pathname === '/api/auth/login') {
        const rate = checkAuthRateLimit(req, 'login', 15 * 60 * 1000, 20, 60);
        if (!rate.allowed) {
            reply(429, { error: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' }, { 'Retry-After': String(rate.retryAfterSec) });
            return true;
        }
        try {
            const body = await readJsonBody(req);
            const username = (body.username || '').trim();
            const password = body.password || '';

            if (!username || !password) {
                reply(400, { error: 'Informe usuário e senha para entrar.' });
                return true;
            }

            const dbUser = getUserByUsername(username);
            if (!dbUser || !verifyPassword(password, dbUser.password_hash, dbUser.password_salt)) {
                reply(401, { error: 'Usuário ou senha incorretos.' });
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

            reply(200, {
                success: true,
                user: userProfile,
                token,
                stats
            }, {
                'Set-Cookie': createSessionCookieHeader(token, req)
            });
        } catch (err) {
            console.error('[Auth Login]', err);
            reply(500, { error: 'Falha ao autenticar usuário' });
        }
        return true;
    }

    // POST /api/auth/reset-password (Redefinir senha com frase de recuperação)
    if (req.method === 'POST' && pathname === '/api/auth/reset-password') {
        const rate = checkAuthRateLimit(req, 'reset-password', 15 * 60 * 1000, 10, 60);
        if (!rate.allowed) {
            reply(429, { error: 'Muitas tentativas de recuperação. Aguarde alguns minutos e tente novamente.' }, { 'Retry-After': String(rate.retryAfterSec) });
            return true;
        }
        try {
            const body = await readJsonBody(req);
            const username = (body.username || '').trim();
            const recoveryPhrase = normalizeRecoveryPhrase(body.recoveryPhrase || body.recovery_phrase || '');
            const newPassword = body.newPassword || body.new_password || '';

            if (!username || !recoveryPhrase || !newPassword) {
                reply(400, { error: 'Informe usuário, frase de recuperação e nova senha.' });
                return true;
            }

            if (newPassword.length < 6) {
                reply(400, { error: 'A nova senha deve ter no mínimo 6 caracteres.' });
                return true;
            }

            const dbUser = getUserForRecovery(username);
            if (!dbUser || !verifyRecoveryPhrase(recoveryPhrase, dbUser.recovery_phrase)) {
                reply(401, { error: 'Usuário ou frase de recuperação inválidos.' });
                return true;
            }

            const { hash, salt } = hashPassword(newPassword);
            updateUserPassword(dbUser.id, { passwordHash: hash, passwordSalt: salt });
            deleteSessionsByUserId(dbUser.id);

            reply(200, { success: true });
        } catch (err) {
            console.error('[Auth Reset Password]', err);
            reply(500, { error: 'Falha ao redefinir senha.' });
        }
        return true;
    }

    // POST /api/auth/logout (Sair)
    if (req.method === 'POST' && pathname === '/api/auth/logout') {
        if (currentSession) {
            deleteSession(currentSession.token);
        }
        reply(200, { success: true }, {
            'Set-Cookie': createClearCookieHeader(req)
        });
        return true;
    }

    // GET /api/auth/me (Verifica usuário logado atual)
    if (req.method === 'GET' && pathname === '/api/auth/me') {
        if (!currentUser) {
            reply(200, { user: null });
            return true;
        }

        const stats = getUserStats(currentUser.id);
        reply(200, {
            user: currentUser,
            stats
        });
        return true;
    }

    // PUT /api/auth/profile (Atualiza nome de exibição)
    if (req.method === 'PUT' && pathname === '/api/auth/profile') {
        if (!currentUser) {
            reply(401, { error: 'Não autorizado. Faça login primeiro.' });
            return true;
        }

        try {
            const body = await readJsonBody(req);
            const displayName = (body.displayName || body.display_name || '').trim();

            if (displayName.length < 2 || displayName.length > 40) {
                reply(400, { error: 'Nome do bardo deve ter entre 2 e 40 caracteres.' });
                return true;
            }

            const updated = updateUserProfile(currentUser.id, { displayName });
            const stats = getUserStats(currentUser.id);

            reply(200, {
                success: true,
                user: updated,
                stats
            });
        } catch (err) {
            reply(500, { error: 'Falha ao atualizar perfil' });
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
            reply(200, data);
        } catch (err) {
            console.error('[API] Erro ao listar músicas:', err);
            reply(500, { error: 'Falha ao buscar músicas' });
        }
        return true;
    }

    // 2.1. Listar minhas músicas da nuvem pessoal: GET /api/my-tunes
    if (req.method === 'GET' && pathname === '/api/my-tunes') {
        if (!currentUser) {
            reply(401, { error: 'Não autorizado. Faça login para acessar suas músicas na nuvem.' });
            return true;
        }

        try {
            const tunes = listUserTunes(currentUser.id);
            reply(200, { success: true, count: tunes.length, tunes });
        } catch (err) {
            console.error('[API] Erro ao listar músicas do usuário:', err);
            reply(500, { error: 'Falha ao buscar suas músicas na nuvem.' });
        }
        return true;
    }

    // 3.0. Buscar músicas curtidas pelo usuário logado: GET /api/user/likes
    if (req.method === 'GET' && pathname === '/api/user/likes') {
        if (!currentUser) {
            reply(200, { success: true, likedTuneIds: [] });
            return true;
        }
        try {
            const likedTuneIds = getUserLikedTuneIds(currentUser.id);
            reply(200, { success: true, likedTuneIds });
        } catch (err) {
            console.error('[API] Erro ao buscar curtidas do usuário:', err);
            reply(500, { error: 'Falha ao buscar curtidas.' });
        }
        return true;
    }

    // 3. Curtir / Descurtir música (1 like por usuário): POST /api/tunes/:id/like
    const likeMatch = pathname.match(/^\/api\/tunes\/([a-zA-Z0-9_-]+)\/like$/);
    if (req.method === 'POST' && likeMatch) {
        if (!currentUser) {
            reply(401, { error: 'É necessário entrar na guilda para curtir uma partitura.' });
            return true;
        }

        const id = likeMatch[1];
        try {
            const result = toggleTuneLike(id, currentUser.id);
            if (!result) {
                reply(404, { error: 'Música não encontrada.' });
            } else {
                reply(200, { success: true, id, liked: result.liked, likes: result.likes });
            }
        } catch (err) {
            console.error('[API] Erro ao alternar curtida:', err);
            reply(500, { error: 'Falha ao processar curtida.' });
        }
        return true;
    }

    // 3.1. Alternar visibilidade pública/privada: POST /api/tunes/:id/visibility
    const visibilityMatch = pathname.match(/^\/api\/tunes\/([a-zA-Z0-9_-]+)\/visibility$/);
    if (req.method === 'POST' && visibilityMatch) {
        if (!currentUser) {
            reply(401, { error: 'Não autorizado. Faça login primeiro.' });
            return true;
        }

        const id = visibilityMatch[1];
        try {
            const tune = getTuneById(id);
            if (!tune) {
                reply(404, { error: 'Música não encontrada' });
                return true;
            }
            if (tune.is_curated) {
                reply(403, { error: 'Partituras do acervo curado são protegidas.' });
                return true;
            }
            const isOwner = Boolean(tune.user_id && currentUser.id === tune.user_id);
            if (!currentUser.isAdmin && !isOwner) {
                reply(403, { error: 'Não autorizado. Apenas o autor ou administrador pode alterar esta melodia.' });
                return true;
            }

            const body = await readJsonBody(req);
            const isPublic = Boolean(body.is_public !== undefined ? body.is_public : true);
            const updated = updateTuneVisibility(id, currentUser.id, isPublic, Boolean(currentUser.isAdmin));
            if (!updated) {
                reply(403, { error: 'Não foi possível alterar a visibilidade.' });
            } else {
                reply(200, { 
                    success: true, 
                    id: updated.id, 
                    is_public: updated.is_public, 
                    shareUrl: buildShareUrl(updated.id),
                    message: updated.is_public ? 'Música publicada na comunidade!' : 'Música alterada para rascunho privado.'
                });
            }
        } catch (err) {
            reply(500, { error: err.message || 'Erro ao alterar visibilidade' });
        }
        return true;
    }

    // 4. Obter música completa: GET /api/tunes/:id
    const tuneMatch = pathname.match(/^\/api\/tunes\/([a-zA-Z0-9_-]+)$/);
    if (req.method === 'GET' && tuneMatch) {
        const id = tuneMatch[1];
        const tune = getTuneById(id);
        if (!tune) {
            reply(404, { error: 'Música não encontrada' });
            return true;
        }

        // Se for privada e o visitante não for o autor (ou admin)
        if (tune.is_public === 0 && (!currentUser || (currentUser.id !== tune.user_id && !currentUser.isAdmin))) {
            reply(403, { error: 'Esta melodia é um rascunho privado do autor.' });
            return true;
        }

        reply(200, tune);
        return true;
    }

    // 4.1. Atualizar música existente do autor: PUT /api/tunes/:id
    if (req.method === 'PUT' && tuneMatch) {
        if (!currentUser) {
            reply(401, { error: 'Não autorizado. Faça login primeiro.' });
            return true;
        }

        const id = tuneMatch[1];
        try {
            const tune = getTuneById(id);
            if (!tune) {
                reply(404, { error: 'Música não encontrada' });
                return true;
            }
            if (tune.is_curated) {
                reply(403, { error: 'Partituras do acervo curado são protegidas.' });
                return true;
            }
            const isOwner = Boolean(tune.user_id && currentUser.id === tune.user_id);
            if (!currentUser.isAdmin && !isOwner) {
                reply(403, { error: 'Não autorizado. Apenas o autor ou administrador pode alterar esta música.' });
                return true;
            }

            const body = await readJsonBody(req);
            const rawAudioDemo = body.audio_demo !== undefined ? body.audio_demo : body.audioDemo;
            if (rawAudioDemo && !isValidAudioDataUrl(rawAudioDemo)) {
                reply(400, { error: 'Formato ou tamanho de áudio de demonstração inválido.' });
                return true;
            }

            const updated = updateUserTune(id, currentUser.id, body, Boolean(currentUser.isAdmin));
            if (!updated) {
                reply(403, { error: 'Não foi possível atualizar a música.' });
            } else {
                reply(200, { 
                    success: true, 
                    id: updated.id, 
                    shareUrl: buildShareUrl(updated.id),
                    tune: updated 
                });
            }
        } catch (err) {
            reply(500, { error: err.message || 'Erro ao atualizar música.' });
        }
        return true;
    }

    // 4.2. Deletar música da nuvem ou da comunidade (Autor ou Admin)
    if (req.method === 'DELETE' && tuneMatch) {
        if (!currentUser) {
            reply(401, { error: 'Não autorizado. Faça login primeiro.' });
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
            reply(403, { error: 'Música não encontrada ou você não tem permissão para excluí-la.' });
        } else {
            reply(200, { 
                success: true, 
                message: currentUser.isAdmin ? 'Música removida pelo administrador com sucesso.' : 'Música removida da nuvem com sucesso.' 
            });
        }
        return true;
    }

    // 4.3. Listar usuários cadastrados (Admin): GET /api/admin/users
    if (req.method === 'GET' && pathname === '/api/admin/users') {
        if (!currentUser || !currentUser.isAdmin) {
            reply(403, { error: 'Acesso restrito a administradores da guilda.' });
            return true;
        }

        const users = listAllUsers(currentUser.id);
        reply(200, { success: true, count: users.length, users });
        return true;
    }

    // 4.4. Deletar usuário abusivo (Admin): DELETE /api/admin/users/:id
    const userAdminMatch = pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_-]+)$/);
    if (req.method === 'DELETE' && userAdminMatch) {
        if (!currentUser || !currentUser.isAdmin) {
            reply(403, { error: 'Acesso restrito a administradores da guilda.' });
            return true;
        }

        const targetId = userAdminMatch[1];
        const ok = deleteUserByAdmin(targetId, currentUser.id);
        if (!ok) {
            reply(400, { error: 'Não foi possível excluir o usuário (ou você tentou excluir a sua própria conta de administrador).' });
        } else {
            reply(200, { success: true, message: 'Usuário e todas as suas músicas foram removidos com sucesso.' });
        }
        return true;
    }

    // 5. Compartilhar / Criar música na comunidade: POST /api/tunes
    if (req.method === 'POST' && pathname === '/api/tunes') {
        try {
            const body = await readJsonBody(req);

            if (!body.title || typeof body.title !== 'string') {
                reply(400, { error: 'O título da música é obrigatório' });
                return true;
            }

            if (!Array.isArray(body.notes) && typeof body.notes !== 'string') {
                reply(400, { error: 'A tablatura (notas) é obrigatória' });
                return true;
            }

            const rawAudioDemo = body.audio_demo || body.audioDemo || null;
            if (rawAudioDemo && !isValidAudioDataUrl(rawAudioDemo)) {
                reply(400, { error: 'Formato ou tamanho de áudio de demonstração inválido.' });
                return true;
            }

            const requestedId = body.id && /^[a-zA-Z0-9_-]{4,40}$/.test(body.id) ? body.id : null;
            if (requestedId) {
                const existing = getTuneById(requestedId);
                if (existing) {
                    if (existing.is_curated) {
                        reply(403, { error: 'Partituras do acervo curado são protegidas.' });
                        return true;
                    }
                    const isOwner = Boolean(existing.user_id && currentUser && currentUser.id === existing.user_id);
                    if (!currentUser || (!currentUser.isAdmin && !isOwner)) {
                        reply(409, { error: 'Este ID de partitura já pertence a outro registro.' });
                        return true;
                    }
                }
            }

            const authorName = currentUser 
                ? (currentUser.displayName || currentUser.username) 
                : (body.author_name || body.author || 'Bardo Viajante').trim();

            const newTune = {
                id: requestedId || generateShortId(),
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
                audio_demo: rawAudioDemo,
                accompaniment: body.accompaniment || body.backingSettings || null
            };

            const saved = saveTune(newTune);

            reply(201, {
                success: true,
                id: saved.id,
                shareUrl: buildShareUrl(saved.id),
                tune: saved
            });
        } catch (err) {
            console.error('[API] Erro ao salvar música:', err);
            reply(400, { error: err.message || 'Dados inválidos' });
        }
        return true;
    }

    // 5.1. Salvar ou remover Demonstração em Áudio Real (30s): POST/DELETE /api/tunes/:id/demo
    const demoMatch = pathname.match(/^\/api\/tunes\/([a-zA-Z0-9_-]+)\/demo$/);
    if (demoMatch) {
        if (!currentUser) {
            reply(401, { error: 'Não autorizado. Faça login para gerenciar demonstrações de áudio.' });
            return true;
        }

        const tuneId = demoMatch[1];
        if (req.method === 'POST') {
            try {
                const body = await readJsonBody(req);
                const audioDemo = body.audio_demo || body.audioDemo;
                if (!audioDemo) {
                    reply(400, { error: 'Áudio de demonstração não fornecido.' });
                    return true;
                }
                if (!isValidAudioDataUrl(audioDemo)) {
                    reply(400, { error: 'Formato inválido. Envie apenas áudio WebM/OGG/MP4/MPEG/WAV em Base64 (máx. 950KB).' });
                    return true;
                }
                const updated = updateUserTune(tuneId, currentUser.id, { audio_demo: audioDemo }, Boolean(currentUser.isAdmin));
                if (!updated) {
                    reply(403, { error: 'Música não encontrada ou você não tem permissão para adicionar a demonstração.' });
                } else {
                    reply(200, { success: true, message: 'Demonstração de áudio salva com sucesso!', tune: updated });
                }
            } catch (err) {
                reply(500, { error: err.message || 'Erro ao salvar áudio.' });
            }
            return true;
        }

        if (req.method === 'DELETE') {
            const updated = updateUserTune(tuneId, currentUser.id, { audio_demo: null }, Boolean(currentUser.isAdmin));
            if (!updated) {
                reply(403, { error: 'Música não encontrada ou você não tem permissão para alterar esta demonstração.' });
            } else {
                reply(200, { success: true, message: 'Demonstração em áudio removida com sucesso.', tune: updated });
            }
            return true;
        }
    }

    // Se começou com /api/ mas não bateu nenhuma rota
    if (pathname.startsWith('/api/')) {
        reply(404, { error: getApiMessage('notFound', getClientLanguage(req)) });
        return true;
    }

    return false;
}
