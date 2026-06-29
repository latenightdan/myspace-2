import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, StyleSheet, TouchableOpacity,
  ImageBackground, Dimensions, Modal, FlatList, Pressable,
  Alert, TextInput, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useFonts, SpecialElite_400Regular } from '@expo-google-fonts/special-elite';
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
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { SongPicker } from '@/components/SongPicker';
import { SpotifyTrack } from '@/hooks/use-spotify';

const { width } = Dimensions.get('window');
const POST_WIDTH = width - 24;
const VIDEO_HEIGHT = Math.round(POST_WIDTH * (9 / 16));

// ── colour palette ────────────────────────────────────────────────────────────
const COLOR_OPTIONS = [
  { id: 'yellow',  hex: '#ffe600' },
  { id: 'white',   hex: '#ffffff' },
  { id: 'pink',    hex: '#ff69b4' },
  { id: 'cyan',    hex: '#00eaff' },
  { id: 'lime',    hex: '#39ff14' },
  { id: 'orange',  hex: '#ff6600' },
  { id: 'purple',  hex: '#c84bff' },
  { id: 'red',     hex: '#ff2222' },
  { id: 'mint',    hex: '#00ffb3' },
  { id: 'peach',   hex: '#ffb347' },
];

// ── types ─────────────────────────────────────────────────────────────────────
type Post =
  | { id: string; date: string; type: 'image'; uri: string }
  | { id: string; date: string; type: 'video'; uri: string }
  | { id: string; date: string; type: 'text';  text: string };

function todayLabel() {
  return new Date()
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase();
}

// ── FloatingElements ──────────────────────────────────────────────────────────
type AnimationType = 'none' | 'music' | 'stars' | 'hearts' | 'mixed';

const ANIM_OPTIONS: { id: AnimationType; label: string; symbols: string[] }[] = [
  { id: 'none',   label: '🚫  Off',         symbols: [] },
  { id: 'music',  label: '🎵  Music Notes',  symbols: ['♪', '♫', '♩', '♬', '♪', '♫', '♩', '♬'] },
  { id: 'stars',  label: '⭐  Stars',        symbols: ['★', '✦', '✧', '⭐', '★', '✦', '✧', '⭐'] },
  { id: 'hearts', label: '❤️  Hearts',       symbols: ['♥', '❤', '♡', '💕', '♥', '❤', '♡', '💕'] },
  { id: 'mixed',  label: '✨  Mixed',        symbols: ['♪', '★', '♥', '✦', '♫', '⭐', '❤', '♩'] },
];

