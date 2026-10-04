import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';
import { TEST_SPOT_KEY } from '../src/testLocation';

const mockSessionStarted = jest.fn();
const mockSessionStopped = jest.fn();
jest.mock('../src/SurfaceARView', () => {
  const React = require('react');
  const { View } = require('react-native');
  const original = jest.requireActual('../src/SurfaceARView');
  return {
    __esModule: true,
    ...original,
    supportsSurfaceAR: true,
    default: (props: object) => {
      React.useEffect(() => {
        mockSessionStarted();
        return () => mockSessionStopped();
      }, []);
      return React.createElement(View, { ...props, testID: 'surface-session' });
    },
  };
});

test('GPS drift keeps an unlocked tile and its AR session alive', async () => {
  await AsyncStorage.clear();
  render(<App />);
  fireEvent.press(screen.getByText('Explore This Site'));
  await waitFor(() => expect(screen.getByTestId('surface-session')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('Open developer settings'));
  fireEvent.press(screen.getByText('Use my current location'));

  await waitFor(() => expect(Location.watchPositionAsync).toHaveBeenCalled());
  const callback = jest.mocked(Location.watchPositionAsync).mock.calls.at(-1)![1];
  act(() =>
    callback({
      coords: { latitude: 42.3765, longitude: -71.1169, accuracy: 5 },
      timestamp: Date.now(),
    } as Location.LocationObject),
  );
  await waitFor(() => expect(screen.getByTestId('surface-session').props.visible).toBe(true));
  expect(screen.queryByTestId('native-camera')).toBeNull();
  expect(mockSessionStarted).toHaveBeenCalledTimes(1);
  expect(mockSessionStopped).not.toHaveBeenCalled();
  act(() =>
    callback({
      coords: { latitude: 42.3745, longitude: -71.1169, accuracy: 5 },
      timestamp: Date.now(),
    } as Location.LocationObject),
  );
  await waitFor(() => expect(screen.getByTestId('surface-session').props.visible).toBe(true));
  expect(mockSessionStarted).toHaveBeenCalledTimes(1);
});

test('global restoration does not bypass GPS uncertainty before the spot unlocks', async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  await AsyncStorage.setItem(
    TEST_SPOT_KEY,
    JSON.stringify({
      name: 'Harvard test spot',
      latitude: 42.3745,
      longitude: -71.1169,
      radius: 50,
      savedAt: 123,
      anchor: { id: 'saved', expiresAt: Date.now() + 86400000, offset: [0, 0, 0] },
    }),
  );
  jest.mocked(Location.watchPositionAsync).mockImplementationOnce(async (_options, callback) => {
    callback({
      coords: { latitude: 42.3745, longitude: -71.1169, accuracy: 100 },
      timestamp: Date.now(),
    } as Location.LocationObject);
    return { remove: jest.fn() };
  });
  render(<App />);
  fireEvent.press(screen.getByText('Explore This Site'));
  await waitFor(() =>
    expect(screen.getByTestId('surface-session').props.testSpot?.anchor?.id).toBe('saved'),
  );
  expect(screen.getByTestId('surface-session').props.visible).toBe(false);
  act(() => screen.getByTestId('surface-session').props.onPhaseChange('globalRestored'));
  expect(screen.getByTestId('surface-session').props.visible).toBe(false);
  act(() => screen.getByTestId('surface-session').props.onPhaseChange('limited'));
  expect(screen.getByTestId('surface-session').props.visible).toBe(false);
});

test('explicit marker preview remains visible even when GPS is uncertain', async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  await AsyncStorage.setItem(
    TEST_SPOT_KEY,
    JSON.stringify({
      name: 'Harvard test spot',
      latitude: 42.3745,
      longitude: -71.1169,
      radius: 50,
      savedAt: 123,
    }),
  );
  jest.mocked(Location.watchPositionAsync).mockImplementationOnce(async (_options, callback) => {
    callback({
      coords: { latitude: 42.3745, longitude: -71.1169, accuracy: 100 },
      timestamp: Date.now(),
    } as Location.LocationObject);
    return { remove: jest.fn() };
  });
  render(<App />);
  fireEvent.press(screen.getByText('Explore This Site'));
  await waitFor(() => expect(screen.getByTestId('surface-session').props.testSpot).toBeTruthy());
  expect(screen.getByTestId('surface-session').props.visible).toBe(false);
  act(() => screen.getByTestId('surface-session').props.onPhaseChange('globalPlaced'));
  expect(screen.getByTestId('surface-session').props.visible).toBe(true);
  act(() => screen.getByTestId('surface-session').props.onPhaseChange('anchorError'));
  expect(screen.getByTestId('surface-session').props.visible).toBe(true);
});

