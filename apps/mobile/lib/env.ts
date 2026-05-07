const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ??
  process.env.EXPO_PUBLIC_API_URL?.trim() ??
  'http://127.0.0.1:8001';
const avatarBucket = process.env.EXPO_PUBLIC_SUPABASE_AVATAR_BUCKET?.trim() ?? 'avatars';

export const mobileEnv = {
  apiBaseUrl,
  avatarBucket,
  supabaseAnonKey,
  supabaseUrl,
};

export function getMobileEnvError() {
  if (!supabaseUrl) {
    return 'Missing EXPO_PUBLIC_SUPABASE_URL in apps/mobile/.env.';
  }

  if (!supabaseAnonKey) {
    return 'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env.';
  }

  return null;
}
