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

    // Criação da tabela e índices de busca
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
    `);
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
        created_at: tune.created_at || now,
        updated_at: now
    };

    if (dbDriver === 'sqlite') {
        const stmt = sqliteDb.prepare(`
            INSERT INTO tunes (id, title, artist, key, tempo, time_signature, category, difficulty, rhythm, notes_json, author_name, likes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            SELECT id, title, artist, key, tempo, time_signature, category, difficulty, rhythm, author_name, likes, created_at
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
