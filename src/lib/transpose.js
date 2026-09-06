// Chord transposition utilities

const SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const FLAT_TO_SHARP = {Db:'C#',Eb:'D#',Fb:'E',Gb:'F#',Ab:'G#',Bb:'A#',Cb:'B'};

function normalizeRoot(r) {
  return FLAT_TO_SHARP[r] ?? r;
}

// Transpose a single root note by semitones, preserving sharp/flat preference
export function transposeNote(root, semitones) {
  const usedFlat = root.includes('b') && root !== 'B';
  const norm = normalizeRoot(root);
  const idx = SHARP.indexOf(norm);
  if (idx < 0) return root;
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  return usedFlat ? FLAT[newIdx] : SHARP[newIdx];
}

// Parse chord name into { root, suffix }
// root = note like C, C#, Db, A#
// suffix = m, maj7, sus4, etc.
export function parseChordName(name) {
  const m = name.match(/^([A-G][#b]?)(.*)/);
  if (!m) return null;
  return { root: m[1], suffix: m[2] };
}

// Transpose a single chord name by semitones
export function transposeChord(chord, semitones) {
  if (!semitones) return chord;
  const parsed = parseChordName(chord);
  if (!parsed) return chord;
  return transposeNote(parsed.root, semitones) + parsed.suffix;
}

// Chord name regex patterns for the two syntaxes
const BRACKET_RE = /\[([A-G][#b]?[a-zA-Z0-9]*)\]/g;
const SLASH_RE   = /\/\/([A-G][#b]?[a-zA-Z0-9]*)/g;
const CUSTOM_RE  = /^(@)([A-G][#b]?[a-zA-Z0-9]*)/gm;

// Transpose all chords in the raw song text
export function transposeText(text, semitones) {
  if (!semitones) return text;
  let t = text.replace(BRACKET_RE, (_, c) => `[${transposeChord(c, semitones)}]`);
  t = t.replace(SLASH_RE, (_, c) => `//${transposeChord(c, semitones)}`);
  t = t.replace(CUSTOM_RE, (_, at, c) => `${at}${transposeChord(c, semitones)}`);
  // Reset lastIndex on regexes (since they're global and reused)
  BRACKET_RE.lastIndex = 0;
  SLASH_RE.lastIndex   = 0;
  CUSTOM_RE.lastIndex  = 0;
  return t;
}

// Detect the "key" — the first chord name found in the text
export function detectKey(text) {
  BRACKET_RE.lastIndex = 0;
  SLASH_RE.lastIndex   = 0;
  const bm = BRACKET_RE.exec(text);
  const sm = SLASH_RE.exec(text);
  BRACKET_RE.lastIndex = 0;
  SLASH_RE.lastIndex   = 0;
  const first = [bm, sm]
    .filter(Boolean)
    .sort((a, b) => a.index - b.index)[0];
  return first ? first[1] : null;
}
