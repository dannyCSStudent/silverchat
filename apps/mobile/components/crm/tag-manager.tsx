import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ClientTag } from '@/lib/crm';

type TagManagerProps = {
  assignedTags: ClientTag[];
  availableTags: ClientTag[];
  isFallback: boolean;
  pending: boolean;
  onAssignTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
};

export function TagManager({
  assignedTags,
  availableTags,
  isFallback,
  pending,
  onAssignTag,
  onRemoveTag,
}: TagManagerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  return (
    <ThemedView
      style={[
        styles.section,
        isDark && styles.sectionDark,
      ]}>
      <ThemedText style={styles.sectionLabel}>Organization</ThemedText>
      <ThemedText type="subtitle">Tags</ThemedText>
      <View style={styles.tagRow}>
        {assignedTags.length ? (
          assignedTags.map((tag) => (
            <Pressable
              key={tag.id}
              onPress={() => onRemoveTag(tag.id)}
              disabled={isFallback || pending}
              style={[
                styles.tagPill,
                styles.tagActionPill,
                { backgroundColor: `${tag.color}22`, borderColor: `${tag.color}66` },
              ]}>
              <ThemedText style={[styles.tagText, { color: tag.color }]}>
                {pending ? 'Updating...' : `${tag.name} ×`}
              </ThemedText>
            </Pressable>
          ))
        ) : (
          <ThemedText style={styles.helperText}>No tags assigned</ThemedText>
        )}
      </View>
      <ThemedText style={styles.helperText}>Tap an assigned tag to remove it.</ThemedText>
      <View style={styles.tagRow}>
        {availableTags.length ? (
          availableTags.map((tag) => (
            <Pressable
              key={tag.id}
              onPress={() => onAssignTag(tag.id)}
              disabled={isFallback || pending}
              style={[
                styles.tagPill,
                styles.tagActionPill,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                  borderColor: `${tag.color}66`,
                },
              ]}>
              <ThemedText style={[styles.tagText, { color: tag.color }]}>
                {pending ? 'Updating...' : `+ ${tag.name}`}
              </ThemedText>
            </Pressable>
          ))
        ) : (
          <ThemedText style={styles.helperText}>All available tags are assigned.</ThemedText>
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
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  tagActionPill: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
  },
});
