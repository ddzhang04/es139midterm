import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { icons } from '../icons';
import { styles as s } from './styles';
import { colors as C } from './theme';
type IconName = keyof typeof icons;

export function Icon({ name }: { name: IconName }) {
  return <SvgXml xml={icons[name]} />;
}
export function Button({
  title,
  icon,
  onPress,
  secondary = false,
  compact = false,
  grow = false,
  dark = false,
  disabled = false,
}: {
  title: string;
  icon?: IconName;
  onPress: () => void;
  secondary?: boolean;
  compact?: boolean;
  grow?: boolean;
  dark?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        disabled && { opacity: 0.5 },
        secondary && s.secondary,
        secondary && dark && { backgroundColor: C.glass, borderColor: C.cream },
        compact && s.compact,
        grow && { flex: 1 },
        pressed && s.pressed,
      ]}
    >
      {icon && <Icon name={icon} />}
      <Text
        style={[
          s.buttonText,
          secondary && { color: dark ? C.cream : C.green },
          compact && { fontSize: 12 },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function RoundButton({
  icon,
  label,
  onPress,
  dark = false,
  selected = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  dark?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        s.round,
        dark && s.darkRound,
        selected && { backgroundColor: C.sand },
        pressed && s.pressed,
      ]}
    >
      <Icon name={icon} />
    </Pressable>
  );
}
export function Header({
  title,
  back,
  action,
  developer,
  dark = false,
}: {
  title: string;
  back: () => void;
  action?: React.ReactNode;
  developer?: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <View style={s.header}>
      <RoundButton icon={dark ? 'backLight' : 'back'} label="Go back" onPress={back} dark={dark} />
      <Text accessibilityRole="header" style={[s.headerTitle, dark && { color: 'white' }]}>
        {title}
      </Text>
      <View style={s.headerActions}>
        {action}
        {developer}
      </View>
    </View>
  );
}
export function Tag({ children, amber = false }: { children: React.ReactNode; amber?: boolean }) {
  return (
    <View style={[s.tag, amber && { backgroundColor: C.amber }]}>
      <Text style={[s.tagText, amber && { color: C.green }]}>{children}</Text>
    </View>
  );
}
