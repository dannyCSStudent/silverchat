import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

type PreferencesLinkProps = {
  compact?: boolean;
};

export function PreferencesLink({ compact = false }: PreferencesLinkProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  return (
    <Link
      href="/preferences"
      style={[styles.link, isDark && styles.linkDark, compact && styles.linkCompact]}>
      <ThemedText style={[styles.linkText, isDark && styles.linkTextDark]}>Preferences</ThemedText>
    </Link>
  );
}

const styles = StyleSheet.create({
  link: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.08)',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  linkDark: {
    borderColor: 'rgba(244,237,228,0.08)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  linkCompact: {
    paddingHorizontal: 10,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18212B',
    textTransform: 'uppercase',
  },
  linkTextDark: {
    color: '#F7F1E8',
  },
});
