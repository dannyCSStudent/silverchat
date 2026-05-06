import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { BadgePill } from '@/components/crm/badge-pill';
import { ClientDetailForm } from '@/components/crm/client-detail-form';
import { ConnectionDiagnostics } from '@/components/crm/connection-diagnostics';
import { CRMHero } from '@/components/crm/crm-hero';
import { PreferencesLink } from '@/components/crm/preferences-link';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useCRMDataSyncRefresh } from '@/hooks/use-crm-sync-refresh';
import { useFallbackRefresh } from '@/hooks/use-fallback-refresh';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  apiBaseUrl,
  Client,
  ClientActivity,
  ClientInteractionType,
  ClientStatus,
  ClientTag,
  ClientTagAssignment,
  fallbackActivity,
  fallbackAssignments,
  fallbackClients,
  fallbackTags,
  fetchJson,
  isUuidLike,
  statusTone,
  toLocalDatetimeValue,
} from '@/lib/crm';
import { emitCRMDataChanged } from '@/lib/mobile-sync';
import { ActivityHistory } from '@/components/crm/activity-history';
import { TagManager } from '@/components/crm/tag-manager';
import { QuickActivityForm } from '@/components/crm/quick-activity-form';

function useClientDetail(clientId: string) {
  const [pendingContact, setPendingContact] = useState(false);
  const [pendingActivity, setPendingActivity] = useState(false);
  const [pendingUpdateActivityId, setPendingUpdateActivityId] = useState<string | null>(null);
  const [pendingDeleteActivityId, setPendingDeleteActivityId] = useState<string | null>(null);
  const [pendingTag, setPendingTag] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const fallbackData = useMemo(
    () => ({
      activity: fallbackActivity.filter((item) => item.client_id === clientId),
      assignments: fallbackAssignments,
      clients: fallbackClients,
      tags: fallbackTags,
    }),
    [clientId],
  );
  const loadDetail = useMemo(
    () => async () => {
      if (!isUuidLike(clientId)) {
        return fallbackData;
      }

      return {
        activity: await fetchJson<ClientActivity[]>(`/activity/client/${clientId}`),
        assignments: await fetchJson<ClientTagAssignment[]>('/client-tags/'),
        clients: await fetchJson<Client[]>('/clients/'),
        tags: await fetchJson<ClientTag[]>('/tags/'),
      };
    },
    [clientId, fallbackData],
  );
  const {
    data,
    error,
    isFallback,
    isRefreshing,
    refresh,
    setData,
    setError,
  } = useFallbackRefresh({
    autoLoad: true,
    errorMessage: 'Unable to refresh client detail. Showing fallback data.',
    fallbackData,
    load: loadDetail,
  });
  const { activity, assignments, clients, tags } = data;

  async function updateContact(payload: {
    email?: string | null;
    notes?: string | null;
    phone?: string | null;
    profile_image_url?: string | null;
    banner_image_url?: string | null;
    last_contacted_at?: string | null;
    status?: ClientStatus | null;
  }) {
    if (!clientId || isFallback) {
      return false;
    }

    setError(null);
    setSuccess(null);
    setPendingContact(true);

    const previousData = data;
    setData((current) => ({
      ...current,
      clients: current.clients.map((client) =>
        client.id === clientId
          ? {
              ...client,
              email: payload.email ?? undefined,
              notes: payload.notes ?? client.notes,
              phone: payload.phone ?? undefined,
              profile_image_url: payload.profile_image_url ?? client.profile_image_url,
              banner_image_url: payload.banner_image_url ?? client.banner_image_url,
              last_contacted_at: payload.last_contacted_at ?? undefined,
              status: payload.status ?? client.status,
            }
          : client,
      ),
    }));

    try {
      const response = await fetch(`${apiBaseUrl}/clients/${clientId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      setSuccess('Client details updated.');
      return true;
    } catch {
      setData(previousData);
      setError('Unable to update client contact.');
      return false;
    } finally {
      setPendingContact(false);
    }
  }

  async function logActivity(interactionType: ClientInteractionType, notes: string) {
    if (!clientId || isFallback) {
      return false;
    }

    setError(null);
    setSuccess(null);
    setPendingActivity(true);

    const optimisticActivity: ClientActivity = {
      id: `local-${Date.now()}`,
      client_id: clientId,
      interaction_type: interactionType,
      notes,
      timestamp: new Date().toISOString(),
    };
    const previousData = data;
    setData((current) => ({
      ...current,
      activity: [optimisticActivity, ...current.activity],
    }));

    try {
      const response = await fetch(`${apiBaseUrl}/activity/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          interaction_type: interactionType,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      setSuccess('Activity logged.');
      void refresh();
      return true;
    } catch {
      setData(previousData);
      setError('Unable to log activity.');
      return false;
    } finally {
      setPendingActivity(false);
    }
  }

  async function assignTag(tagId: string) {
    if (!clientId || isFallback) {
      return false;
    }

    setError(null);
    setSuccess(null);
    setPendingTag(true);

    const previousData = data;
    setData((current) => ({
      ...current,
      assignments: [...current.assignments, { client_id: clientId, tag_id: tagId }],
    }));

    try {
      const response = await fetch(`${apiBaseUrl}/client-tags/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          tag_id: tagId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      setSuccess('Tag assigned.');
      emitCRMDataChanged();
      return true;
    } catch {
      setData(previousData);
      setError('Unable to assign tag.');
      return false;
    } finally {
      setPendingTag(false);
    }
  }

  async function removeTag(tagId: string) {
    if (!clientId || isFallback) {
      return false;
    }

    setError(null);
    setSuccess(null);
    setPendingTag(true);

    const previousData = data;
    setData((current) => ({
      ...current,
      assignments: current.assignments.filter(
        (assignment) => !(assignment.client_id === clientId && assignment.tag_id === tagId),
      ),
    }));

    try {
      const response = await fetch(
        `${apiBaseUrl}/client-tags/?client_id=${encodeURIComponent(clientId)}&tag_id=${encodeURIComponent(tagId)}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      setSuccess('Tag removed.');
      emitCRMDataChanged();
      return true;
    } catch {
      setData(previousData);
      setError('Unable to remove tag.');
      return false;
    } finally {
      setPendingTag(false);
    }
  }

  async function deleteActivity(activityId: string) {
    if (!clientId || isFallback) {
      return false;
    }

    setError(null);
    setSuccess(null);
    setPendingDeleteActivityId(activityId);

    const previousData = data;
    setData((current) => ({
      ...current,
      activity: current.activity.filter((item) => item.id !== activityId),
    }));

    try {
      const response = await fetch(`${apiBaseUrl}/activity/${activityId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      setSuccess('Activity deleted.');
      emitCRMDataChanged();
      return true;
    } catch {
      setData(previousData);
      setError('Unable to delete activity.');
      return false;
    } finally {
      setPendingDeleteActivityId(null);
    }
  }

  async function updateActivity(activityId: string, notes: string) {
    if (!clientId || isFallback) {
      return false;
    }

    setError(null);
    setSuccess(null);
    setPendingUpdateActivityId(activityId);

    const previousData = data;
    setData((current) => ({
      ...current,
      activity: current.activity.map((item) =>
        item.id === activityId ? { ...item, notes } : item,
      ),
    }));

    try {
      const response = await fetch(`${apiBaseUrl}/activity/${activityId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      setSuccess('Activity updated.');
      emitCRMDataChanged();
      return true;
    } catch {
      setData(previousData);
      setError('Unable to update activity.');
      return false;
    } finally {
      setPendingUpdateActivityId(null);
    }
  }

  return {
    clients,
    tags,
    assignments,
    activity,
    isFallback,
    isRefreshing,
    pendingContact,
    pendingActivity,
    pendingUpdateActivityId,
    pendingDeleteActivityId,
    pendingTag,
    error,
    success,
    refresh,
    updateContact,
    logActivity,
    updateActivity,
    deleteActivity,
    assignTag,
    removeTag,
  };
}

export default function ClientDetailScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = Array.isArray(id) ? id[0] : id;
  const {
    clients,
    tags,
    assignments,
    activity,
    isFallback,
    isRefreshing,
    pendingContact,
    pendingActivity,
    pendingUpdateActivityId,
    pendingDeleteActivityId,
    pendingTag,
    error,
    success,
    refresh,
    updateContact,
    logActivity,
    updateActivity,
    deleteActivity,
    assignTag,
    removeTag,
  } = useClientDetail(clientId ?? '');
  useCRMDataSyncRefresh(refresh);

  const client = useMemo(
    () => clients.find((item) => item.id === clientId) ?? fallbackClients[0],
    [clientId, clients],
  );
  const clientTags = useMemo(() => {
    return assignments
      .filter((assignment) => assignment.client_id === client?.id)
      .map((assignment) => tags.find((tag) => tag.id === assignment.tag_id))
      .filter((tag): tag is ClientTag => Boolean(tag));
  }, [assignments, client?.id, tags]);
  const availableTags = useMemo(
    () => tags.filter((tag) => !clientTags.some((clientTag) => clientTag.id === tag.id)),
    [clientTags, tags],
  );
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [draftActivityNotesById, setDraftActivityNotesById] = useState<Record<string, string>>({});
  const [draftClientStatus, setDraftClientStatus] = useState<ClientStatus>(client?.status ?? 'lead');
  const [draftEmail, setDraftEmail] = useState(client?.email ?? '');
  const [draftClientNotes, setDraftClientNotes] = useState(client?.notes ?? '');
  const [draftPhone, setDraftPhone] = useState(client?.phone ?? '');
  const [draftProfileImageUrl, setDraftProfileImageUrl] = useState(client?.profile_image_url ?? '');
  const [draftBannerImageUrl, setDraftBannerImageUrl] = useState(client?.banner_image_url ?? '');
  const [draftLastContact, setDraftLastContact] = useState(
    toLocalDatetimeValue(client?.last_contacted_at),
  );

  const handleSaveClientDetails = () => {
    const payload: Parameters<typeof updateContact>[0] = {
      email: draftEmail.trim() || null,
      notes: draftClientNotes.trim() || null,
      phone: draftPhone.trim() || null,
      last_contacted_at: draftLastContact
        ? new Date(draftLastContact).toISOString()
        : null,
      status: draftClientStatus,
    };

    if (draftProfileImageUrl.trim()) {
      payload.profile_image_url = draftProfileImageUrl.trim();
    }

    if (draftBannerImageUrl.trim()) {
      payload.banner_image_url = draftBannerImageUrl.trim();
    }

    return updateContact(payload);
  };

  useEffect(() => {
    setDraftClientStatus(client?.status ?? 'lead');
    setDraftEmail(client?.email ?? '');
    setDraftClientNotes(client?.notes ?? '');
    setDraftPhone(client?.phone ?? '');
    setDraftProfileImageUrl(client?.profile_image_url ?? '');
    setDraftBannerImageUrl(client?.banner_image_url ?? '');
    setDraftLastContact(toLocalDatetimeValue(client?.last_contacted_at));
  }, [client?.banner_image_url, client?.email, client?.last_contacted_at, client?.notes, client?.phone, client?.profile_image_url, client?.id, client?.status]);

  if (!client) {
    return null;
  }

  const tone = statusTone[client.status];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}>
      <CRMHero
        backgroundColor={colorScheme === 'dark' ? '#1E2730' : '#F3E9DC'}
        badge={
          <View style={styles.heroMeta}>
            <View style={styles.heroMetaGroup}>
              <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                <ThemedText style={[styles.statusText, { color: tone.text }]}>
                  {client.status}
                </ThemedText>
              </View>
              <BadgePill style={isFallback ? styles.badgeWarn : styles.badgeOk}>
                {isFallback ? 'Fallback' : 'Live'}
              </BadgePill>
            </View>
            <PreferencesLink compact />
          </View>
        }
        copy="Detail workflow for contact maintenance, follow-up discipline, and timeline clarity."
        metrics={[
          { label: 'Activity', value: activity.length },
          { label: 'Tags', value: clientTags.length, tone: 'dark' },
        ]}
        title={client.name}
      />

      {error ? (
        <View style={[styles.feedbackCardError, colorScheme === 'dark' && styles.feedbackCardErrorDark]}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : null}
      {success ? (
        <View style={[styles.feedbackCardSuccess, colorScheme === 'dark' && styles.feedbackCardSuccessDark]}>
          <ThemedText style={styles.successText}>{success}</ThemedText>
        </View>
      ) : null}
      <ConnectionDiagnostics
        apiBaseUrl={apiBaseUrl}
        isFallback={isFallback}
        label={isUuidLike(client.id) ? 'Client Detail' : 'Client Detail Sample'}
      />

      <ClientDetailForm
        client={client}
        colorScheme={colorScheme}
        colors={colors}
        draftStatus={draftClientStatus}
        setDraftStatus={setDraftClientStatus}
        draftEmail={draftEmail}
        setDraftEmail={setDraftEmail}
        draftPhone={draftPhone}
        setDraftPhone={setDraftPhone}
        draftProfileImageUrl={draftProfileImageUrl}
        setDraftProfileImageUrl={setDraftProfileImageUrl}
        draftBannerImageUrl={draftBannerImageUrl}
        setDraftBannerImageUrl={setDraftBannerImageUrl}
        draftLastContact={draftLastContact}
        setDraftLastContact={setDraftLastContact}
        draftNotes={draftClientNotes}
        setDraftNotes={setDraftClientNotes}
        isFallback={isFallback}
        pendingContact={pendingContact}
        onSave={handleSaveClientDetails}
      />

      <TagManager
        assignedTags={clientTags}
        availableTags={availableTags}
        isFallback={isFallback}
        pending={pendingTag}
        onAssignTag={assignTag}
        onRemoveTag={removeTag}
      />

      <QuickActivityForm
        onSubmit={({ interactionType, notes }) => logActivity(interactionType, notes)}
        isFallback={isFallback}
        isPending={pendingActivity}
      />

      <ActivityHistory
        activity={activity}
        isFallback={isFallback}
        pendingDeleteActivityId={pendingDeleteActivityId}
        pendingUpdateActivityId={pendingUpdateActivityId}
        editingActivityId={editingActivityId}
        setEditingActivityId={setEditingActivityId}
        draftActivityNotesById={draftActivityNotesById}
        setDraftActivityNotesById={setDraftActivityNotesById}
        updateActivity={updateActivity}
        deleteActivity={deleteActivity}
        colors={colors}
        colorScheme={colorScheme}
      />
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
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  heroMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
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
    borderColor: 'rgba(245,194,199,0.24)',
    backgroundColor: 'rgba(127,29,29,0.22)',
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
    borderColor: 'rgba(188,229,211,0.22)',
    backgroundColor: 'rgba(6,78,59,0.24)',
  },
  badgeWarn: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  badgeOk: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
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
