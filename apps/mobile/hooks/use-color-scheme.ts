import { useColorScheme as useNativeColorScheme } from 'react-native';

import { useThemePreference } from '@/lib/theme-preference';

export function useColorScheme() {
  const preference = useThemePreference();
  const nativeColorScheme = useNativeColorScheme() ?? 'light';

  if (preference) {
    return preference.resolvedColorScheme;
  }

  return nativeColorScheme;
}
