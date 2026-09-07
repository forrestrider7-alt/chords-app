import { useState, useCallback } from 'react';
import {
  OPEN_PITCHES, INTERVAL_SETS,
  NOTE_NAMES_SHARP,
  getChordShape,
} from '../lib/chordDb';

const STRINGS = 6;
const FRETS   = 4;
const STR_LABELS = ['E','A','D','G','B','e'];

function pitch(s, f) {
  return (OPEN_PITCHES[s] + f) % 12;
}

// Recognize chord from dots, barre, and string o/x state
function recognizeChord(dots, barre, stringState) {
  const active = [];

  // Explicit fret dots (skip muted strings)
  for (const key of Object.keys(dots)) {
    if (!dots[key]) continue;
    const [s, f] = key.split(':').map(Number);
    if (stringState[s] === 'muted') continue;
    active.push({ s, f });
  }

  // Open-string markers (o) — strings without dots
  for (let s = 0; s < STRINGS; s++) {
    if (stringState[s] !== 'open') continue;
    const hasDot = Object.keys(dots).some(k => parseInt(k.split(':')[0]) === s && dots[k]);
    if (!hasDot) active.push({ s, f: 0 });
  }

  // Barre fills strings with no dot and no explicit o/x
  if (barre !== null) {
    for (let s = 0; s < STRINGS; s++) {
      if (stringState[s] === 'muted' || stringState[s] === 'open') continue;
      const hasDot = Object.keys(dots).some(k => parseInt(k.split(':')[0]) === s && dots[k]);
      if (!hasDot) active.push({ s, f: barre });
    }
  }

  if (!active.length) return null;

  const sorted = [...active].sort((a, b) => a.s - b.s);
  const bassNote = pitch(sorted[0].s, sorted[0].f);

  const pitchClasses = new Set();
  for (const { s, f } of sorted) {
    pitchClasses.add((pitch(s, f) - bassNote + 12) % 12);
  }
  const intervals = [...pitchClasses].sort((a, b) => a - b);

  // Exact match
  for (const { name, intervals: ref } of INTERVAL_SETS) {
    if (intervals.length === ref.length && intervals.every((v, i) => v === ref[i])) {
      return { name: NOTE_NAMES_SHARP[bassNote] + name, exact: true };
    }
  }
  // Subset match (one note missing)
  for (const { name, intervals: ref } of INTERVAL_SETS) {
    if (intervals.every(v => ref.includes(v)) && ref.length - intervals.length <= 1) {
      return { name: NOTE_NAMES_SHARP[bassNote] + name, exact: false };
    }
  }
  return null;
}

function assignFingers(dots, barre) {
  const entries = Object.entries(dots)
    .filter(([, v]) => v)
    .map(([k]) => { const [s, f] = k.split(':').map(Number); return { key: k, s, f }; })
    .sort((a, b) => a.f - b.f || a.s - b.s);
  let next = barre !== null ? 2 : 1;
  const map = {};
  for (const { key } of entries) map[key] = Math.min(4, next++);
  return map;
}

// Strict priority: explicit x > explicit o > fret dot > barre > default x
function buildShapeStr(dots, barre, stringState) {
  return Array.from({ length: STRINGS }, (_, s) => {
    if (stringState[s] === 'muted') return 'x';
    if (stringState[s] === 'open')  return '0';
    const dotKey = Object.keys(dots).find(k => parseInt(k.split(':')[0]) === s && dots[k]);
    if (dotKey) return dotKey.split(':')[1];
    if (barre !== null) return String(barre);
    return 'x';
  }).join('');
}

