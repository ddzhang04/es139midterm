import type { ViroCameraTransform } from '@reactvision/react-viro/dist/components/Types/ViroEvents';
import type { Vector3 } from './globalPlacement';
import { stops, treeDemoStory, harvardTestStop, type StopId, type StoryStop } from './content';
import { campusPlaces, campusStory } from './mapPlaces';

export type ObjectId = StopId | 'science-center-camera';
export type ScanCandidate = { id: ObjectId; storyId: StopId; title: string; position: Vector3 };
export type ScanTarget = Omit<ScanCandidate, 'position'> & { distance: number };
export function objectStory(id: ObjectId): StoryStop | undefined {
  if (id === 'science-center-camera')
    return {
      ...campusStory(campusPlaces[0]),
      title: 'Polaroid Land camera',
      description:
        'A stylized early Model 95 with folding bellows, illustrating the Science Center’s Polaroid connection.',
    };
  if (id === 'demo-tree') return treeDemoStory;
  const place = campusPlaces.find((place) => place.id === id);
  return place
    ? campusStory(place)
    : id === 'gun'
      ? harvardTestStop
      : stops.find((stop) => stop.id === id);
}
export function aimedObject(
  candidates: ScanCandidate[],
  camera: ViroCameraTransform,
): ScanTarget | null {
  let best: ScanTarget | null = null;
  let bestAlignment = 0;
  const forwardLength = Math.hypot(...camera.forward);
  if (forwardLength < 0.001) return null;
  for (const candidate of candidates) {
    const delta = candidate.position.map((v, i) => v - camera.position[i]);
    const distance = Math.hypot(...delta);
    if (distance < 0.4 || distance > 40) continue;
    const alignment =
      delta.reduce((sum, v, i) => sum + v * camera.forward[i], 0) / (distance * forwardLength);
    if (alignment < Math.cos((10 * Math.PI) / 180) || alignment <= bestAlignment) continue;
    bestAlignment = alignment;
    const { position: _, ...object } = candidate;
    best = { ...object, distance };
  }
  return best;
}
