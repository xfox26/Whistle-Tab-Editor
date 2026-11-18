/**
 * Gerenciador de Banco de Dados da Plataforma Comunitária Tin Whistle Live
 * Utiliza SQLite nativo (node:sqlite) quando disponível, com fallback automático
 * para armazenamento JSON estruturado caso a versão do Node não tenha SQLite embutido.
 */

import fs from 'node:fs';
import path from 'node:path';
import { CURATED_REPERTOIRE } from '../repertoire.js';

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

        CREATE TABLE IF NOT EXISTS tune_likes (
            user_id TEXT NOT NULL,
            tune_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (user_id, tune_id)
        );
        CREATE INDEX IF NOT EXISTS idx_tune_likes_user ON tune_likes(user_id);
        CREATE INDEX IF NOT EXISTS idx_tune_likes_tune ON tune_likes(tune_id);
    `);

    // Migrações seguras de colunas em tunes e users
    try { sqliteDb.exec(`ALTER TABLE tunes ADD COLUMN user_id TEXT DEFAULT NULL;`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE tunes ADD COLUMN is_public INTEGER DEFAULT 1;`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE tunes ADD COLUMN is_curated INTEGER DEFAULT 0;`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE tunes ADD COLUMN parent_id TEXT DEFAULT NULL;`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE tunes ADD COLUMN parent_author TEXT DEFAULT NULL;`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE tunes ADD COLUMN audio_demo TEXT DEFAULT NULL;`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE tunes ADD COLUMN accompaniment_json TEXT DEFAULT NULL;`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE users ADD COLUMN suspended_until INTEGER DEFAULT NULL;`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE users ADD COLUMN ban_reason TEXT DEFAULT NULL;`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE tunes ADD COLUMN moderation_status TEXT DEFAULT 'active';`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE tunes ADD COLUMN moderation_reason TEXT DEFAULT NULL;`); } catch (e) {}

    sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS admin_audit_log (
            id TEXT PRIMARY KEY,
            admin_id TEXT NOT NULL,
            action TEXT NOT NULL,
            target_type TEXT NOT NULL,
            target_id TEXT,
            details_json TEXT,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at DESC);

        CREATE TABLE IF NOT EXISTS tune_reports (
            id TEXT PRIMARY KEY,
            tune_id TEXT NOT NULL,
            reporter_user_id TEXT,
            reason TEXT NOT NULL,
            details TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            resolved_at TEXT DEFAULT NULL,
            resolved_by TEXT DEFAULT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_tune_reports_status ON tune_reports(status, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_tune_reports_tune ON tune_reports(tune_id);
    `);

    // Índices compostos para contagens de remixes e listagem de músicas do usuário
    try { sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_tunes_parent_id ON tunes(parent_id);`); } catch (e) {}
    try { sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_tunes_user_updated ON tunes(user_id, updated_at DESC);`); } catch (e) {}
    try { sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_tunes_mod_status ON tunes(moderation_status);`); } catch (e) {}

    // Remove sessões expiradas no boot para evitar acúmulo de registros mortos
    try {
        sqliteDb.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
    } catch (e) {}
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

const TUNE_LIKES_JSON_PATH = path.join(DATA_DIR, 'tune_likes.json');
let tuneLikesJsonStore = [];
if (dbDriver === 'json-fallback') {
    try {
        if (fs.existsSync(TUNE_LIKES_JSON_PATH)) {
            tuneLikesJsonStore = JSON.parse(fs.readFileSync(TUNE_LIKES_JSON_PATH, 'utf8'));
        }
    } catch (e) {
        tuneLikesJsonStore = [];
    }
}

function persistTuneLikesJson() {
    if (dbDriver === 'json-fallback') {
        try {
            fs.writeFileSync(TUNE_LIKES_JSON_PATH, JSON.stringify(tuneLikesJsonStore, null, 2), 'utf8');
        } catch (e) {
            console.error('[DB] Erro ao salvar tune_likes.json:', e);
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
        is_curated: tune.is_curated ? 1 : 0,
        parent_id: tune.parent_id || null,
        parent_author: tune.parent_author || null,
        audio_demo: tune.audio_demo || tune.audioDemo || null,
        accompaniment_json: tune.accompaniment 
            ? (typeof tune.accompaniment === 'string' ? tune.accompaniment : JSON.stringify(tune.accompaniment))
            : (tune.backingSettings ? JSON.stringify(tune.backingSettings) : (tune.accompaniment_json || null)),
        created_at: tune.created_at || now,
        updated_at: now
    };

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare(`
            INSERT INTO tunes (id, title, artist, key, tempo, time_signature, category, difficulty, rhythm, notes_json, author_name, likes, user_id, is_public, is_curated, parent_id, parent_author, audio_demo, accompaniment_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                user_id = COALESCE(tunes.user_id, excluded.user_id),
                is_public = excluded.is_public,
                is_curated = MAX(tunes.is_curated, excluded.is_curated),
                parent_id = excluded.parent_id,
                parent_author = excluded.parent_author,
                audio_demo = COALESCE(excluded.audio_demo, tunes.audio_demo),
                accompaniment_json = COALESCE(excluded.accompaniment_json, tunes.accompaniment_json),
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
            tuneToSave.is_curated,
            tuneToSave.parent_id,
            tuneToSave.parent_author,
            tuneToSave.audio_demo,
            tuneToSave.accompaniment_json,
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
        try {
            row.accompaniment = row.accompaniment_json ? JSON.parse(row.accompaniment_json) : null;
            row.backingSettings = row.accompaniment;
        } catch (e) {
            row.accompaniment = null;
            row.backingSettings = null;
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
        try {
            copy.accompaniment = typeof copy.accompaniment_json === 'string' ? JSON.parse(copy.accompaniment_json) : (copy.accompaniment || null);
            copy.backingSettings = copy.accompaniment;
        } catch (e) {
            copy.accompaniment = null;
            copy.backingSettings = null;
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

        // Apenas músicas públicas e ativas aparecem no catálogo comunitário
        conditions.push('(is_public IS NULL OR is_public = 1)');
        conditions.push("(moderation_status IS NULL OR moderation_status = 'active')");

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
        } else if (sort === 'remixes') {
            orderBy = 'remix_count DESC, likes DESC, created_at DESC';
        } else if (sort === 'title') {
            orderBy = 'title ASC';
        }

        const countStmt = sqliteDb.prepare(`SELECT COUNT(*) as total FROM tunes ${whereClause}`);
        const total = countStmt.get(...params).total;

        const selectStmt = sqliteDb.prepare(`
            SELECT id, title, artist, key, tempo, time_signature, category, difficulty, rhythm, author_name, likes, is_public, is_curated, parent_id, parent_author, created_at, updated_at,
                   (SELECT COUNT(*) FROM tunes r WHERE r.parent_id = tunes.id) as remix_count
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
            const isModActive = !t.moderation_status || t.moderation_status === 'active';
            if (!isPublic || !isModActive) return false;

            const matchesQuery = !queryTerm || 
                (t.title && t.title.toLowerCase().includes(queryTerm)) ||
                (t.artist && t.artist.toLowerCase().includes(queryTerm)) ||
                (t.author_name && t.author_name.toLowerCase().includes(queryTerm));
            const matchesCat = (category === 'all' || t.category === category);
            const matchesKey = (key === 'all' || t.key === key);
            const matchesDiff = (difficulty === 'all' || t.difficulty === difficulty);
            return matchesQuery && matchesCat && matchesKey && matchesDiff;
        });

        results.forEach(t => {
            t.remix_count = jsonStore.filter(o => o.parent_id === t.id).length;
        });

        if (sort === 'popular') {
            results.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        } else if (sort === 'remixes') {
            results.sort((a, b) => (b.remix_count || 0) - (a.remix_count || 0) || (b.likes || 0) - (a.likes || 0));
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
            is_curated: t.is_curated || 0,
            parent_id: t.parent_id || null,
            parent_author: t.parent_author || null,
            remix_count: t.remix_count || 0,
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
 * Alterna a curtida de uma música para o usuário (1 like por usuário)
 * Retorna { liked: boolean, likes: number } ou null se a música não existir
 */
export function toggleTuneLike(tuneId, userId) {
    if (!tuneId || !userId) return null;

    if (dbDriver === 'sqlite') {
        const tune = sqliteDb.prepare('SELECT id, likes FROM tunes WHERE id = ?').get(tuneId);
        if (!tune) return null;

        const existing = sqliteDb.prepare('SELECT 1 FROM tune_likes WHERE user_id = ? AND tune_id = ?').get(userId, tuneId);
        let liked = false;

        if (existing) {
            // Remove o like
            sqliteDb.prepare('DELETE FROM tune_likes WHERE user_id = ? AND tune_id = ?').run(userId, tuneId);
            sqliteDb.prepare('UPDATE tunes SET likes = MAX(0, likes - 1) WHERE id = ?').run(tuneId);
            liked = false;
        } else {
            // Adiciona o like
            sqliteDb.prepare('INSERT INTO tune_likes (user_id, tune_id, created_at) VALUES (?, ?, ?)').run(userId, tuneId, new Date().toISOString());
            sqliteDb.prepare('UPDATE tunes SET likes = likes + 1 WHERE id = ?').run(tuneId);
            liked = true;
        }

        const updated = sqliteDb.prepare('SELECT likes FROM tunes WHERE id = ?').get(tuneId);
        return { id: tuneId, liked, likes: updated ? updated.likes : 0 };
    } else {
        const tune = jsonStore.find(t => t.id === tuneId);
        if (!tune) return null;

        const idx = tuneLikesJsonStore.findIndex(l => l.user_id === userId && l.tune_id === tuneId);
        let liked = false;

        if (idx !== -1) {
            // Remove o like
            tuneLikesJsonStore.splice(idx, 1);
            tune.likes = Math.max(0, (tune.likes || 0) - 1);
            liked = false;
        } else {
            // Adiciona o like
            tuneLikesJsonStore.push({ user_id: userId, tune_id: tuneId, created_at: new Date().toISOString() });
            tune.likes = (tune.likes || 0) + 1;
            liked = true;
        }

        persistTuneLikesJson();
        persistJsonStore();
        return { id: tuneId, liked, likes: tune.likes };
    }
}

/**
 * Retorna a lista de IDs de músicas que o usuário curtiu
 */
export function getUserLikedTuneIds(userId) {
    if (!userId) return [];

    if (dbDriver === 'sqlite') {
        const rows = sqliteDb.prepare('SELECT tune_id FROM tune_likes WHERE user_id = ?').all(userId);
        return rows.map(r => r.tune_id);
    } else {
        return tuneLikesJsonStore.filter(l => l.user_id === userId).map(l => l.tune_id);
    }
}

/**
 * Incrementa curtidas (legado / compatibilidade)
 */
export function likeTune(id, userId = null) {
    if (userId) return toggleTuneLike(id, userId);
    if (!id) return null;

    if (dbDriver === 'sqlite') {
        sqliteDb.prepare('UPDATE tunes SET likes = likes + 1 WHERE id = ?').run(id);
        return sqliteDb.prepare('SELECT id, likes FROM tunes WHERE id = ?').get(id);
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
 * Retorna total de usuários cadastrados
 */
export function countUsers() {
    if (dbDriver === 'sqlite') {
        const row = sqliteDb.prepare("SELECT COUNT(*) as total FROM users WHERE username != 'admin'").get();
        return row ? row.total : 0;
    } else {
        return usersJsonStore.filter(u => u.username !== 'admin').length;
    }
}

/**
 * Cria um novo bardo/usuário
 */
export function createUser({ id, username, passwordHash, passwordSalt, displayName, recoveryPhrase }) {
    const now = new Date().toISOString();
    const cleanUsername = username.toLowerCase().trim();
    const cleanDisplayName = (displayName || username).trim().slice(0, 50);

    // O primeiro usuário cadastrado ou o username 'admin' ganha automaticamente poderes de administrador
    const userCount = countUsers();
    const isAdmin = (userCount === 0 || cleanUsername === 'admin') ? 1 : 0;

    const userToSave = {
        id,
        username: cleanUsername,
        password_hash: passwordHash,
        password_salt: passwordSalt,
        display_name: cleanDisplayName,
        recovery_phrase: recoveryPhrase,
        is_admin: isAdmin,
        created_at: now,
        updated_at: now
    };

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare(`
            INSERT INTO users (id, username, password_hash, password_salt, display_name, recovery_phrase, is_admin, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
            userToSave.id,
            userToSave.username,
            userToSave.password_hash,
            userToSave.password_salt,
            userToSave.display_name,
            userToSave.recovery_phrase,
            userToSave.is_admin,
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
        displayName: userToSave.display_name,
        is_admin: userToSave.is_admin,
        isAdmin: Boolean(userToSave.is_admin),
        created_at: userToSave.created_at
    };
}

/**
 * Busca usuário por nome de usuário (para login)
 */
function normalizeUserModerationRow(row) {
    if (!row) return null;
    let status = row.status || 'active';
    let suspendedUntil = row.suspended_until || null;
    let banReason = row.ban_reason || null;
    if (status === 'suspended' && suspendedUntil && Date.now() >= suspendedUntil) {
        status = 'active';
        suspendedUntil = null;
        banReason = null;
        if (dbDriver === 'sqlite') {
            try {
                sqliteDb.prepare("UPDATE users SET status = 'active', suspended_until = NULL, ban_reason = NULL WHERE id = ?").run(row.id);
            } catch (e) {}
        }
    }
    return { status, suspendedUntil, banReason };
}

export function getUserByUsername(username) {
    if (!username) return null;
    const cleanUser = username.toLowerCase().trim();

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare('SELECT id, username, password_hash, password_salt, display_name, is_admin, status, suspended_until, ban_reason, created_at FROM users WHERE LOWER(username) = LOWER(?)');
        const row = stmt.get(cleanUser);
        if (!row) return null;
        const mod = normalizeUserModerationRow(row);
        return {
            id: row.id,
            username: row.username,
            password_hash: row.password_hash,
            password_salt: row.password_salt,
            display_name: row.display_name,
            displayName: row.display_name,
            is_admin: row.is_admin || 0,
            isAdmin: Boolean(row.is_admin),
            status: mod.status,
            suspendedUntil: mod.suspendedUntil,
            banReason: mod.banReason,
            created_at: row.created_at
        };
    } else {
        const u = usersJsonStore.find(user => user.username.toLowerCase() === cleanUser);
        if (!u) return null;
        const mod = normalizeUserModerationRow(u);
        return {
            ...u,
            displayName: u.display_name,
            isAdmin: Boolean(u.is_admin),
            status: mod.status,
            suspendedUntil: mod.suspendedUntil,
            banReason: mod.banReason
        };
    }
}

/**
 * Busca usuário por ID
 */
export function getUserById(id) {
    if (!id) return null;

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare('SELECT id, username, display_name, is_admin, status, suspended_until, ban_reason, created_at FROM users WHERE id = ?');
        const row = stmt.get(id);
        if (!row) return null;
        const mod = normalizeUserModerationRow(row);
        return {
            id: row.id,
            username: row.username,
            display_name: row.display_name,
            displayName: row.display_name,
            is_admin: row.is_admin || 0,
            isAdmin: Boolean(row.is_admin),
            status: mod.status,
            suspendedUntil: mod.suspendedUntil,
            banReason: mod.banReason,
            created_at: row.created_at
        };
    } else {
        const u = usersJsonStore.find(user => user.id === id);
        if (!u) return null;
        const mod = normalizeUserModerationRow(u);
        return {
            id: u.id,
            username: u.username,
            display_name: u.display_name,
            displayName: u.display_name,
            is_admin: u.is_admin || 0,
            isAdmin: Boolean(u.is_admin),
            status: mod.status,
            suspendedUntil: mod.suspendedUntil,
            banReason: mod.banReason,
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
            return {
                id: u.id,
                username: u.username,
                display_name: u.display_name,
                displayName: u.display_name,
                is_admin: u.is_admin || 0,
                isAdmin: Boolean(u.is_admin),
                created_at: u.created_at
            };
        }
        return null;
    }
}

/**
 * Busca usuário com frase de recuperação para redefinição de senha
 */
export function getUserForRecovery(username) {
    if (!username) return null;
    const cleanUser = username.toLowerCase().trim();

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare('SELECT id, username, recovery_phrase FROM users WHERE LOWER(username) = LOWER(?)');
        return stmt.get(cleanUser) || null;
    } else {
        const u = usersJsonStore.find(user => user.username.toLowerCase() === cleanUser);
        if (!u) return null;
        return {
            id: u.id,
            username: u.username,
            recovery_phrase: u.recovery_phrase
        };
    }
}

