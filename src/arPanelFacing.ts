import { useCallback, useRef, useState } from 'react';
import { surfaceCoordinates, type Vector3 } from './anchorPlacement';

export function panelFacingRotation(camera: Vector3, point: Vector3, parent: Vector3): Vector3 {
  // Only the horizontal direction matters: pitch must never tip the card
  // toward the ground when the user looks down at a low marker.
  let horizontal: Vector3 = [camera[0] - point[0], 0, camera[2] - point[2]];
  if (Math.hypot(...horizontal) < 0.001) horizontal = [0, 0, 1];
  const normal = surfaceCoordinates(horizontal, [0, 0, 0], parent);
  const length = Math.hypot(...normal);
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
  ].map((v) => (Math.abs(v) < 0.00000001 ? 0 : (v * 180) / Math.PI)) as Vector3;
}

export function readingPanelPose(
  camera: Vector3,
  forward: Vector3,
  marker: Vector3,
  parent: Vector3 = [0, 0, 0],
  scale: Vector3 = [1, 1, 1],
) {
  const horizontal = Math.hypot(forward[0], forward[2]);
  const direction: Vector3 =
    horizontal > 0.001 ? [forward[0] / horizontal, 0, forward[2] / horizontal] : [0, 0, -1];
  const world: Vector3 = [
    camera[0] + direction[0] * 2,
    camera[1] - 0.1,
    camera[2] + direction[2] * 2,
  ];
  const local = surfaceCoordinates(world, marker, parent);
  return {
    position: local.map((v, i) => v / scale[i]) as Vector3,
    rotation: panelFacingRotation(camera, world, parent),
  };
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
