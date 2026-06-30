import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert, ActivityIndicator } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';

function UsernameGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { profile, saveProfile } = useProfile();
  const [draft,   setDraft]   = useState('');
  const [saving,  setSaving]  = useState(false);

  // Still loading
  if (!profile) return (
    <View style={gate.center}>
      <ActivityIndicator color="#fff" />
    </View>
  );

  // Already has a username
  if (profile.username) return <>{children}</>;

  async function handleSave() {
    const clean = draft.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (clean.length < 3) {
      Alert.alert('Too short', 'Username must be at least 3 characters (letters, numbers, underscores only).');
      return;
    }
    setSaving(true);
    // Check uniqueness
    const { data } = await supabase.from('profiles').select('id').eq('username', clean).single();
    if (data) {
      Alert.alert('Taken', 'That username is already in use. Try another.');
      setSaving(false);
      return;
    }
    await saveProfile({ username: clean });
    setSaving(false);
  }

  return (
    <Modal visible transparent animationType="fade">
      <View style={gate.bg}>
        <View style={gate.card}>
          <Text style={gate.title}>Pick your username</Text>
          <Text style={gate.sub}>
            This is how friends will find you.{'\n'}
            Letters, numbers and underscores only.
          </Text>
          <TextInput
            style={gate.input}
            placeholder="e.g. coolkid_99"
            placeholderTextColor="#555"
            value={draft}
            onChangeText={setDraft}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
          <TouchableOpacity style={gate.btn} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#000" />
              : <Text style={gate.btnText}>Set Username</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const gate = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', backgroundColor: '#111', borderRadius: 16, padding: 28, gap: 14, borderWidth: 1, borderColor: '#222' },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  sub: { color: '#666', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  input: {
    backgroundColor: '#1a1a1a', borderRadius: 10, color: '#fff',
    fontSize: 18, padding: 14, borderWidth: 1, borderColor: '#333', textAlign: 'center',
  },
  btn: { backgroundColor: '#fff', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#000', fontSize: 16, fontWeight: '800' },
});

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <UsernameGate>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: { backgroundColor: '#0a0a0a', borderTopColor: '#1a1a1a' },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="friends"
          options={{
            title: 'Friends',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{ href: null }} // hide explore tab
        />
      </Tabs>
    </UsernameGate>
  );
}
