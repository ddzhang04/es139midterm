import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import NativeSurfaceAR, { PlacementScene } from '../src/SurfaceARScene';
jest.mock('../src/SurfaceARView', () => ({ persistentAnchorsEnabled: true }));
import type { SurfaceARProps } from '../src/SurfaceARView';

const mockAnchors = {
  handleAnchorFound: jest.fn(),
  handleAnchorUpdated: jest.fn(),
  handleAnchorRemoved: jest.fn(),
  reset: jest.fn(),
};
jest.mock('@reactvision/react-viro', () => {
  const React = require('react');
  const { View } = require('react-native');
  const component = (name: string) => (props: object) =>
    React.createElement(View, { ...props, testID: name });
  return {
    ViroARScene: component('scene'),
    ViroARPlane: component('plane'),
    ViroARSceneNavigator: component('navigator'),
    ViroARPlaneSelector: React.forwardRef((props: object, ref: unknown) => {
      React.useImperativeHandle(ref, () => mockAnchors);
      return React.createElement(View, { ...props, testID: 'selector' });
    }),
    ViroNode: component('node'),
    ViroQuad: component('quad'),
    ViroBox: component('button-target'),
    ViroSphere: component('marker'),
    ViroText: component('text'),
    ViroMaterials: { createMaterials: jest.fn() },
    ViroTrackingStateConstants: { TRACKING_NORMAL: 3 },
  };
});

function props(): SurfaceARProps {
  return {
    stopId: 'gun',
    selected: false,
    visible: true,
    opacity: 1,
    revision: 0,
    onSelect: jest.fn(),
    onDismiss: jest.fn(),
    onPhaseChange: jest.fn(),
  };
}
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

test('round anchored marker opens a world-space rectangle and reposition resets placement', () => {
  const app = props();
  const view = render(<PlacementScene sceneNavigator={{ viroAppProps: app }} />);
  const tile = view.getByTestId('marker');
  expect(tile.props.radius).toBe(0.16);
  expect(tile.props.position).toEqual([0, 0.164, 0]);
  expect(view.getByTestId('selector').findAllByProps({ testID: 'marker' })).toContain(tile);
  fireEvent(tile, 'click');
  expect(app.onSelect).toHaveBeenCalledWith('gun');
  view.rerender(<PlacementScene sceneNavigator={{ viroAppProps: { ...app, selected: true } }} />);
  expect(
    view.getAllByTestId('quad').some((quad) => quad.props.materials?.includes('ARInfoBackground')),
  ).toBe(true);
  expect(
    view
      .getAllByTestId('node')
      .some((node) => node.props.rotation && node.props.highAccuracyEvents === false),
  ).toBe(true);
  const close = view.getAllByTestId('node').find((node) => node.props.position?.[0] === 0.49)!;
  fireEvent(close.findByProps({ testID: 'button-target' }), 'click');
  expect(app.onDismiss).toHaveBeenCalled();
  mockAnchors.reset.mockClear();
  act(() =>
    view.rerender(<PlacementScene sceneNavigator={{ viroAppProps: { ...app, revision: 1 } }} />),
  );
  expect(mockAnchors.reset).toHaveBeenCalledTimes(1);
});