/**
 * Atualiza hash e salt da senha do usuário
 */
export function updateUserPassword(id, { passwordHash, passwordSalt }) {
    if (!id || !passwordHash || !passwordSalt) return false;
    const now = new Date().toISOString();

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare('UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?');
        const info = stmt.run(passwordHash, passwordSalt, now, id);
        return info.changes > 0;
    } else {
        const u = usersJsonStore.find(user => user.id === id);
        if (!u) return false;
        u.password_hash = passwordHash;
        u.password_salt = passwordSalt;
        u.updated_at = now;
        persistUsersJson();
        return true;
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
            SELECT s.token, s.expires_at, u.id, u.username, u.display_name, u.is_admin, u.status, u.suspended_until, u.ban_reason, u.created_at
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > ?
        `);
        const row = stmt.get(token, now);
        if (!row) return null;
        const mod = normalizeUserModerationRow(row);
        if (mod.status !== 'active') return null;
        return {
            token: row.token,
            expiresAt: row.expires_at,
            user: {
                id: row.id,
                username: row.username,
                display_name: row.display_name,
                displayName: row.display_name,
                is_admin: row.is_admin || 0,
                isAdmin: Boolean(row.is_admin),
                status: mod.status,
                createdAt: row.created_at
            }
        };
    } else {
        const s = sessionsJsonStore.find(sess => sess.token === token && sess.expires_at > now);
        if (!s) return null;
        const u = usersJsonStore.find(user => user.id === s.user_id);
        if (!u) return null;
        const mod = normalizeUserModerationRow(u);
        if (mod.status !== 'active') return null;
        return {
            token: s.token,
            expiresAt: s.expires_at,
            user: {
                id: u.id,
                username: u.username,
                display_name: u.display_name,
                displayName: u.display_name,
                is_admin: u.is_admin || 0,
                isAdmin: Boolean(u.is_admin),
                status: mod.status,
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
 * Remove todas as sessões de um usuário (ex.: após redefinição de senha)
 */
export function deleteSessionsByUserId(userId) {
    if (!userId) return;

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare('DELETE FROM sessions WHERE user_id = ?');
        stmt.run(userId);
    } else {
        sessionsJsonStore = sessionsJsonStore.filter(s => s.user_id !== userId);
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
 * Atualiza uma música existente garantindo que pertence ao autor (ou admin para legadas sem autor)
 */
export function updateUserTune(tuneId, userId, data, isAdmin = false) {
    if (!tuneId) return null;
    const now = new Date().toISOString();

    const current = getTuneById(tuneId);
    if (!current) return null;
    if (current.is_curated) return null; // Nunca permite sobrescrever músicas curadas

    // Apenas o proprietário (quando há user_id) ou administrador pode alterar; músicas com user_id null exigem admin
    const isOwner = Boolean(current.user_id && userId && current.user_id === userId);
    if (!isAdmin && !isOwner) {
        return null;
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
    const audio_demo = data.audio_demo !== undefined 
        ? data.audio_demo 
        : (data.audioDemo !== undefined ? data.audioDemo : current.audio_demo);
    const accompaniment_json = data.accompaniment !== undefined
        ? (typeof data.accompaniment === 'string' ? data.accompaniment : JSON.stringify(data.accompaniment))
        : (data.backingSettings !== undefined ? JSON.stringify(data.backingSettings) : current.accompaniment_json);

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare(`
            UPDATE tunes
            SET title = ?, artist = ?, key = ?, tempo = ?, time_signature = ?, category = ?, difficulty = ?, rhythm = ?, notes_json = ?, is_public = ?, audio_demo = ?, accompaniment_json = ?, updated_at = ?
            WHERE id = ?
        `);
        stmt.run(title, artist, key, tempo, time_signature, category, difficulty, rhythm, notes_json, is_public, audio_demo, accompaniment_json, now, tuneId);
    } else {
        const idx = jsonStore.findIndex(t => t.id === tuneId);
        if (idx !== -1) {
            jsonStore[idx] = {
                ...jsonStore[idx],
                title, artist, key, tempo, time_signature, category, difficulty, rhythm, notes_json, is_public, audio_demo, accompaniment_json,
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
export function updateTuneVisibility(tuneId, userId, isPublic, isAdmin = false) {
    if (!tuneId) return null;
    const now = new Date().toISOString();
    const pubVal = isPublic ? 1 : 0;

    const current = getTuneById(tuneId);
    if (!current || current.is_curated) return null;

    // Apenas o proprietário (quando há user_id) ou administrador pode alterar; músicas com user_id null exigem admin
    const isOwner = Boolean(current.user_id && userId && current.user_id === userId);
    if (!isAdmin && !isOwner) {
        return null;
    }

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare(`
            UPDATE tunes
            SET is_public = ?, updated_at = ?
            WHERE id = ?
        `);
        const result = stmt.run(pubVal, now, tuneId);
        if (result.changes === 0) return null;
    } else {
        const found = jsonStore.find(t => t.id === tuneId);
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
        if (result.changes > 0) {
            sqliteDb.prepare('DELETE FROM tune_likes WHERE tune_id = ?').run(tuneId);
            return true;
        }
        return false;
    } else {
        const initialLen = jsonStore.length;
        jsonStore = jsonStore.filter(t => !(t.id === tuneId && t.user_id === userId));
        if (jsonStore.length !== initialLen) {
            persistJsonStore();
            tuneLikesJsonStore = tuneLikesJsonStore.filter(l => l.tune_id !== tuneId);
            persistTuneLikesJson();
            return true;
        }
        return false;
    }
}

// ==========================================
// PAINEL DE MODERAÇÃO DO ADMINISTRADOR
// ==========================================

/**
 * Checa se um usuário é administrador
 */
export function isAdminUser(userId) {
    if (!userId) return false;
    const user = getUserById(userId);
    return Boolean(user && user.isAdmin);
}

/**
 * Deleta qualquer música do banco de dados (poder de administrador)
 */
export function deleteTuneByAdmin(tuneId, adminUserId) {
    if (!tuneId || !isAdminUser(adminUserId)) return false;

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare('DELETE FROM tunes WHERE id = ?');
        const result = stmt.run(tuneId);
        if (result.changes > 0) {
            sqliteDb.prepare('DELETE FROM tune_likes WHERE tune_id = ?').run(tuneId);
            return true;
        }
        return false;
    } else {
        const initialLen = jsonStore.length;
        jsonStore = jsonStore.filter(t => t.id !== tuneId);
        if (jsonStore.length !== initialLen) {
            persistJsonStore();
            tuneLikesJsonStore = tuneLikesJsonStore.filter(l => l.tune_id !== tuneId);
            persistTuneLikesJson();
            return true;
        }
        return false;
    }
}

/**
 * Lista todos os usuários cadastrados (para moderação)
 */
export function listAllUsers(adminUserId) {
    if (!isAdminUser(adminUserId)) return [];

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare(`
            SELECT u.id, u.username, u.display_name, u.is_admin, u.status, u.suspended_until, u.ban_reason, u.created_at, u.password_hash,
                   (SELECT COUNT(*) FROM tunes t WHERE t.user_id = u.id) as tunes_count,
                   (SELECT COALESCE(SUM(t.likes), 0) FROM tunes t WHERE t.user_id = u.id) as likes_received
            FROM users u
            ORDER BY u.created_at DESC
        `);
        return stmt.all().map(u => {
            const mod = normalizeUserModerationRow(u);
            return {
                id: u.id,
                username: u.username,
                displayName: u.display_name,
                isAdmin: Boolean(u.is_admin),
                hasPassword: u.password_hash !== 'restored_no_password' && u.password_hash !== 'curadoria_lock',
                status: mod.status,
                suspendedUntil: mod.suspendedUntil,
                banReason: mod.banReason,
                createdAt: u.created_at,
                tunesCount: u.tunes_count || 0,
                likesReceived: u.likes_received || 0
            };
        });
    } else {
        return usersJsonStore.map(u => {
            const mod = normalizeUserModerationRow(u);
            const userTunes = jsonStore.filter(t => t.user_id === u.id);
            return {
                id: u.id,
                username: u.username,
                displayName: u.display_name,
                isAdmin: Boolean(u.is_admin),
                hasPassword: u.password_hash !== 'restored_no_password' && u.password_hash !== 'curadoria_lock',
                status: mod.status,
                suspendedUntil: mod.suspendedUntil,
                banReason: mod.banReason,
                createdAt: u.created_at,
                tunesCount: userTunes.length,
                likesReceived: userTunes.reduce((acc, t) => acc + (t.likes || 0), 0)
            };
        });
    }
}

/**
 * Registra uma ação administrativa na trilha de auditoria
 */
let auditMemoryFallback = [];
export function logAdminAction({ adminId, action, targetType, targetId = null, details = null }) {
    if (!adminId || !action) return;
    const id = 'aud_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    const createdAt = new Date().toISOString();
    const detailsJson = details ? JSON.stringify(details) : null;

    if (dbDriver === 'sqlite') {
        try {
            sqliteDb.prepare(`
                INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(id, adminId, action, targetType, targetId, detailsJson, createdAt);
        } catch (e) {
            console.warn('[AuditLog]', e.message);
        }
    } else {
        auditMemoryFallback.unshift({ id, admin_id: adminId, action, target_type: targetType, target_id: targetId, details_json: detailsJson, created_at: createdAt });
        if (auditMemoryFallback.length > 200) auditMemoryFallback = auditMemoryFallback.slice(0, 200);
    }
}

