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

### 🎯 Fase 2: Prática, Áudio & Treinamento (Em Desenvolvimento)
- [x] **Divisão da Interface em Duas Áreas Distintas:**
  - **Área de Criação & Edição (Estúdio):** Ferramentas completas de edição, teclado virtual de digitações, entrada por texto, inserção de compassos e transposição.
  - **Área de Prática & Treinamento (Prática):** Interface limpa, ampla e livre de poluição visual, otimizada para estante de partitura e estudo musical com a flauta na mão.
- [x] **Loop A-B (Repetição A-B de Estudo):**
  - Definição visual do ponto de início (A) e ponto de término (B) na tablatura.
  - Repetição contínua do trecho demarcado para treino motor e memorização de frases difíceis.
- [x] **Contagem Inicial (Count-in):**
  - 1 ou 2 compassos de metrônomo antes da reprodução começar, com feedback visual na tela (1, 2, 3, 4) para o flautista preparar o sopro e entrar no tempo.
- [x] **Bordão Celta Contínuo de Afinação (Drone):**
  - Sintetizador com harmônicos ricos de palheta dupla/bordão (estilo *Uilleann Pipes* / Gaita Irlandesa) afinado na tônica e quinta da flauta (ex: Ré + Lá para flauta em D).
  - Controle de volume independente e liga/desliga para treino de embocadura e afinação.
- [x] **Acelerador Gradual (Speed Trainer):**
  - Aumento automático do BPM a cada repetição do loop (ex: +2 ou +5 BPM por ciclo até a meta desejada), permitindo desenvolver velocidade técnica progressiva.
- [x] **Controle de Zoom da Partitura & Modo Tela Cheia:**
  - Ajuste de escala dos diagramas para fácil leitura à distância na estante de partitura.

---

### 🔮 Sistema Interativo de "Play-Along" por Microfone (Pesquisa & Especificação Futura)
- [ ] **Módulo de Escuta Ativa por Microfone (Web Audio API `getUserMedia` + `AnalyserNode`):**
  - Algoritmo de detecção de frequência fundamental (*Pitch Detection* via YIN ou Autocorrelação normalizada).
  - Tolerância de afinação configurável em centésimos de semitom (cents).
- [ ] **Modos de Estudo com Microfone:**
  - **Modo Feedback em Tempo Real:** Conforme a música toca, o sistema avalia se o flautista tocou a nota no tempo correto:
    - 🟢 Verde: Nota correta e afinada.
    - 🟡 Amarelo: Nota correta mas ligeiramente alta ou baixa (ajuste de sopro).
    - 🔴 Vermelho: Nota errada ou atrasada.
  - **Modo "Espere por Mim" (*Wait for Me / Interactive Sheet*):** O cursor da partitura só avança para a próxima nota quando o flautista toca a nota correta no instrumento real! Ideal para iniciantes aprendendo a ler o dedilhado.
  - **Pontuação e Relatório de Treino:** Percentual de acerto, notas com maior índice de erro e evolução de precisão.

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

### 🎨 Fase 4: Visualização, Layout & Personalização
- [ ] **Opções de Exibição Customizáveis:**
  - Alternar individualmente a visibilidade de: nome das notas (letras), cifras, letras da música, ou apenas os círculos dos furos.
- [ ] **Exportação em Imagem de Alta Qualidade:**
  - Gerar arquivos `.png` ou `.svg` da tablatura renderizada para compartilhamento e postagens.
- [ ] **Temas Visuais:**
  - Tema Pergaminho Celta (atual), Tema Escuro (*Dark Mode* de alto contraste) e Tema Impressão P&B limpo.
- [ ] **Exportação de Áudio & MIDI:**
  - Renderização direta para download de arquivo `.wav` ou arquivo padrão `.mid`.
