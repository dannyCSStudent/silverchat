import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/lib/auth';

export default function PublicLayout() {
  const { emailVerified, initialized, session } = useAuth();

  if (!initialized) {
    return null;
  }

  if (session && emailVerified) {
    return <Redirect href="/(private)/(tabs)" />;
  }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: 'Sign In' }} />
      <Stack.Screen name="signup" options={{ title: 'Create Account' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset Password' }} />
      <Stack.Screen name="verify-email" options={{ title: 'Verify Email' }} />
    </Stack>
  );
}
