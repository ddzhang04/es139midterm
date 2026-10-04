import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { Alert } from 'react-native';
import App from '../App';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});
async function start() {
  render(<App />);
  await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
}
async function enterAR() {
  fireEvent.press(screen.getByText('Explore This Site'));
  await waitFor(() => expect(screen.getByTestId('native-camera')).toBeTruthy());
}

test('Explore This Site opens the camera, blocks expand, audio works, and progress persists', async () => {
  await start();
  await enterAR();
  const block = screen.getByLabelText('Explore Objects & artifacts');
  fireEvent.press(block);
  expect(
    screen.getByLabelText('Explore Objects & artifacts').props.accessibilityState.expanded,
  ).toBe(true);
  expect(screen.getByText(/Discover the everyday objects/)).toBeTruthy();
  fireEvent.press(screen.getByText('Listen to Story'));
  expect(Speech.speak).toHaveBeenCalledWith(
    expect.stringContaining('An object can reveal'),
    expect.any(Object),
  );
  fireEvent.press(screen.getByText('Continue Exploring'));
  expect(screen.queryByText('Listen to Story')).toBeNull();
  expect(Speech.stop).toHaveBeenCalled();
  await waitFor(() =>
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'historylens-progress',
      expect.stringContaining('gun'),
    ),
  );
  fireEvent.press(screen.getByText('Site map ↗'));
  expect(screen.getByText('1 of 4 stories explored')).toBeTruthy();
});

test('historical modes, comparison slider, and layer switches control visible blocks', async () => {
  await start();
  await enterAR();
  fireEvent.press(screen.getByLabelText('Scan site and reconstruct'));
  fireEvent.press(screen.getByText('Compare'));
  fireEvent(screen.getByLabelText('Historical overlay opacity'), 'valueChange', 25);
  expect(screen.getByText('PAST OVERLAY: 25%')).toBeTruthy();
  fireEvent.press(screen.getByText('Discover'));
  expect(screen.getByLabelText('Explore People & stories')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Choose historical layers'));
  fireEvent(screen.getByLabelText('People'), 'valueChange', false);
  fireEvent.press(screen.getByLabelText('Close layers'));
  expect(screen.queryByLabelText('Explore People & stories')).toBeNull();
  fireEvent.press(screen.getByLabelText('Choose historical layers'));
  fireEvent(screen.getByLabelText('Archival photographs'), 'valueChange', true);
  fireEvent.press(screen.getByLabelText('Close layers'));
  expect(screen.getByLabelText('Explore archival photograph')).toBeTruthy();
});

test('map selects a stop and opens its native AR detail', async () => {
  await start();
  fireEvent.press(screen.getByText('View Site Map'));
  fireEvent.press(screen.getByLabelText('Stop 4: People & stories'));
  fireEvent.press(screen.getByText('Explore in AR'));
  await waitFor(() => expect(screen.getByTestId('native-camera')).toBeTruthy());
  expect(screen.getByText(/Meet the voices and experiences/)).toBeTruthy();
  fireEvent.press(screen.getByText('View Sources'));
  expect(screen.getByText('Historical Sources')).toBeTruthy();
  expect(screen.getByText(/A place’s history includes/)).toBeTruthy();
});

test('site bookmark persists and acknowledgment panel closes', async () => {
  await start();
  fireEvent.press(screen.getByText('Explore This Site'));
  await waitFor(() => expect(screen.getByTestId('native-camera')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('Go back'));
  fireEvent.press(screen.getByLabelText('Save site'));
  expect(screen.getByText('Saved to your sites')).toBeTruthy();
  await waitFor(() =>
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'historylens-progress',
      expect.stringContaining('"saved":true'),
    ),
  );
  fireEvent.press(screen.getByText('View Tribal Land Acknowledgment'));
  expect(screen.getByText('Indigenous Lands & Living Communities')).toBeTruthy();
  fireEvent.press(screen.getByText('Return to Site Overview'));
  expect(screen.queryByText('Indigenous Lands & Living Communities')).toBeNull();
});

test('camera can switch to demo and back, and is released when leaving exploration', async () => {
  await start();
  await enterAR();
  expect(screen.getByTestId('native-camera')).toBeTruthy();
  fireEvent.press(screen.getByText('Use demo scene'));
  expect(screen.getByText('Use live camera')).toBeTruthy();
  expect(screen.queryByTestId('native-camera')).toBeNull();
  fireEvent.press(screen.getByText('Use live camera'));
  await waitFor(() => expect(screen.getByTestId('native-camera')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('Go back'));
  expect(screen.queryByTestId('native-camera')).toBeNull();
  fireEvent.press(screen.getByText('Start AR Experience'));
  await waitFor(() => expect(screen.getByTestId('native-camera')).toBeTruthy());
});

test('saved exploration progress is restored after reopening the app', async () => {
  await AsyncStorage.setItem(
    'historylens-progress',
    JSON.stringify({ visited: ['gun', 'keeper'], saved: true }),
  );
  await start();
  fireEvent.press(screen.getByText('View Site Map'));
  await waitFor(() => expect(screen.getByText('2 of 4 stories explored')).toBeTruthy());
  expect(screen.getByText('50% complete')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Go back'));
  fireEvent.press(screen.getByText('Explore This Site'));
  await waitFor(() => expect(screen.getByTestId('native-camera')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('Go back'));
  expect(screen.getByLabelText('Unsave site')).toBeTruthy();
});

test('denied camera permission offers Settings and keeps the demo usable', async () => {
  const request = jest.fn().mockResolvedValue({ granted: false });
  const permissions = jest
    .spyOn(require('expo-camera'), 'useCameraPermissions')
    .mockReturnValue([{ granted: false, canAskAgain: true }, request, jest.fn()]);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  try {
    await start();
    fireEvent.press(screen.getByText('Explore This Site'));
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        'Camera access',
        expect.any(String),
        expect.arrayContaining([expect.objectContaining({ text: 'Open Settings' })]),
      ),
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('native-camera')).toBeNull();
    fireEvent.press(screen.getByLabelText('Explore Objects & artifacts'));
    expect(screen.getByText(/Discover the everyday objects/)).toBeTruthy();
  } finally {
    permissions.mockRestore();
    alert.mockRestore();
  }
});

test('the general experience uses neutral site copy and an illustrative story map', async () => {
  await start();
  expect(screen.getByText('Objects · places · people')).toBeTruthy();
  expect(screen.queryByText(/Battery Point|Fort Harbor|harbor’s past/)).toBeNull();
  fireEvent.press(screen.getByText('View Site Map'));
  expect(screen.getByText('ILLUSTRATIVE LAYOUT')).toBeTruthy();
  expect(screen.getByText(/This diagram is not a live location map/)).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Stop 1: Objects & artifacts'));
  fireEvent.press(screen.getByText('Explore in AR'));
  expect(screen.getByText(/Discover the everyday objects/)).toBeTruthy();
  fireEvent.press(screen.getByText('Continue Exploring'));
  fireEvent.press(screen.getByLabelText('Go back'));
  expect(screen.getByText('A place full of stories')).toBeTruthy();
  expect(screen.queryByText(/0.6 mile|Paved route|COASTAL DEFENSE/)).toBeNull();
});
