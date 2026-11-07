/* ==========================================================================
   CELTIC WHISTLE TABS - LÓGICA DO APLICATIVO (JS)
   ========================================================================== */

// 1. CONFIGURAÇÕES & DICIONÁRIO DE NOTAS (FLAUTA EM RÉ / D)
// Posição dos furos: 1 (topo) a 6 (base).
// Valores: 1 = Fechado (●), 0 = Aberto (○), 0.5 = Meio Furo (◑).
const STANDARD_FINGERINGS = {
    'D5':  [1, 1, 1, 1, 1, 1], // Grave
    'E5':  [1, 1, 1, 1, 1, 0],
    'F#5': [1, 1, 1, 1, 0, 0],
    'G5':  [1, 1, 1, 0, 0, 0],
    'A5':  [1, 1, 0, 0, 0, 0],
    'B5':  [1, 0, 0, 0, 0, 0],
    'C5':  [0, 1, 1, 1, 1, 0], // C Natural (1ª oitava)
    'C#6': [0, 0, 0, 0, 0, 0], // C# (1ª oitava)
    
    'D6':  [0, 1, 1, 1, 1, 1], // Agudo (2ª oitava)
    'E6':  [1, 1, 1, 1, 1, 0],
    'F#6': [1, 1, 1, 1, 0, 0],
    'G6':  [1, 1, 1, 0, 0, 0],
    'A6':  [1, 1, 0, 0, 0, 0],
    'B6':  [1, 0, 0, 0, 0, 0],
    'C6':  [0, 1, 1, 1, 1, 0], // C Natural (2ª oitava)
    'C#7': [0, 0, 0, 0, 0, 0],
    
    'REST': [0, 0, 0, 0, 0, 0] // Pausa (Silêncio)
};

// Frequências padrão (para flauta afinada em Ré / D - D5 a D7)
const NOTE_FREQUENCIES = {
    'D5':  587.33,
    'E5':  659.25,
    'F#5': 739.99,
    'G5':  783.99,
    'A5':  880.00,
    'B5':  987.77,
    'C5':  1046.50, // C Natural grave
    'C#6': 1108.73,
    
    'D6':  1174.66,
    'E6':  1318.51,
    'F#6': 1479.98,
    'G6':  1567.98,
    'A6':  1760.00,
    'B6':  1975.53,
    'C6':  2093.00, // C Natural agudo
    'C#7': 2217.46,
    
    'REST': 0
};

