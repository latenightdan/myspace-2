import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://hafwuabdvlurgkjcaztf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhZnd1YWJkdmx1cmdramNhenRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NjcyMzYsImV4cCI6MjA5ODM0MzIzNn0.dU6rkPZLy0Lq4gf_76OG8yYEx9eKE309cHhfgTVpeKg';

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
