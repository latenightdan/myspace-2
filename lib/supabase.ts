import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://hafwuabdvlurgkjcaztf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sLGi72SnfhFhcDbh8F2Eog_Pa4dJpJX';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Profile = {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  bg_id: string | null;
  custom_bg_url: string | null;
  font_id: string | null;
  accent_color: string | null;
  animation_type: string | null;
  profile_song: {
    id: string;
    name: string;
    artists: string;
    albumArt: string;
    previewUrl: string | null;
  } | null;
  top8: string[];
  created_at: string;
};

export type PostRow = {
  id: string;
  user_id: string;
  type: 'image' | 'video' | 'text';
  uri: string | null;
  text: string | null;
  date: string;
  position: number;
  created_at: string;
};
