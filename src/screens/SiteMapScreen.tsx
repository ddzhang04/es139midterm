import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { pictures } from '../assets';
import { stops, type StopId } from '../content';
import { Button, Header, Icon, RoundButton } from '../ui/primitives';
import { styles as s } from '../ui/styles';
import { colors as C } from '../ui/theme';

type Props = {
  width: number;
  visited: StopId[];
  detail: (typeof stops)[number] | undefined;
  developer: React.ReactNode;
  onBack: () => void;
  onSelect: (id: StopId) => void;
  onExplore: () => void;
};
export default function SiteMapScreen({
  width,
  visited,
  detail,
  developer,
  onBack,
  onSelect,
  onExplore,
}: Props) {
  return (
    <>
      <Header
        developer={developer}
        title="Explore the Site"
        back={onBack}
        action={
          <RoundButton
            icon="locate"
            label="Locate next stop"
            onPress={() => onSelect(stops.find((stop) => !visited.includes(stop.id))?.id || 'gun')}
          />
        }
      />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={s.progressHeader}>
          <View style={s.between}>
            <Text style={s.smallBody}>{visited.length} of 4 stories explored</Text>
            <Text style={s.progressLabel}>{visited.length * 25}% complete</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${visited.length * 25}%` }]} />
          </View>
        </View>
        <View style={s.legend}>
          <Text style={s.legendTitle}>LEGEND</Text>
          <Text style={s.factLabel}>● Explored</Text>
          <Text style={s.factLabel}>○ Not yet explored</Text>
        </View>
        <View style={[s.mapImage, { height: width * 1.04 }]}>
          <Image source={pictures.map} style={StyleSheet.absoluteFill} resizeMode="cover" />
          {stops.map((stop, i) => (
            <Pressable
              key={stop.id}
              accessibilityRole="button"
              accessibilityLabel={`Stop ${i + 1}: ${stop.title}${visited.includes(stop.id) ? ', explored' : ''}`}
              onPress={() => onSelect(stop.id)}
              style={[
                s.mapPin,
                {
                  left: `${[69, 54, 20, 74][i]}%`,
                  top: `${[18, 43, 56, 78][i]}%`,
                  backgroundColor: visited.includes(stop.id) ? C.green : 'white',
                },
              ]}
            >
              <Text
                maxFontSizeMultiplier={1.5}
                style={[s.pinNumber, visited.includes(stop.id) && { color: 'white' }]}
              >
                {visited.includes(stop.id) ? '✓' : i + 1}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={s.mapBottom}>
          <View style={s.nextStop}>
            <View style={s.detailIcon}>
              <Icon name="search" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.eyebrow}>
                {detail
                  ? 'SELECTED STOP'
                  : visited.length === 4
                    ? 'WALK COMPLETE'
                    : 'UP NEXT · 240 FT'}
              </Text>
              <Text style={s.nextTitle}>
                {detail?.title ||
                  stops.find((stop) => !visited.includes(stop.id))?.title ||
                  'Every place has a story'}
              </Text>
              <Text style={s.factLabel}>
                {detail?.description || 'Follow the path through the west arch.'}
              </Text>
            </View>
          </View>
          <Button
            title={detail ? 'Explore in AR' : 'Guide Me There'}
            icon="route"
            onPress={onExplore}
          />
        </View>
      </ScrollView>
    </>
  );
}
