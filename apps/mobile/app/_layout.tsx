import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/lib/auth';
import { ThemePreferenceProvider } from '@/lib/theme-preference';

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <AuthProvider>
        <ThemedRootLayout />
      </AuthProvider>
    </ThemePreferenceProvider>
  );
}

function ThemedRootLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: isDark ? '#18212B' : '#FFF8F2' },
          headerTintColor: isDark ? '#F7F1E8' : '#18212B',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}>
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
        <Stack.Screen name="(private)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
