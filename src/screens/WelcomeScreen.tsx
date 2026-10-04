import React from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { pictures } from '../assets';
import { Button, Icon, Tag } from '../ui/primitives';
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
      <ImageBackground
        source={pictures.welcome}
        style={[
          s.welcomeImage,
          { height: Math.max(360, height * 0.485, insets.top + 170 * fontScale) },
        ]}
      >
        <LinearGradient
          colors={['rgba(16,34,28,0.15)', 'rgba(16,34,28,0.1)', 'rgba(16,34,28,0.8)']}
          locations={[0, 0.62, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[s.brand, { marginTop: insets.top + 24 }]}>
          <View style={s.brandMark}>
            <Icon name="eye" />
          </View>
          <Text style={s.brandName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            <Text style={{ color: '#163A33' }}>Hi</Text>storyLens
          </Text>
          {developer}
        </View>
        <View style={s.siteLabel}>
          <Tag>BATTERY POINT · EST. 1848</Tag>
          <Text style={s.location}>Fort Harbor National Historic Site</Text>
        </View>
      </ImageBackground>
      <View style={[s.welcomeContent, { minHeight: height * 0.515 - insets.bottom }]}>
        <View>
          <Text accessibilityRole="header" style={s.headline}>
            Discover the stories hidden around you.
          </Text>
          <Text style={s.welcomeCopy}>
            Explore the harbor’s past through local stories, historical records, and augmented
            reality.
          </Text>
          <Text style={s.note}>
            Illustrative historical content for this prototype. Locations, people, and events are
            fictional.
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