export function getAdminAuditLogs(adminUserId, limit = 80) {
    if (!isAdminUser(adminUserId)) return [];
    const lim = Math.max(1, Math.min(200, parseInt(limit, 10) || 80));

    if (dbDriver === 'sqlite') {
        const rows = sqliteDb.prepare(`
            SELECT a.id, a.admin_id, u.username as admin_username, a.action, a.target_type, a.target_id, a.details_json, a.created_at
            FROM admin_audit_log a
            LEFT JOIN users u ON u.id = a.admin_id
            ORDER BY a.created_at DESC
            LIMIT ?
        `).all(lim);
        return rows.map(r => {
            let details = null;
            try { details = r.details_json ? JSON.parse(r.details_json) : null; } catch (_) {}
            return {
                id: r.id,
                adminId: r.admin_id,
                adminUsername: r.admin_username || r.admin_id,
                action: r.action,
                targetType: r.target_type,
                targetId: r.target_id,
                details,
                createdAt: r.created_at
            };
        });
    } else {
        return auditMemoryFallback.slice(0, lim).map(r => ({
            id: r.id,
            adminId: r.admin_id,
            adminUsername: r.admin_id,
            action: r.action,
            targetType: r.target_type,
            targetId: r.target_id,
            details: r.details_json ? JSON.parse(r.details_json) : null,
            createdAt: r.created_at
        }));
    }
}

