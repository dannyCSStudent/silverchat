import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/lib/auth';

export default function PrivateLayout() {
  const { emailVerified, initialized, session } = useAuth();

  if (!initialized) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(public)/login" />;
  }

  if (!emailVerified) {
    return <Redirect href="/(public)/verify-email" />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="preferences" options={{ title: 'Preferences' }} />
    </Stack>
  );
}