// DADOS DE NOTAS E NOMES POR TOM DE FLAUTA
const WHISTLE_KEYS_DATA = {
    'D': {
        name: 'D (Ré)',
        semitones: 0,
        notes: {
            'D5':  { name: 'Ré (D)', display: 'D', text: 'd', fingering: [1, 1, 1, 1, 1, 1], octave2: false },
            'E5':  { name: 'Mi (E)', display: 'E', text: 'e', fingering: [1, 1, 1, 1, 1, 0], octave2: false },
            'F#5': { name: 'Fá# (F#)', display: 'F#', text: 'f#', fingering: [1, 1, 1, 1, 0, 0], octave2: false },
            'G5':  { name: 'Sol (G)', display: 'G', text: 'g', fingering: [1, 1, 1, 0, 0, 0], octave2: false },
            'A5':  { name: 'Lá (A)', display: 'A', text: 'a', fingering: [1, 1, 0, 0, 0, 0], octave2: false },
            'B5':  { name: 'Si (B)', display: 'B', text: 'b', fingering: [1, 0, 0, 0, 0, 0], octave2: false },
            'C#6': { name: 'Dó# (C#)', display: 'C#', text: 'c#', fingering: [0, 0, 0, 0, 0, 0], octave2: false },
            'C5':  { name: 'Dó Nat (C)', display: 'C', text: 'c', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Mi (E2)', display: 'e', text: 'E', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Fá# (F#2)', display: 'f#', text: 'F#', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Sol (G2)', display: 'g', text: 'G', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Si (B2)', display: 'b', text: 'B', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Dó# (C#2)', display: 'c#', text: 'C#', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Dó Nat (C2)', display: 'c', text: 'C', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C#7'],
        orderSpecials: ['C5', 'C6'],
        helpText: 'Grave: <code>d, e, f#, g, a, b, c#</code> (7ª menor: <code>c</code>) | Agudo: <code>D, E, F#, G, A, B, C#</code> | Pausa: <code>Espaço</code>'
    },
    'C': {
        name: 'C (Dó)',
        semitones: -2,
        notes: {
            'D5':  { name: 'Dó (C)', display: 'C', text: 'c', fingering: [1, 1, 1, 1, 1, 1], octave2: false },
            'E5':  { name: 'Ré (D)', display: 'D', text: 'd', fingering: [1, 1, 1, 1, 1, 0], octave2: false },
            'F#5': { name: 'Mi (E)', display: 'E', text: 'e', fingering: [1, 1, 1, 1, 0, 0], octave2: false },
            'G5':  { name: 'Fá (F)', display: 'F', text: 'f', fingering: [1, 1, 1, 0, 0, 0], octave2: false },
            'A5':  { name: 'Sol (G)', display: 'G', text: 'g', fingering: [1, 1, 0, 0, 0, 0], octave2: false },
            'B5':  { name: 'Lá (A)', display: 'A', text: 'a', fingering: [1, 0, 0, 0, 0, 0], octave2: false },
            'C#6': { name: 'Si (B)', display: 'B', text: 'b', fingering: [0, 0, 0, 0, 0, 0], octave2: false },
            'C5':  { name: 'Si♭ Nat (Bb)', display: 'Bb', text: 'bb', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Dó (C2)', display: 'c', text: 'C', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Mi (E2)', display: 'e', text: 'E', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Fá (F2)', display: 'f', text: 'F', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Sol (G2)', display: 'g', text: 'G', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Si (B2)', display: 'b', text: 'B', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Si♭ Nat (Bb2)', display: 'bb', text: 'BB', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C#7'],
        orderSpecials: ['C5', 'C6'],
        helpText: 'Grave: <code>c, d, e, f, g, a, b</code> (7ª menor: <code>bb</code>) | Agudo: <code>C, D, E, F, G, A, B</code> | Pausa: <code>Espaço</code>'
    },
    'G': {
        name: 'G (Sol)',
        semitones: 5,
        notes: {
            'D5':  { name: 'Sol (G)', display: 'G', text: 'g', fingering: [1, 1, 1, 1, 1, 1], octave2: false },
            'E5':  { name: 'Lá (A)', display: 'A', text: 'a', fingering: [1, 1, 1, 1, 1, 0], octave2: false },
            'F#5': { name: 'Si (B)', display: 'B', text: 'b', fingering: [1, 1, 1, 1, 0, 0], octave2: false },
            'G5':  { name: 'Dó (C)', display: 'C', text: 'c', fingering: [1, 1, 1, 0, 0, 0], octave2: false },
            'A5':  { name: 'Ré (D)', display: 'D', text: 'd', fingering: [1, 1, 0, 0, 0, 0], octave2: false },
            'B5':  { name: 'Mi (E)', display: 'E', text: 'e', fingering: [1, 0, 0, 0, 0, 0], octave2: false },
            'C#6': { name: 'Fá# (F#)', display: 'F#', text: 'f#', fingering: [0, 0, 0, 0, 0, 0], octave2: false },
            'C5':  { name: 'Fá Nat (F)', display: 'F', text: 'f', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Sol (G2)', display: 'g', text: 'G', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Si (B2)', display: 'b', text: 'B', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Dó (C2)', display: 'c', text: 'C', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Mi (E2)', display: 'e', text: 'E', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Fá# (F#2)', display: 'f#', text: 'F#', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Fá Nat (F2)', display: 'f', text: 'F', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C#7'],
        orderSpecials: ['C5', 'C6'],
        helpText: 'Grave: <code>g, a, b, c, d, e, f#</code> (7ª menor: <code>f</code>) | Agudo: <code>G, A, B, C, D, E, F#</code> | Pausa: <code>Espaço</code>'
    },
    'A': {
        name: 'A (Lá)',
        semitones: 7,
        notes: {
            'D5':  { name: 'Lá (A)', display: 'A', text: 'a', fingering: [1, 1, 1, 1, 1, 1], octave2: false },
            'E5':  { name: 'Si (B)', display: 'B', text: 'b', fingering: [1, 1, 1, 1, 1, 0], octave2: false },
            'F#5': { name: 'Dó# (C#)', display: 'C#', text: 'c#', fingering: [1, 1, 1, 1, 0, 0], octave2: false },
            'G5':  { name: 'Ré (D)', display: 'D', text: 'd', fingering: [1, 1, 1, 0, 0, 0], octave2: false },
            'A5':  { name: 'Mi (E)', display: 'E', text: 'e', fingering: [1, 1, 0, 0, 0, 0], octave2: false },
            'B5':  { name: 'Fá# (F#)', display: 'F#', text: 'f#', fingering: [1, 0, 0, 0, 0, 0], octave2: false },
            'C#6': { name: 'Sol# (G#)', display: 'G#', text: 'g#', fingering: [0, 0, 0, 0, 0, 0], octave2: false },
            'C5':  { name: 'Sol Nat (G)', display: 'G', text: 'g', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Si (B2)', display: 'b', text: 'B', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Dó# (C#2)', display: 'c#', text: 'C#', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Mi (E2)', display: 'e', text: 'E', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Fá# (F#2)', display: 'f#', text: 'F#', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Sol# (G#2)', display: 'g#', text: 'G#', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Sol Nat (G2)', display: 'g', text: 'G', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C#7'],
        orderSpecials: ['C5', 'C6'],
        helpText: 'Grave: <code>a, b, c#, d, e, f#, g#</code> (7ª menor: <code>g</code>) | Agudo: <code>A, B, C#, D, E, F#, G#</code> | Pausa: <code>Espaço</code>'
    },
    'Bb': {
        name: 'B♭ (Si Bemol)',
        semitones: 8,
        notes: {
            'D5':  { name: 'Si♭ (Bb)', display: 'Bb', text: 'bb', fingering: [1, 1, 1, 1, 1, 1], octave2: false },
            'E5':  { name: 'Dó (C)', display: 'C', text: 'c', fingering: [1, 1, 1, 1, 1, 0], octave2: false },
            'F#5': { name: 'Ré (D)', display: 'D', text: 'd', fingering: [1, 1, 1, 1, 0, 0], octave2: false },
            'G5':  { name: 'Mi♭ (Eb)', display: 'Eb', text: 'eb', fingering: [1, 1, 1, 0, 0, 0], octave2: false },
            'A5':  { name: 'Fá (F)', display: 'F', text: 'f', fingering: [1, 1, 0, 0, 0, 0], octave2: false },
            'B5':  { name: 'Sol (G)', display: 'G', text: 'g', fingering: [1, 0, 0, 0, 0, 0], octave2: false },
            'C#6': { name: 'Lá (A)', display: 'A', text: 'a', fingering: [0, 0, 0, 0, 0, 0], octave2: false },
            'C5':  { name: 'Lá♭ (Ab)', display: 'Ab', text: 'ab', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Si♭ (Bb2)', display: 'bb', text: 'BB', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Dó (C2)', display: 'c', text: 'C', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Mi♭ (Eb2)', display: 'eb', text: 'EB', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Fá (F2)', display: 'f', text: 'F', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Sol (G2)', display: 'g', text: 'G', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Lá♭ (Ab2)', display: 'ab', text: 'AB', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C#7'],
        orderSpecials: ['C5', 'C6'],
        helpText: 'Grave: <code>bb, c, d, eb, f, g, a</code> (7ª menor: <code>ab</code>) | Agudo: <code>BB, C, D, EB, F, G, A</code> | Pausa: <code>Espaço</code>'
    },
    'F': {
        name: 'F (Fá)',
        semitones: 3,
        notes: {
            'D5':  { name: 'Fá (F)', display: 'F', text: 'f', fingering: [1, 1, 1, 1, 1, 1], octave2: false },
            'E5':  { name: 'Sol (G)', display: 'G', text: 'g', fingering: [1, 1, 1, 1, 1, 0], octave2: false },
            'F#5': { name: 'Lá (A)', display: 'A', text: 'a', fingering: [1, 1, 1, 1, 0, 0], octave2: false },
            'G5':  { name: 'Si♭ (Bb)', display: 'Bb', text: 'bb', fingering: [1, 1, 1, 0, 0, 0], octave2: false },
            'A5':  { name: 'Dó (C)', display: 'C', text: 'c', fingering: [1, 1, 0, 0, 0, 0], octave2: false },
            'B5':  { name: 'Ré (D)', display: 'D', text: 'd', fingering: [1, 0, 0, 0, 0, 0], octave2: false },
            'C#6': { name: 'Mi (E)', display: 'E', text: 'e', fingering: [0, 0, 0, 0, 0, 0], octave2: false },
            'C5':  { name: 'Mi♭ (Eb)', display: 'Eb', text: 'eb', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Fá (F2)', display: 'f', text: 'F', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Sol (G2)', display: 'g', text: 'G', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Si♭ (Bb2)', display: 'bb', text: 'BB', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Dó (C2)', display: 'c', text: 'C', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Mi (E2)', display: 'e', text: 'E', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Mi♭ (Eb2)', display: 'eb', text: 'EB', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C#7'],
        orderSpecials: ['C5', 'C6'],
        helpText: 'Grave: <code>f, g, a, bb, c, d, e</code> (7ª menor: <code>eb</code>) | Agudo: <code>F, G, A, BB, C, D, E</code> | Pausa: <code>Espaço</code>'
    },
    'Eb': {
        name: 'E♭ (Mi Bemol)',
        semitones: 1,
        notes: {
            'D5':  { name: 'Mi♭ (Eb)', display: 'Eb', text: 'eb', fingering: [1, 1, 1, 1, 1, 1], octave2: false },
            'E5':  { name: 'Fá (F)', display: 'F', text: 'f', fingering: [1, 1, 1, 1, 1, 0], octave2: false },
            'F#5': { name: 'Sol (G)', display: 'G', text: 'g', fingering: [1, 1, 1, 1, 0, 0], octave2: false },
            'G5':  { name: 'Lá♭ (Ab)', display: 'Ab', text: 'ab', fingering: [1, 1, 1, 0, 0, 0], octave2: false },
            'A5':  { name: 'Si♭ (Bb)', display: 'Bb', text: 'bb', fingering: [1, 1, 0, 0, 0, 0], octave2: false },
            'B5':  { name: 'Dó (C)', display: 'C', text: 'c', fingering: [1, 0, 0, 0, 0, 0], octave2: false },
            'C#6': { name: 'Ré (D)', display: 'D', text: 'd', fingering: [0, 0, 0, 0, 0, 0], octave2: false },
            'C5':  { name: 'Ré♭ (Db)', display: 'Db', text: 'db', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Mi♭ (Eb2)', display: 'eb', text: 'EB', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Fá (F2)', display: 'f', text: 'F', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Sol (G2)', display: 'g', text: 'G', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Lá♭ (Ab2)', display: 'ab', text: 'AB', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Si♭ (Bb2)', display: 'bb', text: 'BB', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Dó (C2)', display: 'c', text: 'C', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Ré♭ (Db2)', display: 'db', text: 'DB', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C#7'],
        orderSpecials: ['C5', 'C6'],
        helpText: 'Grave: <code>eb, f, g, ab, bb, c, d</code> (7ª menor: <code>db</code>) | Agudo: <code>EB, F, G, AB, BB, C, D</code> | Pausa: <code>Espaço</code>'
    }
};

function getWhistleKeyData(whistleKey) {
    return WHISTLE_KEYS_DATA[whistleKey] || WHISTLE_KEYS_DATA['D'];
}

function getNoteDisplayName(noteKey, whistleKey) {
    if (noteKey === 'REST') return 'Pausa';
    if (noteKey === 'LINEBREAK') return '';
    const keyData = getWhistleKeyData(whistleKey);
    if (keyData && keyData.notes[noteKey]) {
        return keyData.notes[noteKey].display;
    }
    return NOTE_DISPLAY_NAMES[noteKey] || noteKey;
}

function isNoteOctave2(noteKey, whistleKey) {
    const keyData = getWhistleKeyData(whistleKey);
    if (keyData && keyData.notes[noteKey]) {
        return keyData.notes[noteKey].octave2;
    }
    return noteKey.endsWith('6') || noteKey.endsWith('7');
}

function getNoteNotationText(noteKey, whistleKey) {
    if (noteKey === 'REST') return ' ';
    if (noteKey === 'LINEBREAK') return '\n';
    const keyData = getWhistleKeyData(whistleKey);
    if (keyData && keyData.notes[noteKey]) {
        return keyData.notes[noteKey].text;
    }
    return '';
}

function updateTextInputHelp(whistleKey) {
    const helpEl = document.querySelector('.text-input-help');
    if (!helpEl) return;
    const keyData = getWhistleKeyData(whistleKey);
    helpEl.innerHTML = `<strong>Nova Notação (${keyData.name}):</strong> ${keyData.helpText}`;
}

// Nomes amigáveis para exibição musical (fallback)
const NOTE_DISPLAY_NAMES = {
    'D5': 'D', 'E5': 'E', 'F#5': 'F#', 'G5': 'G', 'A5': 'A', 'B5': 'B', 'C5': 'C', 'C#6': 'C#',
    'D6': 'd', 'E6': 'e', 'F#6': 'f#', 'G6': 'g', 'A6': 'a', 'B6': 'b', 'C6': 'c', 'C#7': 'c#',
    'REST': 'Pausa'
};

// Músicas Padrão (Carregadas se o localStorage estiver vazio)
const DEFAULT_SONGS = [
    {
        id: 'amazing-grace',
        title: 'Amazing Grace',
        artist: 'Tradicional',
        key: 'D',
        tempo: 100,
        notes: [
            { note: 'D5', duration: 1, lyric: 'A' },
            { note: 'G5', duration: 2, lyric: 'ma' },
            { note: 'B5', duration: 0.5, lyric: 'zing' },
            { note: 'G5', duration: 0.5, lyric: '' },
            { note: 'B5', duration: 2, lyric: 'grace,' },
            { note: 'A5', duration: 1, lyric: 'how' },
            { note: 'G5', duration: 2, lyric: 'sweet' },
            { note: 'E5', duration: 1, lyric: 'the' },
            { note: 'D5', duration: 2, lyric: 'sound,' },
            { note: 'REST', duration: 1, lyric: '' },
            { note: 'D5', duration: 1, lyric: 'that' },
            { note: 'G5', duration: 2, lyric: 'saved' },
            { note: 'B5', duration: 0.5, lyric: 'a' },
            { note: 'G5', duration: 0.5, lyric: '' },
            { note: 'B5', duration: 2, lyric: 'wretch' },
            { note: 'A5', duration: 1, lyric: 'like' },
            { note: 'D6', duration: 3, lyric: 'me.' }
        ]
    },
    {
        id: 'morrison-jig-theme',
        title: 'Morrison\'s Jig (Tema)',
        artist: 'Irish Trad',
        key: 'D',
        tempo: 120,
        notes: [
            { note: 'E5', duration: 1, lyric: '' },
            { note: 'E5', duration: 0.5, lyric: '' },
            { note: 'E5', duration: 0.5, lyric: '' },
            { note: 'B5', duration: 0.5, lyric: '' },
            { note: 'A5', duration: 0.5, lyric: '' },
            { note: 'B5', duration: 0.5, lyric: '' },
            { note: 'A5', duration: 0.5, lyric: '' },
            { note: 'G5', duration: 1, lyric: '' },
            { note: 'F#5', duration: 0.5, lyric: '' },
            { note: 'G5', duration: 1, lyric: '' },
            { note: 'A5', duration: 0.5, lyric: '' },
            { note: 'B5', duration: 1, lyric: '' },
            { note: 'A5', duration: 0.5, lyric: '' },
            { note: 'G5', duration: 0.5, lyric: '' },
            { note: 'F#5', duration: 0.5, lyric: '' },
            { note: 'E5', duration: 0.5, lyric: '' },
            { note: 'D5', duration: 1, lyric: '' }
        ]
    }
];

// 2. ESTADO DA APLICAÇÃO
let songs = [];
let currentSong = null;
let audioCtx = null;
let playbackTimeout = null;
let currentPlayIndex = -1;
let playbackStartIndex = 0;
let isPlaying = false;
let metronomeOsc = null;

// Novo Estado para Histórico, Seleção, Clipboard e Edição
let undoStack = [];
let redoStack = [];
const maxUndoHistory = 50;
let selectedIndices = new Set();
let lastSelectedNoteIndex = -1;
let clipboardNotes = [];
let repeatHasPlayed = false; // Controle de repetição no playback

// Elementos da UI
const songListEl = document.getElementById('song-list');
const btnNewSong = document.getElementById('btn-new-song');
const btnSaveSong = document.getElementById('btn-save-song');
const btnExportJson = document.getElementById('btn-export-json');
const btnExportAll = document.getElementById('btn-export-all');
const importFileEl = document.getElementById('import-file');
const btnPrint = document.getElementById('btn-print');
const btnHelp = document.getElementById('btn-help');
const searchInput = document.getElementById('search-input');

const songTitleEl = document.getElementById('song-title');
const songArtistEl = document.getElementById('song-artist');
const whistleKeyEl = document.getElementById('whistle-key');
const songTimeSignatureEl = document.getElementById('song-time-signature');
const songTempoEl = document.getElementById('song-tempo');
const songCategoryEl = document.getElementById('song-category');
const songDifficultyEl = document.getElementById('song-difficulty');
const songRhythmEl = document.getElementById('song-rhythm');

// Banner de Leitura Compacto (Modos Treino e Play-Along)
const songDisplayBanner = document.getElementById('song-display-banner');
const bannerSongTitle = document.getElementById('banner-song-title');
const bannerSongBadge = document.getElementById('banner-song-badge');
const bannerArtist = document.getElementById('banner-artist');
const bannerKey = document.getElementById('banner-key');
const bannerTime = document.getElementById('banner-time');
const bannerTempo = document.getElementById('banner-tempo');

const tabSheetEl = document.getElementById('tab-sheet');
const emptyMessageEl = document.getElementById('empty-message');
const textNotesInputEl = document.getElementById('text-notes-input');
const textNotesErrorEl = document.getElementById('text-notes-error');

const btnPlay = document.getElementById('btn-play');
const btnStop = document.getElementById('btn-stop');
const playSpeedSelect = document.getElementById('play-speed-select');
const toggleMetronome = document.getElementById('toggle-metronome');
const btnClearTab = document.getElementById('btn-clear-tab');

// Elementos da Toolbar de Edição, Seleção e Histórico
const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
const btnInsertBar = document.getElementById('btn-insert-bar');
const btnInsertDoubleBar = document.getElementById('btn-insert-double-bar');
const btnInsertRepeatStart = document.getElementById('btn-insert-repeat-start');
const btnInsertRepeatEnd = document.getElementById('btn-insert-repeat-end');
const btnInsertLinebreak = document.getElementById('btn-insert-linebreak');
const editInsertionModeEl = document.getElementById('edit-insertion-mode');
const selectionStatusBadge = document.getElementById('selection-status-badge');
const btnCopySelection = document.getElementById('btn-copy-selection');
const btnPasteSelection = document.getElementById('btn-paste-selection');
const btnDuplicateSelection = document.getElementById('btn-duplicate-selection');
const btnDeleteSelection = document.getElementById('btn-delete-selection');
const btnClearSelection = document.getElementById('btn-clear-selection');

// Elementos de Acordes e Teclado
const keyboardChordInput = document.getElementById('keyboard-chord-input');
const btnApplyChord = document.getElementById('btn-apply-chord');

// Elementos do Modal ABC
const btnOpenAbc = document.getElementById('btn-open-abc');
const abcModal = document.getElementById('abc-modal');
const btnCloseAbc = document.getElementById('btn-close-abc');
const btnCloseAbcDone = document.getElementById('btn-close-abc-done');
const importAbcTextarea = document.getElementById('import-abc-textarea');
const exportAbcTextarea = document.getElementById('export-abc-textarea');
const btnApplyImportAbc = document.getElementById('btn-apply-import-abc');
const btnCopyAbc = document.getElementById('btn-copy-abc');
const btnDownloadAbc = document.getElementById('btn-download-abc');
const abcFileInput = document.getElementById('abc-file-input');
const abcFeedback = document.getElementById('abc-feedback');

// Elementos do Modal de Transposição
const btnOpenTranspose = document.getElementById('btn-open-transpose');
const transposeModal = document.getElementById('transpose-modal');
const btnCloseTranspose = document.getElementById('btn-close-transpose');
const btnCloseTransposeDone = document.getElementById('btn-close-transpose-done');
const btnUndoTranspose = document.getElementById('btn-undo-transpose');
const transposeFromKeyEl = document.getElementById('transpose-from-key');
const transposeToKeyEl = document.getElementById('transpose-to-key');
const btnApplyFluteTranspose = document.getElementById('btn-apply-flute-transpose');
const btnApplyCustomSemitones = document.getElementById('btn-apply-custom-semitones');
const customSemitonesSelect = document.getElementById('custom-semitones-select');
const chkFluteAutofold = document.getElementById('chk-flute-autofold');
const chkPitchAutofold = document.getElementById('chk-pitch-autofold');
const fluteConvertPreview = document.getElementById('flute-convert-preview');
const transposeFeedback = document.getElementById('transpose-feedback');

const helpModal = document.getElementById('help-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCloseModalOk = document.getElementById('btn-close-modal-ok');

const sidebarToggleBtn = document.getElementById('sidebar-toggle');
const sidebarEl = document.getElementById('sidebar');

// ==========================================
// ESTADO & ELEMENTOS DA FASE 2: MODO PRÁTICA
// ==========================================
let currentAppMode = 'studio'; // 'studio' | 'practice'

// Loop A-B
let loopAIndex = -1;
let loopBIndex = -1;
let isLoopActive = false;
let loopCycleCount = 0;

// Speed Trainer
let isSpeedTrainerActive = false;
let speedTrainerStep = 4;

// Bordão Celta (Drone)
let isDroneActive = false;
let droneGainNode = null;
let droneOsc1 = null;
let droneOsc2 = null;
let droneFilter = null;

// Count-in (Contagem Regressiva)
let isCountInActive = true;
let isCountingIn = false;
let countInTimeout = null;

// Zoom da Tablatura
const ZOOM_LEVELS = ['sm', 'md', 'lg', 'xl'];
const ZOOM_LABELS = ['85%', '100%', '120%', '140%'];
let currentZoomIndex = 1; // 100%

// Afinador & Escuta por Microfone (Play-Along)
let micStream = null;
let micAudioContext = null;
let micAnalyser = null;
let micRafId = null;
let isMicListening = false;
let micTunerMode = 'free'; // 'free' | 'follow'

// Elementos DOM do Modo Prática
const btnModeStudio = document.getElementById('btn-mode-studio');
const btnModePractice = document.getElementById('btn-mode-practice');
const practiceToolbar = document.getElementById('practice-toolbar');
const practiceBottomPanel = document.getElementById('practice-bottom-panel');

const btnSetLoopA = document.getElementById('btn-set-loop-a');
const btnSetLoopB = document.getElementById('btn-set-loop-b');
const toggleLoopAb = document.getElementById('toggle-loop-ab');
const btnClearLoop = document.getElementById('btn-clear-loop');
const loopStatusText = document.getElementById('loop-status-text');

const toggleSpeedTrainer = document.getElementById('toggle-speed-trainer');
const speedTrainerStepEl = document.getElementById('speed-trainer-step');
const trainerCycleBadge = document.getElementById('trainer-cycle-badge');

const btnToggleDrone = document.getElementById('btn-toggle-drone');
const droneBtnLabel = document.getElementById('drone-btn-label');
const droneVolumeEl = document.getElementById('drone-volume');
const droneStatusText = document.getElementById('drone-status-text');

const toggleCountIn = document.getElementById('toggle-count-in');
const countInOverlay = document.getElementById('count-in-overlay');
const countInNum = document.getElementById('count-in-num');
const countInInfo = document.getElementById('count-in-info');

const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const zoomIndicator = document.getElementById('zoom-indicator');
const btnFullscreen = document.getElementById('btn-fullscreen');

const btnToggleMic = document.getElementById('btn-toggle-mic');
const micBtnLabel = document.getElementById('mic-btn-label');
const tunerDetectedNote = document.getElementById('tuner-detected-note');
const tunerDetectedFreq = document.getElementById('tuner-detected-freq');
const tunerNeedle = document.getElementById('tuner-needle');
const tunerStatusMsg = document.getElementById('tuner-status-msg');

// ==========================================================================
// ESTADO & ELEMENTOS DA FASE 5: PLAY-ALONG INTERATIVO POR MICROFONE
// ==========================================================================
const btnModePlayAlong = document.getElementById('btn-mode-playalong');
const playalongToolbar = document.getElementById('playalong-toolbar');
const playalongBottomPanel = document.getElementById('playalong-bottom-panel');

const btnPlayAlongToggle = document.getElementById('btn-playalong-toggle');
const playalongToggleLabel = document.getElementById('playalong-toggle-label');
const btnPlayAlongRestart = document.getElementById('btn-playalong-restart');
const playalongStatusIndicator = document.getElementById('playalong-status-indicator');

const btnPaModeStep = document.getElementById('btn-pa-mode-step');
const btnPaModeFlow = document.getElementById('btn-pa-mode-flow');
const playalongModeHint = document.getElementById('playalong-mode-hint');

const playalongToleranceSelect = document.getElementById('playalong-tolerance-select');
const togglePaBackingAudio = document.getElementById('toggle-pa-backing-audio');
const playalongVuFill = document.getElementById('playalong-vu-fill');
const playalongMicBadge = document.getElementById('playalong-mic-badge');

// Elementos do HUD do Play-Along
const paTargetNote = document.getElementById('pa-target-note');
const paTargetFingerings = document.getElementById('pa-target-fingerings');
const paHeardNote = document.getElementById('pa-heard-note');
const paHeardCents = document.getElementById('pa-heard-cents');
const paPitchVerdict = document.getElementById('pa-pitch-verdict');
const paGaugeNeedle = document.getElementById('pa-gauge-needle');
const paStatProgress = document.getElementById('pa-stat-progress');
const paStatAccuracy = document.getElementById('pa-stat-accuracy');
const paStatCombo = document.getElementById('pa-stat-combo');
const paProgressBar = document.getElementById('pa-progress-bar');

// Modal de Resultado do Play-Along
const playalongResultModal = document.getElementById('playalong-result-modal');
const btnClosePaResult = document.getElementById('btn-close-pa-result');
const paResultStars = document.getElementById('pa-result-stars');
const paResultTitle = document.getElementById('pa-result-title');
const paResultSubtitle = document.getElementById('pa-result-subtitle');
const paResultAccuracy = document.getElementById('pa-result-accuracy');
const paResultHits = document.getElementById('pa-result-hits');
const paResultMaxCombo = document.getElementById('pa-result-max-combo');
const btnPaResultReplay = document.getElementById('btn-pa-result-replay');
const btnPaResultContinue = document.getElementById('btn-pa-result-continue');

// Estado interno do Play-Along
let isPlayAlongRunning = false;
let playAlongMode = 'step'; // 'step' (espera a nota) | 'flow' (no ritmo / tempo real)
let playAlongCurrentIndex = 0;
let playAlongTotalNotes = 0;
let playAlongHits = 0;
let playAlongAttempts = 0;
let playAlongCombo = 0;
let playAlongMaxCombo = 0;
let playAlongToleranceCents = 35;
let playAlongNoteConfirmedCount = 0;
let playAlongAudioContext = null;
let playAlongMicStream = null;
let playAlongBiquad = null;
let playAlongAnalyser = null;
let playAlongRafId = null;
let playAlongFlowTimer = null;
let playAlongFlowStepPending = false;
let playAlongFlowNoteWasHit = false;

// ==========================================================================
// ESTADO & ELEMENTOS DA FASE 3: BIBLIOTECA, CURADORIA, FILTROS & SIDEBAR
// ==========================================================================
let userSongs = [];
let selectedCategory = 'all';
let selectedDifficulty = 'all';
let selectedRhythm = 'all';

const btnToggleSidebarCollapse = document.getElementById('btn-toggle-sidebar-collapse');
const btnSidebarFloatingOpen = document.getElementById('btn-sidebar-floating-open');
const filterDifficulty = document.getElementById('filter-difficulty');
const filterRhythm = document.getElementById('filter-rhythm');
const songsCountBadge = document.getElementById('songs-count-badge');
const btnResetFilters = document.getElementById('btn-reset-filters');

// 3. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    loadSongs();
    setupEventListeners();
    setupEditorToolbar();
    setupKeyboardTabs();
    setupEditorModeTabs();
    setupNoteInputEvents();
    setupTransposeModal();
    setupABCModal();
    setupPracticeMode();
    setupPlayAlongMode();
    setupSidebarFiltersAndCollapse();
    setupPhase4VisualsAndExport();
    const initialKey = currentSong ? (currentSong.key || 'D') : (whistleKeyEl ? whistleKeyEl.value : 'D');
    renderKeyboard(initialKey);
    updateTextInputHelp(initialKey);
});

// Carrega as músicas do repertório curado e do armazenamento local do usuário
function loadSongs() {
    // 1. Catálogo Curado Nativo da Fase 3
    const curated = (typeof CURATED_REPERTOIRE !== 'undefined' && Array.isArray(CURATED_REPERTOIRE))
        ? JSON.parse(JSON.stringify(CURATED_REPERTOIRE))
        : (typeof DEFAULT_SONGS !== 'undefined' ? DEFAULT_SONGS : []);
        
    // 2. Músicas do Usuário (Migração suave de versões anteriores)
    const savedUserSongs = localStorage.getItem('celtic_whistle_tabs_user');
    const legacySaved = localStorage.getItem('celtic_whistle_tabs');
    
    if (savedUserSongs) {
        try {
            userSongs = JSON.parse(savedUserSongs);
        } catch (e) {
            console.error("Erro ao ler celtic_whistle_tabs_user:", e);
            userSongs = [];
        }
    } else if (legacySaved) {
        try {
            const parsedLegacy = JSON.parse(legacySaved);
            userSongs = parsedLegacy.filter(s => s.id !== 'amazing-grace' && s.id !== 'morrison-jig-theme');
            localStorage.setItem('celtic_whistle_tabs_user', JSON.stringify(userSongs));
        } catch (e) {
            userSongs = [];
        }
    } else {
        userSongs = [];
    }

    // 3. Mesclar catálogo curado e composições pessoais
    // Músicas personalizadas do usuário têm prioridade
    const userIds = new Set(userSongs.map(s => s.id));
    const nonOverriddenCurated = curated.filter(c => !userIds.has(c.id));
    songs = [...userSongs, ...nonOverriddenCurated];
    
    // 4. Restaurar preferência de menu colapsado
    const savedCollapse = localStorage.getItem('sidebar_collapsed') === 'true';
    if (savedCollapse && window.innerWidth > 900) {
        setSidebarCollapse(true);
    }

    renderSidebar();
    
    if (songs.length > 0) {
        selectSong(songs[0].id);
    } else {
        createNewSong();
    }
}

function saveSongsToStorage() {
    if (currentSong) {
        const uIdx = userSongs.findIndex(s => s.id === currentSong.id);
        if (uIdx !== -1) {
            userSongs[uIdx] = JSON.parse(JSON.stringify(currentSong));
        } else if (!currentSong.isCurated) {
            userSongs.unshift(JSON.parse(JSON.stringify(currentSong)));
        } else {
            // Música da curadoria modificada pelo usuário
            const modifiedCurated = JSON.parse(JSON.stringify(currentSong));
            modifiedCurated.isUserModified = true;
            userSongs.push(modifiedCurated);
        }
    }
    localStorage.setItem('celtic_whistle_tabs_user', JSON.stringify(userSongs));
    localStorage.setItem('celtic_whistle_tabs', JSON.stringify(songs));
}

// 4. OPERAÇÕES DE MÚSICA (CRUD)
function createNewSong() {
    const id = 'user-song-' + Date.now();
    const newSong = {
        id: id,
        title: 'Minha Composição',
        artist: 'Compositor',
        category: (songCategoryEl ? songCategoryEl.value : 'celtic') || 'celtic',
        difficulty: (songDifficultyEl ? songDifficultyEl.value : 'iniciante') || 'iniciante',
        rhythm: (songRhythmEl ? songRhythmEl.value : 'reel') || 'reel',
        key: 'D',
        timeSignature: '4/4',
        tempo: 110,
        isCurated: false,
        notes: []
    };
    userSongs.unshift(newSong);
    songs.unshift(newSong);
    saveSongsToStorage();
    renderSidebar();
    selectSong(id);
    songTitleEl.focus();
    songTitleEl.select();
}

function updateSongDisplayBanner(song) {
    if (!song) return;
    if (bannerSongTitle) bannerSongTitle.textContent = song.title || 'Sem Título';
    if (bannerArtist) bannerArtist.textContent = `Compositor: ${song.artist || 'Tradicional'}`;
    if (bannerKey) bannerKey.textContent = `Tom: ${song.key || 'D'}`;
    if (bannerTime) bannerTime.textContent = `Compasso: ${song.timeSignature || '4/4'}`;
    if (bannerTempo) bannerTempo.textContent = `${song.tempo || 110} BPM`;

    if (bannerSongBadge) {
        let catLabel = '🍀 Celta';
        let catClass = 'tag-celtic';
        if (song.category === 'pop') {
            catLabel = '🎬 Filmes';
            catClass = 'tag-pop';
        } else if (song.category === 'rock') {
            catLabel = '🎸 Rock';
            catClass = 'tag-rock';
        } else if (song.category === 'anime') {
            catLabel = '⛩️ Anime';
            catClass = 'tag-anime';
        } else if (song.category === 'other') {
            catLabel = '🎶 Outro';
            catClass = 'tag-other';
        } else if (song.category === 'traditional') {
            catLabel = '📜 Folclore';
            catClass = 'tag-traditional';
        }
        
        if (!song.isCurated) {
            catLabel = '⭐ Minha';
            catClass = 'tag-mysong';
        } else if (song.isUserModified) {
            catLabel = '✏️ Editada';
            catClass = 'tag-mysong';
        }
        
        bannerSongBadge.className = `badge-tag ${catClass}`;
        bannerSongBadge.textContent = catLabel;
    }
}

function selectSong(id) {
    playbackStartIndex = 0;
    stopPlayback();
    const song = songs.find(s => s.id === id);
    if (!song) return;
    
    currentSong = song;
    lastTransposedState = null;
    if (btnUndoTranspose) btnUndoTranspose.disabled = true;
    
    // Resetar histórico e seleção para a nova música
    undoStack = [];
    redoStack = [];
    clearSelection();
    updateHistoryButtons();
    
    // Atualizar UI com os metadados da música
    songTitleEl.value = song.title;
    songArtistEl.value = song.artist || 'Tradicional';
    whistleKeyEl.value = song.key || 'D';
    if (songTimeSignatureEl) songTimeSignatureEl.value = song.timeSignature || '4/4';
    songTempoEl.value = song.tempo || 110;
    if (songCategoryEl) songCategoryEl.value = song.category || 'celtic';
    if (songDifficultyEl) songDifficultyEl.value = song.difficulty || 'iniciante';
    if (songRhythmEl) songRhythmEl.value = song.rhythm || 'reel';
    
    // Atualizar banner compacto de leitura
    updateSongDisplayBanner(song);
    
    // Marcar item ativo na barra lateral
    document.querySelectorAll('.song-item').forEach(item => {
        if (item.dataset.id === id) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    renderKeyboard(song.key || 'D');
    updateTextInputHelp(song.key || 'D');
    renderTab();
    updateTextNotesInput();
}

function deleteSong(id, event) {
    if (event) event.stopPropagation();
    
    const song = songs.find(s => s.id === id);
    if (!song) return;
    
    if (song.isCurated) {
        const uIdx = userSongs.findIndex(s => s.id === id);
        if (uIdx !== -1) {
            if (confirm(`Deseja redefinir a música "${song.title}" para a versão original da curadoria?`)) {
                userSongs.splice(uIdx, 1);
                localStorage.setItem('celtic_whistle_tabs_user', JSON.stringify(userSongs));
                const original = (typeof CURATED_REPERTOIRE !== 'undefined') ? CURATED_REPERTOIRE.find(c => c.id === id) : null;
                if (original) {
                    const idx = songs.findIndex(s => s.id === id);
                    if (idx !== -1) songs[idx] = JSON.parse(JSON.stringify(original));
                }
                renderSidebar();
                selectSong(id);
                alert(`"${song.title}" restaurada para a partitura original de curadoria!`);
            }
            return;
        } else {
            alert('Esta música pertence ao repertório nativo curado da biblioteca e está em sua versão de referência.');
            return;
        }
    }
    
    if (confirm(`Deseja mesmo excluir a música "${song.title}"?`)) {
        stopPlayback();
        userSongs = userSongs.filter(s => s.id !== id);
        songs = songs.filter(s => s.id !== id);
        localStorage.setItem('celtic_whistle_tabs_user', JSON.stringify(userSongs));
        renderSidebar();
        
        if (currentSong && currentSong.id === id) {
            if (songs.length > 0) {
                selectSong(songs[0].id);
            } else {
                createNewSong();
            }
        }
    }
}

function updateCurrentSongMetadata() {
    if (!currentSong) return;
    
    currentSong.title = songTitleEl.value || 'Sem Título';
    currentSong.artist = songArtistEl.value;
    currentSong.key = whistleKeyEl.value;
    if (songTimeSignatureEl) currentSong.timeSignature = songTimeSignatureEl.value;
    currentSong.tempo = parseInt(songTempoEl.value) || 120;
    if (songCategoryEl) currentSong.category = songCategoryEl.value;
    if (songDifficultyEl) currentSong.difficulty = songDifficultyEl.value;
    if (songRhythmEl) currentSong.rhythm = songRhythmEl.value;
    
    updateSongDisplayBanner(currentSong);
    
    // Atualizar na lista
    const idx = songs.findIndex(s => s.id === currentSong.id);
    if (idx !== -1) {
        songs[idx] = currentSong;
        saveSongsToStorage();
        
        // Atualiza apenas o texto na barra lateral para evitar re-render total do DOM durante a digitação
        const sidebarTitle = document.querySelector(`.song-item[data-id="${currentSong.id}"] .song-item-title`);
        if (sidebarTitle) sidebarTitle.textContent = currentSong.title;
        const sidebarMeta = document.querySelector(`.song-item[data-id="${currentSong.id}"] .song-item-meta`);
        if (sidebarMeta) sidebarMeta.textContent = `${currentSong.artist || 'Tradicional'} • ${currentSong.key} • ${currentSong.tempo} BPM`;
    }
}

// 5. RENDERIZAÇÃO DA SIDEBAR & FILTROS RICOS (FASE 3)
function renderSidebar() {
    songListEl.innerHTML = '';
    const query = (searchInput.value || '').toLowerCase().trim();
    
    const filteredSongs = songs.filter(s => {
        // 1. Busca Textual
        const matchesQuery = !query || 
            (s.title && s.title.toLowerCase().includes(query)) || 
            (s.artist && s.artist.toLowerCase().includes(query)) ||
            (s.rhythm && s.rhythm.toLowerCase().includes(query));
            
        // 2. Categoria
        let matchesCategory = true;
        if (selectedCategory === 'celtic') matchesCategory = (s.category === 'celtic');
        else if (selectedCategory === 'pop') matchesCategory = (s.category === 'pop');
        else if (selectedCategory === 'rock') matchesCategory = (s.category === 'rock');
        else if (selectedCategory === 'anime') matchesCategory = (s.category === 'anime');
        else if (selectedCategory === 'other') matchesCategory = (s.category === 'other');
        else if (selectedCategory === 'my-songs') matchesCategory = (!s.isCurated || s.isUserModified);
        
        // 3. Dificuldade
        let matchesDifficulty = true;
        if (selectedDifficulty !== 'all') {
            matchesDifficulty = (s.difficulty === selectedDifficulty);
        }
        
        // 4. Ritmo
        let matchesRhythm = true;
        if (selectedRhythm !== 'all') {
            matchesRhythm = (s.rhythm === selectedRhythm);
        }
        
        return matchesQuery && matchesCategory && matchesDifficulty && matchesRhythm;
    });
    
    // Atualizar contador e status de filtros
    if (songsCountBadge) {
        songsCountBadge.textContent = `${filteredSongs.length} de ${songs.length} músicas`;
    }
    
    if (btnResetFilters) {
        const hasFilters = (query || selectedCategory !== 'all' || selectedDifficulty !== 'all' || selectedRhythm !== 'all');
        btnResetFilters.style.display = hasFilters ? 'inline' : 'none';
    }
    
    if (filteredSongs.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.style.padding = '20px 12px';
        emptyLi.style.textAlign = 'center';
        emptyLi.style.color = 'var(--text-muted)';
        emptyLi.style.fontSize = '0.85rem';
        emptyLi.innerHTML = `
            <p>Nenhuma música encontrada com os filtros atuais.</p>
            <button class="btn btn-secondary btn-sm" style="margin-top: 10px;" onclick="resetSidebarFilters()">Limpar Filtros</button>
        `;
        songListEl.appendChild(emptyLi);
        return;
    }
    
    filteredSongs.forEach(song => {
        const li = document.createElement('li');
        li.className = 'song-item';
        if (currentSong && song.id === currentSong.id) {
            li.classList.add('active');
        }
        li.dataset.id = song.id;
        li.onclick = () => selectSong(song.id);
        
        // Badge de Categoria
        let catLabel = '🍀 Celta';
        let catClass = 'tag-celtic';
        if (song.category === 'pop') {
            catLabel = '🎬 Filmes';
            catClass = 'tag-pop';
        } else if (song.category === 'rock') {
            catLabel = '🎸 Rock';
            catClass = 'tag-rock';
        } else if (song.category === 'anime') {
            catLabel = '⛩️ Anime';
            catClass = 'tag-anime';
        } else if (song.category === 'other') {
            catLabel = '🎶 Outro';
            catClass = 'tag-other';
        } else if (song.category === 'traditional') {
            catLabel = '📜 Folclore';
            catClass = 'tag-traditional';
        }
        if (!song.isCurated) {
            catLabel = '⭐ Minha';
            catClass = 'tag-mysong';
        } else if (song.isUserModified) {
            catLabel = '✏️ Editada';
            catClass = 'tag-mysong';
        }
        
        // Estrelas de Dificuldade
        let diffLabel = '★☆☆';
        if (song.difficulty === 'intermediario') diffLabel = '★★☆';
        else if (song.difficulty === 'avancado') diffLabel = '★★★';
        
        // Rótulo de Ritmo
        const rhythmNames = {
            'jig': 'Jig',
            'reel': 'Reel',
            'waltz': 'Valsa',
            'polka': 'Polka',
            'air': 'Slow Air',
            'soundtrack': 'Trilha'
        };
        const rhythmLabel = rhythmNames[song.rhythm] || song.timeSignature || '';

        li.innerHTML = `
            <div class="song-item-info">
                <span class="song-item-title">${escapeHTML(song.title)}</span>
                <span class="song-item-meta">${escapeHTML(song.artist || 'Tradicional')} • ${song.key} • ${song.tempo} BPM</span>
                <div class="song-badges">
                    <span class="badge-tag ${catClass}">${catLabel}</span>
                    ${song.difficulty ? `<span class="badge-diff" title="Dificuldade: ${song.difficulty}">${diffLabel}</span>` : ''}
                    ${rhythmLabel ? `<span class="badge-rhythm">${rhythmLabel}</span>` : ''}
                </div>
            </div>
            <div class="song-item-actions">
                ${!song.isCurated ? `
                    <button class="btn-icon delete" title="Excluir Música">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                ` : (song.isUserModified ? `
                    <button class="btn-icon reset" title="Restaurar Versão Original">
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
                    </button>
                ` : `
                    <span title="Música Oficial da Curadoria" style="color: var(--gold-primary); font-size: 13px; opacity: 0.6; padding-right: 4px;">✓</span>
                `)}
            </div>
        `;
        
        const btnDel = li.querySelector('.btn-icon.delete');
        if (btnDel) {
            btnDel.onclick = (e) => deleteSong(song.id, e);
        }
        const btnReset = li.querySelector('.btn-icon.reset');
        if (btnReset) {
            btnReset.onclick = (e) => deleteSong(song.id, e);
        }
        
        songListEl.appendChild(li);
    });
}

function getOrnamentSymbol(ornament) {
    if (!ornament) return '';
    const map = {
        'roll': '~',
        'cut': '^',
        'strike': 'v',
        'cran': '*',
        'slide': '/'
    };
    return map[ornament] || '';
}

function cycleNextOrnament(current) {
    const sequence = ['', 'roll', 'cut', 'strike', 'cran', 'slide'];
    const idx = sequence.indexOf(current || '');
    return sequence[(idx + 1) % sequence.length];
}

function createMeasureBarSVG(barType) {
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
    // Barra simples (padrão)
    return `
        <svg class="measure-bar-svg" viewBox="0 0 14 110">
            <line x1="7" y1="5" x2="7" y2="105" stroke="var(--parchment-text)" stroke-width="2" />
        </svg>
    `;
}

function renderTab() {
    // Remove notas anteriores, barras e quebras de linha
    const cards = tabSheetEl.querySelectorAll('.note-card, .line-break, .measure-bar-card');
    cards.forEach(c => c.remove());
    
    if (!currentSong || currentSong.notes.length === 0) {
        emptyMessageEl.style.display = 'flex';
        updateSelectionToolbar();
        return;
    }
    
    emptyMessageEl.style.display = 'none';

    if (playbackStartIndex >= currentSong.notes.length) {
        playbackStartIndex = 0;
    }
    
    // Injetar gradiente SVG global para meio-furo se não existir
    if (!document.getElementById('svg-global-defs')) {
        const defsContainer = document.createElement('div');
        defsContainer.id = 'svg-global-defs';
        defsContainer.style.height = '0';
        defsContainer.style.width = '0';
        defsContainer.style.position = 'absolute';
        defsContainer.style.overflow = 'hidden';
        defsContainer.innerHTML = `
            <svg>
                <defs>
                    <linearGradient id="half-fill" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="50%" stop-color="currentColor" />
                        <stop offset="50%" stop-color="white" />
                    </linearGradient>
                </defs>
            </svg>
        `;
        document.body.appendChild(defsContainer);
    }
    
    let measureNumber = 1;

    currentSong.notes.forEach((noteObj, index) => {
        // 1. Quebra de Linha
        if (noteObj.note === 'LINEBREAK') {
            const br = document.createElement('div');
            br.className = 'line-break';
            br.dataset.index = index;
            br.innerHTML = `
                <button class="line-break-btn" title="Remover quebra de linha">Quebra de Linha &times;</button>
            `;
            br.querySelector('.line-break-btn').onclick = (e) => {
                e.stopPropagation();
                removeNote(index);
            };
            tabSheetEl.appendChild(br);
            return;
        }

        // 2. Barras de Compasso (Measure Bars: BAR, DOUBLE_BAR, REPEAT_START, REPEAT_END)
        if (['BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END'].includes(noteObj.note)) {
            const barCard = document.createElement('div');
            barCard.className = `measure-bar-card ${selectedIndices.has(index) ? 'is-selected' : ''}`;
            barCard.dataset.index = index;
            barCard.title = `Barra de Compasso (${noteObj.note}) - Compasso #${measureNumber}`;
            
            barCard.innerHTML = `
                <button class="measure-bar-btn-delete" title="Excluir Barra">&times;</button>
                <div class="measure-number">${measureNumber}</div>
                ${createMeasureBarSVG(noteObj.note)}
            `;

            barCard.addEventListener('click', (e) => {
                if (e.target.closest('.measure-bar-btn-delete')) return;
                if (e.shiftKey && lastSelectedNoteIndex !== -1) {
                    selectRangeNotes(lastSelectedNoteIndex, index);
                } else {
                    selectSingleNote(index);
                }
            });

            barCard.querySelector('.measure-bar-btn-delete').onclick = (e) => {
                e.stopPropagation();
                removeNote(index);
            };

            tabSheetEl.appendChild(barCard);
            measureNumber++;
            return;
        }

        // 3. Notas Musicais e Pausas (REST)
        const isRest = noteObj.note === 'REST';
        const isPlaybackStart = (index === playbackStartIndex);
        const isSelected = selectedIndices.has(index);
        
        const isLoopA = (index === loopAIndex);
        const isLoopB = (index === loopBIndex);
        const isInLoop = (isLoopActive && loopAIndex !== -1 && loopBIndex !== -1 && index >= Math.min(loopAIndex, loopBIndex) && index <= Math.max(loopAIndex, loopBIndex));
        let loopClasses = '';
        if (isLoopA) loopClasses += ' loop-marker-a';
        if (isLoopB) loopClasses += ' loop-marker-b';
        if (isInLoop) loopClasses += ' in-loop';

        const card = document.createElement('div');
        card.className = `note-card${isRest ? ' rest-card' : ''}${isPlaybackStart ? ' playback-start' : ''}${isSelected ? ' is-selected' : ''}${loopClasses}`;
        card.dataset.index = index;
        card.title = 'Clique para selecionar / iniciar reprodução (Shift+Clique para selecionar bloco)';
        
        const currentKey = currentSong ? (currentSong.key || 'D') : (whistleKeyEl ? whistleKeyEl.value : 'D');
        const displayName = getNoteDisplayName(noteObj.note, currentKey);
        const isOctave2 = isNoteOctave2(noteObj.note, currentKey);
        const pitchClass = `note-card-pitch ${isRest ? 'rest' : ''} ${isOctave2 ? 'octave2' : ''}`;
        
        const fingering = STANDARD_FINGERINGS[noteObj.note] || [0, 0, 0, 0, 0, 0];
        
        let svgContent = '';
        if (isRest) {
            svgContent = `
                <svg class="whistle-svg" viewBox="0 0 22 100">
                    <path d="M11,35 L11,65 M6,40 L16,40 M8,50 L14,50 M6,60 L16,60" stroke="var(--parchment-text)" stroke-width="2" fill="none" />
                </svg>
            `;
        } else {
            let circles = '';
            const holeYPositions = [15, 30, 45, 60, 75, 90];
            
            fingering.forEach((state, hIdx) => {
                const y = holeYPositions[hIdx];
                let fillClass = 'open';
                if (state === 1) fillClass = 'closed';
                else if (state === 0.5) fillClass = 'half';
                
                circles += `<circle cx="11" cy="${y}" r="4.5" class="${fillClass}" data-hole-index="${hIdx}" />`;
            });
            
            svgContent = `
                <svg class="whistle-svg" viewBox="0 0 22 105" data-note-index="${index}">
                    <line x1="11" y1="5" x2="11" y2="100" class="body-line" />
                    ${circles}
                </svg>
            `;
        }
        
        const durLabels = {
            '0.25': 'Semicolcheia (0.25t)',
            '0.5': 'Colcheia (0.5t)',
            '1': 'Semínima (1t)',
            '1.5': 'Semínima pontuada (1.5t)',
            '2': 'Mínima (2t)',
            '3': 'Mínima pontuada (3t)',
            '4': 'Semibreve (4t)'
        };
        const durTitle = durLabels[String(noteObj.duration)] || `${noteObj.duration}t`;
        const chordDisplay = noteObj.chord || '';
        const ornamentDisplay = getOrnamentSymbol(noteObj.ornament);

        card.innerHTML = `
            <button class="note-card-delete" title="Remover">&times;</button>
            <div class="note-card-chord ${chordDisplay ? '' : 'empty'}" title="Clique para editar Acorde/Cifra">${escapeHTML(chordDisplay || '+')}</div>
            <div class="note-card-ornament ${ornamentDisplay ? '' : 'empty'}" data-type="${noteObj.ornament || ''}" title="Ornamento: ${noteObj.ornament || 'Nenhum'} (clique para alternar)">${ornamentDisplay}</div>
            <div class="${pitchClass}">${isRest ? 'Pausa' : displayName}</div>
            ${svgContent}
            <div class="note-card-duration-symbol" title="Duração: ${durTitle} - Clique para alterar" data-index="${index}">${getDurationSymbol(noteObj.duration)}</div>
            <input type="text" class="note-card-lyric" value="${escapeHTML(noteObj.lyric || '')}" placeholder="..." title="Sílaba da letra">
            <div class="note-card-duration-bar" data-duration="${noteObj.duration}"></div>
        `;
        
        // Clique no cartão (Seleção e Início de Reprodução)
        card.addEventListener('click', (e) => {
            if (e.target.closest('.note-card-delete') || 
                e.target.closest('.note-card-duration-symbol') || 
                e.target.closest('.note-card-lyric') ||
                e.target.closest('.note-card-chord') ||
                e.target.closest('.note-card-ornament')) {
                return;
            }
            
            if (e.shiftKey && lastSelectedNoteIndex !== -1) {
                selectRangeNotes(lastSelectedNoteIndex, index);
            } else {
                selectSingleNote(index);
            }

            setPlaybackStartIndex(index);
            
            if (!isPlaying) {
                playSingleNoteSound(noteObj);
            }
        });

        // Duplo clique: toca a nota
        card.addEventListener('dblclick', () => {
            playSingleNoteSound(noteObj);
        });

        // Clique no Acorde/Cifra
        const chordEl = card.querySelector('.note-card-chord');
        chordEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentChord = noteObj.chord || '';
            const newChord = prompt('Digite o Acorde / Cifra para esta nota (ex: D, Em, G, A7) ou deixe em branco para remover:', currentChord);
            if (newChord !== null) {
                pushHistoryState('Alterar Acorde');
                noteObj.chord = newChord.trim();
                saveSongsToStorage();
                renderTab();
            }
        });

        // Clique no Ornamento (Alternar sequencialmente)
        const ornamentEl = card.querySelector('.note-card-ornament');
        ornamentEl.addEventListener('click', (e) => {
            e.stopPropagation();
            pushHistoryState('Alterar Ornamento');
            noteObj.ornament = cycleNextOrnament(noteObj.ornament);
            saveSongsToStorage();
            renderTab();
            playSingleNoteSound(noteObj);
        });

        // Deletar Nota
        card.querySelector('.note-card-delete').onclick = (e) => {
            e.stopPropagation();
            removeNote(index);
        };

        // Alternar duração
        const durSymbol = card.querySelector('.note-card-duration-symbol');
        if (durSymbol) {
            durSymbol.addEventListener('click', (e) => {
                e.stopPropagation();
                pushHistoryState('Alterar Duração');
                const nextDurations = {
                    '0.5': 1.0,
                    '1': 2.0,
                    '1.0': 2.0,
                    '2': 4.0,
                    '2.0': 4.0,
                    '4': 0.5,
                    '4.0': 0.5
                };
                const currentDur = noteObj.duration !== undefined ? String(noteObj.duration) : '1';
                noteObj.duration = nextDurations[currentDur] || 1.0;
                saveSongsToStorage();
                renderTab();
                playSingleNoteSound(noteObj);
            });
        }

        // Editar letra
        const lyricInput = card.querySelector('.note-card-lyric');
        lyricInput.addEventListener('input', (e) => {
            currentSong.notes[index].lyric = e.target.value;
            saveSongsToStorage();
        });
        lyricInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });
        
        tabSheetEl.appendChild(card);
    });
    
    updateTextNotesInput();
    updateSelectionToolbar();
}

// -----------------------------------------------------------------------------
// HISTÓRICO: DESFAZER / REFAZER (UNDO / REDO)
// -----------------------------------------------------------------------------
function pushHistoryState(action = '') {
    if (!currentSong) return;
    if (undoStack.length >= maxUndoHistory) {
        undoStack.shift();
    }
    undoStack.push({
        action,
        notes: JSON.parse(JSON.stringify(currentSong.notes)),
        title: currentSong.title,
        artist: currentSong.artist,
        key: currentSong.key,
        timeSignature: currentSong.timeSignature || '4/4',
        tempo: currentSong.tempo
    });
    redoStack = [];
    updateHistoryButtons();
}

function undo() {
    if (undoStack.length === 0 || !currentSong) return;
    redoStack.push({
        notes: JSON.parse(JSON.stringify(currentSong.notes)),
        title: currentSong.title,
        artist: currentSong.artist,
        key: currentSong.key,
        timeSignature: currentSong.timeSignature || '4/4',
        tempo: currentSong.tempo
    });
    const prev = undoStack.pop();
    currentSong.notes = prev.notes;
    currentSong.title = prev.title;
    currentSong.artist = prev.artist;
    currentSong.key = prev.key;
    currentSong.timeSignature = prev.timeSignature || '4/4';
    currentSong.tempo = prev.tempo;
    
    if (songTitleEl) songTitleEl.value = currentSong.title;
    if (songArtistEl) songArtistEl.value = currentSong.artist;
    if (whistleKeyEl) whistleKeyEl.value = currentSong.key;
    if (songTimeSignatureEl) songTimeSignatureEl.value = currentSong.timeSignature;
    if (songTempoEl) songTempoEl.value = currentSong.tempo;

    saveSongsToStorage();
    renderTab();
    updateHistoryButtons();
}

function redo() {
    if (redoStack.length === 0 || !currentSong) return;
    undoStack.push({
        notes: JSON.parse(JSON.stringify(currentSong.notes)),
        title: currentSong.title,
        artist: currentSong.artist,
        key: currentSong.key,
        timeSignature: currentSong.timeSignature || '4/4',
        tempo: currentSong.tempo
    });
    const next = redoStack.pop();
    currentSong.notes = next.notes;
    currentSong.title = next.title;
    currentSong.artist = next.artist;
    currentSong.key = next.key;
    currentSong.timeSignature = next.timeSignature || '4/4';
    currentSong.tempo = next.tempo;
    
    if (songTitleEl) songTitleEl.value = currentSong.title;
    if (songArtistEl) songArtistEl.value = currentSong.artist;
    if (whistleKeyEl) whistleKeyEl.value = currentSong.key;
    if (songTimeSignatureEl) songTimeSignatureEl.value = currentSong.timeSignature;
    if (songTempoEl) songTempoEl.value = currentSong.tempo;

    saveSongsToStorage();
    renderTab();
    updateHistoryButtons();
}

function updateHistoryButtons() {
    if (btnUndo) btnUndo.disabled = (undoStack.length === 0);
    if (btnRedo) btnRedo.disabled = (redoStack.length === 0);
}

// -----------------------------------------------------------------------------
// SELEÇÃO, CLIPBOARD E OPERAÇÕES EM BLOCO
// -----------------------------------------------------------------------------
function selectSingleNote(index) {
    if (!currentSong || index < 0 || index >= currentSong.notes.length) {
        clearSelection();
        return;
    }
    selectedIndices = new Set([index]);
    lastSelectedNoteIndex = index;
    updateSelectionToolbar();
    updateSelectionVisualHighlights();
    
    // Atualizar campo de acorde com o acorde da nota selecionada
    if (keyboardChordInput) {
        keyboardChordInput.value = currentSong.notes[index].chord || '';
    }
}

function selectRangeNotes(startIndex, endIndex) {
    if (!currentSong) return;
    const start = Math.max(0, Math.min(startIndex, endIndex));
    const end = Math.min(currentSong.notes.length - 1, Math.max(startIndex, endIndex));
    selectedIndices.clear();
    for (let i = start; i <= end; i++) {
        selectedIndices.add(i);
    }
    lastSelectedNoteIndex = endIndex;
    updateSelectionToolbar();
    updateSelectionVisualHighlights();
}

function clearSelection() {
    selectedIndices.clear();
    lastSelectedNoteIndex = -1;
    updateSelectionToolbar();
    updateSelectionVisualHighlights();
}

function updateSelectionVisualHighlights() {
    const allCards = tabSheetEl.querySelectorAll('.note-card, .measure-bar-card');
    allCards.forEach(c => {
        const idx = parseInt(c.dataset.index);
        if (selectedIndices.has(idx)) {
            c.classList.add('is-selected');
        } else {
            c.classList.remove('is-selected');
        }
    });
}

function updateSelectionToolbar() {
    const count = selectedIndices.size;
    if (selectionStatusBadge) {
        if (count === 0) {
            selectionStatusBadge.textContent = 'Nenhuma nota selecionada';
            selectionStatusBadge.classList.remove('has-selection');
        } else if (count === 1) {
            const idx = Array.from(selectedIndices)[0];
            const n = currentSong && currentSong.notes[idx];
            let name = n ? (n.note === 'REST' ? 'Pausa' : n.note) : '';
            selectionStatusBadge.textContent = `Nota #${idx + 1} (${name})`;
            selectionStatusBadge.classList.add('has-selection');
        } else {
            selectionStatusBadge.textContent = `${count} notas selecionadas`;
            selectionStatusBadge.classList.add('has-selection');
        }
    }
    if (btnCopySelection) btnCopySelection.disabled = (count === 0);
    if (btnPasteSelection) btnPasteSelection.disabled = (clipboardNotes.length === 0);
    if (btnDuplicateSelection) btnDuplicateSelection.disabled = (count === 0);
    if (btnDeleteSelection) btnDeleteSelection.disabled = (count === 0);
    if (btnClearSelection) btnClearSelection.style.display = (count > 0 ? 'inline-flex' : 'none');
}

function copySelection() {
    if (!currentSong || selectedIndices.size === 0) return;
    const sorted = Array.from(selectedIndices).sort((a, b) => a - b);
    clipboardNotes = sorted.map(idx => JSON.parse(JSON.stringify(currentSong.notes[idx])));
    updateSelectionToolbar();
}

function pasteSelection() {
    if (!currentSong || clipboardNotes.length === 0) return;
    pushHistoryState('Colar Notas');
    let targetIndex = currentSong.notes.length;
    if (selectedIndices.size > 0) {
        targetIndex = Math.max(...Array.from(selectedIndices)) + 1;
    }
    const clones = clipboardNotes.map(n => JSON.parse(JSON.stringify(n)));
    currentSong.notes.splice(targetIndex, 0, ...clones);
    saveSongsToStorage();
    renderTab();
    selectRangeNotes(targetIndex, targetIndex + clones.length - 1);
}

function duplicateSelection() {
    if (!currentSong || selectedIndices.size === 0) return;
    copySelection();
    pasteSelection();
}

function deleteSelection() {
    if (!currentSong || selectedIndices.size === 0) return;
    pushHistoryState('Excluir Seleção');
    const sorted = Array.from(selectedIndices).sort((a, b) => b - a);
    sorted.forEach(idx => {
        currentSong.notes.splice(idx, 1);
    });
    clearSelection();
    saveSongsToStorage();
    renderTab();
}

function setPlaybackStartIndex(index) {
    if (!currentSong || index < 0 || index >= currentSong.notes.length) return;
    playbackStartIndex = index;
    currentPlayIndex = index;
    updatePlaybackStartUI();
    
    if (isPlaying) {
        if (playbackTimeout) clearTimeout(playbackTimeout);
        playNextStep();
    }
}

function updatePlaybackStartUI() {
    const cards = tabSheetEl.querySelectorAll('.note-card');
    cards.forEach(card => {
        const cardIndex = parseInt(card.dataset.index);
        if (cardIndex === playbackStartIndex) {
            card.classList.add('playback-start');
        } else {
            card.classList.remove('playback-start');
        }
    });
}

function removeNote(index) {
    if (!currentSong) return;
    pushHistoryState('Remover Nota');
    currentSong.notes.splice(index, 1);
    if (playbackStartIndex > index) {
        playbackStartIndex--;
    } else if (playbackStartIndex >= currentSong.notes.length) {
        playbackStartIndex = Math.max(0, currentSong.notes.length - 1);
    }
    clearSelection();
    saveSongsToStorage();
    renderTab();
    updateTextNotesInput();
}

// -----------------------------------------------------------------------------
// INSERÇÃO E EDIÇÃO NO MEIO DA MELODIA VIA TECLADO VIRTUAL
// -----------------------------------------------------------------------------
function handleVirtualKeyboardNote(noteName, duration) {
    if (!currentSong) return;
    pushHistoryState('Adicionar / Editar Nota');

    const ornamentRadio = document.querySelector('input[name="note-ornament"]:checked');
    const ornament = ornamentRadio ? ornamentRadio.value : '';
    const chord = keyboardChordInput ? keyboardChordInput.value.trim() : '';
    const mode = editInsertionModeEl ? editInsertionModeEl.value : 'replace';

    const newNoteObj = {
        note: noteName,
        duration: duration,
        lyric: '',
        chord: chord,
        ornament: ornament
    };

    if (selectedIndices.size === 1) {
        const targetIdx = Array.from(selectedIndices)[0];
        if (mode === 'replace') {
            const existing = currentSong.notes[targetIdx];
            newNoteObj.lyric = existing.lyric || '';
            if (!chord && existing.chord) newNoteObj.chord = existing.chord;
            if (!ornament && existing.ornament) newNoteObj.ornament = existing.ornament;
            currentSong.notes[targetIdx] = newNoteObj;
            
            // Avança seleção sequencial para a próxima nota (se houver)
            if (targetIdx + 1 < currentSong.notes.length) {
                selectSingleNote(targetIdx + 1);
            } else {
                selectSingleNote(targetIdx);
            }
        } else if (mode === 'insert-after') {
            currentSong.notes.splice(targetIdx + 1, 0, newNoteObj);
            selectSingleNote(targetIdx + 1);
        } else if (mode === 'insert-before') {
            currentSong.notes.splice(targetIdx, 0, newNoteObj);
            selectSingleNote(targetIdx);
        } else {
            currentSong.notes.push(newNoteObj);
            selectSingleNote(currentSong.notes.length - 1);
        }
    } else {
        currentSong.notes.push(newNoteObj);
        selectSingleNote(currentSong.notes.length - 1);
    }

    saveSongsToStorage();
    renderTab();
    playSingleNoteSound(newNoteObj);
}

function appendNote(noteName, duration) {
    handleVirtualKeyboardNote(noteName, duration);
}

function insertMeasureBar(barType) {
    if (!currentSong) return;
    pushHistoryState('Inserir Barra de Compasso');
    const barObj = { note: barType, duration: 0 };
    let targetIdx = currentSong.notes.length;
    if (selectedIndices.size > 0) {
        targetIdx = Math.max(...Array.from(selectedIndices)) + 1;
    }
    currentSong.notes.splice(targetIdx, 0, barObj);
    saveSongsToStorage();
    renderTab();
    selectSingleNote(targetIdx);
}

function setupEditorToolbar() {
    if (btnUndo) btnUndo.onclick = () => undo();
    if (btnRedo) btnRedo.onclick = () => redo();
    
    if (btnInsertBar) btnInsertBar.onclick = () => insertMeasureBar('BAR');
    if (btnInsertDoubleBar) btnInsertDoubleBar.onclick = () => insertMeasureBar('DOUBLE_BAR');
    if (btnInsertRepeatStart) btnInsertRepeatStart.onclick = () => insertMeasureBar('REPEAT_START');
    if (btnInsertRepeatEnd) btnInsertRepeatEnd.onclick = () => insertMeasureBar('REPEAT_END');
    if (btnInsertLinebreak) btnInsertLinebreak.onclick = () => insertMeasureBar('LINEBREAK');

    if (btnCopySelection) btnCopySelection.onclick = () => copySelection();
    if (btnPasteSelection) btnPasteSelection.onclick = () => pasteSelection();
    if (btnDuplicateSelection) btnDuplicateSelection.onclick = () => duplicateSelection();
    if (btnDeleteSelection) btnDeleteSelection.onclick = () => deleteSelection();
    if (btnClearSelection) btnClearSelection.onclick = () => clearSelection();

    if (btnApplyChord) {
        btnApplyChord.onclick = () => {
            const chord = keyboardChordInput ? keyboardChordInput.value.trim() : '';
            if (selectedIndices.size > 0 && currentSong) {
                pushHistoryState('Aplicar Acorde');
                selectedIndices.forEach(idx => {
                    if (currentSong.notes[idx]) {
                        currentSong.notes[idx].chord = chord;
                    }
                });
                saveSongsToStorage();
                renderTab();
            }
        };
    }
}

// 6. EVENTOS DA KEYBOARD VIRTUAL
function setupKeyboardTabs() {
    const tabBtns = document.querySelectorAll('.kb-tab-btn');
    const tabContents = document.querySelectorAll('.kb-tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

function setupEditorModeTabs() {
    const modeBtns = document.querySelectorAll('.mode-tab-btn');
    const textPanel = document.getElementById('mode-text-panel');
    const buttonsPanel = document.getElementById('mode-buttons-panel');
    
    if (!modeBtns.length || !textPanel || !buttonsPanel) return;
    
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const mode = btn.dataset.mode;
            if (mode === 'text') {
                textPanel.style.display = 'flex';
                buttonsPanel.style.display = 'none';
                if (textNotesInputEl) {
                    textNotesInputEl.focus();
                }
            } else {
                textPanel.style.display = 'none';
                buttonsPanel.style.display = 'flex';
            }
        });
    });
}

function setupNoteInputEvents() {
    const noteBtns = document.querySelectorAll('.note-btn');
    noteBtns.forEach(btn => {
        btn.onclick = () => {
            const noteName = btn.dataset.note;
            const durationEl = document.querySelector('input[name="note-duration"]:checked');
            const duration = durationEl ? (parseFloat(durationEl.value) || 1.0) : 1.0;
            appendNote(noteName, duration);
        };
    });
}

function renderKeyboard(whistleKey) {
    whistleKey = whistleKey || (currentSong ? currentSong.key : 'D') || 'D';
    const keyData = getWhistleKeyData(whistleKey);
    
    const oct1Container = document.querySelector('#octave-1 .note-buttons');
    const oct2Container = document.querySelector('#octave-2 .note-buttons');
    const specialContainer = document.querySelector('#special-notes .note-buttons');
    
    if (!oct1Container || !oct2Container || !specialContainer) return;

    function createMiniFingeringSVG(fingering) {
        const yPositions = [5, 11, 17, 23, 29, 35];
        let circles = '';
        fingering.forEach((state, idx) => {
            const y = yPositions[idx];
            if (state === 1) {
                circles += `<circle cx="5" cy="${y}" r="3" fill="currentColor"/>`;
            } else if (state === 0.5) {
                circles += `<circle cx="5" cy="${y}" r="3" fill="currentColor" opacity="0.6"/>`;
            } else {
                circles += `<circle cx="5" cy="${y}" r="3" stroke="currentColor" fill="none"/>`;
            }
        });
        return `
            <svg class="fingering-mini" viewBox="0 0 10 40" width="10" height="40">
                ${circles}
            </svg>
        `;
    }

    // 1ª Oitava
    oct1Container.innerHTML = keyData.orderOct1.map(noteId => {
        const n = keyData.notes[noteId];
        return `
            <button class="note-btn" data-note="${noteId}">
                <span class="note-name">${n.name}</span>
                ${createMiniFingeringSVG(n.fingering)}
            </button>
        `;
    }).join('');

    // 2ª Oitava
    oct2Container.innerHTML = keyData.orderOct2.map(noteId => {
        const n = keyData.notes[noteId];
        return `
            <button class="note-btn octave2" data-note="${noteId}">
                <span class="note-name">${n.name}</span>
                ${createMiniFingeringSVG(n.fingering)}
            </button>
        `;
    }).join('');

    // Especiais & Pausa
    const specialsHtml = keyData.orderSpecials.map(noteId => {
        const n = keyData.notes[noteId];
        const isOct2 = n.octave2 ? ' octave2' : '';
        return `
            <button class="note-btn${isOct2}" data-note="${noteId}">
                <span class="note-name">${n.name}</span>
                ${createMiniFingeringSVG(n.fingering)}
            </button>
        `;
    }).join('');

    specialContainer.innerHTML = `
        ${specialsHtml}
        <button class="note-btn special" data-note="REST">
            <span class="note-name">𝄾 Pausa</span>
            <span class="note-symbol-big">Rest</span>
        </button>
    `;

    setupNoteInputEvents();
}

// 7. SINTETIZADOR DE ÁUDIO (WEB AUDIO API)
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function getTransposedFrequency(noteName, whistleKey) {
    const standardFreq = NOTE_FREQUENCIES[noteName];
    if (standardFreq === undefined || standardFreq === 0) return 0;
    
    // Transposição relativa à flauta em Ré (D)
    // Número de semitons de distância do D
    const transpositions = {
        'D': 0,
        'C': -2,
        'Eb': 1,
        'F': 3,
        'G': 5,
        'A': 7,
        'Bb': 8
    };
    
    const semitones = transpositions[whistleKey] || 0;
    return standardFreq * Math.pow(2, semitones / 12);
}

// Toca uma única nota isoladamente
function playSingleNoteSound(noteObj) {
    if (!noteObj || ['LINEBREAK', 'BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END'].includes(noteObj.note)) return;
    try {
        initAudio();
        const freq = getTransposedFrequency(noteObj.note, whistleKeyEl ? whistleKeyEl.value : 'D');
        if (freq > 0) {
            playWhistleSynth(freq, 0.4, audioCtx.currentTime, noteObj.ornament);
        }
    } catch (e) {
        console.error("Falha ao tocar áudio: ", e);
    }
}

// O sintetizador que cria a assinatura sonora da Tin Whistle celta com suporte a ornamentos
function playWhistleSynth(frequency, duration, startTime, ornament = null) {
    // 1. Oscilador Principal (Onda Triangular - som amadeirado, doce)
    const oscTri = audioCtx.createOscillator();
    oscTri.type = 'triangle';
    
    // 2. Oscilador Secundário (Onda Senoidal - adiciona peso e pureza na fundamental)
    const oscSine = audioCtx.createOscillator();
    oscSine.type = 'sine';

    // Aplicação acústica de ornamentações tradicionais irlandesas
    if (ornament === 'cut' && duration > 0.1) {
        // Cut: Graça rápida superior (+2 semitons) nos primeiros 35ms
        const cutFreq = frequency * 1.122;
        oscTri.frequency.setValueAtTime(cutFreq, startTime);
        oscTri.frequency.setValueAtTime(frequency, startTime + 0.035);
        oscSine.frequency.setValueAtTime(cutFreq, startTime);
        oscSine.frequency.setValueAtTime(frequency, startTime + 0.035);
    } else if (ornament === 'strike' && duration > 0.1) {
        // Strike: Batida rápida inferior (-2 semitons) nos primeiros 35ms
        const strikeFreq = frequency * 0.891;
        oscTri.frequency.setValueAtTime(strikeFreq, startTime);
        oscTri.frequency.setValueAtTime(frequency, startTime + 0.035);
        oscSine.frequency.setValueAtTime(strikeFreq, startTime);
        oscSine.frequency.setValueAtTime(frequency, startTime + 0.035);
    } else if (ornament === 'roll' && duration > 0.25) {
        // Roll: Nota -> Cut (+2 st) -> Nota -> Strike (-2 st) -> Nota
        const cutFreq = frequency * 1.122;
        const strikeFreq = frequency * 0.891;
        oscTri.frequency.setValueAtTime(frequency, startTime);
        oscTri.frequency.setValueAtTime(cutFreq, startTime + 0.035);
        oscTri.frequency.setValueAtTime(frequency, startTime + 0.07);
        oscTri.frequency.setValueAtTime(strikeFreq, startTime + 0.105);
        oscTri.frequency.setValueAtTime(frequency, startTime + 0.14);

        oscSine.frequency.setValueAtTime(frequency, startTime);
        oscSine.frequency.setValueAtTime(cutFreq, startTime + 0.035);
        oscSine.frequency.setValueAtTime(frequency, startTime + 0.07);
        oscSine.frequency.setValueAtTime(strikeFreq, startTime + 0.105);
        oscSine.frequency.setValueAtTime(frequency, startTime + 0.14);
    } else if (ornament === 'cran' && duration > 0.2) {
        // Cran (típico do Ré): Cortes rápidos superiores sucessivos
        const cutFreq = frequency * 1.122;
        oscTri.frequency.setValueAtTime(frequency, startTime);
        oscTri.frequency.setValueAtTime(cutFreq, startTime + 0.03);
        oscTri.frequency.setValueAtTime(frequency, startTime + 0.06);
        oscTri.frequency.setValueAtTime(cutFreq, startTime + 0.09);
        oscTri.frequency.setValueAtTime(frequency, startTime + 0.12);

        oscSine.frequency.setValueAtTime(frequency, startTime);
        oscSine.frequency.setValueAtTime(cutFreq, startTime + 0.03);
        oscSine.frequency.setValueAtTime(frequency, startTime + 0.06);
        oscSine.frequency.setValueAtTime(cutFreq, startTime + 0.09);
        oscSine.frequency.setValueAtTime(frequency, startTime + 0.12);
    } else if (ornament === 'slide' && duration > 0.1) {
        // Slide: Glissando ascendente contínuo
        const startSlideFreq = frequency * 0.891;
        oscTri.frequency.setValueAtTime(startSlideFreq, startTime);
        oscTri.frequency.exponentialRampToValueAtTime(frequency, startTime + 0.08);
        oscSine.frequency.setValueAtTime(startSlideFreq, startTime);
        oscSine.frequency.exponentialRampToValueAtTime(frequency, startTime + 0.08);
    } else {
        oscTri.frequency.setValueAtTime(frequency, startTime);
        oscSine.frequency.setValueAtTime(frequency, startTime);
    }
    
    // 3. Modulador de Frequência (Vibrato) - LFO sutil a 5.8Hz
    const lfo = audioCtx.createOscillator();
    lfo.frequency.setValueAtTime(5.8, startTime);
    
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.setValueAtTime(frequency * 0.007, startTime);
    
    lfo.connect(lfoGain);
    lfoGain.connect(oscTri.frequency);
    lfoGain.connect(oscSine.frequency);
    
    // 4. Gerador de Ruído (Sopro/Chiff característico do sopro humano)
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const bufferData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        bufferData[i] = Math.random() * 2 - 1;
    }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    
    // Filtro Passa-Banda para manter o ruído próximo à nota tocada
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.Q.setValueAtTime(20, startTime);
    noiseFilter.frequency.setValueAtTime(frequency, startTime);
    
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.025, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.006, startTime + 0.08);
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    
    // 5. Envelopes de Ganho (ADSR do Whistle)
    const mainGain = audioCtx.createGain();
    mainGain.gain.setValueAtTime(0, startTime);
    mainGain.gain.linearRampToValueAtTime(0.2, startTime + 0.04); 
    mainGain.gain.linearRampToValueAtTime(0.16, startTime + 0.12);
    mainGain.gain.setValueAtTime(0.16, Math.max(startTime + 0.12, startTime + duration - 0.04));
    mainGain.gain.linearRampToValueAtTime(0, startTime + duration);
    
    // Mixar tudo
    oscTri.connect(mainGain);
    oscSine.connect(mainGain);
    noiseGain.connect(mainGain);
    
    mainGain.connect(audioCtx.destination);
    
    // Iniciar osciladores e ruído
    oscTri.start(startTime);
    oscSine.start(startTime);
    lfo.start(startTime);
    noiseSource.start(startTime);
    
    // Agendar parada
    oscTri.stop(startTime + duration);
    oscSine.stop(startTime + duration);
    lfo.stop(startTime + duration);
    noiseSource.stop(startTime + duration);
}

// Som do metrônomo para manter o tempo
function playMetronomeClick(startTime) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, startTime);
    
    gain.gain.setValueAtTime(0.05, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.05);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + 0.06);
}

// 8. CONTROLES DO SEQUENCIADOR (PLAY/PAUSE/STOP)
function togglePlay() {
    if (isPlaying) {
        pausePlayback();
    } else {
        // Verificar se deve acionar o Count-in de 1 compasso antes de iniciar (apenas no Modo Prática)
        const startTarget = (isLoopActive && loopAIndex >= 0) ? loopAIndex : playbackStartIndex;
        const atBeginning = (currentPlayIndex === -1 || currentPlayIndex === 0 || currentPlayIndex === startTarget);
        if (currentAppMode === 'practice' && toggleCountIn && toggleCountIn.checked && atBeginning && !isCountingIn) {
            startCountIn();
        } else {
            startPlayback();
        }
    }
}

function startPlayback() {
    if (!currentSong || currentSong.notes.length === 0) return;
    
    initAudio();
    isPlaying = true;
    repeatHasPlayed = false;
    
    // Atualizar UI
    btnPlay.querySelector('.icon-play').style.display = 'none';
    btnPlay.querySelector('.icon-pause').style.display = 'block';
    
    // Definir índice inicial respeitando Loop A-B ou ponto de início
    if (currentPlayIndex === -1 || currentPlayIndex >= currentSong.notes.length) {
        if (isLoopActive && loopAIndex >= 0 && loopAIndex < currentSong.notes.length) {
            currentPlayIndex = loopAIndex;
        } else {
            currentPlayIndex = (playbackStartIndex >= 0 && playbackStartIndex < currentSong.notes.length) ? playbackStartIndex : 0;
        }
    }
    
    playNextStep();
}

function pausePlayback() {
    isPlaying = false;
    cancelCountIn();
    if (playbackTimeout) clearTimeout(playbackTimeout);
    
    // Atualizar UI
    btnPlay.querySelector('.icon-play').style.display = 'block';
    btnPlay.querySelector('.icon-pause').style.display = 'none';
}

function stopPlayback() {
    isPlaying = false;
    repeatHasPlayed = false;
    cancelCountIn();
    if (playbackTimeout) clearTimeout(playbackTimeout);
    
    if (isLoopActive && loopAIndex >= 0 && loopAIndex < currentSong.notes.length) {
        currentPlayIndex = loopAIndex;
    } else {
        currentPlayIndex = (playbackStartIndex >= 0 && currentSong && playbackStartIndex < currentSong.notes.length) ? playbackStartIndex : 0;
    }
    
    // Atualizar UI
    btnPlay.querySelector('.icon-play').style.display = 'block';
    btnPlay.querySelector('.icon-pause').style.display = 'none';
    
    // Remover destaque de reprodução de todas as notas
    document.querySelectorAll('.note-card').forEach(card => {
        card.classList.remove('playing');
    });
}

function playNextStep() {
    if (!isPlaying || !currentSong) return;
    
    const notesCount = currentSong.notes.length;
    
    // Verificação e controle de Loop A-B
    if (isLoopActive && loopAIndex >= 0 && loopBIndex >= 0) {
        const loopStart = Math.min(loopAIndex, loopBIndex);
        const loopEnd = Math.max(loopAIndex, loopBIndex);
        
        if (currentPlayIndex < loopStart) {
            currentPlayIndex = loopStart;
        } else if (currentPlayIndex > loopEnd) {
            // Ciclo completo do trecho em loop atingido!
            loopCycleCount++;
            if (trainerCycleBadge) {
                trainerCycleBadge.textContent = `Ciclo #${loopCycleCount}`;
            }
            
            // Aceleração automática do Speed Trainer
            if (toggleSpeedTrainer && toggleSpeedTrainer.checked) {
                const currentBpm = parseInt(songTempoEl.value) || 120;
                const step = parseInt(speedTrainerStepEl ? speedTrainerStepEl.value : 4) || 4;
                const newBpm = Math.min(260, currentBpm + step);
                songTempoEl.value = newBpm;
                updateCurrentSongMetadata();
                if (trainerCycleBadge) {
                    trainerCycleBadge.textContent = `Ciclo #${loopCycleCount} (${newBpm} BPM)`;
                }
            }
            
            currentPlayIndex = loopStart;
        }
    }
    
    if (currentPlayIndex >= notesCount) {
        stopPlayback();
        return;
    }
    
    const noteObj = currentSong.notes[currentPlayIndex];
    
    // Tratamento de Quebras de Linha e Barras Simples / Início de Repetição (avanço instantâneo)
    if (noteObj.note === 'LINEBREAK' || noteObj.note === 'BAR' || noteObj.note === 'DOUBLE_BAR' || noteObj.note === 'REPEAT_START') {
        currentPlayIndex++;
        playNextStep();
        return;
    }

    // Tratamento de Fim de Repetição (:|)
    if (noteObj.note === 'REPEAT_END') {
        if (!repeatHasPlayed) {
            repeatHasPlayed = true;
            // Procurar último REPEAT_START anterior
            let repeatTarget = 0;
            for (let i = currentPlayIndex - 1; i >= 0; i--) {
                if (currentSong.notes[i].note === 'REPEAT_START') {
                    repeatTarget = i + 1;
                    break;
                }
            }
            currentPlayIndex = repeatTarget;
            playNextStep();
            return;
        } else {
            repeatHasPlayed = false;
            currentPlayIndex++;
            playNextStep();
            return;
        }
    }

    const bpm = parseInt(songTempoEl.value) || 120;
    const speedMultiplier = parseFloat(playSpeedSelect.value) || 1.0;
    
    const beatDuration = 60 / bpm;
    const realDuration = ((noteObj.duration || 1.0) * beatDuration) / speedMultiplier;
    
    // Destacar nota visualmente
    document.querySelectorAll('.note-card').forEach((card) => {
        if (parseInt(card.dataset.index) === currentPlayIndex) {
            card.classList.add('playing');
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        } else {
            card.classList.remove('playing');
        }
    });
    
    // Tocar Áudio
    const now = audioCtx.currentTime;
    const freq = getTransposedFrequency(noteObj.note, whistleKeyEl.value);
    
    if (freq > 0) {
        playWhistleSynth(freq, realDuration * 0.95, now, noteObj.ornament);
    }
    
    // Metrônomo ativo? Toca o clique
    if (toggleMetronome.checked) {
        playMetronomeClick(now);
    }
    
    // Agendar próximo passo
    currentPlayIndex++;
    playbackTimeout = setTimeout(playNextStep, realDuration * 1000);
}

// 9. CONFIGURAÇÃO DE ATALHOS & EVENTOS DE UI
function setupEventListeners() {
    // Ações de Gravação e Metadados
    songTitleEl.addEventListener('input', updateCurrentSongMetadata);
    songArtistEl.addEventListener('input', updateCurrentSongMetadata);
    const handleWhistleKeyChange = () => {
        updateCurrentSongMetadata();
        const key = whistleKeyEl.value;
        renderKeyboard(key);
        renderTab();
        updateTextNotesInput();
        updateTextInputHelp(key);
    };
    whistleKeyEl.addEventListener('change', handleWhistleKeyChange);
    whistleKeyEl.addEventListener('input', handleWhistleKeyChange);
    songTempoEl.addEventListener('input', updateCurrentSongMetadata);
    if (songTimeSignatureEl) {
        songTimeSignatureEl.addEventListener('change', updateCurrentSongMetadata);
    }
    if (songCategoryEl) {
        songCategoryEl.addEventListener('change', () => {
            updateCurrentSongMetadata();
            renderSidebar();
        });
    }
    if (songDifficultyEl) {
        songDifficultyEl.addEventListener('change', () => {
            updateCurrentSongMetadata();
            renderSidebar();
        });
    }
    if (songRhythmEl) {
        songRhythmEl.addEventListener('change', () => {
            updateCurrentSongMetadata();
            renderSidebar();
        });
    }
    
    btnNewSong.addEventListener('click', createNewSong);
    btnSaveSong.addEventListener('click', () => {
        updateCurrentSongMetadata();
        alert('Música salva com sucesso localmente!');
    });
    
    // Barra de Pesquisa
    searchInput.addEventListener('input', renderSidebar);
    
    // Controles de Playback
    btnPlay.addEventListener('click', togglePlay);
    btnStop.addEventListener('click', () => {
        if (!isPlaying && currentPlayIndex === playbackStartIndex && playbackStartIndex !== 0) {
            setPlaybackStartIndex(0);
        } else {
            stopPlayback();
        }
    });
    btnClearTab.addEventListener('click', () => {
        if (currentSong && currentSong.notes.length > 0) {
            if (confirm("Tem certeza de que deseja apagar todas as notas desta música?")) {
                currentSong.notes = [];
                playbackStartIndex = 0;
                stopPlayback();
                saveSongsToStorage();
                renderTab();
            }
        }
    });

    // Toggle Sidebar no Mobile
    sidebarToggleBtn.addEventListener('click', () => {
        sidebarEl.classList.toggle('open');
    });

    // Fechar sidebar ao selecionar música no mobile
    songListEl.addEventListener('click', (e) => {
        if (window.innerWidth <= 860) {
            sidebarEl.classList.remove('open');
        }
    });
    
    // Ajuda e Modais
    btnHelp.addEventListener('click', () => helpModal.classList.add('open'));
    btnCloseModal.addEventListener('click', () => helpModal.classList.remove('open'));
    btnCloseModalOk.addEventListener('click', () => helpModal.classList.remove('open'));
    
    // Fecha o modal ao clicar fora dele
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.classList.remove('open');
        }
    });
    
    // Importação e Exportação
    btnExportJson.addEventListener('click', exportCurrentSongJSON);
    btnExportAll.addEventListener('click', exportAllSongsJSON);
    importFileEl.addEventListener('change', importSongsJSON);
    
    // Entrada de Notas por Texto
    if (textNotesInputEl) {
        textNotesInputEl.addEventListener('input', handleTextNotesInput);
        textNotesInputEl.addEventListener('blur', () => {
            if (currentSong) {
                // Ao perder o foco, normaliza o valor exibido
                textNotesInputEl.value = currentSong.notes.map(n => noteKeyToNotation(n.note)).join('');
                textNotesInputEl.classList.remove('invalid');
                textNotesErrorEl.style.display = 'none';
                textNotesErrorEl.textContent = '';
            }
        });
        textNotesInputEl.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });
    }

    // Impressão
    btnPrint.addEventListener('click', () => {
        stopPlayback();
        window.print();
    });

    // Compasso
    if (songTimeSignatureEl) {
        songTimeSignatureEl.addEventListener('change', updateCurrentSongMetadata);
    }

    // Atalhos do Teclado Global
    document.addEventListener('keydown', (e) => {
        // Se estiver em input ou textarea
        const inInput = (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA');

        // Ctrl+Z (Desfazer)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
            if (!inInput) {
                e.preventDefault();
                undo();
                return;
            }
        }

        // Ctrl+Y ou Ctrl+Shift+Z (Refazer)
        if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || 
            ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
            if (!inInput) {
                e.preventDefault();
                redo();
                return;
            }
        }

        // Ignorar demais atalhos se o usuário estiver digitando em campo de texto
        if (inInput) return;
        
        // Ctrl+C (Copiar)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
            e.preventDefault();
            copySelection();
            return;
        }

        // Ctrl+V (Colar)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
            e.preventDefault();
            pasteSelection();
            return;
        }

        // Delete ou Backspace (Excluir Notas Selecionadas)
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedIndices.size > 0) {
                e.preventDefault();
                deleteSelection();
                return;
            }
        }

        // Seta Direita (Avançar Seleção)
        if (e.key === 'ArrowRight' && currentSong) {
            e.preventDefault();
            if (selectedIndices.size > 0) {
                const current = Math.max(...Array.from(selectedIndices));
                if (current + 1 < currentSong.notes.length) {
                    selectSingleNote(current + 1);
                }
            } else if (currentSong.notes.length > 0) {
                selectSingleNote(0);
            }
            return;
        }

        // Seta Esquerda (Retroceder Seleção)
        if (e.key === 'ArrowLeft' && currentSong) {
            e.preventDefault();
            if (selectedIndices.size > 0) {
                const current = Math.min(...Array.from(selectedIndices));
                if (current - 1 >= 0) {
                    selectSingleNote(current - 1);
                }
            } else if (currentSong.notes.length > 0) {
                selectSingleNote(currentSong.notes.length - 1);
            }
            return;
        }

        if (e.code === 'Space') {
            e.preventDefault();
            togglePlay();
        } else if (e.code === 'Escape') {
            clearSelection();
            stopPlayback();
        }
    });
}

