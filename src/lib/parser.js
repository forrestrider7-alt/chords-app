// Parse raw chord-sheet text into renderable blocks

// Section keyword detection (RU + EN, case-insensitive)
const SECTION_KW = /^(verse|chorus|bridge|intro|outro|interlude|coda|hook|finale|pre.?chorus|куплет|припев|бридж|интро|аутро|проигрыш|кода|вступление|хук|финал)(\s.*)?$/i;

function isSectionLine(line) {
  const t = line.trim();
  return /^\{.+\}$/.test(t) || SECTION_KW.test(t);
}

function getSectionName(line) {
  const t = line.trim();
  return /^\{.+\}$/.test(t) ? t.slice(1, -1) : t;
}

function isCustomDef(line) {
  return /^@[A-G][#b]?[a-zA-Z0-9]*\s+[x0-9]{6}$/i.test(line.trim());
}

// Parse a single lyric line into { chords, lyric }
// chords: Array<{ name: string, charPos: number }>
// charPos = character position in the cleaned lyric string
function parseLyricLine(line) {
  const chords = [];
  let lyric = '';
  let i = 0;

  while (i < line.length) {
    // Bracket syntax [Am]
    if (line[i] === '[') {
      const end = line.indexOf(']', i);
      if (end !== -1) {
        const candidate = line.slice(i + 1, end);
        if (/^[A-G][#b]?[a-zA-Z0-9]*$/.test(candidate)) {
          chords.push({ name: candidate, charPos: lyric.length });
          i = end + 1;
          continue;
        }
      }
    }
    // Slash syntax //Am
    if (line[i] === '/' && line[i + 1] === '/') {
      const rest = line.slice(i + 2);
      const m = rest.match(/^([A-G][#b]?[a-zA-Z0-9]*)/);
      if (m) {
        chords.push({ name: m[1], charPos: lyric.length });
        i += 2 + m[1].length;
        continue;
      }
    }
    lyric += line[i++];
  }

  return { chords, lyric };
}

// Build the chord-row and lyric-row strings (both in monospace)
// Ensures chords don't overlap (minimum 1 space between them)
function buildRows(chords, lyric) {
  if (chords.length === 0) return { chordRow: '', lyricRow: lyric };

  // Resolve chord positions — shift right if they'd overlap
  const placed = [];
  let nextMin = 0;
  for (const ch of chords) {
    const pos = Math.max(ch.charPos, nextMin);
    placed.push({ ...ch, pos });
    nextMin = pos + ch.name.length + 1;
  }

  // Build chord row
  const chordBuf = [];
  for (const { name, pos } of placed) {
    while (chordBuf.length < pos) chordBuf.push(' ');
    for (const c of name) chordBuf.push(c);
  }
  const chordRow = chordBuf.join('');

  // Lyric row: pad to at least chord row length if needed
  let lyricRow = lyric;
  if (lyricRow.length < chordRow.length) {
    lyricRow = lyricRow.padEnd(chordRow.length);
  }

  return { chordRow, lyricRow };
}

// ── Main parser ───────────────────────────────────────────────────
// Returns:
//   blocks: Block[]
//   customShapes: Record<string, string> (name -> 6-char fret string)
//
// Block types:
//   { type: 'section', name: string }
//   { type: 'lyric',   chordRow: string, lyricRow: string, hasChords: boolean }
//   { type: 'gap' }
export function parseText(raw) {
  const lines = raw.split('\n');
  const blocks = [];
  const customShapes = {};

  for (const rawLine of lines) {
    const line = rawLine;

    // Custom chord definition  @Am7 x02010
    if (isCustomDef(line)) {
      const m = line.trim().match(/^@([A-G][#b]?[a-zA-Z0-9]*)\s+([x0-9]{6})/i);
      if (m) customShapes[m[1]] = m[2].toLowerCase();
      continue; // don't render the @-line itself
    }

    // Empty line → gap
    if (!line.trim()) {
      blocks.push({ type: 'gap' });
      continue;
    }

    // Section header
    if (isSectionLine(line)) {
      blocks.push({ type: 'section', name: getSectionName(line).toUpperCase() });
      continue;
    }

    // Regular line (may have chords)
    const { chords, lyric } = parseLyricLine(line);
    const { chordRow, lyricRow } = buildRows(chords, lyric);
    blocks.push({
      type: 'lyric',
      chordRow,
      lyricRow,
      hasChords: chords.length > 0,
    });
  }

  return { blocks, customShapes };
}

// Extract unique chord names in order of first appearance
export function extractChords(raw) {
  const seen = new Set();
  const result = [];
  for (const m of raw.matchAll(/\[([A-G][#b]?[a-zA-Z0-9]*)\]|\/\/([A-G][#b]?[a-zA-Z0-9]*)/g)) {
    const name = m[1] ?? m[2];
    if (!seen.has(name)) { seen.add(name); result.push(name); }
  }
  return result;
}

// Extract custom @-definitions from raw text
export function extractCustomShapes(raw) {
  const shapes = {};
  for (const line of raw.split('\n')) {
    const m = line.trim().match(/^@([A-G][#b]?[a-zA-Z0-9]*)\s+([x0-9]{6})/i);
    if (m) shapes[m[1]] = m[2].toLowerCase();
  }
  return shapes;
}
