import { 
    saveTune, 
    getTuneById, 
    countTunes, 
    getDbDriver,
    createUser,
    getUserByUsername,
    updateTuneVisibility,
    deleteTune
} from '../server/db.js';
import crypto from 'node:crypto';

console.log('--- 🗄️ [DATABASE & API INTEGRATION CHECK] ---');

console.log(`[DB Check] Driver ativo: ${getDbDriver()}`);
if (getDbDriver() !== 'sqlite') {
    console.warn('⚠️ Alerta: Driver SQLite não está ativo, usando fallback.');
}

const testUserId = 'usr_test_' + Date.now().toString().slice(-6);
const testUsername = 'tester_' + Date.now().toString().slice(-6);
const testId = 'TEST_' + Math.random().toString(36).substring(2, 8);
const testTitle = 'Tune de Teste Automatizado';

try {
    // 1. Testar criação e autenticação de Bardo (Usuário)
    console.log(`[Teste 1] Testando criação de usuário e autenticação...`);
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync('senha123', salt, 64).toString('hex');
    const user = createUser({
        id: testUserId,
        username: testUsername,
        passwordHash: hash,
        passwordSalt: salt,
        displayName: 'Bardo Testador',
        recoveryPhrase: 'flauta bardo harpa celta trevo reel jig polka'
    });
    if (!user || !user.id) throw new Error('Falha na criação de usuário');
    const foundUser = getUserByUsername(testUsername);
    if (!foundUser || foundUser.display_name !== 'Bardo Testador') {
        throw new Error('Usuário criado não foi recuperado corretamente');
    }
    console.log('✓ Criação e recuperação de usuário com scryptSync validadas.');

    // 2. Criar e salvar partitura de teste
    console.log(`[Teste 2] Criando partitura de teste (ID: ${testId})...`);
    const saved = saveTune({
        id: testId,
        user_id: testUserId,
        title: testTitle,
        artist: 'Antigravity Test',
        key: 'D',
        tempo: 120,
        time_signature: '4/4',
        category: 'celtic',
        difficulty: 'iniciante',
        rhythm: 'reel',
        notes_json: JSON.stringify([{ note: 'D5', duration: 1 }]),
        author_name: 'Test Runner',
        is_public: 0
    });

    if (!saved) throw new Error('Falha ao salvar partitura');
    console.log('✓ Partitura salva com sucesso no banco de dados.');

    // 3. Recuperar partitura pelo ID
    console.log(`[Teste 3] Recuperando partitura pelo ID...`);
    const retrieved = getTuneById(testId);
    if (!retrieved || retrieved.title !== testTitle) {
        throw new Error(`Partitura não encontrada ou dados inconsistentes. Obtido: ${JSON.stringify(retrieved)}`);
    }
    console.log('✓ Partitura recuperada e dados íntegros.');

    // 4. Atualizar visibilidade (Privada -> Pública)
    console.log(`[Teste 4] Atualizando visibilidade para pública...`);
    const updatedVis = updateTuneVisibility(testId, testUserId, 1);
    if (!updatedVis) throw new Error('Falha ao atualizar visibilidade');
    const checkedVis = getTuneById(testId);
    if (checkedVis.is_public !== 1) throw new Error('Visibilidade não foi atualizada para 1');
    console.log('✓ Visibilidade pública confirmada.');

    // 5. Limpeza: Remover a partitura de teste
    console.log(`[Teste 5] Limpando dados de teste...`);
    const deleted = deleteTune(testId, testUserId);
    if (!deleted) throw new Error('deleteTune retornou false');
    const afterDelete = getTuneById(testId);
    if (afterDelete) throw new Error('Partitura de teste não foi removida');
    console.log('✓ Limpeza concluída sem deixar resíduos no banco.');

    console.log('✅ SUCESSO: Todos os testes de Banco de Dados e API passaram 100%!\n');
    process.exit(0);
} catch (err) {
    console.error('❌ FALHA nos testes de Banco de Dados:', err);
    try { deleteTune(testId, testUserId); } catch (_) {}
    process.exit(1);
}
