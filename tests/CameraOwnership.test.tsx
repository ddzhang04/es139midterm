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
  return { __esModule: true, ...original, supportsSurfaceAR: true, default: (props: object) => {
    React.useEffect(() => { mockSessionStarted(); return () => mockSessionStopped(); }, []);
    return React.createElement(View, { ...props, testID: 'surface-session' });
  } };
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
  act(() => callback({ coords: { latitude: 42.3765, longitude: -71.1169, accuracy: 5 }, timestamp: Date.now() } as Location.LocationObject));
  await waitFor(() => expect(screen.getByTestId('surface-session').props.visible).toBe(true));
  expect(screen.queryByTestId('native-camera')).toBeNull();
  expect(mockSessionStarted).toHaveBeenCalledTimes(1);
  expect(mockSessionStopped).not.toHaveBeenCalled();
  act(() => callback({ coords: { latitude: 42.3745, longitude: -71.1169, accuracy: 5 }, timestamp: Date.now() } as Location.LocationObject));
  await waitFor(() => expect(screen.getByTestId('surface-session').props.visible).toBe(true));
  expect(mockSessionStarted).toHaveBeenCalledTimes(1);
});


test('visual restoration reveals the saved tile even while GPS is uncertain', async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  await AsyncStorage.setItem(TEST_SPOT_KEY, JSON.stringify({ name: 'Harvard test spot', latitude: 42.3745, longitude: -71.1169, radius: 50, savedAt: 123, anchor: { id: 'saved', expiresAt: Date.now() + 86400000, offset: [0, 0, 0] } }));
  jest.mocked(Location.watchPositionAsync).mockImplementationOnce(async (_options, callback) => {
    callback({ coords: { latitude: 42.3745, longitude: -71.1169, accuracy: 100 }, timestamp: Date.now() } as Location.LocationObject);
    return { remove: jest.fn() };
  });
  render(<App />);
  fireEvent.press(screen.getByText('Explore This Site'));
  await waitFor(() => expect(screen.getByTestId('surface-session').props.testSpot?.anchor?.id).toBe('saved'));
  expect(screen.getByTestId('surface-session').props.visible).toBe(false);
  act(() => screen.getByTestId('surface-session').props.onPhaseChange('restored'));
  await waitFor(() => expect(screen.getByTestId('surface-session').props.visible).toBe(true));
  act(() => screen.getByTestId('surface-session').props.onPhaseChange('limited'));
  expect(screen.getByTestId('surface-session').props.visible).toBe(true);
});
