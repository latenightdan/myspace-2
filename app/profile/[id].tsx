import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Image, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  SpecialElite_400Regular,
} from '@expo-google-fonts/special-elite';
import { PermanentMarker_400Regular } from '@expo-google-fonts/permanent-marker';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import { Oswald_700Bold } from '@expo-google-fonts/oswald';
import { Lobster_400Regular } from '@expo-google-fonts/lobster';
import { Bangers_400Regular } from '@expo-google-fonts/bangers';
import { Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import { Creepster_400Regular } from '@expo-google-fonts/creepster';
import { Righteous_400Regular } from '@expo-google-fonts/righteous';
import { MetalMania_400Regular } from '@expo-google-fonts/metal-mania';

import { supabase, Profile, PostRow } from '@/lib/supabase';
import {
  FrutigerAeroBg, EmoCheckerBg, SkullHeartsBg, PinkSparkleBg, PATTERN_COMPONENTS,
} from '@/components/ProfileBackground';
import { FONT_OPTIONS, BACKGROUND_PHOTO_OPTIONS } from '@/constants/profile-options';

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts,   setPosts]   = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    SpecialElite_400Regular, PermanentMarker_400Regular, PressStart2P_400Regular,
    Pacifico_400Regular, Oswald_700Bold, Lobster_400Regular, Bangers_400Regular,
    Orbitron_700Bold, DancingScript_700Bold, Creepster_400Regular, Righteous_400Regular,
    MetalMania_400Regular,
  });

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('posts').select('*').eq('user_id', id).order('position', { ascending: true }),
    ]).then(([{ data: p }, { data: ps }]) => {
      if (p) setProfile(p as Profile);
      if (ps) setPosts(ps as PostRow[]);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#fff" size="large" /></View>;
  }

  if (!profile) {
    return <View style={styles.center}><Text style={styles.errorText}>Profile not found.</Text></View>;
  }

  const accent = profile.accent_color ?? '#ffffff';
  const fontOption = FONT_OPTIONS.find(f => f.id === profile.font_id);
  const activeFont = fontOption?.family && fontsLoaded ? fontOption.family : undefined;
  const photoBg = BACKGROUND_PHOTO_OPTIONS.find(b => b.id === profile.bg_id);
  const BgComponent = profile.bg_id ? PATTERN_COMPONENTS[profile.bg_id] : undefined;
  const isDefaultBg = !profile.bg_id && !profile.custom_bg_url;

  function withFont(...styles: any[]) {
    return [...styles, activeFont ? { fontFamily: activeFont } : {}];
  }

  return (
    <View style={styles.bg}>
      {/* ── background ── */}
      {isDefaultBg && <FrutigerAeroBg />}
      {profile.custom_bg_url && (
        <Image source={{ uri: profile.custom_bg_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      {BgComponent && <BgComponent />}
      {photoBg && !BgComponent && !profile.custom_bg_url && (
        <Image source={{ uri: photoBg.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,20,0.35)' }]} />

      {/* back button */}
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={[styles.backText, { color: accent }]}>← Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* avatar */}
        <View style={[styles.avatarRing, { borderColor: accent }]}>
          {profile.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            : <View style={[styles.avatar, { backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 30 }}>👤</Text>
              </View>
          }
        </View>

        {/* username */}
        <Text style={withFont(styles.username, { color: '#fff' })}>{profile.username ?? 'No name'}</Text>

        {/* song bar */}
        {profile.profile_song && (
          <View style={[styles.songBar, { borderColor: accent + '44' }]}>
            <Image source={{ uri: (profile.profile_song as any).albumArt }} style={styles.songArt} />
            <View style={{ flex: 1 }}>
              <Text style={styles.songName} numberOfLines={1}>{(profile.profile_song as any).name}</Text>
              <Text style={styles.songArtist} numberOfLines={1}>{(profile.profile_song as any).artists}</Text>
            </View>
            <Text style={{ fontSize: 16 }}>🎵</Text>
          </View>
        )}

        {/* about me */}
        {profile.bio ? (
          <View style={[styles.aboutBox, { borderColor: accent + '88', backgroundColor: 'rgba(0,0,0,0.45)' }]}>
            <Text style={[styles.aboutLabel, { color: accent }]}>About Me</Text>
            <Text style={[styles.bioText, activeFont ? { fontFamily: activeFont } : {}]}>{profile.bio}</Text>
          </View>
        ) : null}

        {/* posts */}
        {posts.map(post => (
          <View key={post.id} style={[styles.post, { borderColor: accent + '55', backgroundColor: 'rgba(0,0,0,0.35)' }]}>
            <Text style={withFont(styles.postDate, { color: accent })}>{post.date}</Text>
            {post.type === 'image' && post.uri &&
              <Image source={{ uri: post.uri }} style={styles.postImage} resizeMode="cover" />
            }
            {post.type === 'text' && post.text &&
              <Text style={withFont(styles.postText, { color: accent })}>{post.text}</Text>
            }
          </View>
        ))}

        {posts.length === 0 && (
          <Text style={styles.noPosts}>No posts yet.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#fff', fontSize: 16 },
  back: { position: 'absolute', top: 56, left: 16, zIndex: 10 },
  backText: { fontSize: 16, fontWeight: '700' },
  scroll: { paddingTop: 100, paddingBottom: 100, alignItems: 'center', gap: 16, paddingHorizontal: 12 },
  avatarRing: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, overflow: 'hidden', marginBottom: 8 },
  avatar: { width: '100%', height: '100%' },
  username: {
    fontSize: 28, fontWeight: '900', letterSpacing: 1,
    textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4,
  },
  songBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 12, gap: 10,
    width: '100%', borderWidth: 1,
  },
  songArt: { width: 38, height: 38, borderRadius: 4 },
  songName: { color: '#fff', fontSize: 13, fontWeight: '700' },
  songArtist: { color: '#aaa', fontSize: 11 },
  aboutBox: { width: '100%', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, gap: 6 },
  aboutLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  bioText: { color: '#ddd', fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  post: { width: '100%', borderWidth: 1, borderRadius: 10, padding: 10, gap: 8 },
  postDate: { fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  postImage: { width: '100%', height: 220, borderRadius: 6 },
  postText: { fontSize: 18, fontWeight: '700', lineHeight: 26 },
  noPosts: { color: '#555', fontStyle: 'italic', marginTop: 40 },
});