test('cloud hosting saves the tapped surface offset and restoration uses the returned pose', async () => {
  const spot = {
    name: 'Harvard test spot',
    latitude: 42.3745,
    longitude: -71.1169,
    radius: 50,
    savedAt: 123,
  };
  const app = {
    ...props(),
    testSpot: spot,
    saveRequest: 0,
    onAnchorSaved: jest.fn().mockResolvedValue(undefined),
  };
  const hostCloudAnchor = jest
    .fn()
    .mockResolvedValue({ success: true, cloudAnchorId: 'saved-plane' });
  const anchor = { anchorId: 'plane', position: [1, 0, 1], rotation: [0, 0, 0] };
  const navigator = { viroAppProps: app, hostCloudAnchor, resolveCloudAnchor: jest.fn() };
  const view = render(<PlacementScene sceneNavigator={navigator} />);
  fireEvent(view.getByTestId('selector'), 'planeSelected', anchor, [1.2, 0, 1.3]);
  await act(async () =>
    view.rerender(
      <PlacementScene
        sceneNavigator={{ ...navigator, viroAppProps: { ...app, saveRequest: 1 } }}
      />,
    ),
  );
  expect(hostCloudAnchor).toHaveBeenCalledWith('plane', 1);
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('saved');
  fireEvent(view.getByTestId('scene'), 'trackingUpdated', 3);
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('saved');
  expect(app.onAnchorSaved).toHaveBeenCalledWith(
    expect.objectContaining({
      id: 'saved-plane',
      offset: [expect.closeTo(0.2), 0, expect.closeTo(0.3)],
    }),
    123,
  );
  view.unmount();
  const saved = { id: 'saved-plane', expiresAt: Date.now() + 86400000, offset: [0.2, 0, 0.3] };
  const resolveCloudAnchor = jest.fn().mockResolvedValue({
    success: true,
    anchor: { anchorId: 'restored', position: [3, 0, -2], rotation: [0, 45, 0] },
  });
  const restoredApp = { ...props(), testSpot: { ...spot, anchor: saved } };
  const restored = render(
    <PlacementScene
      sceneNavigator={{ viroAppProps: restoredApp, resolveCloudAnchor, hostCloudAnchor }}
    />,
  );
  expect(resolveCloudAnchor).not.toHaveBeenCalled();
  await act(async () => fireEvent(restored.getByTestId('scene'), 'trackingUpdated', 3));
  expect(resolveCloudAnchor).toHaveBeenCalledWith('saved-plane');
  expect(restoredApp.onPhaseChange).toHaveBeenLastCalledWith('aligning');
  expect(restored.queryByTestId('plane')).toBeNull();
  fireEvent(restored.getByTestId('scene'), 'anchorFound', {
    anchorId: 'table',
    type: 'plane',
    position: [3, 0, -2],
    rotation: [0, 0, 0],
    alignment: 'Horizontal',
    width: 2,
    height: 2,
  });
  expect(restoredApp.onPhaseChange).toHaveBeenLastCalledWith('restored');
  expect(restored.getByTestId('plane').props.anchorId).toBe('table');
  const local = restored.getByTestId('plane').findByProps({ testID: 'node' }).props.position;
  expect(local[0]).toBeCloseTo(0.35355);
  expect(local[1]).toBe(0);
  expect(local[2]).toBeCloseTo(0.07071);
});

test('cloud errors and expired anchors report failure without inventing a placement', async () => {
  const app = {
    ...props(),
    testSpot: {
      name: 'Harvard test spot',
      latitude: 0,
      longitude: 0,
      radius: 50,
      savedAt: 1,
      anchor: { id: 'expired', expiresAt: 1, offset: [0, 0, 0] },
    },
  };
  const navigator = {
    viroAppProps: app,
    resolveCloudAnchor: jest.fn(),
    hostCloudAnchor: jest.fn(),
  };
  const view = render(<PlacementScene sceneNavigator={navigator} />);
  fireEvent(view.getByTestId('scene'), 'trackingUpdated', 3);
  expect(navigator.resolveCloudAnchor).not.toHaveBeenCalled();
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('anchorError');
  const resolveCloudAnchor = jest.fn().mockRejectedValue(new Error('Offline'));
  await act(async () =>
    view.rerender(
      <PlacementScene
        sceneNavigator={{
          ...navigator,
          resolveCloudAnchor,
          viroAppProps: {
            ...app,
            testSpot: {
              ...app.testSpot,
              savedAt: 2,
              anchor: { ...app.testSpot.anchor, expiresAt: Date.now() + 100000 },
            },
          },
        }}
      />,
    ),
  );
  expect(resolveCloudAnchor).toHaveBeenCalled();
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('anchorError');
});

