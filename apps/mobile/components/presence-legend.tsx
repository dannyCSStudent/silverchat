import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export function PresenceLegend() {
  return (
    <View style={styles.container}>
      <LegendItem color="#1F7A61" label="Online" hint="Recently active" />
      <LegendItem color="#B74444" label="Away" hint="App backgrounded" />
      <LegendItem color="#64748B" label="Offline" hint="Not currently active" />
    </View>
  );
}

function LegendItem({
  color,
  label,
  hint,
}: {
  color: string;
  label: string;
  hint: string;
}) {
  return (
    <View style={styles.item}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.copy}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        <ThemedText style={styles.hint}>{hint}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  copy: { gap: 1 },
  label: { fontSize: 13, fontWeight: '700', color: '#27566B' },
  hint: { fontSize: 12, lineHeight: 16, opacity: 0.62 },
});