export default function ChordCtor({ onInsert, onClose }) {
  const [dots,        setDots]        = useState({});
  const [barre,       setBarre]       = useState(null);
  const [stringState, setStringState] = useState({}); // { [s]: 'open' | 'muted' }

  // Cycle: null → 'open' → 'muted' → null; placing o/x removes dots on that string
  function toggleStringState(s) {
    const cur  = stringState[s] ?? null;
    const next = cur === null ? 'open' : cur === 'open' ? 'muted' : null;
    if (next === null) {
      setStringState(prev => { const { [s]: _, ...rest } = prev; return rest; });
    } else {
      setStringState(prev => ({ ...prev, [s]: next }));
      setDots(prev => Object.fromEntries(
        Object.entries(prev).filter(([k]) => parseInt(k.split(':')[0]) !== s)
      ));
    }
  }

  // Set barre and clean up any dots that landed on that fret row
  function handleSetBarre(n) {
    const newBarre = barre === n ? null : n;
    setBarre(newBarre);
    if (newBarre !== null) {
      setDots(prev => Object.fromEntries(
        Object.entries(prev).filter(([k]) => parseInt(k.split(':')[1]) !== newBarre)
      ));
    }
  }

  const toggle = useCallback((s, f) => {
    if (barre !== null && f === barre) return; // barre row is not for individual dots
    const key = `${s}:${f}`;
    setDots(prev => {
      if (prev[key]) { const { [key]: _, ...rest } = prev; return rest; }
      const maxDots = barre !== null ? 3 : 4;
      if (Object.values(prev).filter(Boolean).length >= maxDots) return prev;
      return { ...prev, [key]: true };
    });
    // Dot placement clears o/x for this string
    setStringState(prev => {
      if (!prev[s]) return prev;
      const { [s]: _, ...rest } = prev;
      return rest;
    });
  }, [barre]);

  const clear = () => { setDots({}); setBarre(null); setStringState({}); };

  const fingerMap  = assignFingers(dots, barre);
  const activeDots = Object.entries(dots).filter(([, v]) => v).map(([k]) => {
    const [s, f] = k.split(':').map(Number);
    return { key: k, s, f };
  });
  const maxDots  = barre !== null ? 3 : 4;
  const atLimit  = activeDots.length >= maxDots;
  const result   = recognizeChord(dots, barre, stringState);
  const shapeStr = buildShapeStr(dots, barre, stringState);

  const hasContent = activeDots.length > 0 || barre !== null ||
    Object.values(stringState).some(v => v === 'open');

  function handleInsert() {
    if (!hasContent) return;
    const chordName = result?.name ?? 'Custom';
    const dbShape   = getChordShape(chordName);
    const needDef   = !dbShape || fretsToString(dbShape.frets) !== shapeStr;
    onInsert({ chordName, shapeStr, needDef });
    onClose();
  }

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ov-dots" style={{ pointerEvents: 'none' }} />
      <div className="modal" style={{ width: 610 }}>
        <div className="modal-hdr">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="modal-jp">和音づくり</span>
            <span className="modal-ru">КОНСТРУКТОР АККОРДА</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="ctor-layout">
          {/* ── Fretboard ── */}
          <div className="ctor-fb">
            {/* o/x string state row */}
            <div className="str-ox-row">
              {Array.from({ length: STRINGS }, (_, s) => {
                const st = stringState[s] ?? null;
                return (
                  <button
                    key={s}
                    className={`str-ox-btn${st === 'open' ? ' ox-open' : st === 'muted' ? ' ox-muted' : ''}`}
                    onClick={() => toggleStringState(s)}
                    title={st === null ? 'Нажмите: открытая' : st === 'open' ? 'Нажмите: заглушённая' : 'Нажмите: сбросить'}
                  >
                    {st === 'open' ? 'o' : st === 'muted' ? 'x' : ''}
                  </button>
                );
              })}
            </div>

            <div className="str-labels">
              {STR_LABELS.map(l => <span key={l}>{l}</span>)}
            </div>

            <div className="fb-wrap">
              {barre !== null && (
                <div
                  className="fb-barre-bar"
                  style={{ top: `${(barre - 1) / FRETS * 100}%`, height: `${1 / FRETS * 100}%` }}
                />
              )}

              {Array.from({ length: FRETS }).map((_, fi) => {
                const f = fi + 1;
                const isBarreFret = barre !== null && f === barre;
                return (
                  <div key={f} className="fb-row">
                    {Array.from({ length: STRINGS }).map((_, s) => {
                      const key = `${s}:${f}`;
                      const on  = !!dots[key];
                      return (
                        <div
                          key={s}
                          className={`fb-cell${isBarreFret ? ' fb-cell-barre' : ''}`}
                          onClick={() => toggle(s, f)}
                        >
                          {on && (
                            <div className="fb-dot-active">
                              {fingerMap[key] ?? ''}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="fret-labels">
              <span>1 ЛАД</span><span>4 ЛАД</span>
            </div>
          </div>

          {/* ── Side panel ── */}
          <div className="ctor-side">
            <div className="chord-res">
              <div className="chord-res-lbl">РАСПОЗНАНО · 判定</div>
              <div className="chord-res-name">
                {result
                  ? result.name
                  : hasContent ? '?' : '—'
                }
                {result && !result.exact && <span className="chord-res-approx"> ≈</span>}
              </div>
              <div className="chord-res-code">{shapeStr}</div>
            </div>

            <div className="barre-row">
              <div>
                <div className="barre-lbl">БАРРЭ · 人差し指</div>
                <div className="barre-sub">лад указательного пальца</div>
              </div>
              <div className="barre-btns">
                {[null, 1, 2, 3, 4].map(n => (
                  <button
                    key={String(n)}
                    className={`barre-num${barre === n ? ' active' : ''}`}
                    onClick={() => handleSetBarre(n)}
                  >
                    {n === null ? '—' : n}
                  </button>
                ))}
              </div>
            </div>

            <div className="fingers-box">
              <div className="fingers-lbl">ПАЛЬЦЫ</div>
              <div className="finger-dots">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="finger-dot">{n}</div>
                ))}
              </div>
              {atLimit && (
                <div className="fingers-warn">Все пальцы заняты</div>
              )}
            </div>

            <div className="ctor-actions">
              <button className="act-btn" onClick={clear}>СБРОС</button>
              <button
                className="act-btn-red"
                style={{ flex: 1 }}
                onClick={handleInsert}
                disabled={!hasContent}
              >
                ДОБАВИТЬ В ПЕСНЮ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fretsToString(frets) {
  return frets.map(f => f === null ? 'x' : String(f)).join('');
}