// 10. IMPORTAÇÃO E EXPORTAÇÃO JSON
function exportCurrentSongJSON() {
    if (!currentSong) return;
    updateCurrentSongMetadata();
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentSong, null, 4));
    const downloadAnchor = document.createElement('a');
    
    // Nome do arquivo baseado no título da música
    const sanitizedTitle = currentSong.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `tab_${sanitizedTitle}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function exportAllSongsJSON() {
    if (songs.length === 0) return;
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(songs, null, 4));
    const downloadAnchor = document.createElement('a');
    
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `celtic_whistle_tabs_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importSongsJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            
            if (Array.isArray(parsed)) {
                // Importar várias músicas
                if (confirm(`Deseja importar ${parsed.length} músicas? Isso será mesclado com a sua biblioteca existente.`)) {
                    parsed.forEach(song => {
                        // Forçar novos ids para evitar conflitos
                        song.id = 'song-' + Date.now() + Math.random().toString(36).substr(2, 5);
                        songs.unshift(song);
                    });
                    saveSongsToStorage();
                    renderSidebar();
                    selectSong(songs[0].id);
                }
            } else if (parsed && parsed.title) {
                // Importar uma única música
                parsed.id = 'song-' + Date.now();
                songs.unshift(parsed);
                saveSongsToStorage();
                renderSidebar();
                selectSong(parsed.id);
                alert(`Música "${parsed.title}" importada com sucesso!`);
            } else {
                alert("Arquivo JSON inválido. Verifique o formato.");
            }
        } catch (err) {
            alert("Erro ao ler o arquivo JSON: " + err.message);
        }
    };
    reader.readAsText(file);
    // Limpar o valor do input para permitir carregar o mesmo arquivo novamente
    event.target.value = '';
}

