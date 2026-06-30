import { useState, useEffect, useCallback } from 'react';
import { supabase, Profile } from '@/lib/supabase';
import { useAuth } from '@/context/auth';

export type Friend = {
  friendshipId: string;
  profile: Profile;
  status: 'pending' | 'accepted';
  direction: 'incoming' | 'outgoing';
};

export function useFriends() {
  const { user } = useAuth();
  const [friends,  setFriends]  = useState<Friend[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user) return;
    loadFriends();
  }, [user]);

  async function loadFriends() {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('friendships')
      .select(`
        id, status, requester_id, addressee_id,
        requester:profiles!friendships_requester_id_fkey(*),
        addressee:profiles!friendships_addressee_id_fkey(*)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (data) {
      const mapped: Friend[] = data.map((row: any) => {
        const isRequester = row.requester_id === user.id;
        return {
          friendshipId: row.id,
          profile: isRequester ? row.addressee : row.requester,
          status: row.status,
          direction: isRequester ? 'outgoing' : 'incoming',
        };
      });
      setFriends(mapped);
    }
    setLoading(false);
  }

  // Search for a user by exact username
  const findByUsername = useCallback(async (username: string): Promise<Profile | null> => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username.trim())
      .neq('id', user?.id)
      .single();
    return data as Profile | null;
  }, [user]);

  // Send a friend request
  const sendRequest = useCallback(async (addresseeId: string): Promise<string | null> => {
    // Check if friendship already exists
    const existing = friends.find(f => f.profile.id === addresseeId);
    if (existing) return 'Already sent or already friends.';

    const { error } = await supabase
      .from('friendships')
      .insert({ requester_id: user!.id, addressee_id: addresseeId });

    if (error) return error.message;
    await loadFriends();
    return null;
  }, [user, friends]);

  // Accept an incoming request
  const acceptRequest = useCallback(async (friendshipId: string): Promise<void> => {
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);
    await loadFriends();
  }, []);

  // Decline or remove a friendship
  const removeFriend = useCallback(async (friendshipId: string): Promise<void> => {
    await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);
    await loadFriends();
  }, []);

  const accepted = friends.filter(f => f.status === 'accepted');
  const incoming = friends.filter(f => f.status === 'pending' && f.direction === 'incoming');
  const outgoing = friends.filter(f => f.status === 'pending' && f.direction === 'outgoing');

  return { friends, accepted, incoming, outgoing, loading, findByUsername, sendRequest, acceptRequest, removeFriend, loadFriends };
}
