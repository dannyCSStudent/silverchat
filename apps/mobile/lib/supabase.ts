import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { getMobileEnvError, mobileEnv } from '@/lib/env';

const envError = getMobileEnvError();

/**
 * Cross-platform storage adapter:
 *
 * Native (iOS/Android):
 * - uses AsyncStorage
 *
 * Web:
 * - uses browser localStorage
 *
 * Prevents "window is not defined" crashes during web bundling.
 */
const storage =
  Platform.OS === 'web'
    ? {
        getItem: (key: string) =>
          Promise.resolve(
            typeof window !== 'undefined'
              ? window.localStorage.getItem(key)
              : null,
          ),

        setItem: (key: string, value: string) => {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, value);
          }
          return Promise.resolve();
        },

        removeItem: (key: string) => {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(key);
          }
          return Promise.resolve();
        },
      }
    : AsyncStorage;

export const supabase = createClient(
  mobileEnv.supabaseUrl || 'https://placeholder.supabase.co',
  mobileEnv.supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: Platform.OS === 'web',
      persistSession: true,
      storage,
    },
  },
);

export { envError as supabaseEnvError };