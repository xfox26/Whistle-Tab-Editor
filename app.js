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
const songTempoEl = document.getElementById('song-tempo');
const tabSheetEl = document.getElementById('tab-sheet');
const emptyMessageEl = document.getElementById('empty-message');
const textNotesInputEl = document.getElementById('text-notes-input');
const textNotesErrorEl = document.getElementById('text-notes-error');


const btnPlay = document.getElementById('btn-play');
const btnStop = document.getElementById('btn-stop');
const playSpeedSelect = document.getElementById('play-speed-select');
const toggleMetronome = document.getElementById('toggle-metronome');
const btnClearTab = document.getElementById('btn-clear-tab');

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

// 3. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    loadSongs();
    setupEventListeners();
    setupKeyboardTabs();
    setupEditorModeTabs();
    setupNoteInputEvents();
    setupTransposeModal();
    const initialKey = currentSong ? (currentSong.key || 'D') : (whistleKeyEl ? whistleKeyEl.value : 'D');
    renderKeyboard(initialKey);
    updateTextInputHelp(initialKey);
});

// Carrega as músicas do localStorage ou inicializa com as músicas padrão
function loadSongs() {
    const saved = localStorage.getItem('celtic_whistle_tabs');
    if (saved) {
        try {
            songs = JSON.parse(saved);
        } catch (e) {
            console.error("Erro ao ler localStorage", e);
            songs = [...DEFAULT_SONGS];
        }
    } else {
        songs = [...DEFAULT_SONGS];
        saveSongsToStorage();
    }
    
    renderSidebar();
    
    if (songs.length > 0) {
        selectSong(songs[0].id);
    } else {
        createNewSong();
    }
}

function saveSongsToStorage() {
    localStorage.setItem('celtic_whistle_tabs', JSON.stringify(songs));
}

// 4. OPERAÇÕES DE MÚSICA (CRUD)
function createNewSong() {
    const id = 'song-' + Date.now();
    const newSong = {
        id: id,
        title: 'Nova Melodia',
        artist: 'Compositor',
        key: 'D',
        tempo: 110,
        notes: []
    };
    songs.unshift(newSong);
    saveSongsToStorage();
    renderSidebar();
    selectSong(id);
    songTitleEl.focus();
    songTitleEl.select();
}

