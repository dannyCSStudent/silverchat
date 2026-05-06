import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  resolvedColorScheme: 'light' | 'dark';
  setPreference: (preference: ThemePreference) => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);
const STORAGE_KEY = 'northstar-mobile-theme-preference';

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const nativeColorScheme = useNativeColorScheme() ?? 'light';
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    let mounted = true;

    async function loadPreference() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);

        if (!mounted || !stored) {
          return;
        }

        if (stored === 'system' || stored === 'light' || stored === 'dark') {
          setPreference(stored);
        }
      } catch {
        // Ignore storage failures and fall back to system mode.
      }
    }

    void loadPreference();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void AsyncStorage.setItem(STORAGE_KEY, preference).catch(() => {
      // Ignore storage failures and keep the in-memory preference active.
    });
  }, [preference]);

  const value = useMemo<ThemePreferenceContextValue>(
    () => ({
      preference,
      resolvedColorScheme: preference === 'system' ? nativeColorScheme : preference,
      setPreference,
    }),
    [nativeColorScheme, preference],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  return useContext(ThemePreferenceContext);
}
