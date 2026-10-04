import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import HistoryLens from './src/HistoryLens';
import { styles as s } from './src/ui/styles';
import { colors as C } from './src/ui/theme';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  });
  if (!fontsLoaded && !fontError)
    return (
      <View style={[s.app, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: C.green, fontSize: 24 }}>HistoryLens</Text>
      </View>
    );
  return (
    <SafeAreaProvider>
      <HistoryLens />
    </SafeAreaProvider>
  );
}
