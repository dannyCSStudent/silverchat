import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type FlowStepChipListProps = {
  accentColor: string;
  label?: string;
  labelStyle?: StyleProp<TextStyle>;
  steps: string[];
};

export function FlowStepChipList({
  accentColor,
  label = 'Flow step',
  labelStyle,
  steps,
}: FlowStepChipListProps) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <>
      <ThemedText style={[styles.label, labelStyle]}>{label}</ThemedText>
      <View style={styles.list}>
        {steps.map((step) => (
          <View key={step} style={styles.chip}>
            <ThemedText style={[styles.text, { color: accentColor }]}>{step}</ThemedText>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    opacity: 0.68,
    textTransform: 'uppercase',
  },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  text: { fontSize: 13, fontWeight: '700' },
});
