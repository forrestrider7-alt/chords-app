// Chord shape database
// frets: [E6, A5, D4, G3, B2, e1] — null=muted, 0=open, n=fret n
// barre: fret number of full index-finger barre, null if none

// ── Barre shape generators ─────────────────────────────────────────
// E-shape: root on low E string at fret n
const E = (n, q) => {
  const s = {
    '':    { frets: [n, n+2, n+2, n+1, n, n],    barre: n },
    'm':   { frets: [n, n+2, n+2, n, n, n],       barre: n },
    '7':   { frets: [n, n+2, n, n+1, n, n],       barre: n },
    'm7':  { frets: [n, n+2, n, n, n, n],         barre: n },
    'maj7':{ frets: [n, n+2, n+1, n+1, n, n],     barre: n },
    'sus2':{ frets: [n, n+2, n+4, n+4, n, n],     barre: n },
    'sus4':{ frets: [n, n+2, n+2, n+2, n, n],     barre: n },
    'aug': { frets: [n, n+3, n+2, n+1, n+1, null],barre: null },
  }[q];
  return s;
};

// A-shape: root on A string at fret n
const A = (n, q) => {
  const s = {
    '':    { frets: [null, n, n+2, n+2, n+2, n],    barre: n || null },
    'm':   { frets: [null, n, n+2, n+2, n+1, n],    barre: n || null },
    '7':   { frets: [null, n, n+2, n, n+2, n],      barre: n || null },
    'm7':  { frets: [null, n, n+2, n, n+1, n],      barre: n || null },
    'maj7':{ frets: [null, n, n+2, n+1, n+2, n],    barre: n || null },
    'sus2':{ frets: [null, n, n+2, n+2, n, n],      barre: n || null },
    'sus4':{ frets: [null, n, n+2, n+2, n+3, n],    barre: n || null },
    'dim': { frets: [null, n, n+1, n+2, n+1, null], barre: null },
    'aug': { frets: [null, n, n+3, n+2, n+2, n+1],  barre: n || null },
    '6':   { frets: [null, n, n+2, n+2, n+2, n+2],  barre: n || null },
    'm6':  { frets: [null, n, n+2, n+2, n+1, n+2],  barre: n || null },
    '9':   { frets: [null, n, n+2, n, n+2, n+2],    barre: n || null },
  }[q];
  return s;
};