function FloatingElements({ accentColor, type }: { accentColor: string; type: AnimationType }) {
  const symbols = ANIM_OPTIONS.find(a => a.id === type)?.symbols ?? [];

  // Always create 8 slots so the ref never changes size between renders
  const anims = useRef(
    Array.from({ length: 8 }, () => ({
      y: new Animated.Value(0),
      x: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (symbols.length === 0) return;
    const loops = anims.map((anim, i) => {
      const delay = i * 700;
      const duration = 5000 + (i % 3) * 1500;

      function run() {
        anim.y.setValue(Math.random() * 200 + 700);
        anim.x.setValue(Math.random() * (width - 40));
        anim.opacity.setValue(0);
        Animated.parallel([
          Animated.timing(anim.y, { toValue: -60, duration, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(anim.opacity, { toValue: 0.75, duration: 600, useNativeDriver: true }),
            Animated.delay(duration - 1200),
            Animated.timing(anim.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
        ]).start(({ finished }) => { if (finished) run(); });
      }

      const t = setTimeout(run, delay);
      return t;
    });
    return () => loops.forEach(clearTimeout);
  }, [type]);

  if (symbols.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {symbols.map((sym, i) => (
        <Animated.Text
          key={`${type}-${i}`}
          style={{
            position: 'absolute',
            fontSize: 18 + (i % 3) * 6,
            color: accentColor,
            opacity: anims[i].opacity,
            transform: [{ translateY: anims[i].y }, { translateX: anims[i].x }],
          }}
        >
          {sym}
        </Animated.Text>
      ))}
    </View>
  );
}

// ── VideoPost ─────────────────────────────────────────────────────────────────
function VideoPost({ uri, accentColor }: { uri: string; accentColor: string }) {
  const videoRef = useRef<Video>(null);
  const [playing, setPlaying] = useState(false);
  const [videoHeight, setVideoHeight] = useState<number | null>(null);

  async function toggle() {
    if (!videoRef.current) return;
    if (playing) { await videoRef.current.pauseAsync(); setPlaying(false); }
    else { await videoRef.current.playAsync(); setPlaying(true); }
  }

  function onReadyForDisplay(event: any) {
    const natW: number = event?.naturalSize?.width  ?? event?.target?.videoWidth  ?? 0;
    const natH: number = event?.naturalSize?.height ?? event?.target?.videoHeight ?? 0;
    if (natW > 0 && natH > 0) setVideoHeight(Math.round(POST_WIDTH * (natH / natW)));
  }

  function onPlaybackStatusUpdate(status: AVPlaybackStatus) {
    if (status.isLoaded && status.didJustFinish) {
      setPlaying(false);
      videoRef.current?.setPositionAsync(0);
    }
  }

  return (
    <TouchableOpacity activeOpacity={0.95} onPress={toggle}
      style={[styles.videoWrapper, { height: videoHeight ?? VIDEO_HEIGHT }]}>
      <Video ref={videoRef} source={{ uri }}
        style={[styles.videoPlayer, { objectFit: 'contain' } as any]}
        resizeMode={ResizeMode.CONTAIN}
        onReadyForDisplay={onReadyForDisplay}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        shouldPlay={false} isLooping={false} />
      {!playing && (
        <View style={styles.playOverlay}>
          <View style={[styles.playCircle, { borderColor: accentColor }]}>
            <Text style={[styles.playIcon, { color: accentColor }]}>▶</Text>
          </View>
        </View>
      )}
      {videoHeight === null && (
        <View style={StyleSheet.absoluteFill}>
          <View style={[styles.videoLoadingBar, { backgroundColor: accentColor }]} />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── data ──────────────────────────────────────────────────────────────────────
const INITIAL_POSTS: Post[] = [];

const BACKGROUND_OPTIONS = [
  { id: 'grass',  label: 'Grass & Sky', source: { uri: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600' } },
  { id: 'space',  label: 'Space',       source: { uri: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?w=600' } },
  { id: 'city',   label: 'City Night',  source: { uri: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600' } },
  { id: 'forest', label: 'Forest',      source: { uri: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600' } },
];

const FONT_OPTIONS = [
  { id: 'system',   label: 'Default',   family: undefined as string | undefined },
  { id: 'special',  label: 'Grunge',    family: 'SpecialElite_400Regular' },
  { id: 'marker',   label: 'Marker',    family: 'PermanentMarker_400Regular' },
  { id: 'pixel',    label: 'Pixel',     family: 'PressStart2P_400Regular' },
  { id: 'pacifico', label: 'Pacifico',  family: 'Pacifico_400Regular' },
  { id: 'oswald',   label: 'Oswald',    family: 'Oswald_700Bold' },
  { id: 'lobster',  label: 'Lobster',   family: 'Lobster_400Regular' },
  { id: 'bangers',  label: 'Bangers',   family: 'Bangers_400Regular' },
  { id: 'orbitron', label: 'Orbitron',  family: 'Orbitron_700Bold' },
  { id: 'dancing',  label: 'Cursive',   family: 'DancingScript_700Bold' },
  { id: 'creep',    label: 'Creepy',    family: 'Creepster_400Regular' },
  { id: 'right',    label: 'Righteous', family: 'Righteous_400Regular' },
];

// ── screen ────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  // customisation
  const [bg, setBg]                   = useState(BACKGROUND_OPTIONS[0]);
  const [customBgUri, setCustomBgUri] = useState<string | null>(null);
  const [font, setFont]               = useState(FONT_OPTIONS[0]);
  const [accentColor, setAccentColor] = useState('#ffe600');
  const [animationType, setAnimationType] = useState<AnimationType>('none');

  // modals
  const [customizeOpen,    setCustomizeOpen]    = useState(false);
  const [customizeTab,     setCustomizeTab]     = useState<'bg'|'font'|'color'>('bg');
  const [newPostModalOpen, setNewPostModalOpen] = useState(false);

  // profile
  const [avatarUri,    setAvatarUri]    = useState<string | null>(null);
  const [username,     setUsername]     = useState('');
  const [editingName,  setEditingName]  = useState(false);
  const [nameDraft,    setNameDraft]    = useState('');
  const [bio,          setBio]          = useState('');
  const [editingBio,   setEditingBio]   = useState(false);
  const [bioDraft,     setBioDraft]     = useState('');
  const [friends,      setFriends]      = useState(0); // static for now

  // posts
  const [posts,     setPosts]     = useState<Post[]>(INITIAL_POSTS);
  const [textDraft, setTextDraft] = useState('');

  // spotify
  const [profileSong,    setProfileSong]    = useState<SpotifyTrack | null>(null);
  const [songPickerOpen, setSongPickerOpen] = useState(false);
  const [songPlaying,    setSongPlaying]    = useState(false);
  const songSoundRef = useRef<Audio.Sound | null>(null);

  const [fontsLoaded] = useFonts({
    SpecialElite_400Regular, PermanentMarker_400Regular, PressStart2P_400Regular,
    Pacifico_400Regular, Oswald_700Bold, Lobster_400Regular, Bangers_400Regular,
    Orbitron_700Bold, DancingScript_700Bold, Creepster_400Regular, Righteous_400Regular,
  });
  const activeFont = font.family && fontsLoaded ? font.family : undefined;

  React.useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false, playsInSilentModeIOS: true,
      shouldDuckAndroid: true,   playThroughEarpieceAndroid: false,
    });
  }, []);

  function withFont(...style: any[]) {
    return [...style, activeFont ? { fontFamily: activeFont } : {}];
  }

  // ── handlers ────────────────────────────────────────────────────────────────
  async function toggleProfileSong() {
    if (!profileSong?.previewUrl) {
      Alert.alert('No preview', "Spotify doesn't have a 30s preview for this track.");
      return;
    }
    if (songPlaying) {
      await songSoundRef.current?.pauseAsync();
      setSongPlaying(false);
    } else {
      if (!songSoundRef.current) {
        const { sound } = await Audio.Sound.createAsync({ uri: profileSong.previewUrl });
        songSoundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((s) => {
          if (s.isLoaded && s.didJustFinish) { setSongPlaying(false); songSoundRef.current = null; }
        });
      }
      await songSoundRef.current.playAsync();
      setSongPlaying(true);
    }
  }

  async function requestPermission() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo/video access in Settings.'); return false; }
    return true;
  }

  async function pickAvatar() {
    if (!(await requestPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  }

  async function pickCustomBg() {
    if (!(await requestPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9 });
    if (!result.canceled) { setCustomBgUri(result.assets[0].uri); setCustomizeOpen(false); }
  }

  async function pickPhoto() {
    if (!(await requestPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9 });
    if (!result.canceled) {
      setPosts(p => [{ id: Date.now().toString(), date: todayLabel(), type: 'image', uri: result.assets[0].uri }, ...p]);
      setNewPostModalOpen(false);
    }
  }

  async function pickVideo() {
    if (!(await requestPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false, videoMaxDuration: 120, quality: 1 });
    if (!result.canceled) {
      setPosts(p => [{ id: Date.now().toString(), date: todayLabel(), type: 'video', uri: result.assets[0].uri }, ...p]);
      setNewPostModalOpen(false);
    }
  }

  function submitText() {
    const trimmed = textDraft.trim();
    if (!trimmed) return;
    setPosts(p => [{ id: Date.now().toString(), date: todayLabel(), type: 'text', text: trimmed.toUpperCase() }, ...p]);
    setTextDraft('');
    setNewPostModalOpen(false);
  }

  function deletePost(id: string) {
    Alert.alert('Delete post?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setPosts(p => p.filter(x => x.id !== id)) },
    ]);
  }

  function movePost(id: string, dir: -1 | 1) {
    setPosts(p => {
      const idx = p.findIndex(x => x.id === id);
      const next = idx + dir;
      if (next < 0 || next >= p.length) return p;
      const arr = [...p];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <ImageBackground source={customBgUri ? { uri: customBgUri } : bg.source} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <FloatingElements accentColor={accentColor} type={animationType} />

      {/* toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolBtn, { borderColor: accentColor }]}
          onPress={() => { setCustomizeTab('bg'); setCustomizeOpen(true); }}
        >
          <Text style={[styles.toolBtnText, { color: accentColor }]}>✏️  Customize</Text>
        </TouchableOpacity>
      </View>

      {/* new post FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: accentColor }]} onPress={() => setNewPostModalOpen(true)} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── profile header ── */}
        <View style={styles.header}>

          {/* avatar */}
          <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85}>
            <View style={[styles.avatarRing, { borderColor: accentColor }]}>
              <Image source={{ uri: avatarUri ?? 'https://picsum.photos/seed/jimmy/200/200' }} style={styles.avatar} />
            </View>
            <View style={[styles.editBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.editBadgeText}>✎</Text>
            </View>
          </TouchableOpacity>

          {/* friends count */}
          <TouchableOpacity style={styles.friendsRow}>
            <Text style={[styles.friendsCount, { color: accentColor }]}>{friends}</Text>
            <Text style={styles.friendsLabel}>friends</Text>
          </TouchableOpacity>

          {/* song bar */}
          <View style={[styles.songBar, { borderColor: accentColor + '44' }]}>
            {profileSong ? (
              <>
                <Image source={{ uri: profileSong.albumArt }} style={styles.songArt} />
                <View style={styles.songInfo}>
                  <Text style={styles.songName} numberOfLines={1}>{profileSong.name}</Text>
                  <Text style={styles.songArtist} numberOfLines={1}>{profileSong.artists}</Text>
                </View>
                <TouchableOpacity onPress={toggleProfileSong} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={[styles.songToggle, { color: accentColor }]}>{songPlaying ? '⏸' : '▶'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => setSongPickerOpen(true)}>
                <Text style={styles.songAdd}>🎵</Text>
                <Text style={styles.songAddText}>Add a profile song</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setSongPickerOpen(true)} style={styles.songEdit}>
              <Text style={[styles.songEditText, { color: accentColor }]}>✎</Text>
            </TouchableOpacity>
          </View>

          {/* name */}
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={[styles.nameInput, { borderBottomColor: accentColor }, activeFont ? { fontFamily: activeFont } : {}]}
                value={nameDraft} onChangeText={setNameDraft} autoFocus maxLength={30}
                returnKeyType="done"
                onSubmitEditing={() => { setUsername(nameDraft); setEditingName(false); }}
                onBlur={() => { setUsername(nameDraft); setEditingName(false); }}
                selectionColor={accentColor}
              />
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setNameDraft(username); setEditingName(true); }}>
              {username
                ? <Text style={withFont(styles.username, { color: '#fff' })}>{username} <Text style={[styles.nameEditHint, { color: accentColor }]}>✎</Text></Text>
                : <Text style={[styles.usernamePlaceholder, { color: accentColor }]}>+ add your name</Text>
              }
            </TouchableOpacity>
          )}

          {/* about me box */}
          <View style={[styles.aboutBox, { borderColor: accentColor + '88', backgroundColor: 'rgba(0,0,0,0.45)' }]}>
            <Text style={[styles.aboutLabel, { color: accentColor }]}>About Me</Text>
            {editingBio ? (
              <TextInput
                style={[styles.bioInput, { borderColor: accentColor + '66' }]}
                value={bioDraft} onChangeText={setBioDraft} autoFocus multiline
                maxLength={150} placeholder="Write something about yourself..."
                placeholderTextColor="#555" returnKeyType="done"
                onSubmitEditing={() => { setBio(bioDraft); setEditingBio(false); }}
                onBlur={() => { setBio(bioDraft); setEditingBio(false); }}
                selectionColor={accentColor}
              />
            ) : (
              <TouchableOpacity onPress={() => { setBioDraft(bio); setEditingBio(true); }}>
                <Text style={[styles.bioText, { color: bio ? '#ddd' : '#666' }]}>
                  {bio || 'tap to add a bio...'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── posts ── */}
        {posts.map((post, idx) => (
          <View key={post.id} style={[styles.post, { borderColor: accentColor + '55', backgroundColor: 'rgba(0,0,0,0.35)' }]}>
            {/* post header row */}
            <View style={styles.postHeader}>
              <Text style={withFont(styles.date, { color: accentColor })}>{post.date}</Text>
              <View style={styles.postActions}>
                <TouchableOpacity onPress={() => movePost(post.id, -1)} disabled={idx === 0} style={{ opacity: idx === 0 ? 0.2 : 1 }}>
                  <Text style={[styles.postActionText, { color: accentColor }]}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => movePost(post.id, 1)} disabled={idx === posts.length - 1} style={{ opacity: idx === posts.length - 1 ? 0.2 : 1 }}>
                  <Text style={[styles.postActionText, { color: accentColor }]}>▼</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deletePost(post.id)}>
                  <Text style={styles.postDeleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {post.type === 'image' && <Image source={{ uri: post.uri }} style={styles.postImage} resizeMode="cover" />}
            {post.type === 'video' && <VideoPost uri={post.uri} accentColor={accentColor} />}
            {post.type === 'text'  && <Text style={withFont(styles.postText, { color: accentColor })}>{post.text}</Text>}
          </View>
        ))}
      </ScrollView>

      {/* ── new post modal ── */}
      <Modal visible={newPostModalOpen} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setNewPostModalOpen(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New Post</Text>
            <View style={styles.postTypeRow}>
              <TouchableOpacity style={styles.postTypeBtn} onPress={pickPhoto}>
                <Text style={styles.postTypeIcon}>🖼️</Text>
                <Text style={styles.postTypeLabel}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.postTypeBtn} onPress={pickVideo}>
                <Text style={styles.postTypeIcon}>🎬</Text>
                <Text style={styles.postTypeLabel}>Video</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.textPostRow}>
              <TextInput
                style={styles.textInput} placeholder="Write something..." placeholderTextColor="#666"
                value={textDraft} onChangeText={setTextDraft} multiline maxLength={280}
              />
              <TouchableOpacity style={[styles.postSubmitBtn, { backgroundColor: accentColor }, !textDraft.trim() && { opacity: 0.4 }]}
                onPress={submitText} disabled={!textDraft.trim()}>
                <Text style={styles.postSubmitText}>POST</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── customize modal ── */}
      <Modal visible={customizeOpen} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setCustomizeOpen(false)} />
        <View style={styles.sheet}>
          {/* header */}
          <View style={styles.customizeHeader}>
            <Text style={styles.sheetTitle}>Customize Profile</Text>
            <TouchableOpacity onPress={() => setCustomizeOpen(false)}>
              <Text style={styles.customizeClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* tabs */}
          <View style={styles.tabRow}>
            {(['bg', 'font', 'color'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, customizeTab === tab && { borderBottomColor: accentColor, borderBottomWidth: 2 }]}
                onPress={() => setCustomizeTab(tab)}
              >
                <Text style={[styles.tabText, customizeTab === tab && { color: accentColor }]}>
                  {tab === 'bg' ? '🖼  Background' : tab === 'font' ? '🔤  Font' : '🎨  Color'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* bg tab */}
          {customizeTab === 'bg' && (
            <View style={{ gap: 12 }}>
              <TouchableOpacity style={[styles.uploadBgBtn, { borderColor: accentColor }]} onPress={pickCustomBg}>
                <Text style={styles.uploadBgIcon}>🖼️</Text>
                <Text style={[styles.uploadBgText, { color: accentColor }]}>Upload from Camera Roll</Text>
              </TouchableOpacity>
              <Text style={styles.sheetSubtitle}>Presets</Text>
              <FlatList data={BACKGROUND_OPTIONS} horizontal keyExtractor={i => i.id}
                contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => { setBg(item); setCustomBgUri(null); }}
                    style={[styles.bgThumb, !customBgUri && bg.id === item.id && { borderColor: accentColor }]}
                  >
                    <Image source={item.source} style={styles.bgThumbImg} resizeMode="cover" />
                    <Text style={styles.bgThumbLabel}>{item.label}</Text>
                  </TouchableOpacity>
                )} />
              <Text style={styles.sheetSubtitle}>Profile Animation</Text>
              <View style={styles.animGrid}>
                {ANIM_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setAnimationType(opt.id)}
                    style={[styles.animChip, animationType === opt.id && { borderColor: accentColor, backgroundColor: accentColor + '22' }]}
                  >
                    <Text style={[styles.animChipText, animationType === opt.id && { color: accentColor }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* font tab */}
          {customizeTab === 'font' && (
            <ScrollView contentContainerStyle={styles.fontGrid} showsVerticalScrollIndicator={false}>
              {FONT_OPTIONS.map(f => (
                <TouchableOpacity key={f.id} onPress={() => setFont(f)}
                  style={[styles.fontChip, font.id === f.id && { borderColor: accentColor }]}>
                  <Text style={[styles.fontChipText, f.family && fontsLoaded ? { fontFamily: f.family } : {}, f.id === 'pixel' ? { fontSize: 11 } : {}]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* color tab */}
          {customizeTab === 'color' && (
            <View style={{ gap: 8 }}>
              <Text style={styles.sheetSubtitle}>Applied to text, buttons & UI</Text>
              <View style={styles.colorGrid}>
                {COLOR_OPTIONS.map(c => (
                  <TouchableOpacity key={c.id} onPress={() => setAccentColor(c.hex)}
                    style={[styles.colorSwatch, { backgroundColor: c.hex }, accentColor === c.hex && styles.colorSwatchActive]}>
                    {accentColor === c.hex && <Text style={styles.colorCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </Modal>

      <SongPicker visible={songPickerOpen} onClose={() => setSongPickerOpen(false)}
        onSelect={(track) => {
          setProfileSong(track); setSongPlaying(false);
          songSoundRef.current?.unloadAsync(); songSoundRef.current = null;
        }} />
    </ImageBackground>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,40,0.18)' },

  toolbar: { position: 'absolute', top: 56, right: 16, zIndex: 10, flexDirection: 'row', gap: 8 },
  toolBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1,
  },
  toolBtnText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  customizeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  customizeClose: { color: '#888', fontSize: 18, fontWeight: '600' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#222', marginHorizontal: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { color: '#666', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  fab: {
    position: 'absolute', bottom: 90, right: 20, zIndex: 10,
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 8,
  },
  fabText: { fontSize: 30, color: '#000', fontWeight: '700', lineHeight: 34 },

  scroll: { paddingTop: 80, paddingBottom: 120, alignItems: 'center' },

  header: { alignItems: 'center', marginBottom: 28 },

  avatarRing: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 3, overflow: 'hidden', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
  },
  avatar: { width: '100%', height: '100%' },
  editBadge: {
    position: 'absolute', bottom: 4, right: 0,
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000',
  },
  editBadgeText: { fontSize: 14, color: '#000', fontWeight: '700' },

  friendsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4, marginBottom: 8 },
  friendsCount: { fontSize: 22, fontWeight: '800' },
  friendsLabel: { fontSize: 13, color: '#aaa' },

  songBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 12, marginTop: 4, gap: 10,
    width: POST_WIDTH, borderWidth: 1,
  },
  songArt: { width: 38, height: 38, borderRadius: 4 },
  songInfo: { flex: 1 },
  songName: { color: '#fff', fontSize: 13, fontWeight: '700' },
  songArtist: { color: '#aaa', fontSize: 11 },
  songToggle: { fontSize: 20 },
  songAdd: { fontSize: 20 },
  songAddText: { color: '#aaa', fontSize: 13, flex: 1 },
  songEdit: { padding: 4 },
  songEditText: { fontSize: 16 },

  username: {
    fontSize: 32, color: '#fff',
    textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4,
    letterSpacing: 1, marginTop: 10,
  },
  nameEditHint: { fontSize: 16 },
  usernamePlaceholder: {
    fontSize: 22,
    fontStyle: 'italic',
    marginTop: 10,
    opacity: 0.7,
  },
  nameEditRow: { alignItems: 'center', marginTop: 10 },
  nameInput: {
    fontSize: 32, color: '#fff', textAlign: 'center',
    borderBottomWidth: 2, paddingVertical: 4, paddingHorizontal: 8, minWidth: 200,
    textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4, letterSpacing: 1,
  },

  aboutBox: {
    marginTop: 12, width: POST_WIDTH,
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    gap: 6,
  },
  aboutLabel: {
    fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.85,
  },
  bioText: { fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  bioInput: {
    color: '#fff', fontSize: 14, fontStyle: 'italic',
    borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 60,
    textAlignVertical: 'top',
  },

  post: { width: POST_WIDTH, marginBottom: 20, borderWidth: 1, borderRadius: 10, padding: 10, overflow: 'hidden' },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  postActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  postActionText: { fontSize: 14, fontWeight: '700' },
  postDeleteText: { fontSize: 14, color: '#ff4444', fontWeight: '700' },
  date: {
    fontSize: 14, textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3, textDecorationLine: 'underline',
  },
  postImage: { width: '100%', height: 240, borderRadius: 6 },
  postText: {
    fontSize: 20, fontWeight: '700',
    textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3, lineHeight: 28,
  },

  videoWrapper: { width: '100%', height: VIDEO_HEIGHT, borderRadius: 4, backgroundColor: '#000' },
  videoPlayer: { width: '100%', height: '100%' },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  playCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.65)', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  playIcon: { fontSize: 26, marginLeft: 4 },
  videoLoadingBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, opacity: 0.6 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#111', paddingTop: 20, paddingBottom: 40, gap: 16 },
  sheetTitle: { color: '#fff', fontSize: 16, fontWeight: '700', paddingHorizontal: 16, letterSpacing: 1 },
  sheetSubtitle: { color: '#888', fontSize: 12, fontWeight: '600', letterSpacing: 1, paddingHorizontal: 16, textTransform: 'uppercase' },

  postTypeRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  postTypeBtn: { flex: 1, backgroundColor: '#222', borderRadius: 12, paddingVertical: 18, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#333' },
  postTypeIcon: { fontSize: 28 },
  postTypeLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  textPostRow: { paddingHorizontal: 16, gap: 10 },
  textInput: { backgroundColor: '#222', borderRadius: 10, color: '#fff', fontSize: 16, padding: 14, minHeight: 80, borderWidth: 1, borderColor: '#333', textAlignVertical: 'top' },
  postSubmitBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  postSubmitText: { color: '#000', fontWeight: '800', fontSize: 14, letterSpacing: 1 },

  animGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  animChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#333', backgroundColor: '#1a1a1a',
  },
  animChipText: { color: '#aaa', fontSize: 13, fontWeight: '600' },

  uploadBgBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, backgroundColor: '#222', borderRadius: 10, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 16 },
  uploadBgIcon: { fontSize: 22 },
  uploadBgText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  bgThumb: { width: 100, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  bgThumbImg: { width: 100, height: 70 },
  bgThumbLabel: { color: '#fff', fontSize: 11, textAlign: 'center', paddingVertical: 4, backgroundColor: '#222' },

  fontGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
  fontChip: { width: '47%', paddingHorizontal: 12, paddingVertical: 14, borderRadius: 8, borderWidth: 2, borderColor: '#333', backgroundColor: '#222', alignItems: 'center' },
  fontChipText: { color: '#fff', fontSize: 16 },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  colorSwatch: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent' },
  colorSwatchActive: { borderColor: '#fff' },
  colorCheck: { color: '#000', fontSize: 20, fontWeight: '900' },
});
