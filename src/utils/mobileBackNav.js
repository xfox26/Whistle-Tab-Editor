/**
 * Gerenciador de navegação "Voltar" (Android Back Button / Gesture) via History API.
 * Evita que o botão Voltar feche o app TWA quando houver modal ou gaveta mobile aberta.
 */

const overlayStack = [];
let handlingPopstate = false;

export function pushMobileOverlay(id, closeFn) {
    if (!id || typeof closeFn !== 'function') return;
    if (overlayStack.some(item => item.id === id)) return;

    overlayStack.push({ id, closeFn });
    try {
        window.history.pushState({ tinwhistleOverlay: id }, '');
    } catch {
        // Ignora ambientes sem History API
    }
}

export function popMobileOverlay(id) {
    const idx = overlayStack.findIndex(item => item.id === id);
    if (idx === -1) return;
    overlayStack.splice(idx, 1);

    if (!handlingPopstate && window.history.state?.tinwhistleOverlay === id) {
        try {
            window.history.back();
        } catch {
            // Ignora
        }
    }
}

export function initMobileBackNav() {
    window.addEventListener('popstate', () => {
        if (overlayStack.length === 0) return;
        const top = overlayStack.pop();
        if (top && typeof top.closeFn === 'function') {
            handlingPopstate = true;
            try {
                top.closeFn();
            } finally {
                handlingPopstate = false;
            }
        }
    });
}
