/* ==========================================================================
   TEMPLATES SVG REUTILIZÁVEIS PARA PARTITURA INTERATIVA E HUD PLAY-ALONG
   ========================================================================== */

export function createMeasureBarSVG(barType) {
    if (barType === 'DOUBLE_BAR') {
        return `
            <svg class="measure-bar-svg" viewBox="0 0 14 110">
                <line x1="4" y1="5" x2="4" y2="105" stroke="var(--parchment-text)" stroke-width="1.8" />
                <line x1="10" y1="5" x2="10" y2="105" stroke="var(--parchment-text)" stroke-width="2.5" />
            </svg>
        `;
    }
    if (barType === 'REPEAT_START') {
        return `
            <svg class="measure-bar-svg" viewBox="0 0 14 110">
                <line x1="3" y1="5" x2="3" y2="105" stroke="var(--parchment-text)" stroke-width="2.8" />
                <line x1="7" y1="5" x2="7" y2="105" stroke="var(--parchment-text)" stroke-width="1.5" />
                <circle cx="11" cy="48" r="1.8" fill="var(--parchment-text)" />
                <circle cx="11" cy="62" r="1.8" fill="var(--parchment-text)" />
            </svg>
        `;
    }
    if (barType === 'REPEAT_END') {
        return `
            <svg class="measure-bar-svg" viewBox="0 0 14 110">
                <circle cx="3" cy="48" r="1.8" fill="var(--parchment-text)" />
                <circle cx="3" cy="62" r="1.8" fill="var(--parchment-text)" />
                <line x1="7" y1="5" x2="7" y2="105" stroke="var(--parchment-text)" stroke-width="1.5" />
                <line x1="11" y1="5" x2="11" y2="105" stroke="var(--parchment-text)" stroke-width="2.8" />
            </svg>
        `;
    }
    return `
        <svg class="measure-bar-svg" viewBox="0 0 14 110">
            <line x1="7" y1="5" x2="7" y2="105" stroke="var(--parchment-text)" stroke-width="2" />
        </svg>
    `;
}

export function getDurationSymbol(duration) {
    const dur = parseFloat(duration) || 1.0;
    if (dur === 0.25) {
        return `<svg class="duration-svg" viewBox="0 0 16 18" width="11" height="15"><ellipse cx="4.5" cy="13.5" rx="3.5" ry="2.5" transform="rotate(-25 4.5 13.5)" fill="currentColor"/><line x1="7.2" y1="13" x2="7.2" y2="2" stroke="currentColor" stroke-width="1.6"/><path d="M7.2 2 C10 4, 13 5, 11.5 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M7.2 5 C10 7, 13 8, 11.5 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
    }
    if (dur === 0.5) {
        return `<svg class="duration-svg" viewBox="0 0 16 18" width="11" height="15"><ellipse cx="4.5" cy="13.5" rx="3.5" ry="2.5" transform="rotate(-25 4.5 13.5)" fill="currentColor"/><line x1="7.2" y1="13" x2="7.2" y2="2" stroke="currentColor" stroke-width="1.6"/><path d="M7.2 2 C10 4, 13 6, 11.5 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
    }
    if (dur === 1.5) {
        return `<svg class="duration-svg" viewBox="0 0 16 18" width="13" height="15"><ellipse cx="4.5" cy="13.5" rx="3.5" ry="2.5" transform="rotate(-25 4.5 13.5)" fill="currentColor"/><line x1="7.2" y1="13" x2="7.2" y2="2" stroke="currentColor" stroke-width="1.6"/><circle cx="11.5" cy="13.5" r="1.3" fill="currentColor"/></svg>`;
    }
    if (dur === 2) {
        return `<svg class="duration-svg" viewBox="0 0 14 18" width="10" height="15"><ellipse cx="4.5" cy="13.5" rx="3.5" ry="2.5" transform="rotate(-25 4.5 13.5)" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="7.2" y1="13" x2="7.2" y2="2" stroke="currentColor" stroke-width="1.6"/></svg>`;
    }
    if (dur === 3) {
        return `<svg class="duration-svg" viewBox="0 0 16 18" width="13" height="15"><ellipse cx="4.5" cy="13.5" rx="3.5" ry="2.5" transform="rotate(-25 4.5 13.5)" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="7.2" y1="13" x2="7.2" y2="2" stroke="currentColor" stroke-width="1.6"/><circle cx="11.5" cy="13.5" r="1.3" fill="currentColor"/></svg>`;
    }
    if (dur === 4) {
        return `<svg class="duration-svg" viewBox="0 0 16 18" width="12" height="15"><ellipse cx="8" cy="9.5" rx="5.5" ry="3.5" transform="rotate(-15 8 9.5)" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
    }
    return `<svg class="duration-svg" viewBox="0 0 14 18" width="10" height="15"><ellipse cx="4.5" cy="13.5" rx="3.5" ry="2.5" transform="rotate(-25 4.5 13.5)" fill="currentColor"/><line x1="7.2" y1="13" x2="7.2" y2="2" stroke="currentColor" stroke-width="1.6"/></svg>`;
}

export function createMiniFingeringSVG(fingering) {
    if (!fingering || fingering.length !== 6) return '';
    const dots = fingering.map((f, i) => {
        const cx = 8 + i * 14;
        const cy = 9;
        if (f === 1) {
            return `<circle cx="${cx}" cy="${cy}" r="4.5" fill="#fbbf24" stroke="#ffffff" stroke-width="1.2"/>`;
        } else if (f === 0.5) {
            return `<circle cx="${cx}" cy="${cy}" r="4.5" fill="#09301e" stroke="#fbbf24" stroke-width="1.2"/><path d="M${cx},${cy - 4.5} A4.5,4.5 0 0,1 ${cx},${cy + 4.5} Z" fill="#fbbf24"/>`;
        } else {
            return `<circle cx="${cx}" cy="${cy}" r="4.5" fill="#09301e" stroke="#a7f3d0" stroke-width="1.2"/>`;
        }
    }).join('');
    return `<svg width="92" height="18" viewBox="0 0 92 18">${dots}</svg>`;
}
