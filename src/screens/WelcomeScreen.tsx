import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PlaceIllustration from '../components/PlaceIllustration';
import { demoSite } from '../content';
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
      <View
        style={[
          s.welcomeImage,
          { height: Math.max(360, height * 0.485, insets.top + 170 * fontScale) },
        ]}
      >
        <PlaceIllustration />
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
          <Tag>{demoSite.label}</Tag>
          <Text style={s.location}>Objects · places · people</Text>
        </View>
      </View>
      <View style={[s.welcomeContent, { minHeight: height * 0.515 - insets.bottom }]}>
        <View>
          <Text accessibilityRole="header" style={s.headline}>
            Discover the stories hidden around you.
          </Text>
          <Text style={s.welcomeCopy}>
            Explore the places around you through local stories, historical records, and augmented
            reality.
          </Text>
          <Text style={s.note}>
            Try the sample experience, or save a test location in DEV. Example stories are
            illustrative.
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
