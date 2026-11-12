/* ==========================================================================
   UTILITÁRIOS COMPARTILHADOS DE UI & DESEMPENHO (TOAST & DEBOUNCE)
   ========================================================================== */

export function showNotificationToast(message) {
    const existing = document.querySelector('.whistle-toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'whistle-toast-notification';
    const span = document.createElement('span');
    span.textContent = String(message || '');
    toast.appendChild(span);
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast && toast.parentNode) toast.remove();
    }, 4000);
}

export function debounce(fn, delayMs = 150) {
    let timerId = null;
    const wrapped = function (...args) {
        if (timerId) clearTimeout(timerId);
        timerId = setTimeout(() => {
            timerId = null;
            fn.apply(this, args);
        }, delayMs);
    };
    wrapped.cancel = () => {
        if (timerId) {
            clearTimeout(timerId);
            timerId = null;
        }
    };
    return wrapped;
}
