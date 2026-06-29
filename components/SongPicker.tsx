import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { useSpotify, SpotifyTrack } from '@/hooks/use-spotify';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (track: SpotifyTrack) => void;
};

export function SongPicker({ visible, onClose, onSelect }: Props) {
  const { token, loading, login, exchangeToken, searchTracks, response, redirectUri } = useSpotify();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Configure audio for playback
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  // Exchange code for token after OAuth redirect
  useEffect(() => {
    if (response?.type === 'success') exchangeToken();
  }, [response]);

  // Stop preview when modal closes
  useEffect(() => {
    if (!visible) stopPreview();
  }, [visible]);

  async function stopPreview() {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setPreviewingId(null);
  }

  async function togglePreview(track: SpotifyTrack) {
    if (!track.previewUrl) {
      Alert.alert('No preview', 'This track doesn\'t have a 30s preview available.');
      return;
    }
    if (previewingId === track.id) {
      await stopPreview();
      return;
    }
    await stopPreview();
    const { sound } = await Audio.Sound.createAsync(
      { uri: track.previewUrl },
      { shouldPlay: true }
    );
    soundRef.current = sound;
    setPreviewingId(track.id);
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        setPreviewingId(null);
        soundRef.current = null;
      }
    });
  }

  function handleSearch(q: string) {
    setQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const tracks = await searchTracks(q);
      setResults(tracks);
      setSearching(false);
    }, 500);
  }

  function handleSelect(track: SpotifyTrack) {
    stopPreview();
    onSelect(track);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile Song</Text>
          <TouchableOpacity onPress={() => { stopPreview(); onClose(); }}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        {!token ? (
          <View style={styles.loginBox}>
            <Text style={styles.loginText}>Connect Spotify to pick your profile song</Text>
            <Text style={styles.loginSub}>30-second previews play on your profile</Text>
            <TouchableOpacity style={styles.loginBtn} onPress={login} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.loginBtnText}>🎵  Connect Spotify</Text>
              }
            </TouchableOpacity>
            <Text style={styles.debugUri}>Redirect URI: {redirectUri}</Text>
          </View>
        ) : (
          <>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a song..."
                placeholderTextColor="#666"
                value={query}
                onChangeText={handleSearch}
                autoFocus
                returnKeyType="search"
              />
              {searching && <ActivityIndicator color="#1DB954" style={{ marginLeft: 10 }} />}
            </View>

            <FlatList
              data={results}
              keyExtractor={(t) => t.id}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListEmptyComponent={
                !searching && query.length > 0 ? (
                  <Text style={styles.emptyText}>No results found</Text>
                ) : null
              }
              renderItem={({ item }) => (
                <View style={styles.trackRow}>
                  <TouchableOpacity
                    style={[styles.previewBtn, !item.previewUrl && { opacity: 0.4 }]}
                    onPress={() => togglePreview(item)}
                    disabled={!item.previewUrl}
                  >
                    <View style={styles.albumArtWrap}>
                      {item.albumArt ? (
                        <Image source={{ uri: item.albumArt }} style={styles.albumArt} />
                      ) : (
                        <View style={[styles.albumArt, { backgroundColor: '#333' }]} />
                      )}
                      <View style={[styles.playBadge, !item.previewUrl && { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                        <Text style={styles.playBadgeText}>
                          {previewingId === item.id ? '■' : '▶'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.trackInfo}>
                    <Text style={styles.trackName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.trackArtist} numberOfLines={1}>{item.artists}</Text>
                    {item.previewUrl
                      ? <Text style={styles.hasPreview}>▶ Preview available</Text>
                      : <Text style={styles.noPreview}>No preview available</Text>
                    }
                  </View>

                  <TouchableOpacity
                    style={styles.selectBtn}
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={styles.selectBtnText}>SET</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  close: {
    color: '#888',
    fontSize: 20,
    fontWeight: '600',
  },
  loginBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  loginText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  loginSub: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  loginBtn: {
    backgroundColor: '#1DB954',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    minWidth: 220,
    alignItems: 'center',
  },
  loginBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#222',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
  },
  debugUri: {
    color: '#444',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    gap: 12,
  },
  previewBtn: {},
  albumArtWrap: {
    position: 'relative',
  },
  albumArt: {
    width: 52,
    height: 52,
    borderRadius: 4,
  },
  playBadge: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 4,
  },
  playBadgeText: {
    color: '#1DB954',
    fontSize: 16,
    fontWeight: '700',
  },
  trackInfo: {
    flex: 1,
    gap: 2,
  },
  trackName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  trackArtist: {
    color: '#888',
    fontSize: 12,
  },
  hasPreview: {
    color: '#1DB954',
    fontSize: 11,
    marginTop: 2,
  },
  noPreview: {
    color: '#555',
    fontSize: 11,
    marginTop: 2,
  },
  selectBtn: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  selectBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
