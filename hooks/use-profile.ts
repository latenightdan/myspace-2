import { useState, useEffect, useCallback } from 'react';
import { supabase, Profile, PostRow } from '@/lib/supabase';
import { useAuth } from '@/context/auth';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts,   setPosts]   = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ── load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    loadProfile();
    loadPosts();
  }, [user]);

  async function loadProfile() {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) setProfile(data as Profile);
    setLoading(false);
  }

  async function loadPosts() {
    if (!user) return;
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true });
    if (data) setPosts(data as PostRow[]);
  }

  // ── save profile field(s) ─────────────────────────────────────────────────
  const saveProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return;
    setProfile(prev => prev ? { ...prev, ...updates } : null);
    await supabase.from('profiles').update(updates).eq('id', user.id);
  }, [user]);

  // ── posts ─────────────────────────────────────────────────────────────────
  const addPost = useCallback(async (post: Omit<PostRow, 'id' | 'user_id' | 'created_at' | 'position'>) => {
    if (!user) return;
    const position = 0;
    // shift existing posts down
    await supabase.rpc('increment_post_positions', { uid: user.id });
    const { data } = await supabase
      .from('posts')
      .insert({ ...post, user_id: user.id, position })
      .select()
      .single();
    if (data) setPosts(prev => [data as PostRow, ...prev]);
  }, [user]);

  const deletePost = useCallback(async (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
    await supabase.from('posts').delete().eq('id', id);
  }, []);

  const reorderPosts = useCallback(async (reordered: PostRow[]) => {
    setPosts(reordered);
    // update positions in background
    await Promise.all(
      reordered.map((p, i) =>
        supabase.from('posts').update({ position: i }).eq('id', p.id)
      )
    );
  }, []);

  return { profile, posts, loading, saveProfile, addPost, deletePost, reorderPosts, loadProfile };
}
