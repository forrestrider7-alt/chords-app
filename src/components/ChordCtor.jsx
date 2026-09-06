import { useState, useCallback } from 'react';
import {
  OPEN_PITCHES, INTERVAL_SETS,
  NOTE_NAMES_SHARP, NOTE_NAMES_FLAT,
  getChordShape,
} from '../lib/chordDb';

const STRINGS = 6;
const FRETS   = 4;
const STR_LABELS = ['E','A','D','G','B','e'];

// Pitch class for string s at fret f
function pitch(s, f) {
  return (OPEN_PITCHES[s] + f) % 12;
}

// Recognize chord name from active dots { "s:f": true }
function recognizeChord(dots, barre) {
  const active = []; // { s, f }
  for (const key of Object.keys(dots)) {
    if (!dots[key]) continue;
    const [s, f] = key.split(':').map(Number);
    active.push({ s, f });
  }
  // Include barre notes (all strings at barre fret that aren't overridden)
  if (barre) {
    for (let s = 0; s < STRINGS; s++) {
      const barreKey = `${s}:${barre}`;
      const hasOverride = active.some(d => d.s === s && d.f > barre);
      if (!hasOverride && !dots[barreKey]) {
        active.push({ s, f: barre });
      }
    }
  }
  if (!active.length) return null;

  // Find lowest-string sounding note as bass
  const sorted = [...active].sort((a, b) => a.s - b.s);
  const bassNote = pitch(sorted[0].s, sorted[0].f);

  // Collect unique pitch classes relative to bass
  const pitchClasses = new Set();
  for (const { s, f } of sorted) {
    pitchClasses.add((pitch(s, f) - bassNote + 12) % 12);
  }
  const intervals = [...pitchClasses].sort((a, b) => a - b);

  // Exact match
  for (const { name, intervals: ref } of INTERVAL_SETS) {
    if (intervals.length === ref.length && intervals.every((v, i) => v === ref[i])) {
      const rootName = NOTE_NAMES_SHARP[bassNote];
      return { name: rootName + name, exact: true };
    }
  }

  // Subset match (missing one note)
  for (const { name, intervals: ref } of INTERVAL_SETS) {
    if (intervals.every(v => ref.includes(v)) && ref.length - intervals.length <= 1) {
      const rootName = NOTE_NAMES_SHARP[bassNote];
      return { name: rootName + name, exact: false };
    }
  }

  return null;
}

// Assign finger numbers: barre=1(implicit), rest sorted by fret then string
function assignFingers(dots, barre) {
  const entries = Object.entries(dots)
    .filter(([, v]) => v)
    .map(([k]) => {
      const [s, f] = k.split(':').map(Number);
      return { key: k, s, f };
    })
    .sort((a, b) => a.f - b.f || a.s - b.s);

  let next = barre ? 2 : 1;
  const map = {};
  for (const { key } of entries) {
    map[key] = Math.min(4, next++);
  }
  return map;
}

export default function ChordCtor({ onInsert, onClose }) {
  const [dots,  setDots]  = useState({});
  const [barre, setBarre] = useState(null); // null or fret number 1-4

  const toggle = useCallback((s, f) => {
    const key = `${s}:${f}`;
    setDots(prev => {
      // Removing is always allowed
      if (prev[key]) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      // Block adding beyond the finger limit (captured from closure; toggle
      // is recreated whenever barre changes because barre is in dep array)
      const maxDots = barre !== null ? 3 : 4;
      const current = Object.values(prev).filter(Boolean).length;
      if (current >= maxDots) return prev; // silently block — UI shows "Все пальцы заняты"
      return { ...prev, [key]: true };
    });
  }, [barre]); // re-create when barre changes so limit reflects current mode

  const clear = () => { setDots({}); setBarre(null); };

  const fingerMap = assignFingers(dots, barre);
  const activeDots = Object.entries(dots).filter(([, v]) => v).map(([k]) => {
    const [s, f] = k.split(':').map(Number);
    return { key: k, s, f };
  });
  const maxDots  = barre !== null ? 3 : 4;
  const atLimit  = activeDots.length >= maxDots;
  const result  = recognizeChord(dots, barre);

  // Build shape string for insertion
  function buildShapeStr() {
    const arr = Array(STRINGS).fill(null);
    if (barre) {
      for (let s = 0; s < STRINGS; s++) arr[s] = barre;
    }
    for (const { s, f } of activeDots) {
      arr[s] = f;
    }
    return arr.map(v => v === null ? 'x' : String(v)).join('');
  }

  function handleInsert() {
    if (!activeDots.length && !barre) return;
    const chordName = result?.name ?? 'Custom';
    const shapeStr  = buildShapeStr();
    // Check if this shape matches the DB
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
            <div className="str-labels">
              {STR_LABELS.map(l => <span key={l}>{l}</span>)}
            </div>

            <div className="fb-wrap">
              {/* Barre highlight */}
              {barre && (
                <div
                  className="fb-barre-bar"
                  style={{ top: `${(barre - 1) / FRETS * 100}%`, height: `${1 / FRETS * 100}%` }}
                />
              )}

              {/* Grid */}
              {Array.from({ length: FRETS }).map((_, fi) => {
                const f = fi + 1;
                return (
                  <div key={f} className="fb-row">
                    {Array.from({ length: STRINGS }).map((_, s) => {
                      const key = `${s}:${f}`;
                      const on  = !!dots[key];
                      return (
                        <div key={s} className="fb-cell" onClick={() => toggle(s, f)}>
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
            {/* Result */}
            <div className="chord-res">
              <div className="chord-res-lbl">РАСПОЗНАНО · 判定</div>
              <div className="chord-res-name">
                {result ? result.name : (activeDots.length ? '?' : '—')}
                {result && !result.exact && <span className="chord-res-approx"> ≈</span>}
              </div>
              <div className="chord-res-code">{buildShapeStr()}</div>
            </div>

            {/* Barre toggle */}
            <div className="barre-row">
              <div>
                <div className="barre-lbl">БАРРЭ · 人差し指</div>
                <div className="barre-sub">лад указательного пальца</div>
              </div>
              <div className="barre-btns">
                {[null,1,2,3,4].map(n => (
                  <button
                    key={String(n)}
                    className={`barre-num${barre === n ? ' active' : ''}`}
                    onClick={() => setBarre(barre === n ? null : n)}
                  >
                    {n === null ? '—' : n}
                  </button>
                ))}
              </div>
            </div>

            {/* Fingers */}
            <div className="fingers-box">
              <div className="fingers-lbl">ПАЛЬЦЫ</div>
              <div className="finger-dots">
                {[1,2,3,4].map(n => (
                  <div key={n} className="finger-dot">{n}</div>
                ))}
              </div>
              {atLimit && (
                <div className="fingers-warn">Все пальцы заняты</div>
              )}
            </div>

            {/* Actions */}
            <div className="ctor-actions">
              <button className="act-btn" onClick={clear}>СБРОС</button>
              <button
                className="act-btn-red"
                style={{ flex: 1 }}
                onClick={handleInsert}
                disabled={!activeDots.length && !barre}
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
