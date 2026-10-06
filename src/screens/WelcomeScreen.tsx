import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import WelcomeCarousel from '../components/WelcomeCarousel';
import { Button, Icon } from '../ui/primitives';
import { styles as s } from '../ui/styles';

type Props = {
  height: number;
  fontScale: number;
  insets: { top: number; bottom: number };
  developer: React.ReactNode;
  onExplore: () => void;
  onOpenMap: () => void;
};
export default function WelcomeScreen({
  height,
  fontScale,
  insets,
  developer,
  onExplore,
  onOpenMap,
}: Props) {
  return (
    <ScrollView bounces={false} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={[s.brand, { paddingTop: insets.top + 12, paddingBottom: 16 }]}>
        <View style={s.brandMark}>
          <Icon name="eye" />
        </View>
        <Text
          style={[s.brandName, { color: '#163A33' }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          HistoryLens
        </Text>
        {developer}
      </View>
      <WelcomeCarousel height={Math.max(280, Math.min(380, height * 0.38), 180 * fontScale)} />
      <View style={[s.welcomeContent, { paddingTop: 12, paddingBottom: insets.bottom + 24 }]}>
        <View>
          <Text accessibilityRole="header" style={s.headline}>
            Discover the stories hidden around you.
          </Text>
          <Text style={s.welcomeCopy}>
            Explore the places around you through local stories, historical records, and augmented
            reality.
          </Text>
        </View>
        <View style={s.actions}>
          <Button title="Explore This Site" icon="compass" onPress={onExplore} />
          <Button title="View Site Map" icon="map" secondary onPress={onOpenMap} />
        </View>
      </View>
    </ScrollView>
  );
}
