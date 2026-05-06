import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FilterChip } from '@/components/crm/filter-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import {
  Client,
  ClientInteractionType,
  interactionOptions,
} from '@/lib/crm';
import { useColorScheme } from '@/hooks/use-color-scheme';

type QuickActivityFormProps = {
  clients?: Client[];
  selectedClientId?: string;
  onSelectClient?: (clientId: string) => void;
  onSubmit: (payload: {
    interactionType: ClientInteractionType;
    notes: string;
  }) => Promise<boolean>;
  isFallback: boolean;
  isPending: boolean;
  buttonLabel?: string;
  buttonPendingLabel?: string;
};

export function QuickActivityForm({
  clients,
  selectedClientId,
  onSelectClient,
  onSubmit,
  isFallback,
  isPending,
  buttonLabel = 'Log activity',
  buttonPendingLabel = 'Logging...',
}: QuickActivityFormProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const [interactionType, setInteractionType] = useState<ClientInteractionType>('note');
  const [notes, setNotes] = useState('');

  const selectedClientName = useMemo(
    () =>
      clients?.find((client) => client.id === selectedClientId)?.name ??
      (selectedClientId ? 'Selected client' : 'Select a client'),
    [clients, selectedClientId],
  );

  const canSubmit = !!notes.trim() && !isFallback && !isPending && (!clients || !!selectedClientId);

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    const trimmed = notes.trim();
    const success = await onSubmit({ interactionType, notes: trimmed });

    if (success) {
      setNotes('');
    }
  };

  return (
    <ThemedView style={[styles.section, isDark && styles.sectionDark]}>
      <ThemedText style={styles.sectionLabel}>Timeline</ThemedText>
      <ThemedText type="subtitle">Quick activity</ThemedText>
      {clients ? (
        <View style={styles.chipRow}>
          {clients.map((client) => (
            <FilterChip
              key={client.id}
              label={client.name}
              onPress={() => onSelectClient?.(client.id)}
              selected={client.id === selectedClientId}
            />
          ))}
        </View>
      ) : (
        <ThemedText style={styles.detailMuted}>Selected client: {selectedClientName}</ThemedText>
      )}
      <View style={styles.chipRow}>
        {interactionOptions.map((option) => (
          <Pressable
            key={option}
            onPress={() => setInteractionType(option)}
            disabled={isFallback || isPending}
            style={[
              styles.actionChip,
              isDark && styles.actionChipDark,
              interactionType === option && styles.quickActionSelected,
            ]}>
            <ThemedText
              style={[
                styles.actionChipText,
                interactionType === option && styles.quickActionSelectedText,
              ]}>
              {option.replace('_', ' ')}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Add a quick follow-up note"
        placeholderTextColor="#94A3B8"
        editable={!isFallback && !isPending}
        multiline
        style={[
          styles.activityInput,
          {
            color: colors.text,
            borderColor: colorScheme === 'dark' ? '#334155' : 'rgba(24,33,43,0.1)',
            backgroundColor: colorScheme === 'dark' ? '#1A2530' : 'rgba(255,255,255,0.9)',
          },
        ]}
      />
      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={styles.primaryButton}>
        <ThemedText style={styles.primaryButtonText}>
          {isPending ? buttonPendingLabel : buttonLabel}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.08)',
    backgroundColor: 'rgba(255,251,245,0.82)',
    gap: 14,
  },
  sectionDark: {
    borderColor: 'rgba(244,237,228,0.08)',
    backgroundColor: 'rgba(24,33,43,0.82)',
  },
  sectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#6D7A88',
  },
  detailMuted: {
    fontSize: 13,
    color: '#64748B',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  actionChipDark: {
    borderColor: 'rgba(244,237,228,0.1)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#526171',
    textTransform: 'capitalize',
  },
  quickActionSelected: {
    backgroundColor: '#F3D8CA',
    borderColor: '#B85C38',
  },
  quickActionSelectedText: {
    color: '#9F4B2B',
  },
  activityInput: {
    minHeight: 92,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  primaryButton: {
    borderRadius: 18,
    backgroundColor: '#18212B',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
});
