export default function SongsModal({ songs, currentId, loading, onLoad, onDelete, onNew, onClose }) {
  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ov-dots" style={{ pointerEvents: 'none' }} />
      <div className="modal" style={{ width: 580 }}>
        <div className="modal-hdr">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="modal-jp">曲の棚</span>
            <span className="modal-ru">МОИ ПЕСНИ · {songs.length}</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {loading && <div className="songs-loading">Загрузка…</div>}

          {!loading && songs.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon"><div className="empty-icon-dot" /></div>
              <div className="empty-jp">まだ空っぽ</div>
              <div className="empty-ru">Пока пусто. Напишите первую песню — она появится здесь.</div>
            </div>
          )}

          {songs.map(song => {
            const isActive = song.id === currentId;
            const d = new Date(song.updated_at || song.created_at);
            const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }).toUpperCase();
            return (
              <div
                key={song.id}
                className={`song-item${isActive ? ' cur' : ''}`}
                onClick={() => { onLoad(song); onClose(); }}
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
          <button className="act-btn-red" onClick={() => { onNew(); onClose(); }}>
            НОВАЯ ПЕСНЯ
          </button>
        </div>
      </div>
    </div>
  );
}
