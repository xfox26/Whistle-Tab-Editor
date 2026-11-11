import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

console.log('--- 🔍 [JS SYNTAX & INTEGRITY CHECK] ---');

const ROOT_DIR = process.cwd();
const DIRS_TO_CHECK = ['src', 'server', 'scripts'];
const ROOT_FILES = ['app.js', 'server.js', 'repertoire.js', 'sw.js'];

const filesToCheck = [];

// Arquivos da raiz
for (const f of ROOT_FILES) {
    const full = path.join(ROOT_DIR, f);
    if (fs.existsSync(full)) filesToCheck.push(full);
}

// Arquivos nos diretórios recursivamente
function collectJsFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name !== 'node_modules' && ent.name !== '.git') {
                collectJsFiles(full);
            }
        } else if (ent.isFile() && ent.name.endsWith('.js')) {
            filesToCheck.push(full);
        }
    }
}

for (const d of DIRS_TO_CHECK) {
    collectJsFiles(path.join(ROOT_DIR, d));
}

console.log(`[Syntax Check] Verificando ${filesToCheck.length} arquivos JavaScript...`);

let errorsCount = 0;

for (const fpath of filesToCheck) {
    const rel = path.relative(ROOT_DIR, fpath);
    try {
        execSync(`node --check "${fpath}"`, { stdio: 'pipe' });
    } catch (err) {
        errorsCount++;
        console.error(`❌ Erro de sintaxe em: ${rel}`);
        console.error(err.stderr ? err.stderr.toString() : err.message);
    }
}

if (errorsCount > 0) {
    console.error(`\n❌ FALHA: ${errorsCount} arquivo(s) com erros de sintaxe encontrados!`);
    process.exit(1);
} else {
    console.log(`✅ SUCESSO: Todos os ${filesToCheck.length} arquivos JS possuem sintaxe 100% válida.\n`);
    process.exit(0);
}