// 11. UTILITÁRIOS
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// 12. PARSER E SINCRONIZAÇÃO DE NOTAS POR TEXTO
function parseStringOfNotes(text) {
    const parsedNotes = [];
    let i = 0;
    
    const whistleKey = whistleKeyEl ? whistleKeyEl.value : (currentSong ? currentSong.key : 'D') || 'D';
    const keyData = getWhistleKeyData(whistleKey);
    
    const tokens = [];
    if (keyData && keyData.notes) {
        Object.keys(keyData.notes).forEach(noteId => {
            if (noteId === 'REST' || noteId === 'LINEBREAK') return;
            const token = keyData.notes[noteId].text;
            if (token) {
                tokens.push({ token, noteId, octave2: keyData.notes[noteId].octave2 });
            }
        });
        tokens.sort((a, b) => b.token.length - a.token.length);
    }
    
    const oct1ToOct2 = {
        'D5': 'D6', 'E5': 'E6', 'F#5': 'F#6', 'G5': 'G6',
        'A5': 'A6', 'B5': 'B6', 'C#6': 'C#7', 'C5': 'C6'
    };
    
    let pendingChord = '';
    let pendingOrnament = '';

    while (i < text.length) {
        const char = text[i];
        
        // 1. Espaços e Quebras de Linha
        if (/\s/.test(char)) {
            let hasNewline = (char === '\n' || char === '\r');
            while (i + 1 < text.length && /\s/.test(text[i + 1])) {
                i++;
                if (text[i] === '\n' || text[i] === '\r') {
                    hasNewline = true;
                }
            }
            if (hasNewline) {
                parsedNotes.push({ note: 'LINEBREAK', duration: 0 });
            } else {
                parsedNotes.push({ note: 'REST', duration: 1.0, chord: pendingChord, ornament: '' });
                pendingChord = '';
            }
            i++;
            continue;
        }

        // 2. Cifras / Acordes entre aspas: "D", "Em", "G"
        if (char === '"') {
            const closeIdx = text.indexOf('"', i + 1);
            if (closeIdx !== -1) {
                pendingChord = text.substring(i + 1, closeIdx).trim();
                i = closeIdx + 1;
                continue;
            }
        }

        // 3. Barras de Compasso: |:, :|, ||, |
        if (text.startsWith('|:', i)) {
            parsedNotes.push({ note: 'REPEAT_START', duration: 0 });
            i += 2;
            continue;
        }
        if (text.startsWith(':|', i)) {
            parsedNotes.push({ note: 'REPEAT_END', duration: 0 });
            i += 2;
            continue;
        }
        if (text.startsWith('||', i)) {
            parsedNotes.push({ note: 'DOUBLE_BAR', duration: 0 });
            i += 2;
            continue;
        }
        if (char === '|') {
            parsedNotes.push({ note: 'BAR', duration: 0 });
            i++;
            continue;
        }

        // 4. Ornamentos como prefixo: ~ (roll), ^ (cut), v (strike), * (cran), / (slide)
        if (char === '~') {
            pendingOrnament = 'roll';
            i++;
            continue;
        }
        if (char === '^') {
            pendingOrnament = 'cut';
            i++;
            continue;
        }
        if (char === 'v' && i + 1 < text.length && /[a-gA-G]/.test(text[i + 1])) {
            pendingOrnament = 'strike';
            i++;
            continue;
        }
        if (char === '*') {
            pendingOrnament = 'cran';
            i++;
            continue;
        }
        if (char === '/') {
            pendingOrnament = 'slide';
            i++;
            continue;
        }

        // 5. Palavras reservadas para Pausa
        const remaining = text.substring(i);
        const restMatch = remaining.match(/^(REST|PAUSA|SILENCIO|SILÊNCIO)/i);
        if (restMatch) {
            parsedNotes.push({ note: 'REST', duration: 1.0, chord: pendingChord, ornament: '' });
            pendingChord = '';
            i += restMatch[0].length;
            continue;
        }
        
        // 6. Tentar casar com os tokens específicos da afinação
        let matched = false;
        for (const t of tokens) {
            if (text.startsWith(t.token, i)) {
                let noteKey = t.noteId;
                i += t.token.length;
                
                if (i < text.length && text[i] === '+') {
                    if (oct1ToOct2[noteKey]) {
                        noteKey = oct1ToOct2[noteKey];
                    }
                    i++;
                }

                // Duração pós-fixa (ex: d2, d0.5, d4)
                let noteDuration = 1.0;
                const durMatch = text.substring(i).match(/^([0-9]+(\.[0-9]+)?)/);
                if (durMatch) {
                    noteDuration = parseFloat(durMatch[1]) || 1.0;
                    i += durMatch[0].length;
                }
                
                parsedNotes.push({
                    note: noteKey,
                    duration: noteDuration,
                    chord: pendingChord,
                    ornament: pendingOrnament,
                    lyric: ''
                });
                pendingChord = '';
                pendingOrnament = '';
                matched = true;
                break;
            }
        }
        if (matched) continue;
        
        // 7. Fallback: Notação tradicional em Ré (A a G)
        if (/[a-gA-G]/.test(char)) {
            let noteLetter = char;
            let isSharp = false;
            let isSecondOctave = (char === char.toUpperCase());
            
            i++;
            if (i < text.length && text[i] === '#') {
                isSharp = true;
                i++;
            }
            if (i < text.length && text[i] === '+') {
                isSecondOctave = true;
                i++;
            }

            // Duração pós-fixa
            let noteDuration = 1.0;
            const durMatch = text.substring(i).match(/^([0-9]+(\.[0-9]+)?)/);
            if (durMatch) {
                noteDuration = parseFloat(durMatch[1]) || 1.0;
                i += durMatch[0].length;
            }
            
            const letterUpper = noteLetter.toUpperCase();
            let noteKey = '';
            
            if (isSecondOctave) {
                if (letterUpper === 'D') noteKey = 'D6';
                else if (letterUpper === 'E') noteKey = 'E6';
                else if (letterUpper === 'F') noteKey = 'F#6';
                else if (letterUpper === 'G') noteKey = 'G6';
                else if (letterUpper === 'A') noteKey = 'A6';
                else if (letterUpper === 'B') noteKey = 'B6';
                else if (letterUpper === 'C') noteKey = isSharp ? 'C#7' : 'C6';
                if (letterUpper === 'F' && isSharp) noteKey = 'F#6';
            } else {
                if (letterUpper === 'D') noteKey = 'D5';
                else if (letterUpper === 'E') noteKey = 'E5';
                else if (letterUpper === 'F') noteKey = 'F#5';
                else if (letterUpper === 'G') noteKey = 'G5';
                else if (letterUpper === 'A') noteKey = 'A5';
                else if (letterUpper === 'B') noteKey = 'B5';
                else if (letterUpper === 'C') noteKey = isSharp ? 'C#6' : 'C5';
                if (letterUpper === 'F' && isSharp) noteKey = 'F#5';
            }
            
            if (noteKey && STANDARD_FINGERINGS[noteKey]) {
                parsedNotes.push({
                    note: noteKey,
                    duration: noteDuration,
                    chord: pendingChord,
                    ornament: pendingOrnament,
                    lyric: ''
                });
                pendingChord = '';
                pendingOrnament = '';
            } else {
                return { error: `Combinação de nota inválida: "${char}${isSharp ? '#' : ''}${isSecondOctave ? '+' : ''}"` };
            }
        } else {
            return { error: `Caractere não reconhecido: "${char}"` };
        }
    }
    
    return { notes: parsedNotes };
}

function noteObjToNotation(noteObj, whistleKey) {
    if (!noteObj) return '';
    if (noteObj.note === 'LINEBREAK') return '\n';
    if (noteObj.note === 'BAR') return ' | ';
    if (noteObj.note === 'DOUBLE_BAR') return ' || ';
    if (noteObj.note === 'REPEAT_START') return ' |: ';
    if (noteObj.note === 'REPEAT_END') return ' :| ';
    if (noteObj.note === 'REST') return ' ';

    let str = '';
    if (noteObj.chord) str += `"${noteObj.chord}"`;
    if (noteObj.ornament === 'roll') str += '~';
    else if (noteObj.ornament === 'cut') str += '^';
    else if (noteObj.ornament === 'strike') str += 'v';
    else if (noteObj.ornament === 'cran') str += '*';
    else if (noteObj.ornament === 'slide') str += '/';

    const key = whistleKey || (whistleKeyEl ? whistleKeyEl.value : (currentSong ? currentSong.key : 'D')) || 'D';
    let baseNotation = getNoteNotationText(noteObj.note, key);
    if (!baseNotation) {
        const fallbackMap = {
            'D5': 'd', 'E5': 'e', 'F#5': 'f#', 'G5': 'g', 'A5': 'a', 'B5': 'b', 'C5': 'c', 'C#6': 'c#',
            'D6': 'D', 'E6': 'E', 'F#6': 'F#', 'G6': 'G', 'A6': 'A', 'B6': 'B', 'C6': 'C', 'C#7': 'C#'
        };
        baseNotation = fallbackMap[noteObj.note] || '';
    }
    str += baseNotation;
    if (noteObj.duration && noteObj.duration !== 1.0) {
        str += String(noteObj.duration);
    }
    return str;
}

function noteKeyToNotation(noteKey, whistleKey) {
    return noteObjToNotation({ note: noteKey, duration: 1.0 }, whistleKey);
}