function selectSong(id) {
    playbackStartIndex = 0;
    stopPlayback();
    const song = songs.find(s => s.id === id);
    if (!song) return;
    
    currentSong = song;
    lastTransposedState = null;
    if (btnUndoTranspose) btnUndoTranspose.disabled = true;
    
    // Atualizar UI com os metadados da música
    songTitleEl.value = song.title;
    songArtistEl.value = song.artist || 'Tradicional';
    whistleKeyEl.value = song.key || 'D';
    songTempoEl.value = song.tempo || 110;
    
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
    
    if (confirm(`Deseja mesmo excluir a música "${song.title}"?`)) {
        stopPlayback();
        songs = songs.filter(s => s.id !== id);
        saveSongsToStorage();
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
    currentSong.tempo = parseInt(songTempoEl.value) || 120;
    
    // Atualizar na lista
    const idx = songs.findIndex(s => s.id === currentSong.id);
    if (idx !== -1) {
        songs[idx] = currentSong;
        saveSongsToStorage();
        
        // Atualiza apenas o texto na barra lateral para evitar re-render total do DOM durante a digitação
        const sidebarTitle = document.querySelector(`.song-item[data-id="${currentSong.id}"] .song-item-title`);
        if (sidebarTitle) sidebarTitle.textContent = currentSong.title;
        const sidebarMeta = document.querySelector(`.song-item[data-id="${currentSong.id}"] .song-item-meta`);
        if (sidebarMeta) sidebarMeta.textContent = `${currentSong.key} • ${currentSong.tempo} BPM`;
    }
}

// 5. RENDERIZAÇÃO
function renderSidebar() {
    songListEl.innerHTML = '';
    const query = searchInput.value.toLowerCase();
    
    const filteredSongs = songs.filter(s => 
        s.title.toLowerCase().includes(query) || 
        (s.artist && s.artist.toLowerCase().includes(query))
    );
    
    filteredSongs.forEach(song => {
        const li = document.createElement('li');
        li.className = 'song-item';
        if (currentSong && song.id === currentSong.id) {
            li.classList.add('active');
        }
        li.dataset.id = song.id;
        li.onclick = () => selectSong(song.id);
        
        li.innerHTML = `
            <div class="song-item-info">
                <span class="song-item-title">${escapeHTML(song.title)}</span>
                <span class="song-item-meta">${song.key} • ${song.tempo} BPM</span>
            </div>
            <div class="song-item-actions">
                <button class="btn-icon delete" title="Excluir">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        `;
        
        const btnDel = li.querySelector('.btn-icon.delete');
        btnDel.onclick = (e) => deleteSong(song.id, e);
        
        songListEl.appendChild(li);
    });
}

function renderTab() {
    // Remove notas anteriores e quebras de linha, mantendo apenas a mensagem de folha vazia se necessário
    const cards = tabSheetEl.querySelectorAll('.note-card, .line-break');
    cards.forEach(c => c.remove());
    
    if (!currentSong || currentSong.notes.length === 0) {
        emptyMessageEl.style.display = 'flex';
        return;
    }
    
    emptyMessageEl.style.display = 'none';

    if (playbackStartIndex >= currentSong.notes.length) {
        playbackStartIndex = 0;
    }
    
    // Obter o gradiente SVG que define o preenchimento de meio-furo.
    // Injetamos um SVG global para definições (defs) apenas uma vez se não existir
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
    
    currentSong.notes.forEach((noteObj, index) => {
        const isLineBreak = noteObj.note === 'LINEBREAK';
        if (isLineBreak) {
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

        const isRest = noteObj.note === 'REST';
        const isPlaybackStart = (index === playbackStartIndex);
        const card = document.createElement('div');
        card.className = `note-card${isRest ? ' rest-card' : ''}${isPlaybackStart ? ' playback-start' : ''}`;
        card.dataset.index = index;
        card.title = 'Clique para iniciar a reprodução a partir daqui (duplo clique para ouvir)';
        
        const currentKey = currentSong ? (currentSong.key || 'D') : (whistleKeyEl ? whistleKeyEl.value : 'D');
        const displayName = getNoteDisplayName(noteObj.note, currentKey);
        const isOctave2 = isNoteOctave2(noteObj.note, currentKey);
        const pitchClass = `note-card-pitch ${isRest ? 'rest' : ''} ${isOctave2 ? 'octave2' : ''}`;
        
        // Pega a digitação personalizada ou a padrão
        const fingering = noteObj.fingering || STANDARD_FINGERINGS[noteObj.note] || [0, 0, 0, 0, 0, 0];
        
        // Gerar SVG da digitação
        let svgContent = '';
        if (isRest) {
            // Desenha um símbolo de pausa estilizado simples
            svgContent = `
                <svg class="whistle-svg" viewBox="0 0 22 100">
                    <!-- Símbolo de pausa simplificado -->
                    <path d="M11,35 L11,65 M6,40 L16,40 M8,50 L14,50 M6,60 L16,60" stroke="var(--parchment-text)" stroke-width="2" fill="none" />
                </svg>
            `;
        } else {
            // Desenha o corpo da flauta e os 6 furos
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
            '0.5': 'Colcheia (0.5 tempo)',
            '1': 'Semínima (1 tempo)',
            '2': 'Mínima (2 tempos)',
            '4': 'Semibreve (4 tempos)'
        };
        const durTitle = durLabels[String(noteObj.duration)] || '1 tempo';

        card.innerHTML = `
            <button class="note-card-delete" title="Remover">&times;</button>
            <div class="${pitchClass}">${isRest ? 'Pausa' : displayName}</div>
            ${svgContent}
            <div class="note-card-duration-symbol" title="Duração: ${durTitle} - Clique para alterar" data-index="${index}">${getDurationSymbol(noteObj.duration)}</div>
            <input type="text" class="note-card-lyric" value="${escapeHTML(noteObj.lyric || '')}" placeholder="..." title="Sílaba da letra">
            <div class="note-card-duration-bar" data-duration="${noteObj.duration}"></div>
        `;
        
        // Evento de clique para definir o ponto de início da melodia
        card.addEventListener('click', (e) => {
            // Se o clique foi no botão de deletar, símbolo de duração ou input de letra, não interfere
            if (e.target.closest('.note-card-delete') || 
                e.target.closest('.note-card-duration-symbol') || 
                e.target.closest('.note-card-lyric')) {
                return;
            }
            
            setPlaybackStartIndex(index);
            
            // Se não estiver tocando e o clique não foi no furo do SVG (que já toca), reproduz o som da nota
            if (!isPlaying && !e.target.closest('circle')) {
                playSingleNoteSound(noteObj);
            }
        });

        // Evento de clique para ouvir a nota individualmente (duplo clique)
        card.addEventListener('dblclick', () => {
            playSingleNoteSound(noteObj);
        });

        // Evento para deletar a nota
        card.querySelector('.note-card-delete').onclick = (e) => {
            e.stopPropagation();
            removeNote(index);
        };

        // Evento de clique no símbolo de duração para alternar valores
        const durSymbol = card.querySelector('.note-card-duration-symbol');
        if (durSymbol) {
            durSymbol.addEventListener('click', (e) => {
                e.stopPropagation();
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
                const nextDur = nextDurations[currentDur] || 1.0;
                
                noteObj.duration = nextDur;
                saveSongsToStorage();
                renderTab();
                playSingleNoteSound(noteObj);
            });
        }

        // Evento para editar a letra (sílaba)
        const lyricInput = card.querySelector('.note-card-lyric');
        lyricInput.addEventListener('input', (e) => {
            currentSong.notes[index].lyric = e.target.value;
            saveSongsToStorage();
        });
        
        // Impedir que o espaço no input da letra pare/inicie a música
        lyricInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });

        // Evento para mudar a digitação de furos interativamente
        if (!isRest) {
            const svgEl = card.querySelector('.whistle-svg');
            svgEl.addEventListener('click', (e) => {
                const circle = e.target.closest('circle');
                if (!circle) return;
                
                const holeIdx = parseInt(circle.dataset.holeIndex);
                
                // Copia fingering padrão se não for customizado ainda
                if (!noteObj.fingering) {
                    noteObj.fingering = [...(STANDARD_FINGERINGS[noteObj.note] || [0,0,0,0,0,0])];
                }
                
                // Rotaciona estados do furo: 0 (aberto) -> 1 (fechado) -> 0.5 (meio) -> 0
                const curState = noteObj.fingering[holeIdx];
                let nextState = 0;
                if (curState === 0) nextState = 1;
                else if (curState === 1) nextState = 0.5;
                
                noteObj.fingering[holeIdx] = nextState;
                
                // Se a digitação ficou idêntica à padrão de outra nota, ou se queremos resetar
                // atualizamos visualmente e salvamos
                saveSongsToStorage();
                
                // Atualiza a classe do círculo diretamente para melhorar o desempenho e evitar redesenho total
                const fillClass = nextState === 1 ? 'closed' : nextState === 0.5 ? 'half' : 'open';
                circle.setAttribute('class', fillClass);
                
                // Reproduz o som correspondente à nota ao modificar sua digitação
                playSingleNoteSound(noteObj);
            });
        }
        
        tabSheetEl.appendChild(card);
    });
    
    updateTextNotesInput();
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
    currentSong.notes.splice(index, 1);
    if (playbackStartIndex > index) {
        playbackStartIndex--;
    } else if (playbackStartIndex >= currentSong.notes.length) {
        playbackStartIndex = Math.max(0, currentSong.notes.length - 1);
    }
    saveSongsToStorage();
    renderTab();
    updateTextNotesInput();
}

