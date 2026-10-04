import React from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Button, RoundButton } from '../ui/primitives';
import { styles as s } from '../ui/styles';
import type useTestLocation from '../useTestLocation';
import { stops } from '../content';

export type Panel = 'help' | 'land' | 'sources' | 'dev' | null;
type Props = {
  panel: Panel;
  height: number;
  insets: { top: number; bottom: number };
  detail: (typeof stops)[number] | undefined;
  geo: ReturnType<typeof useTestLocation>;
  nativeAR: boolean;
  locationControls: React.ReactNode;
  anchorError: string;
  progressError: string;
  onClose: () => void;
  onReposition: () => void;
};
export default function AppPanel({
  panel,
  height,
  insets,
  detail,
  geo,
  nativeAR,
  locationControls,
  anchorError,
  progressError,
  onClose,
  onReposition,
}: Props) {
  return (
    <Modal
      visible={panel !== null}
      transparent
      animationType="fade"
      onRequestClose={() => onClose()}
    >
      <View style={[s.scrim, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <View
          accessibilityViewIsModal
          testID="app-modal"
          style={[s.modal, { maxHeight: height - insets.top - insets.bottom - 32 }]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={s.between}>
              <Text accessibilityRole="header" style={s.modalTitle}>
                {panel === 'dev'
                  ? 'Developer Settings'
                  : panel === 'land'
                    ? 'Indigenous Lands & Living Communities'
                    : panel === 'sources'
                      ? 'Historical Sources'
                      : 'Discover through your lens'}
              </Text>
              <RoundButton icon="close" label="Close panel" onPress={() => onClose()} />
            </View>
            {panel === 'dev' ? (
              <>
                <Text style={s.modalCopy}>
                  Create a Harvard test stop and save a floating marker at global coordinates.
                </Text>
                <Text style={s.note}>
                  Native app build: {Constants.nativeBuildVersion || 'unknown'}
                </Text>
                {progressError && (
                  <Text accessibilityLiveRegion="polite" style={s.modalCopy}>
                    {progressError}
                  </Text>
                )}
                {locationControls}
                {geo.spot && (
                  <View style={s.noteBox}>
                    <Text style={s.eyebrow}>SAVED LOCATION</Text>
                    {geo.spot.placement && (
                      <Text selectable style={s.note}>
                        Marker: {geo.spot.placement.latitude.toFixed(6)},{' '}
                        {geo.spot.placement.longitude.toFixed(6)} ·{' '}
                        {geo.spot.placement.altitude === null
                          ? 'height unavailable; floats at camera height on reopening'
                          : `${geo.spot.placement.altitude.toFixed(1)} m altitude (WGS84)`}{' '}
                        · rotation {geo.spot.placement.rotation.join(', ')} · scale{' '}
                        {geo.spot.placement.scale.join(', ')}
                      </Text>
                    )}
                    {!!anchorError && <Text style={s.modalCopy}>{anchorError}</Text>}
                    <Text selectable style={s.modalCopy}>
                      {geo.spot.latitude.toFixed(6)}, {geo.spot.longitude.toFixed(6)} · 50 m
                      discovery radius
                    </Text>
                    <Text style={s.modalCopy}>
                      Global placement survives app restarts. The marker stays in the AR world as
                      you walk, and returns approximately to its saved coordinates when you reopen.
                      GPS and compass error can shift it.
                    </Text>
                    <Text style={s.modalCopy}>
                      {geo.spot.placement
                        ? 'Position, rotation, and scale are saved for future 3D models. This mode does not require matching the surroundings.'
                        : 'Place the floating marker in AR and tap Save global position. Older cloud anchors are no longer used for this test spot.'}
                    </Text>
                  </View>
                )}
                {nativeAR && <Button title="Reposition AR tile" secondary onPress={onReposition} />}
              </>
            ) : panel === 'land' ? (
              <>
                <Text style={s.modalCopy}>
                  A place to learn about the Tribal Nations connected to this site and the histories
                  they choose to share.
                </Text>
                <View style={s.divider} />
                <Text style={s.body}>
                  History includes the Indigenous peoples whose relationships with this land
                  continue today.
                </Text>
                <Text style={s.body}>
                  HistoryLens could offer a place to learn about the Tribal Nations connected to a
                  site, their ongoing stewardship, and the histories they choose to share.
                </Text>
                <View style={s.noteBox}>
                  <Text style={s.eyebrow}>PROTOTYPE PLACEHOLDER</Text>
                  <Text style={s.modalCopy}>
                    This location is fictional. A site-specific acknowledgment and related content
                    would be developed with the relevant Tribal Nation or Nations.
                  </Text>
                </View>
                <View style={s.noteBox}>
                  <Text style={s.eyebrow}>A FUTURE DIRECTION</Text>
                  <Text style={s.modalCopy}>
                    Explore community-approved resources and stories shared by participating Tribal
                    Nations.
                  </Text>
                </View>
              </>
            ) : panel === 'sources' ? (
              <>
                <Text style={s.modalCopy}>About {detail?.title || 'Battery Point Fort'}</Text>
                <View style={s.divider} />
                <Text style={s.body}>
                  {detail?.story ||
                    'Explore the harbor through objects, buildings, and personal stories.'}
                </Text>
                <View style={s.noteBox}>
                  <Text style={s.eyebrow}>ILLUSTRATIVE CONTENT</Text>
                  <Text style={s.modalCopy}>
                    The locations, people, and events in this prototype are fictional. A full
                    experience would connect each story to verified archival records, photographs,
                    and community contributions.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={s.body}>
                  1. For your Harvard test spot, wait for GPS and compass alignment. Other demo
                  sites use surface tracking.
                </Text>
                <Text style={s.body}>
                  2. The Harvard marker floats in front of you. Save its global position, then tap
                  it to open its story.
                </Text>
                <Text style={s.body}>
                  3. Reconstruct objects, compare past and present, or choose historical layers.
                </Text>
                <View style={s.noteBox}>
                  <Text style={s.modalCopy}>
                    Red tiles mark objects and people. Blue tiles mark structures. The Harvard test
                    marker uses approximate global coordinates. Other demo sites use real surfaces.
                    Use Place marker again to reposition. Expo Go and the demo scene use screen
                    markers.
                  </Text>
                </View>
              </>
            )}
            <Button
              title={panel === 'land' ? 'Return to Site Overview' : 'Continue Exploring'}
              onPress={() => onClose()}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
