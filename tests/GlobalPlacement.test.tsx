import React from 'react';
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalPlacementScene } from '../src/GlobalARScene';
import { globalToWorld, markerDirection, worldToGlobal } from '../src/globalPlacement';
import { parseSpot, TEST_SPOT_KEY } from '../src/testLocation';
import useTestLocation from '../src/useTestLocation';
import { harvardTestStop } from '../src/content';
import { storyPages } from '../src/components/ARInfoPanel';
import { panelFacingRotation } from '../src/arPanelFacing';
import { surfaceWorldPoint } from '../src/anchorPlacement';
import type { SurfaceARProps } from '../src/SurfaceARView';
jest.mock('@reactvision/react-viro', () => {
  const React = require('react');
  const { View } = require('react-native');
  const component = (name: string) => (props: object) =>
    React.createElement(View, { ...props, testID: name });
  return {
    ViroARScene: component('scene'),
    ViroARSceneNavigator: component('navigator'),
    ViroNode: component('node'),
    ViroBox: component('box'),
    ViroSphere: component('marker-touch-target'),
    ViroQuad: component('quad'),
    ViroText: component('text'),
    ViroMaterials: { createMaterials: jest.fn() },
    ViroTrackingStateConstants: { TRACKING_NORMAL: 3 },
  };
});
const spot = {
  name: 'Harvard test spot',
  latitude: 42.3745,
  longitude: -71.1169,
  radius: 50,
  savedAt: 123,
};
const fix = () => ({
  ...spot,
  accuracy: 5,
  timestamp: Date.now(),
  altitude: 20,
  altitudeAccuracy: 4,
});
const camera = { position: [1, 2, 3], forward: [0, 0, -1], rotation: [0, 0, 0], up: [0, 1, 0] };
const appProps = (): SurfaceARProps => ({
  stopId: 'gun',
  testSpot: spot,
  locationFix: fix(),
  selected: false,
  visible: true,
  opacity: 1,
  revision: 0,
  onSelect: jest.fn(),
  onDismiss: jest.fn(),
  onPhaseChange: jest.fn(),
  onPlacementSaved: jest.fn().mockResolvedValue(undefined),
  saveRequest: 0,
});
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

test('global coordinates round-trip across session origins, with altitude and date-line handling', () => {
  const saved = worldToGlobal([4, 3, -2], fix(), [1, 2, 3]);
  const restored = globalToWorld(saved, fix(), [8, 9, 10]);
  expect(restored[0]).toBeCloseTo(11);
  expect(restored[1]).toBeCloseTo(10);
  expect(restored[2]).toBeCloseTo(5);
  expect(saved.altitude).toBe(21);
  expect(saved.rotation).toEqual([0, 0, 0]);
  expect(saved.scale).toEqual([1, 1, 1]);
  expect(
    globalToWorld(
      { latitude: 0, longitude: -179.999, altitude: null },
      { latitude: 0, longitude: 179.999, accuracy: 5, timestamp: Date.now() },
      [0, 0, 0],
    )[0],
  ).toBeCloseTo(222.39, 1);
  const noHeight = worldToGlobal([0, 4, 0], { ...fix(), altitudeAccuracy: 100 }, [0, 0, 0]);
  expect(noHeight.altitude).toBeNull();
  expect(globalToWorld(noHeight, fix(), [0, 2, 0])[1]).toBe(2);
  expect(() =>
    worldToGlobal([0, 0, 0], { ...fix(), timestamp: Date.now() - 30000 }, [0, 0, 0]),
  ).toThrow(/fresh GPS/);
});

