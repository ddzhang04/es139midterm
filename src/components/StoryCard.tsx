import React from 'react';
import { Text, View } from 'react-native';
import { stops } from '../content';
import { Button, RoundButton } from '../ui/primitives';
import { styles as s } from '../ui/styles';
type Props = {
  detail: (typeof stops)[number];
  speaking: boolean;
  stackActions: boolean;
  onClose: () => void;
  onListen: () => void;
  onSources: () => void;
};
export default function StoryCard({
  detail,
  speaking,
  stackActions,
  onClose,
  onListen,
  onSources,
}: Props) {
  return (
    <View style={s.detailCard}>
      <View style={s.handle} />
      <View style={s.between}>
        <View style={{ flex: 1 }}>
          <Text style={s.detailCategory}>
            {detail.category.toUpperCase()} · {detail.year}
          </Text>
          <Text accessibilityRole="header" style={s.detailTitle}>
            {detail.title}
          </Text>
        </View>
        <RoundButton icon="close" label="Close detail" onPress={onClose} />
      </View>
      <Text style={s.detailBody}>{detail.description}</Text>
      <Button
        compact
        title={speaking ? 'Stop listening' : 'Listen to Story'}
        icon="headphones"
        onPress={onListen}
      />
      <View style={[s.detailActions, stackActions && { flexDirection: 'column' }]}>
        <Button compact grow={!stackActions} title="View Sources" secondary onPress={onSources} />
        <Button
          compact
          grow={!stackActions}
          title="Continue Exploring"
          secondary
          onPress={onClose}
        />
      </View>
    </View>
  );
}
