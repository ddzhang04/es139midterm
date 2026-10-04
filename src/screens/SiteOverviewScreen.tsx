import React from 'react';
import { ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';
import { pictures } from '../assets';
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
        <ImageBackground source={pictures.site} style={s.siteImage}>
          <View style={s.imageCaption}>
            <Tag>DEFENDING THE HARBOR</Tag>
            <View style={s.tag}>
              <Icon name="images" />
              <Text style={s.tagText}>1 / 4</Text>
            </View>
          </View>
        </ImageBackground>
        <View
          style={[
            s.siteDetails,
            { minHeight: Math.max(420, height - insets.top - insets.bottom - 328) },
          ]}
        >
          <View>
            <Text style={s.eyebrow}>COASTAL DEFENSE · 1848–1945</Text>
            <Text accessibilityRole="header" style={s.siteTitle}>
              Battery Point Fort
            </Text>
            <Text style={s.body}>
              Built after the War of 1812, this granite fort guarded the harbor’s shipping channel.
              Soldiers, lighthouse keepers, and dockworkers shaped daily life here for nearly a
              century.
            </Text>
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
                { icon: 'clock', value: '25 min', label: 'AR walk' },
                { icon: 'pin', value: '4 stops', label: '0.6 mile' },
                { icon: 'access', value: 'Easy', label: 'Paved route' },
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
