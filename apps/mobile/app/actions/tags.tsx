import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { BadgePill } from '@/components/crm/badge-pill';
import { CRMHero } from '@/components/crm/crm-hero';
import { FilterChip } from '@/components/crm/filter-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useClientOptions, useTagOptions } from '@/hooks/use-mobile-crm-options';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiBaseUrl, ClientTag } from '@/lib/crm';
import { emitCRMDataChanged } from '@/lib/mobile-sync';

export default function ManageTagsActionScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { clients, error: clientsError } = useClientOptions();
  const { assignments, error: tagsError, isFallback, refresh, tags } = useTagOptions();
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? '');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#0ea5e9');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedClientId && clients[0]?.id) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  const selectedClientName = useMemo(
    () => clients.find((client) => client.id === selectedClientId)?.name ?? 'Select a client',
    [clients, selectedClientId],
  );
  const assignedTagIds = useMemo(
    () =>
      new Set(
        assignments
          .filter((assignment) => assignment.client_id === selectedClientId)
          .map((assignment) => assignment.tag_id),
      ),
    [assignments, selectedClientId],
  );
  const availableTags = useMemo(
    () => tags.filter((tag) => !assignedTagIds.has(tag.id)),
    [assignedTagIds, tags],
  );
  const assignedTags = useMemo(
    () => tags.filter((tag) => assignedTagIds.has(tag.id)),
    [assignedTagIds, tags],
  );

  function resetEditor() {
    setEditingTagId(null);
    setTagName('');
    setTagColor('#0ea5e9');
  }

  async function assignTag(tagId: string) {
    if (!selectedClientId) {
      setError('Choose a client first.');
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/client-tags/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: selectedClientId,
          tag_id: tagId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      setSuccess('Tag assigned.');
      await refresh();
      emitCRMDataChanged();
    } catch {
      setError('Unable to assign tag.');
    } finally {
      setPending(false);
    }
  }

  async function removeTag(tagId: string) {
    if (!selectedClientId) {
      setError('Choose a client first.');
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/client-tags/?client_id=${encodeURIComponent(selectedClientId)}&tag_id=${encodeURIComponent(tagId)}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      setSuccess('Tag removed.');
      await refresh();
      emitCRMDataChanged();
    } catch {
      setError('Unable to remove tag.');
    } finally {
      setPending(false);
    }
  }

  async function createTag() {
    if (!tagName.trim()) {
      setError('Tag name is required.');
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/tags/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          color: tagColor.trim() || '#0ea5e9',
          name: tagName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const created = (await response.json()) as ClientTag[];
      const createdTagId = created[0]?.id;

      if (createdTagId && selectedClientId) {
        const assignmentResponse = await fetch(`${apiBaseUrl}/client-tags/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: selectedClientId,
            tag_id: createdTagId,
          }),
        });

        if (!assignmentResponse.ok) {
          throw new Error(`API returned ${assignmentResponse.status}`);
        }
      }

      setSuccess(selectedClientId ? 'Tag created and assigned.' : 'Tag created.');
      resetEditor();
      await refresh();
      emitCRMDataChanged();
    } catch {
      setError('Unable to create tag.');
    } finally {
      setPending(false);
    }
  }

  async function updateTag() {
    if (!editingTagId) {
      return;
    }

    if (!tagName.trim()) {
      setError('Tag name is required.');
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/tags/${editingTagId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          color: tagColor.trim() || '#0ea5e9',
          name: tagName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      setSuccess('Tag updated.');
      resetEditor();
      await refresh();
      emitCRMDataChanged();
    } catch {
      setError('Unable to update tag.');
    } finally {
      setPending(false);
    }
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <CRMHero
        backgroundColor={colorScheme === 'dark' ? '#241F31' : '#E8E1F3'}
        badge={
          <View style={styles.heroMeta}>
            <BadgePill style={isFallback ? styles.badgeWarn : styles.badgeOk}>
              {isFallback ? 'Fallback tags' : 'Live tags'}
            </BadgePill>
            <Link href="/modal" dismissTo style={styles.closeLink}>
              <ThemedText style={styles.closeLinkText}>Back to hub</ThemedText>
            </Link>
          </View>
        }
        copy="Keep tag creation, editing, and assignment inside one focused mobile taxonomy workspace."
        title="Manage Tags"
      />

      <ThemedView style={[styles.section, isDark && styles.sectionDark]}>
        <ThemedText style={styles.sectionLabel}>Context</ThemedText>
        <ThemedText type="subtitle">Client Context</ThemedText>
        <ThemedText style={styles.helperText}>Selected client: {selectedClientName}</ThemedText>
        <View style={styles.chipRow}>
          {clients.map((client) => (
            <FilterChip
              key={client.id}
              label={client.name}
              onPress={() => setSelectedClientId(client.id)}
              selected={selectedClientId === client.id}
            />
          ))}
        </View>
      </ThemedView>

      {clientsError ? (
        <View style={[styles.feedbackCardError, isDark && styles.feedbackCardErrorDark]}>
          <ThemedText style={styles.errorText}>{clientsError}</ThemedText>
        </View>
      ) : null}
      {tagsError ? (
        <View style={[styles.feedbackCardError, isDark && styles.feedbackCardErrorDark]}>
          <ThemedText style={styles.errorText}>{tagsError}</ThemedText>
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

      <ThemedView style={[styles.section, isDark && styles.sectionDark]}>
        <ThemedText style={styles.sectionLabel}>Editor</ThemedText>
        <ThemedText type="subtitle">{editingTagId ? 'Edit Tag' : 'Create Tag'}</ThemedText>
        <TextInput
          value={tagName}
          onChangeText={setTagName}
          placeholder="Tag name"
          placeholderTextColor="#94A3B8"
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colorScheme === 'dark' ? '#334155' : 'rgba(24,33,43,0.1)',
              backgroundColor: colorScheme === 'dark' ? '#1A2530' : 'rgba(255,255,255,0.9)',
            },
          ]}
        />
        <TextInput
          value={tagColor}
          onChangeText={setTagColor}
          placeholder="#0ea5e9"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colorScheme === 'dark' ? '#334155' : 'rgba(24,33,43,0.1)',
              backgroundColor: colorScheme === 'dark' ? '#1A2530' : 'rgba(255,255,255,0.9)',
            },
          ]}
        />
        <View style={styles.buttonRow}>
          <Pressable
            disabled={pending}
            onPress={() => void (editingTagId ? updateTag() : createTag())}
            style={styles.primaryButton}>
            <ThemedText style={styles.primaryButtonText}>
              {pending ? 'Saving...' : editingTagId ? 'Update tag' : 'Create tag'}
            </ThemedText>
          </Pressable>
          {editingTagId ? (
            <Pressable
              disabled={pending}
              onPress={resetEditor}
              style={[styles.secondaryButton, isDark && styles.secondaryButtonDark]}>
              <ThemedText style={styles.secondaryButtonText}>Cancel edit</ThemedText>
            </Pressable>
          ) : null}
        </View>
      </ThemedView>

      <ThemedView style={[styles.section, isDark && styles.sectionDark]}>
        <ThemedText style={styles.sectionLabel}>Assignment</ThemedText>
        <ThemedText type="subtitle">Assign Existing Tags</ThemedText>
        <View style={styles.chipRow}>
          {availableTags.length ? (
            availableTags.map((tag) => (
              <FilterChip
                key={tag.id}
                label={tag.name}
                onPress={() => void assignTag(tag.id)}
                selected={false}
              />
            ))
          ) : (
            <ThemedText style={styles.helperText}>All tags already assigned.</ThemedText>
          )}
        </View>
      </ThemedView>

      <ThemedView style={[styles.section, isDark && styles.sectionDark]}>
        <ThemedText style={styles.sectionLabel}>Assigned</ThemedText>
        <ThemedText type="subtitle">Assigned Tags</ThemedText>
        <View style={styles.chipRow}>
          {assignedTags.length ? (
            assignedTags.map((tag) => (
              <View key={tag.id} style={styles.tagActionRow}>
                <Pressable
                  disabled={pending}
                  onPress={() => {
                    setEditingTagId(tag.id);
                    setTagName(tag.name);
                    setTagColor(tag.color);
                  }}
                  style={[styles.tagActionButton, styles.secondaryButton, isDark && styles.secondaryButtonDark]}>
                  <ThemedText style={styles.secondaryButtonText}>Edit {tag.name}</ThemedText>
                </Pressable>
                <Pressable
                  disabled={pending}
                  onPress={() => void removeTag(tag.id)}
                  style={[styles.tagActionButton, styles.dangerButton]}>
                  <ThemedText style={styles.dangerButtonText}>Remove</ThemedText>
                </Pressable>
              </View>
            ))
          ) : (
            <ThemedText style={styles.helperText}>No tags assigned yet.</ThemedText>
          )}
        </View>
      </ThemedView>
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
  helperText: {
    fontSize: 13,
    color: '#64748B',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
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
  primaryButton: {
    borderRadius: 999,
    backgroundColor: '#18212B',
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  primaryButtonText: {
    color: '#F8FAFC',
    fontWeight: '700',
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
  dangerButton: {
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  dangerButtonText: {
    color: '#B91C1C',
    fontWeight: '700',
  },
  tagActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagActionButton: {
    alignSelf: 'flex-start',
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
