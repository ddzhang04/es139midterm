import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';
import { TEST_SPOT_KEY, distanceMeters, parseSpot, proximity } from '../src/testLocation';
import useTestLocation from '../src/useTestLocation';
import { surfaceOffset } from '../src/anchorPlacement';

function openDev() {
  if (!screen.queryByText('Developer Settings'))
    fireEvent.press(screen.getByLabelText('Open developer settings'));
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

test('current phone position is saved, restored and removed as a Harvard test spot', async () => {
  const view = render(<App />);
  await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(TEST_SPOT_KEY));
  openDev();
  fireEvent.press(screen.getByText('Use my current location'));
  await waitFor(() => expect(screen.getByText('Move test spot to my location')).toBeTruthy());
  expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
  const stored = parseSpot(await AsyncStorage.getItem(TEST_SPOT_KEY));
  expect(stored).toMatchObject({
    name: 'Harvard test spot',
    latitude: 42.3745,
    longitude: -71.1169,
    radius: 50,
  });
  fireEvent.press(screen.getByLabelText('Close panel'));
  fireEvent.press(screen.getByText('Explore This Site'));
  await waitFor(() => expect(screen.getByLabelText('Explore Harvard test spot')).toBeTruthy());
  expect(screen.queryByLabelText('Explore The 10-inch gun')).toBeNull();
  view.unmount();
  render(<App />);
  openDev();
  await waitFor(() => expect(screen.getByText('Move test spot to my location')).toBeTruthy());
  fireEvent.press(screen.getByText('Remove test spot'));
  await waitFor(() => expect(screen.getByText('Use my current location')).toBeTruthy());
  expect(await AsyncStorage.getItem(TEST_SPOT_KEY)).toBeNull();
});

test('walking preserves the unlocked tile and leaves its saved location unchanged', async () => {
  render(<App />);
  await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(TEST_SPOT_KEY));
  openDev();
  fireEvent.press(screen.getByText('Use my current location'));
  await waitFor(() => expect(screen.getByText('Move test spot to my location')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('Close panel'));
  fireEvent.press(screen.getByText('Explore This Site'));
  await waitFor(() => expect(screen.getByLabelText('Explore Harvard test spot')).toBeTruthy());
  await waitFor(() => expect(Location.watchPositionAsync).toHaveBeenCalled());
  const callback = jest.mocked(Location.watchPositionAsync).mock.calls.at(-1)![1];
  act(() =>
    callback({
      coords: {
        latitude: 42.3765,
        longitude: -71.1169,
        accuracy: 5,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    }),
  );
  await waitFor(() => expect(screen.getByLabelText('Explore Harvard test spot')).toBeTruthy());
  expect(parseSpot(await AsyncStorage.getItem(TEST_SPOT_KEY))?.latitude).toBe(42.3745);
});

test('permission denial and inaccurate GPS do not create a location', async () => {
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValueOnce({ granted: false } as Location.LocationPermissionResponse);
  render(<App />);
  await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(TEST_SPOT_KEY));
  openDev();
  fireEvent.press(screen.getByText('Use my current location'));
  await waitFor(() => expect(screen.getByText(/Allow location access in Settings/)).toBeTruthy());
  expect(await AsyncStorage.getItem(TEST_SPOT_KEY)).toBeNull();
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValueOnce({
    coords: { latitude: 42.3745, longitude: -71.1169, accuracy: 100 },
    timestamp: Date.now(),
  } as Location.LocationObject);
  openDev();
  fireEvent.press(screen.getByText('Use my current location'));
  await waitFor(() => expect(screen.getByText(/Waiting for a precise GPS fix/)).toBeTruthy());
  expect(await AsyncStorage.getItem(TEST_SPOT_KEY)).toBeNull();
});

test('proximity handles uncertainty, stale fixes, date-line distance and corrupt storage', () => {
  const spot = {
    name: 'Harvard test spot',
    latitude: 42.3745,
    longitude: -71.1169,
    radius: 50,
    savedAt: Date.now(),
  };
  const fix = { ...spot, accuracy: 5, timestamp: Date.now() };
  expect(proximity(spot, fix).state).toBe('nearby');
  expect(proximity(spot, { ...fix, accuracy: 75 }).state).toBe('uncertain');
  expect(proximity(spot, fix, fix.timestamp + 21000).state).toBe('uncertain');
  expect(proximity(spot, { ...fix, latitude: spot.latitude + 0.002 }).state).toBe('far');
  expect(
    distanceMeters({ latitude: 0, longitude: 179.999 }, { latitude: 0, longitude: -179.999 }),
  ).toBeLessThan(230);
  expect(parseSpot('{broken')).toBeNull();
  expect(parseSpot(JSON.stringify({ ...spot, latitude: 999 }))).toBeNull();
});

test('tap offsets stay on the selected surface, including rotated planes', () => {
  expect(surfaceOffset([2, 4, 5], [1, 4, 3], [0, 0, 0])).toEqual([1, 0, 2]);
  const offset = surfaceOffset([1, 0, 0], [0, 0, 0], [0, 90, 0]);
  expect(offset[0]).toBeCloseTo(0);
  expect(offset[2]).toBeCloseTo(1);
});

test('location tools are hidden behind the corner developer menu', async () => {
  render(<App />);
  await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(TEST_SPOT_KEY));
  expect(screen.queryByText('Use my current location')).toBeNull();
  openDev();
  expect(screen.getByText('Developer Settings')).toBeTruthy();
  expect(screen.getByText('Use my current location')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Close panel'));
  expect(screen.queryByText('Use my current location')).toBeNull();
});

test('a hosted anchor ID and tap offset survive a full location-hook restart', async () => {
  const spot = {
    name: 'Harvard test spot',
    latitude: 42.3745,
    longitude: -71.1169,
    radius: 50,
    savedAt: 123,
  };
  const anchor = {
    id: 'cloud-anchor',
    expiresAt: Date.now() + 86400000,
    offset: [0.2, 0, -0.4] as [number, number, number],
  };
  await AsyncStorage.setItem(TEST_SPOT_KEY, JSON.stringify(spot));
  const first = renderHook(() => useTestLocation(false));
  await waitFor(() => expect(first.result.current.loaded).toBe(true));
  await act(async () => first.result.current.saveAnchor(anchor, spot.savedAt));
  first.unmount();
  const second = renderHook(() => useTestLocation(false));
  await waitFor(() => expect(second.result.current.loaded).toBe(true));
  expect(second.result.current.spot?.anchor).toEqual(anchor);
});

test('a future-dated GPS fix cannot unlock a location', () => {
  const spot = {
    name: 'Harvard test spot',
    latitude: 42.3745,
    longitude: -71.1169,
    radius: 50,
    savedAt: Date.now(),
  };
  expect(proximity(spot, { ...spot, accuracy: 5, timestamp: Date.now() + 60000 }).state).toBe(
    'uncertain',
  );
});
