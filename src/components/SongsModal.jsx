import { useState, useEffect } from 'react';

export default function SongsModal({ songs, currentId, loading, onLoad, onDelete, onNew, onClose }) {
  const [closing, setClosing] = useState(false);
  const [songsVisible, setSongsVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSongsVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  function handleClose() {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 150);
  }

  return (
    <div
      className={`overlay open${closing ? ' closing' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="modal" style={{ width: 580 }}>
        <div className="modal-hdr">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="modal-jp">曲の棚</span>
            <span className="modal-ru">МОИ ПЕСНИ · {songs.length}</span>
          </div>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>

        <div className="modal-body" style={!songsVisible ? { minHeight: 160 } : {}}>
          {songsVisible && loading && <div className="songs-loading">Загрузка…</div>}

          {songsVisible && !loading && songs.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon"><div className="empty-icon-dot" /></div>
              <div className="empty-jp">まだ空っぽ</div>
              <div className="empty-ru">Пока пусто. Напишите первую песню — она появится здесь.</div>
            </div>
          )}

          {songsVisible && songs.map((song, index) => {
            const isActive = song.id === currentId;
            const d = new Date(song.updated_at || song.created_at);
            const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }).toUpperCase();
            return (
              <div
                key={song.id}
                className={`song-item${isActive ? ' cur' : ''}`}
                style={{ '--item-index': index }}
                onClick={() => { onLoad(song); handleClose(); }}
              >
                <div
                  className="s-dot"
                  style={{
                    background: isActive ? 'var(--red)' : 'transparent',
                    border: `2px solid ${isActive ? 'var(--red)' : 'var(--dark)'}`,
                  }}
                />
                <div className="s-info">
                  <div className="s-name">{song.title || 'Без названия'}</div>
                  <div className="s-meta">{dateStr} · ТОН {song.tone || '?'}</div>
                </div>
                {isActive && <div className="s-badge">ОТКРЫТА</div>}
                <button
                  className="s-del"
                  onClick={e => { e.stopPropagation(); onDelete(song.id); }}
                >✕</button>
              </div>
            );
          })}
        </div>

        <div className="modal-foot">
          <div className="modal-foot-lbl">ХРАНИТСЯ В SUPABASE</div>
          <button className="act-btn-red" onClick={() => { onNew(); handleClose(); }}>
            НОВАЯ ПЕСНЯ
          </button>
        </div>
      </div>
    </div>
  );
}
