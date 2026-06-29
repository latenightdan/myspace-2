import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/auth';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode,     setMode]     = useState<'signin' | 'signup'>('signin');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const error = mode === 'signup'
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);
    setLoading(false);

    if (error) {
      Alert.alert('Error', error);
    } else if (mode === 'signup') {
      Alert.alert('Check your email', 'We sent you a confirmation link. Click it then come back to sign in.');
      setMode('signin');
    }
  }

  return (
    <LinearGradient colors={['#a8d8f0', '#4db8a4', '#a8d878']} style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
        <View style={styles.card}>
          <Text style={styles.logo}>myspace²</Text>
          <Text style={styles.tagline}>your profile. your people.</Text>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'signin' && styles.toggleActive]}
              onPress={() => setMode('signin')}
            >
              <Text style={[styles.toggleText, mode === 'signin' && styles.toggleTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'signup' && styles.toggleActive]}
              onPress={() => setMode('signup')}
            >
              <Text style={[styles.toggleText, mode === 'signup' && styles.toggleTextActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.btnText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 16, padding: 28, gap: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  logo: {
    fontSize: 38, fontWeight: '900', color: '#fff',
    textAlign: 'center', letterSpacing: 2,
    textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 6,
  },
  tagline: { color: '#aaa', fontSize: 13, textAlign: 'center', marginTop: -8 },
  toggleRow: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 10, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleActive: { backgroundColor: '#fff' },
  toggleText: { color: '#666', fontWeight: '700', fontSize: 14 },
  toggleTextActive: { color: '#000' },
  input: {
    backgroundColor: '#1a1a1a', borderRadius: 10, color: '#fff',
    fontSize: 16, padding: 14, borderWidth: 1, borderColor: '#333',
  },
  btn: {
    backgroundColor: '#fff', borderRadius: 10,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  btnText: { color: '#000', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
