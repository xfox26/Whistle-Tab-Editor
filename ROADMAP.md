# 📜 Celtic Whistle Tab Editor - Roadmap & Backlog de Ideias

Este documento reúne todas as ideias, sugestões e planos de funcionalidades futuras mapeadas para a evolução contínua da ferramenta de criação, edição e manutenção de tablaturas para **Tin Whistle**.

---

## 📌 Status Atual do Desenvolvimento

### ✅ Fase 1: Edição & Notação Musical (Concluída)
- [x] **Suporte a Arquivos ABC (ABC Notation):**
  - Importador e Exportador compatível com o formato padrão celta ([TheSession.org](https://thesession.org)).
  - Reconhecimento automático de cabeçalhos (`T:`, `M:`, `K:`, `L:`, `Q:`), notas, acidentes (`^`, `_`, `=`), durações relativas e cifras (`"Am"`, `"D"`).
- [x] **Compassos e Barras de Compasso (*Measure Bars*):**
  - Fórmulas de compasso (4/4, 6/8, 3/4, 2/4, 9/8, etc.).
  - Inserção e renderização de barras de compasso simples (`|`), duplas (`||`) e repetições (`|:`, `:|`).
  - Agrupamento visual de notas por compasso com numeração.
- [x] **Ornamentações Tradicionais de Tin Whistle:**
  - Símbolos visuais dedicados sobre cada nota:
    - **Cut** (corte rápido com furo superior - símbolo `^`)
    - **Strike / Tap** (batida rápida de dedo inferior - símbolo `v`)
    - **Roll** (Long roll e Short roll - símbolo `~`)
    - **Cran** (ornamentação típica da nota Ré - símbolo `*`)
    - **Slide** (glissando / portamento ascendente - símbolo `/`)
  - Reprodução auditiva no sintetizador para os ornamentos.
- [x] **Linha de Cifras / Acordes (Chords):**
  - Campo editável de cifras harmônicas em cada nota ou início de compasso para acompanhamento (violão, bouzouki, teclado).
- [x] **Histórico de Edição Completo (Undo / Redo):**
  - Pilha de ações com atalhos universais: `Ctrl+Z` (Desfazer) e `Ctrl+Y` / `Ctrl+Shift+Z` (Refazer).
- [x] **Seleção Ativa & Inserção no Meio da Melodia:**
  - Cursor ou clique em uma nota existente para selecioná-la.
  - Teclado virtual / digitação com suporte a Substituir, Inserir Depois, Inserir Antes ou Adicionar ao Final.
- [x] **Seleção em Bloco, Copiar, Colar e Duplicar:**
  - Seleção contínua (arrastar ou Shift+clique) para copiar (Ctrl+C), colar (Ctrl+V) ou duplicar trechos de frases/partes (Partes A/B de tunes).

---

### ✅ Fase 2: Prática, Áudio & Treinamento (Concluída)
- [x] **Divisão da Interface em Duas Áreas Distintas:**
  - **Área de Criação & Edição (Estúdio):** Ferramentas completas de edição, teclado virtual de digitações, entrada por texto, inserção de compassos e transposição.
  - **Área de Prática & Treinamento (Prática):** Interface limpa, ampla e livre de poluição visual, otimizada para estante de partitura e estudo musical com a flauta na mão.
- [x] **Loop A-B (Repetição A-B de Estudo):**
  - Definição visual do ponto de início (A) e ponto de término (B) na tablatura com badges flutuantes e destaque do trecho.
  - Repetição contínua do trecho demarcado para treino motor e memorização de frases difíceis.
- [x] **Contagem Inicial (Count-in):**
  - 1 compasso de metrônomo antes da reprodução começar, com feedback visual na tela (1.. 2.. 3.. 4..) e áudio síncrono.
- [x] **Bordão Celta Contínuo de Afinação (Drone):**
  - Sintetizador com harmônicos ricos de palheta dupla/bordão (estilo *Uilleann Pipes* / Gaita Irlandesa) afinado na tônica e quinta da flauta (ex: Ré + Lá para flauta em D).
  - Controle de volume independente e liga/desliga para treino de embocadura e afinação.
- [x] **Acelerador Gradual (Speed Trainer):**
  - Aumento automático do BPM a cada repetição do loop (+2, +4, +6 ou +10 BPM por ciclo), desenvolvendo velocidade técnica progressiva.
- [x] **Controle de Zoom da Partitura & Modo Tela Cheia:**
  - Ajuste de escala dos diagramas (85% a 140%) e foco em tela cheia para leitura à distância na estante de partitura.

---

### ✅ Fase 3: Biblioteca, Curadoria & Repertório (Concluída)
- [x] **Arquitetura Híbrida de Armazenamento:**
  - Catálogo imutável de referência em `repertoire.js` (livre de consumo da cota de 5MB do `localStorage`).
  - Armazenamento dedicado para composições próprias do usuário em `celtic_whistle_tabs_user`.
  - Preservação da versão original de fábrica com possibilidade de redefinir músicas curadas editadas.
- [x] **Menu Lateral Expansível / Colapsável:**
  - Botão de colapso rápido na sidebar para maximizar a largura da tela de edição/prática em 100%.
  - Botão flutuante na margem esquerda para reabertura com 1 clique.
  - Memorização de preferência de colapso no navegador.
- [x] **Painel de Filtros e Busca Rápida:**
  - Filtro por Categoria: *Todas, Tradicional Celta, Filmes/Pop, Minhas Músicas*.
  - Filtro por Nível de Dificuldade: *Iniciante (★☆☆), Intermediário (★★☆), Avançado (★★★)*.
  - Filtro por Ritmo: *Jig (6/8 e 9/8), Reel (4/4), Valsa (3/4), Polka (2/4), Slow Air, Trilha Sonora*.
  - Busca em tempo real por título, compositor ou estilo com contador dinâmico de resultados.
- [x] **Acervo Nativo Expandido com Domínio Público & Cultura Pop / Filmes:**
  - *Concerning Hobbits / The Shire* (O Senhor dos Anéis)
  - *Song of Storms* (The Legend of Zelda: Ocarina of Time)
  - *For the Love of a Princess* (Braveheart / Coração Valente)
  - *My Heart Will Go On* (Tema de Abertura - Titanic)
  - *He's a Pirate* (Piratas do Caribe)
  - *The Kesh Jig* (Jig irlandesa clássica)
  - *The Butterfly* (Slip Jig 9/8)
  - *Drowsy Maggie* (Reel tradicional acelerado)
  - *Cooley's Reel* (Reel célebre de Joe Cooley)
  - *Down by the Salley Gardens* (Slow Air / Balada)
  - *The Foggy Dew* (Marcha / Canto histórico)
  - *Scarborough Fair* (Balada renascentista tradicional)
  - *The Star of the County Down* (Balada folclórica)
  - *Sí Bheag, Sí Mhór* (Valsa de Turlough O'Carolan)
  - *Ballydesmond Polka No. 2* (Polka Kerry)
  - *Morrison's Jig* (Jig com ornamentações autênticas)
  - *Amazing Grace* (Hino tradicional)

---

### ✅ Fase 4: Visualização, Layout & Personalização (Concluída)
- [x] **Opções de Exibição Customizáveis:**
  - Alternar individualmente a visibilidade de: nome das notas (letras), cifras, letras da música, durações e ornamentações.
  - Modo Treino Cego / Dedilhado Puro (exibe estritamente os furos da flauta para memorização motora).
  - Controle de espaçamento entre cartões: Compacto, Padrão e Amplo.
- [x] **Exportação Gráfica em Alta Resolução:**
  - Exportação vetorial pura sem distorções (`.svg`) com estilos embutidos e pronto para editores vetoriais.
  - Exportação de imagem PNG em 300 DPI (`.png`) via renderização de canvas de alta definição.
- [x] **Temas Visuais de Interface:**
  - 🍀 Pergaminho Celta (Esmeralda & Dourado medieval).
  - 🌌 Dark Obsidian (Alto contraste escuro com ciano/neon).
  - 📜 Papel Claro / Sépia (Manuscrito medieval clássico).
  - 🖨️ Impressão P&B (Monocromático otimizado para economia de tinta).
  - Seletor rápido de temas na barra de navegação superior e persistência no `localStorage`.
- [x] **Exportação de Áudio & MIDI:**
  - Exportação de arquivo Standard MIDI (.mid SMF Type 0) gerado em puro JS com fórmula de compasso, BPM e transposição tonal da flauta.
  - Renderização direta de áudio sintetizado em alta qualidade (`.wav` estéreo 44.1kHz 16-bit) via `OfflineAudioContext` com modelagem física de Tin Whistle e ornamentos.

---

### ✅ Fase 5: Sistema Interativo de "Play-Along" por Microfone (Concluída)
- [x] **Módulo Avançado de Escuta Ativa:**
  - Detecção precisa de pitch por autocorrelação e VU meter de sensibilidade em tempo real.
  - Suporte a microfones móveis (Android) e desktop sem ruído de retorno.
  - Calibração adaptativa de ruído ambiente de 2 segundos (*Noise Gate*) com filtro passa-faixa Biquad dedicado à extensão da Tin Whistle.
- [x] **Dois Modos de Treino Interativo:**
  - Modo "Passo a Passo" (*Wait for Me*): A partitura espera o músico tocar a nota correta na flauta antes de avançar (com detecção de pausa/articulação entre notas repetidas).
  - Modo "No Ritmo" (*Flow Mode*): A partitura avança no BPM configurado e avalia a precisão rítmica e de afinação.
- [x] **Pontuação e Relatório de Treino:**
  - Cálculo de acurácia (%), combo máximo de acertos, classificação com estrelas célticas (1 a 3 estrelas) e modal de celebração ao final do treino.

---

## 🛠️ Backlog Técnico: Otimizações de Código, Correções & Arquitetura

Revisão técnica detalhada do código-fonte atual (`app.js`, `index.html`, `styles.css`, `repertoire.js`) com foco em performance, estabilidade, redução de duplicação e manutenibilidade:

### ⚡ 1. Performance de Áudio, Memória & Renderização
- [x] **Cache de Buffer de Ruído (*Breath Chiff*) no Sintetizador (`playWhistleSynth`):**
  - *Diagnóstico:* Atualmente, `playWhistleSynth()` instancia um novo `AudioBuffer` de 2 segundos (`sampleRate * 2` = ~88.200 amostras float com `Math.random()`) a cada nota tocada.
  - *Otimização:* Gerar o buffer de ruído branco uma única vez por contexto (`getOrCreateNoiseBuffer`) e reutilizá-lo em todas as notas, reduzindo drasticamente o uso de CPU e alocações de memória em músicas rápidas (Reels/Jigs).
- [x] **Zero-Allocation no Loop de 60 FPS do Microfone (`updatePlayAlongAudioLoop` & `updatePitchLoop`):**
  - *Diagnóstico:* Um novo `new Float32Array(analyser.fftSize)` é alocado a cada frame de `requestAnimationFrame` (60x/seg), gerando pressão contínua no *Garbage Collector*.
  - *Otimização:* Pré-alocar um buffer único reutilizável (`getSharedAudioBuffer`) para leitura de `getFloatTimeDomainData()`.
- [x] **Unificação do Algoritmo de Pitch Detection (`detectWhistlePitch` vs `autoCorrelatePitch`):**
  - *Diagnóstico:* O Modo Play-Along utiliza `detectWhistlePitch()` (otimizado com limites de lag de 260Hz–2200Hz, passo `i += 2` e interpolação parabólica sub-amostral), enquanto o Afinador do Modo Prática ainda usa `autoCorrelatePitch()` ($O(N^2)$ bruto com `Array.fill` a cada frame).
  - *Otimização:* Unificar ambos os modos no motor otimizado `detectWhistlePitch()`, reduzindo o custo de CPU do afinador em ~70% e aumentando a precisão em cents.
- [x] **Unificação do Sintetizador Online e Offline (`playWhistleSynth` & `scheduleWhistleToneOffline`):**
  - *Diagnóstico:* A exportação `.wav` usa `scheduleWhistleToneOffline()`, que não inclui os ornamentos `cran` e `slide` nem o sopro (*chiff*) presentes no sintetizador ao vivo.
  - *Otimização:* Parametrizar uma única função `scheduleWhistleVoice(ctx, frequency, duration, startTime, ornament)` compartilhada entre o playback em tempo real e o `OfflineAudioContext`.
- [x] **Sequenciador com Compensação de *Drift* & Metrônomo por Compasso:**
  - *Diagnóstico:* `playNextStep()` agenda notas via `setTimeout`, sujeito a *jitter/drift* do navegador, e dispara o clique do metrônomo a cada nota (em vez de bater nos tempos reais do compasso).
  - *Otimização:* Implementar compensação temporal de *drift* (`performance.now()`) e agendamento de cliques do metrônomo nos tempos reais do compasso (`getMeasureBeatsPerBar`), com acentuação sonora no tempo 1 (*downbeat*).
- [x] **Renderização Otimizada do DOM (`renderTab` / `renderSidebar`) e *Debounce* no Editor de Texto:**
  - *Diagnóstico:* Qualquer edição reconstrói todos os `.note-card` e insere um a um no DOM. Em `handleTextNotesInput()`, cada tecla digitada dispara `pushHistoryState()`, `saveSongsToStorage()` e `renderTab()`.
  - *Otimização:* Utilizar `DocumentFragment` em `renderTab()` e `renderSidebar()`, içar constantes para fora do loop de notas e aplicar *debounce* de 150ms com agrupamento inteligente de snapshots de Undo (`1.2s`) na entrada por texto.

### 🐛 2. Consistência de Dados, Casos de Borda & Correções
- [x] **Comparação por Nota MIDI Real e Enarmonia no Play-Along e Afinador (`checkPlayAlongNoteMatch` & `getWhistleNoteTarget`):**
  - *Diagnóstico:* O comparador textual usa `NOTE_STRINGS` (que só contém sustenidos), falhando em notas bemóis (`Bb`, `Eb`, `Ab`, `Db`) quando a flauta está transposta para `C`, `F`, `Bb` ou `Eb`, além de detectar incorretamente a 2ª oitava em `getWhistleNoteTarget`.
  - *Correção:* Calcular a frequência transposta e o número MIDI real esperado da nota (`expectedMidi = noteFromPitchVal(getTransposedFrequency(noteKey, currentKey))`), usar `isNoteOctave2()` e validar equivalência enarmônica por classe de altura MIDI (`detectedMidi % 12 === expectedMidi % 12`).
- [x] **Preservação de Durações, Cifras e Ornamentos no `blur` do Editor de Texto & Undo no "Limpar Tudo":**
  - *Diagnóstico:* O listener `blur` de `#text-notes-input` chamava `noteKeyToNotation(n.note)` em vez de `noteObjToNotation(n, whistleKey)`, sobrescrevendo o texto com durações padrão e removendo cifras e ornamentos visíveis no campo. Além disso, o botão "Limpar Tudo" não registrava snapshot no histórico de Undo.
  - *Correção:* Formatar com `noteObjToNotation(n, whistleKey)` no `blur` e registrar `pushHistoryState('Limpar Tudo')` antes de limpar a partitura.
- [x] **Sincronização de `userSongs` na Importação JSON/ABC e Limpeza do `localStorage`:**
  - *Diagnóstico:* Músicas importadas via JSON ou modal ABC eram inseridas em `songs`, mas não em `userSongs`, fazendo com que não fossem carregadas de `celtic_whistle_tabs_user` após recarregar a página. Além disso, `saveSongsToStorage()` ainda gravava a chave legada `celtic_whistle_tabs` com todo o catálogo curado.
  - *Correção:* Garantir que toda música importada via JSON ou ABC seja registrada em `userSongs` (`isCurated: false`) e remover a gravação redundante da chave legada `celtic_whistle_tabs`.
- [x] **Paridade das Opções de Exibição (`displayPrefs`) na Exportação SVG / PNG:**
  - *Diagnóstico:* `generateSongSVG()` sempre desenhava nomes de notas, cifras, letras, durações e ornamentos, ignorando os filtros ativos no modal "Exibição" (como o modo *Treino Cego / Só Furos* e furos meio-fechados `0.5`).
  - *Correção:* Respeitar `displayPrefs` (`fingeringOnly`, `pitch`, `chords`, `lyrics`, `durations`, `ornaments`) e renderizar meio-furo (`0.5`) no gerador vetorial SVG/PNG.
- [x] **Suporte a Repetições (`|:` e `:|`) e Todos os Ornamentos no Exportador MIDI e WAV:**
  - *Melhoria:* Expandir seções repetidas (`expandNotesWithRepeats`) nos arquivos `.mid` e `.wav` e sintetizar todos os 5 ornamentos (`cut`, `strike`, `roll`, `cran`, `slide`) + sopro (*chiff*) no `.wav`.

### 🧱 3. Modularização da Arquitetura (Refatoração Estrutural)
- [ ] **Divisão do Monólito `app.js` (~6.800 linhas) em Módulos ES6 (`type="module"`):**
  - `src/config/whistleData.js` — Dicionários de dedilhados, frequências e afinações de flautas.
  - `src/state/store.js` — Estado centralizado da aplicação, histórico Undo/Redo e persistência em `localStorage`.
  - `src/audio/synthEngine.js` — Sintetizador Web Audio (Whistle, Bordão Drone, Metrônomo e *Backing Track*).
  - `src/audio/pitchEngine.js` — Captura de microfone, filtro Biquad, calibração de *Noise Gate* e autocorrelação.
  - `src/parsers/abcCodec.js` & `src/parsers/textCodec.js` — Parsers e serializadores ABC e notação rápida.
  - `src/export/exporters.js` — Geradores SVG, PNG 300 DPI, Standard MIDI e WAV Offline.
  - `src/ui/` — Controladores de visualização da partitura, Modo Estúdio, Modo Prática e Modo Play-Along.
- [ ] **Organização do `styles.css` (~4.650 linhas) em Camadas Lógicas:**
  - Separação clara entre tokens de temas (`variables.css`), layout estrutural, componentes de partitura, modais e folha de impressão (`@media print`).

---

## 🚀 Próximas Fases do Roadmap (Novas Funcionalidades & Ideias)

### 🎼 Fase 6: Notação Musical Avançada & Acústica Realista
- [ ] **Meio-Furo (*Half-Holing*) Interativo & Digitações Alternativas (*Cross-Fingering*):**
  - Suporte completo a notas cromáticas (F natural, G#/A♭, D#/E♭, A#/B♭) clicando diretamente sobre qualquer furo do diagrama para alternar entre Fechado (`●`), Meio-Furo (`◑`) e Aberto (`○`).
  - Seletor de digitação alternativa para notas como o Dó Natural (`C5`/`C6`: garfo tradicional `0 1 1 1 1 0` vs `0 1 1 0 0 0`).
- [ ] **Tercinas (*Triplets*), Semicolcheias, Notas Pontuadas & Ligaduras (*Slurs*):**
  - Botões dedicados no teclado virtual para Semicolcheia (`0.25t`), Pontuada (`1.5t`, `3t`) e Tercina (`3:2`, essencial em Reels e Jigs).
  - Arcos de ligadura (*Slur / Legato*) conectando notas na partitura para indicar fraseado de sopro contínuo vs articulação de língua (*tonguing*).
  - Casas de 1ª e 2ª repetição (*Voltabeams* `[1` e `[2`) compatíveis com ABC.
- [ ] **Acompanhamento Harmônico Automático (*Celtic Backing Track*):**
  - Gerador de acompanhamento em tempo real baseado nas cifras (`chord`) já presentes na partitura.
  - Opções de acompanhamento: Violão Celta (*DADGAD*), Bouzouki Irlandês ou Harpa Celta + percussão de **Bodhrán** adaptada automaticamente ao compasso (Jig 6/8, Reel 4/4, Valsa 3/4, Polka 2/4).
- [ ] **Modo *Low Whistle* & Ambiência Acústica (*Reverb*):**
  - Chave seletora *High Whistle* vs *Low Whistle* (oitava grave com timbre aveludado e maior presença de sopro para *Slow Airs*).
  - Efeito de reverberação ajustável (*Seco / Estúdio / Pub Irlandês / Catedral Celta*).

---

### 🎯 Fase 7: Evolução do Play-Along, Gravação & Pedagogia Gamificada
- [ ] **Gravação da Performance + Replay com Gráfico de Afinação (*Pitch Contour*):**
  - Gravação opcional do microfone via `MediaRecorder` durante a sessão de Play-Along.
  - Ao final da música, permitir ouvir a gravação realizada e visualizar uma curva contínua de afinação sobre cada nota (mostrando ataques altos/baixos, estabilidade do sopro e precisão rítmica).
- [ ] **Integração de Loop A-B e *Count-in* no Modo Play-Along:**
  - Permitir praticar apenas o trecho demarcado entre `[A]` e `[B]` dentro do Play-Along (tanto no modo *Passo a Passo* quanto *No Ritmo*).
  - Contagem regressiva visual e sonora (*Count-in* de 1 compasso) antes de iniciar o modo *No Ritmo (Flow)*.
- [ ] **Histórico de Progresso, Recordes Pessoais & Medalhas na Biblioteca:**
  - Salvar localmente o recorde de precisão (%), estrelas conquistadas (★ a ★★★) e maior BPM dominado em cada música.
  - Exibir insígnias de domínio diretamente nos cartões da biblioteca lateral e painel de estatísticas de evolução do músico.
- [ ] **Academia de Tin Whistle (Gerador de Exercícios & Oficina de Ornamentos):**
  - Módulo interativo de exercícios técnicos: escalas diatônicas, arpejos, controle de transição de oitava (1ª ↔ 2ª oitava) e treino lento guiado para dominar *Cuts*, *Strikes*, *Rolls* e *Crans*.

---

### 🌐 Fase 8: Partitura Híbrida, Comunidade & Integração TheSession.org
- [ ] **Modo Partitura Híbrida (Pentagrama em Clave de Sol + Tablatura de Furos):**
  - Opção na aba *Exibição* para renderizar a pauta musical tradicional (5 linhas, clave de sol, armadura de clave e feixes de colcheias) alinhada verticalmente acima de cada diagrama de Tin Whistle.
- [ ] **Busca Direta Integrada ao *TheSession.org*:**
  - Pesquisar milhares de tunes tradicionais celtas diretamente pela API JSON pública do *TheSession.org* dentro do aplicativo, permitindo pré-ouvir e importar qualquer versão ABC com 1 clique.
- [ ] **Compartilhamento Instantâneo por Link (URL Comprimida) & QR Code:**
  - Gerar link autocontido (`#tune=...` com compressão LZ/Base64) e QR Code para enviar uma composição ou exercício para alunos, amigos ou grupos sem necessidade de servidor ou envio de arquivos.
- [ ] **Criador de *Tune Sets* (Medleys Tradicionais de Sessão):**
  - Agrupar 2 ou 3 músicas da biblioteca em um **Set Contínuo** (ex: *The Kesh Jig → Morrison's Jig*), permitindo tocar ou imprimir o medley completo com transição direta ("*Change!*").

---

### 📱 Fase 9: Progressive Web App (PWA), Acessibilidade & Qualidade
- [ ] **Aplicativo Instalável 100% Offline (PWA):**
  - `manifest.json`, *Service Worker* e cache local de ativos e fontes para uso offline em celulares, tablets de estante musical e desktops.
  - Suporte à **Wake Lock API** (`navigator.wakeLock`) nos modos *Treino* e *Play-Along* para impedir que a tela do celular/tablet apague enquanto o músico está com as duas mãos na flauta.
- [ ] **Controle Mãos-Livres (*Hands-Free* via Pedal MIDI/Bluetooth ou Comando Sonoro):**
  - Suporte a pedais vira-páginas Bluetooth (PageFlip / AirTurn / teclas `PageDown`/`PageUp`) e gesto de nota-gatilho na flauta para reiniciar o loop ou dar Play/Pause sem soltar o instrumento.
- [ ] **Suíte de Testes Automatizados:**
  - Testes unitários para os parsers ABC e de texto, cálculos de transposição entre flautas, geração binária MIDI e detecção de pitch com sinais senoidais sintéticos.

---

### ☁️ Fase 10: Plataforma Dinâmica Multi-Usuário, Comunidade & Arquitetura *Zero-PII* (Oracle Cloud VPS)

Transição de aplicação 100% estática para uma plataforma dinâmica com backend próprio hospedado em **VPS Oracle Cloud (OCI)**, mantendo a filosofia **Local-First + Zero-PII (*Zero Personally Identifiable Information*)**: o aplicativo continua funcionando instantaneamente no navegador, mas ganha sincronização entre dispositivos, publicação de tablaturas na comunidade, links curtos permanentes e *forks* de arranjos **sem coletar e-mail, nome real, telefone, CPF ou IP persistente dos usuários**.

#### 🔐 1. Modelo de Identidade Híbrido: Modo Convidado + Modo Perfil (Nick + Senha Salted Hash)
Combina a **usabilidade imediata e familiar** que todo usuário da internet conhece com **privacidade real (*Zero-PII por Ausência de Dados*)**, eliminando qualquer dependência de e-mail, telefone, CPF, nome civil ou contas de terceiros (OAuth da Google):

- [ ] **Modo Convidado (*Guest / Pastebin Style* — Fricção Zero):**
  - O músico compõe ou importa a música e clica em **"Salvar & Compartilhar"** sem precisar se cadastrar ou fazer login.
  - O servidor gera um link curto amigável (ex: `/t/8kF2pQ`) e devolve um token secreto de edição (`edit_token`).
  - O `edit_token` fica salvo exclusivamente no `localStorage` do navegador do autor, e no banco de dados é gravado apenas o hash irreversível `SHA-256(edit_token)`.
  - Se o autor abrir o mesmo link no seu computador/celular, pode editar ou excluir a música. Se compartilhar o link com um amigo ou aluno, o destinatário pode visualizar, ouvir, tocar no Play-Along ou clicar em **"Duplicar / Criar Arranjo (Fork)"**.
- [ ] **Modo Perfil (*Opcional* — Nickname + Senha com Hash Argon2id / bcrypt):**
  - Para quem deseja uma página pública de autor (`/@bardo_celta`), histórico unificado de suas composições e sincronização fácil entre múltiplos dispositivos (PC, celular, tablet):
  - Cadastro em 5 segundos pedindo **apenas `nickname` (único) e `senha`** — **sem campo de e-mail**.
  - O banco de dados armazena apenas o hash com salt criptográfico de alta resistência (**Argon2id** ou **bcrypt com fator de custo 12**).
  - Compatibilidade nativa com todos os gerenciadores de senhas dos navegadores (Google Password Manager, Apple Keychain, Bitwarden), que preenchem login/senha automaticamente com 1 clique.
  - **Aviso transparente no cadastro:** *"Para garantir sua privacidade absoluta, não guardamos seu e-mail. Guarde bem sua senha! Caso a perca, suas músicas públicas permanecerão disponíveis e você poderá criar outro apelido e duplicá-las."*
- [ ] **Migração Transparente (*Claim Guest Tunes*):**
  - Ao criar uma conta ou fazer login, o sistema detecta músicas salvas no modo convidado daquele navegador e oferece vinculá-las ao perfil do usuário com 1 clique.

#### 🗄️ 2. Avaliação e Escolha do Banco de Dados
Para o perfil de carga de tablaturas musicais (cada música em JSON/ABC pesa apenas **1 KB a 4 KB**) rodando em uma VPS única da Oracle Cloud:
- [ ] **Escolha Recomendada: SQLite 3 em Modo `WAL` (*Write-Ahead Logging*) + `FTS5` (*Full-Text Search*):**
  - **Por que SQLite WAL supera PostgreSQL/MySQL/MongoDB neste cenário:**
    1. **Consumo Zero de RAM Ociosa:** Enquanto PostgreSQL/MySQL consomem 150 MB–400 MB de RAM apenas em repouso, o SQLite roda *in-process* junto à API consumindo < 5 MB, deixando toda a memória da VPS Oracle (seja *AMD Micro 1GB* ou *ARM Ampere A1*) livre para o sistema e cache de páginas do Linux.
    2. **Performance Extrema de Leitura/Escrita:** Com `PRAGMA journal_mode = WAL;` e `PRAGMA synchronous = NORMAL;`, o SQLite suporta dezenas de milhares de leituras simultâneas por segundo e centenas de transações de escrita por segundo (mais que suficiente para centenas de milhares de músicas).
    3. **Busca Textual Nativa (`FTS5`):** Permite buscar instantaneamente por título, artista, ritmo ou até por **sequência melódica de notas** (ex: buscar quais músicas começam com `D5 E5 F#5 G5`).
    4. **Backup Atômico em 1 Arquivo:** O banco inteiro é um único arquivo `.db`. Um cronjob com `sqlite3 app.db ".backup backup.db"` ou **Litestream** faz backup incremental contínuo para o **Oracle Cloud Object Storage (Free Tier de 20 GB)** sem derrubar o banco.
- [ ] **Esquema Relacional Enxuto (Zero Dados Pessoais Identificáveis):**
  - `users`:
    - `id` (TEXT UUIDv4, Chave Primária)
    - `nickname` (TEXT UNIQUE NOT NULL COLLATE NOCASE — apelido público de 3 a 24 caracteres)
    - `password_hash` (TEXT NOT NULL — hash Argon2id com salt embutido)
    - `created_at` (INTEGER NOT NULL — timestamp Unix)
  - `tunes`:
    - `id` (TEXT NanoID 8 caracteres alfanuméricos, ex: `8kF2pQxM`)
    - `user_id` (TEXT NULLABLE — `NULL` para músicas publicadas no Modo Convidado)
    - `edit_token_hash` (TEXT NULLABLE — `SHA-256(edit_token)` para controle de edição anônima)
    - `forked_from_id` (TEXT NULLABLE — referência à tablatura original em caso de arranjo/remix)
    - `title` (TEXT NOT NULL)
    - `artist` (TEXT DEFAULT 'Tradicional')
    - `whistle_key` (TEXT DEFAULT 'D')
    - `rhythm` (TEXT DEFAULT 'reel')
    - `difficulty` (TEXT DEFAULT 'beginner')
    - `time_signature` (TEXT DEFAULT '4/4')
    - `tempo` (INTEGER DEFAULT 120)
    - `notes_json` (TEXT NOT NULL — JSON validado pelo Zod)
    - `abc_source` (TEXT)
    - `visibility` (TEXT DEFAULT 'public' — `'public'`, `'unlisted'` ou `'private'`)
    - `upvotes_count` (INTEGER DEFAULT 0)
    - `views_count` (INTEGER DEFAULT 0)
    - `created_at` (INTEGER NOT NULL)
    - `updated_at` (INTEGER NOT NULL)
  - `tune_collections` (*Tune Sets* / Listas de Repertório):
    - `id` (TEXT NanoID), `user_id`, `title`, `description`, `tune_ids_json`, `visibility`, `created_at`
  - `tune_upvotes`:
    - `tune_id`, `user_id` (chave primária composta para evitar votos duplicados sem precisar registrar endereços IP)

#### ⚙️ 3. Avaliação e Escolha do Backend da API
- [ ] **Escolha Recomendada: Node.js 24 LTS + Fastify + `better-sqlite3` + `zod` + `argon2`:**
  - **Mesma Linguagem do Frontend (JavaScript/ES6):** Permite **compartilhar o mesmo módulo de validação e parser** entre o frontend (`app.js`) e o backend, garantindo que nenhuma nota inválida, duração corrompida ou script malicioso (XSS) seja salvo no banco.
  - **Alta Performance e Baixo Footprint:** O **Fastify** entrega ~40.000 req/s com validação nativa de JSON Schema, e o driver síncrono em C++ `better-sqlite3` elimina overhead de *promises* em consultas locais sub-milissegundo.
  - **Autenticação por Sessão Segura:** Cookies `httpOnly`, `Secure` e `SameSite=Lax` com tokens de sessão assinados via HMAC, sem necessidade de armazenar estado pesado no servidor.
  - *(Alternativa caso prefira binário único compilado)*: **Go (Golang) + Chi/Fiber + SQLite** ou **PocketBase** (que já traz API REST, SQLite WAL e painel admin em um único executável de ~15 MB).

#### 🔌 4. Estrutura da API RESTful (`/api/v1`)
Design limpo, versionado, *stateless* e protegido por validação estrita de payload (limite máximo de 32 KB por requisição):
- [ ] **Autenticação & Perfil Minimalista:**
  - `POST /api/v1/auth/register` — Cria conta com `{ nickname, password }`. Retorna cookie de sessão seguro.
  - `POST /api/v1/auth/login` — Autentica com `{ nickname, password }`.
  - `POST /api/v1/auth/logout` — Invalida a sessão e limpa os cookies.
  - `GET /api/v1/auth/me` — Retorna dados da sessão ativa (`nickname`, total de músicas, coleções).
  - `POST /api/v1/auth/claim-guest-tunes` — Vincula ao perfil as músicas criadas no modo convidado enviando os respectivos `edit_token`s.
  - `DELETE /api/v1/auth/me` — **Direito ao Esquecimento Instantâneo:** remove a conta e todas as suas músicas em uma única transação atômica (`ON DELETE CASCADE`).
- [ ] **Catálogo Comunitário & Descoberta:**
  - `GET /api/v1/tunes` — Lista músicas públicas com paginação por cursor, filtros (`?rhythm=jig&difficulty=easy&key=D&sort=popular|recent`) e busca textual (`?q=morrison`).
  - `GET /api/v1/tunes/:id` — Retorna o JSON completo de uma música pelo seu `short_id` (ex: `GET /api/v1/tunes/8kF2pQxM`).
  - `GET /api/v1/tunes/:id/abc` — Retorna a partitura diretamente em formato `.abc` puro (`Content-Type: text/vnd.abc`).
  - `GET /api/v1/users/:nickname/tunes` — Lista as músicas públicas publicadas por determinado bardo/usuário.
- [ ] **Criação, Edição, *Fork* & Interação:**
  - `POST /api/v1/tunes` — Salva uma nova música (com usuário autenticado ou no modo convidado, gerando `edit_token`).
  - `PUT /api/v1/tunes/:id` — Atualiza uma música (exige sessão do criador ou header `X-Edit-Token`).
  - `DELETE /api/v1/tunes/:id` — Remove uma música do servidor.
  - `POST /api/v1/tunes/:id/fork` — Cria um arranjo derivado (*Remix*) referenciando a música original em `forked_from_id`.
  - `POST /api/v1/tunes/:id/upvote` — Adiciona/remove uma curtida (aplauso celta) na música.
- [ ] **Coleções & *Tune Sets* (Medleys):**
  - `GET /api/v1/sets/:id` & `POST /api/v1/sets` — Compartilhamento de listas de repertório e *Sets* de sessão (ex: 3 Jigs tocadas em sequência).

#### 🛡️ 5. Infraestrutura na VPS Oracle Cloud, Segurança & Anti-Abuso (Sem Rastrear Usuários)
- [ ] **Topologia de Deploy na VPS Oracle Cloud (Ubuntu/Debian):**
  - **Caddy Server** como Reverse Proxy principal na frente do Node.js: provisionamento e renovação 100% automática de certificado **HTTPS (Let's Encrypt TLS 1.3)**, compressão **Brotli/Zstd**, suporte a **HTTP/3 (QUIC)** e entrega direta dos arquivos estáticos (`index.html`, `styles.css`, `app.js`, `repertoire.js`).
  - **Containerização Leve (Docker Compose ou Systemd Hardened):** Serviço da API isolado rodando com usuário sem privilégios, montando apenas o volume `/data/whistle.db`.
- [ ] **Proteção contra Spam e DDoS sem Coletar Dados Pessoais:**
  - **Rate Limiting em Memória com IP *Hashed* Efêmero:** Para conter bots, o rate limiter calcula em RAM `HMAC_SHA256(client_ip, daily_rotating_salt)` que expira a cada 15 minutos — bloqueando abuso de requisições sem **nunca** gravar endereços IP em disco ou em logs.
  - **Logs com *Zero-IP* no Caddy:** Configuração do Caddy com filtro `ip_mask` / descarte de IP nos logs de acesso.
  - **Prova de Trabalho Invisível (*Proof-of-Work* leve estilo Altcha/Hashcash local ou limite por chave):** Ao publicar uma música pública sem conta, o navegador resolve um pequeno desafio SHA-256 de ~150ms no próprio cliente, impedindo spam automatizado em massa sem depender de CAPTCHAs invasivos de terceiros que rastreiam o usuário.
  - **Validação Estrita de Esquema (`zod`) + Sanitização:** O backend rejeita qualquer campo fora da especificação de tablatura (`note`, `duration`, `ornament`, `chord`, `lyric`, `fingering`), garantindo que o banco nunca armazene HTML arbitrário ou payloads gigantes.

#### 💡 6. Melhorias Adicionais Recomendadas para a Plataforma Dinâmica
- [ ] **Arquitetura *Local-First* com Sincronização Transparente (*Offline-to-Online Sync*):**
  - O usuário nunca perde o trabalho se a internet cair: toda criação continua sendo salva imediatamente no `localStorage`/`IndexedDB` local e marcada com uma flag `syncStatus: 'local' | 'synced' | 'modified'`, sincronizando em segundo plano quando o usuário clicar em "Publicar / Sincronizar na Nuvem".
- [ ] **Links Curtos com *OpenGraph Preview* Dinâmico (Cards Visuais no WhatsApp / Discord / Telegram):**
  - Quando alguém compartilha um link `https://seu-dominio/t/k8Fp2x9A`, o backend injeta dinamicamente as meta tags OpenGraph (`og:title`, `og:description`, `og:image`) e renderiza automaticamente uma miniatura PNG da tablatura a partir do gerador SVG existente, exibindo o cartão visual da música nas redes sociais e mensageiros.
- [ ] **Sincronização Criptografada Ponta-a-Ponta (*E2EE Cloud Backup*) para Rascunhos Privados:**
  - Para músicas marcadas como **Privadas** (`visibility: 'private'`), o navegador pode criptografar o `notes_json` localmente usando **AES-GCM (256 bits)** com uma chave derivada do Código Secreto do usuário antes de enviar ao servidor. Assim, nem mesmo o administrador da VPS consegue ler os rascunhos privados armazenados no banco.
- [ ] **Busca por Melodia (*"Quem sabe o começo da música?"*):**
  - Aproveitando o banco dinâmico, adicionar uma coluna indexada `melody_fingerprint` (sequência normalizada de intervalos em semitons das primeiras 12 notas, ex: `+2+2+1+2-3...`), permitindo que o músico toque um trecho no microfone (usando o motor de *pitch detection* já existente!) ou digite algumas notas para descobrir o nome da música no catálogo comunitário.

---

## 🛠️ Backlog Técnico de Otimização de Código & Arquitetura

Revisão técnica da base de código realizada para elevar a performance em tempo real, reduzir uso de memória/GC e modularizar a arquitetura mantendo 100% de compatibilidade *Zero-Build*:

### 1. Correções de Fidelidade & Consistência Funcional
- [x] **Sincronização das Preferências de Exibição na Exportação SVG/PNG (`generateSongSVG`):**
  - Respeitar `displayPrefs` (`pitch`, `chords`, `lyrics`, `durations`, `ornaments`, `fingeringOnly`) também ao gerar arquivos `.svg` e `.png`.
- [x] **Suporte a Ritornelos (`REPEAT_START` `|:` e `REPEAT_END` `:|`) na Exportação WAV e MIDI:**
  - Expandir seções de repetição via `expandNotesWithRepeats()` antes de serializar eventos MIDI e agendar o `OfflineAudioContext` do WAV.
- [x] **Metrônomo Baseado em Pulsos Reais do Compasso & Compensação de Drift:**
  - Agendar cliques do metrônomo de acordo com a duração real da nota e o compasso (`4/4`, `3/4`, `6/8`, `2/4`), com destaque no tempo forte (*downbeat*) e correção de *drift* temporal usando `performance.now()`.

### 2. Otimizações de Performance (DOM, Memória & Web Audio API)
- [x] **Cache de Buffer de Ruído Rosa/Branco (`WeakMap` por `AudioContext`):**
  - Reutilizar um único `AudioBuffer` de sopro (*chiff*) por contexto de áudio via `getOrCreateNoiseBuffer(ctx)` em vez de alocar um novo buffer a cada nota tocada.
- [x] **Reuso de `Float32Array` nos Loops `requestAnimationFrame` de Detecção de Pitch (60fps):**
  - Eliminar alocações de arrays tipados a 60 quadros por segundo no Afinador e no Play-Along através de `getSharedAudioBuffer(fftSize)`.
- [x] **Unificação do Sintetizador de Voz (`scheduleWhistleVoice`):**
  - Unificar `playWhistleSynth` (tempo real) e `scheduleWhistleToneOffline` (renderização WAV) em uma única função parametrizada por `AudioContext`.
- [x] **Renderização Incremental com `DocumentFragment` & *Debounce* na Entrada por Texto:**
  - Construir cartões de notas e itens da biblioteca em `DocumentFragment` antes de anexar ao DOM e aplicar *debounce* de `150ms` na digitação livre com agrupamento inteligente de snapshots de *Undo*.

### 3. Modularização da Arquitetura (ES6 Modules & CSS Layers — *Zero-Build*)
- [x] **Fatiamento do Monólito `app.js` em Módulos ES6 Nativos (`type="module"`):**
  - `src/config/whistleData.js` — Constantes de furos, frequências, afinações (`D`, `C`, `G`, `A`, `Bb`, `F`, `Eb`), transposição e utilitários musicais.
  - `src/state/store.js` — Persistência no `localStorage`, migração de catálogo, snapshots de Undo/Redo e preferências de tema/exibição.
  - `src/audio/synthEngine.js` — Síntese Web Audio API, cache de ruído de sopro, ornamentos acústicos, metrônomo e som de feedback.
  - `src/audio/pitchEngine.js` — Autocorrelação com interpolação parabólica, buffer compartilhado `Float32Array` e conversões Hz ↔ MIDI/Cents.
  - `src/parsers/textCodec.js` — Parser e serializador bidirecional de notas por texto.
  - `src/parsers/abcCodec.js` — Importador e exportador padrão ABC Notation (*TheSession.org*).
  - `src/export/exporters.js` — Motores de exportação vetorial SVG, binário Standard MIDI File (`.mid`) e renderização WAV via `OfflineAudioContext`.
  - `src/ui/svgTemplates.js` — Geradores de templates SVG reutilizáveis (barras de compasso, figuras rítmicas de duração e miniaturas de digitação).
- [x] **Organização do `styles.css` (~4.650 linhas) em Camadas Lógicas (`css/`):**
  - `css/variables.css` — Design tokens (`:root`), temas visuais (*Celtic*, *Dark Obsidian*, *Parchment Light*, *Print Mono*), reset global e *overrides* de tema.
  - `css/layout.css` — Estrutura principal (`.app-container`), Sidebar retrátil, Header, barra de navegação de modos e *media queries* estruturais.
  - `css/sheet.css` — Folha de tablatura (`.tab-sheet`), cartões de notas, cifras, ornamentos celtas, barras de compasso e modos de exibição.
  - `css/components.css` — Teclado virtual de furos, entrada por texto, toolbar avançada, Modo Prática (Loop A-B, Drone, Speed Trainer, Afinador) e Modo Play-Along Interativo (HUD, VU Meter, Calibração).
  - `css/modals.css` — Modais de Instruções, Transposição, Notação ABC, Visualização & Layout e Central de Exportação.
  - `css/print.css` — Folha de estilo editorial multipáginas (`@media print`).
