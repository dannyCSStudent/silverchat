import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { BadgePill } from '@/components/crm/badge-pill';
import { CRMHero } from '@/components/crm/crm-hero';
import { FilterChip } from '@/components/crm/filter-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useClientOptions } from '@/hooks/use-mobile-crm-options';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiBaseUrl, ClientStatus } from '@/lib/crm';
import { emitCRMDataChanged } from '@/lib/mobile-sync';

export default function CreateClientActionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { clients, error: clientsError, isFallback } = useClientOptions();
  const [status, setStatus] = useState<ClientStatus>('lead');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [profileFailed, setProfileFailed] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function createClient() {
    if (!name.trim()) {
      setError('Client name is required.');
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Record<string, string | null> & { name: string; status: ClientStatus } = {
        name: name.trim(),
        email: email.trim() || null,
        notes: notes.trim() || null,
        phone: phone.trim() || null,
        status,
      };

      if (profileImageUrl.trim()) {
        payload.profile_image_url = profileImageUrl.trim();
      }

      if (bannerImageUrl.trim()) {
        payload.banner_image_url = bannerImageUrl.trim();
      }

      const response = await fetch(`${apiBaseUrl}/clients/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      setSuccess('Client created.');
      emitCRMDataChanged();
      setName('');
      setEmail('');
      setPhone('');
      setProfileImageUrl('');
      setBannerImageUrl('');
      setProfileFailed(false);
      setBannerFailed(false);
      setNotes('');
      setStatus('lead');
    } catch {
      setError('Unable to create client.');
    } finally {
      setPending(false);
    }
  }

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
            <Link href="/modal" dismissTo style={styles.closeLink}>
              <ThemedText style={styles.closeLinkText}>Back to hub</ThemedText>
            </Link>
          </View>
        }
        copy="Create a new client in a focused workflow without mixing activity and tag operations into the same surface."
        title="Create Client"
      />

      <ThemedView style={[styles.section, isDark && styles.sectionDark]}>
        <ThemedText style={styles.sectionLabel}>Pipeline</ThemedText>
        <ThemedText type="subtitle">Pipeline</ThemedText>
        <ThemedText style={styles.helperText}>
          Existing roster: {clients.length} clients
        </ThemedText>
        <View style={styles.chipRow}>
          {(['lead', 'active', 'completed'] as ClientStatus[]).map((option) => (
            <FilterChip
              key={option}
              label={option}
              onPress={() => setStatus(option)}
              selected={status === option}
            />
          ))}
        </View>
      </ThemedView>

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

      <ThemedView style={[styles.section, isDark && styles.sectionDark]}>
        <ThemedText style={styles.sectionLabel}>Details</ThemedText>
        <ThemedText type="subtitle">Client Details</ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Client name"
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
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
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
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone"
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
          value={profileImageUrl}
          onChangeText={(value) => {
            setProfileFailed(false);
            setProfileImageUrl(value);
          }}
          placeholder="Profile image URL"
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
        <ThemedText style={styles.helperText}>
          Profile image: square headshot works best. Use a direct `https://` image URL.
        </ThemedText>
        <TextInput
          value={bannerImageUrl}
          onChangeText={(value) => {
            setBannerFailed(false);
            setBannerImageUrl(value);
          }}
          placeholder="Banner image URL"
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
        <ThemedText style={styles.helperText}>
          Banner image: wide image works best, roughly 3:1 or 4:1.
        </ThemedText>
        {profileImageUrl || bannerImageUrl ? (
          <View style={[styles.previewCard, isDark && styles.previewCardDark]}>
            <ThemedText style={styles.previewLabel}>Image preview</ThemedText>
            <View style={styles.previewShell}>
              <View style={styles.previewBanner}>
                {bannerImageUrl && !bannerFailed ? (
                  <Image
                    source={{ uri: bannerImageUrl }}
                    style={styles.previewBannerImage}
                    onError={() => setBannerFailed(true)}
                  />
                ) : (
                  <View style={styles.previewBannerFallback} />
                )}
              </View>
              <View style={styles.previewAvatarFrame}>
                {profileImageUrl && !profileFailed ? (
                  <Image
                    source={{ uri: profileImageUrl }}
                    style={styles.previewAvatarImage}
                    onError={() => setProfileFailed(true)}
                  />
                ) : (
                  <View style={styles.previewAvatarFallback}>
                    <ThemedText style={styles.previewAvatarFallbackText}>
                      {(name.trim() || '?').slice(0, 1).toUpperCase()}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : null}
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes"
          placeholderTextColor="#94A3B8"
          multiline
          style={[
            styles.textarea,
            {
              color: colors.text,
              borderColor: colorScheme === 'dark' ? '#334155' : 'rgba(24,33,43,0.1)',
              backgroundColor: colorScheme === 'dark' ? '#1A2530' : 'rgba(255,255,255,0.9)',
            },
          ]}
        />
        <View style={styles.buttonRow}>
          <Pressable disabled={pending} onPress={() => void createClient()} style={styles.primaryButton}>
            <ThemedText style={styles.primaryButtonText}>
              {pending ? 'Creating...' : 'Create client'}
            </ThemedText>
          </Pressable>
          <Pressable
            disabled={pending}
            onPress={() => router.back()}
            style={[styles.secondaryButton, isDark && styles.secondaryButtonDark]}>
            
            <ThemedText style={styles.secondaryButtonText}>Done</ThemedText>
          </Pressable>
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
  textarea: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 15,
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
