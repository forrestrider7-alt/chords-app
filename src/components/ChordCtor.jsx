import { useState, useCallback, useRef, useEffect } from 'react';
import {
  OPEN_PITCHES, INTERVAL_SETS,
  NOTE_NAMES_SHARP,
  getChordShape,
} from '../lib/chordDb';

const STRINGS    = 6;
const FRETS      = 4;
const STR_LABELS = ['E','A','D','G','B','e'];

// SVG fretboard constants — same outer size as the CSS grid (165×168px)
const C_COL_W  = 27;
const C_PAD    = 15;
const C_ROW_H  = 42;
const C_DOT_R  = 10;
const C_SVG_W  = C_PAD * 2 + C_COL_W * (STRINGS - 1); // 165
const C_SVG_H  = C_ROW_H * FRETS;                      // 168
const csx  = s => C_PAD + s * C_COL_W;
const cfy  = f => (f - 0.5) * C_ROW_H;
const cfyt = f => (f - 1)   * C_ROW_H;

function pitch(s, f) { return (OPEN_PITCHES[s] + f) % 12; }

function recognizeChord(dots, barre, stringState) {
  const active = [];
  for (const key of Object.keys(dots)) {
    if (!dots[key]) continue;
    const [s, f] = key.split(':').map(Number);
    if (stringState[s] === 'muted') continue;
    active.push({ s, f });
  }
  for (let s = 0; s < STRINGS; s++) {
    if (stringState[s] !== 'open') continue;
    const hasDot = Object.keys(dots).some(k => parseInt(k.split(':')[0]) === s && dots[k]);
    if (!hasDot) active.push({ s, f: 0 });
  }
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
  for (const { s, f } of sorted) pitchClasses.add((pitch(s, f) - bassNote + 12) % 12);
  const intervals = [...pitchClasses].sort((a, b) => a - b);
  for (const { name, intervals: ref } of INTERVAL_SETS) {
    if (intervals.length === ref.length && intervals.every((v, i) => v === ref[i]))
      return { name: NOTE_NAMES_SHARP[bassNote] + name, exact: true };
  }
  for (const { name, intervals: ref } of INTERVAL_SETS) {
    if (intervals.every(v => ref.includes(v)) && ref.length - intervals.length <= 1)
      return { name: NOTE_NAMES_SHARP[bassNote] + name, exact: false };
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
  const [stringState, setStringState] = useState({});
  const [removingDots, setRemovingDots] = useState({}); // keys being exit-animated
  const [closing,      setClosing]    = useState(false);

  // Ref so toggle() can read current dots without stale closure
  const dotsRef = useRef({});
  useEffect(() => { dotsRef.current = dots; }, [dots]);

  function handleClose() {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 150);
  }

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
    if (barre !== null && f === barre) return;
    const key = `${s}:${f}`;

    if (dotsRef.current[key]) {
      // Animate out, then remove from dots
      setRemovingDots(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setDots(prev => { const { [key]: _, ...rest } = prev; return rest; });
        setRemovingDots(prev => { const { [key]: _, ...rest } = prev; return rest; });
      }, 150);
      return;
    }

    setDots(prev => {
      const maxDots = barre !== null ? 3 : 4;
      // Count only non-removing dots toward the limit
      const current = Object.entries(prev).filter(([k, v]) => v && !removingDots[k]).length;
      if (current >= maxDots) return prev;
      return { ...prev, [key]: true };
    });
    setStringState(prev => {
      if (!prev[s]) return prev;
      const { [s]: _, ...rest } = prev;
      return rest;
    });
  }, [barre, removingDots]);

  const clear = () => { setDots({}); setBarre(null); setStringState({}); setRemovingDots({}); };

  // Active (non-removing) dots for logic
  const activeDots = Object.entries(dots)
    .filter(([k, v]) => v && !removingDots[k])
    .map(([k]) => { const [s, f] = k.split(':').map(Number); return { key: k, s, f }; });

  // Exiting dots (still in dots state, being animated out)
  const exitingDots = Object.keys(removingDots).map(k => {
    const [s, f] = k.split(':').map(Number);
    return { key: k, s, f };
  });

  const fingerMap = assignFingers(
    Object.fromEntries(activeDots.map(d => [d.key, true])),
    barre
  );
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
    handleClose();
  }

  // Render helper for a dot circle group
  function DotCircle({ s, f, finger, exiting }) {
    const x = csx(s);
    const y = cfy(f);
    return (
      <g
        pointerEvents="none"
        style={{
          animation: exiting
            ? 'dotRemove 150ms ease-in both'
            : 'dotAppear 250ms cubic-bezier(0.34,1.56,0.64,1) both',
          transformOrigin: `${x}px ${y}px`,
        }}
      >
        <circle cx={x} cy={y} r={C_DOT_R} fill="#17130F" stroke="#EFE3CB" strokeWidth={2} />
        <text
          x={x} y={y + 3.5}
          textAnchor="middle"
          fontSize="9" fontFamily="IBM Plex Mono, monospace"
          fontWeight="700" fill="#DFA05D"
        >{finger ?? ''}</text>
      </g>
    );
  }

  return (
    <div
      className={`overlay open${closing ? ' closing' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="modal" style={{ width: 610 }}>
        <div className="modal-hdr">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="modal-jp">和音づくり</span>
            <span className="modal-ru">КОНСТРУКТОР АККОРДА</span>
          </div>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>

        <div className="ctor-layout">
          <div className="ctor-fb">
            {/* o/x string state row */}
            <div className="str-ox-row">
              {Array.from({ length: STRINGS }, (_, s) => {
                const st = stringState[s] ?? null;
                return (
                  <button
                    key={s}
                    className={`str-ox-btn${st === 'open' ? ' ox-open' : st === 'muted' ? ' ox-muted' : ''}`}
                    style={{ left: csx(s) }}
                    onClick={() => toggleStringState(s)}
                    title={st === null ? 'Нажмите: открытая' : st === 'open' ? 'Нажмите: заглушённая' : 'Нажмите: сбросить'}
                  >
                    {st === 'open' ? 'o' : st === 'muted' ? 'x' : ''}
                  </button>
                );
              })}
            </div>

            <div className="str-labels">
              {STR_LABELS.map((l, s) => (
                <span key={l} style={{ left: csx(s) }}>{l}</span>
              ))}
            </div>

            <svg
              width={C_SVG_W} height={C_SVG_H}
              viewBox={`0 0 ${C_SVG_W} ${C_SVG_H}`}
              style={{ display: 'block', overflow: 'visible' }}
            >
              {/* Fret lines */}
              {Array.from({ length: FRETS + 1 }, (_, i) => (
                <line key={`fl${i}`}
                  x1={C_PAD} y1={i * C_ROW_H}
                  x2={C_PAD + C_COL_W * (STRINGS - 1)} y2={i * C_ROW_H}
                  stroke="#17130F" strokeWidth={i === 0 ? 2.5 : 1.5}
                />
              ))}

              {/* String lines */}
              {Array.from({ length: STRINGS }, (_, s) => (
                <line key={`sl${s}`}
                  x1={csx(s)} y1={0}
                  x2={csx(s)} y2={C_SVG_H}
                  stroke="#17130F" strokeWidth={1.5}
                />
              ))}

              {/* Barre bar */}
              {barre !== null && (
                <rect
                  x={csx(0) - 6} y={cfy(barre) - 7}
                  width={C_COL_W * (STRINGS - 1) + 12} height={14} rx={7}
                  fill="#AC5045" stroke="#17130F" strokeWidth={1.5}
                  pointerEvents="none"
                />
              )}

              {/* Click targets */}
              {Array.from({ length: FRETS }, (_, fi) => {
                const f = fi + 1;
                const isBarreFret = barre !== null && f === barre;
                return Array.from({ length: STRINGS }, (_, s) => (
                  <rect
                    key={`cell-${s}-${f}`}
                    x={csx(s) - C_COL_W / 2} y={cfyt(f)}
                    width={C_COL_W} height={C_ROW_H}
                    fill="transparent"
                    className="fb-click-cell"
                    onClick={isBarreFret ? undefined : () => toggle(s, f)}
                    style={{ cursor: isBarreFret ? 'default' : 'pointer' }}
                    pointerEvents={isBarreFret ? 'none' : 'all'}
                  />
                ));
              })}

              {/* Active dots — spring appear */}
              {activeDots.map(({ key, s, f }) => (
                <DotCircle key={key} s={s} f={f} finger={fingerMap[key]} exiting={false} />
              ))}

              {/* Exiting dots — fade/shrink out */}
              {exitingDots.map(({ key, s, f }) => (
                <DotCircle key={`exit-${key}`} s={s} f={f} finger={null} exiting={true} />
              ))}
            </svg>

            <div className="fret-labels">
              <span>1 ЛАД</span><span>4 ЛАД</span>
            </div>
          </div>

          {/* Side panel */}
          <div className="ctor-side">
            <div className="chord-res">
              <div className="chord-res-lbl">РАСПОЗНАНО · 判定</div>
              <div className="chord-res-name">
                {result ? result.name : hasContent ? '?' : '—'}
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
                {[1, 2, 3, 4].map(n => <div key={n} className="finger-dot">{n}</div>)}
              </div>
              {atLimit && <div className="fingers-warn">Все пальцы заняты</div>}
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
