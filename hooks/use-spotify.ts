import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = '43d18eacfd3345ef9dd8bc9d3a434f8b';
const SCOPES = ['user-read-private'];

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export type SpotifyTrack = {
  id: string;
  name: string;
  artists: string;
  albumArt: string;
  previewUrl: string | null;
};

export function useSpotify() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = Platform.OS === 'web'
    ? 'http://127.0.0.1:8081'
    : 'exp://localhost:8081';

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: SCOPES,
      usePKCE: true,
      redirectUri,
    },
    discovery
  );

  const exchangeToken = useCallback(async () => {
    if (response?.type !== 'success' || !request?.codeVerifier) {
      if (response?.type === 'error') {
        setError(`Auth error: ${response.error}`);
        Alert.alert('Spotify Error', `Auth failed: ${response.error}`);
      }
      return;
    }
    const code = response.params.code;
    try {
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: CLIENT_ID,
          code_verifier: request.codeVerifier,
        }).toString(),
      });
      const data = await res.json();
      if (data.access_token) {
        setToken(data.access_token);
        setError(null);
      } else {
        const msg = data.error_description ?? data.error ?? 'Unknown error';
        setError(msg);
        Alert.alert('Spotify Token Error', msg + `\n\nRedirect URI used: ${redirectUri}`);
      }
    } catch (e: any) {
      setError(e.message);
      Alert.alert('Network Error', e.message);
    }
  }, [response, request, redirectUri]);

  const login = useCallback(async () => {
    setLoading(true);
    setError(null);
    await promptAsync();
    setLoading(false);
  }, [promptAsync]);

  const searchTracks = useCallback(async (query: string): Promise<SpotifyTrack[]> => {
    if (!token) {
      Alert.alert('Not connected', 'Please connect Spotify first.');
      return [];
    }
    if (!query.trim()) return [];
    try {
      const params = new URLSearchParams({ q: query, type: 'track', limit: '10', market: 'US' });
      const url = `https://api.spotify.com/v1/search?${params.toString()}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.error) {
        Alert.alert('Search Error', `${data.error.status}: ${data.error.message}`);
        return [];
      }
      if (!data.tracks) return [];
      const tracks = data.tracks.items.map((t: any) => ({
        id: t.id,
        name: t.name,
        artists: t.artists.map((a: any) => a.name).join(', '),
        albumArt: t.album.images?.[1]?.url ?? t.album.images?.[0]?.url ?? '',
        previewUrl: t.preview_url,
      }));
      // Tracks with previews first
      return [...tracks.filter((t: any) => t.previewUrl), ...tracks.filter((t: any) => !t.previewUrl)];
    } catch (e: any) {
      Alert.alert('Search failed', e.message);
      return [];
    }
  }, [token]);

  return { token, loading, error, login, exchangeToken, searchTracks, response, redirectUri };
}
