import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/auth';

export const unstable_settings = {
  anchor: '(tabs)',
};

const PHONE_WIDTH = 393;
const PHONE_HEIGHT = 852;

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const inAuthRoute = segments[0] === 'auth';

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (!session && !inAuthRoute) {
    router.replace('/auth');
    return null;
  }

  if (session && inAuthRoute) {
    router.replace('/(tabs)');
    return null;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { width: screenW } = Dimensions.get('window');
  const isLargeScreen = screenW > PHONE_WIDTH + 40;

  const inner = (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthGate>
          <Stack>
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
        </AuthGate>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );

  if (!isLargeScreen) return inner;

  return (
    <View style={styles.desktop}>
      <View style={styles.phoneShell}>
        {/* notch bar */}
        <View style={styles.notchBar}>
          <View style={styles.notch} />
        </View>
        <View style={styles.phoneScreen}>
          {inner}
        </View>
        {/* home indicator */}
        <View style={styles.homeBar}>
          <View style={styles.homeIndicator} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktop: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneShell: {
    width: PHONE_WIDTH + 24,
    height: PHONE_HEIGHT + 60,
    backgroundColor: '#1a1a1a',
    borderRadius: 52,
    overflow: 'hidden',
    borderWidth: 8,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.7,
    shadowRadius: 40,
    elevation: 30,
  },
  notchBar: {
    height: 36,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  notch: {
    width: 120,
    height: 28,
    backgroundColor: '#000',
    borderRadius: 20,
  },
  phoneScreen: {
    flex: 1,
    overflow: 'hidden',
  },
  homeBar: {
    height: 28,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIndicator: {
    width: 120,
    height: 5,
    backgroundColor: '#555',
    borderRadius: 3,
  },
});
