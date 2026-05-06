import { Dispatch, SetStateAction } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { ClientActivity } from '@/lib/crm';

type ThemeColors = (typeof Colors)['light'];

type ActivityHistoryProps = {
  activity: ClientActivity[];
  isFallback: boolean;
  pendingDeleteActivityId: string | null;
  pendingUpdateActivityId: string | null;
  editingActivityId: string | null;
  draftActivityNotesById: Record<string, string>;
  setDraftActivityNotesById: Dispatch<SetStateAction<Record<string, string>>>;
  setEditingActivityId: Dispatch<SetStateAction<string | null>>;
  updateActivity: (activityId: string, notes: string) => Promise<boolean>;
  deleteActivity: (activityId: string) => Promise<boolean>;
  colors: ThemeColors;
  colorScheme: 'dark' | 'light';
};

function toneForInteraction(type: ClientActivity['interaction_type']) {
  switch (type) {
    case 'follow_up':
      return { bg: '#FDECC8', text: '#9A5A12' };
    case 'meeting':
      return { bg: '#DCECF2', text: '#27566B' };
    case 'email':
      return { bg: '#E7E4F7', text: '#5E4C9B' };
    case 'call':
      return { bg: '#D8EEDF', text: '#1F7A61' };
    default:
      return { bg: '#E8ECF0', text: '#526171' };
  }
}

export function ActivityHistory({
  activity,
  isFallback,
  pendingDeleteActivityId,
  pendingUpdateActivityId,
  editingActivityId,
  draftActivityNotesById,
  setDraftActivityNotesById,
  setEditingActivityId,
  updateActivity,
  deleteActivity,
  colors,
  colorScheme,
}: ActivityHistoryProps) {
  const isDark = colorScheme === 'dark';

  return (
    <ThemedView style={[styles.section, isDark && styles.sectionDark]}>
      <ThemedText style={styles.sectionLabel}>History</ThemedText>
      <ThemedText type="subtitle">Activity</ThemedText>
      <View style={styles.activityList}>
        {activity.length ? (
          activity.map((item) => {
            const tone = toneForInteraction(item.interaction_type);

            return (
              <View key={item.id} style={[styles.activityCard, isDark && styles.activityCardDark]}>
                <View style={styles.activityCardHeader}>
                  <View style={styles.activityIdentity}>
                    <View style={styles.activityDot} />
                    <View style={styles.activityIdentityCopy}>
                      <ThemedText
                        style={[
                          styles.activityType,
                          { backgroundColor: tone.bg, color: tone.text },
                        ]}>
                        {item.interaction_type.replace('_', ' ')}
                      </ThemedText>
                      <ThemedText style={styles.activityDate}>
                        {new Date(item.timestamp).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => void deleteActivity(item.id)}
                    disabled={
                      isFallback ||
                      pendingDeleteActivityId !== null ||
                      pendingUpdateActivityId !== null
                    }
                    style={styles.deleteLink}>
                    <ThemedText style={styles.deleteLinkText}>
                      {pendingDeleteActivityId === item.id ? 'Deleting...' : 'Delete'}
                    </ThemedText>
                  </Pressable>
                </View>

                {editingActivityId === item.id ? (
                  <View style={styles.activityEditor}>
                    <TextInput
                      value={draftActivityNotesById[item.id] ?? item.notes ?? ''}
                      onChangeText={(text) =>
                        setDraftActivityNotesById((current) => ({
                          ...current,
                          [item.id]: text,
                        }))
                      }
                      placeholder="Update activity notes"
                      placeholderTextColor="#94A3B8"
                      editable={!isFallback && pendingUpdateActivityId === null}
                      multiline
                      style={[
                        styles.activityInput,
                        styles.activityEditInput,
                        {
                          color: colors.text,
                          borderColor: colorScheme === 'dark' ? '#334155' : 'rgba(24,33,43,0.1)',
                          backgroundColor: colorScheme === 'dark' ? '#1A2530' : 'rgba(255,255,255,0.9)',
                        },
                      ]}
                    />
                    <View style={styles.activityEditorActions}>
                      <Pressable
                        onPress={() => {
                          setEditingActivityId(null);
                          setDraftActivityNotesById((current) => {
                            const next = { ...current };
                            delete next[item.id];
                            return next;
                          });
                        }}
                        disabled={pendingUpdateActivityId !== null}
                        style={styles.secondaryInlineButton}>
                        <ThemedText style={styles.secondaryInlineButtonText}>Cancel</ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={async () => {
                          const didUpdate = await updateActivity(
                            item.id,
                            (draftActivityNotesById[item.id] ?? item.notes ?? '').trim(),
                          );

                          if (didUpdate) {
                            setEditingActivityId(null);
                          }
                        }}
                        disabled={isFallback || pendingUpdateActivityId !== null}
                        style={styles.primaryInlineButton}>
                        <ThemedText style={styles.primaryInlineButtonText}>
                          {pendingUpdateActivityId === item.id ? 'Saving...' : 'Save'}
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <>
                    <ThemedText style={styles.detailText}>
                      {item.notes ?? 'No notes attached.'}
                    </ThemedText>
                    <Pressable
                      onPress={() => {
                        setEditingActivityId(item.id);
                        setDraftActivityNotesById((current) => ({
                          ...current,
                          [item.id]: item.notes ?? '',
                        }));
                      }}
                      disabled={isFallback || pendingDeleteActivityId !== null}
                      style={styles.editLink}>
                      <ThemedText style={styles.editLinkText}>Edit notes</ThemedText>
                    </Pressable>
                  </>
                )}
              </View>
            );
          })
        ) : (
          <ThemedText style={styles.detailMuted}>No activity logged yet.</ThemedText>
        )}
      </View>
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
  activityList: {
    gap: 12,
  },
  activityCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.08)',
    gap: 10,
  },
  activityCardDark: {
    borderColor: 'rgba(244,237,228,0.08)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  activityCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  activityIdentity: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  activityIdentityCopy: {
    gap: 8,
    flex: 1,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 10,
    backgroundColor: '#B85C38',
  },
  activityType: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  activityDate: {
    fontSize: 12,
    color: '#64748B',
  },
  deleteLink: {
    alignSelf: 'flex-start',
  },
  deleteLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
    textTransform: 'uppercase',
  },
  detailText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
  },
  detailMuted: {
    fontSize: 13,
    color: '#64748B',
  },
  activityEditor: {
    gap: 10,
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
  activityEditInput: {
    minHeight: 84,
  },
  activityEditorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  secondaryInlineButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  secondaryInlineButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  primaryInlineButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#18212B',
  },
  primaryInlineButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
    textTransform: 'uppercase',
  },
  editLink: {
    alignSelf: 'flex-start',
  },
  editLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18212B',
    textTransform: 'uppercase',
  },
});