function appendNote(noteName, duration) {
    if (!currentSong) return;
    
    currentSong.notes.push({
        note: noteName,
        duration: duration,
        lyric: ''
    });
    
    saveSongsToStorage();
    renderTab();
    
    // Rola a área da tablatura para o final para mostrar a nota inserida
    setTimeout(() => {
        tabSheetEl.scrollTop = tabSheetEl.scrollHeight;
    }, 50);
    
    // Tocar a nota inserida rapidamente para feedback acústico
    playSingleNoteSound({ note: noteName, duration: 0.25 });
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
    try {
        initAudio();
        const freq = getTransposedFrequency(noteObj.note, whistleKeyEl.value);
        if (freq > 0) {
            playWhistleSynth(freq, 0.4, audioCtx.currentTime);
        }
    } catch (e) {
        console.error("Falha ao tocar áudio: ", e);
    }
}

// O sintetizador que cria a assinatura sonora da Tin Whistle celta
function playWhistleSynth(frequency, duration, startTime) {
    // 1. Oscilador Principal (Onda Triangular - som amadeirado, doce)
    const oscTri = audioCtx.createOscillator();
    oscTri.type = 'triangle';
    oscTri.frequency.setValueAtTime(frequency, startTime);
    
    // 2. Oscilador Secundário (Onda Senoidal - adiciona peso e pureza na fundamental)
    const oscSine = audioCtx.createOscillator();
    oscSine.type = 'sine';
    oscSine.frequency.setValueAtTime(frequency, startTime);
    
    // 3. Modulador de Frequência (Vibrato) - LFO sutil a 6Hz
    const lfo = audioCtx.createOscillator();
    lfo.frequency.setValueAtTime(5.8, startTime); // Frequência do vibrato
    
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.setValueAtTime(frequency * 0.007, startTime); // Profundidade do vibrato (0.7% da freq)
    
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
    noiseFilter.Q.setValueAtTime(20, startTime); // Filtro bem estreito
    noiseFilter.frequency.setValueAtTime(frequency, startTime);
    
    const noiseGain = audioCtx.createGain();
    // O ruído de sopro é mais alto no início (chiff) e depois diminui
    noiseGain.gain.setValueAtTime(0.025, startTime); // Chiff inicial
    noiseGain.gain.exponentialRampToValueAtTime(0.006, startTime + 0.08); // Sopro contínuo
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    
    // 5. Envelopes de Ganho (ADSR do Whistle)
    const mainGain = audioCtx.createGain();
    mainGain.gain.setValueAtTime(0, startTime);
    // Ataque suave, imitando o sopro inicial da flauta
    mainGain.gain.linearRampToValueAtTime(0.2, startTime + 0.04); 
    // Decay para o sustain
    mainGain.gain.linearRampToValueAtTime(0.16, startTime + 0.12);
    // Sustentação
    mainGain.gain.setValueAtTime(0.16, startTime + duration - 0.04);
    // Release rápido para evitar cliques
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
    // Clique agudo no tempo
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
        startPlayback();
    }
}

