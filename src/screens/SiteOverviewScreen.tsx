import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import PlaceIllustration from '../components/PlaceIllustration';
import { demoSite, stops } from '../content';
import { Button, Header, Icon, RoundButton, Tag } from '../ui/primitives';
import { styles as s } from '../ui/styles';

type Props = {
  height: number;
  insets: { top: number; bottom: number };
  saved: boolean;
  developer: React.ReactNode;
  onBack: () => void;
  onToggleSaved: () => void;
  onViewLand: () => void;
  onExplore: () => void;
};
export default function SiteOverviewScreen({
  height,
  insets,
  saved,
  developer,
  onBack,
  onToggleSaved,
  onViewLand,
  onExplore,
}: Props) {
  return (
    <>
      <Header
        developer={developer}
        title="Site Overview"
        back={onBack}
        action={
          <RoundButton
            icon="bookmark"
            label={saved ? 'Unsave site' : 'Save site'}
            selected={saved}
            onPress={onToggleSaved}
          />
        }
      />
      <ScrollView bounces={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={s.siteImage}>
          <PlaceIllustration />
          <View style={s.imageCaption}>
            <Tag>DEMO EXPERIENCE</Tag>
            <View style={s.tag}>
              <Icon name="images" />
              <Text style={s.tagText}>{stops.length} stories</Text>
            </View>
          </View>
        </View>
        <View
          style={[
            s.siteDetails,
            { minHeight: Math.max(420, height - insets.top - insets.bottom - 328) },
          ]}
        >
          <View>
            <Text style={s.eyebrow}>PLACES · OBJECTS · PEOPLE</Text>
            <Text accessibilityRole="header" style={s.siteTitle}>
              {demoSite.title}
            </Text>
            <Text style={s.body}>{demoSite.description}</Text>
            <Pressable accessibilityRole="button" onPress={onViewLand}>
              <Text style={s.textLink}>View Tribal Land Acknowledgment</Text>
            </Pressable>
            {saved && (
              <Text accessibilityLiveRegion="polite" style={s.savedNote}>
                Saved to your sites
              </Text>
            )}
          </View>
          <View style={s.facts}>
            {(
              [
                { icon: 'clock', value: 'Your pace', label: 'Explore freely' },
                { icon: 'pin', value: `${stops.length} stories`, label: 'Sample markers' },
                { icon: 'access', value: 'Tap to open', label: 'AR information' },
              ] as const
            ).map((f) => (
              <View key={f.label} style={s.fact}>
                <Icon name={f.icon} />
                <Text style={s.factValue}>{f.value}</Text>
                <Text style={s.factLabel}>{f.label}</Text>
              </View>
            ))}
          </View>
          <Button title="Start AR Experience" icon="scan" onPress={onExplore} />
        </View>
      </ScrollView>
    </>
  );
}
