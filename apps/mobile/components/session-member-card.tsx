import { ReactNode } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type SessionMember = {
  user_id: string;
  display_name?: string | null;
  country_code?: string | null;
  avatar_url?: string | null;
};

type SessionMemberCardProps = {
  title: string;
  member: SessionMember;
  leading?: ReactNode;
  footer?: ReactNode;
};

export function SessionMemberCard({ title, member, leading, footer }: SessionMemberCardProps) {
  return (
    <ThemedView style={styles.card}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText style={styles.name}>{member.display_name ?? 'Another member'}</ThemedText>
      <ThemedText style={styles.copy}>{member.country_code ?? 'Country not set'}</ThemedText>
      <ThemedText style={styles.meta}>Member id: {member.user_id}</ThemedText>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </ThemedView>
  );
}

const styles = {
  card: { borderRadius: 24, padding: 18, gap: 10 },
  name: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const },
  copy: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
  meta: { fontSize: 13, lineHeight: 18, opacity: 0.56 },
  leading: { alignSelf: 'flex-start' },
  footer: { gap: 6 },
} as const;
