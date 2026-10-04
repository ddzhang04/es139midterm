import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCameraPermissions } from 'expo-camera';
import App from '../App';
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { uiPreview: true } } } }));

test('simulator UI preview opens an interactive demo without camera permission or an AR session', async () => {
  await AsyncStorage.clear();
  const request = jest.fn();
  const permission = jest.spyOn(require('expo-camera'), 'useCameraPermissions').mockReturnValue([{ granted: false }, request, jest.fn()]);
  try {
    render(<App />);
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
    fireEvent.press(screen.getByText('Explore This Site'));
    expect(request).not.toHaveBeenCalled();
    expect(screen.queryByTestId('native-camera')).toBeNull();
    expect(screen.getByText('Simulator · demo scene')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Explore The 10-inch gun'));
    expect(screen.getByText('Listen to Story')).toBeTruthy();
    fireEvent.press(screen.getByText('Continue Exploring'));
    fireEvent.press(screen.getByLabelText('Open developer settings'));
    expect(screen.getByText('Developer Settings')).toBeTruthy();
  } finally { permission.mockRestore(); }
});
