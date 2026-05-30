import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { authorizedApiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type PresenceRecord = {
  user_id: string;
  status: 'online' | 'away' | 'offline';
  last_seen_at: string;
  updated_at?: string | null;
};

type MemberPresenceBadgeProps = {
  userId: string;
};

function formatPresenceLabel(status: PresenceRecord['status']) {
  if (status === 'online') {
    return 'Online';
  }

  if (status === 'away') {
    return 'Away';
  }

  return 'Offline';
}

export function MemberPresenceBadge({ userId }: MemberPresenceBadgeProps) {
  const { session } = useAuth();
  const [presence, setPresence] = useState<PresenceRecord | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPresence() {
      if (!session || !userId) {
        setPresence(null);
        return;
      }

      try {
        const response = await authorizedApiRequest<PresenceRecord | null>(session, `/presence/${userId}`);
        if (active) {
          setPresence(response);
        }
      } catch {
        if (active) {
          setPresence(null);
        }
      }
    }

    void loadPresence();

    return () => {
      active = false;
    };
  }, [session, userId]);

  if (!presence) {
    return null;
  }

  return (
    <View style={styles.badge}>
      <View
        style={[
          styles.dot,
          presence.status === 'online'
            ? styles.dotOnline
            : presence.status === 'away'
              ? styles.dotAway
              : styles.dotOffline,
        ]}
      />
      <ThemedText style={styles.text}>{formatPresenceLabel(presence.status)}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(39,86,107,0.08)',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOnline: { backgroundColor: '#1F7A61' },
  dotAway: { backgroundColor: '#B74444' },
  dotOffline: { backgroundColor: '#64748B' },
  text: { fontSize: 12, fontWeight: '700', color: '#27566B' },
});