export function moderateUserByAdmin({ targetUserId, adminUserId, action, durationHours = 24, reason = '' }) {
    if (!targetUserId || !isAdminUser(adminUserId)) return { ok: false, error: 'Acesso negado.' };
    if (targetUserId === adminUserId && ['ban', 'suspend', 'demote'].includes(action)) {
        return { ok: false, error: 'Não é possível aplicar essa ação na sua própria conta.' };
    }

    const cleanReason = (reason || '').trim().slice(0, 300) || null;

    if (dbDriver === 'sqlite') {
        const target = sqliteDb.prepare('SELECT id, username FROM users WHERE id = ?').get(targetUserId);
        if (!target) return { ok: false, error: 'Usuário não encontrado.' };

        const nowIso = new Date().toISOString();
        if (action === 'ban') {
            sqliteDb.prepare("UPDATE users SET status = 'banned', suspended_until = NULL, ban_reason = ?, updated_at = ? WHERE id = ?")
                .run(cleanReason, nowIso, targetUserId);
            sqliteDb.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetUserId);
            // Regra aprovada: ao banir usuário, suspender automaticamente suas músicas
            sqliteDb.prepare("UPDATE tunes SET moderation_status = 'suspended', moderation_reason = ?, updated_at = ? WHERE user_id = ?")
                .run(cleanReason ? `Autor banido: ${cleanReason}` : 'Autor banido pela moderação', nowIso, targetUserId);
        } else if (action === 'suspend') {
            const hrs = Math.max(1, Math.min(8760, parseInt(durationHours, 10) || 24));
            const until = Date.now() + (hrs * 3600000);
            sqliteDb.prepare("UPDATE users SET status = 'suspended', suspended_until = ?, ban_reason = ?, updated_at = ? WHERE id = ?")
                .run(until, cleanReason, nowIso, targetUserId);
            sqliteDb.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetUserId);
        } else if (action === 'reactivate') {
            sqliteDb.prepare("UPDATE users SET status = 'active', suspended_until = NULL, ban_reason = NULL, updated_at = ? WHERE id = ?")
                .run(nowIso, targetUserId);
        } else if (action === 'promote') {
            sqliteDb.prepare('UPDATE users SET is_admin = 1, updated_at = ? WHERE id = ?').run(nowIso, targetUserId);
        } else if (action === 'demote') {
            sqliteDb.prepare('UPDATE users SET is_admin = 0, updated_at = ? WHERE id = ?').run(nowIso, targetUserId);
        } else if (action === 'revoke_sessions') {
            sqliteDb.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetUserId);
        } else {
            return { ok: false, error: 'Ação de moderação inválida.' };
        }

        logAdminAction({
            adminId: adminUserId,
            action: `user_${action}`,
            targetType: 'user',
            targetId: targetUserId,
            details: { username: target.username, reason: cleanReason, durationHours }
        });
        return { ok: true };
    } else {
        const u = usersJsonStore.find(usr => usr.id === targetUserId);
        if (!u) return { ok: false, error: 'Usuário não encontrado.' };
        if (action === 'ban') {
            u.status = 'banned';
            u.suspended_until = null;
            u.ban_reason = cleanReason;
            sessionsJsonStore = sessionsJsonStore.filter(s => s.user_id !== targetUserId);
            jsonStore.forEach(t => {
                if (t.user_id === targetUserId) {
                    t.moderation_status = 'suspended';
                    t.moderation_reason = cleanReason ? `Autor banido: ${cleanReason}` : 'Autor banido pela moderação';
                }
            });
            persistJsonStore();
            persistSessionsJson();
        } else if (action === 'suspend') {
            const hrs = Math.max(1, Math.min(8760, parseInt(durationHours, 10) || 24));
            u.status = 'suspended';
            u.suspended_until = Date.now() + (hrs * 3600000);
            u.ban_reason = cleanReason;
            sessionsJsonStore = sessionsJsonStore.filter(s => s.user_id !== targetUserId);
            persistSessionsJson();
        } else if (action === 'reactivate') {
            u.status = 'active';
            u.suspended_until = null;
            u.ban_reason = null;
        } else if (action === 'promote') {
            u.is_admin = 1;
        } else if (action === 'demote') {
            u.is_admin = 0;
        } else if (action === 'revoke_sessions') {
            sessionsJsonStore = sessionsJsonStore.filter(s => s.user_id !== targetUserId);
            persistSessionsJson();
        } else {
            return { ok: false, error: 'Ação de moderação inválida.' };
        }
        persistUsersJson();
        logAdminAction({ adminId: adminUserId, action: `user_${action}`, targetType: 'user', targetId: targetUserId, details: { username: u.username, reason: cleanReason } });
        return { ok: true };
    }
}

