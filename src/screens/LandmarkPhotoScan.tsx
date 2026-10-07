import React, { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { campusPlaces, type CampusPlace } from '../mapPlaces';
import { distanceMeters, usableFix, type LocationFix } from '../testLocation';
import { Button } from '../ui/primitives';

export function nearbyPhotoLandmarks(fix?: LocationFix | null) {
  if (!usableFix(fix)) return [];
  return campusPlaces
    .map((place) => ({ place, distance: distanceMeters(place, fix!) }))
    .filter((item) => item.distance <= 200)
    .sort((a, b) => a.distance - b.distance);
}

export default function LandmarkPhotoScan({
  fix,
  foreground,
  onCancel,
  onCollect,
}: {
  fix?: LocationFix | null;
  foreground: boolean;
  onCancel: () => void;
  onCollect: (place: CampusPlace) => void;
}) {
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraView>(null);
  const alive = useRef(true);
  const busy = useRef(false);
  const [released, setReleased] = useState(false);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [target, setTarget] = useState<CampusPlace | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState('');
  const nearby = nearbyPhotoLandmarks(fix);
  const nearbyTarget = nearby.some((item) => item.place.id === target?.id);
  useEffect(() => {
    alive.current = true;
    // Let the native AR camera release before opening Expo's photo camera.
    const timer = setTimeout(() => setReleased(true), 300);
    return () => {
      alive.current = false;
      clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    if (!foreground) setReady(false);
  }, [foreground]);
  async function capture() {
    if (!ready || !foreground || busy.current || !nearbyTarget) return;
    busy.current = true;
    setCapturing(true);
    setError('');
    try {
      const result = await camera.current?.takePictureAsync({ quality: 0.8 });
      if (!result?.uri) throw new Error('No photo');
      if (alive.current) setPhoto(result.uri);
    } catch {
      if (alive.current) setError('Could not take the photo. Please try again.');
    } finally {
      busy.current = false;
      if (alive.current) setCapturing(false);
    }
  }
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#10251F',
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>
          Photograph a landmark
        </Text>
        <Text style={{ color: 'white' }}>
          Choose the place its dot represents, then photograph the real building. Confirm your photo
          to collect its story.
        </Text>
      </View>
      {target ? (
        <>
          <Text style={{ color: 'white', paddingHorizontal: 16, paddingBottom: 8 }}>
            {target.title}
          </Text>
          <View style={{ flex: 1 }}>
            {photo ? (
              <Image
                testID="landmark-photo-preview"
                source={{ uri: photo }}
                style={{ flex: 1 }}
                resizeMode="contain"
              />
            ) : (
              released &&
              foreground && (
                <CameraView
                  ref={camera}
                  style={{ flex: 1 }}
                  facing="back"
                  onCameraReady={() => setReady(true)}
                  onMountError={() => {
                    setReady(false);
                    setError('Camera could not open. Return to AR and try again.');
                  }}
                />
              )
            )}
          </View>
          <View style={{ padding: 16, gap: 10 }}>
            {!!error && (
              <Text accessibilityRole="alert" style={{ color: 'white' }}>
                {error}
              </Text>
            )}
            {!nearbyTarget && (
              <Text style={{ color: 'white' }}>
                A fresh GPS reading within 200 m is needed to collect this landmark.
              </Text>
            )}
            {photo ? (
              <>
                <Text style={{ color: 'white' }}>
                  Is this {target.title}? You confirm the match; the app does not recognize it
                  automatically. The photo is not uploaded or saved to your collection.
                </Text>
                <Button
                  title="Use photo & collect story"
                  disabled={!nearbyTarget || !foreground}
                  onPress={() => {
                    if (nearbyTarget) onCollect(target);
                  }}
                />
                <Button
                  secondary
                  dark
                  title="Retake photo"
                  onPress={() => {
                    setPhoto(null);
                    setReady(false);
                  }}
                />
              </>
            ) : (
              <Button
                title={capturing ? 'Taking photo…' : 'Take landmark photo'}
                disabled={!ready || !foreground || capturing || !nearbyTarget}
                onPress={capture}
              />
            )}
            <Button
              secondary
              dark
              title="Choose another landmark"
              onPress={() => {
                setTarget(null);
                setPhoto(null);
                setReady(false);
                setError('');
              }}
            />
          </View>
        </>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {nearby.map(({ place, distance }) => (
            <Button
              key={place.id}
              title={`${place.title} · ${Math.round(distance)} m`}
              onPress={() => setTarget(place)}
            />
          ))}
          {!nearby.length && (
            <Text style={{ color: 'white' }}>
              No landmarks nearby. Move within 200 m of a map dot and wait for a precise location
              reading.
            </Text>
          )}
        </ScrollView>
      )}
      <View style={{ padding: 16 }}>
        <Button secondary dark title="Return to AR" onPress={onCancel} />
      </View>
    </View>
  );
}
