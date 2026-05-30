import { Link, type Href } from 'expo-router';
import { View, StyleSheet } from 'react-native';

import { CopySessionIdButton } from '@/components/copy-session-id-button';
import { ThemedText } from '@/components/themed-text';

type SessionCardActionsProps = {
  sessionId: string;
  openHref?: string | null;
  openLabel?: string;
};

export function SessionCardActions({
  sessionId,
  openHref,
  openLabel = 'Open session detail',
}: SessionCardActionsProps) {
  return (
    <View style={styles.row}>
      {openHref ? (
        <Link href={openHref as Href} style={styles.link}>
          <ThemedText style={styles.linkText}>{openLabel}</ThemedText>
        </Link>
      ) : null}
      <CopySessionIdButton sessionId={sessionId} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  link: {
    alignSelf: 'flex-start',
    paddingTop: 4,
  },
  linkText: { color: '#27566B', fontWeight: '700' },
});
