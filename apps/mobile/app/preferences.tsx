import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BadgePill } from '@/components/crm/badge-pill';
import { CRMHero } from '@/components/crm/crm-hero';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemePreference, useThemePreference } from '@/lib/theme-preference';

export default function PreferencesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const themePreference = useThemePreference();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <CRMHero
        backgroundColor={isDark ? '#1E2730' : '#F3E9DC'}
        badge={
          <BadgePill style={styles.badge}>
            {themePreference?.preference === 'system'
              ? `Following ${colorScheme}`
              : `${themePreference?.preference ?? colorScheme} locked`}
          </BadgePill>
        }
        copy="Keep appearance controls in a stable place so testing and handoff reviews do not depend on the quick-actions modal."
        title="Preferences"
      />

      <ThemedView style={[styles.section, isDark && styles.sectionDark]}>
        <View style={styles.modeRow}>
          <View style={[styles.modeCard, styles.modeCardPrimary, isDark && styles.modeCardPrimaryDark]}>
            <ThemedText style={styles.modeLabel}>Current Mode</ThemedText>
            <ThemedText style={styles.modeValue}>
              {themePreference?.preference === 'system'
                ? `Following ${colorScheme}`
                : `${themePreference?.preference ?? colorScheme} locked`}
            </ThemedText>
          </View>
          <View
            style={[
              styles.modeCard,
              styles.modeCardSecondary,
              isDark && styles.modeCardSecondaryDark,
            ]}>
            <ThemedText style={styles.modeLabel}>Theme Source</ThemedText>
            <ThemedText style={styles.modeValue}>
              {themePreference?.preference === 'system' ? 'Device setting' : 'Manual override'}
            </ThemedText>
          </View>
        </View>
      </ThemedView>

      <ThemedView style={[styles.section, isDark && styles.sectionDark]}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Appearance</ThemedText>
          <ThemedText style={styles.sectionMeta}>App theme</ThemedText>
        </View>
        <ThemedText style={styles.helperText}>
          Choose a fixed light or dark theme, or follow the device setting when native theme
          detection is reliable.
        </ThemedText>
        <View style={styles.themeRow}>
          {(['system', 'light', 'dark'] as ThemePreference[]).map((option) => {
            const selected = themePreference?.preference === option;

            return (
              <Pressable
                key={option}
                onPress={() => themePreference?.setPreference(option)}
                style={[
                  styles.themeChip,
                  isDark && styles.themeChipDark,
                  selected && styles.themeChipSelected,
                ]}>
                <ThemedText
                  style={[styles.themeChipText, selected && styles.themeChipTextSelected]}>
                  {option}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.noteCard, isDark && styles.noteCardDark]}>
          <ThemedText style={styles.noteLabel}>Why this exists</ThemedText>
          <ThemedText style={styles.noteText}>
            Use `System` for normal device behavior. Switch to `Dark` or `Light` when reviewing
            UI states in the emulator or during design QA.
          </ThemedText>
        </View>
      </ThemedView>

      <ThemedView style={[styles.section, isDark && styles.sectionDark]}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Preview</ThemedText>
          <ThemedText style={styles.sectionMeta}>Surface language</ThemedText>
        </View>
        <ThemedText style={styles.helperText}>
          This is the intended visual stack for the mobile CRM: warm ambient canvas, elevated
          cards, and a restrained accent layer.
        </ThemedText>
        <View style={styles.previewGrid}>
          <View
            style={[styles.previewCard, styles.previewPrimary, isDark && styles.previewPrimaryDark]}>
            <ThemedText style={styles.previewLabel}>Canvas</ThemedText>
            <ThemedText style={styles.previewValue}>
              {isDark ? 'Dark slate' : 'Warm paper'}
            </ThemedText>
          </View>
          <View
            style={[
              styles.previewCard,
              styles.previewSecondary,
              isDark && styles.previewSecondaryDark,
            ]}>
            <ThemedText style={styles.previewLabel}>Surface</ThemedText>
            <ThemedText style={styles.previewValue}>
              {isDark ? 'Smoked glass' : 'Soft card'}
            </ThemedText>
          </View>
          <View style={[styles.previewAccentBand, isDark && styles.previewAccentBandDark]}>
            <View style={[styles.previewAccentSwatch, styles.previewAccentWarm]} />
            <View style={[styles.previewAccentSwatch, styles.previewAccentCool]} />
            <View style={[styles.previewAccentSwatch, styles.previewAccentNeutral]} />
          </View>
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
  badge: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
  },
  modeRow: {
    gap: 12,
  },
  modeCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    gap: 6,
  },
  modeCardPrimary: {
    borderColor: 'rgba(24,33,43,0.08)',
    backgroundColor: '#FFF8F2',
  },
  modeCardPrimaryDark: {
    borderColor: 'rgba(244,237,228,0.08)',
    backgroundColor: '#151B22',
  },
  modeCardSecondary: {
    borderColor: 'rgba(24,33,43,0.08)',
    backgroundColor: '#F7F1E8',
  },
  modeCardSecondaryDark: {
    borderColor: 'rgba(244,237,228,0.08)',
    backgroundColor: '#1E2730',
  },
  modeLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: '#6D7A88',
  },
  modeValue: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  themeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  noteCard: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.08)',
    backgroundColor: 'rgba(255,255,255,0.62)',
    gap: 6,
  },
  noteCardDark: {
    borderColor: 'rgba(244,237,228,0.08)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  noteLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: '#6D7A88',
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#526171',
  },
  previewGrid: {
    gap: 12,
  },
  previewCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
  },
  previewPrimary: {
    borderColor: 'rgba(24,33,43,0.08)',
    backgroundColor: '#FFF8F2',
  },
  previewPrimaryDark: {
    borderColor: 'rgba(244,237,228,0.08)',
    backgroundColor: '#151B22',
  },
  previewSecondary: {
    borderColor: 'rgba(24,33,43,0.08)',
    backgroundColor: '#F7F1E8',
  },
  previewSecondaryDark: {
    borderColor: 'rgba(244,237,228,0.08)',
    backgroundColor: '#1E2730',
  },
  previewAccentBand: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.08)',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  previewAccentBandDark: {
    borderColor: 'rgba(244,237,228,0.08)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  previewAccentSwatch: {
    flex: 1,
    height: 48,
    borderRadius: 16,
  },
  previewAccentWarm: {
    backgroundColor: '#D98A62',
  },
  previewAccentCool: {
    backgroundColor: '#27566B',
  },
  previewAccentNeutral: {
    backgroundColor: '#C9B8A3',
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: '#64748B',
  },
  previewValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700',
  },
});
