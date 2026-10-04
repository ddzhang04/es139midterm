import React from 'react';
import { Switch, Text, View } from 'react-native';
import { layers, type LayerId } from '../content';
import { Icon, RoundButton } from '../ui/primitives';
import { styles as s } from '../ui/styles';
import { colors as C } from '../ui/theme';
type Props = {
  enabled: Record<LayerId, boolean>;
  onClose: () => void;
  onChange: (id: LayerId, value: boolean) => void;
};
export default function HistoricalLayers({ enabled, onClose, onChange }: Props) {
  return (
    <View style={s.layerPanel}>
      <View style={s.between}>
        <View style={{ flex: 1 }}>
          <Text style={s.panelTitle}>Layers</Text>
          <Text style={s.factLabel}>Choose what appears in this place</Text>
        </View>
        <RoundButton icon="close" label="Close layers" onPress={onClose} />
      </View>
      {layers.map((layer) => (
        <View key={layer.id} style={s.layerRow}>
          <View style={s.layerIcon}>
            <Icon name={layer.icon} />
          </View>
          <Text style={s.layerText}>{layer.label}</Text>
          <Switch
            accessibilityLabel={layer.label}
            value={enabled[layer.id]}
            onValueChange={(value) => onChange(layer.id, value)}
            trackColor={{ false: C.line, true: C.green }}
            thumbColor="white"
          />
        </View>
      ))}
    </View>
  );
}
