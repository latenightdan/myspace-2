import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// ── Frutiger Aero ─────────────────────────────────────────────────────────────
export function FrutigerAeroBg() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#a8d8f0', '#6ec6e6', '#4db8a4', '#72c472', '#a8d878']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ position: 'absolute', top: -80, left: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.28)' }} />
      <View style={{ position: 'absolute', top: -40, left: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,220,0.35)' }} />
      <View style={{ position: 'absolute', top: 120, right: -50, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)' }} />
      <View style={{ position: 'absolute', top: 360, left: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.11)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' }} />
      <View style={{ position: 'absolute', top: 500, right: 20, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(200,240,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }} />
      <LinearGradient colors={['rgba(255,255,255,0.22)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 180 }} />
      <LinearGradient colors={['transparent', 'rgba(100,200,100,0.18)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 }} />
    </View>
  );
}

// ── Emo Checker ───────────────────────────────────────────────────────────────
const CHECKER_SIZE = 36;
const CHECKER_COLS = Math.ceil(width / CHECKER_SIZE) + 1;
const CHECKER_ROWS = 26;
const EMO_SYMBOLS = ['★','♥','✦','☆','♪','✧','★','♥'];

export function EmoCheckerBg() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', overflow: 'hidden' }]}>
      {Array.from({ length: CHECKER_ROWS }).map((_, r) =>
        Array.from({ length: CHECKER_COLS }).map((_, c) =>
          (r + c) % 2 === 0 ? (
            <View key={`${r}-${c}`} style={{ position: 'absolute', top: r * CHECKER_SIZE, left: c * CHECKER_SIZE, width: CHECKER_SIZE, height: CHECKER_SIZE, backgroundColor: '#fff' }} />
          ) : null
        )
      )}
      <LinearGradient
        colors={['rgba(180,0,220,0.55)', 'rgba(255,20,147,0.45)', 'rgba(100,0,200,0.55)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {EMO_SYMBOLS.map((sym, i) => (
        <Text key={i} style={{ position: 'absolute', top: (i * 113) % 800 + 40, left: (i * 87 + 20) % (width - 40), fontSize: 28 + (i % 3) * 12, color: i % 2 === 0 ? '#fff' : '#ff69b4', opacity: 0.7 }}>
          {sym}
        </Text>
      ))}
    </View>
  );
}

// ── Skull & Hearts ────────────────────────────────────────────────────────────
const SKULL_POSITIONS = Array.from({ length: 72 }, (_, i) => {
  const col = i % 6;
  const row = Math.floor(i / 6);
  return { id: i, x: col * (width / 6) + (row % 2 === 0 ? 0 : width / 12), y: row * 62 + 24, isSkull: (row + col) % 2 === 0 };
});

export function SkullHeartsBg() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#080808', overflow: 'hidden' }]}>
      {SKULL_POSITIONS.map(({ id, x, y, isSkull }) => (
        <Text key={id} style={{ position: 'absolute', left: x, top: y, fontSize: 22, opacity: 0.88 }}>
          {isSkull ? '☠' : '♥'}
        </Text>
      ))}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(180,0,60,0.08)' }]} />
    </View>
  );
}

// ── Pink Sparkle ──────────────────────────────────────────────────────────────
const SPARKLE_DATA = Array.from({ length: 55 }, (_, i) => ({
  id: i, x: (i * 139.7) % (width - 20), y: (i * 103.3) % 900,
  size: 10 + (i % 4) * 7, sym: ['✦','✧','★','✴'][i % 4],
  color: ['#ff00ff','#ff44dd','#cc00cc','#ff88ff'][i % 4],
  opacity: 0.35 + (i % 5) * 0.13,
}));

export function PinkSparkleBg() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#030003', overflow: 'hidden' }]}>
      {[{ top: 80, left: width * 0.5, r: 120 }, { top: 380, left: width * 0.15, r: 90 }, { top: 600, left: width * 0.75, r: 110 }].map((g, i) => (
        <View key={i} style={{ position: 'absolute', top: g.top - g.r, left: g.left - g.r, width: g.r * 2, height: g.r * 2, borderRadius: g.r, backgroundColor: 'rgba(200,0,200,0.14)' }} />
      ))}
      {SPARKLE_DATA.map(s => (
        <Text key={s.id} style={{ position: 'absolute', left: s.x, top: s.y, fontSize: s.size, color: s.color, opacity: s.opacity }}>
          {s.sym}
        </Text>
      ))}
    </View>
  );
}

// ── lookup by id ──────────────────────────────────────────────────────────────
export const PATTERN_COMPONENTS: Record<string, React.ComponentType> = {
  emochecker:  EmoCheckerBg,
  skullhearts: SkullHeartsBg,
  pinksparkle: PinkSparkleBg,
};