function startPlayback() {
    if (!currentSong || currentSong.notes.length === 0) return;
    
    initAudio();
    isPlaying = true;
    
    // Atualizar UI
    btnPlay.querySelector('.icon-play').style.display = 'none';
    btnPlay.querySelector('.icon-pause').style.display = 'block';
    
    if (currentPlayIndex === -1 || currentPlayIndex >= currentSong.notes.length) {
        currentPlayIndex = (playbackStartIndex >= 0 && playbackStartIndex < currentSong.notes.length) ? playbackStartIndex : 0;
    }
    
    playNextStep();
}

function pausePlayback() {
    isPlaying = false;
    if (playbackTimeout) clearTimeout(playbackTimeout);
    
    // Atualizar UI
    btnPlay.querySelector('.icon-play').style.display = 'block';
    btnPlay.querySelector('.icon-pause').style.display = 'none';
}

function stopPlayback() {
    isPlaying = false;
    if (playbackTimeout) clearTimeout(playbackTimeout);
    currentPlayIndex = (playbackStartIndex >= 0 && currentSong && playbackStartIndex < currentSong.notes.length) ? playbackStartIndex : 0;
    
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
    if (currentPlayIndex >= notesCount) {
        stopPlayback();
        return;
    }
    
    const noteObj = currentSong.notes[currentPlayIndex];
    if (noteObj.note === 'LINEBREAK') {
        currentPlayIndex++;
        playNextStep();
        return;
    }
    const bpm = parseInt(songTempoEl.value) || 120;
    const speedMultiplier = parseFloat(playSpeedSelect.value) || 1.0;
    
    // Duração do tempo em segundos = 60 / BPM
    // Duração real da nota = duração_relativa * tempo_segundos / multiplicador
    const beatDuration = 60 / bpm;
    const realDuration = (noteObj.duration * beatDuration) / speedMultiplier;
    
    // Destacar nota visualmente
    document.querySelectorAll('.note-card').forEach((card) => {
        if (parseInt(card.dataset.index) === currentPlayIndex) {
            card.classList.add('playing');
            // Scroll suave se a nota sair da janela visível da folha
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        } else {
            card.classList.remove('playing');
        }
    });
    
    // Tocar Áudio
    const now = audioCtx.currentTime;
    const freq = getTransposedFrequency(noteObj.note, whistleKeyEl.value);
    
    if (freq > 0) {
        playWhistleSynth(freq, realDuration * 0.95, now); // 95% da duração para dar separação das notas (articular)
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

    // Atalhos do Teclado Global
    document.addEventListener('keydown', (e) => {
        // Ignorar se o usuário estiver digitando em um input/textarea ou selecionando algo
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        if (e.code === 'Space') {
            e.preventDefault(); // Impede scroll indesejado do espaço
            togglePlay();
        } else if (e.code === 'Escape') {
            stopPlayback();
        }
    });
}

// 10. IMPORTAÇÃO E EXPORTAÇÃO JSON
function exportCurrentSongJSON() {
    if (!currentSong) return;
    
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
    
    // Lista de tokens da flauta selecionada ordenados por tamanho decrescente
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
    
    while (i < text.length) {
        const char = text[i];
        
        // Se for espaço ou quebra de linha, analisa o bloco de whitespace contíguo
        if (/\s/.test(char)) {
            let hasNewline = (char === '\n' || char === '\r');
            while (i + 1 < text.length && /\s/.test(text[i + 1])) {
                i++;
                if (text[i] === '\n' || text[i] === '\r') {
                    hasNewline = true;
                }
            }
            if (hasNewline) {
                parsedNotes.push('LINEBREAK');
            } else {
                parsedNotes.push('REST');
            }
            i++;
            continue;
        }
        
        // Verificar palavras reservadas explícitas para Pausa (REST)
        const remaining = text.substring(i);
        const restMatch = remaining.match(/^(REST|PAUSA|SILENCIO|SILÊNCIO)/i);
        if (restMatch) {
            parsedNotes.push('REST');
            i += restMatch[0].length;
            continue;
        }
        
        // 1. Tentar casar com os tokens específicos da afinação da flauta atual
        let matched = false;
        for (const t of tokens) {
            if (text.startsWith(t.token, i)) {
                let noteKey = t.noteId;
                i += t.token.length;
                
                // Se houver '+' na sequência, promove para a 2ª oitava se for da 1ª
                if (i < text.length && text[i] === '+') {
                    if (oct1ToOct2[noteKey]) {
                        noteKey = oct1ToOct2[noteKey];
                    }
                    i++;
                }
                
                parsedNotes.push(noteKey);
                matched = true;
                break;
            }
        }
        if (matched) continue;
        
        // 2. Fallback: Se for uma nota básica na notação tradicional em Ré (A a G)
        if (/[a-gA-G]/.test(char)) {
            let noteLetter = char;
            let isSharp = false;
            let isSecondOctave = (char === char.toUpperCase()); // Letra maiúscula = 2ª oitava
            
            i++; // Avança a letra
            
            // Verifica sustenido '#'
            if (i < text.length && text[i] === '#') {
                isSharp = true;
                i++;
            }
            
            // Verifica oitava aguda '+'
            if (i < text.length && text[i] === '+') {
                isSecondOctave = true;
                i++;
            }
            
            const letterUpper = noteLetter.toUpperCase();
            let noteKey = '';
            
            if (isSecondOctave) {
                // 2ª Oitava
                if (letterUpper === 'D') noteKey = 'D6';
                else if (letterUpper === 'E') noteKey = 'E6';
                else if (letterUpper === 'F') noteKey = 'F#6';
                else if (letterUpper === 'G') noteKey = 'G6';
                else if (letterUpper === 'A') noteKey = 'A6';
                else if (letterUpper === 'B') noteKey = 'B6';
                else if (letterUpper === 'C') {
                    noteKey = isSharp ? 'C#7' : 'C6';
                }
                
                if (letterUpper === 'F' && isSharp) noteKey = 'F#6';
            } else {
                // 1ª Oitava
                if (letterUpper === 'D') noteKey = 'D5';
                else if (letterUpper === 'E') noteKey = 'E5';
                else if (letterUpper === 'F') noteKey = 'F#5';
                else if (letterUpper === 'G') noteKey = 'G5';
                else if (letterUpper === 'A') noteKey = 'A5';
                else if (letterUpper === 'B') noteKey = 'B5';
                else if (letterUpper === 'C') {
                    noteKey = isSharp ? 'C#6' : 'C5';
                }
                
                if (letterUpper === 'F' && isSharp) noteKey = 'F#5';
            }
            
            if (noteKey && STANDARD_FINGERINGS[noteKey]) {
                parsedNotes.push(noteKey);
            } else {
                return { error: `Combinação de nota inválida: "${char}${isSharp ? '#' : ''}${isSecondOctave ? '+' : ''}"` };
            }
        } else {
            // Qualquer outro caractere é inválido
            return { error: `Caractere inválido: "${char}"` };
        }
    }
    
    return { notes: parsedNotes };
}

function noteKeyToNotation(noteKey, whistleKey) {
    if (noteKey === 'LINEBREAK') return '\n';
    if (noteKey === 'REST') return ' ';
    const key = whistleKey || (whistleKeyEl ? whistleKeyEl.value : (currentSong ? currentSong.key : 'D')) || 'D';
    const notation = getNoteNotationText(noteKey, key);
    if (notation) return notation;
    
    const fallbackMap = {
        'D5': 'd', 'E5': 'e', 'F#5': 'f#', 'G5': 'g', 'A5': 'a', 'B5': 'b', 'C5': 'c', 'C#6': 'c#',
        'D6': 'D', 'E6': 'E', 'F#6': 'F#', 'G6': 'G', 'A6': 'A', 'B6': 'B', 'C6': 'C', 'C#7': 'C#'
    };
    return fallbackMap[noteKey] || '';
}

function getDurationSymbol(duration) {
    const dur = parseFloat(duration) || 1.0;
    if (dur === 0.5) {
        // Colcheia (0.5 tempo)
        return `<svg class="duration-svg" viewBox="0 0 16 18" width="11" height="15"><ellipse cx="4.5" cy="13.5" rx="3.5" ry="2.5" transform="rotate(-25 4.5 13.5)" fill="currentColor"/><line x1="7.2" y1="13" x2="7.2" y2="2" stroke="currentColor" stroke-width="1.6"/><path d="M7.2 2 C10 4, 13 6, 11.5 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
    }
    if (dur === 2) {
        // Mínima (2 tempos)
        return `<svg class="duration-svg" viewBox="0 0 14 18" width="10" height="15"><ellipse cx="4.5" cy="13.5" rx="3.5" ry="2.5" transform="rotate(-25 4.5 13.5)" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="7.2" y1="13" x2="7.2" y2="2" stroke="currentColor" stroke-width="1.6"/></svg>`;
    }
    if (dur === 4) {
        // Semibreve (4 tempos)
        return `<svg class="duration-svg" viewBox="0 0 16 18" width="12" height="15"><ellipse cx="8" cy="9.5" rx="5.5" ry="3.5" transform="rotate(-15 8 9.5)" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
    }
    // Semínima (1 tempo - padrão)
    return `<svg class="duration-svg" viewBox="0 0 14 18" width="10" height="15"><ellipse cx="4.5" cy="13.5" rx="3.5" ry="2.5" transform="rotate(-25 4.5 13.5)" fill="currentColor"/><line x1="7.2" y1="13" x2="7.2" y2="2" stroke="currentColor" stroke-width="1.6"/></svg>`;
}

function updateTextNotesInput() {
    if (!textNotesInputEl || !currentSong) return;
    
    // Apenas atualiza se o usuário não estiver focando a caixa de texto
    if (document.activeElement === textNotesInputEl) return;
    
    const whistleKey = whistleKeyEl ? whistleKeyEl.value : (currentSong.key || 'D');
    const textValue = currentSong.notes.map(n => noteKeyToNotation(n.note, whistleKey)).join('');
    textNotesInputEl.value = textValue;
    
    // Limpar estado de erro visual
    textNotesInputEl.classList.remove('invalid');
    textNotesErrorEl.style.display = 'none';
    textNotesErrorEl.textContent = '';
}

function handleTextNotesInput() {
    if (!currentSong) return;
    
    const text = textNotesInputEl.value;
    const parseResult = parseStringOfNotes(text);
    
    if (parseResult.error) {
        // Marcar erro na UI
        textNotesInputEl.classList.add('invalid');
        textNotesErrorEl.style.display = 'block';
        textNotesErrorEl.textContent = parseResult.error;
        return;
    }
    
    // Sem erros! Limpa mensagem e estilos de erro
    textNotesInputEl.classList.remove('invalid');
    textNotesErrorEl.style.display = 'none';
    textNotesErrorEl.textContent = '';
    
    const parsedNotes = parseResult.notes;
    
    // Atualiza o currentSong.notes de forma inteligente preservando lyrics e duration
    const oldNotes = currentSong.notes;
    const newNotes = parsedNotes.map((noteName, idx) => {
        const oldNote = oldNotes[idx];
        if (oldNote && oldNote.note === noteName) {
            // Preserva o objeto se a nota for idêntica
            return oldNote;
        } else {
            // Cria um novo objeto para a nota alterada/adicionada
            return {
                note: noteName,
                duration: 1.0,
                lyric: ''
            };
        }
    });
    
    currentSong.notes = newNotes;
    saveSongsToStorage();
    renderTab();
    updateTextNotesInput();
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


