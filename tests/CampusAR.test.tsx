import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';
import { campusPlaces, campusStory } from '../src/mapPlaces';
import { TEST_SPOT_KEY } from '../src/testLocation';

jest.mock('../src/SurfaceARView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ...jest.requireActual('../src/SurfaceARView'),
    __esModule: true,
    supportsSurfaceAR: true,
    default: (props: object) =>
      React.createElement(View, { ...props, testID: 'campus-ar-session' }),
  };
});
jest.mock('../src/components/StoryMapCanvas', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: object) => React.createElement(View, { ...props, testID: 'campus-map' }),
  };
});
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

test('entering campus AR from the generic map route does not select a sample story and hide all dots', async () => {
  await AsyncStorage.setItem(
    TEST_SPOT_KEY,
    JSON.stringify({
      name: 'Harvard test spot',
      latitude: 42.3745,
      longitude: -71.1169,
      radius: 50,
      savedAt: Date.now(),
    }),
  );
  render(<App />);
  await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(TEST_SPOT_KEY));
  fireEvent.press(screen.getByText('View Site Map'));
  await waitFor(() => expect(screen.getByText('Explore in AR')).toBeTruthy());
  fireEvent.press(screen.getByText('Explore in AR'));
  await waitFor(() => expect(screen.getByTestId('campus-ar-session')).toBeTruthy());
  expect(screen.getByTestId('campus-ar-session').props.selectedStopId).toBeNull();
  expect(screen.getByTestId('campus-ar-session').props.campusMarkersVisible).toBe(true);
});

