# 🍀 Tin Whistle Live — Roadmap & Planejamento Estratégico

> **Plataforma Oficial:** [https://tinwhistle.live](https://tinwhistle.live)  
> **Repositório:** [xfox26/Whistle-Tab-Editor](https://github.com/xfox26/Whistle-Tab-Editor)  
> **Status:** Ativo • Zero-Build Vanilla ES6 / CSS Modular • Deploy Contínuo na VPS Oracle Cloud

---

## 📊 Visão Geral do Progresso

```mermaid
flowchart LR
    A["Fase 1: Edição & ABC"] --> B["Fase 2: Modo Prática"]
    B --> C["Fase 3: Biblioteca & Curadoria"]
    C --> D["Fase 4: Exportação & Temas"]
    D --> E["Fase 5: Play-Along Microfone"]
    E --> F["Fase 6: VPS, CI/CD & Palco"]
    F --> G["Fase 7: Mobile & PWA Android"]
    G --> H["Fase 8: Plataforma Comunitária"]
    
    style A fill:#064e3b,stroke:#10b981,color:#fff
    style B fill:#064e3b,stroke:#10b981,color:#fff
    style C fill:#064e3b,stroke:#10b981,color:#fff
    style D fill:#064e3b,stroke:#10b981,color:#fff
    style E fill:#064e3b,stroke:#10b981,color:#fff
    style F fill:#064e3b,stroke:#10b981,color:#fff
    style G fill:#78350f,stroke:#fbbf24,color:#fff
    style H fill:#1f2937,stroke:#6b7280,color:#fff
```

---

## ✅ Fases Concluídas

### ✅ Fase 1: Edição & Notação Musical
- [x] Suporte completo a **Notação ABC** (importação/exportação com TheSession.org).
- [x] Fórmulas de compasso (4/4, 6/8, 3/4, 2/4, 9/8, etc.) e barras de compasso/repetição (`|:`, `:|`).
- [x] Ornamentações tradicionais de Tin Whistle (*Cut*, *Strike*, *Roll*, *Cran*, *Slide*) com renderização visual e sintetização acústica.
- [x] Linha de cifras harmônicas de violão/bouzouki sobre as notas.
- [x] Histórico de edição infinito (Undo `Ctrl+Z` / Redo `Ctrl+Y`) e seleção em bloco (copiar/colar/duplicar).

### ✅ Fase 2: Modo Prática & Treinamento
- [x] Interface dedicada para **Estudo & Treino** com foco visual e sem distrações.
- [x] **Loop A-B** para repetição contínua de trechos e frases musicais.
- [x] **Count-in** (metrônomo de 1 compasso de contagem prévia).
- [x] **Bordão Celta Contínuo (Drone)** afinado na tônica e quinta (estilo *Uilleann Pipes*).
- [x] **Speed Trainer** (aumento progressivo automático de BPM a cada repetição).
- [x] Zoom da tablatura de 80% a 140% para leitura na estante.

### ✅ Fase 3: Biblioteca, Curadoria & Repertório
- [x] Arquitetura híbrida de dados: catálogo curado imutável + músicas personalizadas do usuário no `localStorage`.
- [x] Painel de filtros rápidos (Estilo/Categoria, Nível de Dificuldade, Ritmo) e busca instantânea.
- [x] Acervo nativo de clássicos celtas e temas populares (*Concerning Hobbits*, *Song of Storms*, *Star of the County Down*, *Kesh Jig*, *Titanic*, *Pirates of the Caribbean*, etc.).
- [x] Menu lateral colapsável com memorização de estado.

### ✅ Fase 4: Visualização, Layout & Exportações Ricas
- [x] Personalização de visualização: ligar/desligar nomes de notas, cifras, durações ou modo dedilhado puro.
- [x] Exportação gráfica vetorial pura (**SVG**) e imagem em alta resolução (**PNG 300 DPI**).
- [x] Exportação de arquivo **Standard MIDI (.mid)** e áudio **WAV Estéreo 44.1kHz** sintetizado diretamente no navegador via `OfflineAudioContext`.
- [x] Temas visuais: *Pergaminho Celta*, *Dark Obsidian*, *Papel Claro* e *Impressão P&B*.

### ✅ Fase 5: Play-Along Interativo por Microfone
- [x] Motor de detecção de pitch em tempo real (autocorrelação com interpolação parabólica e filtro biquad passa-faixa 250Hz–2200Hz para Tin Whistle).
- [x] Calibração adaptativa de ruído ambiente (*Noise Gate* de 2 segundos) para tocar com precisão mesmo perto de ventiladores ou ruídos de fundo.
- [x] Modo **Passo a Passo** (*Wait for Me*) com detecção inteligente de pausas entre notas iguais repetidas.
- [x] Modo **No Ritmo** (*Flow Mode*) com avaliação de precisão temporal e afinação em cents.
- [x] Relatório pós-treino com pontuação, acurácia %, combo de acertos e medalhas celtas.

### ✅ Fase 6: Domínio, Infraestrutura VPS, Identidade Visual & Ergonomia
- [x] **Domínio Próprio & VPS Oracle:** `https://tinwhistle.live` com HTTPS/SSL Let's Encrypt ativo via NGINX.
- [x] **Automação de Deploy (CI/CD):** GitHub Actions configurado para deploy automático a cada `git push main`.
- [x] **Rebranding & Identidade Visual:** Logotipo vetorial de flauta Tin Whistle com badge LIVE acústico pulsante, `favicon.svg` estilizado e metatags Open Graph/Twitter Card para redes sociais.
- [x] **Tema Palco Noturno (*Dark Stage Mode*):** Fundo ultra-escuro sem reflexos e furos em âmbar/dourado de alto contraste para apresentações ao vivo.
- [x] **Screen Wake Lock API:** Impede a tela do celular/tablet de apagar enquanto toca playback ou play-along (com botão manual de status no topo).
- [x] **Modo Estante Compacto (*Clean Stand Mode*):** Recolhe formulários e cabeçalhos com 1 clique, liberando +30% de espaço vertical para a partitura.
- [x] **Favoritos (⭐) & Ordenação do Repertório:** Marcação rápida de músicas favoritas com persistência local e ordenação por A-Z, tom da flauta ou dificuldade.

---

## 🚀 Próximas Fases

### 📱 Fase 7 (Imediata): Mobile First & PWA / WebApp para Android
*Foco: Transformar o Tin Whistle Live em um aplicativo de excelência para smartphones Android e tablets.*

- [ ] **Arquitetura PWA (Progressive Web App):**
  - Manifesto Web (`manifest.json` ou `manifest.webmanifest`) com nome, cores de tema (`#060709` / `#10b981`), orientação e display `standalone` (tela cheia sem barra do navegador).
  - Conjunto de ícones PWA adaptativos em alta definição (192x192, 512x512, maskable icons) gerados a partir do `favicon.svg`.
  - Service Worker (`sw.js`) para **suporte offline completo** (o músico abre o app e toca o repertório mesmo sem sinal de internet).
  - Prompt/Banner nativo *"Instalar Tin Whistle Live no seu celular"*.
- [ ] **Ergonomia e Layout Mobile Touch:**
  - Barra de navegação inferior (*Bottom Navigation Bar*) no celular com acesso rápido: *Repertório*, *Estúdio*, *Prática* e *Play-Along*.
  - Gaveta lateral (*Drawer*) com fechamento por gesto de deslizar (*swipe*).
  - Adaptação do Teclado Virtual de Furos para toque mobile (botões grandes e fáceis de tocar com os polegares).
- [ ] **Modo Paisagem Automático (Estante de Celular):**
  - Ao virar o celular na horizontal, ativação automática do Modo Estante com rolagem suave contínua (*Auto-Scroll* configurável por BPM).

---

### 🌐 Fase 8: Plataforma Comunitária & Nuvem na VPS
*Foco: Permitir salvar, compartilhar e descobrir músicas na comunidade sem burocracia.*

- [ ] **Backend Leve & Seguro na VPS Oracle:**
  - API REST minimalista em Node.js ou Go com SQLite/Litestream.
  - Links curtos de compartilhamento (ex: `https://tinwhistle.live/t/morrisons-jig`).
  - Geração automática de imagem de pré-visualização da partitura para cartões no WhatsApp/Telegram.
- [ ] **Modo Bardo / Criador Comunitário:**
  - Publicação de tablaturas na comunidade com busca global.
  - Criação de listas de repertório (*Tune Sets* para ensaios e apresentações).

---

### 🎻 Fase 9: Áudio Polifônico & Backing Tracks
*Foco: Enriquecer a experiência sonora de tocar junto.*

- [ ] **Acompanhamentos Acústicos em Loop:**
  - Padrões rítmicos tradicionais de Bodhrán irlandês sincronizados com o BPM da tablatura.
  - Acompanhamento de acordes de violão celta (*DADGAD*) e bouzouki.
- [ ] **Gravação e Exportação de Performance:**
  - Gravar áudio da flauta pelo microfone junto com o playback para auto-avaliação do estudante.
