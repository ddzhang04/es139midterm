import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { stops } from '../content';
import { Button, RoundButton } from '../ui/primitives';
import { colors as C } from '../ui/theme';

type Props = {
  detail: (typeof stops)[number];
  speaking: boolean;
  covered: boolean;
  onClose: () => void;
  onListen: () => void;
  onSources: () => void;
};

// Cover exploration without unmounting its native AR session. Returning to the
// camera keeps the existing world-space placement and tracking origin.
export default function StoryInfoScreen({
  detail,
  speaking,
  covered,
  onClose,
  onListen,
  onSources,
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="story-info-screen"
      accessibilityViewIsModal={!covered}
      accessibilityElementsHidden={covered}
      importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}
      style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <RoundButton icon="back" label="Close detail" onPress={onClose} />
        <Text style={styles.headerLabel}>Location story</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView testID="story-info-content" contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <View style={[styles.badge, { backgroundColor: detail.color }]}>
            <Text style={styles.badgeText}>
              {detail.category} · {detail.year}
            </Text>
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {detail.title}
          </Text>
          <Text style={styles.summary}>{detail.description}</Text>
        </View>
        <View style={styles.story}>
          <Text style={styles.sectionLabel}>THE STORY</Text>
          <Text style={styles.body}>{detail.story}</Text>
        </View>
        <View style={styles.actions}>
          <Button
            title={speaking ? 'Stop listening' : 'Listen to Story'}
            icon="headphones"
            onPress={onListen}
          />
          <Button title="View Sources" secondary onPress={onSources} />
          <Button title="Continue Exploring" secondary icon="compass" onPress={onClose} />
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: C.cream,
    zIndex: 20,
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLabel: {
    flex: 1,
    textAlign: 'center',
    color: C.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  content: { padding: 24, paddingTop: 20, gap: 28, flexGrow: 1 },
  intro: { gap: 16 },
  badge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: { color: 'white', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  title: { color: C.ink, fontFamily: 'Inter_700Bold', fontSize: 30 },
  summary: { color: C.muted, fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 25 },
  story: { backgroundColor: 'white', borderRadius: 20, padding: 20, gap: 12 },
  sectionLabel: { color: C.green, fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1 },
  body: { color: C.ink, fontFamily: 'Inter_400Regular', fontSize: 17, lineHeight: 28 },
  actions: { gap: 12, marginTop: 'auto' },
});
