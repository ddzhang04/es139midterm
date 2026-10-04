import { useCallback, useRef, useState } from 'react';
import { surfaceCoordinates, type Vector3 } from './anchorPlacement';

export function panelFacingRotation(camera: Vector3, point: Vector3, parent: Vector3): Vector3 {
  const normal = surfaceCoordinates(camera, point, parent);
  const length = Math.hypot(...normal);
  if (length < 0.001) return [0, 0, 0];
  const [x, y, z] = normal.map((v) => v / length);
  const up = surfaceCoordinates([0, 1, 0], [0, 0, 0], parent);
  let right = [up[1] * z - up[2] * y, up[2] * x - up[0] * z, up[0] * y - up[1] * x];
  const size = Math.hypot(...right);
  if (size < 0.001) return [(Math.atan2(-y, z) * 180) / Math.PI, 0, 0];
  right = right.map((v) => v / size);
  const upX = y * right[2] - z * right[1];
  return [
    Math.atan2(-y, z),
    Math.asin(Math.max(-1, Math.min(1, x))),
    Math.atan2(-upX, right[0]),
  ].map((v) => (v * 180) / Math.PI) as Vector3;
}

// Camera-facing rotation without Viro's billboard constraint: that constraint
// forces triangle hit tests on bitmap text, which can have no vertex source.
export function useARCameraPosition() {
  const [position, setPosition] = useState<Vector3>([0, 0, 0]);
  const last = useRef<{ time: number; position: Vector3 } | null>(null);
  const update = useCallback((next: Vector3) => {
    const now = Date.now();
    if (
      last.current &&
      (now - last.current.time < 100 ||
        next.every((v, i) => Math.abs(v - last.current!.position[i]) < 0.01))
    )
      return;
    last.current = { time: now, position: [...next] };
    setPosition([...next]);
  }, []);
  return { position, update };
}
