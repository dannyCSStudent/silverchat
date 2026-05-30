import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { FreshnessLine } from '@/components/freshness-line';
import { ReadinessMetricList } from '@/components/readiness-metric-list';
import { PresenceLegend } from '@/components/presence-legend';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { authorizedApiRequest } from '@/lib/api';
import type { MatchSessionAnalyticsResponse } from '@/lib/match-sessions';

type SessionHistoryReportCardProps = {
  analytics: MatchSessionAnalyticsResponse;
  session: Session | null;
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

type MatchSessionAnalyticsExportResponse = {
  generated_at: string;
  filename: string;
  csv: string;
};

export function SessionHistoryReportCard({ analytics, session }: SessionHistoryReportCardProps) {
  const [copied, setCopied] = useState(false);
  const [copyingCsv, setCopyingCsv] = useState(false);
  const [csvCopied, setCsvCopied] = useState(false);
  const reportText = useMemo(() => buildReportText(analytics), [analytics]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleCopyCsv = async () => {
    if (!session) {
      return;
    }

    setCopyingCsv(true);
    try {
      const exportSnapshot = await authorizedApiRequest<MatchSessionAnalyticsExportResponse>(
        session,
        '/match/sessions/summary/export',
      );
      await Clipboard.setStringAsync(exportSnapshot.csv);
      setCsvCopied(true);
      setTimeout(() => setCsvCopied(false), 1800);
    } finally {
      setCopyingCsv(false);
    }
  };

  return (
    <ThemedView style={styles.card}>
      <View style={styles.headerRow}>
        <ThemedText type="subtitle">Session report</ThemedText>
        <View style={styles.actionRow}>
          <Pressable onPress={() => void handleCopy()} style={({ pressed }) => [styles.copyButton, pressed ? styles.pressed : undefined]}>
            <ThemedText style={styles.copyButtonText}>{copied ? 'Copied report' : 'Copy report'}</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => void handleCopyCsv()}
            style={({ pressed }) => [styles.copyButton, pressed ? styles.pressed : undefined, copyingCsv ? styles.copyButtonActive : undefined]}
            disabled={!session || copyingCsv}
          >
            <ThemedText style={styles.copyButtonText}>
              {csvCopied ? 'Copied CSV' : copyingCsv ? 'Copying CSV...' : 'Copy CSV'}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <FreshnessLine prefix="Summary updated" timestamp={analytics.generated_at} />
      <ThemedText style={styles.copy}>
        Copy a concise history report with totals, duration, and recent activity for the current window.
      </ThemedText>
      <PresenceLegend />
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
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
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
  copyButtonActive: { borderColor: 'rgba(39,86,107,0.4)' },
});
