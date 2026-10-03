jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn().mockResolvedValue(undefined) }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CameraView: (props: object) => React.createElement(View, { ...props, testID: 'native-camera' }),
    useCameraPermissions: () => {
      const [permission, setPermission] = React.useState({ granted: false });
      return [permission, async () => { const next = { granted: true }; setPermission(next); return next; }];
    },
  };
});
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return { SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children, useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) };
});
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  getForegroundPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  hasServicesEnabledAsync: jest.fn().mockResolvedValue(true),
  getCurrentPositionAsync: jest.fn().mockImplementation(async () => ({ coords: { latitude: 42.3745, longitude: -71.1169, accuracy: 5 }, timestamp: Date.now() })),
  watchPositionAsync: jest.fn().mockImplementation(async (_options, callback) => { callback({ coords: { latitude: 42.3745, longitude: -71.1169, accuracy: 5 }, timestamp: Date.now() }); return { remove: jest.fn() }; }),
}));

jest.mock('expo', () => ({ ...jest.requireActual('expo'), requireOptionalNativeModule: jest.fn(() => ({})) }));
