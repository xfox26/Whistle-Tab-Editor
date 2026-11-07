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

### 🎨 Fase 4: Visualização, Layout & Personalização (Próxima)
- [ ] **Opções de Exibição Customizáveis:**
  - Alternar individualmente a visibilidade de: nome das notas (letras), cifras, letras da música, ou apenas os círculos dos furos.
- [ ] **Exportação em Imagem de Alta Resolução:**
  - Gerar arquivos `.png` ou `.svg` da tablatura renderizada para compartilhamento e postagens.
- [ ] **Temas Visuais de Interface:**
  - Tema Pergaminho Celta (atual), Tema Escuro (*Dark Mode* de alto contraste) e Tema Impressão P&B limpo.
- [ ] **Exportação de Áudio & MIDI:**
  - Renderização direta para download de arquivo `.wav` ou arquivo padrão `.mid`.

---

### 🎙️ Fase 5: Sistema Interativo Avançado de "Play-Along" por Microfone
- [ ] **Módulo Avançado de Escuta Ativa:**
  - Detecção polifônica e monofônica precisa com calibração de ruído ambiente.
- [ ] **Modo "Espere por Mim" (*Wait for Me / Interactive Sheet*):**
  - O cursor da partitura só avança para a próxima nota quando o flautista toca a nota correta no instrumento real! Ideal para iniciantes aprendendo a ler o dedilhado.
- [ ] **Pontuação e Relatório de Treino:**
  - Percentual de acerto, notas com maior índice de erro, desvio médio de afinação (cents) e gráficos de evolução técnica.
