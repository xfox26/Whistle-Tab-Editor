# 📜 Celtic Whistle Tab Editor - Roadmap & Backlog de Ideias

Este documento reúne todas as ideias, sugestões e planos de funcionalidades futuras mapeadas para a evolução contínua da ferramenta de criação, edição e manutenção de tablaturas para **Tin Whistle**.

---

## 📌 Em Desenvolvimento (Fase Atual: Edição & Notação Musical)
- [x] **Suporte a Arquivos ABC (ABC Notation):**
  - Importador e Exportador compatível com o formato padrão celta ([TheSession.org](https://thesession.org)).
  - Reconhecimento automático de cabeçalhos (`T:`, `M:`, `K:`, `L:`, `Q:`), notas, acidentes (`^`, `_`, `=`), durações relativas e cifras (`"Am"`, `"D"`).
- [x] **Compassos e Barras de Compasso (*Measure Bars*):**
  - Fórmulas de compasso (4/4, 6/8, 3/4, 2/4, 9/8, etc.).
  - Inserção e renderização de barras de compasso simples (`|`), duplas (`||`) e repetições (`|:`, `:|`).
  - Agrupamento visual de notas por compasso com numeração.
- [x] **Ornamentações Tradicionais de Tin Whistle:**
  - Símbolos visuais dedicados sobre cada nota:
    - **Cut** (corte rápido com furo superior - símbolo `^` ou `c`)
    - **Strike / Tap** (batida rápida de dedo inferior - símbolo `v` ou `t`)
    - **Roll** (Long roll e Short roll - símbolo `~`)
    - **Cran** (ornamentação típica da nota Ré - símbolo `*` ou `cr`)
    - **Slide** (glissando / portamento ascendente - símbolo `/`)
  - Reprodução auditiva no sintetizador para os ornamentos.
- [x] **Linha de Cifras / Acordes (Chords):**
  - Campo editável de cifras harmônicas em cada nota ou início de compasso para acompanhamento (violão, bouzouki, teclado).
- [x] **Histórico de Edição Completo (Undo / Redo):**
  - Pilha de ações com atalhos universais: `Ctrl+Z` (Desfazer) e `Ctrl+Y` / `Ctrl+Shift+Z` (Refazer).
- [x] **Seleção Ativa & Inserção no Meio da Melodia:**
  - Cursor ou clique em uma nota existente para selecioná-la.
  - Teclado virtual / digitação com suporte a:
    - **Substituir** a nota selecionada.
    - **Inserir antes** da nota selecionada.
    - **Inserir depois** da nota selecionada.
- [x] **Seleção em Bloco, Copiar, Colar e Duplicar:**
  - Seleção contínua (arrastar ou Shift+clique) para copiar (Ctrl+C), colar (Ctrl+V) ou duplicar trechos de frases/partes (Partes A/B de tunes).

---

## 🚀 Próximas Fases Planejadas

### 🎯 Fase 2: Prática, Áudio & Treinamento
- [ ] **Loop A-B (A-B Repeat):**
  - Marcação de início (A) e fim (B) para repetição em looping de compassos difíceis.
- [ ] **Contagem Inicial (Count-in):**
  - 1 ou 2 compassos de metrônomo antes da reprodução começar.
- [ ] **Bordão Celta de Fundo (Drone):**
  - Sintetizador contínuo afinado na tônica da flauta (som de bordão de gaita irlandesa / *Uilleann Pipes*), excelente para prática de afinação.
- [ ] **Aceleração Gradual (Trainer Mode):**
  - Opção para aumentar o BPM automaticamente a cada repetição do loop (ex: +2 BPM por ciclo).
- [ ] **Exportação de Áudio & MIDI:**
  - Renderização direta para download de arquivo `.wav` ou arquivo padrão `.mid`.

---

### 📚 Fase 3: Biblioteca, Curadoria & Repertório
- [ ] **Categorias e Ritmos Celtas (Tags):**
  - Classificação por dança (*Reel, Jig, Slip Jig, Hornpipe, Polka, Waltz, Slow Air, March, Carol, Folk*).
- [ ] **Classificação por Dificuldade:**
  - Níveis: *Iniciante (Beginner)*, *Intermediário (Intermediate)*, *Avançado (Advanced)*.
- [ ] **Favoritos e Filtros Rápidos:**
  - Marcar com estrela ⭐, filtrar por tom da flauta, ritmo ou dificuldade.
- [ ] **Acervo Nativo Expandido:**
  - Integração de mais clássicos tradicionais de domínio público:
    - *The Foggy Dew*
    - *The Butterfly (Slip Jig)*
    - *Drowsy Maggie (Reel)*
    - *Scarborough Fair*
    - *The Kesh Jig*
    - *Down by the Salley Gardens*
    - *The Star of the County Down*
- [ ] **Backup e Sincronização:**
  - Exportar/Importar biblioteca completa em arquivo único ou integração opcional com GitHub Gist / Nuvem.

---

### 🎨 Fase 4: Visualização, Layout & Modo Palco
- [ ] **Modo Estante / Tela Cheia (Live Performance Mode):**
  - Interface minimalista com botões grandes de Play/Pause, sem menus laterais, otimizada para tablets/smartphones na estante de partitura.
  - Rolagem automática suave (*Auto-Scroll*) ajustada ao BPM.
- [ ] **Opções de Exibição Customizáveis:**
  - Alternar individualmente a visibilidade de: nome das notas (letras), cifras, letras da música, ou apenas os círculos dos furos.
- [ ] **Exportação em Imagem de Alta Qualidade:**
  - Gerar arquivos `.png` ou `.svg` da tablatura renderizada para compartilhamento e postagens.
- [ ] **Temas Visuais:**
  - Tema Pergaminho Celta (atual), Tema Escuro (*Dark Mode* de alto contraste) e Tema Impressão P&B limpo.

---

### 🔮 Fase 5: Recursos Futuros Avançados & IA
- [ ] **Afinador & Transcrição por Microfone (Pitch Detection):**
  - O usuário toca a flauta e o microfone identifica a nota em tempo real, permitindo transcrever a melodia tocada diretamente para a partitura.
- [ ] **Busca Direta na API do TheSession.org:**
  - Campo de busca integrado para pesquisar músicas diretamente no TheSession e importar a notação ABC com 1 clique.
- [ ] **Dedilhados Alternativos e Notas Cromáticas:**
  - Suporte a dedilhados cruzados (*cross-fingerings*) documentados por modelo/fabricante de flauta (ex: Dixon, Generation, Killarney, Clarke).
