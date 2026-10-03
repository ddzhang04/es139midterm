export type Vector3 = [number, number, number];
// Inverse of the plane's Rx * Ry * Rz rotation converts the tapped world
// point into a surface-local offset to preserve it when resolving the anchor.
export function surfaceCoordinates(world: Vector3, origin: Vector3, degrees: Vector3): Vector3 {
  const [rx, ry, rz] = degrees.map(value => value * Math.PI / 180);
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  const [x, y, z] = world.map((value, index) => value - origin[index]);
  return [cy * cz * x + (sx * sy * cz + cx * sz) * y + (-cx * sy * cz + sx * sz) * z,
    -cy * sz * x + (-sx * sy * sz + cx * cz) * y + (cx * sy * sz + sx * cz) * z,
    sy * x - sx * cy * y + cx * cy * z];
}
export function surfaceOffset(world: Vector3, origin: Vector3, degrees: Vector3): Vector3 {
  const local = surfaceCoordinates(world, origin, degrees);
  return [local[0], 0, local[2]];
}

export function surfaceWorldPoint(local: Vector3, origin: Vector3, degrees: Vector3): Vector3 {
  // The rows of R are the columns returned by the inverse transform.
  const x = surfaceCoordinates([1, 0, 0], [0, 0, 0], degrees);
  const y = surfaceCoordinates([0, 1, 0], [0, 0, 0], degrees);
  const z = surfaceCoordinates([0, 0, 1], [0, 0, 0], degrees);
  return [origin[0] + x.reduce((sum, v, i) => sum + v * local[i], 0), origin[1] + y.reduce((sum, v, i) => sum + v * local[i], 0), origin[2] + z.reduce((sum, v, i) => sum + v * local[i], 0)];
}