// ── Open/standard chord overrides ─────────────────────────────────
const OPEN = {
  // C family
  'C':     { frets: [null,3,2,0,1,0], barre: null },
  'Cm':    A(3,'m'),
  'C7':    { frets: [null,3,2,3,1,0], barre: null },
  'Cm7':   A(3,'m7'),
  'Cmaj7': { frets: [null,3,2,0,0,0], barre: null },
  'Csus2': A(3,'sus2'),
  'Csus4': { frets: [null,3,3,0,1,1], barre: null },
  'Cdim':  A(3,'dim'),
  'Caug':  { frets: [null,3,2,1,1,0], barre: null },
  'C6':    { frets: [null,3,2,2,1,0], barre: null },
  'Cm6':   { frets: [null,3,5,5,4,5], barre: null },
  'C9':    A(3,'9'),

  // D family
  'D':     { frets: [null,null,0,2,3,2], barre: null },
  'Dm':    { frets: [null,null,0,2,3,1], barre: null },
  'D7':    { frets: [null,null,0,2,1,2], barre: null },
  'Dm7':   { frets: [null,null,0,2,1,1], barre: null },
  'Dmaj7': { frets: [null,null,0,2,2,2], barre: null },
  'Dsus2': { frets: [null,null,0,2,3,0], barre: null },
  'Dsus4': { frets: [null,null,0,2,3,3], barre: null },
  'Ddim':  { frets: [null,null,0,1,3,1], barre: null },
  'Daug':  { frets: [null,null,0,3,3,2], barre: null },
  'D6':    { frets: [null,null,0,2,0,2], barre: null },
  'Dm6':   { frets: [null,null,0,2,0,1], barre: null },
  'D9':    { frets: [null,null,0,2,1,0], barre: null },

  // E family
  'E':     { frets: [0,2,2,1,0,0], barre: null },
  'Em':    { frets: [0,2,2,0,0,0], barre: null },
  'E7':    { frets: [0,2,0,1,0,0], barre: null },
  'Em7':   { frets: [0,2,0,0,0,0], barre: null },
  'Emaj7': { frets: [0,2,1,1,0,0], barre: null },
  'Esus2': { frets: [0,2,4,4,0,0], barre: null },
  'Esus4': { frets: [0,2,2,2,0,0], barre: null },
  'Edim':  { frets: [0,1,2,3,2,0], barre: null },
  'Eaug':  { frets: [0,3,2,1,1,0], barre: null },
  'E6':    { frets: [0,2,2,1,2,0], barre: null },
  'Em6':   { frets: [0,2,2,0,2,0], barre: null },
  'E9':    { frets: [0,2,0,1,3,0], barre: null },

  // F family (E-shape barre 1)
  'F':     E(1,''),
  'Fm':    E(1,'m'),
  'F7':    E(1,'7'),
  'Fm7':   E(1,'m7'),
  'Fmaj7': { frets: [null,null,3,2,1,0], barre: null },
  'Fsus2': E(1,'sus2'),
  'Fsus4': E(1,'sus4'),
  'Fdim':  { frets: [1,2,3,4,3,null], barre: null },
  'Faug':  { frets: [null,null,3,2,2,1], barre: null },
  'F6':    E(1,'6'),
  'Fm6':   { frets: [1,3,3,1,2,1], barre: 1 },
  'F9':    { frets: [1,3,1,2,1,3], barre: 1 },

  // G family
  'G':     { frets: [3,2,0,0,0,3], barre: null },
  'Gm':    E(3,'m'),
  'G7':    { frets: [3,2,0,0,0,1], barre: null },
  'Gm7':   E(3,'m7'),
  'Gmaj7': { frets: [3,2,0,0,0,2], barre: null },
  'Gsus2': { frets: [3,0,0,0,1,3], barre: null },
  'Gsus4': { frets: [3,3,0,0,1,3], barre: null },
  'Gdim':  { frets: [3,4,5,6,5,null], barre: null },
  'Gaug':  { frets: [3,2,1,0,0,3], barre: null },
  'G6':    { frets: [3,2,0,0,0,0], barre: null },
  'Gm6':   { frets: [3,5,5,3,4,3], barre: 3 },
  'G9':    { frets: [3,2,0,2,0,1], barre: null },

  // A family
  'A':     { frets: [null,0,2,2,2,0], barre: null },
  'Am':    { frets: [null,0,2,2,1,0], barre: null },
  'A7':    { frets: [null,0,2,0,2,0], barre: null },
  'Am7':   { frets: [null,0,2,0,1,0], barre: null },
  'Amaj7': { frets: [null,0,2,1,2,0], barre: null },
  'Asus2': { frets: [null,0,2,2,0,0], barre: null },
  'Asus4': { frets: [null,0,2,2,3,0], barre: null },
  'Adim':  { frets: [null,0,1,2,1,null], barre: null },
  'Aaug':  { frets: [null,0,3,2,2,1], barre: null },
  'A6':    { frets: [null,0,2,2,2,2], barre: null },
  'Am6':   { frets: [null,0,2,2,1,2], barre: null },
  'A9':    { frets: [null,0,2,4,2,3], barre: null },

  // Bb family (A-shape barre 1)
  'Bb':    A(1,''),
  'Bbm':   A(1,'m'),
  'Bb7':   A(1,'7'),
  'Bbm7':  A(1,'m7'),
  'Bbmaj7':A(1,'maj7'),
  'Bbsus2':A(1,'sus2'),
  'Bbsus4':A(1,'sus4'),
  'Bbdim': A(1,'dim'),
  'Bbaug': A(1,'aug'),
  'Bb6':   A(1,'6'),
  'Bbm6':  A(1,'m6'),
  'Bb9':   A(1,'9'),

  // B family (A-shape barre 2 or open B7)
  'B':     A(2,''),
  'Bm':    { frets: [null,2,4,4,3,2], barre: 2 },
  'B7':    { frets: [null,2,1,2,0,2], barre: null },
  'Bm7':   A(2,'m7'),
  'Bmaj7': A(2,'maj7'),
  'Bsus2': A(2,'sus2'),
  'Bsus4': A(2,'sus4'),
  'Bdim':  A(2,'dim'),
  'Baug':  A(2,'aug'),
  'B6':    A(2,'6'),
  'Bm6':   A(2,'m6'),
  'B9':    A(2,'9'),
};

// ── Enharmonic aliases ────────────────────────────────────────────
// Map flat names → sharp names used in OPEN
const FLAT_ALIAS = {
  'Db':'C#','Eb':'D#','Fb':'E','Gb':'F#','Ab':'G#','Cb':'B',
};

