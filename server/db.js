/**
 * Gerenciador de Banco de Dados da Plataforma Comunitária Tin Whistle Live
 * Utiliza SQLite nativo (node:sqlite) quando disponível, com fallback automático
 * para armazenamento JSON estruturado caso a versão do Node não tenha SQLite embutido.
 */

import fs from 'node:fs';
import path from 'node:path';

// Determina o diretório de dados persistentes:
// 1. /var/data/tinwhistle (produção na VPS)
// 2. ./data (desenvolvimento local)
const PROD_DATA_DIR = '/var/data/tinwhistle';
const LOCAL_DATA_DIR = path.resolve(process.cwd(), 'data');

export const DATA_DIR = fs.existsSync(PROD_DATA_DIR) ? PROD_DATA_DIR : LOCAL_DATA_DIR;
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
        console.warn('Aviso: Não foi possível criar pasta de dados em:', DATA_DIR, e.message);
    }
}

const DB_PATH = path.join(DATA_DIR, 'tinwhistle.db');
const JSON_BACKUP_PATH = path.join(DATA_DIR, 'tunes.json');

let dbDriver = 'unknown';
let sqliteDb = null;
let jsonStore = [];

// Inicialização da camada de dados
try {
    const { DatabaseSync } = await import('node:sqlite');
    sqliteDb = new DatabaseSync(DB_PATH);
    dbDriver = 'sqlite';
    console.log(`[DB] Banco de dados SQLite ativo em: ${DB_PATH}`);

    // Criação das tabelas e índices
    sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS tunes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            artist TEXT DEFAULT 'Tradicional',
            key TEXT NOT NULL DEFAULT 'D',
            tempo INTEGER NOT NULL DEFAULT 110,
            time_signature TEXT DEFAULT '4/4',
            category TEXT DEFAULT 'celtic',
            difficulty TEXT DEFAULT 'iniciante',
            rhythm TEXT DEFAULT 'reel',
            notes_json TEXT NOT NULL,
            author_name TEXT DEFAULT 'Anônimo',
            likes INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_tunes_created ON tunes(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_tunes_likes ON tunes(likes DESC);
        CREATE INDEX IF NOT EXISTS idx_tunes_key ON tunes(key);
        CREATE INDEX IF NOT EXISTS idx_tunes_category ON tunes(category);

        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL,
            display_name TEXT NOT NULL,
            recovery_phrase TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    `);

    // Migrações seguras de colunas em tunes (caso não existam ainda)
    try { sqliteDb.exec(`ALTER TABLE tunes ADD COLUMN user_id TEXT DEFAULT NULL;`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE tunes ADD COLUMN is_public INTEGER DEFAULT 1;`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE tunes ADD COLUMN parent_id TEXT DEFAULT NULL;`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE tunes ADD COLUMN parent_author TEXT DEFAULT NULL;`); } catch (e) {}
} catch (err) {
    dbDriver = 'json-fallback';
    console.warn('[DB] node:sqlite não disponível neste ambiente. Ativando fallback JSON em:', JSON_BACKUP_PATH);
    if (fs.existsSync(JSON_BACKUP_PATH)) {
        try {
            jsonStore = JSON.parse(fs.readFileSync(JSON_BACKUP_PATH, 'utf8'));
        } catch (e) {
            jsonStore = [];
        }
    }
}

function persistJsonStore() {
    if (dbDriver === 'json-fallback') {
        try {
            fs.writeFileSync(JSON_BACKUP_PATH, JSON.stringify(jsonStore, null, 2), 'utf8');
        } catch (e) {
            console.error('[DB] Erro ao salvar tunes.json:', e);
        }
    }
}

/**
 * Salva uma nova música ou atualiza existente
 */
