import type { StoryStop } from './content';
import type { Point, TestSpot } from './testLocation';
export type CampusPlace = Point & {
  id: 'harvard-science-center' | 'quincy-house-courtyard';
  title: string;
  description: string;
  source: string;
};
// Approximate prototype pin coordinates. Quincy is placed in the open space
// between New Quincy and Stone Hall using OpenStreetMap building outlines.
export const campusPlaces: CampusPlace[] = [
  {
    id: 'harvard-science-center',
    title: 'Harvard Science Center',
    latitude: 42.3764,
    longitude: -71.1166,
    description: 'Harvard’s Science Center at 1 Oxford Street, just north of Harvard Yard.',
    source: 'https://scictr.fas.harvard.edu/',
  },
  {
    id: 'quincy-house-courtyard',
    title: 'Quincy House courtyard',
    latitude: 42.37072,
    longitude: -71.1169,
    description: 'The courtyard between New Quincy and Stone Hall at Quincy House.',
    source: 'https://quincy.harvard.edu/quincy-courtyard',
  },
];
export const harvardMapRegion = {
  latitude: 42.37356,
  longitude: -71.11675,
  latitudeDelta: 0.012,
  longitudeDelta: 0.008,
};

export function campusStory(place: CampusPlace): StoryStop {
  return {
    id: place.id,
    title: place.title,
    category: 'Harvard campus',
    year: 'Campus',
    color: '#E75049',
    layer: 'structures',
    x: 0.5,
    y: 0.5,
    description: place.description,
    story:
      place.id === 'harvard-science-center'
        ? 'The Science Center at 1 Oxford Street supports teaching and research in Harvard’s Faculty of Arts and Sciences. This campus landmark brings students, classrooms, and academic facilities together just north of Harvard Yard.'
        : 'Quincy’s courtyard is a shared gathering space between New Quincy and Stone Hall. House events and student activities bring the community together here. This AR circle marks the courtyard as a place to discover stories about everyday campus life.',
  };
}
export function campusSpot(place: CampusPlace): TestSpot {
  const savedAt = place.id === 'harvard-science-center' ? 1 : 2;
  return {
    name: place.title,
    latitude: place.latitude,
    longitude: place.longitude,
    radius: 50,
    savedAt,
    placement: {
      latitude: place.latitude,
      longitude: place.longitude,
      altitude: null,
      altitudeReference: 'WGS84',
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      savedAt,
      horizontalAccuracy: 20,
      altitudeAccuracy: null,
    },
  };
}