test('floating marker stays fixed while walking and restores without surface or cloud events', async () => {
  const app = appProps();
  const view = render(<GlobalPlacementScene sceneNavigator={{ viroAppProps: app }} />);
  fireEvent(view.getByTestId('scene'), 'cameraTransformUpdate', camera);
  expect(view.queryByTestId('box')).toBeNull();
  fireEvent(view.getByTestId('scene'), 'trackingUpdated', 3);
  expect(view.getByTestId('node').props.position).toEqual([1, 2, 1]);
  fireEvent(view.getByTestId('scene'), 'cameraTransformUpdate', { ...camera, position: [5, 2, 3] });
  expect(view.getByTestId('node').props.position).toEqual([1, 2, 1]);
  // Save against the current GPS fix and corresponding camera position.
  fireEvent(view.getByTestId('scene'), 'cameraTransformUpdate', camera);
  await act(async () =>
    view.rerender(
      <GlobalPlacementScene sceneNavigator={{ viroAppProps: { ...app, saveRequest: 1 } }} />,
    ),
  );
  const saved = jest.mocked(app.onPlacementSaved!).mock.calls[0][0];
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('globalSaved');
  fireEvent(view.getByTestId('box'), 'click');
  expect(app.onSelect).toHaveBeenCalledWith('gun');
  view.unmount();
  const next = { ...appProps(), testSpot: { ...spot, placement: saved } };
  const restored = render(<GlobalPlacementScene sceneNavigator={{ viroAppProps: next }} />);
  fireEvent(restored.getByTestId('scene'), 'cameraTransformUpdate', {
    ...camera,
    position: [0, 0, 0],
  });
  fireEvent(restored.getByTestId('scene'), 'trackingUpdated', 3);
  const position = restored.getByTestId('node').props.position;
  expect(position[0]).toBeCloseTo(0);
  expect(position[1]).toBeCloseTo(0);
  expect(position[2]).toBeCloseTo(-2);
  expect(next.onPhaseChange).toHaveBeenLastCalledWith('globalRestored');
  const restoredTarget = restored.getByTestId('marker-touch-target');
  expect(restoredTarget.props.opacity).toBe(1);
  fireEvent(restoredTarget, 'clickState', 1);
  expect(next.onSelect).toHaveBeenCalledWith('gun');
  expect(restored.getByTestId('box').props.visible).toBe(false);
  expect(
    restored.getAllByTestId('text').some((text) => text.props.text === harvardTestStop.title),
  ).toBe(true);
  fireEvent(
    restored.getAllByTestId('text').find((text) => text.props.text === '×')!,
    'click',
  );
  restored.rerender(
    <GlobalPlacementScene sceneNavigator={{ viroAppProps: { ...next, revision: 1 } }} />,
  );
  expect(restored.getByTestId('node').props.position).toEqual([0, 0, -2]);
});

test('global placement persists across a hook restart and validates corrupt transforms', async () => {
  await AsyncStorage.setItem(
    TEST_SPOT_KEY,
    JSON.stringify({
      ...spot,
      anchor: { id: 'old-cloud', expiresAt: Date.now() + 10000, offset: [0, 0, 0] },
    }),
  );
  const saved = worldToGlobal([3, 1, -4], fix(), [0, 0, 0], [0, 35, 0], [2, 2, 2]);
  const first = renderHook(() => useTestLocation(false));
  await waitFor(() => expect(first.result.current.loaded).toBe(true));
  await act(async () => first.result.current.savePlacement(saved, spot.savedAt));
  first.unmount();
  const second = renderHook(() => useTestLocation(false));
  await waitFor(() => expect(second.result.current.loaded).toBe(true));
  expect(second.result.current.spot?.placement).toEqual(saved);
  expect(second.result.current.spot?.anchor).toBeUndefined();
  expect(
    parseSpot(JSON.stringify({ ...spot, placement: { ...saved, scale: [-1, 1, 1] } }))?.placement,
  ).toBeUndefined();
  expect(
    parseSpot(JSON.stringify({ ...spot, placement: { ...saved, altitude: 'bad' } }))?.placement,
  ).toBeUndefined();
});

