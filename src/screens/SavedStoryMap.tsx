import React, { useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { harvardTestStop } from '../content';
import {
  distanceMeters,
  proximity,
  usableFix,
  type LocationFix,
  type TestSpot,
} from '../testLocation';
import { Button, Header } from '../ui/primitives';
import { colors as C } from '../ui/theme';

type Props = {
  spot: TestSpot;
  fix?: LocationFix | null;
  locationError?: string;
  explored: boolean;
  developer: React.ReactNode;
  onBack: () => void;
  onExplore: () => void;
};
export default function SavedStoryMap({
  spot,
  fix,
  locationError,
  explored,
  developer,
  onBack,
  onExplore,
}: Props) {
  const [mapError, setMapError] = useState('');
  const point = spot.placement || spot;
  const precise = usableFix(fix);
  const distance = precise ? distanceMeters(fix, point) : null;
  const nearby =
    precise &&
    proximity({ ...spot, latitude: point.latitude, longitude: point.longitude }, fix).state ===
      'nearby';
  const distanceLabel =
    distance === null
      ? 'Checking your location'
      : distance < 1000
        ? `${Math.round(distance)} m away`
        : `${(distance / 1000).toFixed(1)} km away`;
  async function openMaps() {
    setMapError('');
    const coordinates = `${point.latitude},${point.longitude}`;
    const label = encodeURIComponent('HistoryLens saved story');
    const url =
      Platform.OS === 'ios'
        ? `https://maps.apple.com/?ll=${coordinates}&q=${label}`
        : `geo:${coordinates}?q=${coordinates}(${label})`;
    try {
      await Linking.openURL(url);
    } catch {
      setMapError('Could not open Maps. Try again or use the coordinates below.');
    }
  }
  return (
    <>
      <Header title="Story Map" developer={developer} back={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>YOUR PLACES</Text>
          <Text style={styles.heading}>A story worth finding.</Text>
          <Text style={styles.body}>
            Your saved location is ready to explore. Open Maps to see it on the street map.
          </Text>
        </View>
        <View style={styles.card}>
          <View style={styles.badges}>
            <Text style={styles.badge}>
              {spot.placement ? 'AR position saved' : 'Site location saved'}
            </Text>
            <Text style={styles.status}>{explored ? 'Explored' : 'Not explored yet'}</Text>
          </View>
          <Text style={styles.title}>{harvardTestStop.title}</Text>
          <Text style={styles.body}>{harvardTestStop.description}</Text>
          <Text style={styles.example}>Example story at your saved location</Text>
          <View style={styles.location}>
            <Text style={styles.distance}>{distanceLabel}</Text>
            <Text style={styles.body}>
              {locationError ||
                (!precise
                  ? 'Waiting for a recent, precise GPS reading.'
                  : nearby
                    ? 'You are near the saved site. Open AR to explore.'
                    : 'Return near the saved site to discover its AR story.')}
            </Text>
          </View>
          <Button title="Open in Maps" icon="route" onPress={() => void openMaps()} />
          {mapError ? (
            <Text accessibilityRole="alert" style={styles.body}>
              {mapError}
            </Text>
          ) : null}
          <Button title="Explore in AR" secondary onPress={onExplore} />
        </View>
        <View style={styles.coordinates}>
          <Text style={styles.eyebrow}>
            {spot.placement ? 'SAVED AR COORDINATES' : 'SAVED SITE COORDINATES'}
          </Text>
          <Text selectable style={styles.body}>
            {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
          </Text>
          <Text style={styles.example}>
            GPS placement is approximate. Your saved story stays on this phone.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}
const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 20,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingBottom: 32,
  },
  intro: { gap: 10 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.2, color: C.green },
  heading: { fontFamily: 'Inter_700Bold', fontSize: 30, lineHeight: 38, color: C.ink },
  body: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 23, color: C.muted },
  card: { padding: 20, backgroundColor: 'white', borderRadius: 24, gap: 14 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  badge: {
    backgroundColor: C.cream,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    color: C.green,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  status: { color: C.muted, fontFamily: 'Inter_500Medium', fontSize: 12 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 25, lineHeight: 33, color: C.ink },
  example: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, color: C.muted },
  location: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 16, gap: 6 },
  distance: { fontFamily: 'Inter_700Bold', fontSize: 21, color: C.green },
  coordinates: { paddingHorizontal: 4, gap: 8 },
});
