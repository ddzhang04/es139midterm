export type StopId = 'gun' | 'quarters' | 'signal' | 'keeper';
export type LayerId = 'structures' | 'people' | 'equipment' | 'photos' | 'stories';
export type StoryStop = {
  id: StopId;
  title: string;
  category: string;
  year: string;
  color: string;
  layer: LayerId;
  x: number;
  y: number;
  description: string;
  story: string;
};
export const demoSite = {
  title: 'A place full of stories',
  label: 'EXPLORE YOUR SURROUNDINGS',
  description:
    'Discover objects, buildings, landmarks, and the people connected to a place. Open a marker to see its story in augmented reality.',
};
// Keep the existing IDs so saved prototype progress remains readable.
export const stops: StoryStop[] = [
  {
    id: 'gun',
    title: 'Objects & artifacts',
    category: 'Objects',
    year: 'Past & present',
    color: '#E75049',
    layer: 'equipment',
    x: 0.13,
    y: 0.36,
    description: 'Discover the everyday objects that help tell a place’s story.',
    story:
      'An object can reveal how people lived, worked, and created. Its materials, purpose, and signs of use offer clues to the past. This example shows how an AR marker can connect an object to photographs, records, and stories shared by a community.',
  },
  {
    id: 'quarters',
    title: 'Buildings & spaces',
    category: 'Architecture',
    year: 'Past & present',
    color: '#3485E8',
    layer: 'structures',
    x: 0.65,
    y: 0.51,
    description: 'Look at how a building or public space has changed over time.',
    story:
      'Buildings hold layers of history. A doorway, an added floor, or a change in materials can show how a place adapted to new uses. Historical photographs and plans can help us imagine the same space at another moment in time.',
  },
  {
    id: 'signal',
    title: 'Local landmarks',
    category: 'Landmarks',
    year: 'Past & present',
    color: '#3485E8',
    layer: 'structures',
    x: 0.46,
    y: 0.27,
    description: 'Explore the features that give a place its identity.',
    story:
      'A landmark can be a gathering place, a route, a monument, or a feature of the landscape. Its meaning can change across generations. Stories from people connected to it help us understand why it matters today.',
  },
  {
    id: 'keeper',
    title: 'People & stories',
    category: 'Community',
    year: 'Past & present',
    color: '#E75049',
    layer: 'people',
    x: 0.63,
    y: 0.34,
    description: 'Meet the voices and experiences connected to a place.',
    story:
      'A place’s history includes the people who lived, worked, and gathered there. Personal accounts offer perspectives that buildings and objects alone cannot provide. Community contributions can bring those experiences into the AR view.',
  },
];

export const layers: {
  id: LayerId;
  label: string;
  icon: 'landmark' | 'people' | 'shield' | 'photos' | 'story';
}[] = [
  { id: 'structures', label: 'Structures', icon: 'landmark' },
  { id: 'people', label: 'People', icon: 'people' },
  { id: 'equipment', label: 'Objects & artifacts', icon: 'shield' },
  { id: 'photos', label: 'Archival photographs', icon: 'photos' },
  { id: 'stories', label: 'Personal stories', icon: 'story' },
];

// The storage format retains its legacy name; the interface is location-neutral.
export const harvardTestStop: StoryStop = {
  ...stops[0],
  title: 'Old Town Hall',
  category: 'Example story',
  year: '1892',
  description: 'A gathering place for town meetings, celebrations, and everyday community life.',
  story:
    'In this fictional example, the hall opened in 1892. Neighbors gathered here to discuss local issues, share news, and celebrate together. Over the years, the building became a library and later a community center. Look for the tall windows and stone entrance: details that hint at how the space was used. This sample shows how a real site’s researched history could appear beside it in AR.',
};
