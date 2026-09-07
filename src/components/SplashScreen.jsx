import { useState, useEffect, useMemo } from 'react';

const CHARS    = ['コ', 'ー', 'ド', '帳'];
const DOT_COLS = 56;
const DOT_ROWS = 36;

export default function SplashScreen({ onExitStart, onDone }) {
  const [phase, setPhase] = useState('dots'); // dots | logo | exit

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('logo'), 600);
    const t2 = setTimeout(() => {
      setPhase('exit');
      onExitStart();
    }, 2200);
    const t3 = setTimeout(onDone, 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`splash-ov splash-ov--${phase}`}>
      <Dots />
      {phase !== 'dots' && <SplashLogo />}
    </div>
  );
}

function Dots() {
  const dots = useMemo(() => {
    const arr = [];
    for (let r = 0; r < DOT_ROWS; r++) {
      for (let c = 0; c < DOT_COLS; c++) {
        const cx = c / (DOT_COLS - 1);
        const cy = r / (DOT_ROWS - 1);
        const diag = (cx + cy).toFixed(3);
        const dx = cx - 0.5, dy = cy - 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // center (dist≈0) → very faint; corners (dist≈0.71) → more visible
        const maxOp = (0.04 + dist * 0.22).toFixed(3);
        arr.push({ key: `${r}-${c}`, r, c, diag, maxOp });
      }
    }
    return arr;
  }, []);

  return (
    <div className="splash-dots">
      {dots.map(({ key, r, c, diag, maxOp }) => (
        <div
          key={key}
          className="splash-dot"
          style={{
            '--diag': diag,
            '--max-op': maxOp,
            gridRow: r + 1,
            gridColumn: c + 1,
          }}
        />
      ))}
    </div>
  );
}

function SplashLogo() {
  return (
    <div className="splash-logo">
      {CHARS.map((ch, i) => (
        <span key={i} className="splash-ch" style={{ '--chi': i }}>{ch}</span>
      ))}
    </div>
  );
}
