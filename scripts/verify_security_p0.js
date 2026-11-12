import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { saveTune, deleteTuneByAdmin, getTuneById } from '../server/db.js';

const PORT = 3199;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(`${BASE_URL}/api/health`);
            if (res.ok) return;
        } catch {}
        await sleep(150);
    }
    throw new Error('Servidor de teste P0 não iniciou a tempo');
}

console.log('--- 🛡️ [SECURITY P0 VERIFICATION] ---');

const serverProc = spawn('node', ['server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe']
});

const createdTuneIds = [];

try {
    await waitForServer();

    // 1. Verificar allowlist pública e bloqueio de arquivos internos
    const publicPaths = ['/', '/index.html', '/app.js', '/sw.js', '/src/state/store.js', '/src/ui/libraryMastery.js'];
    for (const p of publicPaths) {
        const res = await fetch(`${BASE_URL}${p}`);
        assert.equal(res.status, 200, `Caminho público deveria retornar 200: ${p}`);
        assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
        assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
        if (p === '/' || p === '/index.html') {
            assert.ok(res.headers.get('content-security-policy'), 'CSP ausente no HTML');
        }
    }

    const blockedPaths = [
        '/data/tinwhistle.db',
        '/server/api.js',
        '/server/db.js',
        '/scripts/verify_db_api.js',
        '/scripts/test-mic.html',
        '/test-mic.html',
        '/package.json',
        '/tinwhistle.service',
        '/ROADMAP.md',
        '/.git/HEAD',
        '/..%2fserver/db.js'
    ];
    for (const p of blockedPaths) {
        const res = await fetch(`${BASE_URL}${p}`);
        assert.ok(res.status === 403 || res.status === 404, `Caminho sensível exposto (${res.status}): ${p}`);
    }
    console.log('✓ Allowlist estática, bloqueio de arquivos internos e headers de segurança validados.');

    // 2. Verificar CORS estrito (sem * + credentials)
    const evilCors = await fetch(`${BASE_URL}/api/health`, {
        headers: { Origin: 'https://evil.example' }
    });
    assert.equal(evilCors.headers.get('access-control-allow-origin'), null, 'Origem externa não autorizada não deve receber ACAO');

    const localCors = await fetch(`${BASE_URL}/api/health`, {
        headers: { Origin: `http://127.0.0.1:${PORT}` }
    });
    assert.equal(localCors.headers.get('access-control-allow-origin'), `http://127.0.0.1:${PORT}`);
    assert.equal(localCors.headers.get('access-control-allow-credentials'), 'true');
    console.log('✓ Política CORS validada.');

    // 3. Criar partitura anônima (user_id: null) e usuário comum para testar restrição
    const anonTuneId = 'ANON_' + Date.now().toString().slice(-6);
    saveTune({
        id: anonTuneId,
        title: 'Partitura Sem Autor P0',
        notes: [{ note: 'D5', duration: 1 }],
        user_id: null,
        is_public: 1
    });
    createdTuneIds.push(anonTuneId);

    // Anônimo não pode PUT nem visibility
    const anonPut = await fetch(`${BASE_URL}/api/tunes/${anonTuneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Alterado Anonimamente' })
    });
    assert.equal(anonPut.status, 401, 'PUT anônimo deve retornar 401');

    const anonVis = await fetch(`${BASE_URL}/api/tunes/${anonTuneId}/visibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: false })
    });
    assert.equal(anonVis.status, 401, 'POST visibility anônimo deve retornar 401');

    // Registrar usuário comum
    const uname = 'secp0_' + Date.now().toString().slice(-6);
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uname, password: 'Password123!', displayName: 'Bardo P0' })
    });
    assert.equal(regRes.status, 201, 'Registro de usuário teste falhou');
    const regData = await regRes.json();
    const userToken = regData.token;
    assert.ok(userToken, 'Token de sessão ausente');

    // Usuário comum NÃO pode editar partitura sem autor (user_id === null)
    const userPutAnon = await fetch(`${BASE_URL}/api/tunes/${anonTuneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ title: 'Sequestro de Legada' })
    });
    assert.equal(userPutAnon.status, 403, 'Usuário comum não pode editar música sem autor (somente admin)');

    const userVisAnon = await fetch(`${BASE_URL}/api/tunes/${anonTuneId}/visibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ is_public: false })
    });
    assert.equal(userVisAnon.status, 403, 'Usuário comum não pode alterar visibilidade de música sem autor');

    // Usuário comum NÃO pode sobrescrever música curada ou alheia via POST /api/tunes com id colidente
    const hijackCurated = await fetch(`${BASE_URL}/api/tunes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
            id: 'DkuEQVzq',
            title: 'Sequestro Curada',
            notes: [{ note: 'D5', duration: 1 }]
        })
    });
    assert.equal(hijackCurated.status, 403, 'POST /api/tunes com ID de curada deve retornar 403');

    const hijackAnon = await fetch(`${BASE_URL}/api/tunes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
            id: anonTuneId,
            title: 'Sequestro Anon',
            notes: [{ note: 'D5', duration: 1 }]
        })
    });
    assert.equal(hijackAnon.status, 409, 'POST /api/tunes com ID colidente deve retornar 409');

    // Usuário comum cria própria música e tenta enviar áudio inválido no /demo
    const ownTuneId = 'OWN_' + Date.now().toString().slice(-6);
    const createOwn = await fetch(`${BASE_URL}/api/tunes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
            id: ownTuneId,
            title: 'Minha Musica P0',
            notes: [{ note: 'D5', duration: 1 }]
        })
    });
    assert.equal(createOwn.status, 201);
    createdTuneIds.push(ownTuneId);

    const badDemo = await fetch(`${BASE_URL}/api/tunes/${ownTuneId}/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ audio_demo: 'data:text/html;base64,PHNjcmlwdD4=' })
    });
    assert.equal(badDemo.status, 400, 'Upload de data URL não-áudio em /demo deve retornar 400');

    console.log('✓ Regras de posse (user_id null -> admin only), anticolisão em POST e validação MIME de demo validadas.');

    // 4. Verificar Service Worker
    const swSrc = fs.readFileSync(path.join(process.cwd(), 'sw.js'), 'utf8');
    assert.ok(swSrc.includes('/src/state/store.js'), 'sw.js deve incluir /src/state/store.js');
    assert.ok(swSrc.includes('/src/ui/libraryMastery.js'), 'sw.js deve incluir /src/ui/libraryMastery.js');
    assert.ok(swSrc.includes("startsWith('/api/')"), 'sw.js deve ignorar rotas /api/');
    console.log('✓ Service Worker verificado.');

    console.log('✅ SUCESSO: Todos os testes de Segurança P0 passaram 100%!\n');
} finally {
    for (const id of createdTuneIds) {
        try {
            if (getTuneById(id)) {
                deleteTuneByAdmin(id, 'usr_admin_oficial');
            }
        } catch {}
    }
    serverProc.kill('SIGTERM');
}