export function saveTune(tune) {
    const now = new Date().toISOString();
    const tuneToSave = {
        id: tune.id,
        title: (tune.title || 'Melodia Sem Título').slice(0, 120),
        artist: (tune.artist || 'Tradicional').slice(0, 100),
        key: (tune.key || 'D').slice(0, 10),
        tempo: parseInt(tune.tempo, 10) || 110,
        time_signature: (tune.time_signature || tune.timeSignature || '4/4').slice(0, 10),
        category: (tune.category || 'celtic').slice(0, 30),
        difficulty: (tune.difficulty || 'iniciante').slice(0, 30),
        rhythm: (tune.rhythm || 'reel').slice(0, 30),
        notes_json: typeof tune.notes === 'string' ? tune.notes : JSON.stringify(tune.notes || []),
        author_name: (tune.author_name || tune.author || 'Anônimo').slice(0, 60),
        likes: parseInt(tune.likes, 10) || 0,
        user_id: tune.user_id || null,
        is_public: tune.is_public !== undefined ? (tune.is_public ? 1 : 0) : 1,
        parent_id: tune.parent_id || null,
        parent_author: tune.parent_author || null,
        created_at: tune.created_at || now,
        updated_at: now
    };

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare(`
            INSERT INTO tunes (id, title, artist, key, tempo, time_signature, category, difficulty, rhythm, notes_json, author_name, likes, user_id, is_public, parent_id, parent_author, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                artist = excluded.artist,
                key = excluded.key,
                tempo = excluded.tempo,
                time_signature = excluded.time_signature,
                category = excluded.category,
                difficulty = excluded.difficulty,
                rhythm = excluded.rhythm,
                notes_json = excluded.notes_json,
                author_name = excluded.author_name,
                user_id = COALESCE(excluded.user_id, tunes.user_id),
                is_public = excluded.is_public,
                parent_id = excluded.parent_id,
                parent_author = excluded.parent_author,
                updated_at = excluded.updated_at
        `);
        stmt.run(
            tuneToSave.id,
            tuneToSave.title,
            tuneToSave.artist,
            tuneToSave.key,
            tuneToSave.tempo,
            tuneToSave.time_signature,
            tuneToSave.category,
            tuneToSave.difficulty,
            tuneToSave.rhythm,
            tuneToSave.notes_json,
            tuneToSave.author_name,
            tuneToSave.likes,
            tuneToSave.user_id,
            tuneToSave.is_public,
            tuneToSave.parent_id,
            tuneToSave.parent_author,
            tuneToSave.created_at,
            tuneToSave.updated_at
        );
    } else {
        const existingIdx = jsonStore.findIndex(t => t.id === tuneToSave.id);
        if (existingIdx !== -1) {
            jsonStore[existingIdx] = { ...jsonStore[existingIdx], ...tuneToSave };
        } else {
            jsonStore.push(tuneToSave);
        }
        persistJsonStore();
    }

    return getTuneById(tuneToSave.id);
}

/**
 * Busca uma música completa pelo ID (incluindo as notas)
 */
export function getTuneById(id) {
    if (!id) return null;

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare('SELECT * FROM tunes WHERE id = ?');
        const row = stmt.get(id);
        if (!row) return null;
        try {
            row.notes = JSON.parse(row.notes_json);
        } catch (e) {
            row.notes = [];
        }
        return row;
    } else {
        const found = jsonStore.find(t => t.id === id);
        if (!found) return null;
        const copy = { ...found };
        try {
            copy.notes = typeof copy.notes_json === 'string' ? JSON.parse(copy.notes_json) : (copy.notes || []);
        } catch (e) {
            copy.notes = [];
        }
        return copy;
    }
}

/**
 * Lista músicas da comunidade com filtros e busca rápida
 * (Retorna sem notes_json pesado para listagem leve)
 */
