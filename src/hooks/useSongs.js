import { useState, useCallback } from 'react';
import { supabase, isConfigured } from '../lib/supabase';

export function useSongs(user) {
  const [songs, setSongs]     = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isConfigured || !user) { setSongs([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('songs')
      .select('id,title,body,tone,created_at,updated_at')
      .order('updated_at', { ascending: false });
    if (!error) setSongs(data ?? []);
    setLoading(false);
    return data;
  }, [user]);

  const save = useCallback(async ({ id, title, body, tone }) => {
    if (!isConfigured || !user) return null;
    if (id) {
      const { data, error } = await supabase
        .from('songs')
        .update({ title, body, tone, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (!error) {
        setSongs(prev => prev.map(s => s.id === id ? data : s));
        return data;
      }
      return null;
    } else {
      const { data, error } = await supabase
        .from('songs')
        .insert({ title, body, tone, user_id: user.id })
        .select()
        .single();
      if (!error) {
        setSongs(prev => [data, ...prev]);
        return data;
      }
      return null;
    }
  }, [user]);

  const remove = useCallback(async (id) => {
    if (!isConfigured || !user) return;
    await supabase.from('songs').delete().eq('id', id);
    setSongs(prev => prev.filter(s => s.id !== id));
  }, [user]);

  return { songs, loading, load, save, remove };
}
