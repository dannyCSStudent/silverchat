import { Link } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { BadgePill } from '@/components/crm/badge-pill';
import { ConnectionDiagnostics } from '@/components/crm/connection-diagnostics';
import { CRMHero } from '@/components/crm/crm-hero';
import { FilterChip } from '@/components/crm/filter-chip';
import { PreferencesLink } from '@/components/crm/preferences-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useCRMDataSyncRefresh } from '@/hooks/use-crm-sync-refresh';
import { useFallbackRefresh } from '@/hooks/use-fallback-refresh';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  apiBaseUrl,
  ClientActivity,
  ClientInteractionType,
  ClientSummary,
  fallbackActivity,
  fallbackClientSummaries,
  fetchJson,
} from '@/lib/crm';

const interactionFilters: { label: string; value: ClientInteractionType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Follow Up', value: 'follow_up' },
  { label: 'Call', value: 'call' },
  { label: 'Email', value: 'email' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Note', value: 'note' },
];

function useActivityFeed() {
  const fallbackFeed = useMemo(
    () => ({
      activity: fallbackActivity,
      clients: fallbackClientSummaries,
    }),
    [],
  );
  const loadFeed = useCallback(
    async () => ({
      activity: await fetchJson<ClientActivity[]>('/activity/'),
      clients: await fetchJson<ClientSummary[]>('/clients/'),
    }),
    [],
  );
  const { data, error, isFallback, isRefreshing, refresh } = useFallbackRefresh({
    autoLoad: true,
    errorMessage: 'Unable to refresh activity. Showing fallback feed.',
    fallbackData: fallbackFeed,
    load: loadFeed,
  });

  return {
    clients: data.clients,
    activity: data.activity,
    isFallback,
    isRefreshing,
    error,
    refresh,
  };
}

export default function ActivityScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ClientInteractionType | 'all'>('all');
  const { clients, activity, isFallback, isRefreshing, error, refresh } = useActivityFeed();
  useCRMDataSyncRefresh(refresh);

  const followUpCount = activity.filter((item) => item.interaction_type === 'follow_up').length;
  const today = new Date();
  const recentCount = activity.filter((item) => {
    const timestamp = new Date(item.timestamp);
    return today.getTime() - timestamp.getTime() <= 1000 * 60 * 60 * 24 * 7;
  }).length;

  const filteredActivity = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return activity.filter((item) => {
      const clientName = clients.find((client) => client.id === item.client_id)?.name ?? '';
      const matchesQuery =
        !normalizedQuery ||
        `${clientName} ${item.notes ?? ''} ${item.interaction_type}`
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesType = selectedType === 'all' || item.interaction_type === selectedType;
      return matchesQuery && matchesType;
    });
  }, [activity, clients, query, selectedType]);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}>
      <CRMHero
        backgroundColor={colorScheme === 'dark' ? '#241F31' : '#E7E1F3'}
        badge={
          <View style={styles.heroMeta}>
            <BadgePill style={isFallback ? styles.badgeWarn : styles.badgeOk}>
              {isFallback ? 'Fallback feed' : 'Live activity'}
            </BadgePill>
            <PreferencesLink />
          </View>
        }
        copy="Recent CRM work with fast filtering for follow-up risk and recent relationship activity."
        metrics={[
          { label: 'Follow Ups', tone: 'dark', value: followUpCount },
          { label: 'Last 7 Days', value: recentCount },
        ]}
        title="Activity"
      />

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by client, type, or note"
        placeholderTextColor="#94A3B8"
        style={[
          styles.searchInput,
          {
            color: colors.text,
            borderColor: colorScheme === 'dark' ? '#334155' : 'rgba(24,33,43,0.1)',
            backgroundColor: colorScheme === 'dark' ? '#1A2530' : 'rgba(255,255,255,0.9)',
          },
        ]}
      />

      <View style={styles.filterRow}>
        {interactionFilters.map((filter) => {
          const isSelected = selectedType === filter.value;

          return (
            <FilterChip
              key={filter.value}
              label={filter.label}
              onPress={() => setSelectedType(filter.value)}
              selected={isSelected}
            />
          );
        })}
      </View>

      <ThemedText style={styles.resultCount}>
        Showing {filteredActivity.length} of {activity.length} entries
      </ThemedText>
      <ConnectionDiagnostics
        apiBaseUrl={apiBaseUrl}
        isFallback={isFallback}
        label="Activity Feed"
      />
      <Link href="/actions/activity" style={styles.quickActionLink}>
        <ThemedText style={styles.quickActionLinkText}>Log Activity</ThemedText>
      </Link>
      {error ? (
        <View style={[styles.feedbackCardError, isDark && styles.feedbackCardErrorDark]}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : null}

      {filteredActivity.map((item) => {
        const clientName =
          clients.find((client) => client.id === item.client_id)?.name ?? 'Unknown client';
        const tone =
          item.interaction_type === 'follow_up'
            ? { bg: '#FDECC8', text: '#9A5A12' }
            : item.interaction_type === 'meeting'
              ? { bg: '#DCECF2', text: '#27566B' }
              : item.interaction_type === 'email'
                ? { bg: '#E7E4F7', text: '#5E4C9B' }
                : item.interaction_type === 'call'
                  ? { bg: '#D8EEDF', text: '#1F7A61' }
                  : { bg: '#E8ECF0', text: '#526171' };

        return (
          <ThemedView key={item.id} style={[styles.activityCard, isDark && styles.activityCardDark]}>
            <View style={styles.activityHeader}>
              <View style={styles.activityIdentity}>
                <View style={styles.activityDot} />
                <View style={styles.activityText}>
                <ThemedText type="defaultSemiBold">{clientName}</ThemedText>
                  <ThemedText
                    style={[
                      styles.activityType,
                      { backgroundColor: tone.bg, color: tone.text },
                    ]}>
                  {item.interaction_type.replace('_', ' ')}
                </ThemedText>
                </View>
              </View>
              <ThemedText style={styles.activityDate}>
                {new Date(item.timestamp).toLocaleDateString()}
              </ThemedText>
            </View>
            <ThemedText style={styles.activityNotes}>
              {item.notes ?? 'No notes attached.'}
            </ThemedText>
            <Link href={{ pathname: '/client/[id]', params: { id: item.client_id } }} style={styles.detailLink}>
              <ThemedText style={styles.detailLinkText}>Open client workspace</ThemedText>
            </Link>
          </ThemedView>
        );
      })}
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
  badgeWarn: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  badgeOk: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  resultCount: {
    fontSize: 13,
    color: '#64748B',
  },
  quickActionLink: {
    alignSelf: 'flex-start',
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
  quickActionLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18212B',
    textTransform: 'uppercase',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#B91C1C',
  },
  activityCard: {
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.08)',
    backgroundColor: 'rgba(255,251,245,0.82)',
    gap: 12,
  },
  activityCardDark: {
    borderColor: 'rgba(244,237,228,0.08)',
    backgroundColor: 'rgba(24,33,43,0.82)',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  activityIdentity: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 9,
    backgroundColor: '#B85C38',
  },
  activityText: {
    flex: 1,
    gap: 8,
  },
  activityType: {
    fontSize: 12,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  activityDate: {
    fontSize: 12,
    color: '#64748B',
  },
  activityNotes: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },
  detailLink: {
    alignSelf: 'flex-start',
  },
  detailLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18212B',
    textTransform: 'uppercase',
  },
});