export function listTunes({ q = '', category = 'all', key = 'all', difficulty = 'all', sort = 'recent', limit = 50, offset = 0 } = {}) {
    const lim = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const off = Math.max(0, parseInt(offset, 10) || 0);
    const queryTerm = (q || '').toLowerCase().trim();

    if (dbDriver === 'sqlite') {
        const conditions = [];
        const params = [];

        // Apenas músicas públicas aparecem no catálogo comunitário
        conditions.push('(is_public IS NULL OR is_public = 1)');

        if (queryTerm) {
            conditions.push('(LOWER(title) LIKE ? OR LOWER(artist) LIKE ? OR LOWER(author_name) LIKE ?)');
            const wild = `%${queryTerm}%`;
            params.push(wild, wild, wild);
        }

        if (category && category !== 'all') {
            conditions.push('category = ?');
            params.push(category);
        }

        if (key && key !== 'all') {
            conditions.push('key = ?');
            params.push(key);
        }

        if (difficulty && difficulty !== 'all') {
            conditions.push('difficulty = ?');
            params.push(difficulty);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        let orderBy = 'created_at DESC';
        if (sort === 'popular') {
            orderBy = 'likes DESC, created_at DESC';
        } else if (sort === 'title') {
            orderBy = 'title ASC';
        }

        const countStmt = sqliteDb.prepare(`SELECT COUNT(*) as total FROM tunes ${whereClause}`);
        const total = countStmt.get(...params).total;

        const selectStmt = sqliteDb.prepare(`
            SELECT id, title, artist, key, tempo, time_signature, category, difficulty, rhythm, author_name, likes, is_public, parent_id, parent_author, created_at, updated_at
            FROM tunes
            ${whereClause}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `);
        const rows = selectStmt.all(...params, lim, off);

        return {
            total,
            limit: lim,
            offset: off,
            tunes: rows
        };
    } else {
        let results = jsonStore.filter(t => {
            const isPublic = t.is_public === undefined || t.is_public === 1;
            if (!isPublic) return false;

            const matchesQuery = !queryTerm || 
                (t.title && t.title.toLowerCase().includes(queryTerm)) ||
                (t.artist && t.artist.toLowerCase().includes(queryTerm)) ||
                (t.author_name && t.author_name.toLowerCase().includes(queryTerm));
            const matchesCat = (category === 'all' || t.category === category);
            const matchesKey = (key === 'all' || t.key === key);
            const matchesDiff = (difficulty === 'all' || t.difficulty === difficulty);
            return matchesQuery && matchesCat && matchesKey && matchesDiff;
        });

        if (sort === 'popular') {
            results.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        } else if (sort === 'title') {
            results.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } else {
            results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        const total = results.length;
        const paged = results.slice(off, off + lim).map(t => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            key: t.key,
            tempo: t.tempo,
            time_signature: t.time_signature,
            category: t.category,
            difficulty: t.difficulty,
            rhythm: t.rhythm,
            author_name: t.author_name,
            likes: t.likes || 0,
            created_at: t.created_at
        }));

        return {
            total,
            limit: lim,
            offset: off,
            tunes: paged
        };
    }
}

/**
 * Incrementa curtidas de uma música
 */
export function likeTune(id) {
    if (!id) return null;

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare('UPDATE tunes SET likes = likes + 1 WHERE id = ?');
        stmt.run(id);
        const getStmt = sqliteDb.prepare('SELECT id, likes FROM tunes WHERE id = ?');
        return getStmt.get(id);
    } else {
        const found = jsonStore.find(t => t.id === id);
        if (found) {
            found.likes = (found.likes || 0) + 1;
            persistJsonStore();
            return { id: found.id, likes: found.likes };
        }
        return null;
    }
}

/**
 * Retorna contagem total de músicas na comunidade
 */
export function countTunes() {
    if (dbDriver === 'sqlite') {
        const row = sqliteDb.prepare('SELECT COUNT(*) as total FROM tunes').get();
        return row.total;
    } else {
        return jsonStore.length;
    }
}

export function getDbDriver() {
    return dbDriver;
}

// ==========================================
// GERENCIAMENTO DE USUÁRIOS E AUTENTICAÇÃO
// ==========================================

const USERS_JSON_PATH = path.join(DATA_DIR, 'users.json');
const SESSIONS_JSON_PATH = path.join(DATA_DIR, 'sessions.json');
let usersJsonStore = [];
let sessionsJsonStore = [];

if (dbDriver === 'json-fallback') {
    try {
        if (fs.existsSync(USERS_JSON_PATH)) usersJsonStore = JSON.parse(fs.readFileSync(USERS_JSON_PATH, 'utf8'));
        if (fs.existsSync(SESSIONS_JSON_PATH)) sessionsJsonStore = JSON.parse(fs.readFileSync(SESSIONS_JSON_PATH, 'utf8'));
    } catch (e) {
        usersJsonStore = [];
        sessionsJsonStore = [];
    }
}

function persistUsersJson() {
    if (dbDriver === 'json-fallback') {
        try { fs.writeFileSync(USERS_JSON_PATH, JSON.stringify(usersJsonStore, null, 2), 'utf8'); } catch (e) {}
    }
}

function persistSessionsJson() {
    if (dbDriver === 'json-fallback') {
        try { fs.writeFileSync(SESSIONS_JSON_PATH, JSON.stringify(sessionsJsonStore, null, 2), 'utf8'); } catch (e) {}
    }
}

/**
 * Cria um novo bardo/usuário
 */
