import { surfaceCoordinates, surfaceWorldPoint } from '../src/anchorPlacement';
import { matchRestoredSurface } from '../src/restoredSurface';
import type {
  ViroAnchor,
  ViroCloudAnchor,
} from '@reactvision/react-viro/dist/components/Types/ViroEvents';

const saved = {
  id: 'saved',
  expiresAt: 9999999999999,
  offset: [0.2, 0, 0.3] as [number, number, number],
  surfaceAlignment: 'Horizontal' as const,
  surfaceClassification: 'Table',
};
const cloud = { anchorId: 'cloud', position: [3, 1, -2], rotation: [0, 45, 0] } as ViroCloudAnchor;
const table = {
  anchorId: 'table',
  type: 'plane',
  position: [3, 1, -2],
  rotation: [0, 45, 0],
  alignment: 'Horizontal',
  classification: 'Table',
  width: 2,
  height: 1,
} as ViroAnchor;

test('world and local transforms round-trip a tilted, translated surface', () => {
  const local: [number, number, number] = [0.2, 0.04, -0.3];
  const origin: [number, number, number] = [3, 1, -2];
  const rotation: [number, number, number] = [20, 35, 10];
  const result = surfaceCoordinates(surfaceWorldPoint(local, origin, rotation), origin, rotation);
  result.forEach((value, index) => expect(value).toBeCloseTo(local[index]));
});

test('matching retains the tapped coordinates and projects small height errors onto the real table', () => {
  const match = matchRestoredSurface({ ...cloud, position: [3, 1.05, -2] }, saved, [table]);
  expect(match?.anchorId).toBe('table');
  expect(match?.offset[0]).toBeCloseTo(0.2);
  expect(match?.offset[1]).toBe(0);
  expect(match?.offset[2]).toBeCloseTo(0.3);
});

test('wrong height, tilt, surface type and out-of-bounds estimates cannot display a restored tile', () => {
  expect(matchRestoredSurface({ ...cloud, position: [3, 1.5, -2] }, saved, [table])).toBeNull();
  expect(matchRestoredSurface({ ...cloud, rotation: [70, 45, 0] }, saved, [table])).toBeNull();
  expect(matchRestoredSurface(cloud, saved, [{ ...table, classification: 'Floor' }])).toBeNull();
  expect(matchRestoredSurface({ ...cloud, position: [30, 1, -2] }, saved, [table])).toBeNull();
});

test('vertical saved tiles can match a wall, and points outside the measured polygon boundary are rejected', () => {
  const wall = {
    ...table,
    rotation: [90, 0, 0],
    alignment: 'Vertical',
    classification: 'Wall',
  } as ViroAnchor;
  const wallCloud = { ...cloud, rotation: [90, 0, 0] } as ViroCloudAnchor;
  expect(
    matchRestoredSurface(
      wallCloud,
      { ...saved, surfaceAlignment: 'Vertical', surfaceClassification: 'Wall' },
      [wall],
    )?.anchorId,
  ).toBe('table');
  const triangle = {
    ...table,
    vertices: [
      [0, 0, 0],
      [0.1, 0, 0],
      [0, 0, 0.1],
    ],
  } as ViroAnchor;
  expect(matchRestoredSurface(cloud, saved, [triangle])).toBeNull();
});
