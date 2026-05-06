import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BadgePill } from '@/components/crm/badge-pill';
import { CRMHero } from '@/components/crm/crm-hero';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useClientOptions } from '@/hooks/use-mobile-crm-options';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiBaseUrl } from '@/lib/crm';
import { emitCRMDataChanged } from '@/lib/mobile-sync';
import { QuickActivityForm } from '@/components/crm/quick-activity-form';

export default function LogActivityActionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { clients, error: clientsError, isFallback } = useClientOptions();
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedClientId && clients[0]?.id) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  async function createActivity(interactionType: string, notes: string) {
    if (!selectedClientId) {
      setError('Choose a client first.');
      return false;
    }

    if (!notes.trim()) {
      setError('Activity notes are required.');
      return false;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/activity/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: selectedClientId,
          interaction_type: interactionType,
          notes: notes.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      setSuccess('Activity logged.');
      emitCRMDataChanged();
      setSuccess('Activity logged.');
      return true;
    } catch {
      setError('Unable to log activity.');
      return false;
    } finally {
      setPending(false);
    }
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <CRMHero
        backgroundColor={colorScheme === 'dark' ? '#241F31' : '#E7E1F3'}
        badge={
          <View style={styles.heroMeta}>
            <BadgePill style={isFallback ? styles.badgeWarn : styles.badgeOk}>
              {isFallback ? 'Fallback clients' : 'Live clients'}
            </BadgePill>
            <Link href="/modal" dismissTo style={styles.closeLink}>
              <ThemedText style={styles.closeLinkText}>Back to hub</ThemedText>
            </Link>
          </View>
        }
        copy="Log one interaction cleanly without dragging client creation or tag management into the same screen."
        title="Log Activity"
      />

      {clientsError ? (
        <View style={[styles.feedbackCardError, isDark && styles.feedbackCardErrorDark]}>
          <ThemedText style={styles.errorText}>{clientsError}</ThemedText>
        </View>
      ) : null}
      {error ? (
        <View style={[styles.feedbackCardError, isDark && styles.feedbackCardErrorDark]}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : null}
      {success ? (
        <View style={[styles.feedbackCardSuccess, isDark && styles.feedbackCardSuccessDark]}>
          <ThemedText style={styles.successText}>{success}</ThemedText>
        </View>
      ) : null}

      <QuickActivityForm
        clients={clients}
        selectedClientId={selectedClientId}
        onSelectClient={setSelectedClientId}
        onSubmit={({ interactionType, notes }) => createActivity(interactionType, notes)}
        isFallback={isFallback}
        isPending={pending}
      />

      <View style={styles.buttonRow}>
        <Pressable
          disabled={pending}
          onPress={() => router.back()}
          style={[styles.secondaryButton, isDark && styles.secondaryButtonDark]}>
          <ThemedText style={styles.secondaryButtonText}>Done</ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeWarn: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  badgeOk: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },
  closeLink: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  closeLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18212B',
    textTransform: 'uppercase',
  },
  feedbackCardError: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F5C2C7',
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  feedbackCardErrorDark: {
    borderColor: 'rgba(245,194,199,0.26)',
    backgroundColor: 'rgba(127,29,29,0.26)',
  },
  feedbackCardSuccess: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BCE5D3',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  feedbackCardSuccessDark: {
    borderColor: 'rgba(188,229,211,0.24)',
    backgroundColor: 'rgba(6,78,59,0.28)',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.1)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  secondaryButtonDark: {
    borderColor: 'rgba(244,237,228,0.1)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  secondaryButtonText: {
    color: '#334155',
    fontWeight: '700',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#B91C1C',
  },
  successText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#166534',
  },
});