test('Harvard marker ignores hidden stories from a previously selected demo stop', async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  render(<App />);
  fireEvent.press(screen.getByText('View Site Map'));
  fireEvent.press(screen.getByLabelText('Stop 4: Meet Elias Reed'));
  fireEvent.press(screen.getByText('Explore in AR'));
  await waitFor(() => expect(screen.getByTestId('surface-session')).toBeTruthy());
  act(() => screen.getByTestId('surface-session').props.onDismiss());
  fireEvent.press(screen.getByLabelText('Choose historical layers'));
  fireEvent(screen.getByLabelText('Personal stories'), 'valueChange', false);
  fireEvent.press(screen.getByLabelText('Close layers'));
  expect(screen.getByTestId('surface-session').props.visible).toBe(false);
  fireEvent.press(screen.getByLabelText('Open developer settings'));
  fireEvent.press(screen.getByText('Use my current location'));
  await waitFor(() => expect(screen.getByTestId('surface-session').props.testSpot).toBeTruthy());
  expect(screen.getByTestId('surface-session').props.visible).toBe(true);
});

test('show marker restores its layer and opacity when controls have hidden it', async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  await AsyncStorage.setItem(
    TEST_SPOT_KEY,
    JSON.stringify({
      name: 'Harvard test spot',
      latitude: 42.3745,
      longitude: -71.1169,
      radius: 50,
      savedAt: 123,
    }),
  );
  render(<App />);
  fireEvent.press(screen.getByText('Explore This Site'));
  await waitFor(() => expect(screen.getByTestId('surface-session').props.testSpot).toBeTruthy());
  fireEvent.press(screen.getByLabelText('Scan site and reconstruct'));
  fireEvent.press(screen.getByLabelText('Choose historical layers'));
  fireEvent(screen.getByLabelText('Military equipment'), 'valueChange', false);
  fireEvent.press(screen.getByLabelText('Close layers'));
  expect(screen.getByTestId('surface-session').props.visible).toBe(false);
  expect(screen.getByText(/Marker hidden by Layers/)).toBeTruthy();
  fireEvent.press(screen.getByText('Compare'));
  fireEvent(screen.getByLabelText('Historical overlay opacity'), 'valueChange', 0);
  fireEvent.press(screen.getByText('Show marker in front of me'));
  expect(screen.getByTestId('surface-session').props.visible).toBe(true);
  expect(screen.getByTestId('surface-session').props.opacity).toBe(1);
  expect(screen.getByTestId('surface-session').props.revision).toBe(1);
});

test('visiting the site map releases AR and returning resumes camera exploration', async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  render(<App />);
  fireEvent.press(screen.getByText('Explore This Site'));
  await waitFor(() => expect(screen.getByTestId('surface-session')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('Open site map'));
  expect(screen.queryByTestId('surface-session')).toBeNull();
  fireEvent.press(screen.getByLabelText('Go back'));
  await waitFor(() => expect(screen.getByTestId('surface-session')).toBeTruthy());
});

test('native marker opens AR information without a screen overlay or session restart', async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  render(<App />);
  fireEvent.press(screen.getByText('Explore This Site'));
  await waitFor(() => expect(screen.getByTestId('surface-session')).toBeTruthy());
  const revision = screen.getByTestId('surface-session').props.revision;
  act(() => screen.getByTestId('surface-session').props.onSelect('gun'));
  expect(screen.getByTestId('surface-session').props.selected).toBe(true);
  expect(screen.queryByText('Continue Exploring')).toBeNull();
  expect(screen.getByTestId('surface-session').props.onListen).toEqual(expect.any(Function));
  expect(mockSessionStarted).toHaveBeenCalledTimes(1);
  expect(mockSessionStopped).not.toHaveBeenCalled();
  act(() => screen.getByTestId('surface-session').props.onDismiss());
  expect(screen.getByTestId('surface-session').props.selected).toBe(false);
  expect(screen.getByTestId('surface-session').props.revision).toBe(revision);
  expect(mockSessionStarted).toHaveBeenCalledTimes(1);
});
