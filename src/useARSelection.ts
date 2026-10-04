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
  function toggle() {
    if (selectedRef.current) close();
    else {
      selectedRef.current = true;
      setSelected(true);
      latest.current.onSelect(id);
    }
  }
  return { selected, toggle, close };
}
