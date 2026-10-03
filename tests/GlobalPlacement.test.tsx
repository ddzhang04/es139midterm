import React from 'react';
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalPlacementScene } from '../src/GlobalARScene';
import { globalToWorld, worldToGlobal } from '../src/globalPlacement';
import { parseSpot, TEST_SPOT_KEY } from '../src/testLocation';
import useTestLocation from '../src/useTestLocation';
import type { SurfaceARProps } from '../src/SurfaceARView';
jest.mock('@reactvision/react-viro', () => {
  const React = require('react'); const { View } = require('react-native');
  const component = (name: string) => (props: object) => React.createElement(View, { ...props, testID: name });
  return { ViroARScene: component('scene'), ViroARSceneNavigator: component('navigator'), ViroNode: component('node'), ViroBox: component('box'), ViroQuad: component('quad'), ViroText: component('text'), ViroMaterials: { createMaterials: jest.fn() }, ViroTrackingStateConstants: { TRACKING_NORMAL: 3 } };
});
const spot = { name: 'Harvard test spot', latitude: 42.3745, longitude: -71.1169, radius: 50, savedAt: 123 };
const fix = () => ({ ...spot, accuracy: 5, timestamp: Date.now(), altitude: 20, altitudeAccuracy: 4 });
const camera = { position: [1, 2, 3], forward: [0, 0, -1], rotation: [0, 0, 0], up: [0, 1, 0] };
const appProps = (): SurfaceARProps => ({ stopId: 'gun', testSpot: spot, locationFix: fix(), selected: false, visible: true, opacity: 1, revision: 0, onSelect: jest.fn(), onDismiss: jest.fn(), onPhaseChange: jest.fn(), onPlacementSaved: jest.fn().mockResolvedValue(undefined), saveRequest: 0 });
beforeEach(async () => { await AsyncStorage.clear(); jest.clearAllMocks(); });

test('global coordinates round-trip across session origins, with altitude and date-line handling', () => {
  const saved = worldToGlobal([4, 3, -2], fix(), [1, 2, 3]);
  const restored = globalToWorld(saved, fix(), [8, 9, 10]);
  expect(restored[0]).toBeCloseTo(11); expect(restored[1]).toBeCloseTo(10); expect(restored[2]).toBeCloseTo(5);
  expect(saved.altitude).toBe(21); expect(saved.rotation).toEqual([0, 0, 0]); expect(saved.scale).toEqual([1, 1, 1]);
  expect(globalToWorld({ latitude: 0, longitude: -179.999, altitude: null }, { latitude: 0, longitude: 179.999, accuracy: 5, timestamp: Date.now() }, [0, 0, 0])[0]).toBeCloseTo(222.39, 1);
  const noHeight = worldToGlobal([0, 4, 0], { ...fix(), altitudeAccuracy: 100 }, [0, 0, 0]);
  expect(noHeight.altitude).toBeNull(); expect(globalToWorld(noHeight, fix(), [0, 2, 0])[1]).toBe(2);
  expect(() => worldToGlobal([0, 0, 0], { ...fix(), timestamp: Date.now() - 30000 }, [0, 0, 0])).toThrow(/fresh GPS/);
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
  await act(async () => view.rerender(<GlobalPlacementScene sceneNavigator={{ viroAppProps: { ...app, saveRequest: 1 } }} />));
  const saved = jest.mocked(app.onPlacementSaved!).mock.calls[0][0];
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('globalSaved');
  fireEvent(view.getByTestId('box'), 'click'); expect(app.onSelect).toHaveBeenCalledWith('gun');
  view.unmount();
  const next = { ...appProps(), testSpot: { ...spot, placement: saved } };
  const restored = render(<GlobalPlacementScene sceneNavigator={{ viroAppProps: next }} />);
  fireEvent(restored.getByTestId('scene'), 'cameraTransformUpdate', { ...camera, position: [0, 0, 0] });
  fireEvent(restored.getByTestId('scene'), 'trackingUpdated', 3);
  const position = restored.getByTestId('node').props.position;
  expect(position[0]).toBeCloseTo(0); expect(position[1]).toBeCloseTo(0); expect(position[2]).toBeCloseTo(-2);
  expect(next.onPhaseChange).toHaveBeenLastCalledWith('globalRestored');
  restored.rerender(<GlobalPlacementScene sceneNavigator={{ viroAppProps: { ...next, revision: 1 } }} />);
  expect(restored.getByTestId('node').props.position).toEqual([0, 0, -2]);
});

test('global placement persists across a hook restart and validates corrupt transforms', async () => {
  await AsyncStorage.setItem(TEST_SPOT_KEY, JSON.stringify({ ...spot, anchor: { id: 'old-cloud', expiresAt: Date.now() + 10000, offset: [0, 0, 0] } }));
  const saved = worldToGlobal([3, 1, -4], fix(), [0, 0, 0], [0, 35, 0], [2, 2, 2]);
  const first = renderHook(() => useTestLocation(false)); await waitFor(() => expect(first.result.current.loaded).toBe(true));
  await act(async () => first.result.current.savePlacement(saved, spot.savedAt)); first.unmount();
  const second = renderHook(() => useTestLocation(false)); await waitFor(() => expect(second.result.current.loaded).toBe(true));
  expect(second.result.current.spot?.placement).toEqual(saved); expect(second.result.current.spot?.anchor).toBeUndefined();
  expect(parseSpot(JSON.stringify({ ...spot, placement: { ...saved, scale: [-1, 1, 1] } }))?.placement).toBeUndefined();
  expect(parseSpot(JSON.stringify({ ...spot, placement: { ...saved, altitude: 'bad' } }))?.placement).toBeUndefined();
});
