import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FreshnessLine } from '@/components/freshness-line';
import { ReadinessMetricList } from '@/components/readiness-metric-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { MatchSessionAnalyticsResponse } from '@/lib/match-sessions';

type SessionHistoryReportCardProps = {
  analytics: MatchSessionAnalyticsResponse;
};

function formatSessionLength(minutes: number | null | undefined) {
  if (minutes == null) {
    return '—';
  }

  return minutes === 1 ? 'About 1 minute' : `${minutes} minutes`;
}

function formatActivityDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`));
}

function buildReportText(analytics: MatchSessionAnalyticsResponse) {
  const activityLines = analytics.recent_activity
    .map((bucket) => `${formatActivityDate(bucket.date)}: ${bucket.count}`)
    .join('\n');

  return [
    'SilverChat session history report',
    `Generated: ${analytics.generated_at}`,
    `Total sessions: ${analytics.total_sessions}`,
    `Initiated: ${analytics.initiated_count}`,
    `Received: ${analytics.received_count}`,
    `Matched: ${analytics.matched_count}`,
    `Ended: ${analytics.ended_count}`,
    `Average length: ${formatSessionLength(analytics.average_length_minutes)}`,
    `Longest: ${formatSessionLength(analytics.longest_length_minutes)}`,
    'Recent activity:',
    activityLines || 'No activity in the current window.',
  ].join('\n');
}

export function SessionHistoryReportCard({ analytics }: SessionHistoryReportCardProps) {
  const [copied, setCopied] = useState(false);
  const reportText = useMemo(() => buildReportText(analytics), [analytics]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <ThemedView style={styles.card}>
      <View style={styles.headerRow}>
        <ThemedText type="subtitle">Session report</ThemedText>
        <Pressable onPress={() => void handleCopy()} style={({ pressed }) => [styles.copyButton, pressed ? styles.pressed : undefined]}>
          <ThemedText style={styles.copyButtonText}>{copied ? 'Copied report' : 'Copy report'}</ThemedText>
        </Pressable>
      </View>

      <FreshnessLine prefix="Summary updated" timestamp={analytics.generated_at} />
      <ThemedText style={styles.copy}>
        Copy a concise history report with totals, duration, and recent activity for the current window.
      </ThemedText>
      <ReadinessMetricList
        metrics={[
          { label: 'Total sessions', value: String(analytics.total_sessions) },
          { label: 'Matched', value: String(analytics.matched_count) },
          { label: 'Ended', value: String(analytics.ended_count) },
          { label: 'Avg length', value: formatSessionLength(analytics.average_length_minutes) },
        ]}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 18, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  copy: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
  copyButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.24)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  copyButtonText: { color: '#27566B', fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.85 },
});
