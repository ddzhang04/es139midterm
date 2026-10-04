export type Point = { latitude: number; longitude: number };
export type PersistentAnchor = {
  id: string;
  expiresAt: number;
  offset: [number, number, number];
  surfaceAlignment?: 'Horizontal' | 'Vertical';
  surfaceClassification?: string;
};
export type GlobalPlacement = Point & {
  altitude: number | null;
  altitudeReference: 'WGS84';
  rotation: [number, number, number];
  scale: [number, number, number];
  savedAt: number;
  horizontalAccuracy: number;
  altitudeAccuracy: number | null;
};
export type LocationFix = Point & {
  accuracy: number | null;
  timestamp: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
};
export type TestSpot = Point & {
  name: string;
  radius: number;
  savedAt: number;
  anchor?: PersistentAnchor;
  placement?: GlobalPlacement;
};
export const TEST_SPOT_KEY = 'historylens-harvard-test-spot';
export function distanceMeters(a: Point, b: Point) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
}
export function parseSpot(raw: string | null): TestSpot | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (
      !Number.isFinite(value.latitude) ||
      Math.abs(value.latitude) > 90 ||
      !Number.isFinite(value.longitude) ||
      Math.abs(value.longitude) > 180 ||
      value.name !== 'Harvard test spot' ||
      value.radius !== 50 ||
      !Number.isFinite(value.savedAt)
    )
      return null;
    const anchor = value.anchor;
    if (
      anchor &&
      (typeof anchor.id !== 'string' ||
        !anchor.id ||
        !Number.isFinite(anchor.expiresAt) ||
        !Array.isArray(anchor.offset) ||
        anchor.offset.length !== 3 ||
        !anchor.offset.every(Number.isFinite))
    )
      delete value.anchor;
    const placement = value.placement;
    const vector = (v: unknown) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
    if (
      placement &&
      (!Number.isFinite(placement.latitude) ||
        Math.abs(placement.latitude) > 90 ||
        !Number.isFinite(placement.longitude) ||
        Math.abs(placement.longitude) > 180 ||
        (placement.altitude !== null && !Number.isFinite(placement.altitude)) ||
        placement.altitudeReference !== 'WGS84' ||
        !vector(placement.rotation) ||
        !vector(placement.scale) ||
        placement.scale.some((n: number) => n <= 0) ||
        !Number.isFinite(placement.savedAt) ||
        !Number.isFinite(placement.horizontalAccuracy) ||
        placement.horizontalAccuracy < 0 ||
        (placement.altitudeAccuracy !== null &&
          (!Number.isFinite(placement.altitudeAccuracy) || placement.altitudeAccuracy < 0)))
    )
      delete value.placement;
    return value;
  } catch {
    return null;
  }
}
export function usableFix(
  fix?: LocationFix | null,
  now = Date.now(),
): fix is LocationFix & { accuracy: number } {
  return (
    !!fix &&
    Number.isFinite(fix.latitude) &&
    Math.abs(fix.latitude) <= 90 &&
    Number.isFinite(fix.longitude) &&
    Math.abs(fix.longitude) <= 180 &&
    fix.accuracy !== null &&
    fix.accuracy >= 0 &&
    fix.accuracy <= 30 &&
    now - fix.timestamp >= 0 &&
    now - fix.timestamp <= 20000
  );
}

export function proximity(
  spot: TestSpot,
  fix: Point & { accuracy: number | null; timestamp: number },
  now = Date.now(),
) {
  const distance = distanceMeters(spot, fix);
  if (!usableFix(fix, now)) return { distance, state: 'uncertain' as const };
  if (distance + fix.accuracy <= spot.radius) return { distance, state: 'nearby' as const };
  if (distance - fix.accuracy > spot.radius) return { distance, state: 'far' as const };
  return { distance, state: 'uncertain' as const };
}
