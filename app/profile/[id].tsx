import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Image, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, Profile, PostRow } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts,   setPosts]   = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

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
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Profile not found.</Text>
      </View>
    );
  }

  const accent = profile.accent_color ?? '#ffffff';

  return (
    <View style={styles.bg}>
      {/* background */}
      {profile.custom_bg_url
        ? <Image source={{ uri: profile.custom_bg_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        : <LinearGradient colors={['#a8d8f0', '#4db8a4', '#a8d878']} style={StyleSheet.absoluteFill} />
      }
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,30,0.45)' }]} />

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
        <Text style={[styles.username, { color: '#fff' }]}>{profile.username ?? 'No name'}</Text>

        {/* about me */}
        {profile.bio ? (
          <View style={[styles.aboutBox, { borderColor: accent + '88', backgroundColor: 'rgba(0,0,0,0.45)' }]}>
            <Text style={[styles.aboutLabel, { color: accent }]}>About Me</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        ) : null}

        {/* posts */}
        {posts.map(post => (
          <View key={post.id} style={[styles.post, { borderColor: accent + '55', backgroundColor: 'rgba(0,0,0,0.35)' }]}>
            <Text style={[styles.postDate, { color: accent }]}>{post.date}</Text>
            {post.type === 'image' && post.uri &&
              <Image source={{ uri: post.uri }} style={styles.postImage} resizeMode="cover" />
            }
            {post.type === 'text' && post.text &&
              <Text style={[styles.postText, { color: accent }]}>{post.text}</Text>
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
  avatarRing: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 3, overflow: 'hidden', marginBottom: 8,
  },
  avatar: { width: '100%', height: '100%' },
  username: {
    fontSize: 28, fontWeight: '900', letterSpacing: 1,
    textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4,
  },
  aboutBox: {
    width: '100%', borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, gap: 6,
  },
  aboutLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  bioText: { color: '#ddd', fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  post: {
    width: '100%', borderWidth: 1, borderRadius: 10,
    padding: 10, gap: 8,
  },
  postDate: { fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  postImage: { width: '100%', height: 220, borderRadius: 6 },
  postText: { fontSize: 18, fontWeight: '700', lineHeight: 26 },
  noPosts: { color: '#555', fontStyle: 'italic', marginTop: 40 },
});
