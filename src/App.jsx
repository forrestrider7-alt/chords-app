import { useState, useRef, useCallback, useEffect } from 'react';
import SheetRenderer from './components/SheetRenderer';
import ChordCtor from './components/ChordCtor';
import SongsModal from './components/SongsModal';
import AuthModal from './components/AuthModal';
import { transposeText, detectKey } from './lib/transpose';
import { useAuth } from './hooks/useAuth';
import { useSongs } from './hooks/useSongs';
import { isConfigured } from './lib/supabase';
import { exportPDF } from './lib/pdfExport';

const DEFAULT_TEXT = `{Куплет 1}
Я оставил [Am]свет в окне на [F]ночь,
чтобы [C]ты нашла обратный [G]путь.
Ветер [Am]вынес занавеску [F]прочь,
и не [Dm]дал мне до утра [E]уснуть.

{Припев}
[F]Дорога домой — [C]длинная строка,
[Dm]я её пою в [E]полный рост.
[F]Держит фонарь у [C]виска
[Dm]горсть [G]перепутанных [Am]звёзд.

{Бридж}
@Am7 x02010
[Am7]Тише. [Dm]Ещё две [E]минуты до [Am]сна.`;

export default function App() {
  const [rawText,   setRawText]   = useState(DEFAULT_TEXT);
  const [title,     setTitle]     = useState('Дорога домой');
  const [offset,    setOffset]    = useState(0);   // semitone transpose
  const [fontSize,  setFontSize]  = useState(13);
  const [colored,   setColored]   = useState(true);
  const [currentId, setCurrentId] = useState(null);

  const [songsOpen, setSongsOpen] = useState(false);
  const [ctorOpen,  setCtorOpen]  = useState(false);
  const [authOpen,  setAuthOpen]  = useState(false);

  const [savedAt, setSavedAt] = useState('');

  const editorRef    = useRef(null);
  const sheetRef     = useRef(null);
  const saveTimerRef = useRef(null);
  const currentIdRef = useRef(null);

  // Keep ref in sync so setTimeout closures always see the latest id
  useEffect(() => { currentIdRef.current = currentId; }, [currentId]);

  const { user, loading: authLoading, signInWithEmail, signUpWithEmail, signInWithMagicLink, signOut } = useAuth();
  const { songs, loading: songsLoading, load: loadSongs, save: saveSong, remove: deleteSong } = useSongs(user);

  // Load songs when user logs in
  useEffect(() => { if (user) loadSongs(); }, [user, loadSongs]);

  // ── Computed key display ─────────────────────────────────────────
  const currentKey = detectKey(transposeText(rawText, offset)) ?? '?';

  // ── Auto-save (debounced) ─────────────────────────────────────────
  const schedSave = useCallback((text, ttl, off) => {
    if (!isConfigured || !user) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const tone  = detectKey(transposeText(text, off)) ?? '?';
      const { data: saved, error } = await saveSong({ id: currentIdRef.current, title: ttl, body: text, tone });
      if (error) { setSavedAt(`⚠ ${error.message}`); return; }
      if (saved) {
        setCurrentId(saved.id);
        const now = new Date();
        setSavedAt(`СОХРАНЕНО ${pad(now.getHours())}:${pad(now.getMinutes())}`);
      }
    }, 1600);
  }, [user, saveSong]);

  function onEditorChange(e) {
    const v = e.target.value;
    setRawText(v);
    schedSave(v, title, offset);
  }

  function onTitleChange(e) {
    setTitle(e.target.value);
    schedSave(rawText, e.target.value, offset);
  }

  // Tab key in textarea
  function onKey(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.target;
      const p  = ta.selectionStart;
      const v  = ta.value.slice(0, p) + '  ' + ta.value.slice(ta.selectionEnd);
      setRawText(v);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = p + 2;
      });
    }
  }

  // ── Quick editor inserts ─────────────────────────────────────────
  function insertBrackets() {
    const ta = editorRef.current;
    if (!ta) return;
    const p = ta.selectionStart;
    const v = ta.value.slice(0, p) + '[]' + ta.value.slice(ta.selectionEnd);
    setRawText(v);
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = p + 1;
      ta.focus();
    });
  }

  function insertSection() {
    const ta = editorRef.current;
    if (!ta) return;
    const p = ta.selectionStart;
    // Ensure the line starts on its own line
    const before = ta.value.slice(0, p);
    const prefix = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
    const tag = '{Название}';
    const v = before + prefix + tag + '\n' + ta.value.slice(ta.selectionEnd);
    setRawText(v);
    // Select "Название" so the user can overtype it immediately
    const selStart = p + prefix.length + 1;           // skip '{'
    const selEnd   = selStart + 'Название'.length;
    requestAnimationFrame(() => {
      ta.selectionStart = selStart;
      ta.selectionEnd   = selEnd;
      ta.focus();
    });
  }

  function insertShape() {
    const ta = editorRef.current;
    if (!ta) return;
    const p = ta.selectionStart;
    const before = ta.value.slice(0, p);
    const prefix = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
    const template = '@Аккорд xxxxxx';
    const v = before + prefix + template + '\n' + ta.value.slice(ta.selectionEnd);
    setRawText(v);
    // Select "Аккорд" so the user can type the chord name right away
    const selStart = p + prefix.length + 1;           // skip '@'
    const selEnd   = selStart + 'Аккорд'.length;
    requestAnimationFrame(() => {
      ta.selectionStart = selStart;
      ta.selectionEnd   = selEnd;
      ta.focus();
    });
  }

  // ── Transpose ────────────────────────────────────────────────────
  function doTranspose(delta) {
    const newOffset = ((offset + delta) % 12 + 12) % 12;
    setOffset(newOffset);
    schedSave(rawText, title, newOffset);
  }

  // ── Chord constructor insert ──────────────────────────────────────
  function onCtorInsert({ chordName, shapeStr, needDef }) {
    const ta  = editorRef.current;
    const pos = ta ? ta.selectionStart : rawText.length;
    const tag = `[${chordName}]`;
    const def = needDef ? `@${chordName} ${shapeStr}\n` : '';
    const next = def + rawText.slice(0, pos) + tag + rawText.slice(pos);
    setRawText(next);
    requestAnimationFrame(() => {
      if (ta) {
        ta.selectionStart = ta.selectionEnd = def.length + pos + tag.length;
        ta.focus();
      }
    });
  }

  // ── Songs ────────────────────────────────────────────────────────
  function handleLoadSong(song) {
    setTitle(song.title || '');
    setRawText(song.body || '');
    setOffset(0);
    setCurrentId(song.id);
    setSavedAt('');
  }

  function handleNew() {
    setTitle('');
    setRawText('');
    setOffset(0);
    setCurrentId(null);
    setSavedAt('');
  }

  async function handleSave() {
    if (!user) { setAuthOpen(true); return; }
    clearTimeout(saveTimerRef.current);
    const tone = detectKey(transposeText(rawText, offset)) ?? '?';
    const { data: saved, error } = await saveSong({ id: currentIdRef.current, title, body: rawText, tone });
    if (error) {
      setSavedAt(`⚠ ${error.message}`);
      console.error('handleSave:', error);
      return;
    }
    if (saved) {
      setCurrentId(saved.id);
      const now = new Date();
      setSavedAt(`СОХРАНЕНО ${pad(now.getHours())}:${pad(now.getMinutes())}`);
    }
  }

  // ── Auth ─────────────────────────────────────────────────────────
  async function handleAuth(mode, email, password) {
    if (mode === 'login')  return signInWithEmail(email, password);
    if (mode === 'signup') return signUpWithEmail(email, password);
    if (mode === 'magic')  return signInWithMagicLink(email);
  }

  // ── Print ────────────────────────────────────────────────────────
  function handlePrint() {
    window.print();
  }

  async function handleExportPDF() {
    if (!sheetRef.current) return;
    const safe = (title || 'chord-sheet').replace(/[^а-яёa-z0-9\s_-]/gi, '').trim() || 'chord-sheet';
    await exportPDF(sheetRef.current, `${safe}.pdf`);
  }

  // ── Counts ───────────────────────────────────────────────────────
  const lineCount  = rawText.split('\n').filter(l => l.trim()).length;
  const chordCount = (rawText.match(/\[[A-G][#b]?[a-zA-Z0-9]*\]|\/\/[A-G][#b]?[a-zA-Z0-9]*/g) || []).length;

  return (
    <>
      {/* ── Header ── */}
      <header>
        <div className="logo-wrap">
          <div className="logo">コード帳</div>
          <div className="logo-dot" />
        </div>

        <div className="controls">
          <div className="ctrl-group">
            <div className="ctrl-label">НАЗВАНИЕ · 曲名</div>
            <input
              className="song-input"
              value={title}
              onChange={onTitleChange}
              placeholder="Без названия"
            />
          </div>

          <div className="ctrl-group">
            <div className="ctrl-label">ТОН · 移調</div>
            <div className="ctrl-row">
              <button className="neu-btn" onClick={() => doTranspose(-1)}>−1</button>
              <div className="key-pill">{currentKey}</div>
              <button className="neu-btn" onClick={() => doTranspose(+1)}>+1</button>
            </div>
          </div>

          <div className="ctrl-group">
            <div className="ctrl-label">КЕГЛЬ</div>
            <div className="ctrl-row">
              <button className="neu-btn" style={{ fontSize: 11 }} onClick={() => setFontSize(s => Math.max(10, s - 1))}>A−</button>
              <button className="neu-btn" style={{ fontSize: 15 }} onClick={() => setFontSize(s => Math.min(20, s + 1))}>A+</button>
            </div>
          </div>

          <div className="ctrl-group">
            <div className="ctrl-label">ЦВЕТНЫЕ АККОРДЫ</div>
            <div className="ctrl-row">
              <button className={`tog ${colored ? 'tog-on' : 'tog-off'}`} onClick={() => setColored(true)}>ВКЛ</button>
              <button className={`tog ${!colored ? 'tog-on' : 'tog-off'}`} onClick={() => setColored(false)}>ВЫКЛ</button>
            </div>
          </div>

          <div className="ctrl-row" style={{ alignSelf: 'flex-end', gap: 8 }}>
            <button className="act-btn" onClick={handleSave}>СОХРАНИТЬ</button>
            <button className="act-btn" onClick={() => {
              if (!isConfigured) { alert('Supabase не настроен. Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env'); return; }
              if (!user) { setAuthOpen(true); return; }
              loadSongs(); setSongsOpen(true);
            }}>МОИ ПЕСНИ</button>
            <button className="act-btn" onClick={() => setCtorOpen(true)}>АККОРД +</button>
            <button className="act-btn" onClick={handleNew}>НОВАЯ</button>
            <button className="act-btn" onClick={handlePrint}>ПЕЧАТЬ</button>
            <button className="act-btn-red" onClick={handleExportPDF}>ЭКСПОРТ PDF</button>
          </div>

          {/* Auth badge */}
          {isConfigured && (
            <div className="auth-badge">
              {user
                ? <><span className="auth-email">{user.email}</span><button className="auth-out" onClick={signOut}>выйти</button></>
                : <button className="act-btn" onClick={() => setAuthOpen(true)}>ВОЙТИ</button>
              }
            </div>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main>
        {/* Editor panel */}
        <div id="ed-panel">
          <div className="syn-hint">
            <div className="syn-hdr"><div className="syn-dot" /><span className="syn-lbl">СИНТАКСИС · 書き方</span></div>
            <div className="syn-txt">
              [Am] или //Am — аккорд&nbsp;&nbsp;{'{Куплет}'} — блок<br />
              @Am7 x02010 — своя аппликатура
            </div>
          </div>

          <div className="editor-toolbar">
            <button className="ed-tool-btn" onClick={insertBrackets} title="Вставить [] в позицию курсора">
              [ ] аккорд
            </button>
            <button className="ed-tool-btn" onClick={insertSection} title="Вставить заголовок блока">
              + Секция
            </button>
            <button className="ed-tool-btn" onClick={insertShape} title="Вставить шаблон аппликатуры">
              + Аппликатура
            </button>
          </div>

          <textarea
            ref={editorRef}
            value={rawText}
            onChange={onEditorChange}
            onKeyDown={onKey}
            spellCheck={false}
          />

          <div className="ed-status">
            <span id="st-counts">строк: {lineCount} &nbsp; аккордов: {chordCount}</span>
            <span className={savedAt.startsWith('⚠') ? 'save-err' : 'saved-ok'}>{savedAt}</span>
          </div>
        </div>

        {/* Preview panel */}
        <div id="prev-panel">
          <div className="prev-dots" />
          <SheetRenderer
            ref={sheetRef}
            rawText={rawText}
            title={title}
            transposeOffset={offset}
            fontSize={fontSize}
            colored={colored}
          />
        </div>
      </main>

      {/* ── Print-only view ── */}
      <div id="print-view">
        <SheetRenderer
          rawText={rawText}
          title={title}
          transposeOffset={offset}
          fontSize={14}
          colored={false}
          forPrint={true}
        />
      </div>

      {/* ── Modals ── */}
      {ctorOpen  && <ChordCtor onInsert={onCtorInsert} onClose={() => setCtorOpen(false)} />}
      {songsOpen && <SongsModal
        songs={songs}
        currentId={currentId}
        loading={songsLoading}
        onLoad={handleLoadSong}
        onDelete={deleteSong}
        onNew={handleNew}
        onClose={() => setSongsOpen(false)}
      />}
      {authOpen  && <AuthModal onAuth={handleAuth} onClose={() => setAuthOpen(false)} />}
    </>
  );
}

function pad(n) { return String(n).padStart(2, '0'); }
