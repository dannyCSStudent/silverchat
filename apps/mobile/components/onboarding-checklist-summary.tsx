import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type OnboardingChecklistItem = {
  complete: boolean;
  id: string;
  label: string;
};

type OnboardingChecklistSummaryProps = {
  items: OnboardingChecklistItem[];
};

export function OnboardingChecklistSummary({ items }: OnboardingChecklistSummaryProps) {
  const completedCount = items.filter((item) => item.complete).length;
  const remainingCount = items.length - completedCount;
  const nextIncomplete = items.find((item) => !item.complete);

  return (
    <View style={styles.container}>
      <ThemedText style={styles.summary}>
        {completedCount} of {items.length} complete
      </ThemedText>
      {nextIncomplete ? (
        <ThemedText style={styles.nextStep}>Next step: {nextIncomplete.label}</ThemedText>
      ) : (
        <ThemedText style={styles.completeStep}>All onboarding steps complete</ThemedText>
      )}
      <ThemedText style={styles.detail}>
        {remainingCount > 0 ? `${remainingCount} item${remainingCount === 1 ? '' : 's'} remaining` : 'Ready for matchmaking'}
      </ThemedText>
      {items.map((item) => (
        <ThemedText key={item.id} style={styles.item}>
          {item.complete ? 'Complete' : 'Pending'}: {item.label}
        </ThemedText>
      ))}
    </View>
  );
}

const styles = {
  container: { gap: 4 },
  nextStep: { fontSize: 13, lineHeight: 20, fontWeight: '700' as const, opacity: 0.75 },
  completeStep: { fontSize: 13, lineHeight: 20, fontWeight: '700' as const, opacity: 0.78 },
  detail: { fontSize: 12, lineHeight: 18, opacity: 0.66 },
  summary: { fontSize: 13, lineHeight: 20, fontWeight: '700' as const, opacity: 0.8 },
  item: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
} as const;
