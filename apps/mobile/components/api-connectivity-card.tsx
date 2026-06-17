import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { checkApiConnectivity, type ApiConnectivityResult } from '@/lib/api';
import { mobileEnv } from '@/lib/env';

type ApiConnectivityCardProps = {
  title?: string;
  body?: string;
};

export function ApiConnectivityCard({
  title = 'API connectivity check',
  body = 'This verifies that the current device can reach the configured SilverChat API host before auth or profile requests run.',
}: ApiConnectivityCardProps) {
  const [result, setResult] = useState<ApiConnectivityResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const runCheck = useCallback(async () => {
    setRefreshing(true);
    try {
      setResult(await checkApiConnectivity());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.cardLabel}>{title}</ThemedText>
      <ThemedText style={styles.cardCopy}>{body}</ThemedText>
      <ThemedText style={styles.endpoint}>Host: {mobileEnv.apiBaseUrl}</ThemedText>
      <View style={styles.statusRow}>
        <ThemedText style={[styles.statusValue, result?.ok ? styles.statusOk : styles.statusError]}>
          {result ? (result.ok ? 'Reachable' : 'Unreachable') : 'Checking...'}
        </ThemedText>
        {result?.status ? <ThemedText style={styles.statusMeta}>HTTP {result.status}</ThemedText> : null}
      </View>
      {result ? <ThemedText style={styles.detail}>{result.detail}</ThemedText> : null}
      <Pressable onPress={() => void runCheck()} style={styles.button}>
        <ThemedText style={styles.buttonText}>{refreshing ? 'Checking...' : 'Re-check connection'}</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 18, gap: 10 },
  cardLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.62 },
  cardCopy: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
  endpoint: { fontSize: 13, lineHeight: 18, opacity: 0.7, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusValue: { fontSize: 16, fontWeight: '700' },
  statusMeta: { fontSize: 13, opacity: 0.68 },
  statusOk: { color: '#1F7A61' },
  statusError: { color: '#B74444' },
  detail: { fontSize: 14, lineHeight: 20, opacity: 0.82 },
  button: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#27566B',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: { color: '#FFF8F2', fontWeight: '700' },
});
