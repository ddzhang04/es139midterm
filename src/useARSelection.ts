import { useEffect, useRef, useState } from 'react';
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
  function close() {
    selectedRef.current = false;
    setSelected(false);
    latest.current.onDismiss();
  }
  function open() {
    // A native tap may be delivered by either the box or its plus label.
    // Opening twice must not immediately collapse the panel again.
    if (selectedRef.current) return;
    selectedRef.current = true;
    setSelected(true);
    latest.current.onSelect(id);
  }
  return { selected, open, close };
}
