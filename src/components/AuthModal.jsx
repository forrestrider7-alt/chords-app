import { useState } from 'react';

export default function AuthModal({ onAuth, onClose }) {
  const [mode,    setMode]    = useState('login');
  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');
  const [error,   setError]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  function handleClose() {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 150);
  }

  async function submit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    const err = await onAuth(mode, email, pass);
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (mode === 'magic') { setSent(true); return; }
    handleClose();
  }

  return (
    <div
      className={`overlay open${closing ? ' closing' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="modal" style={{ width: 420 }}>
        <div className="modal-hdr">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="modal-jp">ログイン</span>
            <span className="modal-ru">ВХОД · РЕГИСТРАЦИЯ</span>
          </div>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>

        <div style={{ padding: '20px 22px' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontFamily: "'Shippori Mincho B1', serif", fontSize: 28, color: 'var(--dark)', marginBottom: 12 }}>
                メールを確認
              </div>
              <div style={{ fontSize: 13, color: 'rgba(23,19,15,.7)' }}>
                Ссылка для входа отправлена на <strong>{email}</strong>. Проверьте почту.
              </div>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="auth-tabs">
                {['login','signup','magic'].map(m => (
                  <button
                    key={m}
                    type="button"
                    className={`auth-tab${mode === m ? ' active' : ''}`}
                    onClick={() => { setMode(m); setError(''); }}
                  >
                    {m === 'login' ? 'Войти' : m === 'signup' ? 'Регистрация' : 'Magic Link'}
                  </button>
                ))}
              </div>

              <div className="auth-field">
                <label className="ctrl-label">E-MAIL</label>
                <input
                  className="song-input" type="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  style={{ width: '100%' }} placeholder="you@example.com"
                />
              </div>

              {mode !== 'magic' && (
                <div className="auth-field">
                  <label className="ctrl-label">ПАРОЛЬ</label>
                  <input
                    className="song-input" type="password" required
                    value={pass} onChange={e => setPass(e.target.value)}
                    style={{ width: '100%' }} placeholder="••••••••"
                    minLength={6}
                  />
                </div>
              )}

              {error && <div className="auth-error">{error}</div>}

              <button className="act-btn-red" type="submit" disabled={loading}
                style={{ width: '100%', marginTop: 16, padding: '12px 0' }}
              >
                {loading ? '…' : mode === 'login' ? 'ВОЙТИ' : mode === 'signup' ? 'ЗАРЕГИСТРИРОВАТЬСЯ' : 'ОТПРАВИТЬ ССЫЛКУ'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
