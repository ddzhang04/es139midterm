import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Linking, UIManager } from 'react-native';
import SiteMapScreen from '../src/screens/SiteMapScreen';
import type { TestSpot } from '../src/testLocation';
const mockAnimate = jest.fn();
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef((props: object, ref: unknown) => {
      React.useImperativeHandle(ref, () => ({ animateToRegion: mockAnimate }));
      return React.createElement(View, props);
    }),
    Marker: (props: object) => React.createElement(View, { ...props, testID: 'map-marker' }),
    Circle: (props: object) => React.createElement(View, { ...props, testID: 'map-accuracy' }),
  };
});
const spot: TestSpot = {
  name: 'Harvard test spot',
  latitude: 42,
  longitude: -71,
  radius: 50,
  savedAt: 123,
  placement: {
    latitude: 42.3745,
    longitude: -71.1169,
    altitude: null,
    altitudeReference: 'WGS84',
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    savedAt: 456,
    horizontalAccuracy: 5,
    altitudeAccuracy: null,
  },
};
const fix = () => ({ latitude: 42.3745, longitude: -71.1169, accuracy: 5, timestamp: Date.now() });
const props = {
  width: 390,
  visited: [],
  detail: undefined,
  developer: null,
  onBack: jest.fn(),
  onSelect: jest.fn(),
  onExplore: jest.fn(),
  onExplorePlace: jest.fn(),
  onRequestLocation: jest.fn(),
  onAddLocation: jest.fn(),
};
beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.spyOn(UIManager, 'hasViewManagerConfig').mockReturnValue(true);
});

test('native map uses the saved AR coordinates and a real location dot, not demo pins', () => {
  const view = render(<SiteMapScreen {...props} spot={spot} fix={fix()} />);
  expect(view.getByTestId('native-story-map').props.initialRegion).toMatchObject({
    latitude: 42.3745,
    longitude: -71.1169,
  });
  const pins = view.getAllByTestId('map-marker');
  expect(pins).toHaveLength(5);
  const story = pins.find((pin) => pin.props.identifier === 'saved-story')!;
  expect(story.props.coordinate).toMatchObject({ latitude: 42.3745, longitude: -71.1169 });
  fireEvent(story, 'press');
  expect(props.onSelect).toHaveBeenCalledWith('gun');
  expect(view.getByText('Not explored yet')).toBeTruthy();
  fireEvent.press(view.getByText('Explore in AR'));
  expect(props.onExplore).toHaveBeenCalledTimes(1);
  expect(view.getByText('0 m away')).toBeTruthy();
});

test('GPS updates do not steal map gestures, and locate explicitly recenters', () => {
  const view = render(<SiteMapScreen {...props} spot={spot} fix={fix()} />);
  fireEvent(view.getByTestId('native-story-map'), 'mapReady');
  mockAnimate.mockClear();
  const next = { ...fix(), latitude: 42.375 };
  view.rerender(<SiteMapScreen {...props} spot={spot} fix={next} />);
  expect(mockAnimate).not.toHaveBeenCalled();
  fireEvent.press(view.getByLabelText('Center map on my location'));
  expect(mockAnimate).toHaveBeenCalledWith(
    expect.objectContaining({ latitude: next.latitude }),
    350,
  );
});

test('campus pins remain available without a saved spot or precise GPS', () => {
  const view = render(<SiteMapScreen {...props} fix={{ ...fix(), accuracy: 100 }} />);
  expect(view.queryAllByTestId('map-marker')).toHaveLength(3);
  fireEvent.press(view.getByLabelText('Center map on my location'));
  expect(props.onRequestLocation).toHaveBeenCalledTimes(1);
  fireEvent.press(view.getByText('Add a saved location'));
  expect(props.onAddLocation).toHaveBeenCalledTimes(1);
});

test('old builds show an actionable message instead of mounting missing native map views', () => {
  jest.spyOn(UIManager, 'hasViewManagerConfig').mockReturnValue(false);
  const view = render(<SiteMapScreen {...props} spot={spot} />);
  expect(view.queryByTestId('native-story-map')).toBeNull();
  expect(view.getByText('Native map needs an updated app')).toBeTruthy();
});

test('both Harvard pins open their own location cards and courtyard directions', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const view = render(<SiteMapScreen {...props} spot={spot} fix={fix()} />);
  const marker = (id: string) =>
    view.getAllByTestId('map-marker').find((pin) => pin.props.identifier === id)!;
  fireEvent(marker('harvard-science-center'), 'press');
  expect(view.getByText('Harvard Science Center')).toBeTruthy();
  expect(view.queryByText('Old Town Hall')).toBeNull();
  fireEvent(marker('quincy-house-courtyard'), 'press');
  expect(view.getByText('Quincy House courtyard')).toBeTruthy();
  expect(view.queryByText('Harvard Science Center')).toBeNull();
  fireEvent.press(view.getByText('Explore in AR'));
  expect(props.onExplorePlace).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'quincy-house-courtyard' }),
  );
  fireEvent.press(view.getByText('Walking directions'));
  expect(open).toHaveBeenCalledWith(expect.stringContaining('42.37072,-71.1169'));
  fireEvent(marker('saved-story'), 'press');
  expect(view.getByText('Old Town Hall')).toBeTruthy();
  expect(view.getByText('Explore in AR')).toBeTruthy();
});

test('Malkin map pin opens its own AR route and walking directions', () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const view = render(<SiteMapScreen {...props} />);
  const pin = view
    .getAllByTestId('map-marker')
    .find((pin) => pin.props.identifier === 'malkin-athletic-center')!;
  fireEvent(pin, 'press');
  expect(view.getByText('Malkin Athletic Center')).toBeTruthy();
  fireEvent.press(view.getByText('Explore in AR'));
  expect(props.onExplorePlace).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'malkin-athletic-center' }),
  );
  fireEvent.press(view.getByText('Walking directions'));
  expect(open).toHaveBeenCalledWith(expect.stringContaining('42.37135,-71.11938'));
});
