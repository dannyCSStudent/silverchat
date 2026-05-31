import { Link, type Href } from 'expo-router';
import { View, StyleSheet } from 'react-native';

import { CopySessionIdButton } from '@/components/copy-session-id-button';
import { ThemedText } from '@/components/themed-text';

type SessionCardActionsProps = {
  sessionId: string;
  showOpenLink?: boolean;
  openLabel?: string;
  callHref?: Href | null;
  callLabel?: string;
};

export function SessionCardActions({
  sessionId,
  showOpenLink = true,
  openLabel = 'Open session detail',
  callHref = null,
  callLabel = 'Start call',
}: SessionCardActionsProps) {
  const openHref = showOpenLink ? `/(private)/sessions/${sessionId}` : null;

  return (
    <View style={styles.row}>
      {openHref ? (
        <Link href={openHref as Href} style={styles.link}>
          <ThemedText style={styles.linkText}>{openLabel}</ThemedText>
        </Link>
      ) : null}
      {callHref ? (
        <Link href={callHref} style={styles.link}>
          <ThemedText style={styles.linkText}>{callLabel}</ThemedText>
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
