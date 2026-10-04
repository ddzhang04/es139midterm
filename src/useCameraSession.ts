import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import { useCameraPermissions } from 'expo-camera';

export default function useCameraSession(uiPreview: boolean, exploring: boolean) {
  const [camera, setCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [foreground, setForeground] = useState(
    AppState.currentState !== 'background' && AppState.currentState !== 'inactive',
  );
  const generation = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener('change', (state) =>
      setForeground(state === 'active'),
    );
    return () => {
      mounted.current = false;
      generation.current++;
      listener.remove();
    };
  }, []);

  useEffect(() => {
    // Leaving AR cancels pending permission requests. The requested camera
    // mode is retained while visiting the map; no camera view is mounted there.
    if (!exploring) generation.current++;
  }, [exploring]);

  function disableCamera() {
    generation.current++;
    setCamera(false);
  }

  async function enableCamera(): Promise<boolean> {
    if (uiPreview) return false;
    const operation = ++generation.current;
    try {
      const result =
        permission?.granted || permission?.canAskAgain === false
          ? permission
          : await requestPermission();
      // Permission can finish after the visitor has left the screen or changed
      // to demo mode. A late response must not reopen the camera.
      if (!mounted.current || operation !== generation.current) return false;
      if (result?.granted) {
        setCamera(true);
        return true;
      }
      setCamera(false);
      Alert.alert(
        'Camera access',
        'Allow camera access to explore the site through your phone. You can enable it in Settings or continue with the demo scene.',
        [
          { text: 'Use demo scene', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    } catch {
      if (!mounted.current || operation !== generation.current) return false;
      setCamera(false);
      Alert.alert(
        'Camera unavailable',
        'The camera could not be opened. You can continue exploring the demo scene.',
      );
    }
    return false;
  }

  return { camera, permission, foreground, enableCamera, disableCamera };
}
