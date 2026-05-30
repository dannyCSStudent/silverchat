import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { buildConversationStarters } from '@/lib/conversation-starters';

type ConversationStarterCardProps = {
  memberName?: string | null;
  countryCode?: string | null;
  pool?: 'preferred' | 'fallback' | 'queue' | null;
  sharedTopics?: string[];
  contextHint?: string | null;
  title?: string;
  copyLabel?: string;
};

export function ConversationStarterCard({
  memberName,
  countryCode,
  pool,
  sharedTopics,
  contextHint,
  title = 'Conversation starters',
  copyLabel = 'Copy',
}: ConversationStarterCardProps) {
  const starters = buildConversationStarters({
    memberName,
    countryCode,
    pool,
    sharedTopics,
  });
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (copiedIndex === null) {
      return;
    }

    const timeout = setTimeout(() => {
      setCopiedIndex(null);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [copiedIndex]);

  async function handleCopy(starter: string, index: number) {
    await Clipboard.setStringAsync(starter);
    setCopiedIndex(index);
  }

  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.label}>{title}</ThemedText>
      {contextHint ? <ThemedText style={styles.hint}>{contextHint}</ThemedText> : null}
      <View style={styles.list}>
        {starters.map((starter, index) => (
          <View key={`${starter}-${index}`} style={styles.row}>
            <ThemedText style={styles.bullet}>•</ThemedText>
            <ThemedText style={styles.copy}>{starter}</ThemedText>
            <Pressable
              onPress={() => void handleCopy(starter, index)}
              style={({ pressed }) => [styles.copyButton, pressed ? styles.copyButtonPressed : undefined]}
            >
              <ThemedText style={styles.copyButtonText}>
                {copiedIndex === index ? 'Copied' : copyLabel}
              </ThemedText>
            </Pressable>
          </View>
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 18, gap: 10 },
  label: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.62 },
  hint: { fontSize: 14, lineHeight: 20, opacity: 0.75 },
  list: { gap: 10 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: { width: 12, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  copy: { flex: 1, fontSize: 15, lineHeight: 22, opacity: 0.82 },
  copyButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  copyButtonPressed: {
    backgroundColor: 'rgba(39,86,107,0.08)',
  },
  copyButtonText: {
    color: '#27566B',
    fontSize: 12,
    fontWeight: '700',
  },
});
