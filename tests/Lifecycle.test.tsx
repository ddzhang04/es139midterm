import { act, renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as Speech from 'expo-speech';
import useCameraSession from '../src/useCameraSession';
import useNarration from '../src/useNarration';

beforeEach(() => {
  jest.clearAllMocks();
});

test('a late camera permission response cannot reopen the camera after leaving AR', async () => {
  let resolve!: (permission: { granted: boolean }) => void;
  const request = jest.fn(
    () =>
      new Promise<{ granted: boolean }>((yes) => {
        resolve = yes;
      }),
  );
  const permission = jest
    .spyOn(require('expo-camera'), 'useCameraPermissions')
    .mockReturnValue([{ granted: false, canAskAgain: true }, request]);
  try {
    const { result, rerender } = renderHook(({ exploring }) => useCameraSession(false, exploring), {
      initialProps: { exploring: true },
    });
    let operation!: Promise<boolean>;
    act(() => {
      operation = result.current.enableCamera();
    });
    rerender({ exploring: false });
    await act(async () => {
      resolve({ granted: true });
      await operation;
    });
    expect(result.current.camera).toBe(false);
  } finally {
    permission.mockRestore();
  }
});

test('a permission failure after unmount does not display an alert', async () => {
  let reject!: (error: Error) => void;
  const request = jest.fn(
    () =>
      new Promise((_yes, no) => {
        reject = no;
      }),
  );
  const permission = jest
    .spyOn(require('expo-camera'), 'useCameraPermissions')
    .mockReturnValue([{ granted: false, canAskAgain: true }, request]);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  try {
    const { result, unmount } = renderHook(() => useCameraSession(false, true));
    let operation!: Promise<boolean>;
    act(() => {
      operation = result.current.enableCamera();
    });
    unmount();
    await act(async () => {
      reject(new Error('cancelled'));
      await operation;
    });
    expect(alert).not.toHaveBeenCalled();
  } finally {
    permission.mockRestore();
    alert.mockRestore();
  }
});

test('an old narration completion cannot stop a newer story', () => {
  const { result } = renderHook(() => useNarration(true));
  act(() => result.current.toggle('first story'));
  const first = jest.mocked(Speech.speak).mock.calls[0][1]!;
  act(() => result.current.stop());
  act(() => result.current.toggle('second story'));
  act(() => first.onDone?.());
  expect(result.current.speaking).toBe(true);
  act(() => jest.mocked(Speech.speak).mock.calls[1][1]!.onDone?.());
  expect(result.current.speaking).toBe(false);
});

test('leaving exploration stops narration', () => {
  const { result, rerender } = renderHook(({ active }) => useNarration(active), {
    initialProps: { active: true },
  });
  act(() => result.current.toggle('a story'));
  rerender({ active: false });
  expect(result.current.speaking).toBe(false);
  expect(Speech.stop).toHaveBeenCalled();
});

test('Listen requests audible speech in a separate iOS session and reports playback errors', () => {
  const { result } = renderHook(() => useNarration(true));
  act(() => result.current.toggle('The Science Center opened in 1973.'));
  expect(Speech.speak).toHaveBeenLastCalledWith(
    'The Science Center opened in 1973.',
    expect.objectContaining({ volume: 1, language: 'en-US', useApplicationAudioSession: false }),
  );
  const options = jest.mocked(Speech.speak).mock.calls.at(-1)![1]!;
  act(() => options.onError?.(new Error('audio unavailable')));
  expect(result.current.speaking).toBe(false);
  expect(result.current.error).toContain('Audio could not start');
  act(() => result.current.toggle('Try again'));
  expect(result.current.error).toBe('');
  expect(result.current.speaking).toBe(true);
});