export function createUser({ id, username, passwordHash, passwordSalt, displayName, recoveryPhrase }) {
    const now = new Date().toISOString();
    const userToSave = {
        id,
        username: username.toLowerCase().trim(),
        password_hash: passwordHash,
        password_salt: passwordSalt,
        display_name: (displayName || username).trim().slice(0, 50),
        recovery_phrase: recoveryPhrase,
        created_at: now,
        updated_at: now
    };

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare(`
            INSERT INTO users (id, username, password_hash, password_salt, display_name, recovery_phrase, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
            userToSave.id,
            userToSave.username,
            userToSave.password_hash,
            userToSave.password_salt,
            userToSave.display_name,
            userToSave.recovery_phrase,
            userToSave.created_at,
            userToSave.updated_at
        );
    } else {
        const existing = usersJsonStore.find(u => u.username.toLowerCase() === userToSave.username);
        if (existing) {
            throw new Error('Nome de usuário já está em uso.');
        }
        usersJsonStore.push(userToSave);
        persistUsersJson();
    }

    return {
        id: userToSave.id,
        username: userToSave.username,
        display_name: userToSave.display_name,
        created_at: userToSave.created_at
    };
}

/**
 * Busca usuário por nome de usuário (para login)
 */
export function getUserByUsername(username) {
    if (!username) return null;
    const cleanUser = username.toLowerCase().trim();

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)');
        return stmt.get(cleanUser) || null;
    } else {
        return usersJsonStore.find(u => u.username.toLowerCase() === cleanUser) || null;
    }
}

/**
 * Busca usuário por ID
 */
export function getUserById(id) {
    if (!id) return null;

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare('SELECT id, username, display_name, created_at FROM users WHERE id = ?');
        return stmt.get(id) || null;
    } else {
        const u = usersJsonStore.find(user => user.id === id);
        if (!u) return null;
        return {
            id: u.id,
            username: u.username,
            display_name: u.display_name,
            created_at: u.created_at
        };
    }
}

/**
 * Atualiza perfil do usuário
 */
export function updateUserProfile(id, { displayName }) {
    if (!id) return null;
    const now = new Date().toISOString();
    const cleanName = (displayName || '').trim().slice(0, 50);

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare('UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?');
        stmt.run(cleanName, now, id);
        return getUserById(id);
    } else {
        const u = usersJsonStore.find(user => user.id === id);
        if (u) {
            u.display_name = cleanName;
            u.updated_at = now;
            persistUsersJson();
            return { id: u.id, username: u.username, display_name: u.display_name, created_at: u.created_at };
        }
        return null;
    }
}

/**
 * Cria uma sessão para o usuário
 */
export function createSession({ id, userId, token, expiresAt }) {
    const now = new Date().toISOString();

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare(`
            INSERT INTO sessions (id, user_id, token, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(id, userId, token, expiresAt, now);
    } else {
        sessionsJsonStore.push({ id, user_id: userId, token, expires_at: expiresAt, created_at: now });
        persistSessionsJson();
    }
}

/**
 * Recupera sessão válida com dados do usuário
 */
export function getSession(token) {
    if (!token) return null;
    const now = Date.now();

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare(`
            SELECT s.token, s.expires_at, u.id, u.username, u.display_name, u.created_at
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > ?
        `);
        const row = stmt.get(token, now);
        if (!row) return null;
        return {
            token: row.token,
            expiresAt: row.expires_at,
            user: {
                id: row.id,
                username: row.username,
                displayName: row.display_name,
                createdAt: row.created_at
            }
        };
    } else {
        const s = sessionsJsonStore.find(sess => sess.token === token && sess.expires_at > now);
        if (!s) return null;
        const u = usersJsonStore.find(user => user.id === s.user_id);
        if (!u) return null;
        return {
            token: s.token,
            expiresAt: s.expires_at,
            user: {
                id: u.id,
                username: u.username,
                displayName: u.display_name,
                createdAt: u.created_at
            }
        };
    }
}

/**
 * Deleta uma sessão (Logout)
 */
export function deleteSession(token) {
    if (!token) return;

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare('DELETE FROM sessions WHERE token = ?');
        stmt.run(token);
    } else {
        sessionsJsonStore = sessionsJsonStore.filter(s => s.token !== token);
        persistSessionsJson();
    }
}

/**
 * Estatísticas do bardo (total de músicas criadas e likes recebidos)
 */
export function getUserStats(userId) {
    if (!userId) return { tunesCount: 0, totalLikes: 0 };

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare(`
            SELECT COUNT(*) as tunes_count, COALESCE(SUM(likes), 0) as total_likes
            FROM tunes
            WHERE user_id = ?
        `);
        const row = stmt.get(userId);
        return {
            tunesCount: row ? row.tunes_count : 0,
            totalLikes: row ? row.total_likes : 0
        };
    } else {
        const userTunes = jsonStore.filter(t => t.user_id === userId);
        const totalLikes = userTunes.reduce((sum, t) => sum + (t.likes || 0), 0);
        return {
            tunesCount: userTunes.length,
            totalLikes
        };
    }
}

