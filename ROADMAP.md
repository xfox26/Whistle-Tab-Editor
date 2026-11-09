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
    H --> I["Fase 9: Áudio Polifônico & Backing Tracks"]
    
    style A fill:#064e3b,stroke:#10b981,color:#fff
    style B fill:#064e3b,stroke:#10b981,color:#fff
    style C fill:#064e3b,stroke:#10b981,color:#fff
    style D fill:#064e3b,stroke:#10b981,color:#fff
    style E fill:#064e3b,stroke:#10b981,color:#fff
    style F fill:#064e3b,stroke:#10b981,color:#fff
    style G fill:#064e3b,stroke:#10b981,color:#fff
    style H fill:#78350f,stroke:#fbbf24,color:#fff
    style I fill:#1f2937,stroke:#6b7280,color:#fff
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

### ✅ Fase 7: Mobile First & PWA / WebApp para Android
- [x] **Arquitetura PWA:** Manifesto Web (`manifest.webmanifest`) configurado com cores temáticas (`#060709` / `#10b981`), modo standalone e metatags mobile.
- [x] **Ícones Adaptativos:** Gerados em alta resolução 192x192 e 512x512 com fundo seguro (*maskable*).
- [x] **Service Worker (`sw.js`):** Cache Offline-First inteligente com suporte a uso contínuo mesmo sem conexão de internet.
- [x] **Bottom Navigation Bar Touch:** Barra inferior mobile para navegação com uma só mão entre *Repertório*, *Estúdio*, *Prática* e *Play-Along*.

### ✅ Fase 8.1: Backend REST & Persistência na VPS (Concluído)
- [x] **Banco de Dados SQLite Persistente:** Camada nativa (`node:sqlite`) gravando em `/var/data/tinwhistle/tinwhistle.db` (preservado entre deploys) com fallback JSON automático.
- [x] **API RESTful Nativa:** Endpoints `/api/tunes`, `/api/tunes/:id`, `/api/tunes/:id/like` e `/api/health` em servidor Node puro sem dependências externas (`npm install`).
- [x] **Compartilhamento por Link Único:** Modal de compartilhamento com URL amigável (`https://tinwhistle.live/?tune=XYZ`), botões rápidos para WhatsApp, Telegram e cópia.
- [x] **Catálogo Comunitário:** Aba `🌍 Comunidade` integrada na sidebar com busca e ordenação.

---

## 🚀 Fase Atual: Expansão da Plataforma Comunitária (Fase 8.2)

### ✅ Etapa 1: Sistema de Contas Minimalista & Perfil do Bardo (Concluído)
*Foco: Autenticação anônima, segura e focada em privacidade para músicos.*
- [x] Banco de dados com tabelas `users` e `sessions`.
- [x] Criptografia nativa (`node:crypto.scryptSync`) para senhas sem dependências externas.
- [x] Cadastro com apenas `username`, `password` e `display_name` (sem e-mail/telefone).
- [x] Geração de Frase de Recuperação Secreta de 8 palavras.
- [x] Endpoints `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` e `/api/auth/profile`.
- [x] Interface no site com botão/badge de usuário, modal de login/cadastro e modal de perfil do bardo.

### ✅ Etapa 2: Nuvem Pessoal & Ciclo de Vida da Música (Concluído)
*Foco: Salvar tablaturas em rascunho na nuvem, publicar, despublicar e editar mantendo links.*
- [x] Modo rascunho privado: músicas salvas pelo usuário ficam inicialmente visíveis apenas para ele (`is_public = 0`).
- [x] Botão "🚀 Publicar na Comunidade" para disponibilizar no catálogo público (`is_public = 1`).
- [x] Edição de músicas já publicadas pelo autor (`PUT /api/tunes/:id`) mantendo o mesmo ID e link original sem quebrá-lo.
- [x] Opção de "Tornar Privada / Despublicar" (`POST /api/tunes/:id/visibility`).
- [x] Endpoint `GET /api/my-tunes` e aba `✏️ Minhas` sincronizada com a nuvem do bardo.
- [x] Exclusão segura de músicas da nuvem (`DELETE /api/tunes/:id`).

