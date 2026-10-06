import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { Alert } from 'react-native';
import App from '../App';
import { stops } from '../src/content';
import { TEST_SPOT_KEY } from '../src/testLocation';

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

test('full-screen reading returns to the same selected marker without restarting the camera', async () => {
  await start();
  await enterAR();
  fireEvent.press(screen.getByLabelText('Explore Objects & artifacts'));
  const camera = screen.getByTestId('native-camera');
  fireEvent.press(screen.getByText('Read full screen'));
  expect(screen.getByText('Full story')).toBeTruthy();
  expect(screen.getByText(stops[0].story)).toBeTruthy();
  expect(screen.getByTestId('native-camera')).toBe(camera);
  fireEvent.press(screen.getByText('Return to AR'));
  expect(screen.queryByText('Full story')).toBeNull();
  expect(screen.getByTestId('native-camera')).toBe(camera);
  expect(
    screen.getByLabelText('Explore Objects & artifacts').props.accessibilityState.expanded,
  ).toBe(true);
});

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
  expect(screen.getByText('Your map, your stories.')).toBeTruthy();
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

test('saved map opens the actual story in AR without marking it explored on map preview', async () => {
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
  await start();
  fireEvent.press(screen.getByText('View Site Map'));
  await waitFor(() => expect(screen.getByText('Old Town Hall')).toBeTruthy());
  expect(screen.getByText('Not explored yet')).toBeTruthy();
  fireEvent.press(screen.getByText('Explore in AR'));
  await waitFor(() => expect(screen.getByTestId('native-camera')).toBeTruthy());
  expect(screen.getAllByText('Old Town Hall').length).toBeGreaterThan(0);
  expect(screen.getByText(/A gathering place for town meetings/)).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Go back'));
  fireEvent.press(screen.getByLabelText('Go back'));
  expect(screen.getByText('Story Map')).toBeTruthy();
});

test('leaving AR returns to home instead of an unrelated site overview', async () => {
  await start();
  await enterAR();
  fireEvent.press(screen.getByLabelText('Go back'));
  expect(screen.getByText('Discover the stories hidden around you.')).toBeTruthy();
  expect(screen.queryByText('Site Overview')).toBeNull();
  expect(screen.queryByTestId('native-camera')).toBeNull();
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
  fireEvent.press(screen.getByText('Explore This Site'));
  await waitFor(() => expect(screen.getByTestId('native-camera')).toBeTruthy());
});

test('saved exploration progress is restored after reopening the app', async () => {
  await AsyncStorage.setItem(
    'historylens-progress',
    JSON.stringify({ visited: ['gun', 'keeper'], saved: true }),
  );
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
  await start();
  fireEvent.press(screen.getByText('View Site Map'));
  await waitFor(() => expect(screen.getByText('Explored')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('Go back'));
  fireEvent.press(screen.getByText('Explore This Site'));
  await waitFor(() => expect(screen.getByTestId('native-camera')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('Go back'));
  expect(screen.getByText('View Site Map')).toBeTruthy();
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

test('the general experience uses neutral site copy and an empty map until a place is saved', async () => {
  await start();
  expect(screen.getByText('Objects · places · people')).toBeTruthy();
  expect(screen.queryByText(/Battery Point|Fort Harbor|harbor’s past/)).toBeNull();
  fireEvent.press(screen.getByText('View Site Map'));
  expect(screen.getByText('Your map, your stories.')).toBeTruthy();
  expect(screen.getByText('Add a saved location')).toBeTruthy();
  expect(screen.queryByText('ILLUSTRATIVE LAYOUT')).toBeNull();
  fireEvent.press(screen.getByLabelText('Go back'));
  await enterAR();
  fireEvent.press(screen.getByLabelText('Explore Objects & artifacts'));
  expect(screen.getByText(/Discover the everyday objects/)).toBeTruthy();
  fireEvent.press(screen.getByText('Continue Exploring'));
  fireEvent.press(screen.getByLabelText('Go back'));
  expect(screen.getByText('Discover the stories hidden around you.')).toBeTruthy();
  expect(screen.queryByText(/0.6 mile|Paved route|COASTAL DEFENSE/)).toBeNull();
});
