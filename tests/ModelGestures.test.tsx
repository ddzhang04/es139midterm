import { act, renderHook } from '@testing-library/react-native';
import useModelGestures from '../src/useModelGestures';

test('pinch and rotation are relative to each gesture and preserve completed transforms', () => {
  const tap = jest.fn();
  const { result } = renderHook(() => useModelGestures(tap));
  act(() => result.current.onPinch(1, 1));
  act(() => result.current.onPinch(2, 2));
  act(() => result.current.onPinch(2, 2.5));
  expect(result.current.scale).toBe(2.5);
  act(() => result.current.onPinch(3, 2.5));
  act(() => result.current.onPinch(1, 1));
  act(() => result.current.onPinch(3, 0.5));
  expect(result.current.scale).toBe(1.25);
  act(() => result.current.onRotate(1, 0));
  act(() => result.current.onRotate(2, 45));
  act(() => result.current.onRotate(3, 90));
  expect(result.current.yaw).toBe(-110);
  act(() => result.current.onRotate(1, 0));
  act(() => result.current.onRotate(3, -45));
  expect(result.current.yaw).toBe(-65);
});

test('camera scale stays usable and a two-finger gesture does not open the story', () => {
  let now = 1000;
  const clock = jest.spyOn(Date, 'now').mockImplementation(() => now);
  try {
    const tap = jest.fn();
    const { result } = renderHook(() => useModelGestures(tap));
    act(() => result.current.onPinch(1, 1));
    act(() => result.current.onPinch(2, 100));
    expect(result.current.scale).toBe(3);
    act(() => result.current.onClick());
    expect(tap).not.toHaveBeenCalled();
    act(() => result.current.onPinch(3, 0.01));
    expect(result.current.scale).toBe(0.35);
    act(() => result.current.onClick());
    expect(tap).not.toHaveBeenCalled();
    now += 500;
    act(() => result.current.onClick());
    expect(tap).toHaveBeenCalledTimes(1);
    act(() => result.current.onPinch(2, NaN));
    expect(result.current.scale).toBe(0.35);
  } finally {
    clock.mockRestore();
  }
});