test('a restore failure stays visible through tracking updates and can be retried', async () => {
  const app = {
    ...props(),
    onAnchorError: jest.fn(),
    restoreRequest: 0,
    testSpot: {
      name: 'Harvard test spot',
      latitude: 0,
      longitude: 0,
      radius: 50,
      savedAt: 1,
      anchor: { id: 'saved', expiresAt: Date.now() + 86400000, offset: [0, 0, 0] },
    },
  };
  const resolveCloudAnchor = jest
    .fn()
    .mockResolvedValueOnce({ success: false, state: 'ErrorNotAuthorized' })
    .mockResolvedValueOnce({
      success: true,
      anchor: { anchorId: 'restored', position: [1, 0, -1], rotation: [0, 0, 0] },
    });
  const navigator = { viroAppProps: app, resolveCloudAnchor, hostCloudAnchor: jest.fn() };
  const view = render(<PlacementScene sceneNavigator={navigator} />);
  await act(async () => fireEvent(view.getByTestId('scene'), 'trackingUpdated', 3));
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('anchorError');
  expect(app.onAnchorError).toHaveBeenCalledWith(expect.stringContaining('credentials'));
  fireEvent(view.getByTestId('scene'), 'trackingUpdated', 3);
  fireEvent(view.getByTestId('selector'), 'planeDetected', { anchorId: 'new-plane' });
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('anchorError');
  await act(async () =>
    view.rerender(
      <PlacementScene
        sceneNavigator={{ ...navigator, viroAppProps: { ...app, restoreRequest: 1 } }}
      />,
    ),
  );
  expect(resolveCloudAnchor).toHaveBeenCalledTimes(2);
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('aligning');
  fireEvent(view.getByTestId('scene'), 'anchorFound', {
    anchorId: 'table',
    type: 'plane',
    position: [1, 0, -1],
    rotation: [0, 0, 0],
    alignment: 'Horizontal',
    width: 1,
    height: 1,
  });
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('restored');
});

test('a failed cloud save cannot be disguised as a placed or saved marker', async () => {
  const app = {
    ...props(),
    onAnchorError: jest.fn(),
    saveRequest: 0,
    onAnchorSaved: jest.fn(),
    testSpot: { name: 'Harvard test spot', latitude: 0, longitude: 0, radius: 50, savedAt: 1 },
  };
  const hostCloudAnchor = jest
    .fn()
    .mockResolvedValue({ success: false, state: 'ErrorHostingDatasetProcessingFailed' });
  const navigator = { viroAppProps: app, hostCloudAnchor, resolveCloudAnchor: jest.fn() };
  const view = render(<PlacementScene sceneNavigator={navigator} />);
  fireEvent(view.getByTestId('selector'), 'planeSelected', { anchorId: 'plane' });
  await act(async () =>
    view.rerender(
      <PlacementScene
        sceneNavigator={{ ...navigator, viroAppProps: { ...app, saveRequest: 1 } }}
      />,
    ),
  );
  fireEvent(view.getByTestId('scene'), 'trackingUpdated', 3);
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('anchorError');
  expect(app.onAnchorError).toHaveBeenCalledWith(expect.stringContaining('Scan more'));
  expect(app.onAnchorSaved).not.toHaveBeenCalled();
});

test('bad restored height stays hidden and reports an alignment error', async () => {
  jest.useFakeTimers();
  const app = {
    ...props(),
    onAnchorError: jest.fn(),
    testSpot: {
      name: 'Harvard test spot',
      latitude: 0,
      longitude: 0,
      radius: 50,
      savedAt: 1,
      anchor: { id: 'saved', expiresAt: Date.now() + 86400000, offset: [0, 0, 0] },
    },
  };
  const navigator = {
    viroAppProps: app,
    resolveCloudAnchor: jest.fn().mockResolvedValue({
      success: true,
      anchor: { anchorId: 'cloud', position: [0, 0, -0.1], rotation: [0, 0, 0] },
    }),
    hostCloudAnchor: jest.fn(),
  };
  const view = render(<PlacementScene sceneNavigator={navigator} />);
  await act(async () => fireEvent(view.getByTestId('scene'), 'trackingUpdated', 3));
  fireEvent(view.getByTestId('scene'), 'anchorFound', {
    anchorId: 'table',
    type: 'plane',
    position: [0, -0.6, -0.1],
    rotation: [0, 0, 0],
    alignment: 'Horizontal',
    width: 2,
    height: 2,
  });
  expect(view.queryByTestId('plane')).toBeNull();
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('aligning');
  act(() => jest.advanceTimersByTime(30000));
  expect(app.onPhaseChange).toHaveBeenLastCalledWith('anchorError');
  expect(app.onAnchorError).toHaveBeenCalledWith(expect.stringContaining('did not match'));
  view.unmount();
  jest.useRealTimers();
});

test('AR viewport is isolated in an absolute wrapper so the native library cannot push controls down', () => {
  const view = render(<NativeSurfaceAR {...props()} />);
  const navigator = view.getByTestId('navigator');
  expect(view.getByTestId('native-ar-viewport').props.style).toMatchObject({
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });
});
