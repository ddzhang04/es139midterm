import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import PlaceIllustration from '../components/PlaceIllustration';
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
  const percent = Math.round((visited.length / stops.length) * 100);
  return (
    <>
      <Header
        developer={developer}
        title="Story Map"
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
            <Text style={s.smallBody}>
              {visited.length} of {stops.length} stories explored
            </Text>
            <Text style={s.progressLabel}>{percent}% complete</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${percent}%` }]} />
          </View>
        </View>
        <View style={s.legend}>
          <Text style={s.legendTitle}>LEGEND</Text>
          <Text style={s.factLabel}>● Explored</Text>
          <Text style={s.factLabel}>○ Not yet explored</Text>
        </View>
        <View style={[s.mapImage, { height: width * 1.04 }]}>
          <PlaceIllustration map />
          <View pointerEvents="none" style={{ position: 'absolute', left: 16, top: 12 }}>
            <Text style={s.eyebrow}>ILLUSTRATIVE LAYOUT</Text>
          </View>
          {stops.map((stop, i) => (
            <Pressable
              key={stop.id}
              accessibilityRole="button"
              accessibilityLabel={`Stop ${i + 1}: ${stop.title}${visited.includes(stop.id) ? ', explored' : ''}`}
              onPress={() => onSelect(stop.id)}
              style={[
                s.mapPin,
                {
                  left: `${stop.x * 100}%`,
                  top: `${stop.y * 100}%`,
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
                  : visited.length === stops.length
                    ? 'WALK COMPLETE'
                    : 'NEXT STORY'}
              </Text>
              <Text style={s.nextTitle}>
                {detail?.title ||
                  stops.find((stop) => !visited.includes(stop.id))?.title ||
                  'Every place has a story'}
              </Text>
              <Text style={s.factLabel}>
                {detail?.description ||
                  'Choose a marker to preview its story. This diagram is not a live location map.'}
              </Text>
            </View>
          </View>
          <Button
            title={detail ? 'Explore in AR' : 'Explore Next Story'}
            icon="route"
            onPress={onExplore}
          />
        </View>
      </ScrollView>
    </>
  );
}
