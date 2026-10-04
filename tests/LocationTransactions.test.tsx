import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import useTestLocation from '../src/useTestLocation';
import { localStorage } from '../src/localStorage';
import { TEST_SPOT_KEY, type GlobalPlacement } from '../src/testLocation';

const spot = {
  name: 'Harvard test spot',
  latitude: 42.3745,
  longitude: -71.1169,
  radius: 50,
  savedAt: 123,
};
const placement: GlobalPlacement = {
  ...spot,
  altitude: null,
  altitudeReference: 'WGS84',
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
  horizontalAccuracy: 5,
  altitudeAccuracy: null,
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  await localStorage.write(TEST_SPOT_KEY, JSON.stringify(spot));
});

test('deleting a spot while its marker save is in flight cannot resurrect it', async () => {
  const { result } = renderHook(() => useTestLocation(false));
  await waitFor(() => expect(result.current.loaded).toBe(true));
  const pending = deferred<void>();
  const implementation = jest.mocked(AsyncStorage.setItem).getMockImplementation()!;
  jest
    .mocked(AsyncStorage.setItem)
    .mockImplementationOnce((key, value) => pending.promise.then(() => implementation(key, value)));
  let save!: Promise<void>, remove!: Promise<void>;
  act(() => {
    save = result.current.savePlacement(placement, spot.savedAt);
  });
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2));
  act(() => {
    remove = result.current.clear();
  });
  await act(async () => {
    pending.resolve();
    await Promise.all([save, remove]);
  });
  expect(result.current.spot).toBeNull();
  expect(await localStorage.read(TEST_SPOT_KEY)).toBeNull();
});

test('moving the spot rejects saves for the previous position before GPS finishes', async () => {
  const { result } = renderHook(() => useTestLocation(false));
  await waitFor(() => expect(result.current.loaded).toBe(true));
  const pending = deferred<Location.LocationObject>();
  jest.mocked(Location.getCurrentPositionAsync).mockReturnValueOnce(pending.promise);
  let move!: Promise<void>;
  act(() => {
    move = result.current.useCurrentLocation();
  });
  await waitFor(() => expect(Location.getCurrentPositionAsync).toHaveBeenCalled());
  await expect(result.current.savePlacement(placement, spot.savedAt)).rejects.toThrow(
    'Test spot changed',
  );
  await act(async () => {
    pending.resolve({
      coords: { latitude: 42.4, longitude: -71.2, accuracy: 5 },
      timestamp: Date.now(),
    } as Location.LocationObject);
    await move;
  });
  expect(result.current.spot?.latitude).toBe(42.4);
  expect(result.current.spot?.placement).toBeUndefined();
  expect(JSON.parse((await localStorage.read(TEST_SPOT_KEY))!).latitude).toBe(42.4);
});

test('repeated location-button taps start only one GPS request', async () => {
  const { result } = renderHook(() => useTestLocation(false));
  await waitFor(() => expect(result.current.loaded).toBe(true));
  let first!: Promise<void>, second!: Promise<void>;
  await act(async () => {
    first = result.current.useCurrentLocation();
    second = result.current.useCurrentLocation();
    await Promise.all([first, second]);
  });
  expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
});
