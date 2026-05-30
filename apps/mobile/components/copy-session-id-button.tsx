import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type CopySessionIdButtonProps = {
  sessionId: string;
  label?: string;
};

export function CopySessionIdButton({ sessionId, label = 'Copy session id' }: CopySessionIdButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timeout);
  }, [copied]);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(sessionId);
    setCopied(true);
  }, [sessionId]);

  return (
    <Pressable onPress={() => void handleCopy()} style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : undefined]}>
      <ThemedText style={styles.buttonText}>{copied ? 'Copied session id' : label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.24)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: { color: '#27566B', fontWeight: '700' },
  buttonPressed: { opacity: 0.85 },
});
