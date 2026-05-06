import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BadgePill } from '@/components/crm/badge-pill';
import { CRMHero } from '@/components/crm/crm-hero';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useClientOptions, useTagOptions } from '@/hooks/use-mobile-crm-options';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemePreference, useThemePreference } from '@/lib/theme-preference';

export default function ModalScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const themePreference = useThemePreference();
  const { clients, error: clientsError, isFallback } = useClientOptions();
  const { assignments, error: tagsError, isFallback: tagsFallback, tags } = useTagOptions();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <CRMHero
        backgroundColor={colorScheme === 'dark' ? '#1E2730' : '#F3E9DC'}
        badge={
          <View style={styles.heroMeta}>
            <BadgePill style={isFallback ? styles.badgeWarn : styles.badgeOk}>
              {isFallback ? 'Fallback clients' : 'Live clients'}
            </BadgePill>
            <Link href="/" dismissTo style={styles.closeLink}>
              <ThemedText style={styles.closeLinkText}>Close</ThemedText>
            </Link>
          </View>
        }
        copy="Choose a focused mobile workflow instead of stacking create, log, and tag management into one screen."
        title="Quick Actions"
      />

      <ThemedView style={[styles.section, isDark && styles.sectionDark]}>
        <ThemedText type="subtitle">Theme</ThemedText>
        <ThemedText style={styles.helperText}>
          This is a quick override. The permanent appearance control now also lives in the
          Preferences tab.
        </ThemedText>
        <View style={styles.themeRow}>
          {(['system', 'light', 'dark'] as ThemePreference[]).map((option) => (
            <Pressable
              key={option}
              onPress={() => themePreference?.setPreference(option)}
              style={[
                styles.themeChip,
                isDark && styles.themeChipDark,
                themePreference?.preference === option && styles.themeChipSelected,
              ]}>
              <ThemedText
                style={[
                  styles.themeChipText,
                  themePreference?.preference === option && styles.themeChipTextSelected,
                ]}>
                {option}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </ThemedView>

      <ThemedView style={[styles.section, isDark && styles.sectionDark]}>
        <ThemedText type="subtitle">Workspace</ThemedText>
        <ThemedText style={styles.helperText}>
          Each route below is purpose-built for one job, which keeps mobile input faster and easier to scan.
        </ThemedText>
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

      <View style={styles.cardGrid}>
        <Link href="/actions/client" style={styles.actionCard}>
          <ThemedView style={[styles.actionCardInner, isDark && styles.actionCardInnerDark]}>
            <BadgePill style={styles.badgeOk}>Create</BadgePill>
            <ThemedText type="subtitle">New Client</ThemedText>
            <ThemedText style={styles.cardCopy}>
              Add a client with contact details, notes, and starting pipeline status.
            </ThemedText>
            <ThemedText style={styles.cardMeta}>{clients.length} clients in roster</ThemedText>
          </ThemedView>
        </Link>

        <Link href="/actions/activity" style={styles.actionCard}>
          <ThemedView style={[styles.actionCardInner, isDark && styles.actionCardInnerDark]}>
            <BadgePill style={styles.badgeOk}>Log</BadgePill>
            <ThemedText type="subtitle">Activity</ThemedText>
            <ThemedText style={styles.cardCopy}>
              Capture calls, meetings, emails, follow-ups, and notes against a selected client.
            </ThemedText>
            <ThemedText style={styles.cardMeta}>Uses the current client roster</ThemedText>
          </ThemedView>
        </Link>

        <Link href="/actions/tags" style={styles.actionCard}>
          <ThemedView style={[styles.actionCardInner, isDark && styles.actionCardInnerDark]}>
            <BadgePill style={tagsFallback ? styles.badgeWarn : styles.badgeOk}>
              {tagsFallback ? 'Fallback tags' : 'Live tags'}
            </BadgePill>
            <ThemedText type="subtitle">Tags</ThemedText>
            <ThemedText style={styles.cardCopy}>
              Create, edit, assign, and remove tags in a dedicated management workspace.
            </ThemedText>
            <ThemedText style={styles.cardMeta}>
              {tags.length} tags and {assignments.length} assignments
            </ThemedText>
          </ThemedView>
        </Link>
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
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardGrid: {
    gap: 12,
  },
  themeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionCard: {
    display: 'flex',
  },
  actionCardInner: {
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.08)',
    backgroundColor: 'rgba(255,251,245,0.82)',
    gap: 12,
  },
  actionCardInnerDark: {
    borderColor: 'rgba(244,237,228,0.08)',
    backgroundColor: 'rgba(24,33,43,0.82)',
  },
  cardCopy: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },
  cardMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18212B',
    textTransform: 'uppercase',
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
  badgeWarn: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  badgeOk: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },
  helperText: {
    fontSize: 13,
    color: '#64748B',
  },
  themeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.1)',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  themeChipDark: {
    borderColor: 'rgba(244,237,228,0.1)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  themeChipSelected: {
    borderColor: '#B85C38',
    backgroundColor: '#F3D8CA',
  },
  themeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'capitalize',
  },
  themeChipTextSelected: {
    color: '#9F4B2B',
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
});
