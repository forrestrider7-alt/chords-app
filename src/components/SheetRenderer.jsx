import { useMemo, forwardRef } from 'react';
import { parseText, extractChords } from '../lib/parser';
import { transposeText, detectKey } from '../lib/transpose';
import { getChordShape } from '../lib/chordDb';
import Diagram from './Diagram';

const SheetRenderer = forwardRef(function SheetRenderer(
  { rawText, title, transposeOffset, fontSize, colored, forPrint = false, transposePhase = 'idle' },
  ref
) {
  const { blocks, customShapes, chords, key } = useMemo(() => {
    const transposed = transposeText(rawText, transposeOffset);
    const { blocks, customShapes } = parseText(transposed);
    const chords    = extractChords(transposed);
    const key       = detectKey(transposed) ?? '?';
    return { blocks, customShapes, chords, key };
  }, [rawText, transposeOffset]);

  const chordColor = forPrint ? '#17130F' : (colored ? 'var(--red)' : 'var(--dark)');

  // CSS class on sheet-body reflects transpose animation phase
  const bodyClass = transposePhase !== 'idle'
    ? `sheet-body transposing transposing-${transposePhase}`
    : 'sheet-body';

  return (
    <div className={`sheet-card${forPrint ? ' for-print' : ''}`} ref={ref}>
      <div className="sheet-meta">
        <span>コード帳 · SONG SHEET</span>
        <span>ТОН {key} · 1/1</span>
      </div>

      <div className="sheet-title">{title || 'Без названия'}</div>

      <div className={bodyClass}>
        {blocks.map((block, i) => {
          if (block.type === 'section') {
            return (
              <div className="sec-hdr" key={i}>
                <div className="sec-line" />
                <div className="sec-name">{block.name}</div>
                <div className="sec-line" />
              </div>
            );
          }
          if (block.type === 'gap') return <div className="sheet-gap" key={i} />;

          return (
            <div className="chord-block" key={i}>
              {block.hasChords && (
                <div className="chord-row" style={{ fontSize, color: chordColor }}>
                  {splitChordRow(block.chordRow, i)}
                </div>
              )}
              <div className="lyric-row" style={{ fontSize }}>
                {block.lyricRow || ' '}
              </div>
            </div>
          );
        })}
      </div>

      {chords.length > 0 && (
        <DiagramsSection chords={chords} customShapes={customShapes} />
      )}
    </div>
  );
});

export default SheetRenderer;

// Split a chord row string into animated chord-token spans + text nodes.
// Position-based keys: existing chords don't remount when content stays same.
function splitChordRow(chordRow, blockIdx) {
  const parts = chordRow.split(/(\S+)/);
  return parts.map((part, segIdx) =>
    /\S/.test(part)
      ? <span key={`chord-${blockIdx}-${segIdx}`} className="chord-token">{part}</span>
      : part
  );
}

function DiagramsSection({ chords, customShapes }) {
  const withShapes = chords.filter(name => !!getChordShape(name, customShapes));
  if (!withShapes.length) return null;
  return (
    <div className="diag-sec">
      <div className="diag-hdr">
        <div className="diag-dot" />
        <span className="diag-hdr-title">СХЕМЫ АККОРДОВ</span>
        <span className="diag-hdr-count">{withShapes.length} УНИ&shy;КАЛЬНЫХ</span>
      </div>
      <div className="diag-grid">
        {withShapes.map(name => {
          const shape = getChordShape(name, customShapes);
          return (
            <div className="diag-item" key={name}>
              <div className="diag-chord-name">{name}</div>
              <Diagram chordName={name} shape={shape} />
              <div className="diag-code">
                {shape.barre ? `баррэ ${toRoman(shape.barre)}` : fretsToString(shape.frets)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fretsToString(frets) { return frets.map(f => f === null ? 'x' : String(f)).join(''); }
function toRoman(n) { return ['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][n] ?? String(n); }
