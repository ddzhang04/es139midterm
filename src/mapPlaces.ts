import type { Point } from './testLocation';
export type CampusPlace = Point & {
  id: string;
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
