import { Pressable, StyleSheet, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type FilterChipProps = {
  label: string;
  onPress: () => void;
  selected?: boolean;
  style?: ViewStyle | ViewStyle[];
};

export function FilterChip({ label, onPress, selected = false, style }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected, style]}>
      <ThemedText style={[styles.text, selected && styles.textSelected]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.1)',
    backgroundColor: 'rgba(255,255,255,0.86)',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipSelected: {
    backgroundColor: '#F3D8CA',
    borderColor: '#B85C38',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    color: '#526171',
  },
  textSelected: {
    color: '#9F4B2B',
  },
});
