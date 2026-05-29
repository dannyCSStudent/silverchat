import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type OnboardingPathPreviewProps = {
  activeIndex?: number;
  body: string;
  steps: string[];
  title: string;
};

export function OnboardingPathPreview({
  activeIndex = -1,
  body,
  steps,
  title,
}: OnboardingPathPreviewProps) {
  return (
    <View style={styles.card}>
      <ThemedText style={styles.label}>Onboarding path</ThemedText>
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText style={styles.body}>{body}</ThemedText>
      <View style={styles.list}>
        {steps.map((step, index) => {
          const isActive = index === activeIndex;
          const isComplete = activeIndex > index;

          return (
            <View key={step} style={[styles.stepRow, isActive && styles.stepRowActive]}>
              <View style={[styles.dot, isComplete && styles.dotComplete, isActive && styles.dotActive]} />
              <ThemedText style={[styles.stepText, isActive && styles.stepTextActive]}>{step}</ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = {
  body: { fontSize: 14, lineHeight: 20, opacity: 0.8 },
  card: { borderRadius: 24, padding: 18, gap: 12 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(39,86,107,0.24)',
    marginTop: 4,
  },
  dotActive: { backgroundColor: '#1F7A61' },
  dotComplete: { backgroundColor: '#8DA5B5' },
  label: { fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 1.2, opacity: 0.62 },
  list: { gap: 10 },
  stepRow: { flexDirection: 'row' as const, gap: 10, alignItems: 'flex-start' as const },
  stepRowActive: { },
  stepText: { fontSize: 14, lineHeight: 20, opacity: 0.78 },
  stepTextActive: { fontWeight: '700' as const, color: '#1F7A61', opacity: 1 },
} as const;
