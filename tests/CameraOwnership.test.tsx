import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';

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
