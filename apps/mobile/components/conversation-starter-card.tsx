import { View, StyleSheet } from 'react-native';

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
};

export function ConversationStarterCard({
  memberName,
  countryCode,
  pool,
  sharedTopics,
  contextHint,
  title = 'Conversation starters',
}: ConversationStarterCardProps) {
  const starters = buildConversationStarters({
    memberName,
    countryCode,
    pool,
    sharedTopics,
  });

  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.label}>{title}</ThemedText>
      {contextHint ? <ThemedText style={styles.hint}>{contextHint}</ThemedText> : null}
      <View style={styles.list}>
        {starters.map((starter, index) => (
          <View key={`${starter}-${index}`} style={styles.row}>
            <ThemedText style={styles.bullet}>•</ThemedText>
            <ThemedText style={styles.copy}>{starter}</ThemedText>
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
});
