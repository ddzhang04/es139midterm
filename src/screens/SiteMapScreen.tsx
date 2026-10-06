import React, { useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import StoryMapCanvas from '../components/StoryMapCanvas';
import { harvardTestStop, stops, type StopId } from '../content';
import { distanceMeters, usableFix, type LocationFix, type TestSpot } from '../testLocation';
import { Button, Header } from '../ui/primitives';
import { colors as C } from '../ui/theme';
import type { CampusPlace } from '../mapPlaces';

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
  onExplorePlace: (place: CampusPlace) => void;
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
  onExplorePlace,
  onRequestLocation,
  onAddLocation,
}: Props) {
  const [selectedPlace, setSelectedPlace] = useState<CampusPlace | null>(null);
  const [directionsError, setDirectionsError] = useState('');
  const point = selectedPlace || spot?.placement || spot;
  async function directions() {
    if (!selectedPlace) return;
    setDirectionsError('');
    const coordinates = `${selectedPlace.latitude},${selectedPlace.longitude}`;
    const url =
      Platform.OS === 'ios'
        ? `https://maps.apple.com/?daddr=${coordinates}&dirflg=w`
        : `https://www.google.com/maps/dir/?api=1&destination=${coordinates}&travelmode=walking`;
    try {
      await Linking.openURL(url);
    } catch {
      setDirectionsError('Could not open directions. Try again.');
    }
  }
  const precise = usableFix(fix);
  const distance = point && precise ? distanceMeters(point, fix) : null;
  return (
    <View style={styles.screen}>
      <Header title="Story Map" developer={developer} back={onBack} />
      <StoryMapCanvas
        spot={spot}
        fix={fix}
        onSelect={() => {
          setSelectedPlace(null);
          setDirectionsError('');
          onSelect('gun');
        }}
        onSelectPlace={(place) => {
          setSelectedPlace(place);
          setDirectionsError('');
        }}
        onRequestLocation={onRequestLocation}
      />
      <ScrollView style={styles.sheet} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>
          {selectedPlace ? 'HARVARD LOCATION' : spot ? 'SAVED STORY' : 'DISCOVER YOUR SURROUNDINGS'}
        </Text>
        {selectedPlace ? (
          <>
            <Text style={styles.title}>{selectedPlace.title}</Text>
            <Text style={styles.badge}>
              {visited.includes(selectedPlace.id) ? 'Explored' : 'Not explored yet'}
            </Text>
            <Text style={styles.body}>{selectedPlace.description}</Text>
            {distance !== null && (
              <Text style={styles.badge}>
                {distance < 1000
                  ? `${Math.round(distance)} m away`
                  : `${(distance / 1000).toFixed(1)} km away`}
              </Text>
            )}
            <Text style={styles.note}>Approximate location pin</Text>
            <Button title="Explore in AR" onPress={() => onExplorePlace(selectedPlace)} />
            <Button
              secondary
              title="Walking directions"
              icon="route"
              onPress={() => void directions()}
            />
            {directionsError ? (
              <Text accessibilityRole="alert" style={styles.body}>
                {directionsError}
              </Text>
            ) : null}
          </>
        ) : spot ? (
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
              Tap a pin to discover its stories, explore in AR, or get walking directions.
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
          <Text style={styles.note}>Blue dot: you · Red pins: places</Text>
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