// Build A-shape entries for C# / D# / F# / G# / A#
function genSharpFamily(rootName, aFret, eFret) {
  const qualities = ['','m','7','m7','maj7','sus2','sus4','dim','aug','6','m6','9'];
  const result = {};
  for (const q of qualities) {
    const name = rootName + q;
    // Choose between A-shape or E-shape based on fret numbers
    // Prefer lower fret position
    const useE = eFret <= 6 && eFret < aFret;
    result[name] = useE ? E(eFret, q) : A(aFret, q);
    if (!result[name]) {
      // Fallback
      result[name] = A(aFret, q) || E(eFret, q);
    }
  }
  return result;
}

// C# / Db (A-shape fret 4, E-shape fret 9)
const CsharpFamily = genSharpFamily('C#', 4, 9);
const DbFamily = {};
for (const [k, v] of Object.entries(CsharpFamily)) {
  DbFamily[k.replace('C#', 'Db')] = v;
}

// D# / Eb (A-shape fret 6, E-shape fret 11)
const DsharpFamily = genSharpFamily('D#', 6, 11);
const EbFamily = {};
for (const [k, v] of Object.entries(DsharpFamily)) {
  EbFamily[k.replace('D#', 'Eb')] = v;
}

// F# / Gb (E-shape fret 2, A-shape fret 9)
const FsharpFamily = genSharpFamily('F#', 2, 9);
const GbFamily = {};
for (const [k, v] of Object.entries(FsharpFamily)) {
  GbFamily[k.replace('F#', 'Gb')] = v;
}

// G# / Ab (E-shape fret 4, A-shape fret 11)
const GsharpFamily = genSharpFamily('G#', 4, 11);
const AbFamily = {};
for (const [k, v] of Object.entries(GsharpFamily)) {
  AbFamily[k.replace('G#', 'Ab')] = v;
}

// A# (same as Bb)
const AsharpFamily = {};
for (const [k, v] of Object.entries(OPEN)) {
  if (k.startsWith('Bb')) AsharpFamily[k.replace('Bb', 'A#')] = v;
}

// ── Merged DB ─────────────────────────────────────────────────────
export const CHORD_DB = {
  ...OPEN,
  ...CsharpFamily,
  ...DbFamily,
  ...DsharpFamily,
  ...EbFamily,
  ...FsharpFamily,
  ...GbFamily,
  ...GsharpFamily,
  ...AbFamily,
  ...AsharpFamily,
};

// ── Lookup function ───────────────────────────────────────────────
export function getChordShape(name, customShapes = {}) {
  if (customShapes[name]) {
    const s = customShapes[name];
    // s is a 6-char string: x=muted, 0-9=fret
    const frets = s.split('').map(c => c === 'x' ? null : Number(c));
    return { frets, barre: null };
  }
  // Try flat alias
  const flatRoot = name.match(/^([A-G]b)/);
  if (flatRoot && FLAT_ALIAS[flatRoot[1]]) {
    const canonical = name.replace(flatRoot[1], FLAT_ALIAS[flatRoot[1]]);
    return CHORD_DB[canonical] || null;
  }
  return CHORD_DB[name] || null;
}

// ── Pitch class table for chord recognition ───────────────────────
// Open string pitches (pitch class, C=0…B=11)
export const OPEN_PITCHES = [4, 9, 2, 7, 11, 4]; // E A D G B e

// Interval sets for chord quality recognition
export const INTERVAL_SETS = [
  { name: '',      intervals: [0,4,7] },
  { name: 'm',     intervals: [0,3,7] },
  { name: '7',     intervals: [0,4,7,10] },
  { name: 'm7',    intervals: [0,3,7,10] },
  { name: 'maj7',  intervals: [0,4,7,11] },
  { name: 'dim',   intervals: [0,3,6] },
  { name: 'dim7',  intervals: [0,3,6,9] },
  { name: 'aug',   intervals: [0,4,8] },
  { name: 'sus2',  intervals: [0,2,7] },
  { name: 'sus4',  intervals: [0,5,7] },
  { name: '6',     intervals: [0,4,7,9] },
  { name: 'm6',    intervals: [0,3,7,9] },
  { name: 'add9',  intervals: [0,2,4,7] },
  { name: 'm7b5',  intervals: [0,3,6,10] },
  { name: '9',     intervals: [0,2,4,7,10] },
];

export const NOTE_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const NOTE_NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
