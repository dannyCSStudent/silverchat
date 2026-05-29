import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type ReadinessMetric = {
  label: string;
  value: string;
};

type ReadinessMetricListProps = {
  metrics: ReadinessMetric[];
};

export function ReadinessMetricList({ metrics }: ReadinessMetricListProps) {
  return (
    <View style={styles.container}>
      {metrics.map((metric) => (
        <View key={metric.label} style={styles.row}>
          <ThemedText style={styles.label}>{metric.label}</ThemedText>
          <ThemedText style={styles.value}>{metric.value}</ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = {
  container: { gap: 8 },
  row: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: 12 },
  label: { fontSize: 14, lineHeight: 20, opacity: 0.68 },
  value: { fontSize: 14, lineHeight: 20, fontWeight: '700' as const, opacity: 0.82 },
} as const;
