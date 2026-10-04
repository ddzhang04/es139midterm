import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViroClickState } from '@reactvision/react-viro/dist/components/Types/ViroEvents';
import type { StopId } from './content';
import type { SurfaceARProps } from './SurfaceARView';

// Respond inside the scene immediately; also accept selection changes from the
// app controls without replacing the navigator or resetting the tracking origin.
export default function useARSelection(app: SurfaceARProps, id: StopId) {
  const latest = useRef(app);
  latest.current = app;
  const [selected, setSelected] = useState(app.selected);
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = app.selected;
    setSelected(app.selected);
  }, [app.selected, app.revision, id]);
  const close = useCallback(() => {
    selectedRef.current = false;
    setSelected(false);
    latest.current.onDismiss();
  }, []);
  const open = useCallback(() => {
    // A native tap may be delivered by either the box or its plus label.
    // Opening twice must not immediately collapse the panel again.
    if (selectedRef.current) return;
    selectedRef.current = true;
    setSelected(true);
    if (__DEV__)
      console.info('[HistoryLens AR interaction]', {
        event: 'open',
        restored: latest.current.revision === 0 && !!latest.current.testSpot?.placement,
      });
    latest.current.onSelect(id);
  }, [id]);
  const press = useCallback(
    (state: ViroClickState) => {
      // Viro CLICK_DOWN is 1. Accept the initial contact even if finger/phone
      // movement makes the release miss the marker's geometry.
      if (state === 1) open();
    },
    [open],
  );
  return { selected, open, close, press };
}