function getDurationSymbol(duration) {
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

function updateTextNotesInput() {
    if (!textNotesInputEl || !currentSong) return;
    if (document.activeElement === textNotesInputEl) return;
    
    const whistleKey = whistleKeyEl ? whistleKeyEl.value : (currentSong.key || 'D');
    const textValue = currentSong.notes.map(n => noteObjToNotation(n, whistleKey)).join('');
    textNotesInputEl.value = textValue;
    
    textNotesInputEl.classList.remove('invalid');
    textNotesErrorEl.style.display = 'none';
    textNotesErrorEl.textContent = '';
}

function handleTextNotesInput() {
    if (!currentSong) return;
    
    const text = textNotesInputEl.value;
    const parseResult = parseStringOfNotes(text);
    
    if (parseResult.error) {
        textNotesInputEl.classList.add('invalid');
        textNotesErrorEl.style.display = 'block';
        textNotesErrorEl.textContent = parseResult.error;
        return;
    }
    
    textNotesInputEl.classList.remove('invalid');
    textNotesErrorEl.style.display = 'none';
    textNotesErrorEl.textContent = '';
    
    const parsedNotes = parseResult.notes;
    
    pushHistoryState('Editar por Texto');
    const oldNotes = currentSong.notes;
    const newNotes = parsedNotes.map((newObj, idx) => {
        const oldNote = oldNotes[idx];
        if (oldNote && oldNote.note === newObj.note) {
            return {
                ...oldNote,
                duration: newObj.duration || oldNote.duration,
                chord: newObj.chord || oldNote.chord,
                ornament: newObj.ornament || oldNote.ornament
            };
        }
        return newObj;
    });
    
    currentSong.notes = newNotes;
    saveSongsToStorage();
    renderTab();
}

// ==========================================================================
// 13. FERRAMENTA DE TRANSPOSIÇÃO DE TOM & FLAUTA
// ==========================================================================

// Mapeamento de semitons cromáticos em relação à nota fundamental da flauta (D5 = 0)
const NOTE_TO_SEMITONES = {
    'D5': 0, 'E5': 2, 'F#5': 4, 'G5': 5, 'A5': 7, 'B5': 9, 'C5': 10, 'C#6': 11,
    'D6': 12, 'E6': 14, 'F#6': 16, 'G6': 17, 'A6': 19, 'B6': 21, 'C6': 22, 'C#7': 23
};

// Mapeamento inverso de semitons para notas nativas da flauta
const SEMITONES_TO_NOTE = {
    0: 'D5',
    1: 'D5',
    2: 'E5',
    3: 'F#5',
    4: 'F#5',
    5: 'G5',
    6: 'G5',
    7: 'A5',
    8: 'A5',
    9: 'B5',
    10: 'C5',
    11: 'C#6',
    12: 'D6',
    13: 'D6',
    14: 'E6',
    15: 'F#6',
    16: 'F#6',
    17: 'G6',
    18: 'G6',
    19: 'A6',
    20: 'A6',
    21: 'B6',
    22: 'C6',
    23: 'C#7'
};

let lastTransposedState = null;

function getWhistleSemitoneOffset(whistleKey) {
    const data = WHISTLE_KEYS_DATA[whistleKey];
    return data ? data.semitones : 0;
}

function calculateWhistleKeyDelta(fromKey, toKey) {
    const fromOffset = getWhistleSemitoneOffset(fromKey);
    const toOffset = getWhistleSemitoneOffset(toKey);
    let diff = fromOffset - toOffset;
    // Normalizar para a menor distância angular no círculo cromático (-6 a +6)
    diff = ((diff + 6) % 12 + 12) % 12 - 6;
    return diff;
}

function updateFluteConvertPreview() {
    if (!fluteConvertPreview || !transposeFromKeyEl || !transposeToKeyEl) return;
    const fromKey = transposeFromKeyEl.value;
    const toKey = transposeToKeyEl.value;
    const fromData = getWhistleKeyData(fromKey);
    const toData = getWhistleKeyData(toKey);

    if (fromKey === toKey) {
        fluteConvertPreview.innerHTML = `
            <div class="preview-item">
                <span>Flautas de origem e destino idênticas. Nenhuma alteração de dedilhado necessária.</span>
            </div>
        `;
        return;
    }

    const delta = calculateWhistleKeyDelta(fromKey, toKey);
    const sign = delta > 0 ? `+${delta}` : `${delta}`;
    const desc = delta > 0 ? `${delta} semitom(ns) acima` : `${Math.abs(delta)} semitom(ns) abaixo`;

    fluteConvertPreview.innerHTML = `
        <div class="preview-item">
            <strong>Diferença de Afinação:</strong> ${sign} semitom(ns) (${desc}).
        </div>
        <div class="preview-explanation">
            Para que a melodia continue soando com a mesma altura real na flauta <strong>${toData.name}</strong>, a tablatura será transposta em <strong>${sign} semitom(ns)</strong> e o tom da flauta ativa passará a ser <strong>${toData.name}</strong>.
        </div>
    `;
}

function showTransposeFeedback(msg, type = 'success') {
    if (!transposeFeedback) return;
    transposeFeedback.className = `transpose-feedback ${type}`;
    transposeFeedback.textContent = msg;
    transposeFeedback.style.display = 'block';
}

function clearTransposeFeedback() {
    if (!transposeFeedback) return;
    transposeFeedback.style.display = 'none';
    transposeFeedback.textContent = '';
}

function transposeCurrentSong(semitonesDelta, newKey = null, autoFold = true) {
    if (!currentSong || !currentSong.notes || currentSong.notes.length === 0) {
        showTransposeFeedback('A tablatura atual está vazia. Adicione notas antes de transpor.', 'warning');
        return false;
    }

    if (semitonesDelta === 0 && (!newKey || newKey === currentSong.key)) {
        showTransposeFeedback('Nenhuma alteração de tom necessária.', 'info');
        return false;
    }

    // Salvar estado anterior para desfazer
    lastTransposedState = {
        notes: JSON.parse(JSON.stringify(currentSong.notes)),
        key: currentSong.key || (whistleKeyEl ? whistleKeyEl.value : 'D') || 'D'
    };
    if (btnUndoTranspose) btnUndoTranspose.disabled = false;

    let adjustedCount = 0;
    let approxCount = 0;
    let modifiedNotesCount = 0;

    const DIATONIC_SEMITONES = [0, 2, 4, 5, 7, 9, 10, 11, 12, 14, 16, 17, 19, 21, 22, 23];

    currentSong.notes = currentSong.notes.map(noteItem => {
        if (!noteItem || noteItem.note === 'REST' || noteItem.note === 'LINEBREAK') {
            return noteItem;
        }

        const currSemitone = NOTE_TO_SEMITONES[noteItem.note];
        if (currSemitone === undefined) {
            return noteItem;
        }

        let targetSemitone = currSemitone + semitonesDelta;

        if (autoFold) {
            while (targetSemitone < 0) {
                targetSemitone += 12;
                adjustedCount++;
            }
            while (targetSemitone > 23) {
                targetSemitone -= 12;
                adjustedCount++;
            }
        } else {
            if (targetSemitone < 0) { targetSemitone = 0; adjustedCount++; }
            if (targetSemitone > 23) { targetSemitone = 23; adjustedCount++; }
        }

        if (!DIATONIC_SEMITONES.includes(targetSemitone)) {
            approxCount++;
        }

        const newNoteName = SEMITONES_TO_NOTE[targetSemitone] || 'D5';
        modifiedNotesCount++;

        return {
            ...noteItem,
            note: newNoteName,
            fingering: [...(STANDARD_FINGERINGS[newNoteName] || [0, 0, 0, 0, 0, 0])]
        };
    });

    if (newKey) {
        currentSong.key = newKey;
        if (whistleKeyEl) whistleKeyEl.value = newKey;
        if (transposeFromKeyEl) transposeFromKeyEl.value = newKey;
        renderKeyboard(newKey);
        updateTextInputHelp(newKey);
    }

    saveSongsToStorage();
    renderTab();
    updateTextNotesInput();

    let msg = `Transposição aplicada com sucesso (${modifiedNotesCount} notas)!`;
    if (newKey) {
        const keyData = getWhistleKeyData(newKey);
        msg = `Tablatura adaptada com sucesso para flauta em ${keyData.name}!`;
    }
    if (adjustedCount > 0) {
        msg += ` (${adjustedCount} notas ajustadas por oitava para caber na flauta).`;
    }
    if (approxCount > 0) {
        msg += ` (${approxCount} notas cromáticas aproximadas para a escala da flauta).`;
    }
    showTransposeFeedback(msg, 'success');
    return true;
}

function undoTranspose() {
    if (!lastTransposedState || !currentSong) return;
    currentSong.notes = JSON.parse(JSON.stringify(lastTransposedState.notes));
    const prevKey = lastTransposedState.key || 'D';
    if (currentSong.key !== prevKey) {
        currentSong.key = prevKey;
        if (whistleKeyEl) whistleKeyEl.value = prevKey;
        if (transposeFromKeyEl) transposeFromKeyEl.value = prevKey;
        renderKeyboard(prevKey);
        updateTextInputHelp(prevKey);
    }
    saveSongsToStorage();
    renderTab();
    updateTextNotesInput();
    lastTransposedState = null;
    if (btnUndoTranspose) btnUndoTranspose.disabled = true;
    showTransposeFeedback('Transposição revertida com sucesso!', 'info');
}

function openTransposeModal() {
    clearTransposeFeedback();
    const currentKey = currentSong ? (currentSong.key || 'D') : (whistleKeyEl ? whistleKeyEl.value : 'D');
    if (transposeFromKeyEl) transposeFromKeyEl.value = currentKey;
    if (transposeToKeyEl && transposeToKeyEl.value === currentKey) {
        transposeToKeyEl.value = currentKey === 'D' ? 'C' : 'D';
    }
    updateFluteConvertPreview();
    if (transposeModal) transposeModal.classList.add('open');
}

function closeTransposeModal() {
    if (transposeModal) transposeModal.classList.remove('open');
}

function setupTransposeModal() {
    if (!btnOpenTranspose || !transposeModal) return;

    btnOpenTranspose.addEventListener('click', openTransposeModal);
    if (btnCloseTranspose) btnCloseTranspose.addEventListener('click', closeTransposeModal);
    if (btnCloseTransposeDone) btnCloseTransposeDone.addEventListener('click', closeTransposeModal);

    transposeModal.addEventListener('click', (e) => {
        if (e.target === transposeModal) {
            closeTransposeModal();
        }
    });

    // Abas do Modal de Transposição
    const modalTabBtns = transposeModal.querySelectorAll('.transpose-tab-btn');
    modalTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modalTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.dataset.tab;
            const panels = transposeModal.querySelectorAll('.transpose-tab-panel');
            panels.forEach(panel => {
                panel.style.display = (panel.id === targetId) ? 'flex' : 'none';
            });
            clearTransposeFeedback();
        });
    });

    // Mudança de flautas
    if (transposeFromKeyEl) transposeFromKeyEl.addEventListener('change', updateFluteConvertPreview);
    if (transposeToKeyEl) transposeToKeyEl.addEventListener('change', updateFluteConvertPreview);

    // Botão Converter Flauta
    if (btnApplyFluteTranspose) {
        btnApplyFluteTranspose.addEventListener('click', () => {
            const fromKey = transposeFromKeyEl.value;
            const toKey = transposeToKeyEl.value;
            if (fromKey === toKey) {
                showTransposeFeedback('A flauta de origem e de destino são iguais.', 'warning');
                return;
            }
            const autoFold = chkFluteAutofold ? chkFluteAutofold.checked : true;
            const delta = calculateWhistleKeyDelta(fromKey, toKey);
            transposeCurrentSong(delta, toKey, autoFold);
        });
    }

    // Botões rápidos de transposição (+1, -1, +2, -2, +12, -12)
    const quickButtons = transposeModal.querySelectorAll('.btn-quick-trans');
    quickButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const semitones = parseInt(btn.dataset.semitones, 10);
            const autoFold = chkPitchAutofold ? chkPitchAutofold.checked : true;
            transposeCurrentSong(semitones, null, autoFold);
        });
    });

    // Botão aplicar semitons personalizados
    if (btnApplyCustomSemitones && customSemitonesSelect) {
        btnApplyCustomSemitones.addEventListener('click', () => {
            const semitones = parseInt(customSemitonesSelect.value, 10);
            const autoFold = chkPitchAutofold ? chkPitchAutofold.checked : true;
            transposeCurrentSong(semitones, null, autoFold);
        });
    }

    // Botão Desfazer
    if (btnUndoTranspose) {
        btnUndoTranspose.addEventListener('click', undoTranspose);
    }
}

// ==========================================================================
// 14. MÓDULO DE NOTAÇÃO ABC (TheSession.org)
// ==========================================================================

function parseABCNotation(abcText) {
    if (!abcText || !abcText.trim()) {
        return { error: 'O texto ABC fornecido está vazio.' };
    }

    const lines = abcText.split(/\r?\n/);
    let title = 'Melodia Celta (ABC)';
    let artist = 'Tradicional';
    let meter = '4/4';
    let unitLength = '1/8'; // Default clássico no ABC
    let tempo = 110;
    let key = 'D'; // Tonalidade ABC
    let bodyText = '';
    let readingBody = false;

    // 1. Extração dos Cabeçalhos ABC
    for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Linhas de comentário ou instruções especiais
        if (trimmed.startsWith('%')) continue;

        // Se começa com campo de cabeçalho tipo "T:", "M:", "K:", etc.
        const headerMatch = trimmed.match(/^([A-Za-z]):\s*(.*)$/);
        if (headerMatch && !readingBody) {
            const field = headerMatch[1].toUpperCase();
            const val = headerMatch[2].trim();
            if (field === 'T') {
                if (title === 'Melodia Celta (ABC)') title = val;
            } else if (field === 'C') {
                artist = val;
            } else if (field === 'M') {
                meter = val;
                if (meter === 'C') meter = '4/4';
                if (meter === 'C|') meter = '2/2';
            } else if (field === 'L') {
                unitLength = val;
            } else if (field === 'Q') {
                const bpmMatch = val.match(/=\s*([0-9]+)/) || val.match(/([0-9]+)/);
                if (bpmMatch) tempo = parseInt(bpmMatch[1], 10);
            } else if (field === 'K') {
                key = val.split(' ')[0]; // ex: "D", "G", "Edor", "Am"
                readingBody = true; // No padrão ABC, a música começa após K:
            }
        } else {
            // Corpo da melodia (pode haver mais headers como P: ou W: no meio, mas linhas com notas são música)
            if (trimmed.match(/^[A-Za-z]:/)) {
                // Outro header no meio
                const field = trimmed[0].toUpperCase();
                const val = trimmed.substring(2).trim();
                if (field === 'K') key = val.split(' ')[0];
                if (field === 'M') meter = val;
                if (field === 'Q') {
                    const bpmMatch = val.match(/=\s*([0-9]+)/) || val.match(/([0-9]+)/);
                    if (bpmMatch) tempo = parseInt(bpmMatch[1], 10);
                }
            } else {
                bodyText += ' ' + trimmed;
                readingBody = true;
            }
        }
    }

    // Calcular o fator da duração base (L:) em relação a 1 tempo (semínima = 1.0)
    let baseUnitBeats = 0.5; // Se L: 1/8, cada nota base tem 0.5 tempo
    if (unitLength === '1/4') baseUnitBeats = 1.0;
    else if (unitLength === '1/16') baseUnitBeats = 0.25;
    else if (unitLength === '1/2') baseUnitBeats = 2.0;

    // Configuração de armadura de clave para acidentes automáticos
    const keyClean = key.toUpperCase();
    const hasFSharp = !keyClean.startsWith('C') && !keyClean.startsWith('F') && !keyClean.startsWith('DM') && !keyClean.startsWith('AM');
    const hasCSharp = keyClean.startsWith('D') || keyClean.startsWith('A') || keyClean.startsWith('E') || keyClean.startsWith('B');

    // 2. Parser do Corpo Melódico
    const parsedNotes = [];
    let i = 0;
    let pendingChord = '';
    let pendingOrnament = '';

    while (i < bodyText.length) {
        const char = bodyText[i];

        // Whitespace
        if (/\s/.test(char)) {
            i++;
            continue;
        }

        // Cifra entre aspas: "D", "G", "Em", "A7"
        if (char === '"') {
            const endIdx = bodyText.indexOf('"', i + 1);
            if (endIdx !== -1) {
                pendingChord = bodyText.substring(i + 1, endIdx).trim();
                i = endIdx + 1;
                continue;
            }
        }

        // Barras de Compasso
        if (bodyText.startsWith('|:', i) || bodyText.startsWith('[|:', i)) {
            parsedNotes.push({ note: 'REPEAT_START', duration: 0 });
            i += (bodyText.startsWith('[|:', i) ? 3 : 2);
            continue;
        }
        if (bodyText.startsWith(':|', i) || bodyText.startsWith(':|]', i)) {
            parsedNotes.push({ note: 'REPEAT_END', duration: 0 });
            i += (bodyText.startsWith(':|]', i) ? 3 : 2);
            continue;
        }
        if (bodyText.startsWith('::', i)) {
            parsedNotes.push({ note: 'REPEAT_END', duration: 0 });
            parsedNotes.push({ note: 'REPEAT_START', duration: 0 });
            i += 2;
            continue;
        }
        if (bodyText.startsWith('||', i) || bodyText.startsWith('[|', i) || bodyText.startsWith('|]', i)) {
            parsedNotes.push({ note: 'DOUBLE_BAR', duration: 0 });
            i += 2;
            continue;
        }
        if (char === '|') {
            parsedNotes.push({ note: 'BAR', duration: 0 });
            i++;
            continue;
        }

        // Ornamentos ABC
        if (char === '~') {
            pendingOrnament = 'roll';
            i++;
            continue;
        }
        // Grace notes / cuts: {g} ou {e}
        if (char === '{') {
            const endBrace = bodyText.indexOf('}', i + 1);
            if (endBrace !== -1) {
                pendingOrnament = 'cut';
                i = endBrace + 1;
                continue;
            }
        }
        // Símbolos de ornamentos tipo v, u, H, T
        if (char === 'v' && i + 1 < bodyText.length && /[A-Ga-gzZ]/.test(bodyText[i + 1])) {
            pendingOrnament = 'strike';
            i++;
            continue;
        }

        // Acidentes explícitos antes da nota: ^ (sustenido), _ (bemol), = (bequadro)
        let accidental = null;
        if (char === '^') {
            accidental = 'sharp';
            i++;
        } else if (char === '_') {
            accidental = 'flat';
            i++;
        } else if (char === '=') {
            accidental = 'natural';
            i++;
        }

        if (i >= bodyText.length) break;
        const noteLetter = bodyText[i];

        // Pausa no ABC: 'z' ou 'x'
        if (noteLetter === 'z' || noteLetter === 'Z' || noteLetter === 'x' || noteLetter === 'X') {
            i++;
            // Duração da pausa
            let durMult = 1.0;
            const durMatch = bodyText.substring(i).match(/^([0-9]*\/[0-9]+|[0-9]+|\/)/);
            if (durMatch) {
                const durStr = durMatch[1];
                if (durStr === '/') durMult = 0.5;
                else if (durStr.includes('/')) {
                    const parts = durStr.split('/');
                    const num = parts[0] ? parseFloat(parts[0]) : 1;
                    const den = parseFloat(parts[1]) || 2;
                    durMult = num / den;
                } else {
                    durMult = parseFloat(durStr) || 1;
                }
                i += durMatch[0].length;
            }
            parsedNotes.push({
                note: 'REST',
                duration: baseUnitBeats * durMult,
                chord: pendingChord,
                ornament: ''
            });
            pendingChord = '';
            continue;
        }

        // Nota Musical ABC (A-G ou a-g)
        if (/[a-gA-G]/.test(noteLetter)) {
            i++;
            let octaveModifiers = 0; // Positivo = oitava acima ('), Negativo = oitava abaixo (,)
            while (i < bodyText.length && (bodyText[i] === "'" || bodyText[i] === ",")) {
                if (bodyText[i] === "'") octaveModifiers++;
                if (bodyText[i] === ",") octaveModifiers--;
                i++;
            }

            // Duração da nota
            let durMult = 1.0;
            const durMatch = bodyText.substring(i).match(/^([0-9]*\/[0-9]+|[0-9]+|\/)/);
            if (durMatch) {
                const durStr = durMatch[1];
                if (durStr === '/') durMult = 0.5;
                else if (durStr.includes('/')) {
                    const parts = durStr.split('/');
                    const num = parts[0] ? parseFloat(parts[0]) : 1;
                    const den = parseFloat(parts[1]) || 2;
                    durMult = num / den;
                } else {
                    durMult = parseFloat(durStr) || 1;
                }
                i += durMatch[0].length;
            }

            // Mapeamento de nota ABC para notas nativas do Tin Whistle (D5 a D7)
            const isUpperLetter = (noteLetter === noteLetter.toUpperCase()); // C D E F G A B
            const letterUpper = noteLetter.toUpperCase();
            
            // Decisão da oitava: 
            // C,D,E,F,G,A,B no ABC são tratados como a 1ª oitava da flauta em Ré
            // c,d,e,f,g,a,b são a 2ª oitava
            let octave = isUpperLetter ? 5 : 6;
            if (octaveModifiers > 0) octave += octaveModifiers;
            if (octaveModifiers < 0) octave += octaveModifiers;

            // Ajuste de acidente conforme armadura de clave ou acidente explícito
            let isSharp = false;
            let isNatural = false;
            if (accidental === 'sharp') isSharp = true;
            else if (accidental === 'natural') isNatural = true;
            else {
                if (letterUpper === 'F' && hasFSharp) isSharp = true;
                if (letterUpper === 'C' && hasCSharp) isSharp = true;
            }

            // Construir chave de nota
            let whistleNote = '';
            if (letterUpper === 'D') whistleNote = octave <= 5 ? 'D5' : 'D6';
            else if (letterUpper === 'E') whistleNote = octave <= 5 ? 'E5' : 'E6';
            else if (letterUpper === 'F') {
                if (isSharp) whistleNote = octave <= 5 ? 'F#5' : 'F#6';
                else whistleNote = octave <= 5 ? 'F#5' : 'F#6'; // Whistle toca F# nativo
            } else if (letterUpper === 'G') whistleNote = octave <= 5 ? 'G5' : 'G6';
            else if (letterUpper === 'A') whistleNote = octave <= 5 ? 'A5' : 'A6';
            else if (letterUpper === 'B') whistleNote = octave <= 5 ? 'B5' : 'B6';
            else if (letterUpper === 'C') {
                if (isSharp) whistleNote = octave <= 5 ? 'C#6' : 'C#7';
                else whistleNote = octave <= 5 ? 'C5' : 'C6'; // C Natural
            }

            if (whistleNote && STANDARD_FINGERINGS[whistleNote]) {
                parsedNotes.push({
                    note: whistleNote,
                    duration: baseUnitBeats * durMult,
                    chord: pendingChord,
                    ornament: pendingOrnament,
                    lyric: ''
                });
                pendingChord = '';
                pendingOrnament = '';
            }
            continue;
        }

        // Ignorar caracteres não suportados (ex: números soltos de repetição 1, 2)
        i++;
    }

    if (parsedNotes.length === 0) {
        return { error: 'Nenhuma nota musical válida foi encontrada no código ABC.' };
    }

    // Normalizar tom para flauta padrão (D ou a que melhor couber)
    let whistleKey = 'D';
    if (['C', 'G', 'A', 'BB', 'F', 'EB'].includes(keyClean)) {
        whistleKey = keyClean === 'BB' ? 'Bb' : keyClean === 'EB' ? 'Eb' : keyClean;
    }

    return {
        title,
        artist,
        key: whistleKey,
        timeSignature: meter,
        tempo,
        notes: parsedNotes
    };
}

function exportSongToABC(song) {
    if (!song) return '';

    const title = song.title || 'Melodia Sem Título';
    const artist = song.artist || 'Tradicional';
    const timeSig = song.timeSignature || '4/4';
    const tempo = song.tempo || 110;
    const key = song.key || 'D';

    let abc = `X: 1\n`;
    abc += `T: ${title}\n`;
    abc += `C: ${artist}\n`;
    abc += `M: ${timeSig}\n`;
    abc += `L: 1/8\n`;
    abc += `Q: 1/4=${tempo}\n`;
    abc += `K: ${key}\n`;

    let line = '';
    let measuresInLine = 0;

    song.notes.forEach((n, idx) => {
        if (n.note === 'LINEBREAK') {
            abc += line.trim() + '\n';
            line = '';
            measuresInLine = 0;
            return;
        }

        if (n.note === 'BAR') {
            line += ' | ';
            measuresInLine++;
            if (measuresInLine >= 4) {
                abc += line.trim() + '\n';
                line = '';
                measuresInLine = 0;
            }
            return;
        }
        if (n.note === 'DOUBLE_BAR') {
            line += ' || ';
            measuresInLine++;
            return;
        }
        if (n.note === 'REPEAT_START') {
            line += ' |: ';
            return;
        }
        if (n.note === 'REPEAT_END') {
            line += ' :| ';
            measuresInLine++;
            if (measuresInLine >= 4) {
                abc += line.trim() + '\n';
                line = '';
                measuresInLine = 0;
            }
            return;
        }

        // Cifra
        if (n.chord) {
            line += `"${n.chord}"`;
        }

        // Ornamento
        if (n.ornament === 'roll') line += '~';
        else if (n.ornament === 'cut') line += '{g}';
        else if (n.ornament === 'strike') line += 'v';

        // Nota
        if (n.note === 'REST') {
            line += 'z';
        } else {
            // Mapeamento reverso para letras ABC
            const abcNoteMap = {
                'D5': 'D', 'E5': 'E', 'F#5': 'F', 'G5': 'G', 'A5': 'A', 'B5': 'B', 'C5': '=c', 'C#6': 'c',
                'D6': 'd', 'E6': 'e', 'F#6': 'f', 'G6': 'g', 'A6': 'a', 'B6': 'b', 'C6': '=c\'', 'C#7': 'c\''
            };
            line += (abcNoteMap[n.note] || 'd');
        }

        // Duração (considerando L: 1/8 => 0.5 tempo = 1)
        const dur = n.duration !== undefined ? n.duration : 1.0;
        const mult = Math.round(dur / 0.5);
        if (mult === 2) line += '2';
        else if (mult === 3) line += '3';
        else if (mult === 4) line += '4';
        else if (mult === 6) line += '6';
        else if (mult === 8) line += '8';
        else if (dur === 0.25) line += '/';
        else if (mult !== 1 && mult > 0) line += String(mult);
    });

    if (line.trim()) {
        abc += line.trim();
        if (!line.trim().endsWith('|') && !line.trim().endsWith(':|')) {
            abc += ' |';
        }
        abc += '\n';
    }

    return abc;
}

function showABCFeedback(msg, type = 'success') {
    if (!abcFeedback) return;
    abcFeedback.className = `abc-feedback ${type}`;
    abcFeedback.textContent = msg;
    abcFeedback.style.display = 'block';
}

function clearABCFeedback() {
    if (!abcFeedback) return;
    abcFeedback.style.display = 'none';
    abcFeedback.textContent = '';
}

function openABCModal() {
    clearABCFeedback();
    if (exportAbcTextarea && currentSong) {
        exportAbcTextarea.value = exportSongToABC(currentSong);
    }
    if (abcModal) abcModal.classList.add('open');
}

function closeABCModal() {
    if (abcModal) abcModal.classList.remove('open');
}

function setupABCModal() {
    if (!btnOpenAbc || !abcModal) return;

    btnOpenAbc.addEventListener('click', openABCModal);
    if (btnCloseAbc) btnCloseAbc.addEventListener('click', closeABCModal);
    if (btnCloseAbcDone) btnCloseAbcDone.addEventListener('click', closeABCModal);

    abcModal.addEventListener('click', (e) => {
        if (e.target === abcModal) closeABCModal();
    });

    // Abas do Modal ABC
    const tabBtns = abcModal.querySelectorAll('.abc-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.dataset.tab;
            const panels = abcModal.querySelectorAll('.abc-tab-panel');
            panels.forEach(panel => {
                panel.style.display = (panel.id === targetId) ? 'block' : 'none';
            });
            clearABCFeedback();
            if (targetId === 'tab-export-abc' && currentSong) {
                exportAbcTextarea.value = exportSongToABC(currentSong);
            }
        });
    });

    // Botão Aplicar Importação ABC
    if (btnApplyImportAbc && importAbcTextarea) {
        btnApplyImportAbc.addEventListener('click', () => {
            const text = importAbcTextarea.value;
            const res = parseABCNotation(text);
            if (res.error) {
                showABCFeedback(res.error, 'error');
                return;
            }

            pushHistoryState('Importar Notação ABC');
            const newId = 'song-abc-' + Date.now();
            const importedSong = {
                id: newId,
                title: res.title,
                artist: res.artist,
                key: res.key,
                timeSignature: res.timeSignature,
                tempo: res.tempo,
                notes: res.notes
            };

            songs.unshift(importedSong);
            saveSongsToStorage();
            renderSidebar();
            selectSong(newId);
            closeABCModal();
            alert(`Melodia "${importedSong.title}" importada com sucesso (${res.notes.length} elementos)!`);
        });
    }

    // Botão Copiar ABC
    if (btnCopyAbc && exportAbcTextarea) {
        btnCopyAbc.addEventListener('click', () => {
            exportAbcTextarea.select();
            navigator.clipboard.writeText(exportAbcTextarea.value).then(() => {
                showABCFeedback('Código ABC copiado para a área de transferência com sucesso!', 'success');
            }).catch(() => {
                document.execCommand('copy');
                showABCFeedback('Código ABC copiado!', 'success');
            });
        });
    }

    // Botão Baixar .abc
    if (btnDownloadAbc && exportAbcTextarea && currentSong) {
        btnDownloadAbc.addEventListener('click', () => {
            const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(exportSongToABC(currentSong));
            const downloadAnchor = document.createElement('a');
            const sanitizedTitle = (currentSong.title || 'tune').toLowerCase().replace(/[^a-z0-9]/g, '_');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `${sanitizedTitle}.abc`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showABCFeedback(`Arquivo "${sanitizedTitle}.abc" gerado para download!`, 'success');
        });
    }

    // Carregar arquivo .abc do disco
    if (abcFileInput && importAbcTextarea) {
        abcFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                importAbcTextarea.value = ev.target.result;
                showABCFeedback(`Arquivo "${file.name}" carregado. Clique em "Importar para o Editor".`, 'success');
            };
            reader.readAsText(file);
            e.target.value = '';
        });
    }
}

// ==========================================================================
// 12. FASE 2: MODO PRÁTICA (PLAY-ALONG, LOOP A-B, DRONE, SPEED TRAINER & MIC)
// ==========================================================================

const DRONE_KEY_FREQUENCIES = {
    'D':  { tonic: 146.83, fifth: 220.00, label: 'Bordão D + A' },
    'C':  { tonic: 130.81, fifth: 196.00, label: 'Bordão C + G' },
    'G':  { tonic: 196.00, fifth: 293.66, label: 'Bordão G + D' },
    'A':  { tonic: 220.00, fifth: 329.63, label: 'Bordão A + E' },
    'Bb': { tonic: 116.54, fifth: 174.61, label: 'Bordão B♭ + F' },
    'F':  { tonic: 174.61, fifth: 261.63, label: 'Bordão F + C' },
    'Eb': { tonic: 155.56, fifth: 233.08, label: 'Bordão E♭ + B♭' }
};

