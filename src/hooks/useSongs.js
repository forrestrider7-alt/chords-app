import { useState, useCallback } from 'react';
import { supabase, isConfigured } from '../lib/supabase';

export function useSongs(user) {
  const [songs, setSongs]     = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isConfigured || !user) { setSongs([]); return []; }
    setLoading(true);
    const { data, error } = await supabase
      .from('songs')
      .select('id,title,body,tone,created_at,updated_at')
      .order('updated_at', { ascending: false });
    if (error) { console.error('useSongs.load:', error); }
    else setSongs(data ?? []);
    setLoading(false);
    return data ?? [];
  }, [user]);

  // Returns { data, error } so callers can surface failures in the UI
  const save = useCallback(async ({ id, title, body, tone }) => {
    if (!isConfigured) return { data: null, error: new Error('Supabase не настроен — добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env') };
    if (!user)         return { data: null, error: new Error('Не выполнен вход') };

    if (id) {
      const { data, error } = await supabase
        .from('songs')
        .update({ title, body, tone, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) { console.error('useSongs.save (update):', error); return { data: null, error }; }
      setSongs(prev => prev.map(s => s.id === id ? data : s));
      return { data, error: null };
    } else {
      const { data, error } = await supabase
        .from('songs')
        .insert({ title, body, tone, user_id: user.id })
        .select()
        .single();
      if (error) { console.error('useSongs.save (insert):', error); return { data: null, error }; }
      setSongs(prev => [data, ...prev]);
      return { data, error: null };
    }
  }, [user]);

  const remove = useCallback(async (id) => {
    if (!isConfigured || !user) return;
    const { error } = await supabase.from('songs').delete().eq('id', id);
    if (error) { console.error('useSongs.remove:', error); return; }
    setSongs(prev => prev.filter(s => s.id !== id));
  }, [user]);

  return { songs, loading, load, save, remove };
}
