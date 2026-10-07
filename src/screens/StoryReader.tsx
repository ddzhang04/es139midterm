import React from 'react';
import { Modal, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StoryStop } from '../content';
import { Button, RoundButton } from '../ui/primitives';
import { colors as C } from '../ui/theme';
import StorySources from '../components/StorySources';

export default function StoryReader({
  detail,
  speaking,
  onListen,
  onClose,
}: {
  detail: StoryStop;
  speaking: boolean;
  onListen: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" />
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Full story</Text>
          <RoundButton icon="close" label="Return to AR" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.category}>
            {detail.category.toUpperCase()} · {detail.year}
          </Text>
          <Text accessibilityRole="header" style={styles.title}>
            {detail.title}
          </Text>
          <Text selectable style={styles.summary}>
            {detail.description}
          </Text>
          <Text selectable style={styles.body}>
            {detail.story}
          </Text>
          {!!detail.sources?.length && <StorySources sources={detail.sources} />}
          <Button title={speaking ? 'Stop listening' : 'Listen to story'} onPress={onListen} />
          <Button title="Return to AR" secondary onPress={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerText: { flex: 1, fontSize: 18, color: C.green, fontFamily: 'Inter_700Bold' },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    padding: 24,
    gap: 24,
    paddingBottom: 40,
  },
  category: { color: C.green, fontSize: 13, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  title: { color: C.green, fontSize: 32, fontFamily: 'Inter_700Bold' },
  summary: { color: C.green, fontSize: 20, lineHeight: 30, fontFamily: 'Inter_600SemiBold' },
  body: { color: C.green, fontSize: 19, lineHeight: 30, fontFamily: 'Inter_400Regular' },
});
