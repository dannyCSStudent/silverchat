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
  return (
    <>
      {items.map((item) => (
        <ThemedText key={item.id} style={styles.item}>
          {item.complete ? 'Complete' : 'Pending'}: {item.label}
        </ThemedText>
      ))}
    </>
  );
}

const styles = {
  item: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
} as const;