export function listAllTunesForAdmin(adminUserId, { q = '', status = 'all', key = 'all' } = {}) {
    if (!isAdminUser(adminUserId)) return [];
    const term = (q || '').toLowerCase().trim();

    if (dbDriver === 'sqlite') {
        const conditions = [];
        const params = [];
        if (term) {
            conditions.push('(LOWER(t.title) LIKE ? OR LOWER(t.artist) LIKE ? OR LOWER(t.author_name) LIKE ?)');
            const w = `%${term}%`;
            params.push(w, w, w);
        }
        if (status && status !== 'all') {
            if (status === 'active') conditions.push("(t.moderation_status IS NULL OR t.moderation_status = 'active')");
            else {
                conditions.push('t.moderation_status = ?');
                params.push(status);
            }
        }
        if (key && key !== 'all') {
            conditions.push('t.key = ?');
            params.push(key);
        }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        return sqliteDb.prepare(`
            SELECT t.id, t.title, t.artist, t.key, t.tempo, t.time_signature, t.category, t.difficulty, t.rhythm,
                   t.author_name, t.user_id, u.username as owner_username, t.likes, t.is_public, t.is_curated,
                   COALESCE(t.moderation_status, 'active') as moderation_status, t.moderation_reason,
                   t.created_at, t.updated_at
            FROM tunes t
            LEFT JOIN users u ON u.id = t.user_id
            ${where}
            ORDER BY t.updated_at DESC
            LIMIT 500
        `).all(...params);
    } else {
        return jsonStore.filter(t => {
            const ms = t.moderation_status || 'active';
            if (status !== 'all' && ms !== status) return false;
            if (key !== 'all' && t.key !== key) return false;
            if (term) {
                const hay = `${t.title || ''} ${t.artist || ''} ${t.author_name || ''}`.toLowerCase();
                if (!hay.includes(term)) return false;
            }
            return true;
        }).slice(0, 500);
    }
}

export function moderateOrUpdateTuneByAdmin({ tuneId, adminUserId, patch = {} }) {
    if (!tuneId || !isAdminUser(adminUserId)) return { ok: false, error: 'Acesso negado.' };
    const now = new Date().toISOString();

    if (dbDriver === 'sqlite') {
        const existing = sqliteDb.prepare('SELECT id, title FROM tunes WHERE id = ?').get(tuneId);
        if (!existing) return { ok: false, error: 'Música não encontrada.' };

        const fields = [];
        const params = [];
        const allowedText = ['title', 'artist', 'key', 'time_signature', 'category', 'difficulty', 'rhythm', 'moderation_status', 'moderation_reason'];
        for (const k of allowedText) {
            if (patch[k] !== undefined) {
                fields.push(`${k} = ?`);
                params.push(patch[k] === null ? null : String(patch[k]).trim());
            }
        }
        if (patch.tempo !== undefined) {
            fields.push('tempo = ?');
            params.push(Math.max(30, Math.min(300, parseInt(patch.tempo, 10) || 110)));
        }
        if (patch.is_public !== undefined) {
            fields.push('is_public = ?');
            params.push(patch.is_public ? 1 : 0);
        }
        if (patch.is_curated !== undefined) {
            fields.push('is_curated = ?');
            params.push(patch.is_curated ? 1 : 0);
        }

        if (fields.length === 0) return { ok: false, error: 'Nenhum campo para atualizar.' };
        fields.push('updated_at = ?');
        params.push(now, tuneId);

        sqliteDb.prepare(`UPDATE tunes SET ${fields.join(', ')} WHERE id = ?`).run(...params);
        logAdminAction({
            adminId: adminUserId,
            action: patch.moderation_status ? `tune_${patch.moderation_status}` : 'tune_update',
            targetType: 'tune',
            targetId: tuneId,
            details: { title: existing.title, patch }
        });
        return { ok: true };
    } else {
        const t = jsonStore.find(x => x.id === tuneId);
        if (!t) return { ok: false, error: 'Música não encontrada.' };
        Object.assign(t, patch, { updated_at: now });
        persistJsonStore();
        logAdminAction({ adminId: adminUserId, action: 'tune_update', targetType: 'tune', targetId: tuneId, details: { title: t.title, patch } });
        return { ok: true };
    }
}

