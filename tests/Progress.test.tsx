import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useExplorationProgress, { PROGRESS_KEY, parseProgress } from '../src/useExplorationProgress';
import { localStorage } from '../src/localStorage';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

test('corrupt progress is safe and unknown or duplicate stop IDs are discarded', () => {
  expect(parseProgress('{broken')).toEqual({ visited: [], saved: false });
  expect(parseProgress('null')).toEqual({ visited: [], saved: false });
  expect(
    parseProgress(
      JSON.stringify({ visited: ['gun', 'gun', 'unknown', 7, 'keeper'], saved: 'false' }),
    ),
  ).toEqual({ visited: ['gun', 'keeper'], saved: false });
});

test('a slow hydration preserves visits and bookmark changes made before loading finishes', async () => {
  const load = deferred<string | null>();
  jest.mocked(AsyncStorage.getItem).mockReturnValueOnce(load.promise);
  const { result } = renderHook(() => useExplorationProgress());
  await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
  act(() => {
    result.current.visit('gun');
    result.current.toggleSaved();
  });
  await act(async () => load.resolve(JSON.stringify({ visited: ['keeper'], saved: false })));
  await waitFor(() => expect(result.current.loaded).toBe(true));
  expect(result.current.visited).toEqual(['keeper', 'gun']);
  expect(result.current.saved).toBe(true);
  await waitFor(() =>
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
      PROGRESS_KEY,
      JSON.stringify({ visited: ['keeper', 'gun'], saved: true }),
    ),
  );
});

test('storage serializes overlapping edits and a delete cannot be undone by an older write', async () => {
  const first = deferred<void>();
  jest.mocked(AsyncStorage.setItem).mockReturnValueOnce(first.promise);
  const one = localStorage.write(PROGRESS_KEY, 'older');
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1));
  const two = localStorage.write(PROGRESS_KEY, 'newer');
  const removed = localStorage.remove(PROGRESS_KEY);
  await act(async () => {
    await Promise.resolve();
  });
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  first.resolve();
  await Promise.all([one, two, removed]);
  expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(PROGRESS_KEY, 'newer');
  expect(await AsyncStorage.getItem(PROGRESS_KEY)).toBeNull();
});

test('a failed write does not poison later storage operations', async () => {
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk unavailable'));
  await expect(localStorage.write(PROGRESS_KEY, 'failed')).rejects.toThrow('disk unavailable');
  await localStorage.write(PROGRESS_KEY, 'recovered');
  expect(await localStorage.read(PROGRESS_KEY)).toBe('recovered');
});

test('a failed progress read does not immediately overwrite existing storage', async () => {
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('read failed'));
  const { result } = renderHook(() => useExplorationProgress());
  await waitFor(() => expect(result.current.loaded).toBe(true));
  expect(result.current.error).toContain('load');
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  act(() => result.current.visit('gun'));
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalled());
  await waitFor(() => expect(result.current.error).toBe(''));
});
