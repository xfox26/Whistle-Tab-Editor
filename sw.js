/* ==========================================================================
   TIN WHISTLE LIVE — SERVICE WORKER (PWA & OFFLINE-FIRST)
   ========================================================================== */

const CACHE_VERSION = 'tinwhistle-v1.4.0';
const CACHE_NAME = `tinwhistle-live-${CACHE_VERSION}`;

// Lista completa do App Shell e recursos essenciais para funcionamento 100% offline
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/css/variables.css',
    '/css/layout.css',
    '/css/sheet.css',
    '/css/components.css',
    '/css/modals.css',
    '/css/print.css',
    '/fonts/fonts.css',
    '/fonts/font-1-8vIJ7ww63mVu7gt7-GT7LEc.woff2',
    '/fonts/font-2-8vIJ7ww63mVu7gt79mT7.woff2',
    '/fonts/font-3-QGYvz_MVcBeNP4NJuktqQ4E.woff2',
    '/fonts/font-4-QGYvz_MVcBeNP4NJtEtq.woff2',
    '/app.js',
    '/repertoire.js',
    '/favicon.svg',
    '/manifest.webmanifest',
    '/privacy.html',
    '/terms.html',
    '/delete-account.html',
    '/src/legal/deleteAccountPage.js',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-maskable-192.png',
    '/icons/icon-maskable-512.png',
    '/src/state/store.js',
    '/src/config/whistleData.js',
    '/src/audio/synthEngine.js',
    '/src/audio/pitchEngine.js',
    '/src/audio/backingTracks.js',
    '/src/parsers/textCodec.js',
    '/src/parsers/abcCodec.js',
    '/src/export/exporters.js',
    '/src/ui/svgTemplates.js',
    '/src/ui/libraryMastery.js',
    '/src/ui/whistleFitAnalyzer.js',
    '/src/ui/masteryDashboard.js',
    '/src/ui/adminWorkspace.js',
    '/src/ui/fingeringChartModal.js',
    '/src/ui/ornamentLab.js',
    '/src/ui/customSetsModal.js',
    '/src/utils/toast.js',
    '/src/utils/zipReader.js',
    '/src/utils/mobileBackNav.js',
    '/src/auth/authClient.js',
    '/src/editor/tabRenderer.js',
    '/src/sidebar/sidebarController.js',
    '/src/modes/practiceMode.js',
    '/src/modes/playAlongMode.js',
    '/src/i18n/index.js',
    '/src/i18n/pt.js',
    '/src/i18n/en.js',
    '/src/i18n/es.js'
];

// 1. Instalação: Pré-cache dos recursos vitais (sem engolir falhas para evitar SW incompleto)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Pré-cacheando App Shell do Tin Whistle Live...');
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// 2. Ativação: Limpeza de caches de versões anteriores
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name.startsWith('tinwhistle-live-') && name !== CACHE_NAME) {
                        console.log('[Service Worker] Removendo cache antigo:', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Interceptação de Requisições (Fetch)
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Ignora requisições não-GET ou extensões do navegador
    if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
        return;
    }

    // Nunca armazenar respostas dinâmicas/autenticadas da API no Cache Storage
    try {
        const reqUrl = new URL(request.url);
        if (reqUrl.pathname.startsWith('/api/')) {
            return;
        }
    } catch {
        return;
    }

    // Se for navegação (carregamento inicial de página HTML):
    // Network-First com timeout de 3s para evitar travamento em lie-fi
    if (request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                try {
                    const networkResponse = await fetch(request, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    }
                    return networkResponse;
                } catch {
                    clearTimeout(timeoutId);
                    const cachedExact = await caches.match(request);
                    if (cachedExact) return cachedExact;
                    return caches.match('/index.html');
                }
            })()
        );
        return;
    }

    // Para assets estáticos locais (CSS, JS, SVG, PNG, Fontes):
    // Stale-While-Revalidate: Responde imediatamente do cache e atualiza silenciosamente
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Sem internet; o cache já foi retornado
                });

            return cachedResponse || fetchPromise;
        })
    );
});
