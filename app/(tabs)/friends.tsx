import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Image, ActivityIndicator, Alert, Modal, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFriends, Friend } from '@/hooks/use-friends';
import { useProfile } from '@/hooks/use-profile';
import { Profile } from '@/lib/supabase';

export default function FriendsScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { accepted, incoming, outgoing, loading, findByUsername, sendRequest, acceptRequest, removeFriend } = useFriends();

  const [addModalOpen, setAddModalOpen]   = useState(false);
  const [searchQuery,  setSearchQuery]    = useState('');
  const [searchResult, setSearchResult]   = useState<Profile | null | 'not-found'>(null);
  const [searching,    setSearching]      = useState(false);
  const [sending,      setSending]        = useState(false);

  const accentColor = profile?.accent_color ?? '#ffffff';

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResult(null);
    const result = await findByUsername(searchQuery.trim());
    setSearchResult(result ?? 'not-found');
    setSearching(false);
  }

  async function handleSendRequest(id: string) {
    setSending(true);
    const error = await sendRequest(id);
    setSending(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Request sent! 🎉', `They'll see your request when they open the app.`);
      setAddModalOpen(false);
      setSearchQuery('');
      setSearchResult(null);
    }
  }

  function handleViewProfile(friendProfile: Profile) {
    router.push({ pathname: '/profile/[id]', params: { id: friendProfile.id } });
  }

  function confirmRemove(f: Friend) {
    const label = f.status === 'pending' ? 'Cancel request' : 'Remove friend';
    Alert.alert(label, `Remove ${f.profile.username ?? 'this user'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: label, style: 'destructive', onPress: () => removeFriend(f.friendshipId) },
    ]);
  }

  return (
    <View style={styles.bg}>
      {/* header */}
      <View style={[styles.header, { borderBottomColor: accentColor + '33' }]}>
        <Text style={[styles.title, { color: accentColor }]}>Friends</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: accentColor }]}
          onPress={() => setAddModalOpen(true)}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={accentColor} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* incoming requests */}
          {incoming.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: accentColor }]}>
                🔔  Friend Requests ({incoming.length})
              </Text>
              {incoming.map(f => (
                <View key={f.friendshipId} style={[styles.row, { borderColor: accentColor + '33' }]}>
                  <TouchableOpacity onPress={() => handleViewProfile(f.profile)}>
                    <Image
                      source={{ uri: f.profile.avatar_url ?? undefined }}
                      style={[styles.avatar, { borderColor: accentColor }]}
                      defaultSource={require('@/assets/images/icon.png')}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => handleViewProfile(f.profile)}>
                    <Text style={styles.username}>{f.profile.username ?? 'Unknown'}</Text>
                    <Text style={styles.sub}>wants to be your friend</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptBtn, { backgroundColor: accentColor }]}
                    onPress={() => acceptRequest(f.friendshipId)}
                  >
                    <Text style={styles.acceptBtnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineBtn} onPress={() => removeFriend(f.friendshipId)}>
                    <Text style={styles.declineBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* friends list */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: accentColor }]}>
              My Friends ({accepted.length})
            </Text>
            {accepted.length === 0 && (
              <Text style={styles.empty}>No friends yet. Add someone by their username!</Text>
            )}
            {accepted.map(f => (
              <View key={f.friendshipId} style={[styles.row, { borderColor: accentColor + '33' }]}>
                <TouchableOpacity onPress={() => handleViewProfile(f.profile)}>
                  <Image
                    source={{ uri: f.profile.avatar_url ?? undefined }}
                    style={[styles.avatar, { borderColor: accentColor }]}
                    defaultSource={require('@/assets/images/icon.png')}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => handleViewProfile(f.profile)}>
                  <Text style={styles.username}>{f.profile.username ?? 'Unknown'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmRemove(f)}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* pending outgoing */}
          {outgoing.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: accentColor }]}>Pending ({outgoing.length})</Text>
              {outgoing.map(f => (
                <View key={f.friendshipId} style={[styles.row, { borderColor: accentColor + '33' }]}>
                  <Image
                    source={{ uri: f.profile.avatar_url ?? undefined }}
                    style={[styles.avatar, { borderColor: accentColor }]}
                    defaultSource={require('@/assets/images/icon.png')}
                  />
                  <Text style={[styles.username, { flex: 1 }]}>{f.profile.username ?? 'Unknown'}</Text>
                  <Text style={styles.sub}>Pending…</Text>
                  <TouchableOpacity onPress={() => confirmRemove(f)}>
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      )}

      {/* Add Friend Modal */}
      <Modal visible={addModalOpen} transparent animationType="slide">
        <Pressable style={styles.backdrop} onPress={() => { setAddModalOpen(false); setSearchQuery(''); setSearchResult(null); }} />
        <View style={styles.sheet}>
          <Text style={[styles.sheetTitle, { color: accentColor }]}>Add a Friend</Text>
          <Text style={styles.sheetSub}>Enter their exact username to find them</Text>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder="username"
              placeholderTextColor="#555"
              value={searchQuery}
              onChangeText={t => { setSearchQuery(t); setSearchResult(null); }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              style={[styles.searchBtn, { backgroundColor: accentColor }]}
              onPress={handleSearch}
              disabled={searching}
            >
              {searching
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.searchBtnText}>Find</Text>
              }
            </TouchableOpacity>
          </View>

          {searchResult === 'not-found' && (
            <Text style={styles.notFound}>No user found with that username.</Text>
          )}

          {searchResult && searchResult !== 'not-found' && (
            <View style={[styles.resultCard, { borderColor: accentColor + '55' }]}>
              <Image
                source={{ uri: searchResult.avatar_url ?? undefined }}
                style={[styles.resultAvatar, { borderColor: accentColor }]}
                defaultSource={require('@/assets/images/icon.png')}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName}>{searchResult.username}</Text>
                {searchResult.bio ? <Text style={styles.resultBio} numberOfLines={2}>{searchResult.bio}</Text> : null}
              </View>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: accentColor }]}
                onPress={() => handleSendRequest(searchResult.id)}
                disabled={sending}
              >
                {sending
                  ? <ActivityIndicator color="#000" />
                  : <Text style={styles.sendBtnText}>Add</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  addBtn: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  scroll: { padding: 16, gap: 8, paddingBottom: 100 },
  section: { marginBottom: 28, gap: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111', borderRadius: 12, padding: 12, borderWidth: 1,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, backgroundColor: '#222' },
  username: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sub: { color: '#666', fontSize: 12, marginTop: 2 },
  acceptBtn: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  acceptBtnText: { color: '#000', fontWeight: '800', fontSize: 12 },
  declineBtn: { padding: 4 },
  declineBtnText: { color: '#ff4444', fontSize: 16, fontWeight: '700' },
  removeText: { color: '#444', fontSize: 16, fontWeight: '700' },
  empty: { color: '#444', fontSize: 14, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 14,
  },
  sheetTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  sheetSub: { color: '#666', fontSize: 13, marginTop: -8 },
  searchRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1, backgroundColor: '#1a1a1a', borderRadius: 10,
    color: '#fff', fontSize: 16, padding: 14, borderWidth: 1, borderColor: '#333',
  },
  searchBtn: { borderRadius: 10, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  notFound: { color: '#ff4444', fontSize: 14, textAlign: 'center' },
  resultCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, borderWidth: 1,
  },
  resultAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, backgroundColor: '#222' },
  resultName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultBio: { color: '#888', fontSize: 12, marginTop: 2 },
  sendBtn: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  sendBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },
});
