import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, UIManager, View } from 'react-native';
import Constants from 'expo-constants';
import type MapView from 'react-native-maps';
import type { Region } from 'react-native-maps';
import { usableFix, type LocationFix, type TestSpot, type Point } from '../testLocation';
import { RoundButton } from '../ui/primitives';
import { colors as C } from '../ui/theme';
import { campusPlaces, harvardMapRegion, type CampusPlace } from '../mapPlaces';

export function nativeMapsAvailable() {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  if (Constants.executionEnvironment === 'storeClient') return true;
  return (
    UIManager.hasViewManagerConfig('RNMapsMapView') || UIManager.hasViewManagerConfig('AIRMap')
  );
}
const regionFor = (point: Point): Region => ({
  latitude: point.latitude,
  longitude: point.longitude,
  latitudeDelta: 0.008,
  longitudeDelta: 0.008,
});
export default function StoryMapCanvas({
  spot,
  fix,
  onSelect,
  onSelectPlace,
  onRequestLocation,
}: {
  spot?: TestSpot | null;
  fix?: LocationFix | null;
  onSelect: () => void;
  onSelectPlace?: (place: CampusPlace) => void;
  onRequestLocation: () => void;
}) {
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const focused = useRef('');
  const locatePending = useRef(false);
  const precise = usableFix(fix);
  const point = spot?.placement || spot;
  const savedKey = spot ? `${spot.savedAt}:${spot.placement?.savedAt || 0}` : '';
  useEffect(() => {
    if (!ready) return;
    if (locatePending.current && precise) {
      map.current?.animateToRegion(regionFor(fix), 350);
      locatePending.current = false;
    } else if (point && focused.current !== savedKey) {
      map.current?.animateToRegion(regionFor(point), 350);
      focused.current = savedKey;
    } else if (!point && !focused.current) {
      map.current?.animateToRegion(harvardMapRegion, 350);
      focused.current = 'harvard';
    }
  }, [ready, savedKey, fix]);
  if (!nativeMapsAvailable())
    return (
      <View style={styles.unavailable}>
        <Text style={styles.title}>Native map needs an updated app</Text>
        <Text style={styles.body}>
          Preview this map in Expo Go, or install a development build that includes the map module.
        </Text>
      </View>
    );
  // Load native components only when this installed binary contains them.
  const {
    default: NativeMap,
    Marker,
    Circle,
  } = require('react-native-maps') as typeof import('react-native-maps');
  function locate() {
    if (ready && precise) map.current?.animateToRegion(regionFor(fix), 350);
    else {
      locatePending.current = true;
      onRequestLocation();
    }
  }
  return (
    <View style={styles.canvas}>
      <NativeMap
        ref={map}
        testID="native-story-map"
        style={StyleSheet.absoluteFill}
        initialRegion={point ? regionFor(point) : harvardMapRegion}
        onMapReady={() => setReady(true)}
        showsCompass
        showsScale
        showsPointsOfInterests={false}
        rotateEnabled={false}
      >
        {campusPlaces.map((place) => (
          <Marker
            key={place.id}
            identifier={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            title={place.title}
            description="Tap for location details"
            pinColor="#E75049"
            onPress={() => onSelectPlace?.(place)}
          />
        ))}
        {point && (
          <Marker
            identifier="saved-story"
            coordinate={point}
            title="Saved story"
            description="Tap to explore in AR"
            pinColor="#E75049"
            onPress={onSelect}
          />
        )}
        {precise && (
          <>
            <Circle
              center={fix}
              radius={fix.accuracy}
              fillColor="rgba(52,133,232,0.12)"
              strokeColor="rgba(52,133,232,0.4)"
              strokeWidth={1}
            />
            <Marker
              identifier="your-location"
              coordinate={fix}
              title="Your location"
              pinColor="#3485E8"
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.locationDot} />
            </Marker>
          </>
        )}
      </NativeMap>
      <View style={styles.locate}>
        <RoundButton
          icon="map"
          label="Show Harvard locations"
          onPress={() => map.current?.animateToRegion(harvardMapRegion, 350)}
        />
        <RoundButton icon="locate" label="Center map on my location" onPress={locate} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  canvas: { flex: 1, minHeight: 180 },
  locate: { position: 'absolute', right: 16, top: 16, gap: 10 },
  locationDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3485E8',
    borderWidth: 3,
    borderColor: 'white',
  },
  unavailable: {
    flex: 1,
    minHeight: 180,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: C.cream,
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 19, color: C.ink },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, color: C.muted },
});
