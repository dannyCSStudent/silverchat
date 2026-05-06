import { Dispatch, SetStateAction, useState } from 'react';
import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { Client, ClientStatus, statusTone } from '@/lib/crm';

type ThemeColors = (typeof Colors)['light'];

type ClientDetailFormProps = {
  client: Client;
  colorScheme: 'dark' | 'light';
  colors: ThemeColors;
  draftStatus: ClientStatus;
  setDraftStatus: Dispatch<SetStateAction<ClientStatus>>;
  draftEmail: string;
  setDraftEmail: Dispatch<SetStateAction<string>>;
  draftPhone: string;
  setDraftPhone: Dispatch<SetStateAction<string>>;
  draftProfileImageUrl: string;
  setDraftProfileImageUrl: Dispatch<SetStateAction<string>>;
  draftBannerImageUrl: string;
  setDraftBannerImageUrl: Dispatch<SetStateAction<string>>;
  draftLastContact: string;
  setDraftLastContact: Dispatch<SetStateAction<string>>;
  draftNotes: string;
  setDraftNotes: Dispatch<SetStateAction<string>>;
  isFallback: boolean;
  pendingContact: boolean;
  onSave: () => Promise<boolean>;
};

export function ClientDetailForm({
  client,
  colorScheme,
  colors,
  draftStatus,
  setDraftStatus,
  draftEmail,
  setDraftEmail,
  draftPhone,
  setDraftPhone,
  draftProfileImageUrl,
  setDraftProfileImageUrl,
  draftBannerImageUrl,
  setDraftBannerImageUrl,
  draftLastContact,
  setDraftLastContact,
  draftNotes,
  setDraftNotes,
  isFallback,
  pendingContact,
  onSave,
}: ClientDetailFormProps) {
  const isDark = colorScheme === 'dark';
  const [bannerFailed, setBannerFailed] = useState(false);
  const [profileFailed, setProfileFailed] = useState(false);

  return (
    <ThemedView style={[styles.section, isDark && styles.sectionDark]}>
      <ThemedText style={styles.sectionLabel}>Profile</ThemedText>
      <ThemedText type="subtitle">Client details</ThemedText>
      <ThemedText style={styles.detailMuted}>
        Update pipeline status, contact details, and notes in one form.
      </ThemedText>
      <View style={styles.chipRow}>
        {(['lead', 'active', 'completed'] as ClientStatus[]).map((status) => {
          const isSelected = draftStatus === status;
          const statusColors = statusTone[status];

          return (
            <Pressable
              key={status}
              onPress={() => setDraftStatus(status)}
              disabled={isFallback || pendingContact}
              style={[
                styles.actionChip,
                isDark && styles.actionChipDark,
                isSelected && {
                  backgroundColor: statusColors.bg,
                  borderColor: statusColors.text,
                },
              ]}>
              <ThemedText
                style={[styles.actionChipText, isSelected && { color: statusColors.text }]}>
                {status}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={draftEmail}
        onChangeText={setDraftEmail}
        placeholder="Email"
        placeholderTextColor="#94A3B8"
        editable={!isFallback && !pendingContact}
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
        value={draftPhone}
        onChangeText={setDraftPhone}
        placeholder="Phone"
        placeholderTextColor="#94A3B8"
        editable={!isFallback && !pendingContact}
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
        value={draftProfileImageUrl}
        onChangeText={(value) => {
          setProfileFailed(false);
          setDraftProfileImageUrl(value);
        }}
        placeholder="Profile image URL"
        placeholderTextColor="#94A3B8"
        editable={!isFallback && !pendingContact}
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
      <ThemedText style={styles.detailMuted}>
        Profile image: square headshot works best. Use a direct `https://` image URL.
      </ThemedText>
      <TextInput
        value={draftBannerImageUrl}
        onChangeText={(value) => {
          setBannerFailed(false);
          setDraftBannerImageUrl(value);
        }}
        placeholder="Banner image URL"
        placeholderTextColor="#94A3B8"
        editable={!isFallback && !pendingContact}
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
      <ThemedText style={styles.detailMuted}>
        Banner image: wide image works best, roughly 3:1 or 4:1.
      </ThemedText>
      {draftProfileImageUrl || draftBannerImageUrl ? (
        <View style={[styles.previewCard, isDark && styles.previewCardDark]}>
          <ThemedText style={styles.previewLabel}>Image preview</ThemedText>
          <View style={styles.previewShell}>
            <View style={styles.previewBanner}>
              {draftBannerImageUrl && !bannerFailed ? (
                <Image
                  source={{ uri: draftBannerImageUrl }}
                  style={styles.previewBannerImage}
                  onError={() => setBannerFailed(true)}
                />
              ) : (
                <View style={styles.previewBannerFallback} />
              )}
            </View>
            <View style={styles.previewAvatarFrame}>
              {draftProfileImageUrl && !profileFailed ? (
                <Image
                  source={{ uri: draftProfileImageUrl }}
                  style={styles.previewAvatarImage}
                  onError={() => setProfileFailed(true)}
                />
              ) : (
                <View style={styles.previewAvatarFallback}>
                  <ThemedText style={styles.previewAvatarFallbackText}>
                    {client.name.slice(0, 1).toUpperCase()}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>
      ) : null}
      <TextInput
        value={draftLastContact}
        onChangeText={setDraftLastContact}
        placeholder="YYYY-MM-DDTHH:MM"
        placeholderTextColor="#94A3B8"
        editable={!isFallback && !pendingContact}
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
        value={draftNotes}
        onChangeText={setDraftNotes}
        placeholder="Add notes about this client"
        placeholderTextColor="#94A3B8"
        editable={!isFallback && !pendingContact}
        multiline
        style={[
          styles.activityInput,
          styles.notesInput,
          {
            color: colors.text,
            borderColor: colorScheme === 'dark' ? '#334155' : 'rgba(24,33,43,0.1)',
            backgroundColor: colorScheme === 'dark' ? '#1A2530' : 'rgba(255,255,255,0.9)',
          },
        ]}
      />
      <Pressable
        onPress={() => {
          void onSave();
        }}
        disabled={isFallback || pendingContact}
        style={styles.primaryButton}>
        <ThemedText style={styles.primaryButtonText}>
          {pendingContact ? 'Saving...' : 'Save client details'}
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
    lineHeight: 19,
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
  input: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  activityInput: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  notesInput: {
    minHeight: 160,
  },
  previewCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.08)',
    backgroundColor: 'rgba(255,255,255,0.62)',
    padding: 14,
    gap: 10,
  },
  previewCardDark: {
    borderColor: 'rgba(244,237,228,0.08)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  previewLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: '#6D7A88',
  },
  previewShell: {
    gap: 0,
  },
  previewBanner: {
    height: 84,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#D9E4EA',
  },
  previewBannerImage: {
    width: '100%',
    height: '100%',
  },
  previewBannerFallback: {
    flex: 1,
    backgroundColor: '#D9E4EA',
  },
  previewAvatarFrame: {
    marginTop: -26,
    marginLeft: 14,
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#FFF8F2',
  },
  previewAvatarImage: {
    width: '100%',
    height: '100%',
  },
  previewAvatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3D8CA',
  },
  previewAvatarFallbackText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9F4B2B',
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
