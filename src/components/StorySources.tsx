import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import type { StoryStop } from '../content';
import { styles as s } from '../ui/styles';

export default function StorySources({ sources }: { sources: NonNullable<StoryStop['sources']> }) {
  const [error, setError] = useState('');
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.eyebrow}>SOURCES</Text>
      {sources.map((source) => (
        <Pressable
          key={source.url}
          accessibilityRole="link"
          onPress={() => {
            setError('');
            void Linking.openURL(source.url).catch(() =>
              setError('Could not open the source. Please try again.'),
            );
          }}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={s.textLink}>{source.title} ↗</Text>
        </Pressable>
      ))}
      {!!error && (
        <Text accessibilityRole="alert" style={s.note}>
          {error}
        </Text>
      )}
    </View>
  );
}
