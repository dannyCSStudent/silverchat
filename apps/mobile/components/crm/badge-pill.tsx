import { StyleSheet, TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type BadgePillProps = {
  children: string;
  style?: TextStyle | TextStyle[];
};

export function BadgePill({ children, style }: BadgePillProps) {
  return <ThemedText style={[styles.badge, style]}>{children}</ThemedText>;
}

const styles = StyleSheet.create({
  badge: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '600',
  },
});
