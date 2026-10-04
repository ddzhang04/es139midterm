import type {
  ViroAnchor,
  ViroCloudAnchor,
} from '@reactvision/react-viro/dist/components/Types/ViroEvents';
import type { PersistentAnchor } from './testLocation';
import { surfaceCoordinates, surfaceWorldPoint, Vector3 } from './anchorPlacement';

const finiteVector = (v: unknown): v is Vector3 =>
  Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);

function contains(plane: ViroAnchor, local: Vector3): boolean {
  const vertices = plane.vertices;
  if (vertices && vertices.length >= 3) {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const a = vertices[i],
        b = vertices[j];
      if (
        a[2] > local[2] !== b[2] > local[2] &&
        local[0] < ((b[0] - a[0]) * (local[2] - a[2])) / (b[2] - a[2]) + a[0]
      )
        inside = !inside;
    }
    return inside;
  }
  if (!plane.width || !plane.height) return false;
  const center = plane.center || [0, 0, 0];
  return (
    Math.abs(local[0] - center[0]) <= plane.width / 2 &&
    Math.abs(local[2] - center[2]) <= plane.height / 2
  );
}

// Cloud localization is an estimate. Confirm it against a measured surface
// before displaying a tile, then let the native plane track its flat geometry.
export function matchRestoredSurface(
  cloud: ViroCloudAnchor,
  saved: PersistentAnchor,
  planes: ViroAnchor[],
) {
  if (!finiteVector(cloud.position) || !finiteVector(cloud.rotation) || !finiteVector(saved.offset))
    return null;
  const point = surfaceWorldPoint(saved.offset, cloud.position, cloud.rotation);
  const cloudNormal = surfaceWorldPoint([0, 1, 0], [0, 0, 0], cloud.rotation);
  const alignment = saved.surfaceAlignment || 'Horizontal';
  let best: { anchorId: string; offset: Vector3; error: number } | null = null;
  for (const plane of planes) {
    if (
      plane.type !== 'plane' ||
      !finiteVector(plane.position) ||
      !finiteVector(plane.rotation) ||
      !plane.alignment?.startsWith(alignment)
    )
      continue;
    if (
      saved.surfaceClassification &&
      plane.classification &&
      !['None', 'Unknown'].includes(plane.classification) &&
      plane.classification !== saved.surfaceClassification
    )
      continue;
    const normal = surfaceWorldPoint([0, 1, 0], [0, 0, 0], plane.rotation);
    const dot = Math.abs(normal.reduce((sum, value, i) => sum + value * cloudNormal[i], 0));
    if (dot < Math.cos((15 * Math.PI) / 180)) continue;
    const local = surfaceCoordinates(point, plane.position, plane.rotation);
    const error = Math.abs(local[1]);
    if (error > 0.12 || !contains(plane, local)) continue;
    if (!best || error < best.error)
      best = { anchorId: plane.anchorId, offset: [local[0], 0, local[2]], error };
  }
  return best;
}
