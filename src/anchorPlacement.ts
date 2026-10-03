export type Vector3 = [number, number, number];
// Inverse of the plane's Rx * Ry * Rz rotation converts the tapped world
// point into a surface-local offset to preserve it when resolving the anchor.
export function surfaceOffset(world: Vector3, origin: Vector3, degrees: Vector3): Vector3 {
  const [rx, ry, rz] = degrees.map(value => value * Math.PI / 180);
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  const [x, y, z] = world.map((value, index) => value - origin[index]);
  return [cy * cz * x + (sx * sy * cz + cx * sz) * y + (-cx * sy * cz + sx * sz) * z, 0,
    sy * x - sx * cy * y + cx * cy * z];
}