function setupPracticeMode() {
    // 1. Alternador de Modos (Estúdio vs Prática vs Play-Along)
    if (btnModeStudio) {
        btnModeStudio.addEventListener('click', () => setAppMode('studio'));
    }
    if (btnModePractice) {
        btnModePractice.addEventListener('click', () => setAppMode('practice'));
    }
    if (btnModePlayAlong) {
        btnModePlayAlong.addEventListener('click', () => setAppMode('playalong'));
    }

    // 2. Controles de Loop A-B
    if (btnSetLoopA) {
        btnSetLoopA.addEventListener('click', () => {
            const idx = getSelectedOrActiveIndex();
            if (idx === -1) {
                alert('Selecione uma nota na partitura para definir como início [A] do loop.');
                return;
            }
            setLoopA(idx);
        });
    }

    if (btnSetLoopB) {
        btnSetLoopB.addEventListener('click', () => {
            const idx = getSelectedOrActiveIndex();
            if (idx === -1) {
                alert('Selecione uma nota na partitura para definir como fim [B] do loop.');
                return;
            }
            setLoopB(idx);
        });
    }

    if (toggleLoopAb) {
        toggleLoopAb.addEventListener('change', (e) => {
            isLoopActive = e.target.checked;
            if (isLoopActive && (loopAIndex === -1 || loopBIndex === -1)) {
                if (currentSong && currentSong.notes.length > 0) {
                    if (loopAIndex === -1) loopAIndex = 0;
                    if (loopBIndex === -1) loopBIndex = currentSong.notes.length - 1;
                }
            }
            loopCycleCount = 0;
            if (trainerCycleBadge) trainerCycleBadge.textContent = 'Ciclo #0';
            updateLoopVisuals();
            updateLoopStatusText();
        });
    }

    if (btnClearLoop) {
        btnClearLoop.addEventListener('click', clearLoop);
    }

    // 3. Speed Trainer
    if (toggleSpeedTrainer) {
        toggleSpeedTrainer.addEventListener('change', (e) => {
            isSpeedTrainerActive = e.target.checked;
            loopCycleCount = 0;
            if (trainerCycleBadge) {
                trainerCycleBadge.textContent = 'Ciclo #0';
            }
        });
    }

    if (speedTrainerStepEl) {
        speedTrainerStepEl.addEventListener('change', (e) => {
            speedTrainerStep = parseInt(e.target.value) || 4;
        });
    }

    // 4. Bordão Celta (Drone)
    if (btnToggleDrone) {
        btnToggleDrone.addEventListener('click', toggleDrone);
    }

    if (droneVolumeEl) {
        droneVolumeEl.addEventListener('input', (e) => {
            setDroneVolume(parseFloat(e.target.value));
        });
    }

    // 5. Controles de Visualização & Zoom
    if (btnZoomIn) {
        btnZoomIn.addEventListener('click', () => changeZoom(1));
    }
    if (btnZoomOut) {
        btnZoomOut.addEventListener('click', () => changeZoom(-1));
    }
    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', toggleFullscreen);
    }

    // 6. Afinador e Escuta por Microfone (Play-Along)
    if (btnToggleMic) {
        btnToggleMic.addEventListener('click', toggleMicrophone);
    }

    document.querySelectorAll('input[name="tuner-mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            micTunerMode = e.target.value;
            if (tunerStatusMsg) {
                if (micTunerMode === 'follow') {
                    tunerStatusMsg.textContent = 'Modo Play-Along: Compare o que você toca com a melodia na tela!';
                } else {
                    tunerStatusMsg.textContent = 'Modo Afinador Livre: Afine sua Tin Whistle nota por nota.';
                }
            }
        });
    });

    // Atualização de bordão quando troca afinação da flauta
    if (whistleKeyEl) {
        whistleKeyEl.addEventListener('change', () => {
            updateDroneFrequencies();
        });
    }

    updateDroneUI();
    updateLoopStatusText();
}

function setAppMode(mode) {
    currentAppMode = mode;
    
    // Resetar classes do body e botões de aba
    document.body.classList.remove('mode-practice', 'mode-playalong');
    if (btnModeStudio) btnModeStudio.classList.remove('active');
    if (btnModePractice) btnModePractice.classList.remove('active');
    if (btnModePlayAlong) btnModePlayAlong.classList.remove('active');

    // Desativar processos e microfones em andamento ao trocar de modo
    if (isMicListening) stopMic();
    if (isPlayAlongRunning) stopPlayAlong();
    if (isCountingIn) cancelCountIn();

    if (mode === 'practice') {
        document.body.classList.add('mode-practice');
        if (btnModePractice) btnModePractice.classList.add('active');
        if (practiceToolbar) practiceToolbar.style.display = 'flex';
        if (practiceBottomPanel) practiceBottomPanel.style.display = 'flex';
        if (playalongToolbar) playalongToolbar.style.display = 'none';
        if (playalongBottomPanel) playalongBottomPanel.style.display = 'none';
        clearPlayAlongVisuals();
        updateSongDisplayBanner(currentSong);
        
        if (tabSheetEl) {
            tabSheetEl.classList.remove('zoom-sm', 'zoom-md', 'zoom-lg', 'zoom-xl');
            tabSheetEl.classList.add(`zoom-${ZOOM_LEVELS[currentZoomIndex]}`);
        }
    } else if (mode === 'playalong') {
        document.body.classList.add('mode-playalong');
        if (btnModePlayAlong) btnModePlayAlong.classList.add('active');
        if (playalongToolbar) playalongToolbar.style.display = 'flex';
        if (playalongBottomPanel) playalongBottomPanel.style.display = 'flex';
        if (practiceToolbar) practiceToolbar.style.display = 'none';
        if (practiceBottomPanel) practiceBottomPanel.style.display = 'none';
        
        updateSongDisplayBanner(currentSong);
        initPlayAlongSession();
        
        if (tabSheetEl) {
            tabSheetEl.classList.remove('zoom-sm', 'zoom-md', 'zoom-lg', 'zoom-xl');
            tabSheetEl.classList.add(`zoom-${ZOOM_LEVELS[currentZoomIndex]}`);
        }
    } else {
        // Modo Estúdio (Criação & Edição)
        if (btnModeStudio) btnModeStudio.classList.add('active');
        if (practiceToolbar) practiceToolbar.style.display = 'none';
        if (practiceBottomPanel) practiceBottomPanel.style.display = 'none';
        if (playalongToolbar) playalongToolbar.style.display = 'none';
        if (playalongBottomPanel) playalongBottomPanel.style.display = 'none';
        clearPlayAlongVisuals();
    }
}

function getSelectedOrActiveIndex() {
    if (selectedIndices.size > 0) {
        const sorted = Array.from(selectedIndices).sort((a, b) => a - b);
        return sorted[0];
    }
    if (currentPlayIndex >= 0 && currentSong && currentPlayIndex < currentSong.notes.length) {
        return currentPlayIndex;
    }
    if (playbackStartIndex >= 0 && currentSong && playbackStartIndex < currentSong.notes.length) {
        return playbackStartIndex;
    }
    return -1;
}

// -------------------------------------------------------------
// FUNÇÕES DE LOOP A-B
// -------------------------------------------------------------
function setLoopA(idx) {
    loopAIndex = idx;
    if (loopBIndex !== -1 && loopAIndex > loopBIndex) {
        const temp = loopAIndex;
        loopAIndex = loopBIndex;
        loopBIndex = temp;
    }
    if (loopBIndex === -1 && currentSong && currentSong.notes.length > 0) {
        loopBIndex = currentSong.notes.length - 1;
    }
    isLoopActive = true;
    if (toggleLoopAb) toggleLoopAb.checked = true;
    loopCycleCount = 0;
    if (trainerCycleBadge) trainerCycleBadge.textContent = 'Ciclo #0';
    updateLoopVisuals();
    updateLoopStatusText();
}

function setLoopB(idx) {
    loopBIndex = idx;
    if (loopAIndex !== -1 && loopBIndex < loopAIndex) {
        const temp = loopAIndex;
        loopAIndex = loopBIndex;
        loopBIndex = temp;
    }
    if (loopAIndex === -1) {
        loopAIndex = 0;
    }
    isLoopActive = true;
    if (toggleLoopAb) toggleLoopAb.checked = true;
    loopCycleCount = 0;
    if (trainerCycleBadge) trainerCycleBadge.textContent = 'Ciclo #0';
    updateLoopVisuals();
    updateLoopStatusText();
}

function clearLoop() {
    loopAIndex = -1;
    loopBIndex = -1;
    isLoopActive = false;
    loopCycleCount = 0;
    if (toggleLoopAb) toggleLoopAb.checked = false;
    if (trainerCycleBadge) trainerCycleBadge.textContent = 'Ciclo #0';
    updateLoopVisuals();
    updateLoopStatusText();
}

function updateLoopVisuals() {
    document.querySelectorAll('.note-card').forEach(card => {
        const idx = parseInt(card.dataset.index);
        card.classList.remove('loop-marker-a', 'loop-marker-b', 'in-loop');
        if (idx === loopAIndex) card.classList.add('loop-marker-a');
        if (idx === loopBIndex) card.classList.add('loop-marker-b');
        if (isLoopActive && loopAIndex !== -1 && loopBIndex !== -1) {
            const start = Math.min(loopAIndex, loopBIndex);
            const end = Math.max(loopAIndex, loopBIndex);
            if (idx >= start && idx <= end) {
                card.classList.add('in-loop');
            }
        }
    });
}

function updateLoopStatusText() {
    if (!loopStatusText) return;
    if (loopAIndex === -1 && loopBIndex === -1) {
        loopStatusText.textContent = 'Selecione uma nota e marque [A] e [B]';
    } else if (loopAIndex !== -1 && loopBIndex === -1) {
        loopStatusText.textContent = `Ponto [A]: Nota #${loopAIndex + 1} (Defina [B])`;
    } else {
        const start = Math.min(loopAIndex, loopBIndex);
        const end = Math.max(loopAIndex, loopBIndex);
        loopStatusText.textContent = `Loop: Notas #${start + 1} a #${end + 1} (${end - start + 1} notas)`;
    }
}

// -------------------------------------------------------------
// FUNÇÕES DO BORDÃO CELTA (DRONE)
// -------------------------------------------------------------
function toggleDrone() {
    if (isDroneActive) {
        stopDrone();
    } else {
        startDrone();
    }
}

function startDrone() {
    initAudio();
    if (droneGainNode) stopDrone();

    const key = whistleKeyEl ? whistleKeyEl.value : 'D';
    const freqs = DRONE_KEY_FREQUENCIES[key] || DRONE_KEY_FREQUENCIES['D'];
    const now = audioCtx.currentTime;

    droneGainNode = audioCtx.createGain();
    const targetVol = parseFloat(droneVolumeEl ? droneVolumeEl.value : 0.25) || 0.25;
    droneGainNode.gain.setValueAtTime(0.001, now);
    droneGainNode.gain.exponentialRampToValueAtTime(Math.max(0.001, targetVol), now + 0.3);

    // Filtro para timbre de bordão de Uilleann Pipes
    droneFilter = audioCtx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(800, now);
    droneFilter.Q.setValueAtTime(2.0, now);

    // Oscilador 1: Fundamental (Tônica)
    droneOsc1 = audioCtx.createOscillator();
    droneOsc1.type = 'sawtooth';
    droneOsc1.frequency.setValueAtTime(freqs.tonic, now);

    // Oscilador 2: Quinta justa + ligeiro detune
    droneOsc2 = audioCtx.createOscillator();
    droneOsc2.type = 'triangle';
    droneOsc2.frequency.setValueAtTime(freqs.fifth, now);
    droneOsc2.detune.setValueAtTime(4, now);

    droneOsc1.connect(droneFilter);
    droneOsc2.connect(droneFilter);
    droneFilter.connect(droneGainNode);
    droneGainNode.connect(audioCtx.destination);

    droneOsc1.start(now);
    droneOsc2.start(now);

    isDroneActive = true;
    updateDroneUI();
}

function stopDrone() {
    if (!droneGainNode || !audioCtx) {
        isDroneActive = false;
        updateDroneUI();
        return;
    }
    const now = audioCtx.currentTime;
    try {
        droneGainNode.gain.setValueAtTime(droneGainNode.gain.value, now);
        droneGainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        setTimeout(() => {
            if (droneOsc1) { droneOsc1.stop(); droneOsc1.disconnect(); droneOsc1 = null; }
            if (droneOsc2) { droneOsc2.stop(); droneOsc2.disconnect(); droneOsc2 = null; }
            if (droneGainNode) { droneGainNode.disconnect(); droneGainNode = null; }
        }, 220);
    } catch(e) {
        // Fallback seguro
    }
    isDroneActive = false;
    updateDroneUI();
}

function setDroneVolume(vol) {
    if (droneGainNode && audioCtx && isDroneActive) {
        const now = audioCtx.currentTime;
        droneGainNode.gain.setValueAtTime(droneGainNode.gain.value, now);
        droneGainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), now + 0.05);
    }
}

function updateDroneFrequencies() {
    if (!isDroneActive || !audioCtx) return;
    const key = whistleKeyEl ? whistleKeyEl.value : 'D';
    const freqs = DRONE_KEY_FREQUENCIES[key] || DRONE_KEY_FREQUENCIES['D'];
    const now = audioCtx.currentTime;
    if (droneOsc1) droneOsc1.frequency.setValueAtTime(freqs.tonic, now);
    if (droneOsc2) droneOsc2.frequency.setValueAtTime(freqs.fifth, now);
    updateDroneUI();
}

function updateDroneUI() {
    const key = whistleKeyEl ? whistleKeyEl.value : 'D';
    const freqs = DRONE_KEY_FREQUENCIES[key] || DRONE_KEY_FREQUENCIES['D'];
    if (droneStatusText) {
        droneStatusText.textContent = `Tom ${key}: ${freqs.label}`;
    }
    if (btnToggleDrone && droneBtnLabel) {
        if (isDroneActive) {
            btnToggleDrone.classList.add('active');
            droneBtnLabel.textContent = 'Bordão Ativo';
        } else {
            btnToggleDrone.classList.remove('active');
            droneBtnLabel.textContent = 'Ligar Bordão';
        }
    }
}

// -------------------------------------------------------------
// FUNÇÕES DE COUNT-IN (CONTAGEM REGRESSIVA)
// -------------------------------------------------------------
function startCountIn() {
    // Count-in é exclusivo da tela de prática
    if (currentAppMode !== 'practice') {
        startPlayback();
        return;
    }
    initAudio();
    isCountingIn = true;
    if (!countInOverlay || !countInNum) {
        startPlayback();
        return;
    }

    const bpm = parseInt(songTempoEl.value) || 120;
    const beatInterval = (60 / bpm) * 1000;
    const timeSig = songTimeSignatureEl ? songTimeSignatureEl.value : '4/4';

    let totalBeats = 4;
    if (timeSig === '3/4') totalBeats = 3;
    else if (timeSig === '6/8') totalBeats = 2;
    else if (timeSig === '2/4') totalBeats = 2;
    else if (timeSig === '9/8') totalBeats = 3;
    else if (timeSig === '12/8') totalBeats = 4;

    countInOverlay.style.display = 'flex';
    if (countInInfo) {
        countInInfo.textContent = `Andamento: ${bpm} BPM • ${timeSig}`;
    }

    let currentBeat = 1;

    function countStep() {
        if (!isCountingIn) return;

        countInNum.textContent = currentBeat;
        countInNum.style.animation = 'none';
        void countInNum.offsetWidth;
        countInNum.style.animation = 'pulseNum 0.35s ease-out';

        // Clique do metrônomo no áudio
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(currentBeat === 1 ? 1400 : 900, now);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.06);

        if (currentBeat >= totalBeats) {
            countInTimeout = setTimeout(() => {
                countInOverlay.style.display = 'none';
                isCountingIn = false;
                startPlayback();
            }, beatInterval);
        } else {
            currentBeat++;
            countInTimeout = setTimeout(countStep, beatInterval);
        }
    }

    countStep();
}

function cancelCountIn() {
    isCountingIn = false;
    if (countInTimeout) clearTimeout(countInTimeout);
    if (countInOverlay) countInOverlay.style.display = 'none';
}

// -------------------------------------------------------------
// ZOOM E TELA CHEIA
// -------------------------------------------------------------
function changeZoom(delta) {
    currentZoomIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, currentZoomIndex + delta));
    if (tabSheetEl) {
        tabSheetEl.classList.remove('zoom-sm', 'zoom-md', 'zoom-lg', 'zoom-xl');
        tabSheetEl.classList.add(`zoom-${ZOOM_LEVELS[currentZoomIndex]}`);
    }
    if (zoomIndicator) {
        zoomIndicator.textContent = ZOOM_LABELS[currentZoomIndex];
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
    }
}

// -------------------------------------------------------------
// AFINADOR & ESCUTA POR MICROFONE (PLAY-ALONG)
// -------------------------------------------------------------
const NOTE_STRINGS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function toggleMicrophone() {
    if (isMicListening) {
        stopMic();
    } else {
        startMic();
    }
}

async function startMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Seu navegador não suporta captura de microfone.');
        return;
    }

    try {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtxClass) {
            alert('Seu navegador não suporta Web Audio API.');
            return;
        }

        micAudioContext = new AudioCtxClass();
        if (micAudioContext.state === 'suspended') {
            await micAudioContext.resume();
        }

        try {
            micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: true
                },
                video: false
            });
        } catch (constrErr) {
            console.warn('Fallback getUserMedia simples:', constrErr);
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        }

        const source = micAudioContext.createMediaStreamSource(micStream);
        micAnalyser = micAudioContext.createAnalyser();
        micAnalyser.fftSize = 2048;

        // Nó de ganho zero para manter o grafo rodando ativamente no Android/Chrome sem feedback
        const silenceGain = micAudioContext.createGain();
        silenceGain.gain.setValueAtTime(0, micAudioContext.currentTime);

        source.connect(micAnalyser);
        micAnalyser.connect(silenceGain);
        silenceGain.connect(micAudioContext.destination);

        isMicListening = true;
        if (btnToggleMic && micBtnLabel) {
            btnToggleMic.classList.add('btn-danger');
            btnToggleMic.classList.remove('btn-primary');
            micBtnLabel.textContent = 'Parar Microfone';
        }
        if (tunerStatusMsg) tunerStatusMsg.textContent = 'Escutando som da flauta... Toque uma nota!';
        updatePitchLoop();
    } catch (err) {
        console.error('Erro ao acessar microfone:', err);
        alert('Não foi possível acessar o microfone. Verifique as permissões do seu navegador.');
    }
}

function stopMic() {
    isMicListening = false;
    if (micRafId) cancelAnimationFrame(micRafId);
    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        micStream = null;
    }
    if (micAudioContext) {
        micAudioContext.close().catch(() => {});
        micAudioContext = null;
    }
    if (btnToggleMic && micBtnLabel) {
        btnToggleMic.classList.remove('btn-danger');
        btnToggleMic.classList.add('btn-primary');
        micBtnLabel.textContent = 'Ativar Microfone';
    }
    if (tunerDetectedNote) {
        tunerDetectedNote.textContent = '--';
        tunerDetectedNote.classList.remove('in-tune');
    }
    if (tunerDetectedFreq) tunerDetectedFreq.textContent = '0.0 Hz';
    if (tunerNeedle) tunerNeedle.style.left = '50%';
    if (tunerStatusMsg) tunerStatusMsg.textContent = 'Microfone desativado.';
}

function updatePitchLoop() {
    if (!isMicListening || !micAnalyser) return;

    if (micAudioContext && micAudioContext.state === 'suspended') {
        micAudioContext.resume().catch(() => {});
    }

    const buf = new Float32Array(micAnalyser.fftSize);
    micAnalyser.getFloatTimeDomainData(buf);
    const sampleRate = micAudioContext.sampleRate;
    const pitch = autoCorrelatePitch(buf, sampleRate);

    if (pitch !== -1 && pitch >= 200 && pitch <= 3000) {
        const noteNumber = noteFromPitchVal(pitch);
        const noteName = NOTE_STRINGS[noteNumber % 12];
        const octave = Math.floor(noteNumber / 12) - 1;
        const noteFullName = `${noteName}${octave}`;
        const cents = centsOffFromPitchVal(pitch, noteNumber);

        if (tunerDetectedNote) {
            tunerDetectedNote.textContent = noteFullName;
            if (Math.abs(cents) <= 8) {
                tunerDetectedNote.classList.add('in-tune');
            } else {
                tunerDetectedNote.classList.remove('in-tune');
            }
        }

        if (tunerDetectedFreq) {
            tunerDetectedFreq.textContent = `${pitch.toFixed(1)} Hz (${cents > 0 ? '+' : ''}${cents}¢)`;
        }

        if (tunerNeedle) {
            const clampedCents = Math.max(-50, Math.min(50, cents));
            const percent = 50 + (clampedCents);
            tunerNeedle.style.left = `${percent}%`;
        }

        // Feedback contextual (Afinador Livre vs Play-Along)
        if (micTunerMode === 'follow' && isPlaying && currentSong && currentPlayIndex >= 0 && currentPlayIndex < currentSong.notes.length) {
            const currentTabNote = currentSong.notes[currentPlayIndex];
            const currentTabNoteKey = currentTabNote.note;
            const currentWhistleKey = whistleKeyEl ? whistleKeyEl.value : 'D';
            const noteObjInfo = WHISTLE_KEYS_DATA[currentWhistleKey]?.notes[currentTabNoteKey];
            const targetNoteDisplay = noteObjInfo ? noteObjInfo.display : currentTabNoteKey;

            if (noteName === targetNoteDisplay || noteFullName === currentTabNoteKey) {
                if (tunerStatusMsg) tunerStatusMsg.innerHTML = `<span style="color: var(--emerald-primary); font-weight: bold;">✓ Nota Correta! (${targetNoteDisplay})</span>`;
            } else {
                if (tunerStatusMsg) tunerStatusMsg.textContent = `Tocando: ${noteFullName} | Esperado: ${targetNoteDisplay}`;
            }
        } else {
            if (tunerStatusMsg) {
                if (Math.abs(cents) <= 5) {
                    tunerStatusMsg.innerHTML = '<span style="color: var(--emerald-primary);">Perfeitamente afinado!</span>';
                } else if (cents < -5) {
                    tunerStatusMsg.textContent = 'Levemente baixo (pressione o bocal para afinar mais alto)';
                } else {
                    tunerStatusMsg.textContent = 'Levemente alto (puxe o bocal para afinar mais baixo)';
                }
            }
        }
    }

    micRafId = requestAnimationFrame(updatePitchLoop);
}

function autoCorrelatePitch(buf, sampleRate) {
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
        const val = buf[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.012) return -1;

    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
        if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
        if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    }

    const buf2 = buf.slice(r1, r2);
    const c = new Array(buf2.length).fill(0);
    for (let i = 0; i < buf2.length; i++) {
        for (let j = 0; j < buf2.length - i; j++) {
            c[i] = c[i] + buf2[j] * buf2[j + i];
        }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < buf2.length; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }
    let T0 = maxpos;
    if (T0 === -1 || T0 === 0) return -1;
    return sampleRate / T0;
}

function noteFromPitchVal(frequency) {
    const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    return Math.round(noteNum) + 69;
}

function frequencyFromNoteNumberVal(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
}

function centsOffFromPitchVal(frequency, note) {
    return Math.floor(1200 * Math.log(frequency / frequencyFromNoteNumberVal(note)) / Math.log(2));
}

// ==========================================================================
// 13. FASE 3: FILTROS DE BIBLIOTECA & COLAPSO DO MENU LATERAL
// ==========================================================================
function setupSidebarFiltersAndCollapse() {
    // 1. Alternância de Categorias (Pills)
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            selectedCategory = pill.dataset.category || 'all';
            renderSidebar();
        });
    });

    // 2. Filtro de Dificuldade
    if (filterDifficulty) {
        filterDifficulty.addEventListener('change', (e) => {
            selectedDifficulty = e.target.value;
            renderSidebar();
        });
    }

    // 3. Filtro de Ritmo
    if (filterRhythm) {
        filterRhythm.addEventListener('change', (e) => {
            selectedRhythm = e.target.value;
            renderSidebar();
        });
    }

    // 4. Botão Limpar Filtros
    if (btnResetFilters) {
        btnResetFilters.addEventListener('click', resetSidebarFilters);
    }

    // 5. Botões de Colapso e Expansão do Menu Lateral
    if (btnToggleSidebarCollapse) {
        btnToggleSidebarCollapse.addEventListener('click', toggleSidebarCollapse);
    }

    if (btnSidebarFloatingOpen) {
        btnSidebarFloatingOpen.addEventListener('click', () => {
            setSidebarCollapse(false);
        });
    }
}

function resetSidebarFilters() {
    selectedCategory = 'all';
    selectedDifficulty = 'all';
    selectedRhythm = 'all';
    if (searchInput) searchInput.value = '';
    if (filterDifficulty) filterDifficulty.value = 'all';
    if (filterRhythm) filterRhythm.value = 'all';
    
    document.querySelectorAll('.filter-pill').forEach(p => {
        if (p.dataset.category === 'all') p.classList.add('active');
        else p.classList.remove('active');
    });
    
    renderSidebar();
}

function toggleSidebarCollapse() {
    const isCollapsed = sidebarEl ? sidebarEl.classList.contains('collapsed') : false;
    setSidebarCollapse(!isCollapsed);
}

function setSidebarCollapse(collapse) {
    if (!sidebarEl) return;
    
    if (collapse) {
        sidebarEl.classList.add('collapsed');
        if (btnSidebarFloatingOpen) btnSidebarFloatingOpen.style.display = 'inline-flex';
        localStorage.setItem('sidebar_collapsed', 'true');
    } else {
        sidebarEl.classList.remove('collapsed');
        if (btnSidebarFloatingOpen) btnSidebarFloatingOpen.style.display = 'none';
        localStorage.setItem('sidebar_collapsed', 'false');
    }
    
    // Forçar recálculo de layout para a tablatura aproveitar 100% da largura da tela
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 150);
}

// ==========================================================================
// 14. FASE 5: MOTOR DE PLAY-ALONG INTERATIVO POR MICROFONE
// ==========================================================================

function setupPlayAlongMode() {
    // 1. Botão Iniciar / Pausar Play-Along
    if (btnPlayAlongToggle) {
        btnPlayAlongToggle.addEventListener('click', togglePlayAlong);
    }

    // 2. Botão Reiniciar
    if (btnPlayAlongRestart) {
        btnPlayAlongRestart.addEventListener('click', restartPlayAlong);
    }

    // 3. Seletores de Sub-Modos (Passo a Passo vs No Ritmo)
    if (btnPaModeStep) {
        btnPaModeStep.addEventListener('click', () => setPlayAlongModeSub('step'));
    }
    if (btnPaModeFlow) {
        btnPaModeFlow.addEventListener('click', () => setPlayAlongModeSub('flow'));
    }

    // 4. Seletor de Tolerância de Afinação
    if (playalongToleranceSelect) {
        playalongToleranceSelect.addEventListener('change', (e) => {
            playAlongToleranceCents = parseInt(e.target.value) || 35;
        });
    }

    // 5. Botões do Modal de Resultado
    if (btnClosePaResult) {
        btnClosePaResult.addEventListener('click', hidePlayAlongResultModal);
    }
    if (btnPaResultContinue) {
        btnPaResultContinue.addEventListener('click', hidePlayAlongResultModal);
    }
    if (btnPaResultReplay) {
        btnPaResultReplay.addEventListener('click', () => {
            hidePlayAlongResultModal();
            restartPlayAlong();
            startPlayAlong();
        });
    }
}

function setPlayAlongModeSub(mode) {
    if (isPlayAlongRunning) {
        stopPlayAlong();
    }
    playAlongMode = mode;
    if (btnPaModeStep && btnPaModeFlow) {
        if (mode === 'step') {
            btnPaModeStep.classList.add('active');
            btnPaModeFlow.classList.remove('active');
            if (playalongModeHint) {
                playalongModeHint.textContent = 'A partitura espera você tocar cada nota com a flauta antes de avançar.';
            }
        } else {
            btnPaModeFlow.classList.add('active');
            btnPaModeStep.classList.remove('active');
            if (playalongModeHint) {
                playalongModeHint.textContent = 'A música corre no andamento (BPM) e você deve acertar as notas no ritmo.';
            }
        }
    }
    initPlayAlongSession();
}

