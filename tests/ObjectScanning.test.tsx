import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aimedObject, type ScanCandidate } from '../src/objectScanning';
import useObjectCollection, { COLLECTION_KEY, parseCollection } from '../src/useObjectCollection';
const camera = { position: [0, 0, 0], forward: [0, 0, -1], up: [0, 1, 0], rotation: [0, 0, 0] };
const object: ScanCandidate = {
  id: 'science-center-camera',
  title: 'Vintage film camera',
  storyId: 'harvard-science-center',
  position: [0, 0, -3],
};
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});
test('aiming chooses the aligned object and rejects objects behind, too distant, or outside the reticle', () => {
  expect(aimedObject([object], camera)?.id).toBe('science-center-camera');
  for (const position of [
    [0, 0, 3],
    [0, 0, -41],
    [3, 0, -3],
    [0, 0, 0],
  ])
    expect(
      aimedObject([{ ...object, position: position as [number, number, number] }], camera),
    ).toBeNull();
  expect(
    aimedObject([{ ...object, id: 'demo-tree', position: [0.3, 0, -3] }, object], camera)?.id,
  ).toBe('science-center-camera');
});
test('collection saves scans once and restores them after reopening', async () => {
  const first = renderHook(() => useObjectCollection());
  act(() => {
    first.result.current.collect('science-center-camera');
    first.result.current.collect('science-center-camera');
  });
  await waitFor(async () =>
    expect(await AsyncStorage.getItem(COLLECTION_KEY)).toBe('["science-center-camera"]'),
  );
  first.unmount();
  const second = renderHook(() => useObjectCollection());
  await waitFor(() => expect(second.result.current.ids).toEqual(['science-center-camera']));
  expect(parseCollection('["unknown","demo-tree","demo-tree"]')).toEqual(['demo-tree']);
  expect(parseCollection('{broken')).toEqual([]);
});