// ==========================================
// NUVEM PESSOAL DO USUÁRIO (FASE 8.2 - ETAPA 2)
// ==========================================

/**
 * Lista todas as músicas de um usuário específico (privadas e públicas)
 */
export function listUserTunes(userId) {
    if (!userId) return [];

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare(`
            SELECT id, title, artist, key, tempo, time_signature, category, difficulty, rhythm, author_name, likes, is_public, parent_id, parent_author, created_at, updated_at
            FROM tunes
            WHERE user_id = ?
            ORDER BY updated_at DESC, created_at DESC
        `);
        return stmt.all(userId);
    } else {
        return jsonStore
            .filter(t => t.user_id === userId)
            .map(t => ({
                id: t.id,
                title: t.title,
                artist: t.artist,
                key: t.key,
                tempo: t.tempo,
                time_signature: t.time_signature,
                category: t.category,
                difficulty: t.difficulty,
                rhythm: t.rhythm,
                author_name: t.author_name,
                likes: t.likes || 0,
                is_public: t.is_public !== undefined ? t.is_public : 1,
                parent_id: t.parent_id || null,
                parent_author: t.parent_author || null,
                created_at: t.created_at,
                updated_at: t.updated_at
            }))
            .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
    }
}

/**
 * Atualiza uma música existente garantindo que pertence ao autor
 */
export function updateUserTune(tuneId, userId, data) {
    if (!tuneId || !userId) return null;
    const now = new Date().toISOString();

    const current = getTuneById(tuneId);
    if (!current || current.user_id !== userId) {
        return null; // Não encontrado ou não pertence a este usuário
    }

    const title = (data.title || current.title).slice(0, 120);
    const artist = (data.artist || current.artist).slice(0, 100);
    const key = (data.key || current.key).slice(0, 10);
    const tempo = parseInt(data.tempo, 10) || current.tempo;
    const time_signature = (data.time_signature || data.timeSignature || current.time_signature).slice(0, 10);
    const category = (data.category || current.category).slice(0, 30);
    const difficulty = (data.difficulty || current.difficulty).slice(0, 30);
    const rhythm = (data.rhythm || current.rhythm).slice(0, 30);
    const notes_json = data.notes 
        ? (typeof data.notes === 'string' ? data.notes : JSON.stringify(data.notes)) 
        : current.notes_json;
    const is_public = data.is_public !== undefined ? (data.is_public ? 1 : 0) : current.is_public;

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare(`
            UPDATE tunes
            SET title = ?, artist = ?, key = ?, tempo = ?, time_signature = ?, category = ?, difficulty = ?, rhythm = ?, notes_json = ?, is_public = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        `);
        stmt.run(title, artist, key, tempo, time_signature, category, difficulty, rhythm, notes_json, is_public, now, tuneId, userId);
    } else {
        const idx = jsonStore.findIndex(t => t.id === tuneId && t.user_id === userId);
        if (idx !== -1) {
            jsonStore[idx] = {
                ...jsonStore[idx],
                title, artist, key, tempo, time_signature, category, difficulty, rhythm, notes_json, is_public,
                updated_at: now
            };
            persistJsonStore();
        }
    }

    return getTuneById(tuneId);
}

/**
 * Altera a visibilidade da música (privada ou pública)
 */
export function updateTuneVisibility(tuneId, userId, isPublic) {
    if (!tuneId || !userId) return null;
    const now = new Date().toISOString();
    const pubVal = isPublic ? 1 : 0;

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare(`
            UPDATE tunes
            SET is_public = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        `);
        const result = stmt.run(pubVal, now, tuneId, userId);
        if (result.changes === 0) return null;
    } else {
        const found = jsonStore.find(t => t.id === tuneId && t.user_id === userId);
        if (!found) return null;
        found.is_public = pubVal;
        found.updated_at = now;
        persistJsonStore();
    }

    return getTuneById(tuneId);
}

/**
 * Remove uma música da nuvem do usuário
 */
export function deleteTune(tuneId, userId) {
    if (!tuneId || !userId) return false;

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare('DELETE FROM tunes WHERE id = ? AND user_id = ?');
        const result = stmt.run(tuneId, userId);
        return result.changes > 0;
    } else {
        const initialLen = jsonStore.length;
        jsonStore = jsonStore.filter(t => !(t.id === tuneId && t.user_id === userId));
        if (jsonStore.length !== initialLen) {
            persistJsonStore();
            return true;
        }
        return false;
    }
}


