import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemePreferenceProvider } from '@/lib/theme-preference';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <ThemedRootLayout />
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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: 'Quick Actions' }}
        />
        <Stack.Screen
          name="actions/client"
          options={{ presentation: 'modal', title: 'Create Client' }}
        />
        <Stack.Screen
          name="actions/activity"
          options={{ presentation: 'modal', title: 'Log Activity' }}
        />
        <Stack.Screen
          name="actions/tags"
          options={{ presentation: 'modal', title: 'Manage Tags' }}
        />
        <Stack.Screen name="client/[id]" options={{ title: 'Details' }} />
        <Stack.Screen name="preferences" options={{ title: 'Preferences' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
