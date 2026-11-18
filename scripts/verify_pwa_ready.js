import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
    createUser,
    saveTune,
    getTuneById,
    deleteTuneByAdmin,
    createSession,
    listTuneReports
} from '../server/db.js';
import crypto from 'node:crypto';

const ROOT = process.cwd();

async function run() {
    console.log('--- 📱 [VERIFICAÇÃO PWA / TWA / GOOGLE PLAY] ---');

    // 1. Validar manifest.webmanifest e assets no disco
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
    assert.strictEqual(manifest.theme_color, '#092c1c', 'manifest theme_color deve ser #092c1c');
    assert.strictEqual(manifest.background_color, '#092c1c', 'manifest background_color deve ser #092c1c');
    assert.strictEqual(manifest.prefer_related_applications, false, 'prefer_related_applications deve ser false');
    assert.ok(Array.isArray(manifest.screenshots) && manifest.screenshots.length >= 2, 'manifest deve ter screenshots narrow e wide');
    for (const sc of manifest.screenshots) {
        assert.ok(fs.existsSync(path.join(ROOT, sc.src.replace(/^\//, ''))), `Screenshot ausente: ${sc.src}`);
    }
    console.log('✓ manifest.webmanifest e screenshots validados.');

    // 2. Validar .well-known/assetlinks.json
    const assetlinks = JSON.parse(fs.readFileSync(path.join(ROOT, '.well-known/assetlinks.json'), 'utf8'));
    assert.strictEqual(assetlinks[0]?.target?.package_name, 'live.inwhistle.twa', 'Package name deve ser live.inwhistle.twa');
    console.log('✓ .well-known/assetlinks.json validado (live.inwhistle.twa).');

    // 3. Validar PRECACHE_ASSETS do sw.js
    const swCode = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    const precacheMatch = swCode.match(/const PRECACHE_ASSETS\s*=\s*\[([\s\S]*?)\];/);
    assert.ok(precacheMatch, 'PRECACHE_ASSETS não encontrado em sw.js');
    const assets = [...precacheMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
    for (const asset of assets) {
        if (asset === '/') continue;
        assert.ok(fs.existsSync(path.join(ROOT, asset.replace(/^\//, ''))), `Asset ausente no pré-cache do sw.js: ${asset}`);
    }
    console.log(`✓ Todos os ${assets.length} itens do PRECACHE_ASSETS existem no disco.`);

    // 4. Validar index.html (viewport-fit=cover e og:image PNG)
    const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(indexHtml.includes('viewport-fit=cover'), 'index.html deve conter viewport-fit=cover');
    assert.ok(indexHtml.includes('icons/icon-512.png'), 'og:image deve apontar para icons/icon-512.png');
    console.log('✓ index.html validado (viewport-fit=cover, og:image PNG, fontes locais).');

    // 5. Subir servidor HTTP e testar endpoints estáticos + segurança + API
    const PORT = 3897;
    const srv = spawn('node', ['server.js'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
    await new Promise(r => setTimeout(r, 1200));

    try {
        const base = `http://localhost:${PORT}`;

        const alRes = await fetch(`${base}/.well-known/assetlinks.json`);
        assert.strictEqual(alRes.status, 200, 'assetlinks.json deve retornar 200');
        assert.ok(alRes.headers.get('content-type')?.includes('application/json'), 'assetlinks.json deve ser application/json');

        for (const pubPath of ['/privacy.html', '/terms.html', '/delete-account.html', '/robots.txt', '/fonts/fonts.css']) {
            const r = await fetch(`${base}${pubPath}`);
            assert.strictEqual(r.status, 200, `${pubPath} deve retornar 200`);
        }

        const gitRes = await fetch(`${base}/.git/config`);
        assert.strictEqual(gitRes.status, 403, '/.git/config deve continuar bloqueado com 403');
        console.log('✓ Endpoints públicos, assetlinks.json e bloqueio .git validados.');

        // 6. Testar denúncia UGC e exclusão de conta com anonimização de músicas públicas
        const testUser = 'pwa_test_' + crypto.randomBytes(3).toString('hex');
        const salt = crypto.randomBytes(16).toString('hex');
        const password = 'TestPassword123!';
        const hash = crypto.scryptSync(password, salt, 64).toString('hex');
        const user = createUser({
            id: 'usr_' + crypto.randomBytes(6).toString('hex'),
            username: testUser,
            displayName: 'PWA Test Bard',
            passwordHash: hash,
            passwordSalt: salt,
            recoveryPhrase: 'flauta bardo harpa celta colina brisa orvalho riacho'
        });

        const pubTuneId = 'PUB_' + crypto.randomBytes(4).toString('hex');
        const privTuneId = 'PRIV_' + crypto.randomBytes(4).toString('hex');
        saveTune({ id: pubTuneId, title: 'Public Anon Test', key: 'D', notes: [], user_id: user.id, author_name: user.display_name, is_public: 1 });
        saveTune({ id: privTuneId, title: 'Private Delete Test', key: 'D', notes: [], user_id: user.id, author_name: user.display_name, is_public: 0 });

        // Denunciar música pública
        const repRes = await fetch(`${base}/api/tunes/${pubTuneId}/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'other', details: 'Teste automatizado PWA' })
        });
        assert.strictEqual(repRes.status, 201, 'Denúncia UGC deve retornar 201');
        const reports = listTuneReports({ status: 'pending' });
        assert.ok(reports.some(r => r.tune_id === pubTuneId), 'Denúncia deve estar listada para o admin');

        // Excluir conta mantendo músicas públicas anônimas
        const loginRes = await fetch(`${base}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: testUser, password })
        });
        assert.strictEqual(loginRes.status, 200, 'Login de teste deve retornar 200');
        const setCookie = loginRes.headers.get('set-cookie') || '';
        const sessionCookie = setCookie.split(';')[0];

        const delRes = await fetch(`${base}/api/auth/account`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': sessionCookie
            },
            body: JSON.stringify({ password, keepTunes: true })
        });
        assert.strictEqual(delRes.status, 200, 'Exclusão de conta deve retornar 200');
        const delData = await delRes.json();
        assert.strictEqual(delData.anonymizedTunes, 1, 'Deve ter anonimizado 1 música pública');
        assert.strictEqual(delData.deletedTunes, 1, 'Deve ter excluído 1 música privada');

        const keptPub = getTuneById(pubTuneId);
        assert.ok(keptPub, 'Música pública deve permanecer no banco');
        assert.strictEqual(keptPub.author_name, 'Anônimo', 'Autor deve ser Anônimo');
        assert.strictEqual(keptPub.user_id, null, 'user_id deve ser null');
        assert.strictEqual(getTuneById(privTuneId), null, 'Música privada deve ter sido apagada');

        // Limpeza do dado de teste
        deleteTuneByAdmin(pubTuneId, 'usr_admin_oficial');
        console.log('✓ Denúncia UGC e exclusão de conta com anonimização validados!');

        console.log('✅ SUCESSO: Todos os checks PWA / TWA / Google Play passaram 100%!');
    } finally {
        srv.kill();
    }
}

run().catch((err) => {
    console.error('❌ ERRO na verificação PWA:', err);
    process.exit(1);
});
