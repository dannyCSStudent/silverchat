import { Link, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ReadinessMetricList } from '@/components/readiness-metric-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type MatchmakingAvailabilityCardProps = {
  body: string;
  metrics?: Array<{ label: string; value: string }>;
  title?: string;
  heading?: string;
  actionHref?: Href;
  actionLabel?: string;
};

export function MatchmakingAvailabilityCard({
  body,
  metrics,
  title = 'Matchmaking paused',
  heading = 'You are hidden from the queue',
  actionHref = '/(private)/preferences',
  actionLabel = 'Open preferences',
}: MatchmakingAvailabilityCardProps) {
  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.label}>{title}</ThemedText>
      <ThemedText type="subtitle">{heading}</ThemedText>
      <ThemedText style={styles.copy}>{body}</ThemedText>
      {metrics?.length ? <ReadinessMetricList metrics={metrics} /> : null}
      <Link href={actionHref} style={styles.button}>
        <ThemedText style={styles.buttonText}>{actionLabel}</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.18)',
    backgroundColor: 'rgba(39,86,107,0.06)',
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  label: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#27566B' },
  copy: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
  button: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.24)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  buttonText: { color: '#27566B', fontWeight: '700' },
});
