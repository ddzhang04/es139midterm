import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { PlacementScene } from '../src/SurfaceARScene';
jest.mock('../src/SurfaceARView', () => ({ persistentAnchorsEnabled: true }));
import type { SurfaceARProps } from '../src/SurfaceARView';

const mockAnchors = { handleAnchorFound: jest.fn(), handleAnchorUpdated: jest.fn(), handleAnchorRemoved: jest.fn(), reset: jest.fn() };
jest.mock('@reactvision/react-viro', () => {
  const React = require('react');
  const { View } = require('react-native');
  const component = (name: string) => (props: object) => React.createElement(View, { ...props, testID: name });
  return {
    ViroARScene: component('scene'),
    ViroARPlaneSelector: React.forwardRef((props: object, ref: unknown) => { React.useImperativeHandle(ref, () => mockAnchors); return React.createElement(View, { ...props, testID: 'selector' }); }),
    ViroNode: component('node'), ViroQuad: component('quad'), ViroText: component('text'),
    ViroMaterials: { createMaterials: jest.fn() }, ViroTrackingStateConstants: { TRACKING_NORMAL: 3 },
  };
});

function props(): SurfaceARProps { return { stopId: 'gun', selected: false, visible: true, opacity: 1, revision: 0, onSelect: jest.fn(), onDismiss: jest.fn(), onPhaseChange: jest.fn() }; }
beforeEach(() => jest.clearAllMocks());

test('surface events reach the plane selector and placement survives normal tracking', () => {
  const app = props();
  const view = render(<PlacementScene sceneNavigator={{ viroAppProps: app }} />);
  const anchor = { anchorId: 'ground' };
  fireEvent(view.getByTestId('scene'), 'anchorFound', anchor);
  fireEvent(view.getByTestId('scene'), 'anchorUpdated', anchor);
  expect(mockAnchors.handleAnchorFound).toHaveBeenCalledWith(anchor);
  expect(mockAnchors.handleAnchorUpdated).toHaveBeenCalledWith(anchor);
  fireEvent(view.getByTestId('selector'), 'planeDetected', anchor);
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('choose');
  fireEvent(view.getByTestId('selector'), 'planeSelected', anchor);
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('placed');
  fireEvent(view.getByTestId('scene'), 'trackingUpdated', 2);
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('limited');
  fireEvent(view.getByTestId('scene'), 'trackingUpdated', 3);
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('placed');
  fireEvent(view.getByTestId('scene'), 'anchorRemoved', anchor);
  expect(mockAnchors.handleAnchorRemoved).toHaveBeenCalledWith(anchor);
  expect(app.onDismiss).toHaveBeenCalled();
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('lost');
});

test('flat anchored tile opens a world-space rectangle and reposition resets placement', () => {
  const app = props();
  const view = render(<PlacementScene sceneNavigator={{ viroAppProps: app }} />);
  const tile = view.getByTestId('quad');
  expect(tile.props.rotation).toEqual([-90, 0, 0]);
  expect(tile.props.position).toEqual([0, 0.004, 0]);
  expect(view.getByTestId('selector').findAllByProps({ testID: 'quad' })).toContain(tile);
  fireEvent(tile, 'click');
  expect(app.onSelect).toHaveBeenCalledWith('gun');
  view.rerender(<PlacementScene sceneNavigator={{ viroAppProps: { ...app, selected: true } }} />);
  expect(view.getAllByTestId('quad')).toHaveLength(2);
  expect(view.getAllByTestId('node').some(node => node.props.transformBehaviors?.includes('billboard'))).toBe(true);
  fireEvent(view.getAllByTestId('quad')[0], 'click');
  expect(app.onDismiss).toHaveBeenCalled();
  mockAnchors.reset.mockClear();
  act(() => view.rerender(<PlacementScene sceneNavigator={{ viroAppProps: { ...app, revision: 1 } }} />));
  expect(mockAnchors.reset).toHaveBeenCalledTimes(1);
});


test('cloud hosting saves the tapped surface offset and restoration uses the returned pose', async () => {
  const spot = { name: 'Harvard test spot', latitude: 42.3745, longitude: -71.1169, radius: 50, savedAt: 123 };
  const app = { ...props(), testSpot: spot, saveRequest: 0, onAnchorSaved: jest.fn().mockResolvedValue(undefined) };
  const hostCloudAnchor = jest.fn().mockResolvedValue({ success: true, cloudAnchorId: 'saved-plane' });
  const anchor = { anchorId: 'plane', position: [1, 0, 1], rotation: [0, 0, 0] };
  const navigator = { viroAppProps: app, hostCloudAnchor, resolveCloudAnchor: jest.fn() };
  const view = render(<PlacementScene sceneNavigator={navigator} />);
  fireEvent(view.getByTestId('selector'), 'planeSelected', anchor, [1.2, 0, 1.3]);
  await act(async () => view.rerender(<PlacementScene sceneNavigator={{ ...navigator, viroAppProps: { ...app, saveRequest: 1 } }} />));
  expect(hostCloudAnchor).toHaveBeenCalledWith('plane', 1);
  expect(app.onAnchorSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'saved-plane', offset: [expect.closeTo(0.2), 0, expect.closeTo(0.3)] }), 123);
  view.unmount();
  const saved = { id: 'saved-plane', expiresAt: Date.now() + 86400000, offset: [0.2, 0, 0.3] };
  const resolveCloudAnchor = jest.fn().mockResolvedValue({ success: true, anchor: { anchorId: 'restored', position: [3, 0, -2], rotation: [0, 45, 0] } });
  const restoredApp = { ...props(), testSpot: { ...spot, anchor: saved } };
  const restored = render(<PlacementScene sceneNavigator={{ viroAppProps: restoredApp, resolveCloudAnchor, hostCloudAnchor }} />);
  await act(async () => {});
  expect(resolveCloudAnchor).toHaveBeenCalledWith('saved-plane');
  expect(restoredApp.onPhaseChange).toHaveBeenLastCalledWith('placed');
  expect(restored.getAllByTestId('node').some(node => JSON.stringify(node.props.position) === '[3,0,-2]' && JSON.stringify(node.props.rotation) === '[0,45,0]')).toBe(true);
});

test('cloud errors and expired anchors report failure without inventing a placement', async () => {
  const app = { ...props(), testSpot: { name: 'Harvard test spot', latitude: 0, longitude: 0, radius: 50, savedAt: 1, anchor: { id: 'expired', expiresAt: 1, offset: [0, 0, 0] } } };
  const navigator = { viroAppProps: app, resolveCloudAnchor: jest.fn(), hostCloudAnchor: jest.fn() };
  const view = render(<PlacementScene sceneNavigator={navigator} />);
  expect(navigator.resolveCloudAnchor).not.toHaveBeenCalled();
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('anchorError');
  const resolveCloudAnchor = jest.fn().mockRejectedValue(new Error('Offline'));
  await act(async () => view.rerender(<PlacementScene sceneNavigator={{ ...navigator, resolveCloudAnchor, viroAppProps: { ...app, testSpot: { ...app.testSpot, savedAt: 2, anchor: { ...app.testSpot.anchor, expiresAt: Date.now() + 100000 } } } }} />));
  expect(resolveCloudAnchor).toHaveBeenCalled();
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('anchorError');
});
