import { useRef, useState } from 'react';
import type {
  ViroPinchState,
  ViroRotateState,
} from '@reactvision/react-viro/dist/components/Types/ViroEvents';

export default function useModelGestures(onTap: () => void) {
  const [scale, setScale] = useState(1);
  const [yaw, setYaw] = useState(-20);
  const current = useRef({ scale: 1, yaw: -20 });
  const pinch = useRef<number | null>(null);
  const rotate = useRef<number | null>(null);
  const lastGesture = useRef(-Infinity);
  function onPinch(state: ViroPinchState, factor: number) {
    if (!Number.isFinite(factor) || factor <= 0) return;
    if (state === 1 && pinch.current === null) pinch.current = current.current.scale;
    if (pinch.current === null) return;
    const next = Math.max(0.35, Math.min(3, pinch.current * factor));
    current.current.scale = next;
    setScale(next);
    lastGesture.current = Date.now();
    if (state === 3) pinch.current = null;
  }
  function onRotate(state: ViroRotateState, degrees: number) {
    if (!Number.isFinite(degrees)) return;
    if (state === 1 && rotate.current === null) rotate.current = current.current.yaw;
    if (rotate.current === null) return;
    const next = rotate.current - degrees;
    current.current.yaw = next;
    setYaw(next);
    lastGesture.current = Date.now();
    if (state === 3) rotate.current = null;
  }
  function onClick() {
    if (pinch.current !== null || rotate.current !== null || Date.now() - lastGesture.current < 400)
      return;
    onTap();
  }
  return { scale, yaw, onPinch, onRotate, onClick };
}
