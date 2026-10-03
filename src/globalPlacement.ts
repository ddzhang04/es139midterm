import type { GlobalPlacement, LocationFix, Point } from './testLocation';
export type Vector3 = [number, number, number];
const radius = 6371000, radians = Math.PI / 180;
const wrapLongitude = (value: number) => ((value + 180) % 360 + 360) % 360 - 180;
export function usableFix(fix?: LocationFix | null, now = Date.now()): fix is LocationFix {
  return !!fix && Number.isFinite(fix.latitude) && Math.abs(fix.latitude) <= 90 && Number.isFinite(fix.longitude) && Math.abs(fix.longitude) <= 180 && fix.accuracy !== null && fix.accuracy >= 0 && fix.accuracy <= 30 && now - fix.timestamp >= 0 && now - fix.timestamp <= 20000;
}
function usableAltitude(fix: LocationFix) {
  return Number.isFinite(fix.altitude) && fix.altitudeAccuracy != null && fix.altitudeAccuracy >= 0 && fix.altitudeAccuracy <= 20;
}
// ARKit GravityAndHeading uses east/up/south. These coordinates are for a
// nearby prototype marker; GPS is used once per AR session to avoid jitter.
export function globalToWorld(target: Point & { altitude: number | null }, fix: LocationFix, camera: Vector3): Vector3 {
  const east = wrapLongitude(target.longitude - fix.longitude) * radians * radius * Math.cos(fix.latitude * radians);
  const north = (target.latitude - fix.latitude) * radians * radius;
  const up = target.altitude !== null && usableAltitude(fix) ? target.altitude - fix.altitude! : 0;
  return [camera[0] + east, camera[1] + up, camera[2] - north];
}
export function worldToGlobal(position: Vector3, fix: LocationFix, camera: Vector3, rotation: Vector3 = [0, 0, 0], scale: Vector3 = [1, 1, 1]): GlobalPlacement {
  if (!usableFix(fix)) throw new Error('Wait for a fresh GPS reading before saving.');
  if (Math.abs(fix.latitude) > 85) throw new Error('Global placement is unavailable near the poles.');
  const east = position[0] - camera[0], north = camera[2] - position[2];
  return { latitude: fix.latitude + north / radius / radians, longitude: wrapLongitude(fix.longitude + east / (radius * Math.cos(fix.latitude * radians)) / radians), altitude: usableAltitude(fix) ? fix.altitude! + position[1] - camera[1] : null, altitudeReference: 'WGS84', rotation, scale, horizontalAccuracy: fix.accuracy!, altitudeAccuracy: usableAltitude(fix) ? fix.altitudeAccuracy! : null, savedAt: Date.now() };
}
