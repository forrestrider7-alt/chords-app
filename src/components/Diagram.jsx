// SVG fretboard diagram — all strings rendered as explicit <line> elements
// so every string has identical, consistent weight (fixes CSS gradient clipping
// that made the first string thinner than the rest).

const STRINGS   = 6;
const FRETS_MAX = 5; // rows shown: nut + 4 fret intervals

// Layout constants (SVG units)
const PAD_TOP    = 18; // space above nut for x/o markers
const PAD_BOTTOM = 6;
const PAD_LEFT   = 12;
const PAD_RIGHT  = 12;
const COL_W      = 14; // gap between strings
const ROW_H      = 20; // gap between fret lines
const DOT_R      = 5;
const GRID_W     = COL_W * (STRINGS - 1);
const GRID_H     = ROW_H * 4;
const SVG_W      = PAD_LEFT + GRID_W + PAD_RIGHT;
const SVG_H      = PAD_TOP  + GRID_H + PAD_BOTTOM;

// x position of string s (0=E6 low … 5=e high)
function sx(s) { return PAD_LEFT + s * COL_W; }
// y position of fret-row f (0=nut, 1=after 1st fret, etc.)
function fy(f) { return PAD_TOP  + f * ROW_H; }

export default function Diagram({ chordName, shape, small }) {
  if (!shape) return null;
  const { frets, barre } = shape;
  // frets: 6-element array [E6…e], null=muted, 0=open, n=fret n

  const active  = frets.filter(f => f !== null && f > 0);
  const minFret = active.length ? Math.min(...active) : 1;
  // start: first fret shown. If barre, start at barre fret; else start at 1 or minFret
  const start   = barre ? barre : (minFret > 1 ? minFret : 1);
  const showNut = start === 1;

  const scale = small ? 0.75 : 1;
  const w = SVG_W * scale;
  const h = SVG_H * scale;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width={w}
      height={h}
      style={{ display: 'block', overflow: 'visible' }}
      aria-label={`Chord diagram for ${chordName}`}
    >
      {/* ── Fret lines (horizontal) ── */}
      {Array.from({ length: 5 }).map((_, i) => (
        <line
          key={`fl${i}`}
          x1={PAD_LEFT} y1={fy(i)}
          x2={PAD_LEFT + GRID_W} y2={fy(i)}
          stroke="#17130F"
          strokeWidth={!showNut && i === 0 ? 1 : i === 0 && showNut ? 4 : 1}
        />
      ))}

      {/* ── Nut (thick top bar when starting at fret 1) ── */}
      {showNut && (
        <rect
          x={PAD_LEFT - 1} y={PAD_TOP - 4}
          width={GRID_W + 2} height={4}
          fill="#17130F"
        />
      )}

      {/* Fret number indicator when not at nut */}
      {!showNut && (
        <text
          x={PAD_LEFT - 4} y={fy(0) + ROW_H / 2 + 3}
          textAnchor="end"
          fontSize="7"
          fontFamily="IBM Plex Mono, monospace"
          fill="rgba(23,19,15,0.6)"
        >
          {start}
        </text>
      )}

      {/* ── String lines (vertical) ── */}
      {Array.from({ length: STRINGS }).map((_, s) => (
        <line
          key={`sl${s}`}
          x1={sx(s)} y1={fy(0)}
          x2={sx(s)} y2={fy(4)}
          stroke="#17130F"
          strokeWidth="1.5"
        />
      ))}

      {/* ── Barre bar ── */}
      {barre && (
        <rect
          x={PAD_LEFT - 5}
          y={fy(barre - start) + ROW_H / 2 - 6}
          width={GRID_W + 10}
          height={12}
          rx={6}
          fill="#17130F"
        />
      )}

      {/* ── Dots and x/o markers ── */}
      {frets.map((fret, s) => {
        const x = sx(s);
        if (fret === null) {
          // Muted
          return (
            <text key={`m${s}`} x={x} y={PAD_TOP - 5}
              textAnchor="middle" fontSize="9" fontFamily="IBM Plex Mono, monospace"
              fill="rgba(23,19,15,0.55)" fontWeight="600"
            >×</text>
          );
        }
        if (fret === 0) {
          // Open
          return (
            <circle key={`o${s}`} cx={x} cy={PAD_TOP - 8}
              r={4} fill="none" stroke="rgba(23,19,15,0.55)" strokeWidth="1.5"
            />
          );
        }
        // Skip dots that are part of the barre at its fret (barre bar covers them)
        if (barre && fret === barre) return null;
        const y = fy(fret - start) + ROW_H / 2;
        return (
          <circle key={`d${s}`} cx={x} cy={y} r={DOT_R} fill="#17130F" />
        );
      })}
    </svg>
  );
}