export function batchImportTunesByAdmin({ adminUserId, authorName = 'Curadoria', tunes = [], skipDuplicates = true }) {
    if (!isAdminUser(adminUserId)) return { ok: false, error: 'Acesso negado.' };
    if (!Array.isArray(tunes) || tunes.length === 0) return { ok: false, error: 'Lista de músicas vazia.' };

    const now = new Date().toISOString();
    let importedCount = 0;
    let skippedCount = 0;
    const importedIds = [];

    if (dbDriver === 'sqlite') {
        const existingTitles = new Set(
            sqliteDb.prepare('SELECT LOWER(title) as lt FROM tunes').all().map(r => r.lt)
        );
        const insertStmt = sqliteDb.prepare(`
            INSERT INTO tunes (id, title, artist, key, tempo, time_signature, category, difficulty, rhythm, notes_json, author_name, user_id, is_public, is_curated, moderation_status, likes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?, ?)
        `);

        sqliteDb.exec('BEGIN TRANSACTION');
        try {
            for (const item of tunes.slice(0, 250)) {
                const title = String(item.title || '').trim();
                if (!title || !Array.isArray(item.notes) || item.notes.length === 0) {
                    skippedCount++;
                    continue;
                }
                if (skipDuplicates && existingTitles.has(title.toLowerCase())) {
                    skippedCount++;
                    continue;
                }
                const id = item.id || ('adm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7));
                insertStmt.run(
                    id,
                    title,
                    String(item.artist || 'Tradicional').trim(),
                    String(item.key || 'D').trim(),
                    Math.max(30, Math.min(300, parseInt(item.tempo, 10) || 110)),
                    String(item.timeSignature || item.time_signature || '4/4').trim(),
                    String(item.category || 'celtic').trim(),
                    String(item.difficulty || 'intermediario').trim(),
                    String(item.rhythm || 'reel').trim(),
                    JSON.stringify(item.notes),
                    String(item.authorName || authorName || 'Curadoria').trim(),
                    adminUserId,
                    item.isPublic === false || item.is_public === 0 ? 0 : 1,
                    item.isCurated ? 1 : 0,
                    now,
                    now
                );
                existingTitles.add(title.toLowerCase());
                importedIds.push(id);
                importedCount++;
            }
            sqliteDb.exec('COMMIT');
        } catch (err) {
            sqliteDb.exec('ROLLBACK');
            return { ok: false, error: err.message };
        }
    } else {
        const existingTitles = new Set(jsonStore.map(t => (t.title || '').toLowerCase()));
        for (const item of tunes.slice(0, 250)) {
            const title = String(item.title || '').trim();
            if (!title || !Array.isArray(item.notes) || item.notes.length === 0) {
                skippedCount++;
                continue;
            }
            if (skipDuplicates && existingTitles.has(title.toLowerCase())) {
                skippedCount++;
                continue;
            }
            const id = item.id || ('adm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7));
            jsonStore.push({
                id,
                title,
                artist: String(item.artist || 'Tradicional').trim(),
                key: String(item.key || 'D').trim(),
                tempo: Math.max(30, Math.min(300, parseInt(item.tempo, 10) || 110)),
                time_signature: String(item.timeSignature || '4/4').trim(),
                category: String(item.category || 'celtic').trim(),
                difficulty: String(item.difficulty || 'intermediario').trim(),
                rhythm: String(item.rhythm || 'reel').trim(),
                notes_json: JSON.stringify(item.notes),
                author_name: String(item.authorName || authorName || 'Curadoria').trim(),
                user_id: adminUserId,
                is_public: item.isPublic === false ? 0 : 1,
                is_curated: item.isCurated ? 1 : 0,
                moderation_status: 'active',
                likes: 0,
                created_at: now,
                updated_at: now
            });
            existingTitles.add(title.toLowerCase());
            importedIds.push(id);
            importedCount++;
        }
        persistJsonStore();
    }

    logAdminAction({
        adminId: adminUserId,
        action: 'batch_import_tunes',
        targetType: 'tune',
        targetId: null,
        details: { importedCount, skippedCount }
    });
    return { ok: true, importedCount, skippedCount, importedIds };
}

export function getAdminOverview(adminUserId) {
    if (!isAdminUser(adminUserId)) return null;

    if (dbDriver === 'sqlite') {
        const userStats = sqliteDb.prepare(`
            SELECT
                COUNT(*) as totalUsers,
                SUM(CASE WHEN COALESCE(status, 'active') = 'active' THEN 1 ELSE 0 END) as activeUsers,
                SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspendedUsers,
                SUM(CASE WHEN status = 'banned' THEN 1 ELSE 0 END) as bannedUsers,
                SUM(CASE WHEN is_admin = 1 THEN 1 ELSE 0 END) as adminUsers
            FROM users
        `).get();

        const tuneStats = sqliteDb.prepare(`
            SELECT
                COUNT(*) as totalTunes,
                SUM(CASE WHEN COALESCE(moderation_status, 'active') = 'active' AND (is_public IS NULL OR is_public = 1) THEN 1 ELSE 0 END) as publicTunes,
                SUM(CASE WHEN is_curated = 1 THEN 1 ELSE 0 END) as curatedTunes,
                SUM(CASE WHEN COALESCE(moderation_status, 'active') != 'active' THEN 1 ELSE 0 END) as moderatedTunes,
                COALESCE(SUM(likes), 0) as totalLikes
            FROM tunes
        `).get();

        const byRhythm = sqliteDb.prepare("SELECT COALESCE(rhythm, 'reel') as label, COUNT(*) as count FROM tunes GROUP BY label ORDER BY count DESC").all();
        const byKey = sqliteDb.prepare("SELECT COALESCE(key, 'D') as label, COUNT(*) as count FROM tunes GROUP BY label ORDER BY count DESC").all();

        return {
            users: userStats,
            tunes: tuneStats,
            byRhythm,
            byKey
        };
    } else {
        return {
            users: {
                totalUsers: usersJsonStore.length,
                activeUsers: usersJsonStore.filter(u => (u.status || 'active') === 'active').length,
                suspendedUsers: usersJsonStore.filter(u => u.status === 'suspended').length,
                bannedUsers: usersJsonStore.filter(u => u.status === 'banned').length,
                adminUsers: usersJsonStore.filter(u => Boolean(u.is_admin)).length
            },
            tunes: {
                totalTunes: jsonStore.length,
                publicTunes: jsonStore.filter(t => (t.is_public === undefined || t.is_public === 1) && (!t.moderation_status || t.moderation_status === 'active')).length,
                curatedTunes: jsonStore.filter(t => Boolean(t.is_curated)).length,
                moderatedTunes: jsonStore.filter(t => t.moderation_status && t.moderation_status !== 'active').length,
                totalLikes: jsonStore.reduce((a, t) => a + (t.likes || 0), 0)
            },
            byRhythm: [],
            byKey: []
        };
    }
}

export function exportAdminBackup(adminUserId) {
    if (!isAdminUser(adminUserId)) return null;
    const users = listAllUsers(adminUserId);
    const tunes = dbDriver === 'sqlite'
        ? sqliteDb.prepare('SELECT id, title, artist, key, tempo, time_signature, category, difficulty, rhythm, notes_json, author_name, user_id, is_public, is_curated, moderation_status, moderation_reason, likes, created_at, updated_at FROM tunes ORDER BY created_at DESC').all()
        : jsonStore;

    logAdminAction({
        adminId: adminUserId,
        action: 'export_backup',
        targetType: 'system',
        targetId: null,
        details: { usersCount: users.length, tunesCount: tunes.length }
    });

    return {
        exportedAt: new Date().toISOString(),
        version: 1,
        usersCount: users.length,
        tunesCount: tunes.length,
        users,
        tunes
    };
}

export function updateUserRecoveryPhrase(targetUserId, adminUserId, recoveryPhraseHash) {
    if (!targetUserId || !recoveryPhraseHash || !isAdminUser(adminUserId)) return { ok: false, error: 'Acesso negado.' };
    const now = new Date().toISOString();

    if (dbDriver === 'sqlite') {
        const existing = sqliteDb.prepare('SELECT id, username FROM users WHERE id = ?').get(targetUserId);
        if (!existing) return { ok: false, error: 'Usuário não encontrado.' };
        sqliteDb.prepare('UPDATE users SET recovery_phrase = ?, updated_at = ? WHERE id = ?').run(recoveryPhraseHash, now, targetUserId);
        logAdminAction({
            adminId: adminUserId,
            action: 'user_issue_recovery',
            targetType: 'user',
            targetId: targetUserId,
            details: { username: existing.username }
        });
        return { ok: true, username: existing.username };
    } else {
        const u = usersJsonStore.find(x => x.id === targetUserId);
        if (!u) return { ok: false, error: 'Usuário não encontrado.' };
        u.recovery_phrase = recoveryPhraseHash;
        u.updated_at = now;
        persistUsersJson();
        logAdminAction({ adminId: adminUserId, action: 'user_issue_recovery', targetType: 'user', targetId: targetUserId, details: { username: u.username } });
        return { ok: true, username: u.username };
    }
}

export function restoreAdminBackup({ adminUserId, backup, mode = 'merge' }) {
    if (!isAdminUser(adminUserId)) return { ok: false, error: 'Acesso negado.' };
    if (!backup || typeof backup !== 'object') return { ok: false, error: 'Arquivo de backup inválido.' };

    const safeMode = mode === 'replace' ? 'replace' : 'merge';
    const users = Array.isArray(backup.users) ? backup.users : [];
    const tunes = Array.isArray(backup.tunes) ? backup.tunes : [];
    if (users.length === 0 && tunes.length === 0) {
        return { ok: false, error: 'O backup não contém usuários nem músicas para restaurar.' };
    }

    const now = new Date().toISOString();
    let usersInserted = 0;
    let usersUpdated = 0;
    let usersWithoutPassword = 0;
    let tunesRestored = 0;

    if (dbDriver === 'sqlite') {
        sqliteDb.exec('BEGIN');
        try {
            if (safeMode === 'replace') {
                sqliteDb.prepare('DELETE FROM tune_likes').run();
                sqliteDb.prepare('DELETE FROM tunes').run();
                sqliteDb.prepare('DELETE FROM sessions WHERE user_id != ?').run(adminUserId);
                sqliteDb.prepare('DELETE FROM users WHERE id != ?').run(adminUserId);
            }

            const findUserById = sqliteDb.prepare('SELECT id, password_hash FROM users WHERE id = ?');
            const findUserByName = sqliteDb.prepare('SELECT id, password_hash FROM users WHERE LOWER(username) = LOWER(?)');
            const insertUser = sqliteDb.prepare(`
                INSERT INTO users (id, username, password_hash, password_salt, display_name, recovery_phrase, is_admin, status, suspended_until, ban_reason, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const updateUser = sqliteDb.prepare(`
                UPDATE users SET display_name = ?, is_admin = ?, status = ?, suspended_until = ?, ban_reason = ?, updated_at = ?
                WHERE id = ?
            `);

            for (const u of users) {
                if (!u || !u.id || !u.username) continue;
                const displayName = String(u.displayName || u.display_name || u.username).trim();
                const isAdmin = (u.isAdmin || u.is_admin) ? 1 : 0;
                const status = ['active', 'suspended', 'banned'].includes(u.status) ? u.status : 'active';
                const suspendedUntil = u.suspendedUntil || u.suspended_until || null;
                const banReason = u.banReason || u.ban_reason || null;
                const createdAt = u.createdAt || u.created_at || now;

                if (u.id === adminUserId) {
                    // Preserva is_admin=1 e status='active' do admin que está restaurando
                    sqliteDb.prepare('UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?').run(displayName, now, adminUserId);
                    usersUpdated++;
                    continue;
                }

                const existing = findUserById.get(u.id) || findUserByName.get(u.username);
                if (existing) {
                    updateUser.run(displayName, isAdmin, status, suspendedUntil, banReason, now, existing.id);
                    usersUpdated++;
                    if (existing.password_hash === 'restored_no_password') usersWithoutPassword++;
                } else {
                    insertUser.run(
                        u.id,
                        String(u.username).trim(),
                        'restored_no_password',
                        'restored',
                        displayName,
                        'restored_no_recovery',
                        isAdmin,
                        status,
                        suspendedUntil,
                        banReason,
                        createdAt,
                        now
                    );
                    usersInserted++;
                    usersWithoutPassword++;
                }
            }

            const upsertTune = sqliteDb.prepare(`
                INSERT INTO tunes (id, title, artist, key, tempo, time_signature, category, difficulty, rhythm, notes_json, author_name, user_id, is_public, is_curated, moderation_status, moderation_reason, likes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    user_id = excluded.user_id,
                    is_public = excluded.is_public,
                    is_curated = excluded.is_curated,
                    moderation_status = excluded.moderation_status,
                    moderation_reason = excluded.moderation_reason,
                    likes = excluded.likes,
                    updated_at = excluded.updated_at
            `);

            for (const tu of tunes) {
                if (!tu || !tu.id || !tu.title) continue;
                const notesJson = typeof tu.notes_json === 'string'
                    ? tu.notes_json
                    : JSON.stringify(Array.isArray(tu.notes) ? tu.notes : []);
                upsertTune.run(
                    String(tu.id),
                    String(tu.title).trim(),
                    String(tu.artist || 'Tradicional').trim(),
                    String(tu.key || 'D').trim(),
                    Math.max(30, Math.min(300, parseInt(tu.tempo, 10) || 110)),
                    String(tu.time_signature || tu.timeSignature || '4/4').trim(),
                    String(tu.category || 'Celta').trim(),
                    String(tu.difficulty || 'beginner').trim(),
                    String(tu.rhythm || 'reel').trim(),
                    notesJson,
                    String(tu.author_name || tu.authorName || 'Curadoria').trim(),
                    tu.user_id || null,
                    tu.is_public === 0 || tu.isPublic === false ? 0 : 1,
                    tu.is_curated || tu.isCurated ? 1 : 0,
                    ['active', 'suspended', 'banned'].includes(tu.moderation_status) ? tu.moderation_status : 'active',
                    tu.moderation_reason || null,
                    Math.max(0, parseInt(tu.likes, 10) || 0),
                    tu.created_at || now,
                    tu.updated_at || now
                );
                tunesRestored++;
            }

            sqliteDb.exec('COMMIT');
        } catch (err) {
            sqliteDb.exec('ROLLBACK');
            throw err;
        }
    } else {
        if (safeMode === 'replace') {
            jsonStore.length = 0;
            const keptAdmin = usersJsonStore.find(u => u.id === adminUserId);
            usersJsonStore.length = 0;
            if (keptAdmin) usersJsonStore.push(keptAdmin);
        }
        for (const u of users) {
            if (!u || !u.id || !u.username || u.id === adminUserId) continue;
            const idx = usersJsonStore.findIndex(x => x.id === u.id || x.username.toLowerCase() === String(u.username).toLowerCase());
            if (idx >= 0) {
                usersJsonStore[idx].display_name = u.displayName || u.display_name || u.username;
                usersJsonStore[idx].is_admin = (u.isAdmin || u.is_admin) ? 1 : 0;
                usersJsonStore[idx].status = u.status || 'active';
                usersUpdated++;
            } else {
                usersJsonStore.push({
                    id: u.id,
                    username: u.username,
                    password_hash: 'restored_no_password',
                    password_salt: 'restored',
                    display_name: u.displayName || u.display_name || u.username,
                    recovery_phrase: 'restored_no_recovery',
                    is_admin: (u.isAdmin || u.is_admin) ? 1 : 0,
                    status: u.status || 'active',
                    created_at: u.createdAt || now,
                    updated_at: now
                });
                usersInserted++;
                usersWithoutPassword++;
            }
        }
        for (const tu of tunes) {
            if (!tu || !tu.id || !tu.title) continue;
            const idx = jsonStore.findIndex(x => x.id === tu.id);
            if (idx >= 0) jsonStore[idx] = { ...jsonStore[idx], ...tu, updated_at: now };
            else jsonStore.push({ ...tu, created_at: tu.created_at || now, updated_at: tu.updated_at || now });
            tunesRestored++;
        }
        persistUsersJson();
        persistJsonStore();
    }

    logAdminAction({
        adminId: adminUserId,
        action: 'restore_backup',
        targetType: 'system',
        targetId: null,
        details: { mode: safeMode, usersInserted, usersUpdated, usersWithoutPassword, tunesRestored }
    });

    return { ok: true, mode: safeMode, usersInserted, usersUpdated, usersWithoutPassword, tunesRestored };
}

function executeUserDeletion(targetUserId, { keepTunesAnonymously = false } = {}) {
    if (!targetUserId) return { ok: false, anonymizedTunes: 0, deletedTunes: 0 };

    if (dbDriver === 'sqlite') {
        let anonymizedTunes = 0;
        let deletedTunes = 0;

        if (keepTunesAnonymously) {
            // Remove apenas músicas privadas do usuário; mantém públicas de forma anônima
            sqliteDb.prepare('DELETE FROM tune_likes WHERE user_id = ? OR tune_id IN (SELECT id FROM tunes WHERE user_id = ? AND is_public = 0)').run(targetUserId, targetUserId);
            const delPriv = sqliteDb.prepare('DELETE FROM tunes WHERE user_id = ? AND is_public = 0').run(targetUserId);
            deletedTunes = delPriv.changes || 0;
            const anonPub = sqliteDb.prepare("UPDATE tunes SET user_id = NULL, author_name = 'Anônimo' WHERE user_id = ? AND is_public = 1").run(targetUserId);
            anonymizedTunes = anonPub.changes || 0;
        } else {
            sqliteDb.prepare('DELETE FROM tune_likes WHERE user_id = ? OR tune_id IN (SELECT id FROM tunes WHERE user_id = ?)').run(targetUserId, targetUserId);
            const delAll = sqliteDb.prepare('DELETE FROM tunes WHERE user_id = ?').run(targetUserId);
            deletedTunes = delAll.changes || 0;
        }

        sqliteDb.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetUserId);
        const result = sqliteDb.prepare('DELETE FROM users WHERE id = ?').run(targetUserId);
        return {
            ok: result.changes > 0,
            anonymizedTunes,
            deletedTunes
        };
    } else {
        let anonymizedTunes = 0;
        let deletedTunes = 0;

        if (keepTunesAnonymously) {
            const removedPrivIds = new Set(jsonStore.filter(t => t.user_id === targetUserId && !t.is_public).map(t => t.id));
            deletedTunes = removedPrivIds.size;
            jsonStore = jsonStore.filter(t => !(t.user_id === targetUserId && !t.is_public));
            jsonStore = jsonStore.map(t => {
                if (t.user_id === targetUserId && t.is_public) {
                    anonymizedTunes += 1;
                    return { ...t, user_id: null, author_name: 'Anônimo' };
                }
                return t;
            });
            persistJsonStore();
            tuneLikesJsonStore = tuneLikesJsonStore.filter(l => l.user_id !== targetUserId && !removedPrivIds.has(l.tune_id));
            persistTuneLikesJson();
        } else {
            const removedTuneIds = new Set(jsonStore.filter(t => t.user_id === targetUserId).map(t => t.id));
            deletedTunes = removedTuneIds.size;
            jsonStore = jsonStore.filter(t => t.user_id !== targetUserId);
            persistJsonStore();
            tuneLikesJsonStore = tuneLikesJsonStore.filter(l => l.user_id !== targetUserId && !removedTuneIds.has(l.tune_id));
            persistTuneLikesJson();
        }

        sessionsJsonStore = sessionsJsonStore.filter(s => s.user_id !== targetUserId);
        persistSessionsJson();
        const initialLen = usersJsonStore.length;
        usersJsonStore = usersJsonStore.filter(u => u.id !== targetUserId);
        if (usersJsonStore.length !== initialLen) {
            persistUsersJson();
            return { ok: true, anonymizedTunes, deletedTunes };
        }
        return { ok: false, anonymizedTunes: 0, deletedTunes: 0 };
    }
}

/**
 * Exclui a própria conta do usuário autenticado (com opção de manter músicas públicas de forma anônima)
 */
export function deleteOwnAccount(userId, { keepTunesAnonymously = false } = {}) {
    if (!userId || userId === 'usr_admin_oficial') {
        return { ok: false, anonymizedTunes: 0, deletedTunes: 0 };
    }
    return executeUserDeletion(userId, { keepTunesAnonymously });
}

/**
 * Exclui um usuário e gerencia suas músicas (poder de administrador)
 */
export function deleteUserByAdmin(targetUserId, adminUserId, { keepTunesAnonymously = false } = {}) {
    if (!targetUserId || !isAdminUser(adminUserId)) return false;
    // Não permite o admin excluir a si mesmo
    if (targetUserId === adminUserId) return false;

    const res = executeUserDeletion(targetUserId, { keepTunesAnonymously });
    if (res.ok) {
        logAdminAction({
            adminId: adminUserId,
            action: 'user_delete',
            targetType: 'user',
            targetId: targetUserId,
            details: { keepTunesAnonymously, anonymizedTunes: res.anonymizedTunes, deletedTunes: res.deletedTunes }
        });
        return true;
    }
    return false;
}

// ==========================================
// DENÚNCIAS DE CONTEÚDO GERADO POR USUÁRIOS (UGC)
// ==========================================

export function createTuneReport({ tuneId, reporterUserId = null, reason, details = '' }) {
    if (!tuneId || !reason) return null;
    const id = 'rep_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const now = new Date().toISOString();
    const cleanReason = String(reason).trim().slice(0, 80);
    const cleanDetails = String(details || '').trim().slice(0, 500);

    if (dbDriver === 'sqlite') {
        sqliteDb.prepare(`
            INSERT INTO tune_reports (id, tune_id, reporter_user_id, reason, details, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'pending', ?)
        `).run(id, tuneId, reporterUserId || null, cleanReason, cleanDetails, now);
    } else {
        tuneReportsJsonStore.unshift({
            id,
            tune_id: tuneId,
            reporter_user_id: reporterUserId || null,
            reason: cleanReason,
            details: cleanDetails,
            status: 'pending',
            created_at: now,
            resolved_at: null,
            resolved_by: null
        });
        persistTuneReportsJson();
    }

    return { id, tune_id: tuneId, reason: cleanReason, status: 'pending', created_at: now };
}

export function listTuneReports({ status = 'all' } = {}) {
    const cleanStatus = ['pending', 'resolved', 'dismissed'].includes(status) ? status : 'all';

    if (dbDriver === 'sqlite') {
        const whereClause = cleanStatus === 'all' ? '' : 'WHERE r.status = ?';
        const sql = `
            SELECT r.*, t.title AS tune_title, t.author_name AS tune_author, t.is_public AS tune_is_public,
                   t.moderation_status AS tune_moderation_status, u.username AS reporter_username
            FROM tune_reports r
            LEFT JOIN tunes t ON r.tune_id = t.id
            LEFT JOIN users u ON r.reporter_user_id = u.id
            ${whereClause}
            ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.created_at DESC
            LIMIT 200
        `;
        return cleanStatus === 'all'
            ? sqliteDb.prepare(sql).all()
            : sqliteDb.prepare(sql).all(cleanStatus);
    } else {
        return tuneReportsJsonStore
            .filter(r => cleanStatus === 'all' || r.status === cleanStatus)
            .map(r => {
                const t = jsonStore.find(tune => tune.id === r.tune_id);
                const u = r.reporter_user_id ? usersJsonStore.find(user => user.id === r.reporter_user_id) : null;
                return {
                    ...r,
                    tune_title: t ? t.title : null,
                    tune_author: t ? t.author_name : null,
                    tune_is_public: t ? (t.is_public ? 1 : 0) : null,
                    tune_moderation_status: t ? t.moderation_status : null,
                    reporter_username: u ? u.username : null
                };
            })
            .slice(0, 200);
    }
}

export function resolveTuneReport({ reportId, status = 'resolved', adminId, hideTune = false, deleteTune = false }) {
    if (!reportId || !isAdminUser(adminId)) return null;
    const nextStatus = ['resolved', 'dismissed', 'pending'].includes(status) ? status : 'resolved';
    const now = new Date().toISOString();

    let targetTuneId = null;
    if (dbDriver === 'sqlite') {
        const existing = sqliteDb.prepare('SELECT * FROM tune_reports WHERE id = ?').get(reportId);
        if (!existing) return null;
        targetTuneId = existing.tune_id;
        sqliteDb.prepare('UPDATE tune_reports SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?')
            .run(nextStatus, nextStatus === 'pending' ? null : now, nextStatus === 'pending' ? null : adminId, reportId);
    } else {
        const existing = tuneReportsJsonStore.find(r => r.id === reportId);
        if (!existing) return null;
        targetTuneId = existing.tune_id;
        existing.status = nextStatus;
        existing.resolved_at = nextStatus === 'pending' ? null : now;
        existing.resolved_by = nextStatus === 'pending' ? null : adminId;
        persistTuneReportsJson();
    }

    if (targetTuneId && deleteTune) {
        deleteTuneByAdmin(targetTuneId, adminId);
    } else if (targetTuneId && hideTune) {
        moderateTune(targetTuneId, { adminId, isPublic: false, moderationStatus: 'hidden', reason: 'Removido após denúncia da comunidade' });
    }

    logAdminAction({
        adminId,
        action: 'report_resolve',
        targetType: 'tune_report',
        targetId: reportId,
        details: { status: nextStatus, tuneId: targetTuneId, hideTune, deleteTune }
    });

    return { id: reportId, status: nextStatus, tuneId: targetTuneId };
}

// ==========================================
// SEMEADURA DA BIBLIOTECA PADRÃO (REPERTOIRE)
// ==========================================

export function seedCuratedRepertoire() {
    try {
        const now = new Date().toISOString();

        // 1. Garante existência do usuário oficial de Curadoria
        const adminUser = getUserByUsername('admin');
        if (!adminUser) {
            if (dbDriver === 'sqlite') {
                sqliteDb.prepare(`
                    INSERT INTO users (id, username, password_hash, password_salt, display_name, recovery_phrase, is_admin, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
                `).run(
                    'usr_admin_oficial',
                    'admin',
                    'curadoria_lock',
                    'salt_lock',
                    'Tin Whistle Live (Curadoria)',
                    'flauta bardo harpa celta colina brisa orvalho riacho',
                    now,
                    now
                );
            } else {
                usersJsonStore.push({
                    id: 'usr_admin_oficial',
                    username: 'admin',
                    password_hash: 'curadoria_lock',
                    password_salt: 'salt_lock',
                    display_name: 'Tin Whistle Live (Curadoria)',
                    recovery_phrase: 'flauta bardo harpa celta colina brisa orvalho riacho',
                    is_admin: 1,
                    created_at: now,
                    updated_at: now
                });
                persistUsersJson();
            }
        }

        // 2. Importa as músicas de CURATED_REPERTOIRE para o banco de dados
        if (Array.isArray(CURATED_REPERTOIRE) && CURATED_REPERTOIRE.length > 0) {
            let inserted = 0;
            for (const song of CURATED_REPERTOIRE) {
                const existing = getTuneById(song.id);
                saveTune({
                    id: song.id,
                    title: song.title,
                    artist: song.artist || 'Tradicional',
                    key: song.key || 'D',
                    tempo: song.tempo || 110,
                    time_signature: song.timeSignature || '4/4',
                    category: song.category || 'celtic',
                    difficulty: song.difficulty || 'iniciante',
                    rhythm: song.rhythm || 'reel',
                    notes: song.notes || [],
                    author_name: 'Tin Whistle Live (Curadoria)',
                    user_id: 'usr_admin_oficial',
                    is_public: 1,
                    is_curated: 1,
                    accompaniment: song.accompaniment || null,
                    likes: existing ? existing.likes : 0
                });
                if (!existing) inserted++;
            }
            if (inserted > 0) {
                console.log(`[DB] Biblioteca padrão semeada: ${inserted} músicas adicionadas ao banco de dados.`);
            }
        }
    } catch (err) {
        console.warn('[DB] Erro ao semear biblioteca padrão:', err.message);
    }
}

// Executa a semeadura automaticamente na inicialização
try {
    seedCuratedRepertoire();
} catch (e) {
    console.warn('[DB] Semeadura pendente:', e.message);
}



