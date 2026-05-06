import { Link } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, Platform, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { BadgePill } from '@/components/crm/badge-pill';
import { ConnectionDiagnostics } from '@/components/crm/connection-diagnostics';
import { CRMHero } from '@/components/crm/crm-hero';
import { PreferencesLink } from '@/components/crm/preferences-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useCRMDataSyncRefresh } from '@/hooks/use-crm-sync-refresh';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFallbackRefresh } from '@/hooks/use-fallback-refresh';
import { getClientAppearance } from '@/lib/client-appearance';
import { apiBaseUrl, Client, fetchJson, fallbackClients, statusTone } from '@/lib/crm';

function useClients() {
  const loadClients = useCallback(() => fetchJson<Client[]>('/clients/'), []);
  const { data, error, isFallback, isRefreshing, refresh } = useFallbackRefresh({
    autoLoad: true,
    errorMessage: 'Unable to refresh clients. Showing fallback data.',
    fallbackData: fallbackClients,
    load: loadClients,
  });

  return {
    clients: data,
    isFallback,
    isRefreshing,
    error,
    refresh,
  };
}

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const [query, setQuery] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, { banner?: boolean; profile?: boolean }>>({});
  const { clients, isFallback, isRefreshing, error, refresh } = useClients();
  useCRMDataSyncRefresh(refresh);

  function markImageFailed(clientId: string, field: 'banner' | 'profile') {
    setFailedImages((current) => ({
      ...current,
      [clientId]: {
        ...current[clientId],
        [field]: true,
      },
    }));
  }

  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return clients;
    }

    return clients.filter((client) => {
      const haystack = [
        client.name,
        client.email,
        client.phone,
        client.notes,
        ...(client.tags?.map((tag) => tag.name) ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [clients, query]);

  const activeCount = clients.filter((client) => client.status === 'active').length;
  const leadCount = clients.filter((client) => client.status === 'lead').length;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}>
      <CRMHero
        backgroundColor={colorScheme === 'dark' ? '#1E2730' : '#F3E9DC'}
        copy="Browse the pipeline here, then step into a detail workspace for tags, follow-up, and timeline edits."
        metrics={[
          { label: 'Active', tone: 'dark', value: activeCount },
          { label: 'Leads', value: leadCount },
        ]}
        title="Mobile CRM"
      />

      <ThemedView style={styles.toolbar}>
        <View style={styles.toolbarCopy}>
          <ThemedText style={styles.sectionLabel}>Pipeline</ThemedText>
          <ThemedText type="subtitle">Clients</ThemedText>
        </View>
        <View style={styles.toolbarActions}>
          <PreferencesLink />
          <BadgePill style={isFallback ? styles.badgeWarn : styles.badgeOk}>
            {isFallback ? 'Fallback data' : 'API connected'}
          </BadgePill>
          <Link href="/actions/client" style={styles.quickActionLink}>
            <ThemedText style={styles.quickActionLinkText}>Create Client</ThemedText>
          </Link>
        </View>
      </ThemedView>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search clients, notes, or tags"
        placeholderTextColor="#94A3B8"
        style={[
          styles.searchInput,
          {
            color: colors.text,
            borderColor: colorScheme === 'dark' ? '#334155' : 'rgba(24,33,43,0.1)',
            backgroundColor: colorScheme === 'dark' ? 'rgba(26,37,48,0.92)' : 'rgba(255,255,255,0.9)',
          },
        ]}
      />

      <ThemedText style={styles.resultCount}>
        Showing {filteredClients.length} of {clients.length} clients
      </ThemedText>
      <ConnectionDiagnostics
        apiBaseUrl={apiBaseUrl}
        isFallback={isFallback}
        label="Client Feed"
      />
      {error ? (
        <View style={[styles.feedbackCardError, isDark && styles.feedbackCardErrorDark]}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : null}

      {filteredClients.map((client) => {
        const tone = statusTone[client.status];
        const appearance = getClientAppearance(client.name, client.status);
        const imageState = failedImages[client.id] ?? {};

        return (
          <ThemedView key={client.id} style={[styles.clientCard, isDark && styles.clientCardDark]}>
            <View
              style={[
                styles.clientBanner,
                Platform.OS === 'web' ? styles.clientBannerWeb : null,
                { backgroundColor: appearance.bannerStart },
              ]}>
              {client.banner_image_url && !imageState.banner ? (
                <Image
                  source={{ uri: client.banner_image_url }}
                  style={styles.clientBannerImage}
                  onError={() => markImageFailed(client.id, 'banner')}
                />
              ) : null}
              <View style={styles.clientBannerOverlay} />
              <View style={[styles.clientBannerGlow, { backgroundColor: appearance.statusGlow }]} />
              <View style={[styles.clientBannerBubble, { backgroundColor: appearance.dot }]} />
              <View style={styles.clientBannerContent}>
                <View style={styles.clientIdentityRow}>
                  <View style={styles.clientIdentityGroup}>
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: appearance.avatarStart,
                          borderColor: 'rgba(255,255,255,0.5)',
                        },
                      ]}>
                      <View style={[styles.avatarInset, { backgroundColor: appearance.avatarEnd }]}>
                        {client.profile_image_url && !imageState.profile ? (
                          <Image
                            source={{ uri: client.profile_image_url }}
                            style={styles.avatarImage}
                            onError={() => markImageFailed(client.id, 'profile')}
                          />
                        ) : (
                          <ThemedText style={[styles.avatarText, { color: appearance.avatarText }]}>
                            {appearance.initials}
                          </ThemedText>
                        )}
                      </View>
                    </View>

                    <View style={styles.clientHeaderText}>
                      <ThemedText style={styles.clientNameOnBanner}>{client.name}</ThemedText>
                      <ThemedText style={styles.clientSubtleOnBanner}>
                        {client.email ?? client.phone ?? 'No contact details yet'}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={[styles.statusPill, styles.statusPillOnBanner, { backgroundColor: tone.bg }]}>
                    <ThemedText style={[styles.statusText, { color: tone.text }]}>
                      {client.status}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.clientBody}>
              <View style={[styles.metaPanel, isDark && styles.metaPanelDark]}>
                <ThemedText style={styles.metaLabel}>Contact rhythm</ThemedText>
                <ThemedText style={styles.clientMeta}>
                  Last contact:{' '}
                  {client.last_contacted_at
                    ? new Date(client.last_contacted_at).toLocaleDateString()
                    : 'Not scheduled'}
                </ThemedText>
              </View>

              <ThemedText
                numberOfLines={2}
                style={[styles.notesPreview, isDark && styles.notesPreviewDark]}>
                {client.notes ?? 'No notes yet. Open detail to add follow-up context.'}
              </ThemedText>

              <View style={styles.tagRow}>
                {client.tags?.length ? (
                  client.tags.map((tag) => (
                    <View
                      key={tag.id}
                      style={[
                        styles.tagPill,
                        { backgroundColor: `${tag.color}22`, borderColor: `${tag.color}66` },
                      ]}>
                      <ThemedText style={[styles.tagText, { color: tag.color }]}>
                        {tag.name}
                      </ThemedText>
                    </View>
                  ))
                ) : (
                  <ThemedText style={styles.clientSubtle}>No tags assigned</ThemedText>
                )}
              </View>

              <Link
                href={{ pathname: '/client/[id]', params: { id: client.id } }}
                style={[styles.detailLink, isDark && styles.detailLinkDark]}>
                <ThemedText style={[styles.detailLinkText, isDark && styles.detailLinkTextDark]}>
                  Open detail workspace
                </ThemedText>
              </Link>
            </View>
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  toolbarCopy: {
    gap: 4,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badgeWarn: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  badgeOk: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },
  sectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#6D7A88',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  resultCount: {
    fontSize: 13,
    color: '#64748B',
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
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#B91C1C',
  },
  clientCard: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.08)',
    backgroundColor: 'rgba(255,251,245,0.82)',
  },
  clientCardDark: {
    borderColor: 'rgba(244,237,228,0.08)',
    backgroundColor: 'rgba(24,33,43,0.82)',
  },
  clientBanner: {
    minHeight: 156,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  clientBannerWeb: {
    minHeight: 176,
  },
  clientBannerImage: {
    ...StyleSheet.absoluteFillObject,
  },
  clientBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.34)',
  },
  clientBannerGlow: {
    position: 'absolute',
    left: -12,
    bottom: -18,
    width: 98,
    height: 98,
    borderRadius: 999,
  },
  clientBannerBubble: {
    position: 'absolute',
    top: 10,
    right: -8,
    width: 86,
    height: 86,
    borderRadius: 999,
  },
  clientBannerContent: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
  },
  clientBody: {
    padding: 18,
    paddingTop: 18,
    gap: 14,
  },
  clientIdentityRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  clientIdentityGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    padding: 4,
  },
  avatarInset: {
    flex: 1,
    width: '100%',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  clientHeaderText: {
    flex: 1,
    gap: 6,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#18212B',
  },
  clientNameOnBanner: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF8F2',
  },
  clientSubtle: {
    fontSize: 13,
    color: '#64748B',
  },
  clientSubtleOnBanner: {
    fontSize: 13,
    color: 'rgba(255,248,242,0.82)',
  },
  clientMeta: {
    fontSize: 13,
    color: '#475569',
  },
  metaPanel: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.06)',
    gap: 4,
  },
  metaPanelDark: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(244,237,228,0.08)',
  },
  metaLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: '#6D7A88',
  },
  notesPreview: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
  },
  notesPreviewDark: {
    color: '#CBD5E1',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusPillOnBanner: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailLink: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.08)',
    backgroundColor: 'rgba(24,33,43,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  detailLinkDark: {
    borderColor: 'rgba(244,237,228,0.08)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  detailLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D3B4A',
    textTransform: 'uppercase',
  },
  detailLinkTextDark: {
    color: '#F7F1E8',
  },
  quickActionLink: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.08)',
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickActionLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18212B',
    textTransform: 'uppercase',
  },
});
