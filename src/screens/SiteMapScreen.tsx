import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import StoryMapCanvas from '../components/StoryMapCanvas';
import { harvardTestStop, stops, type StopId } from '../content';
import { distanceMeters, usableFix, type LocationFix, type TestSpot } from '../testLocation';
import { Button, Header } from '../ui/primitives';
import { colors as C } from '../ui/theme';

type Props = {
  width: number;
  spot?: TestSpot | null;
  fix?: LocationFix | null;
  locationError?: string;
  visited: StopId[];
  detail: (typeof stops)[number] | undefined;
  developer: React.ReactNode;
  onBack: () => void;
  onSelect: (id: StopId) => void;
  onExplore: () => void;
  onRequestLocation: () => void;
  onAddLocation: () => void;
};
export default function SiteMapScreen({
  spot,
  fix,
  locationError,
  visited,
  developer,
  onBack,
  onSelect,
  onExplore,
  onRequestLocation,
  onAddLocation,
}: Props) {
  const point = spot?.placement || spot;
  const precise = usableFix(fix);
  const distance = point && precise ? distanceMeters(point, fix) : null;
  return (
    <View style={styles.screen}>
      <Header title="Story Map" developer={developer} back={onBack} />
      <StoryMapCanvas
        spot={spot}
        fix={fix}
        onSelect={() => onSelect('gun')}
        onRequestLocation={onRequestLocation}
      />
      <ScrollView style={styles.sheet} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{spot ? 'SAVED STORY' : 'DISCOVER YOUR SURROUNDINGS'}</Text>
        {spot ? (
          <>
            <Text style={styles.title}>{harvardTestStop.title}</Text>
            <View style={styles.badges}>
              <Text style={styles.badge}>
                {visited.includes('gun') ? 'Explored' : 'Not explored yet'}
              </Text>
              <Text style={styles.badge}>
                {distance === null
                  ? 'Location pending'
                  : distance < 1000
                    ? `${Math.round(distance)} m away`
                    : `${(distance / 1000).toFixed(1)} km away`}
              </Text>
            </View>
            <Text style={styles.body}>{harvardTestStop.description}</Text>
            <Text style={styles.note}>Example story at your saved location</Text>
            <Button title="Explore in AR" onPress={onExplore} />
          </>
        ) : (
          <>
            <Text style={styles.title}>Your map, your stories.</Text>
            <Text style={styles.body}>
              Move around the map to explore. Add a location to create your first AR story pin.
            </Text>
            <Button title="Add a saved location" onPress={onAddLocation} />
          </>
        )}
        {locationError ? (
          <Text accessibilityLiveRegion="polite" style={styles.body}>
            {locationError}
          </Text>
        ) : !precise ? (
          <Text style={styles.note}>Tap the location button to show your position.</Text>
        ) : (
          <Text style={styles.note}>Blue dot: you · Red pin: saved story</Text>
        )}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  sheet: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: '44%',
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  content: {
    padding: 20,
    gap: 12,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingBottom: 24,
  },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.2, color: C.green },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, lineHeight: 32, color: C.ink },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, color: C.muted },
  note: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, color: C.muted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: C.green,
    backgroundColor: C.cream,
    padding: 8,
    borderRadius: 10,
  },
});