### ✅ Etapa 3: Sistema de Remix (Variações Musicais), Proteção de Partituras & Sincronização Offline (Concluído)
*Foco: Estimular a colaboração artística, proteção da autoria original e fluidez entre uso offline e online.*
- [x] **Like Único por Bardo:** Sistema de curtidas toggle vinculado à conta do usuário (1 like por música por usuário, sem curtidas repetidas).
- [x] **Filtro Geral Abrangente:** O filtro *"Todas"* passa a integrar de forma transparente músicas oficiais da curadoria, criações locais e partituras compartilhadas pela comunidade.
- [x] **Modo Somente Leitura para Músicas Existentes:** Ao selecionar uma música já existente do repertório (curadoria oficial ou partitura de outro bardo), todos os campos de edição e digitação ficam bloqueados em modo *Read-Only*, mantendo 100% ativas as funções de tocar, treinar (Loop/Drone/Speed) e Play-Along por microfone.
- [x] **Botão "🔀 Remixar / Criar Variação":** Na tela do estúdio, um banner com o botão de Remix cria uma bifurcação (fork) da partitura, atribuindo a autoria da nova variação ao bardo atual com créditos automáticos ao autor original (*"Variação de [Música Original] por [Autor]"*), abrindo-a inicialmente em modo privado e destravando todos os campos para edição.
- [x] **Marcador Offline Discreto & Sincronização Inteligente:** Marcador visual suave na barra de repertório identificando partituras criadas ou editadas offline (`💾 Apenas local`), com sincronização automática em lote para a nuvem assim que a conexão com a internet for restabelecida (`window.onLine` / botão de sincronização dedicado).
- [x] **Ranking Global na Comunidade:** Filtros e ordenação pública por *Mais Populares (Curtidas)*, *Mais Remixadas* e alfanumérica.

---

## 🔮 Fases Futuras

### 📱 Fase 9: Revisão do Layout Geral & Otimização Mobile/Tablet (Limpeza Visual e Ergonomia)
*Foco: Limpar a poluição visual, aumentar o espaço útil da partitura e da lista de músicas, e criar uma experiência fluida para telas menores (smartphones e tablets).*

#### 1. Menu Lateral da Biblioteca (Aumento do espaço vertical da lista)
- [x] **Remoção de Redundâncias:** Remover botões *"Importar"* e *"Exportar Tudo"* da barra lateral (já centralizados no menu superior de Importar/Exportar).
- [x] **Painel Colapsável de Filtros:** Manter visível apenas a barra de busca e o botão de nova música; agrupar categorias, dificuldade, ritmo e ordenação em um painel expansível *"🔍 Filtros (N)"* com alternância suave.

#### 2. Barra Superior & Ferramentas Rápidas (Despoluição e Clareza)
- [x] **Botões de Modo Concisos:** Simplificar os rótulos para apenas ícone e nome (*"🎨 Estúdio"*, *"🎯 Treino"*, *"🎤 Play-Along"*), movendo descrições longas para tooltips elegantes.
- [x] **Remoção de Duplicidades:** Remover o seletor rápido de temas da barra superior (já acessível no modal de *Exibição*).
- [x] **Remoção do Botão Estante:** Integrar o colapso/expansão diretamente no cabeçalho interativo da música.

#### 3. Modo Estúdio & Cabeçalho da Partitura (Foco na Partitura)
- [x] **Cabeçalho Expansível/Retrátil Dinâmico:** Nova música inicia com campos de metadados abertos com botão *"💾 Concluir Edição"*. Ao salvar ou abrir músicas do acervo, contrai em uma faixa compacta elegante. Clicar no banner volta a expandir para edição.
- [x] **Reposicionamento do Botão Transpor:** Mover o botão *"Transpor"* para a barra de reprodução (junto a Play/Stop, velocidade e metrônomo), agrupando todas as ferramentas de execução musical em um só local.

#### 4. Otimizações Mobile & Ergonomia Touch (Sugestões Adicionais)
- [x] **Barra de Reprodução Adesiva (Sticky Controls no Mobile):** Barra de Play/Stop e velocidade fixada de forma suave no topo durante a rolagem em telas pequenas, permitindo pausar/tocar sem ter que rolar de volta.
- [x] **Teclado Virtual com Rolagem Touch Suave:** Botões de notas com dimensões confortáveis para o polegar e rolagem horizontal suave no smartphone (`scroll-snap-type: x mandatory`).
- [x] **Indicador Visual de Filtros Ativos:** Botão de filtros retrátil exibe badge com a contagem de filtros aplicados e atalho rápido para limpar.

---

### 🎻 Fase 10: Áudio Polifônico & Backing Tracks
- [ ] Acompanhamentos acústicos de Bodhrán celta sincronizados com BPM.
- [ ] Acompanhamento harmônico de violão celta (*DADGAD*) e bouzouki.
- [ ] Demonstração em áudio de 30 segundos gravada pelo próprio bardo tocando sua flauta.

