import { usableFix } from './testLocation';
import type { GlobalPlacement, LocationFix, Point } from './testLocation';
export type Vector3 = [number, number, number];
const radius = 6371000,
  radians = Math.PI / 180;
const wrapLongitude = (value: number) => ((((value + 180) % 360) + 360) % 360) - 180;
export { usableFix } from './testLocation';
function usableAltitude(fix: LocationFix) {
  return (
    Number.isFinite(fix.altitude) &&
    fix.altitudeAccuracy != null &&
    fix.altitudeAccuracy >= 0 &&
    fix.altitudeAccuracy <= 20
  );
}
// ARKit GravityAndHeading uses east/up/south. These coordinates are for a
// nearby prototype marker; GPS is used once per AR session to avoid jitter.
export function globalToWorld(
  target: Point & { altitude: number | null },
  fix: LocationFix,
  camera: Vector3,
): Vector3 {
  const east =
    wrapLongitude(target.longitude - fix.longitude) *
    radians *
    radius *
    Math.cos(fix.latitude * radians);
  const north = (target.latitude - fix.latitude) * radians * radius;
  const up = target.altitude !== null && usableAltitude(fix) ? target.altitude - fix.altitude! : 0;
  return [camera[0] + east, camera[1] + up, camera[2] - north];
}
export function worldToGlobal(
  position: Vector3,
  fix: LocationFix,
  camera: Vector3,
  rotation: Vector3 = [0, 0, 0],
  scale: Vector3 = [1, 1, 1],
): GlobalPlacement {
  if (!usableFix(fix)) throw new Error('Wait for a fresh GPS reading before saving.');
  if (Math.abs(fix.latitude) > 85)
    throw new Error('Global placement is unavailable near the poles.');
  const east = position[0] - camera[0],
    north = camera[2] - position[2];
  return {
    latitude: fix.latitude + north / radius / radians,
    longitude: wrapLongitude(
      fix.longitude + east / (radius * Math.cos(fix.latitude * radians)) / radians,
    ),
    altitude: usableAltitude(fix) ? fix.altitude! + position[1] - camera[1] : null,
    altitudeReference: 'WGS84',
    rotation,
    scale,
    horizontalAccuracy: fix.accuracy!,
    altitudeAccuracy: usableAltitude(fix) ? fix.altitudeAccuracy! : null,
    savedAt: Date.now(),
  };
}

export function markerDirection(
  point: Vector3,
  camera: { position: Vector3; forward: Vector3; up: Vector3 },
) {
  const delta = point.map((v, i) => v - camera.position[i]);
  const distance = Math.hypot(...delta);
  if (distance < 0.3)
    return 'Marker is at your position. Step back, or preview it in front of you.';
  const right = [
    camera.forward[1] * camera.up[2] - camera.forward[2] * camera.up[1],
    camera.forward[2] * camera.up[0] - camera.forward[0] * camera.up[2],
    camera.forward[0] * camera.up[1] - camera.forward[1] * camera.up[0],
  ];
  const dot = (vector: number[]) => delta.reduce((sum, value, i) => sum + value * vector[i], 0);
  const ahead = dot(camera.forward),
    side = dot(right),
    up = dot(camera.up);
  const horizontal =
    ahead <= 0
      ? 'turn around'
      : Math.abs(Math.atan2(side, ahead)) > Math.PI / 6
        ? side > 0
          ? 'turn right'
          : 'turn left'
        : 'look ahead';
  const vertical =
    Math.abs(Math.atan2(up, Math.hypot(ahead, side))) > Math.PI / 9
      ? up > 0
        ? ' and look up'
        : ' and look down'
      : '';
  return `Marker ≈ ${distance.toFixed(1)} m away · ${horizontal}${vertical}.`;
}