test.each(campusPlaces)(
  '$title map route unlocks only nearby and opens the correct AR card',
  async (place) => {
    render(<App />);
    fireEvent.press(screen.getByText('View Site Map'));
    await waitFor(() => expect(Location.watchPositionAsync).toHaveBeenCalled());
    fireEvent(screen.getByTestId('campus-map'), 'selectPlace', place);
    fireEvent.press(screen.getByText('Explore in AR'));
    await waitFor(() =>
      expect(screen.getByTestId('campus-ar-session').props.story?.id).toBe(place.id),
    );
    expect(screen.getByTestId('campus-ar-session').props.visible).toBe(false);
    expect(screen.getByTestId('campus-ar-session').props.fixedLocation).toBe(true);
    expect(screen.getByTestId('campus-ar-session').props.testSpot.placement).toMatchObject({
      latitude: place.latitude,
      longitude: place.longitude,
    });
    expect(screen.getByTestId('campus-ar-session').props.onPlacementSaved).toBeUndefined();
    expect(screen.queryByText('Show marker in front of me')).toBeNull();
    await waitFor(() => expect(Location.watchPositionAsync).toHaveBeenCalledTimes(2));
    const update = jest.mocked(Location.watchPositionAsync).mock.calls.at(-1)![1];
    act(() =>
      update({
        coords: { latitude: place.latitude, longitude: place.longitude, accuracy: 100 },
        timestamp: Date.now(),
      } as Location.LocationObject),
    );
    expect(screen.getByTestId('campus-ar-session').props.visible).toBe(false);
    act(() =>
      update({
        coords: { latitude: place.latitude - 0.0001, longitude: place.longitude, accuracy: 5 },
        timestamp: Date.now(),
      } as Location.LocationObject),
    );
    await waitFor(() => expect(screen.getByTestId('campus-ar-session').props.visible).toBe(true));
    act(() => screen.getByTestId('campus-ar-session').props.onSelect(place.id));
    expect(screen.getByTestId('campus-ar-session').props.storyPage).toBe(0);
    expect(screen.queryByTestId('ar-controls')).toBeNull();
    act(() => screen.getByTestId('campus-ar-session').props.onStoryPageChange(1));
    expect(screen.getByTestId('campus-ar-session').props.storyPage).toBe(1);
    act(() => screen.getByTestId('campus-ar-session').props.onStoryPageChange(0));
    expect(screen.getByTestId('campus-ar-session').props.storyPage).toBe(0);
    act(() => screen.getByTestId('campus-ar-session').props.onStoryPageChange(2));
    expect(screen.getByTestId('campus-ar-session').props.storyPage).toBe(2);
    act(() => screen.getByTestId('campus-ar-session').props.onSelect(place.id));
    expect(screen.getByTestId('campus-ar-session').props.storyPage).toBe(0);
    act(() => screen.getByTestId('campus-ar-session').props.onExpand());
    expect(screen.getByText(campusStory(place).story)).toBeTruthy();
    for (const source of campusStory(place).sources!)
      expect(screen.getByText(`${source.title} ↗`)).toBeTruthy();
    fireEvent.press(screen.getByText('Return to AR'));
    act(() =>
      update({
        coords: { latitude: place.latitude - 0.001, longitude: place.longitude, accuracy: 5 },
        timestamp: Date.now(),
      } as Location.LocationObject),
    );
    expect(screen.getByTestId('campus-ar-session').props.visible).toBe(true);
    expect(await AsyncStorage.getItem(TEST_SPOT_KEY)).toBeNull();
    await waitFor(async () =>
      expect(await AsyncStorage.getItem('historylens-progress')).toContain(place.id),
    );
    fireEvent.press(screen.getByLabelText('Go back'));
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(screen.getByText('Story Map')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Go back'));
    fireEvent.press(screen.getByText('Explore This Site'));
    await waitFor(() =>
      expect(screen.getByTestId('campus-ar-session').props.fixedLocation).toBe(false),
    );
    expect(screen.getByTestId('campus-ar-session').props.stopId).toBe('gun');
  },
);

test('nearby campus dots do not replace the active marker or its story', async () => {
  render(<App />);
  fireEvent.press(screen.getByText('Explore This Site'));
  await waitFor(() => expect(Location.watchPositionAsync).toHaveBeenCalled());
  const place = campusPlaces[1];
  const update = jest.mocked(Location.watchPositionAsync).mock.calls.at(-1)![1];
  act(() =>
    update({
      coords: { latitude: place.latitude, longitude: place.longitude, accuracy: 100 },
      timestamp: Date.now(),
    } as Location.LocationObject),
  );
  expect(screen.getByTestId('campus-ar-session').props.fixedLocation).toBe(false);
  act(() =>
    update({
      coords: { latitude: place.latitude, longitude: place.longitude, accuracy: 5 },
      timestamp: Date.now(),
    } as Location.LocationObject),
  );
  expect(screen.getByTestId('campus-ar-session').props.stopId).toBe('gun');
  expect(screen.getByTestId('campus-ar-session').props.campusMarkers).toBe(true);
  act(() => screen.getByTestId('campus-ar-session').props.onSelect(place.id));
  act(() => screen.getByTestId('campus-ar-session').props.onExpand());
  expect(screen.getByText(campusStory(place).story)).toBeTruthy();
  expect(screen.getByTestId('campus-ar-session').props.visible).toBe(true);
  expect(await AsyncStorage.getItem(TEST_SPOT_KEY)).toBeNull();
});

test('tree demo works away from campus without creating or saving a GPS location', async () => {
  render(<App />);
  fireEvent.press(screen.getByText('Explore This Site'));
  await waitFor(() => expect(screen.getByTestId('campus-ar-session')).toBeTruthy());
  expect(screen.queryByText('Place demo tree')).toBeNull();
  fireEvent.press(screen.getByLabelText('Open developer settings'));
  fireEvent.press(screen.getByText('Place demo tree'));
  await waitFor(() => expect(screen.getByTestId('campus-ar-session').props.demoTree).toBe(true));
  const props = screen.getByTestId('campus-ar-session').props;
  expect(props.testSpot).toBeNull();
  expect(props.visible).toBe(true);
  expect(props.stopId).toBe('demo-tree');
  expect(props.onPlacementSaved).toBeUndefined();
  expect(screen.queryByText('Save global position')).toBeNull();
  const revision = props.revision;
  expect(screen.queryByText('Place tree again')).toBeNull();
  fireEvent.press(screen.getByLabelText('Open developer settings'));
  fireEvent.press(screen.getByText('Place tree again'));
  expect(screen.getByTestId('campus-ar-session').props.revision).toBeGreaterThan(revision);
  act(() => screen.getByTestId('campus-ar-session').props.onSelect('demo-tree'));
  expect(screen.queryByTestId('ar-controls')).toBeNull();
  expect(screen.queryByRole('tab', { name: 'Compare' })).toBeNull();
  expect(screen.queryByText('Return to AR')).toBeNull();
  act(() => screen.getByTestId('campus-ar-session').props.onExpand());
  expect(screen.getAllByText('this is a tree wow so cool i love trees').length).toBeGreaterThan(0);
  fireEvent.press(screen.getByText('Return to AR'));
  act(() => screen.getByTestId('campus-ar-session').props.onDismiss());
  fireEvent.press(screen.getByLabelText('Open developer settings'));
  fireEvent.press(screen.getByText('Return to site markers'));
  await waitFor(() => expect(screen.getByTestId('campus-ar-session').props.demoTree).toBe(false));
  expect(await AsyncStorage.getItem(TEST_SPOT_KEY)).toBeNull();
});

test('photographing a real landmark requires review before collecting its story', async () => {
  render(<App />);
  fireEvent.press(screen.getByText('Explore This Site'));
  await waitFor(() => expect(screen.getByTestId('campus-ar-session')).toBeTruthy());
  fireEvent.press(screen.getByText('Scan objects'));
  expect(screen.queryByTestId('campus-ar-session')).toBeNull();
  fireEvent.press(await screen.findByText(/Harvard Science Center ·/));
  fireEvent(await screen.findByTestId('native-camera'), 'cameraReady');
  fireEvent.press(screen.getByText('Take landmark photo'));
  await screen.findByTestId('landmark-photo-preview');
  expect(await AsyncStorage.getItem('historylens-object-collection')).toBeNull();
  fireEvent.press(screen.getByText('Use photo & collect story'));
  await waitFor(() =>
    expect(screen.getByTestId('campus-ar-session').props.selectedStopId).toBe(
      'harvard-science-center',
    ),
  );
  await waitFor(async () =>
    expect(await AsyncStorage.getItem('historylens-object-collection')).toBe(
      '["harvard-science-center"]',
    ),
  );
  expect(screen.getByText('Collected: Harvard Science Center')).toBeTruthy();
});
