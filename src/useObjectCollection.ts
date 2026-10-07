import { useEffect, useRef, useState } from 'react';
import { localStorage } from './localStorage';
import { objectStory, type ObjectId } from './objectScanning';
export const COLLECTION_KEY = 'historylens-object-collection';
export function parseCollection(raw: string | null): ObjectId[] {
  try {
    const value: unknown = JSON.parse(raw || '[]');
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (id): id is ObjectId => typeof id === 'string' && !!objectStory(id as ObjectId),
            ),
          ),
        ]
      : [];
  } catch {
    return [];
  }
}
export default function useObjectCollection() {
  const [ids, setIds] = useState<ObjectId[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const current = useRef(ids);
  const edited = useRef(false);
  useEffect(() => {
    let active = true;
    void localStorage
      .read(COLLECTION_KEY)
      .then((raw) => {
        if (!active) return;
        const merged = [...new Set([...parseCollection(raw), ...current.current])];
        current.current = merged;
        setIds(merged);
      })
      .catch(() => {
        if (active) setError('Could not load your collection.');
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!loaded || !edited.current) return;
    let active = true;
    void localStorage
      .write(COLLECTION_KEY, JSON.stringify(ids))
      .then(() => {
        if (active) setError('');
      })
      .catch(() => {
        if (active) setError('Could not save your collection.');
      });
    return () => {
      active = false;
    };
  }, [ids, loaded]);
  function collect(id: ObjectId) {
    if (current.current.includes(id) || !objectStory(id)) return;
    edited.current = true;
    current.current = [...current.current, id];
    setIds(current.current);
  }
  return { ids, collect, error };
}
