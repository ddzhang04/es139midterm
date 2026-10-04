import { useEffect, useRef, useState } from 'react';
import { localStorage } from './localStorage';
import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import type * as Location from 'expo-location';
import {
  GlobalPlacement,
  LocationFix,
  PersistentAnchor,
  TestSpot,
  TEST_SPOT_KEY,
  parseSpot,
  proximity,
  usableFix,
} from './testLocation';

function locationAPI(): typeof Location {
  if (!requireOptionalNativeModule('ExpoLocation'))
    throw new Error('Install the latest HistoryLens development build to enable location tagging.');
  return require('expo-location') as typeof Location;
}

type Fix = LocationFix;
export default function useTestLocation(active: boolean) {
  const [spot, setSpot] = useState<TestSpot | null>(null);
  const [fix, setFix] = useState<Fix | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [locationRequest, setLocationRequest] = useState(0);
  const [now, setNow] = useState(Date.now());
  const operation = useRef(0);
  const locating = useRef(false);
  const record = useRef<TestSpot | null>(null);
  const watcher = useRef<Location.LocationSubscription | null>(null);
  useEffect(() => {
    console.info(
      '[HistoryLens native location]',
      JSON.stringify({
        locationModule: !!requireOptionalNativeModule('ExpoLocation'),
        nativeBuild: Constants.platform?.ios?.buildNumber ?? 'unknown',
      }),
    );
    let alive = true;
    localStorage
      .read(TEST_SPOT_KEY)
      .then((raw) => {
        if (alive) {
          record.current = parseSpot(raw);
          setSpot(record.current);
        }
      })
      .catch(() => {
        if (alive) setError('Could not load your test spot.');
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
      operation.current++;
      watcher.current?.remove();
    };
  }, []);
  useEffect(() => {
    if (!active || !loaded) return;
    let alive = true;
    let subscription: Location.LocationSubscription | null = null;
    const tick = setInterval(() => setNow(Date.now()), 5000);
    async function watch() {
      try {
        const api = locationAPI();
        const permission = await api.getForegroundPermissionsAsync();
        if (!alive) return;
        if (!permission.granted) {
          setFix(null);
          setError('Allow location access to check this spot.');
          return;
        }
        subscription = await api.watchPositionAsync(
          { accuracy: api.Accuracy.High, distanceInterval: 2, timeInterval: 3000 },
          (next) => {
            if (alive) {
              setFix({ ...next.coords, timestamp: next.timestamp });
              setNow(Date.now());
              setError('');
            }
          },
          () => {
            if (alive) {
              setFix(null);
              setError('Location unavailable. Check Location Services and try again.');
            }
          },
        );
        if (!alive) subscription.remove();
        else watcher.current = subscription;
      } catch {
        if (alive) {
          setFix(null);
          setError(
            'Location unavailable. Install the latest HistoryLens development build and enable Location Services.',
          );
        }
      }
    }
    void watch();
    return () => {
      alive = false;
      clearInterval(tick);
      subscription?.remove();
      watcher.current = null;
      setFix(null);
    };
  }, [active, loaded, spot?.savedAt, locationRequest]);

  async function requestLocation() {
    try {
      const permission = await locationAPI().requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError('Allow location access in Settings to show your position on the map.');
        return;
      }
      setError('');
      setLocationRequest((value) => value + 1);
    } catch {
      setError('Location unavailable. Check Location Services and try again.');
    }
  }

  async function useCurrentLocation() {
    if (locating.current || !loaded) return;
    locating.current = true;
    const generation = ++operation.current;
    setBusy(true);
    setError('');
    try {
      const api = locationAPI();
      const permission = await api.requestForegroundPermissionsAsync();
      if (generation !== operation.current) return;
      if (!permission.granted)
        throw new Error('Allow location access in Settings to create your test spot.');
      if (!(await api.hasServicesEnabledAsync()))
        throw new Error('Turn on Location Services in Settings and try again.');
      if (generation !== operation.current) return;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const next = await Promise.race([
        api.getCurrentPositionAsync({ accuracy: api.Accuracy.High }),
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(
            () => reject(new Error('GPS is taking too long. Move toward open sky and try again.')),
            20000,
          );
        }),
      ]).finally(() => clearTimeout(timeout));
      if (generation !== operation.current) return;
      if (!usableFix({ ...next.coords, timestamp: next.timestamp }))
        throw new Error(
          'Waiting for a precise GPS fix. Enable Precise Location, move toward open sky, and try again.',
        );
      const value: TestSpot = {
        name: 'Harvard test spot',
        latitude: next.coords.latitude,
        longitude: next.coords.longitude,
        radius: 50,
        savedAt: Date.now(),
      };
      await localStorage.write(TEST_SPOT_KEY, JSON.stringify(value));
      if (generation !== operation.current) return;
      record.current = value;
      setSpot(value);
      setFix({ ...next.coords, timestamp: next.timestamp });
      setNow(Date.now());
    } catch (cause) {
      if (generation === operation.current)
        setError(
          cause instanceof Error && !/native module|ExpoLocation/i.test(cause.message)
            ? cause.message
            : 'Install the latest HistoryLens development build to enable location tagging.',
        );
    } finally {
      if (generation === operation.current) {
        locating.current = false;
        setBusy(false);
      }
    }
  }
  async function saveAnchor(anchor: PersistentAnchor, savedAt: number) {
    if (locating.current || !record.current || record.current.savedAt !== savedAt)
      throw new Error('Test spot changed. Place and save the tile again.');
    const generation = operation.current;
    const next = { ...record.current, anchor };
    await localStorage.write(TEST_SPOT_KEY, JSON.stringify(next));
    if (generation === operation.current && record.current?.savedAt === savedAt) {
      record.current = next;
      setSpot(next);
    }
  }
  async function savePlacement(placement: GlobalPlacement, savedAt: number) {
    if (locating.current || !record.current || record.current.savedAt !== savedAt)
      throw new Error('Test spot changed. Place and save the marker again.');
    const generation = operation.current;
    const next = { ...record.current, placement, anchor: undefined };
    await localStorage.write(TEST_SPOT_KEY, JSON.stringify(next));
    if (generation === operation.current && record.current?.savedAt === savedAt) {
      record.current = next;
      setSpot(next);
    }
  }
  async function clear() {
    const generation = ++operation.current;
    locating.current = false;
    setBusy(false);
    const previous = record.current;
    record.current = null;
    try {
      await localStorage.remove(TEST_SPOT_KEY);
      if (generation === operation.current) {
        setSpot(null);
        setFix(null);
        setError('');
      }
    } catch {
      if (generation === operation.current) {
        record.current = previous;
        setError('Could not remove the saved spot. Try again.');
      }
    }
  }
  const nearby =
    spot && fix
      ? proximity(
          {
            ...spot,
            latitude: spot.placement?.latitude ?? spot.latitude,
            longitude: spot.placement?.longitude ?? spot.longitude,
          },
          fix,
          now,
        )
      : null;
  return {
    spot,
    fix,
    busy,
    error,
    loaded,
    nearby,
    allowed: !spot || nearby?.state === 'nearby',
    useCurrentLocation,
    requestLocation,
    saveAnchor,
    savePlacement,
    clear,
  };
}
