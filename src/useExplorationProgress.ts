import { useEffect, useRef, useState } from 'react';
import { stops, type StopId } from './content';
import { campusPlaces } from './mapPlaces';
import { localStorage } from './localStorage';

export const PROGRESS_KEY = 'historylens-progress';
type Progress = { visited: StopId[]; saved: boolean };
const emptyProgress = (): Progress => ({ visited: [], saved: false });

export function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress();
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return emptyProgress();
    const record = data as Record<string, unknown>;
    const visited = Array.isArray(record.visited)
      ? record.visited.filter(
          (id): id is StopId =>
            id === 'demo-tree' ||
            stops.some((stop) => stop.id === id) ||
            campusPlaces.some((place) => place.id === id),
        )
      : [];
    return { visited: [...new Set(visited)], saved: record.saved === true };
  } catch {
    return emptyProgress();
  }
}

export default function useExplorationProgress() {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const current = useRef(progress);
  const bookmarkEdited = useRef(false);
  const edited = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    void localStorage
      .read(PROGRESS_KEY)
      .then((raw) => {
        if (!active) return;
        const restored = parseProgress(raw);
        // A visitor can interact before storage finishes loading. Preserve those
        // visits and an explicitly changed bookmark instead of replacing them.
        const merged = {
          visited: [...new Set([...restored.visited, ...current.current.visited])],
          saved: bookmarkEdited.current ? current.current.saved : restored.saved,
        };
        current.current = merged;
        setProgress(merged);
      })
      .catch(() => {
        if (active) setError('Could not load saved exploration progress.');
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Do not overwrite storage just because a read failed or data was corrupt.
    if (!loaded || !edited.current) return;
    void localStorage
      .write(PROGRESS_KEY, JSON.stringify(progress))
      .then(() => {
        if (mounted.current) setError('');
      })
      .catch(() => {
        if (mounted.current) setError('Could not save exploration progress.');
      });
  }, [loaded, progress]);

  function visit(id: StopId) {
    if (current.current.visited.includes(id)) return;
    edited.current = true;
    const next = { ...current.current, visited: [...current.current.visited, id] };
    current.current = next;
    setProgress(next);
  }

  function toggleSaved() {
    bookmarkEdited.current = true;
    edited.current = true;
    const next = { ...current.current, saved: !current.current.saved };
    current.current = next;
    setProgress(next);
  }

  return { ...progress, loaded, error, visit, toggleSaved };
}
