/**
 * TESTE AUTOMATIZADO: FASE 13 (PILAR 2 - FLUIDEZ DE UX, POPOVERS INLINE, SEEK E ASSISTENTE DE SOPRO)
 */

import assert from 'node:assert';
import fs from 'node:fs';

console.log('--- INICIANDO TESTES DA FASE 13 (UX, POPOVERS, SEEK & EMBOCADURA) ---\n');

// 1. Verificação de Ausência de Diálogos Nativos Bloqueantes
console.log('[Teste 1] Verificando eliminação total de diálogos nativos bloqueantes...');
const appCode = fs.readFileSync('app.js', 'utf8');

// Não deve haver nenhum alert()
const alertMatches = appCode.match(/\balert\s*\(/g);
assert.strictEqual(alertMatches, null, 'Nenhuma chamada a alert() deve restar em app.js');

// Não deve haver nenhum prompt() para acordes (apenas o deferredPwaInstallPrompt.prompt() da API PWA)
const chordPromptMatch = appCode.includes("prompt('Digite o Acorde");
assert.strictEqual(chordPromptMatch, false, 'O prompt() nativo de cifras de notas deve ser totalmente substituído');
console.log('✓ Zero caixas de diálogo nativas bloqueantes (alert/prompt de notas removidos com sucesso).');

// 2. Verificação de Popovers Visuais Inline em app.js
console.log('\n[Teste 2] Verificando implementação dos Popovers Inline (Acordes e Durações)...');
assert(appCode.includes('function openChordPopover('), 'openChordPopover deve estar declarada');
assert(appCode.includes('function openDurationPopover('), 'openDurationPopover deve estar declarada');
assert(appCode.includes('function closeActivePopover('), 'closeActivePopover deve estar declarada');

// Validação dos acordes celtas incluídos
const celticChords = ['D', 'G', 'A', 'Bm', 'Em', 'C', 'Am', 'Dm', 'F#m'];
celticChords.forEach(ch => {
    assert(appCode.includes(`'${ch}'`), `Lista de acordes rápidos deve conter ${ch}`);
});

// Validação das durações suportadas (incluindo pontuadas)
const requiredDurations = [0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0];
requiredDurations.forEach(dur => {
    assert(appCode.includes(`val: ${dur}`), `Popover de durações deve suportar duração ${dur}`);
});
console.log('✓ Popovers inline de cifras e durações completas (incluindo pontuadas 1.5t e 3t) validados.');

// 3. Verificação do Seek Musical em Tempo Real e Loop em 1 Clique
console.log('\n[Teste 3] Verificando Seek Musical em Tempo Real e Loop A-B...');
assert(appCode.includes('function seekPlaybackToNote('), 'seekPlaybackToNote deve estar implementada');
assert(appCode.includes('seekPlaybackToNote(index)'), 'Clique na nota durante reprodução ativa deve acionar seek');
assert(appCode.includes('function loopSelection('), 'loopSelection deve estar implementada');
assert(appCode.includes('function loopMeasure('), 'loopMeasure deve estar implementada');
assert(appCode.includes('measure-bar-btn-loop'), 'Botão de loop por compasso deve estar presente na barra de compasso');
assert(appCode.includes('btn-loop-selection'), 'Botão de loop na seleção deve estar integrado');
console.log('✓ Seek musical contínuo e botões de Loop A-B (na seleção e por compasso) validados.');

// 4. Verificação do Assistente de Sopro e Embocadura no Play-Along
console.log('\n[Teste 4] Verificando Assistente de Sopro e Embocadura no Play-Along...');
assert(appCode.includes('pa-breath-hint'), 'Elemento pa-breath-hint deve ser manipulado');
assert(appCode.includes("t('playalong.tipFirm')") || appCode.includes('💨 Sopre um pouco mais firme (2ª Oitava)'), 'Dica de sopro firme para 2ª oitava deve existir');
assert(appCode.includes("t('playalong.tipSoft')") || appCode.includes('🍃 Suavize o sopro (1ª Oitava)'), 'Dica de sopro suave para 1ª oitava deve existir');
assert(appCode.includes("t('playalong.perfectEmbouchure')") || appCode.includes('✨ Embocadura perfeita!'), 'Dica de embocadura perfeita deve existir');

// Validação CSS das classes de sopro
const cssCode = fs.readFileSync('css/components.css', 'utf8');
assert(cssCode.includes('.pa-breath-hint'), 'Classe .pa-breath-hint deve existir no CSS');
assert(cssCode.includes('.hint-blow-harder'), 'Classe .hint-blow-harder deve existir no CSS');
assert(cssCode.includes('.hint-blow-softer'), 'Classe .hint-blow-softer deve existir no CSS');
assert(cssCode.includes('.hint-in-tune'), 'Classe .hint-in-tune deve existir no CSS');
assert(cssCode.includes('.whistle-inline-popover'), 'Classe .whistle-inline-popover deve existir no CSS');
assert(cssCode.includes('.chord-popover-grid'), 'Classe .chord-popover-grid deve existir no CSS');
assert(cssCode.includes('.duration-popover-list'), 'Classe .duration-popover-list deve existir no CSS');
console.log('✓ Assistente de embocadura (dicas de 1ª/2ª oitava e sopro) e estilos CSS validados.');

// 5. Verificação da Integridade do HTML
console.log('\n[Teste 5] Verificando elementos no index.html...');
const htmlCode = fs.readFileSync('index.html', 'utf8');
assert(htmlCode.includes('id="btn-loop-selection"'), 'index.html deve conter btn-loop-selection');
assert(htmlCode.includes('id="pa-breath-hint"'), 'index.html deve conter pa-breath-hint');
console.log('✓ Elementos visuais confirmados em index.html.');

console.log('\n=========================================================================');
console.log(' TODOS OS TESTES DA FASE 13 FORAM CONCLUÍDOS COM 100% DE SUCESSO! ');
console.log('=========================================================================\n');