function getPlayableNoteIndices() {
    if (!currentSong || !Array.isArray(currentSong.notes)) return [];
    const nonPlayable = ['BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END', 'LINEBREAK', 'REST', '|', '||', '|:', ':|'];
    const indices = [];
    currentSong.notes.forEach((item, idx) => {
        if (item && item.type !== 'bar' && item.note && !nonPlayable.includes(item.note)) {
            indices.push(idx);
        }
    });
    return indices;
}

function initPlayAlongSession() {
    clearPlayAlongVisuals();
    playAlongHits = 0;
    playAlongAttempts = 0;
    playAlongCombo = 0;
    playAlongMaxCombo = 0;
    playAlongNoteConfirmedCount = 0;
    playAlongFlowNoteWasHit = false;

    const playable = getPlayableNoteIndices();
    playAlongTotalNotes = playable.length;
    playAlongCurrentIndex = 0;

    updatePlayAlongStatsUI();
    updatePlayAlongTargetUI();

    if (playalongStatusIndicator) {
        playalongStatusIndicator.textContent = playAlongTotalNotes > 0
            ? `Pronto para tocar (${playAlongTotalNotes} notas). Clique em Iniciar.`
            : 'Nenhuma nota encontrada na música atual.';
    }
}

function clearPlayAlongVisuals() {
    const allNoteEls = document.querySelectorAll('.note-card, .note-item');
    allNoteEls.forEach(el => {
        el.classList.remove('playalong-target', 'playalong-hit', 'playalong-near', 'playalong-miss');
    });
}

function updatePlayAlongStatsUI() {
    if (paStatProgress) {
        paStatProgress.textContent = `${playAlongHits} / ${playAlongTotalNotes}`;
    }
    if (paStatAccuracy) {
        const acc = playAlongAttempts > 0 ? Math.round((playAlongHits / playAlongAttempts) * 100) : 100;
        paStatAccuracy.textContent = `${acc}%`;
    }
    if (paStatCombo) {
        paStatCombo.textContent = `${playAlongCombo}x 🔥`;
    }
    if (paProgressBar) {
        const pct = playAlongTotalNotes > 0 ? Math.min(100, Math.round((playAlongCurrentIndex / playAlongTotalNotes) * 100)) : 0;
        paProgressBar.style.width = `${pct}%`;
    }
}

function getWhistleNoteTarget(noteIndex) {
    const playable = getPlayableNoteIndices();
    if (noteIndex < 0 || noteIndex >= playable.length) return null;
    const realIndex = playable[noteIndex];
    const songNote = currentSong.notes[realIndex];
    if (!songNote) return null;

    const currentKey = whistleKeyEl ? whistleKeyEl.value : 'D';
    const keyData = WHISTLE_KEYS_DATA[currentKey];
    const noteKey = songNote.note;
    const noteInfo = keyData?.notes[noteKey];

    // Mapeamento do nome base da nota e oitava
    const displayStr = noteInfo ? noteInfo.display : noteKey;
    const cleanNote = displayStr.replace(/[0-9]/g, '');
    
    // Mapeamento de frequência e MIDI esperado
    const isSecondOctave = /[a-g]/.test(noteKey) || (displayStr.includes('5') || displayStr.includes('6'));
    
    return {
        realIndex: realIndex,
        rawNote: noteKey,
        display: displayStr,
        cleanNote: cleanNote.toUpperCase(),
        isSecondOctave: isSecondOctave,
        fingering: noteInfo ? noteInfo.fingering : null
    };
}

function updatePlayAlongTargetUI() {
    const target = getWhistleNoteTarget(playAlongCurrentIndex);
    
    // Atualizar classe na tablatura
    const allNoteEls = document.querySelectorAll('.note-card, .note-item');
    allNoteEls.forEach(el => el.classList.remove('playalong-target'));

    if (!target) {
        if (paTargetNote) paTargetNote.textContent = 'FIM';
        if (paTargetFingerings) paTargetFingerings.innerHTML = '';
        return;
    }

    // Destacar nota alvo atual na tablatura usando data-index
    const targetEl = tabSheetEl ? tabSheetEl.querySelector(`.note-card[data-index="${target.realIndex}"]`) : null;
    if (targetEl) {
        targetEl.classList.add('playalong-target');
        // Rolar suavemente para a nota alvo mantendo-a visível
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    if (paTargetNote) {
        paTargetNote.textContent = target.display;
    }

    // Mini visualização dos furos da flauta da nota alvo
    if (paTargetFingerings && target.fingering) {
        paTargetFingerings.innerHTML = createMiniFingeringSVG(target.fingering);
    }
}

function createMiniFingeringSVG(fingering) {
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

function togglePlayAlong() {
    if (isPlayAlongRunning) {
        stopPlayAlong();
    } else {
        startPlayAlong();
    }
}

function restartPlayAlong() {
    if (isPlayAlongRunning) {
        stopPlayAlong();
    }
    initPlayAlongSession();
}

function startPlayAlong() {
    if (!currentSong || currentSong.notes.length === 0) {
        alert('Carregue ou crie uma música primeiro para tocar no Play-Along.');
        return;
    }

    const playable = getPlayableNoteIndices();
    if (playable.length === 0) {
        alert('A música atual não contém notas válidas para tocar.');
        return;
    }

    if (playAlongCurrentIndex >= playable.length) {
        initPlayAlongSession();
    }

    startPlayAlongMic().then((ok) => {
        if (!ok) return;

        updatePlayAlongTargetUI();

        if (btnPlayAlongToggle) {
            btnPlayAlongToggle.classList.add('running');
            const playIcon = btnPlayAlongToggle.querySelector('.icon-pa-play');
            const pauseIcon = btnPlayAlongToggle.querySelector('.icon-pa-pause');
            if (playIcon) playIcon.style.display = 'none';
            if (pauseIcon) pauseIcon.style.display = 'inline-block';
            if (playalongToggleLabel) playalongToggleLabel.textContent = 'Pausar Play-Along';
        }

        if (playalongStatusIndicator) {
            playalongStatusIndicator.textContent = playAlongMode === 'step'
                ? 'Escutando sua flauta... Toque a nota destacada!'
                : 'Música em andamento! Acompanhe as notas no ritmo.';
        }

        if (playAlongMode === 'flow') {
            startPlayAlongFlowLoop();
        }
    });
}

function stopPlayAlong() {
    isPlayAlongRunning = false;
    if (playAlongFlowTimer) {
        clearTimeout(playAlongFlowTimer);
        playAlongFlowTimer = null;
    }

    stopPlayAlongMic();

    if (btnPlayAlongToggle) {
        btnPlayAlongToggle.classList.remove('running');
        const playIcon = btnPlayAlongToggle.querySelector('.icon-pa-play');
        const pauseIcon = btnPlayAlongToggle.querySelector('.icon-pa-pause');
        if (playIcon) playIcon.style.display = 'inline-block';
        if (pauseIcon) pauseIcon.style.display = 'none';
        if (playalongToggleLabel) playalongToggleLabel.textContent = 'Iniciar Play-Along';
    }

    if (playalongStatusIndicator) {
        playalongStatusIndicator.textContent = 'Play-Along pausado.';
    }
}

async function startPlayAlongMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Seu navegador não suporta captura de microfone.');
        return false;
    }

    try {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtxClass) {
            alert('Seu navegador não suporta Web Audio API.');
            return false;
        }

        playAlongAudioContext = new AudioCtxClass();
        if (playAlongAudioContext.state === 'suspended') {
            await playAlongAudioContext.resume();
        }

        try {
            playAlongMicStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: true
                },
                video: false
            });
        } catch (constrErr) {
            console.warn('Fallback getUserMedia simples:', constrErr);
            playAlongMicStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        }

        const source = playAlongAudioContext.createMediaStreamSource(playAlongMicStream);

        playAlongAnalyser = playAlongAudioContext.createAnalyser();
        playAlongAnalyser.fftSize = 2048;

        // Nó de ganho mudo conectado ao destination para manter o grafo rodando ativamente sem eco/feedback
        const silenceGain = playAlongAudioContext.createGain();
        silenceGain.gain.setValueAtTime(0, playAlongAudioContext.currentTime);

        // Conectar fonte diretamente ao analisador (mesma arquitetura validada em test-mic.html)
        source.connect(playAlongAnalyser);
        playAlongAnalyser.connect(silenceGain);
        silenceGain.connect(playAlongAudioContext.destination);

        if (playalongMicBadge) {
            playalongMicBadge.textContent = 'Microfone ouvindo';
            playalongMicBadge.classList.add('active');
        }

        // CRÍTICO: Definir isPlayAlongRunning = true ANTES de iniciar o loop de animação!
        isPlayAlongRunning = true;
        updatePlayAlongAudioLoop();
        return true;
    } catch (err) {
        console.error('Erro ao acessar microfone no Play-Along:', err);
        alert('Não foi possível acessar o microfone. Verifique as permissões de áudio no seu navegador.');
        return false;
    }
}

function stopPlayAlongMic() {
    if (playAlongRafId) {
        cancelAnimationFrame(playAlongRafId);
        playAlongRafId = null;
    }
    if (playAlongMicStream) {
        playAlongMicStream.getTracks().forEach(track => track.stop());
        playAlongMicStream = null;
    }
    if (playAlongAudioContext) {
        playAlongAudioContext.close().catch(() => {});
        playAlongAudioContext = null;
    }

    if (playalongMicBadge) {
        playalongMicBadge.textContent = 'Microfone desligado';
        playalongMicBadge.classList.remove('active');
    }
    if (playalongVuFill) {
        playalongVuFill.style.width = '0%';
    }
    if (paHeardNote) {
        paHeardNote.textContent = '--';
        paHeardNote.classList.remove('in-tune');
    }
    if (paHeardCents) {
        paHeardCents.textContent = '0.0 Hz (0¢)';
    }
    if (paGaugeNeedle) {
        paGaugeNeedle.style.left = '50%';
    }
    if (paPitchVerdict) {
        paPitchVerdict.textContent = 'Aguardando som...';
        paPitchVerdict.classList.remove('hit');
    }
}

// Algoritmo de Autocorrelação Rápido Otimizado para Tin Whistle
function detectWhistlePitch(buf, sampleRate) {
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
        rms += buf[i] * buf[i];
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.008) return { pitch: -1, rms: rms };

    // Delimitar estritamente para a extensão real da Tin Whistle (260 Hz a 2200 Hz)
    const minLag = Math.max(1, Math.floor(sampleRate / 2200));
    const maxLag = Math.min(SIZE - 2, Math.ceil(sampleRate / 260));

    let bestLag = -1;
    let bestCorrelation = -1;

    for (let lag = minLag; lag <= maxLag; lag++) {
        let corr = 0;
        for (let i = 0; i < SIZE - lag; i += 2) { // Passo de 2 para otimização 2x de CPU
            corr += buf[i] * buf[i + lag];
        }
        if (corr > bestCorrelation) {
            bestCorrelation = corr;
            bestLag = lag;
        }
    }

    if (bestLag <= 0 || bestCorrelation < 0.02) {
        return { pitch: -1, rms: rms };
    }

    // Interpolação parabólica no pico para precisão sub-amostral
    let trueLag = bestLag;
    if (bestLag > minLag && bestLag < maxLag) {
        let cLeft = 0, cRight = 0;
        for (let i = 0; i < SIZE - (bestLag - 1); i += 2) cLeft += buf[i] * buf[i + (bestLag - 1)];
        for (let i = 0; i < SIZE - (bestLag + 1); i += 2) cRight += buf[i] * buf[i + (bestLag + 1)];
        
        const denom = (2 * bestCorrelation - cLeft - cRight);
        if (Math.abs(denom) > 0.0001) {
            const delta = (cRight - cLeft) / (2 * denom);
            if (Math.abs(delta) < 1) {
                trueLag += delta;
            }
        }
    }

    const frequency = sampleRate / trueLag;
    return { pitch: frequency, rms: rms };
}

function updatePlayAlongAudioLoop() {
    if (!isPlayAlongRunning || !playAlongAnalyser || !playAlongAudioContext) return;

    if (playAlongAudioContext.state === 'suspended') {
        playAlongAudioContext.resume().catch(() => {});
    }

    const buf = new Float32Array(playAlongAnalyser.fftSize);
    playAlongAnalyser.getFloatTimeDomainData(buf);
    const sampleRate = playAlongAudioContext.sampleRate;

    const result = detectWhistlePitch(buf, sampleRate);
    const rms = result.rms;
    const pitch = result.pitch;

    // Atualização do VU Meter com resposta sensível ao sopro
    if (playalongVuFill) {
        const vuWidth = Math.min(100, Math.round(rms * 500));
        playalongVuFill.style.width = `${vuWidth}%`;
    }

    if (pitch > 0 && pitch >= 250 && pitch <= 2400) {
        const noteNumber = noteFromPitchVal(pitch);
        const noteName = NOTE_STRINGS[noteNumber % 12];
        const octave = Math.floor(noteNumber / 12) - 1;
        const noteFullName = `${noteName}${octave}`;
        const cents = centsOffFromPitchVal(pitch, noteNumber);

        if (paHeardNote) {
            paHeardNote.textContent = noteFullName;
            if (Math.abs(cents) <= playAlongToleranceCents) {
                paHeardNote.classList.add('in-tune');
            } else {
                paHeardNote.classList.remove('in-tune');
            }
        }

        if (paHeardCents) {
            paHeardCents.textContent = `${pitch.toFixed(1)} Hz (${cents > 0 ? '+' : ''}${cents}¢)`;
        }

        if (paGaugeNeedle) {
            const clampedCents = Math.max(-50, Math.min(50, cents));
            const percent = 50 + clampedCents;
            paGaugeNeedle.style.left = `${percent}%`;
        }

        // Comparação com a Nota Alvo
        checkPlayAlongNoteMatch(noteName, octave, cents);
    } else {
        if (paPitchVerdict && !paPitchVerdict.classList.contains('hit')) {
            paPitchVerdict.textContent = 'Aguardando som...';
        }
        playAlongNoteConfirmedCount = 0;
    }

    playAlongRafId = requestAnimationFrame(updatePlayAlongAudioLoop);
}

function checkPlayAlongNoteMatch(detectedName, detectedOctave, cents) {
    const target = getWhistleNoteTarget(playAlongCurrentIndex);
    if (!target) return;

    // Normalizar nomes das notas (ex: F# vs Gb, sustenidos e bemóis)
    const targetClean = target.cleanNote;
    const isNameMatch = (detectedName.toUpperCase() === targetClean) ||
                        (targetClean === 'F#' && detectedName === 'Gb') ||
                        (targetClean === 'C#' && detectedName === 'Db') ||
                        (targetClean === 'G#' && detectedName === 'Ab');

    const isCentTolerated = Math.abs(cents) <= playAlongToleranceCents;

    if (isNameMatch && isCentTolerated) {
        if (paPitchVerdict) {
            paPitchVerdict.textContent = '✓ Afinado!';
            paPitchVerdict.classList.add('hit');
        }

        playAlongNoteConfirmedCount++;

        // Confirmação temporal rápida (~50-70ms estável na nota)
        if (playAlongNoteConfirmedCount >= 2) {
            playAlongNoteConfirmedCount = 0;

            if (playAlongMode === 'step') {
                handlePlayAlongStepHit();
            } else {
                playAlongFlowNoteWasHit = true;
            }
        }
    } else {
        if (paPitchVerdict) {
            paPitchVerdict.classList.remove('hit');
            if (isNameMatch) {
                paPitchVerdict.textContent = cents > 0 ? 'Levemente alto' : 'Levemente baixo';
            } else {
                paPitchVerdict.textContent = `Ouvido: ${detectedName} | Esperado: ${target.cleanNote}`;
            }
        }
    }
}

function playHitFeedbackSound() {
    if (!playAlongAudioContext) return;
    try {
        const now = playAlongAudioContext.currentTime;
        const osc = playAlongAudioContext.createOscillator();
        const gain = playAlongAudioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, now); // C6
        osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.05); // E6
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(playAlongAudioContext.destination);
        osc.start(now);
        osc.stop(now + 0.065);
    } catch (e) {}
}

function handlePlayAlongStepHit() {
    const playable = getPlayableNoteIndices();
    const realIndex = playable[playAlongCurrentIndex];
    const noteEl = tabSheetEl ? tabSheetEl.querySelector(`.note-card[data-index="${realIndex}"]`) : null;

    if (noteEl) {
        noteEl.classList.remove('playalong-target');
        noteEl.classList.add('playalong-hit');
    }

    playHitFeedbackSound();
    playAlongHits++;
    playAlongAttempts++;
    playAlongCombo++;
    if (playAlongCombo > playAlongMaxCombo) {
        playAlongMaxCombo = playAlongCombo;
    }

    playAlongCurrentIndex++;
    updatePlayAlongStatsUI();

    if (playAlongCurrentIndex >= playable.length) {
        // Conclusão com sucesso de toda a música!
        finishPlayAlongSession();
    } else {
        updatePlayAlongTargetUI();
    }
}

// Modo No Ritmo (Avaliação Sincronizada com o Andamento / BPM)
function startPlayAlongFlowLoop() {
    const playable = getPlayableNoteIndices();
    if (playAlongCurrentIndex >= playable.length) return;

    const bpm = parseInt(songTempoEl.value) || 110;
    const speedMultiplier = parseFloat(playSpeedSelect.value) || 1.0;
    const baseInterval = (60 / (bpm * speedMultiplier)) * 1000;

    const realIndex = playable[playAlongCurrentIndex];
    const songNote = currentSong.notes[realIndex];
    const durRatio = parseFloat(songNote.duration) || 1.0;
    const noteDurationMs = baseInterval * durRatio;

    playAlongFlowNoteWasHit = false;
    updatePlayAlongTargetUI();

    // Tocar áudio guia se habilitado
    if (togglePaBackingAudio && togglePaBackingAudio.checked) {
        try {
            initAudio();
            const freq = getTransposedFrequency(songNote.note, whistleKeyEl ? whistleKeyEl.value : 'D');
            if (freq > 0) {
                playWhistleSynth(freq, (noteDurationMs / 1000) * 0.9, audioCtx.currentTime, songNote.ornament);
            }
        } catch (e) {}
    }

    playAlongFlowTimer = setTimeout(() => {
        if (!isPlayAlongRunning || playAlongMode !== 'flow') return;

        const noteEl = tabSheetEl ? tabSheetEl.querySelector(`.note-card[data-index="${realIndex}"]`) : null;

        playAlongAttempts++;
        if (playAlongFlowNoteWasHit) {
            playAlongHits++;
            playAlongCombo++;
            if (playAlongCombo > playAlongMaxCombo) playAlongMaxCombo = playAlongCombo;
            if (noteEl) {
                noteEl.classList.remove('playalong-target');
                noteEl.classList.add('playalong-hit');
            }
        } else {
            playAlongCombo = 0;
            if (noteEl) {
                noteEl.classList.remove('playalong-target');
                noteEl.classList.add('playalong-miss');
            }
        }

        playAlongCurrentIndex++;
        updatePlayAlongStatsUI();

        if (playAlongCurrentIndex >= playable.length) {
            finishPlayAlongSession();
        } else {
            startPlayAlongFlowLoop();
        }
    }, noteDurationMs);
}

function finishPlayAlongSession() {
    stopPlayAlong();

    const total = playAlongTotalNotes || 1;
    const accuracy = Math.round((playAlongHits / total) * 100);

    let starCount = 1;
    let title = 'Bom Ensaio Celta!';
    let subtitle = 'Continue praticando para aprimorar sua afinação e precisão.';

    if (accuracy >= 90) {
        starCount = 3;
        title = 'Performance Céltica Excepcional!';
        subtitle = 'Precisão primorosa de afinação e ritmo digna de um mestre de Tin Whistle!';
    } else if (accuracy >= 70) {
        starCount = 2;
        title = 'Ótima Interpretação!';
        subtitle = 'Você tocou a grande maioria das notas com muita afinação e segurança.';
    }

    if (paResultStars) {
        let starsHtml = '';
        for (let i = 1; i <= 3; i++) {
            starsHtml += `<span class="star-item ${i <= starCount ? 'gold' : ''}">★</span>`;
        }
        paResultStars.innerHTML = starsHtml;
    }

    if (paResultTitle) paResultTitle.textContent = title;
    if (paResultSubtitle) paResultSubtitle.textContent = subtitle;
    if (paResultAccuracy) paResultAccuracy.textContent = `${accuracy}%`;
    if (paResultHits) paResultHits.textContent = `${playAlongHits} / ${total}`;
    if (paResultMaxCombo) paResultMaxCombo.textContent = `${playAlongMaxCombo}x 🔥`;

    showPlayAlongResultModal();
}

function showPlayAlongResultModal() {
    if (playalongResultModal) {
        playalongResultModal.style.display = 'flex';
    }
}

function hidePlayAlongResultModal() {
    if (playalongResultModal) {
        playalongResultModal.style.display = 'none';
    }
}

// ==========================================================================
// 15. FASE 4: VISUALIZAÇÃO, TEMAS & EXPORTAÇÃO (PNG, SVG, WAV, MIDI)
// ==========================================================================

// Elementos de UI da Fase 4
const quickThemeSelect = document.getElementById('quick-theme-select');
const btnOpenViewOptions = document.getElementById('btn-open-view-options');
const btnOpenExportCenter = document.getElementById('btn-open-export-center');

const viewOptionsModal = document.getElementById('view-options-modal');
const btnCloseViewOptions = document.getElementById('btn-close-view-options');
const btnCloseViewOptionsDone = document.getElementById('btn-close-view-options-done');

const chkOptPitch = document.getElementById('chk-opt-pitch');
const chkOptChords = document.getElementById('chk-opt-chords');
const chkOptLyrics = document.getElementById('chk-opt-lyrics');
const chkOptDurations = document.getElementById('chk-opt-durations');
const chkOptOrnaments = document.getElementById('chk-opt-ornaments');
const chkOptFingeringOnly = document.getElementById('chk-opt-fingering-only');

const btnSpacingCompact = document.getElementById('btn-spacing-compact');
const btnSpacingNormal = document.getElementById('btn-spacing-normal');
const btnSpacingWide = document.getElementById('btn-spacing-wide');

const exportCenterModal = document.getElementById('export-center-modal');
const btnCloseExportCenter = document.getElementById('btn-close-export-center');
const btnCloseExportCenterOk = document.getElementById('btn-close-export-center-ok');

const btnExportPng = document.getElementById('btn-export-png');
const btnExportSvg = document.getElementById('btn-export-svg');
const btnExportWav = document.getElementById('btn-export-wav');
const btnExportMidi = document.getElementById('btn-export-midi');
const btnExportCenterAbc = document.getElementById('btn-export-center-abc');
const btnExportCenterJson = document.getElementById('btn-export-center-json');
const btnExportCenterPrint = document.getElementById('btn-export-center-print');

// Estado das Preferências de Exibição
let currentAppTheme = 'celtic';
let displayPrefs = {
    pitch: true,
    chords: true,
    lyrics: true,
    durations: true,
    ornaments: true,
    fingeringOnly: false,
    spacing: 'normal' // 'compact' | 'normal' | 'wide'
};

function setupPhase4VisualsAndExport() {
    loadThemePreference();
    loadDisplayPreferences();
    setupThemeListeners();
    setupViewOptionsListeners();
    setupExportCenterListeners();
}

// --------------------------------------------------------------------------
// GERENCIAMENTO DE TEMAS VISUAIS
// --------------------------------------------------------------------------
function loadThemePreference() {
    const savedTheme = localStorage.getItem('celtic_whistle_theme') || 'celtic';
    setTheme(savedTheme, false);
}

function setTheme(themeId, persist = true) {
    currentAppTheme = themeId;
    document.documentElement.setAttribute('data-theme', themeId);
    
    if (persist) {
        localStorage.setItem('celtic_whistle_theme', themeId);
    }

    if (quickThemeSelect) {
        quickThemeSelect.value = themeId;
    }

    document.querySelectorAll('.theme-card-option').forEach(card => {
        if (card.dataset.themeId === themeId) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

function setupThemeListeners() {
    if (quickThemeSelect) {
        quickThemeSelect.addEventListener('change', (e) => {
            setTheme(e.target.value);
        });
    }

    document.querySelectorAll('.theme-card-option').forEach(card => {
        card.addEventListener('click', () => {
            const themeId = card.dataset.themeId;
            if (themeId) {
                setTheme(themeId);
            }
        });
    });
}

// --------------------------------------------------------------------------
// GERENCIAMENTO DE OPÇÕES DE VISUALIZAÇÃO & LAYOUT
// --------------------------------------------------------------------------
function loadDisplayPreferences() {
    const saved = localStorage.getItem('celtic_whistle_display_prefs');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            displayPrefs = Object.assign(displayPrefs, parsed);
        } catch (e) {
            console.warn('Erro ao carregar displayPrefs:', e);
        }
    }
    syncDisplayCheckboxesUI();
    applyDisplayPreferences();
}

function saveDisplayPreferences() {
    localStorage.setItem('celtic_whistle_display_prefs', JSON.stringify(displayPrefs));
}

function syncDisplayCheckboxesUI() {
    if (chkOptPitch) chkOptPitch.checked = !!displayPrefs.pitch;
    if (chkOptChords) chkOptChords.checked = !!displayPrefs.chords;
    if (chkOptLyrics) chkOptLyrics.checked = !!displayPrefs.lyrics;
    if (chkOptDurations) chkOptDurations.checked = !!displayPrefs.durations;
    if (chkOptOrnaments) chkOptOrnaments.checked = !!displayPrefs.ornaments;
    if (chkOptFingeringOnly) chkOptFingeringOnly.checked = !!displayPrefs.fingeringOnly;

    updateSpacingButtonsUI();
}

function updateSpacingButtonsUI() {
    const sp = displayPrefs.spacing || 'normal';
    if (btnSpacingCompact) btnSpacingCompact.classList.toggle('active', sp === 'compact');
    if (btnSpacingNormal) btnSpacingNormal.classList.toggle('active', sp === 'normal');
    if (btnSpacingWide) btnSpacingWide.classList.toggle('active', sp === 'wide');
}

function applyDisplayPreferences() {
    if (!tabSheetEl) return;

    tabSheetEl.classList.toggle('hide-pitch-names', !displayPrefs.pitch);
    tabSheetEl.classList.toggle('hide-chords', !displayPrefs.chords);
    tabSheetEl.classList.toggle('hide-lyrics', !displayPrefs.lyrics);
    tabSheetEl.classList.toggle('hide-durations', !displayPrefs.durations);
    tabSheetEl.classList.toggle('hide-ornaments', !displayPrefs.ornaments);
    tabSheetEl.classList.toggle('fingering-only', !!displayPrefs.fingeringOnly);

    tabSheetEl.classList.remove('spacing-compact', 'spacing-wide');
    if (displayPrefs.spacing === 'compact') {
        tabSheetEl.classList.add('spacing-compact');
    } else if (displayPrefs.spacing === 'wide') {
        tabSheetEl.classList.add('spacing-wide');
    }
}

function setupViewOptionsListeners() {
    const btnOpen = document.getElementById('btn-open-view-options');
    const modal = document.getElementById('view-options-modal');
    const btnClose = document.getElementById('btn-close-view-options');
    const btnDone = document.getElementById('btn-close-view-options-done');

    const openViewModal = () => {
        syncDisplayCheckboxesUI();
        const m = document.getElementById('view-options-modal');
        if (m) {
            m.style.display = 'flex';
            m.classList.add('open');
        }
    };

    const closeViewModal = () => {
        const m = document.getElementById('view-options-modal');
        if (m) {
            m.classList.remove('open');
            m.style.display = 'none';
        }
    };

    if (btnOpen) btnOpen.addEventListener('click', openViewModal);
    if (btnClose) btnClose.addEventListener('click', closeViewModal);
    if (btnDone) btnDone.addEventListener('click', closeViewModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeViewModal();
        });
    }

    const handlePrefChange = () => {
        displayPrefs.pitch = chkOptPitch ? chkOptPitch.checked : true;
        displayPrefs.chords = chkOptChords ? chkOptChords.checked : true;
        displayPrefs.lyrics = chkOptLyrics ? chkOptLyrics.checked : true;
        displayPrefs.durations = chkOptDurations ? chkOptDurations.checked : true;
        displayPrefs.ornaments = chkOptOrnaments ? chkOptOrnaments.checked : true;
        displayPrefs.fingeringOnly = chkOptFingeringOnly ? chkOptFingeringOnly.checked : false;

        saveDisplayPreferences();
        applyDisplayPreferences();
    };

    [chkOptPitch, chkOptChords, chkOptLyrics, chkOptDurations, chkOptOrnaments, chkOptFingeringOnly].forEach(chk => {
        if (chk) chk.addEventListener('change', handlePrefChange);
    });

    if (btnSpacingCompact) {
        btnSpacingCompact.addEventListener('click', () => {
            displayPrefs.spacing = 'compact';
            updateSpacingButtonsUI();
            saveDisplayPreferences();
            applyDisplayPreferences();
        });
    }
    if (btnSpacingNormal) {
        btnSpacingNormal.addEventListener('click', () => {
            displayPrefs.spacing = 'normal';
            updateSpacingButtonsUI();
            saveDisplayPreferences();
            applyDisplayPreferences();
        });
    }
    if (btnSpacingWide) {
        btnSpacingWide.addEventListener('click', () => {
            displayPrefs.spacing = 'wide';
            updateSpacingButtonsUI();
            saveDisplayPreferences();
            applyDisplayPreferences();
        });
    }
}

