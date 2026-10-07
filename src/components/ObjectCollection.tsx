import React, { useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, RoundButton } from '../ui/primitives';
import { styles as s } from '../ui/styles';
import { colors as C } from '../ui/theme';
import { objectStory, type ObjectId } from '../objectScanning';
import StorySources from './StorySources';

export default function ObjectCollection({
  ids,
  error,
  onClose,
}: {
  ids: ObjectId[];
  error: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<ObjectId | null>(null);
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: C.cream,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <View style={[s.between, { padding: 20 }]}>
          <Text accessibilityRole="header" style={s.modalTitle}>
            My collection
          </Text>
          <RoundButton icon="close" label="Close collection" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
          <Text style={s.body}>
            {ids.length
              ? `${ids.length} discoveries collected`
              : 'Your discoveries start here. Open AR, aim at an object, and scan it to add it to your collection.'}
          </Text>
          {!!error && (
            <Text accessibilityRole="alert" style={s.note}>
              {error}
            </Text>
          )}
          {ids.map((id) => {
            const story = objectStory(id)!;
            return (
              <View key={id} style={s.noteBox}>
                <Text style={s.eyebrow}>
                  {story.category} · {story.year}
                </Text>
                <Text style={s.modalTitle}>{story.title}</Text>
                <Text style={s.body}>{story.description}</Text>
                {expanded === id && (
                  <>
                    <Text style={s.body}>{story.story}</Text>
                    {!!story.sources?.length && <StorySources sources={story.sources} />}
                  </>
                )}
                <Button
                  secondary
                  title={expanded === id ? 'Show less' : `Read ${story.title}`}
                  onPress={() => setExpanded(expanded === id ? null : id)}
                />
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
