import AsyncStorage from '@react-native-async-storage/async-storage';

// Serialize operations per record, including across hook remounts. A failed
// write must not prevent subsequent saves or deletions from completing.
const queues = new Map<string, Promise<unknown>>();

function enqueue<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  queues.set(key, next);
  void next.then(
    () => cleanUp(),
    () => cleanUp(),
  );
  function cleanUp() {
    if (queues.get(key) === next) queues.delete(key);
  }
  return next;
}

export const localStorage = {
  read: (key: string) => enqueue(key, () => AsyncStorage.getItem(key)),
  write: (key: string, value: string) => enqueue(key, () => AsyncStorage.setItem(key, value)),
  remove: (key: string) => enqueue(key, () => AsyncStorage.removeItem(key)),
};
