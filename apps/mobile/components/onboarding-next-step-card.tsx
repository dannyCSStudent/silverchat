import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { OnboardingNextAction } from '@/lib/onboarding';

type OnboardingNextStepCardProps = {
  action: OnboardingNextAction;
  body: string;
};

export function OnboardingNextStepCard({ action, body }: OnboardingNextStepCardProps) {
  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.cardLabel}>Next step</ThemedText>
      <ThemedText type="subtitle">{action.title}</ThemedText>
      <ThemedText style={styles.cardCopy}>{body}</ThemedText>
      <Link href={action.href} style={styles.secondaryButton}>
        <ThemedText style={styles.secondaryButtonText}>{action.label}</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = {
  card: { borderRadius: 24, padding: 18, gap: 12 },
  cardLabel: { fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 1.2, opacity: 0.62 },
  cardCopy: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.24)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#27566B', fontWeight: '700' as const },
} as const;
