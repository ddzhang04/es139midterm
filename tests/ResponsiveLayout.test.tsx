import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ResponsiveAROverlay, { arLayoutBudget } from '../src/ResponsiveAROverlay';
import App from '../App';

test('header, camera, and footer budgets fit short and tall safe-area viewports', () => {
  for (const height of [320, 490, 589, 766, 946]) {
    for (const topHeight of [56, 130, height * 0.32]) {
      const layout = arLayoutBudget(height, Math.min(topHeight, height * 0.32));
      expect(layout.footerMaximum).toBeGreaterThanOrEqual(0);
      expect(
        Math.min(topHeight, layout.topMaximum) + layout.cameraMinimum + layout.footerMaximum,
      ).toBeLessThanOrEqual(height);
      expect(layout.cameraMinimum).toBeGreaterThan(0);
    }
  }
});

test('growing header and viewport resizing reduce the scrollable footer without covering the camera', () => {
  const content = {
    top: <Text>Long instruction</Text>,
    scene: <Text>Camera</Text>,
    footer: <Text>Controls</Text>,
  };
  const view = render(<ResponsiveAROverlay height={600} {...content} />);
  fireEvent(view.getByTestId('ar-top'), 'layout', { nativeEvent: { layout: { height: 190 } } });
  expect(StyleSheet.flatten(view.getByTestId('ar-controls').props.style).maxHeight).toBe(290);
  view.rerender(<ResponsiveAROverlay height={400} {...content} />);
  fireEvent(view.getByTestId('ar-top'), 'layout', { nativeEvent: { layout: { height: 128 } } });
  expect(StyleSheet.flatten(view.getByTestId('ar-controls').props.style).maxHeight).toBe(184);
  expect(StyleSheet.flatten(view.getByTestId('ar-interaction-area').props.style).minHeight).toBe(
    88,
  );
});

test('small-screen large-text navigation keeps story actions, layers, and developer settings reachable', async () => {
  const dimensions = jest
    .spyOn(require('react-native'), 'useWindowDimensions')
    .mockReturnValue({ width: 320, height: 568, scale: 2, fontScale: 2 });
  try {
    await AsyncStorage.clear();
    render(<App />);
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
    fireEvent.press(screen.getByText('Explore This Site'));
    await waitFor(() => expect(screen.getByTestId('ar-overlay')).toBeTruthy());
    expect(
      screen.getByTestId('ar-top').findByProps({ accessibilityLabel: 'Open developer settings' }),
    ).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Explore The 10-inch gun'));
    expect(
      screen.getByTestId('story-info-content').findByProps({ children: 'Listen to Story' }),
    ).toBeTruthy();
    fireEvent.press(screen.getByText('View Sources'));
    expect(StyleSheet.flatten(screen.getByTestId('app-modal').props.style).maxHeight).toBe(458);
    fireEvent.press(screen.getByLabelText('Close panel'));
    fireEvent.press(screen.getByText('Continue Exploring'));
    fireEvent.press(screen.getByLabelText('Scan site and reconstruct'));
    fireEvent.press(screen.getByText('Discover'));
    fireEvent.press(screen.getByLabelText('Choose historical layers'));
    expect(
      screen
        .getByTestId('ar-scene-content')
        .findByProps({ accessibilityLabel: 'Archival photographs' }),
    ).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Close layers'));
    fireEvent.press(screen.getByLabelText('Open developer settings'));
    expect(screen.getByText('Use my current location')).toBeTruthy();
  } finally {
    dimensions.mockRestore();
  }
});