// --------------------------------------------------------------------------
// CENTRAL DE EXPORTAÇÃO (MODAL & DISPARADORES)
// --------------------------------------------------------------------------
function setupExportCenterListeners() {
    const btnOpen = document.getElementById('btn-open-export-center');
    const modal = document.getElementById('export-center-modal');
    const btnClose = document.getElementById('btn-close-export-center');
    const btnOk = document.getElementById('btn-close-export-center-ok');

    const openExportModal = () => {
        const m = document.getElementById('export-center-modal');
        if (m) {
            m.style.display = 'flex';
            m.classList.add('open');
        }
    };

    const closeExportModal = () => {
        const m = document.getElementById('export-center-modal');
        if (m) {
            m.classList.remove('open');
            m.style.display = 'none';
        }
    };

    if (btnOpen) btnOpen.addEventListener('click', openExportModal);
    if (btnClose) btnClose.addEventListener('click', closeExportModal);
    if (btnOk) btnOk.addEventListener('click', closeExportModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeExportModal();
        });
    }

    // Botões dos formatos de exportação
    if (btnExportPng) btnExportPng.addEventListener('click', () => downloadSongPNG());
    if (btnExportSvg) btnExportSvg.addEventListener('click', () => downloadSongSVG());
    if (btnExportWav) btnExportWav.addEventListener('click', () => downloadSongWAV());
    if (btnExportMidi) btnExportMidi.addEventListener('click', () => downloadSongMIDI());

    if (btnExportCenterAbc) {
        btnExportCenterAbc.addEventListener('click', () => {
            closeExportModal();
            openABCModal();
        });
    }

    if (btnExportCenterJson) {
        btnExportCenterJson.addEventListener('click', () => {
            exportCurrentSongJSON();
        });
    }

    if (btnExportCenterPrint) {
        btnExportCenterPrint.addEventListener('click', () => {
            window.print();
        });
    }
}

// --------------------------------------------------------------------------
// MOTOR DE EXPORTAÇÃO VETORIAL SVG (VETOR PURO & ALTA DEFINIÇÃO)
// --------------------------------------------------------------------------
function generateSongSVG(song) {
    if (!song) return '';

    const title = song.title || 'Melodia Celta';
    const artist = song.artist || 'Tradicional';
    const key = song.key || 'D';
    const tempo = song.tempo || 120;
    const timeSig = song.timeSignature || '4/4';

    // Organizar notas em linhas de até 8 itens (ou respeitando LINEBREAK)
    const lines = [];
    let currentLine = [];
    const maxItemsPerLine = 8;

    (song.notes || []).forEach(item => {
        if (item.note === 'LINEBREAK') {
            if (currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = [];
            }
        } else {
            currentLine.push(item);
            if (currentLine.length >= maxItemsPerLine && (item.note === 'BAR' || item.note === 'DOUBLE_BAR' || item.note === 'REPEAT_END')) {
                lines.push(currentLine);
                currentLine = [];
            }
        }
    });
    if (currentLine.length > 0) lines.push(currentLine);
    if (lines.length === 0) lines.push([]);

    const svgWidth = 840;
    const cardWidth = 72;
    const cardGap = 16;
    const rowHeight = 165;
    const headerHeight = 110;
    const footerHeight = 45;
    const totalHeight = headerHeight + (lines.length * rowHeight) + footerHeight;

    let svgBody = '';

    // Estilos embutidos no SVG para autonomia completa
    const svgStyles = `
        <style>
            .title { font-family: 'Cinzel', serif, Georgia; font-size: 26px; font-weight: bold; fill: #1c1815; text-anchor: middle; }
            .meta { font-family: 'Outfit', sans-serif, Arial; font-size: 13px; fill: #655444; text-anchor: middle; }
            .card-bg { fill: #fbf7ee; stroke: #d3c2a3; stroke-width: 1.2; rx: 8px; }
            .chord { font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: bold; fill: #166534; text-anchor: middle; }
            .ornament { font-family: 'Cinzel', serif; font-size: 14px; font-weight: bold; fill: #b45309; text-anchor: middle; }
            .pitch { font-family: 'Cinzel', serif; font-size: 14px; font-weight: bold; fill: #1f2937; text-anchor: middle; }
            .pitch-octave { font-family: 'Cinzel', serif; font-size: 14px; font-weight: bold; fill: #047857; text-anchor: middle; }
            .duration { font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 600; fill: #78350f; text-anchor: middle; }
            .lyric { font-family: 'Outfit', sans-serif; font-size: 11px; fill: #4b5563; text-anchor: middle; font-style: italic; }
            .whistle-line { stroke: #2a2421; stroke-width: 2.2; stroke-linecap: round; }
            .hole-closed { fill: #1c1815; stroke: #1c1815; stroke-width: 1.5; }
            .hole-open { fill: #ffffff; stroke: #1c1815; stroke-width: 1.5; }
            .bar-line { stroke: #3f3630; stroke-width: 2.2; }
            .bar-thick { stroke: #3f3630; stroke-width: 3.8; }
            .bar-dot { fill: #3f3630; }
            .footer-text { font-family: 'Outfit', sans-serif; font-size: 11px; fill: #9c8a78; text-anchor: middle; }
        </style>
    `;

    // Cabeçalho da partitura
    svgBody += `
        <rect width="100%" height="100%" fill="#fcfbf8" />
        <rect x="15" y="15" width="${svgWidth - 30}" height="${totalHeight - 30}" rx="12" fill="none" stroke="#e0d5be" stroke-width="1.5" />
        <text x="${svgWidth / 2}" y="52" class="title">${escapeHTML(title)}</text>
        <text x="${svgWidth / 2}" y="78" class="meta">${escapeHTML(artist)} • Flauta em ${key} • ${timeSig} • ${tempo} BPM</text>
    `;

    let startY = headerHeight;

    lines.forEach((line) => {
        const lineItemCount = line.length;
        const totalLineWidth = lineItemCount * cardWidth + (lineItemCount - 1) * cardGap;
        let startX = (svgWidth - totalLineWidth) / 2;
        if (startX < 35) startX = 35;

        line.forEach((item) => {
            const isRest = item.note === 'REST';
            const isBar = ['BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END'].includes(item.note);

            if (isBar) {
                // Desenhar barra de compasso
                const barX = startX + (cardWidth / 2);
                if (item.note === 'DOUBLE_BAR') {
                    svgBody += `
                        <line x1="${barX - 4}" y1="${startY + 25}" x2="${barX - 4}" y2="${startY + 135}" class="bar-line" />
                        <line x1="${barX + 4}" y1="${startY + 25}" x2="${barX + 4}" y2="${startY + 135}" class="bar-thick" />
                    `;
                } else if (item.note === 'REPEAT_START') {
                    svgBody += `
                        <line x1="${barX - 6}" y1="${startY + 25}" x2="${barX - 6}" y2="${startY + 135}" class="bar-thick" />
                        <line x1="${barX - 1}" y1="${startY + 25}" x2="${barX - 1}" y2="${startY + 135}" class="bar-line" />
                        <circle cx="${barX + 6}" cy="${startY + 65}" r="2.2" class="bar-dot" />
                        <circle cx="${barX + 6}" cy="${startY + 95}" r="2.2" class="bar-dot" />
                    `;
                } else if (item.note === 'REPEAT_END') {
                    svgBody += `
                        <circle cx="${barX - 6}" cy="${startY + 65}" r="2.2" class="bar-dot" />
                        <circle cx="${barX - 6}" cy="${startY + 95}" r="2.2" class="bar-dot" />
                        <line x1="${barX + 1}" y1="${startY + 25}" x2="${barX + 1}" y2="${startY + 135}" class="bar-line" />
                        <line x1="${barX + 6}" y1="${startY + 25}" x2="${barX + 6}" y2="${startY + 135}" class="bar-thick" />
                    `;
                } else {
                    svgBody += `
                        <line x1="${barX}" y1="${startY + 25}" x2="${barX}" y2="${startY + 135}" class="bar-line" />
                    `;
                }
            } else {
                // Desenhar cartão de nota ou pausa
                const cx = startX + (cardWidth / 2);
                svgBody += `<rect x="${startX}" y="${startY + 10}" width="${cardWidth}" height="142" class="card-bg" />`;

                // Acorde
                if (item.chord) {
                    svgBody += `<text x="${cx}" y="${startY + 26}" class="chord">${escapeHTML(item.chord)}</text>`;
                }

                // Ornamento
                if (item.ornament) {
                    const ornSymbol = getOrnamentSymbol(item.ornament);
                    svgBody += `<text x="${cx}" y="${startY + 38}" class="ornament">${ornSymbol}</text>`;
                }

                // Nome da nota
                if (!isRest) {
                    const displayName = getNoteDisplayName(item.note, key);
                    const isOct2 = isNoteOctave2(item.note, key);
                    const pClass = isOct2 ? 'pitch-octave' : 'pitch';
                    svgBody += `<text x="${cx}" y="${startY + 53}" class="${pClass}">${displayName}</text>`;
                } else {
                    svgBody += `<text x="${cx}" y="${startY + 53}" class="pitch">Pausa</text>`;
                }

                // Flauta (Linha e 6 furos)
                if (isRest) {
                    svgBody += `
                        <path d="M${cx},${startY + 68} L${cx},${startY + 98} M${cx - 5},${startY + 73} L${cx + 5},${startY + 73} M${cx - 3},${startY + 83} L${cx + 3},${startY + 83} M${cx - 5},${startY + 93} L${cx + 5},${startY + 93}" stroke="#6b7280" stroke-width="1.8" fill="none" />
                    `;
                } else {
                    const fingering = STANDARD_FINGERINGS[item.note] || [0, 0, 0, 0, 0, 0];
                    const fluteTopY = startY + 62;
                    const fluteBottomY = startY + 124;
                    svgBody += `<line x1="${cx}" y1="${fluteTopY}" x2="${cx}" y2="${fluteBottomY}" class="whistle-line" />`;

                    const holeSpacing = 9.8;
                    fingering.forEach((state, hIdx) => {
                        const hy = fluteTopY + 5 + (hIdx * holeSpacing);
                        const holeClass = state === 1 ? 'hole-closed' : 'hole-open';
                        svgBody += `<circle cx="${cx}" cy="${hy}" r="3.6" class="${holeClass}" />`;
                    });
                }

                // Duração
                const durStr = `${item.duration || 1}t`;
                svgBody += `<text x="${cx}" y="${startY + 137}" class="duration">${durStr}</text>`;

                // Sílaba da Letra
                if (item.lyric) {
                    svgBody += `<text x="${cx}" y="${startY + 148}" class="lyric">${escapeHTML(item.lyric)}</text>`;
                }
            }

            startX += cardWidth + cardGap;
        });

        startY += rowHeight;
    });

    // Rodapé de créditos
    svgBody += `
        <text x="${svgWidth / 2}" y="${totalHeight - 20}" class="footer-text">Celtic Whistle Tab Editor • https://xfox26.github.io/Whistle-Tab-Editor/</text>
    `;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${totalHeight}" width="${svgWidth}" height="${totalHeight}">
    ${svgStyles}
    ${svgBody}
</svg>`;
}

function downloadSongSVG() {
    if (!currentSong) return;
    const svgContent = generateSongSVG(currentSong);
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const sanitizedTitle = (currentSong.title || 'celtic_tune').toLowerCase().replace(/[^a-z0-9]/g, '_');

    const a = document.createElement('a');
    a.href = url;
    a.download = `tab_${sanitizedTitle}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --------------------------------------------------------------------------
// MOTOR DE EXPORTAÇÃO GRÁFICA PNG (300 DPI ALTA RESOLUÇÃO)
// --------------------------------------------------------------------------
function downloadSongPNG() {
    if (!currentSong) return;

    if (btnExportPng) {
        btnExportPng.disabled = true;
        btnExportPng.textContent = 'Gerando PNG em Alta Definição...';
    }

    try {
        const svgString = generateSongSVG(currentSong);
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
            try {
                const scale = 2.5; // Escala 2.5x para atingir qualidade nítida 300 DPI
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);

                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#fcfbf8';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0);

                canvas.toBlob((pngBlob) => {
                    URL.revokeObjectURL(url);
                    if (btnExportPng) {
                        btnExportPng.disabled = false;
                        btnExportPng.textContent = 'Baixar Imagem PNG (300 DPI)';
                    }

                    if (!pngBlob) {
                        alert('Não foi possível gerar o arquivo PNG.');
                        return;
                    }

                    const pngUrl = URL.createObjectURL(pngBlob);
                    const sanitizedTitle = (currentSong.title || 'celtic_tune').toLowerCase().replace(/[^a-z0-9]/g, '_');
                    const a = document.createElement('a');
                    a.href = pngUrl;
                    a.download = `tab_${sanitizedTitle}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(pngUrl);
                }, 'image/png');
            } catch (err) {
                console.error('Erro ao renderizar canvas:', err);
                URL.revokeObjectURL(url);
                if (btnExportPng) {
                    btnExportPng.disabled = false;
                    btnExportPng.textContent = 'Baixar Imagem PNG (300 DPI)';
                }
                alert('Erro ao converter imagem para PNG: ' + err.message);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            if (btnExportPng) {
                btnExportPng.disabled = false;
                btnExportPng.textContent = 'Baixar Imagem PNG (300 DPI)';
            }
            alert('Falha ao processar arquivo SVG para gerar imagem.');
        };

        img.src = url;
    } catch (e) {
        if (btnExportPng) {
            btnExportPng.disabled = false;
            btnExportPng.textContent = 'Baixar Imagem PNG (300 DPI)';
        }
        alert('Erro ao iniciar exportação PNG: ' + e.message);
    }
}

// --------------------------------------------------------------------------
// MOTOR DE EXPORTAÇÃO MIDI (STANDARD MIDI FILE .MID - TYPE 0)
// --------------------------------------------------------------------------
function writeVLQ(value) {
    const bytes = [];
    let buffer = value & 0x7F;
    while ((value >>= 7) > 0) {
        buffer <<= 8;
        buffer |= ((value & 0x7F) | 0x80);
    }
    while (true) {
        bytes.push(buffer & 0xFF);
        if (buffer & 0x80) {
            buffer >>= 8;
        } else {
            break;
        }
    }
    return bytes;
}

function generateMIDIData(song) {
    if (!song) return null;

    const PPQ = 480; // Ticks por semínima (padrão profissional)
    const bpm = parseInt(song.tempo) || 120;
    const usPerBeat = Math.round(60000000 / bpm);

    // Mapeamento de notas Tin Whistle D para notas MIDI reais
    const whistleMidiMap = {
        'D5': 74, 'E5': 76, 'F#5': 78, 'G5': 79, 'A5': 81, 'B5': 83, 'C#6': 85, 'C5': 84,
        'D6': 86, 'E6': 88, 'F#6': 90, 'G6': 91, 'A6': 93, 'B6': 95, 'C#7': 97, 'C6': 96
    };

    // Ajuste pela afinação da flauta
    const keyOffset = WHISTLE_KEYS_DATA[song.key]?.semitones || 0;

    const trackEvents = [];

    // 1. Meta Event: Set Tempo
    trackEvents.push(0x00); // delta 0
    trackEvents.push(0xFF, 0x51, 0x03);
    trackEvents.push((usPerBeat >> 16) & 0xFF, (usPerBeat >> 8) & 0xFF, usPerBeat & 0xFF);

    // 2. Meta Event: Time Signature
    let num = 4, den = 4;
    if (song.timeSignature === '3/4') { num = 3; den = 4; }
    else if (song.timeSignature === '6/8') { num = 6; den = 8; }
    else if (song.timeSignature === '2/4') { num = 2; den = 4; }
    else if (song.timeSignature === '9/8') { num = 9; den = 8; }
    const denPower = Math.round(Math.log2(den));

    trackEvents.push(0x00); // delta 0
    trackEvents.push(0xFF, 0x58, 0x04, num, denPower, 24, 8);

    // 3. Program Change (Instrumento Flauta: Canal 0, patch 73 = Flute)
    trackEvents.push(0x00); // delta 0
    trackEvents.push(0xC0, 73);

    // 4. Sequência de Notas da Melodia
    let pendingDeltaTicks = 0;

    (song.notes || []).forEach(noteObj => {
        if (!noteObj) return;

        // Ignorar quebras e barras de repetição no arquivo de áudio MIDI
        if (['LINEBREAK', 'BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END'].includes(noteObj.note)) {
            return;
        }

        const durRatio = parseFloat(noteObj.duration) || 1.0;
        const noteTicks = Math.max(1, Math.round(durRatio * PPQ));

        if (noteObj.note === 'REST') {
            // Pausa acumula delta time para a próxima nota
            pendingDeltaTicks += noteTicks;
            return;
        }

        const baseMidi = whistleMidiMap[noteObj.note];
        if (baseMidi === undefined) {
            pendingDeltaTicks += noteTicks;
            return;
        }

        const midiPitch = Math.max(0, Math.min(127, baseMidi + keyOffset));

        // Note On (Canal 0, velocidade 95)
        const vlqDeltaOn = writeVLQ(pendingDeltaTicks);
        trackEvents.push(...vlqDeltaOn);
        trackEvents.push(0x90, midiPitch, 95);
        pendingDeltaTicks = 0;

        // Note Off (Canal 0)
        const vlqDuration = writeVLQ(noteTicks);
        trackEvents.push(...vlqDuration);
        trackEvents.push(0x80, midiPitch, 0x00);
    });

    // 5. Meta Event: End of Track
    const endDelta = writeVLQ(pendingDeltaTicks);
    trackEvents.push(...endDelta);
    trackEvents.push(0xFF, 0x2F, 0x00);

    // Montar Header Chunk (MThd)
    const headerChunk = [
        0x4D, 0x54, 0x68, 0x64, // "MThd"
        0x00, 0x00, 0x00, 0x06, // tamanho 6
        0x00, 0x00,             // Formato 0 (Single Track)
        0x00, 0x01,             // 1 Trilha
        (PPQ >> 8) & 0xFF, PPQ & 0xFF // Divisão PPQ
    ];

    // Montar Track Chunk (MTrk)
    const trackLength = trackEvents.length;
    const trackHeader = [
        0x4D, 0x54, 0x72, 0x6B, // "MTrk"
        (trackLength >> 24) & 0xFF,
        (trackLength >> 16) & 0xFF,
        (trackLength >> 8) & 0xFF,
        trackLength & 0xFF
    ];

    const fullMidi = new Uint8Array(headerChunk.length + trackHeader.length + trackEvents.length);
    fullMidi.set(headerChunk, 0);
    fullMidi.set(trackHeader, headerChunk.length);
    fullMidi.set(trackEvents, headerChunk.length + trackHeader.length);

    return fullMidi;
}

function downloadSongMIDI() {
    if (!currentSong) return;

    try {
        const midiBytes = generateMIDIData(currentSong);
        if (!midiBytes) return;

        const blob = new Blob([midiBytes], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const sanitizedTitle = (currentSong.title || 'celtic_tune').toLowerCase().replace(/[^a-z0-9]/g, '_');

        const a = document.createElement('a');
        a.href = url;
        a.download = `tab_${sanitizedTitle}.mid`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        alert('Erro ao gerar arquivo MIDI: ' + e.message);
    }
}

// --------------------------------------------------------------------------
// MOTOR DE EXPORTAÇÃO DE ÁUDIO SINTETIZADO WAV (OFFLINE AUDIO CONTEXT)
// --------------------------------------------------------------------------
async function renderSongToWAV(song) {
    const sampleRate = 44100;
    const bpm = parseInt(song.tempo) || 120;
    const secondsPerBeat = 60 / bpm;

    // Calcular tempo total
    let totalDurationSeconds = 1.0; // Silêncio inicial e final
    (song.notes || []).forEach(n => {
        if (!['LINEBREAK', 'BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END'].includes(n.note)) {
            totalDurationSeconds += (parseFloat(n.duration) || 1.0) * secondsPerBeat;
        }
    });

    totalDurationSeconds = Math.max(2.0, totalDurationSeconds + 1.2); // Cauda de reverberação

    const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
        2,
        Math.ceil(sampleRate * totalDurationSeconds),
        sampleRate
    );

    let currentTime = 0.4; // 400ms de margem inicial
    const whistleKey = song.key || 'D';

    (song.notes || []).forEach(noteObj => {
        if (!noteObj || ['LINEBREAK', 'BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END'].includes(noteObj.note)) {
            return;
        }

        const dur = (parseFloat(noteObj.duration) || 1.0) * secondsPerBeat;

        if (noteObj.note !== 'REST') {
            const freq = getTransposedFrequency(noteObj.note, whistleKey);
            if (freq > 0) {
                scheduleWhistleToneOffline(offlineCtx, freq, dur * 0.94, currentTime, noteObj.ornament);
            }
        }
        currentTime += dur;
    });

    const renderedBuffer = await offlineCtx.startRendering();
    return audioBufferToWAVBlob(renderedBuffer);
}

function scheduleWhistleToneOffline(ctx, frequency, duration, startTime, ornament) {
    const oscTri = ctx.createOscillator();
    oscTri.type = 'triangle';

    const oscSine = ctx.createOscillator();
    oscSine.type = 'sine';

    // Ornamentações tradicionais
    if (ornament === 'cut' && duration > 0.1) {
        const cutFreq = frequency * 1.122;
        oscTri.frequency.setValueAtTime(cutFreq, startTime);
        oscTri.frequency.setValueAtTime(frequency, startTime + 0.035);
        oscSine.frequency.setValueAtTime(cutFreq, startTime);
        oscSine.frequency.setValueAtTime(frequency, startTime + 0.035);
    } else if (ornament === 'strike' && duration > 0.1) {
        const strikeFreq = frequency * 0.891;
        oscTri.frequency.setValueAtTime(strikeFreq, startTime);
        oscTri.frequency.setValueAtTime(frequency, startTime + 0.035);
        oscSine.frequency.setValueAtTime(strikeFreq, startTime);
        oscSine.frequency.setValueAtTime(frequency, startTime + 0.035);
    } else if (ornament === 'roll' && duration > 0.25) {
        const cutFreq = frequency * 1.122;
        const strikeFreq = frequency * 0.891;
        oscTri.frequency.setValueAtTime(frequency, startTime);
        oscTri.frequency.setValueAtTime(cutFreq, startTime + 0.035);
        oscTri.frequency.setValueAtTime(frequency, startTime + 0.07);
        oscTri.frequency.setValueAtTime(strikeFreq, startTime + 0.105);
        oscTri.frequency.setValueAtTime(frequency, startTime + 0.14);

        oscSine.frequency.setValueAtTime(frequency, startTime);
        oscSine.frequency.setValueAtTime(cutFreq, startTime + 0.035);
        oscSine.frequency.setValueAtTime(frequency, startTime + 0.07);
        oscSine.frequency.setValueAtTime(strikeFreq, startTime + 0.105);
        oscSine.frequency.setValueAtTime(frequency, startTime + 0.14);
    } else {
        oscTri.frequency.setValueAtTime(frequency, startTime);
        oscSine.frequency.setValueAtTime(frequency, startTime);
    }

    // Vibrato LFO
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(5.8, startTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(frequency * 0.007, startTime);
    lfo.connect(lfoGain);
    lfoGain.connect(oscTri.frequency);
    lfoGain.connect(oscSine.frequency);

    // Envelope ADSR
    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0, startTime);
    mainGain.gain.linearRampToValueAtTime(0.25, startTime + 0.04);
    mainGain.gain.linearRampToValueAtTime(0.18, startTime + 0.1);
    mainGain.gain.setValueAtTime(0.18, Math.max(startTime + 0.1, startTime + duration - 0.04));
    mainGain.gain.linearRampToValueAtTime(0, startTime + duration);

    oscTri.connect(mainGain);
    oscSine.connect(mainGain);
    mainGain.connect(ctx.destination);

    oscTri.start(startTime);
    oscSine.start(startTime);
    lfo.start(startTime);

    oscTri.stop(startTime + duration);
    oscSine.stop(startTime + duration);
    lfo.stop(startTime + duration);
}

function audioBufferToWAVBlob(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    let result;
    if (numChannels === 2) {
        result = interleaveChannels(buffer.getChannelData(0), buffer.getChannelData(1));
    } else {
        result = buffer.getChannelData(0);
    }

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = result.length * bytesPerSample;
    const bufferSize = 44 + dataSize;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // RIFF identifier
    writeStringToDataView(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStringToDataView(view, 8, 'WAVE');

    // fmt sub-chunk
    writeStringToDataView(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // data sub-chunk
    writeStringToDataView(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Escrever amostras PCM 16-bit
    let offset = 44;
    for (let i = 0; i < result.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, result[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
}

function interleaveChannels(ch1, ch2) {
    const length = ch1.length + ch2.length;
    const result = new Float32Array(length);
    let idx = 0;
    for (let i = 0; i < ch1.length; i++) {
        result[idx++] = ch1[i];
        result[idx++] = ch2[i];
    }
    return result;
}

function writeStringToDataView(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

async function downloadSongWAV() {
    if (!currentSong) return;

    if (btnExportWav) {
        btnExportWav.disabled = true;
        btnExportWav.textContent = 'Renderizando Áudio Celta...';
    }

    try {
        const wavBlob = await renderSongToWAV(currentSong);
        const url = URL.createObjectURL(wavBlob);
        const sanitizedTitle = (currentSong.title || 'celtic_tune').toLowerCase().replace(/[^a-z0-9]/g, '_');

        const a = document.createElement('a');
        a.href = url;
        a.download = `tab_${sanitizedTitle}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('Erro na exportação WAV:', e);
        alert('Falha ao renderizar áudio: ' + e.message);
    } finally {
        if (btnExportWav) {
            btnExportWav.disabled = false;
            btnExportWav.textContent = 'Baixar Áudio WAV (.wav)';
        }
    }
}