test('preview appears without GPS but saving still requires a fresh fix', async () => {
  const app = { ...appProps(), locationFix: null, onAnchorError: jest.fn() };
  const view = render(<GlobalPlacementScene sceneNavigator={{ viroAppProps: app }} />);
  fireEvent(view.getByTestId('scene'), 'cameraTransformUpdate', camera);
  fireEvent(view.getByTestId('scene'), 'trackingUpdated', 3);
  expect(view.getByTestId('node').props.position).toEqual([1, 2, 1]);
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('globalPlaced');
  await act(async () =>
    view.rerender(
      <GlobalPlacementScene sceneNavigator={{ viroAppProps: { ...app, saveRequest: 1 } }} />,
    ),
  );
  expect(app.onPlacementSaved).not.toHaveBeenCalled();
  expect(app.onAnchorError).toHaveBeenCalledWith(expect.stringContaining('fresh GPS'));
});

test('guidance distinguishes markers behind, above, beside, and at the camera', () => {
  const pose = {
    position: [0, 0, 0] as [number, number, number],
    forward: [0, 0, -1] as [number, number, number],
    up: [0, 1, 0] as [number, number, number],
  };
  expect(markerDirection([0, 0, -2], pose)).toContain('look ahead');
  expect(markerDirection([0, 0, 2], pose)).toContain('turn around');
  expect(markerDirection([4, 3, -2], pose)).toContain('turn right and look up');
  expect(markerDirection([-4, -3, -2], pose)).toContain('turn left and look down');
  expect(markerDirection([0, 0, 0], pose)).toContain('Step back');
});

test('global save reports completion after React replays mounting effects', async () => {
  const app = appProps();
  const view = render(
    <React.StrictMode>
      <GlobalPlacementScene sceneNavigator={{ viroAppProps: app }} />
    </React.StrictMode>,
  );
  fireEvent(view.getByTestId('scene'), 'cameraTransformUpdate', camera);
  fireEvent(view.getByTestId('scene'), 'trackingUpdated', 3);
  await act(async () =>
    view.rerender(
      <React.StrictMode>
        <GlobalPlacementScene sceneNavigator={{ viroAppProps: { ...app, saveRequest: 1 } }} />
      </React.StrictMode>,
    ),
  );
  expect(app.onPlacementSaved).toHaveBeenCalledTimes(1);
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('globalSaved');
});

test('red box expands a world-space information panel with story pages, audio, and close', () => {
  const app = { ...appProps(), onListen: jest.fn() };
  const view = render(<GlobalPlacementScene sceneNavigator={{ viroAppProps: app }} />);
  fireEvent(view.getByTestId('scene'), 'cameraTransformUpdate', camera);
  fireEvent(view.getByTestId('scene'), 'trackingUpdated', 3);
  fireEvent(view.getByTestId('box'), 'click');
  expect(app.onSelect).toHaveBeenCalledWith('gun');
  // A duplicate native click must leave the panel open, even before app props update.
  fireEvent(view.getByTestId('box'), 'click');
  expect(view.getByTestId('box').props.visible).toBe(false);
  expect(app.onSelect).toHaveBeenCalledTimes(1);
  view.rerender(
    <GlobalPlacementScene sceneNavigator={{ viroAppProps: { ...app, selected: true } }} />,
  );
  const text = (value: string) =>
    view.getAllByTestId('text').find((item) => item.props.text === value);
  const buttonAt = (x: number, y = -0.36) =>
    view
      .getAllByTestId('node')
      .find((node) => node.props.position?.[0] === x && node.props.position?.[1] === y)!
      .findByProps({ testID: 'quad' });
  expect(text(harvardTestStop.title)).toBeTruthy();
  expect(text(harvardTestStop.description)).toBeTruthy();
  const panel = view
    .getAllByTestId('node')
    .find((node) => node.props.position?.every((v: number) => v === 0) && node.props.rotation)!;
  expect(panel.props.position).toEqual([0, 0, 0]);
  expect(panel.props.transformBehaviors).toBeUndefined();
  expect(view.getAllByTestId('text').every((text) => text.props.highAccuracyEvents === false)).toBe(
    true,
  );
  const pages = storyPages(harvardTestStop.story);
  for (const page of pages) {
    fireEvent(buttonAt(0.34), 'click');
    expect(text(page)).toBeTruthy();
  }
  expect(pages.join(' ')).toBe(harvardTestStop.story);
  expect(text('Next')).toBeUndefined();
  fireEvent(buttonAt(-0.34), 'click');
  expect(text('Next')).toBeTruthy();
  fireEvent(buttonAt(0), 'click');
  expect(app.onListen).toHaveBeenCalledTimes(1);
  fireEvent(view.getByTestId('scene'), 'cameraTransformUpdate', { ...camera, position: [4, 2, 3] });
  expect(view.getAllByTestId('node')[0].props.position).toEqual([1, 2, 1]);
  fireEvent(text('×')!, 'click');
  expect(app.onDismiss).toHaveBeenCalledTimes(1);
  expect(view.getByTestId('box').props.visible).toBe(true);
  expect(text(harvardTestStop.title)).toBeUndefined();
  fireEvent(view.getByTestId('box'), 'click');
  expect(text(harvardTestStop.description)).toBeTruthy();
  expect(view.getAllByTestId('node')[0].props.position).toEqual([1, 2, 1]);
});

