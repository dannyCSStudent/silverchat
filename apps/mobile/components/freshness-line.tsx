import { ThemedText } from '@/components/themed-text';
import { formatRelativeAge } from '@repo/types';

type FreshnessLineProps = {
  prefix?: string;
  timestamp: string | null | undefined;
};

export function FreshnessLine({ prefix, timestamp }: FreshnessLineProps) {
  const value = formatRelativeAge(timestamp);

  if (!value) {
    return null;
  }

  return <ThemedText style={styles.text}>{prefix ? `${prefix}: ${value}` : `Updated ${value}`}</ThemedText>;
}

const styles = {
  text: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
} as const;
