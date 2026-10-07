import type { StoryStop } from './content';
import type { Point, TestSpot } from './testLocation';
export type CampusPlace = Point & {
  id:
    | 'harvard-science-center'
    | 'quincy-house-courtyard'
    | 'malkin-athletic-center'
    | 'widener-library';
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
    // Plaza south of the Science Center, matching the marked map location.
    latitude: 42.375949,
    longitude: -71.116439,
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
  {
    id: 'malkin-athletic-center',
    title: 'Malkin Athletic Center',
    latitude: 42.37135,
    longitude: -71.11938,
    description: 'Harvard’s athletic and recreation center at 39 Holyoke Street.',
    source: 'https://gocrimson.com/sports/2020/5/5/information-facilities-malkin.aspx',
  },
  {
    id: 'widener-library',
    title: 'Widener Library',
    latitude: 42.37388,
    longitude: -71.1164,
    description: 'In front of Widener Library’s steps, facing Harvard Yard.',
    source: 'https://library.harvard.edu/libraries/widener/about',
  },
];
export const harvardMapRegion = {
  latitude: 42.37356,
  longitude: -71.11675,
  latitudeDelta: 0.012,
  longitudeDelta: 0.008,
};

const campusHistory: Record<
  CampusPlace['id'],
  { year: string; story: string; sources: NonNullable<StoryStop['sources']> }
> = {
  'widener-library': {
    year: '1915',
    story:
      'Why is there a Titanic beside this library? Widener Library is a memorial to Harry Elkins Widener, a Harvard graduate from the Class of 1907 who died aboard the Titanic in 1912. His mother, Eleanor Elkins Widener, funded the library in his memory. It opened in 1915, replacing Gore Hall. Harry was a book collector, and his collection of roughly 3,300 volumes is preserved in the Memorial Rooms. The ship here is a simplified illustration of the Titanic, connecting the building in front of you to the family story behind its name.',
    sources: [
      {
        title: 'Harvard Library: About Widener',
        url: 'https://library.harvard.edu/libraries/widener/about',
      },
      {
        title: 'Harry Elkins Widener Collection',
        url: 'https://library.harvard.edu/collections/harry-elkins-widener-collection',
      },
    ],
  },
  'harvard-science-center': {
    year: '1973',
    story:
      'Does the Science Center look like a camera? A campus rumor compares its stepped shape to an early Polaroid, but that is not an established explanation of the design. Harvard Magazine reported that architect Josep Lluís Sert objected strongly to the suggestion. The Polaroid connection is real, though: Edwin Land, the company’s cofounder, provided an anonymous $12.5 million gift that funded the building. The folding camera beside this dot is a stylized early Polaroid Land Model 95, introduced in 1948. Compare its extended bellows and lens with the building, and decide whether you see the resemblance. The Science Center opened in 1973 and houses teaching spaces, Cabot Science Library, and historical scientific instruments.',
    sources: [
      {
        title: 'Harvard Magazine: Reshaping the Science Center',
        url: 'https://www.harvardmagazine.com/2002/01/reshaping-the-science-ce-html',
      },
      {
        title: 'Smithsonian: Polaroid Land Camera Model 95',
        url: 'https://americanhistory.si.edu/collections/object/nmah_1154069',
      },
      { title: 'Science Center: History', url: 'https://scictr.fas.harvard.edu/history' },
      {
        title: 'Harvard SEAS: Science Center tour',
        url: 'https://seas.harvard.edu/tour/cambridge/2/science-center-and-seas-history',
      },
    ],
  },
  'quincy-house-courtyard': {
    year: '1959',
    story:
      'Quincy House opened in September 1959, the first new House after Harvard’s original seven river Houses of the early 1930s. It is named for Josiah Quincy III, Harvard’s president from 1829 to 1845. The courtyard brings two architectural periods together. Stone Hall, originally called Mather Hall and part of Leverett House, was built in 1929–1930 in a neo-Georgian style. New Quincy was designed by Shepley, Bulfinch, Richardson and Abbott. Before New Quincy was built, a low row of squash courts enclosed the east side. The raised, nearly detached House Library adds another interior court to Quincy’s network of gardens and open spaces.',
    sources: [{ title: 'Quincy House: The House', url: 'https://quincy.harvard.edu/house-life' }],
  },
  'malkin-athletic-center': {
    year: '1930',
    story:
      'The MAC opened in 1930 as the Indoor Athletic Building. It was renamed in 1985 for Peter L. Malkin, a member of Harvard’s Class of 1955 who funded that year’s renovations. Another renovation followed in 2004. The five-story building serves both campus recreation and varsity sports. Its facilities include a 25-yard pool, a smaller activity pool, weight rooms, and a gym floor with three basketball courts. Harvard’s volleyball, fencing, and wrestling teams use the MAC for practice and competition. Look for the House seals in the lobby: they connect the building to the residential Houses whose students compete in intramural sports.',
    sources: [
      {
        title: 'Harvard Athletics: Malkin Athletic Center',
        url: 'https://gocrimson.com/sports/2020/5/5/information-facilities-malkin.aspx',
      },
      {
        title: 'Harvard College: The MAC',
        url: 'https://college.harvard.edu/about/campus/malkin-athletic-center',
      },
    ],
  },
};
export function campusStory(place: CampusPlace): StoryStop {
  return {
    id: place.id,
    title: place.title,
    category: 'Harvard campus',
    color: '#E75049',
    layer: 'structures',
    x: 0.5,
    y: 0.5,
    description: place.description,
    ...campusHistory[place.id],
  };
}
export function campusSpot(place: CampusPlace): TestSpot {
  const savedAt = {
    'harvard-science-center': 1,
    'quincy-house-courtyard': 2,
    'malkin-athletic-center': 3,
    'widener-library': 4,
  }[place.id];
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