test('the panel faces the camera without native billboarding, including rotated parents', () => {
  for (const parent of [
    [0, 0, 0],
    [0, 40, 0],
    [-90, 20, 0],
  ] as [number, number, number][]) {
    const rotation = panelFacingRotation([3, 2, 4], [0, 0, 0], parent);
    const localNormal = surfaceWorldPoint([0, 0, 1], [0, 0, 0], rotation);
    const worldNormal = surfaceWorldPoint(localNormal, [0, 0, 0], parent);
    [3, 2, 4].forEach((v, i) => expect(worldNormal[i]).toBeCloseTo(v / Math.sqrt(29)));
  }
  expect(panelFacingRotation([0, 0, 0], [0, 0, 0], [0, 0, 0])).toEqual([0, 0, 0]);
});

test('the plus sign opens the panel and app dismissal restores the box without moving it', () => {
  const app = appProps();
  const view = render(<GlobalPlacementScene sceneNavigator={{ viroAppProps: app }} />);
  fireEvent(view.getByTestId('scene'), 'cameraTransformUpdate', camera);
  fireEvent(view.getByTestId('scene'), 'trackingUpdated', 3);
  fireEvent(view.getByTestId('text'), 'click');
  expect(app.onSelect).toHaveBeenCalledWith('gun');
  expect(view.getByTestId('box').props.visible).toBe(false);
  view.rerender(
    <GlobalPlacementScene sceneNavigator={{ viroAppProps: { ...app, selected: true } }} />,
  );
  view.rerender(
    <GlobalPlacementScene sceneNavigator={{ viroAppProps: { ...app, selected: false } }} />,
  );
  expect(view.getByTestId('box').props.visible).toBe(true);
  expect(view.getByTestId('node').props.position).toEqual([1, 2, 1]);
});

test('touch-down opens the padded marker immediately and subsequent tap events do not reopen it', () => {
  const app = appProps();
  const view = render(<GlobalPlacementScene sceneNavigator={{ viroAppProps: app }} />);
  fireEvent(view.getByTestId('scene'), 'cameraTransformUpdate', camera);
  fireEvent(view.getByTestId('scene'), 'trackingUpdated', 3);
  const target = view.getByTestId('marker-touch-target');
  fireEvent(target, 'clickState', 2);
  expect(app.onSelect).not.toHaveBeenCalled();
  fireEvent(target, 'clickState', 1);
  expect(app.onSelect).toHaveBeenCalledTimes(1);
  expect(view.getByTestId('box').props.visible).toBe(false);
  expect(view.getByTestId('marker-touch-target').props.visible).toBe(false);
  fireEvent(target, 'clickState', 3);
  fireEvent(target, 'click');
  fireEvent(view.getByTestId('box'), 'clickState', 1);
  expect(app.onSelect).toHaveBeenCalledTimes(1);
  expect(view.getAllByTestId('text').some((t) => t.props.text === harvardTestStop.title)).toBe(
    true,
  );
});
