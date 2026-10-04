import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import SiteMapScreen from '../src/screens/SiteMapScreen';
import type { TestSpot } from '../src/testLocation';
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
const props = {
  width: 390,
  detail: undefined,
  developer: null,
  onBack: jest.fn(),
  onSelect: jest.fn(),
  onExplore: jest.fn(),
};
beforeEach(() => jest.restoreAllMocks());

test('saved story map shows its real marker coordinates and progress rather than four demo pins', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const explore = jest.fn();
  const view = render(
    <SiteMapScreen
      {...props}
      visited={['quarters']}
      spot={spot}
      fix={{ latitude: 42.3745, longitude: -71.1169, accuracy: 5, timestamp: Date.now() }}
      onExplore={explore}
    />,
  );
  expect(view.getByText('Old Town Hall')).toBeTruthy();
  expect(view.getByText('Not explored yet')).toBeTruthy();
  expect(view.getByText('0 m away')).toBeTruthy();
  expect(view.getByText('You are near the saved site. Open AR to explore.')).toBeTruthy();
  expect(view.queryByLabelText('Stop 4: People & stories')).toBeNull();
  fireEvent.press(view.getByText('Open in Maps'));
  await waitFor(() => expect(open).toHaveBeenCalled());
  expect(open.mock.calls[0][0]).toContain('42.3745,-71.1169');
  expect(open.mock.calls[0][0]).not.toContain('ll=42,-71');
  fireEvent.press(view.getByText('Explore in AR'));
  expect(explore).toHaveBeenCalledTimes(1);
});

test('uncertain location and unavailable Maps have actionable states', async () => {
  jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('unavailable'));
  const view = render(
    <SiteMapScreen
      {...props}
      visited={['gun']}
      spot={spot}
      fix={{ latitude: 42.3745, longitude: -71.1169, accuracy: 100, timestamp: Date.now() }}
    />,
  );
  expect(view.getByText('Explored')).toBeTruthy();
  expect(view.getByText('Waiting for a recent, precise GPS reading.')).toBeTruthy();
  expect(view.queryByText('0 m away')).toBeNull();
  fireEvent.press(view.getByText('Open in Maps'));
  await waitFor(() =>
    expect(
      view.getByText('Could not open Maps. Try again or use the coordinates below.'),
    ).toBeTruthy(),
  );
});
