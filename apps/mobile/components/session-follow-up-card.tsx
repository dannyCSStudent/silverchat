import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { authorizedApiRequest } from '@/lib/api';
import type { Session } from '@supabase/supabase-js';

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'scam', label: 'Scam' },
  { id: 'other', label: 'Other' },
] as const;

type SessionFollowUpCardProps = {
  session: Session;
  sessionId: string;
  otherUserId: string;
  alreadyReported: boolean;
  alreadyBlocked: boolean;
  title?: string;
  intro?: string;
  contextHint?: string | null;
  footerHint?: string | null;
  onSubmitted?: () => void;
};

export function SessionFollowUpCard({
  session,
  sessionId,
  otherUserId,
  alreadyReported,
  alreadyBlocked,
  title = 'Follow up',
  intro = 'Block the member or file a report from this session detail.',
  contextHint,
  footerHint,
  onSubmitted,
}: SessionFollowUpCardProps) {
  const [reportReason, setReportReason] = useState<(typeof REPORT_REASONS)[number]['id']>('spam');
  const [actionNote, setActionNote] = useState('');
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'report' | 'block' | null>(null);

  const actionStateCopy = useMemo(() => {
    if (alreadyBlocked && alreadyReported) {
      return 'You already reported and blocked this member from this session.';
    }

    if (alreadyBlocked) {
      return 'You already blocked this member.';
    }

    if (alreadyReported) {
      return 'You already reported this member from this session.';
    }

    return null;
  }, [alreadyBlocked, alreadyReported]);

  const handleReport = async () => {
    setBusyAction('report');
    setActionStatus(null);

    try {
      await authorizedApiRequest(session, '/reports', {
        method: 'POST',
        body: JSON.stringify({
          reported_user_id: otherUserId,
          reason: reportReason,
          details: actionNote.trim() || undefined,
          session_id: sessionId,
        }),
      });
      setActionStatus('Report submitted.');
      onSubmitted?.();
    } catch (requestError) {
      setActionStatus(requestError instanceof Error ? requestError.message : 'Unable to submit report.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleBlock = async () => {
    setBusyAction('block');
    setActionStatus(null);

    try {
      await authorizedApiRequest(session, '/blocks', {
        method: 'POST',
        body: JSON.stringify({
          blocked_user_id: otherUserId,
          reason: actionNote.trim() || undefined,
        }),
      });
      setActionStatus('Block saved.');
      onSubmitted?.();
    } catch (requestError) {
      setActionStatus(requestError instanceof Error ? requestError.message : 'Unable to block member.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <ThemedView style={styles.card}>
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText style={styles.cardCopy}>{intro}</ThemedText>
      {contextHint ? <ThemedText style={styles.cardCopy}>{contextHint}</ThemedText> : null}
      {actionStateCopy ? <ThemedText style={styles.cardCopy}>{actionStateCopy}</ThemedText> : null}

      <View style={styles.reasonRow}>
        {REPORT_REASONS.map((reason) => (
          <Pressable
            key={reason.id}
            onPress={() => setReportReason(reason.id)}
            style={[
              styles.reasonChip,
              reportReason === reason.id ? styles.reasonChipActive : undefined,
            ]}
          >
            <ThemedText
              style={[
                styles.reasonChipText,
                reportReason === reason.id ? styles.reasonChipTextActive : undefined,
              ]}
            >
              {reason.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <TextInput
        placeholder="Optional note for the report or block"
        placeholderTextColor="rgba(39,86,107,0.52)"
        value={actionNote}
        onChangeText={setActionNote}
        style={styles.input}
        multiline
      />

      {actionStatus ? <ThemedText style={styles.cardCopy}>{actionStatus}</ThemedText> : null}

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => void handleReport()}
          disabled={busyAction !== null || alreadyReported}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.buttonPressed : undefined,
            busyAction === 'report' ? styles.buttonDisabled : undefined,
            alreadyReported ? styles.buttonDisabled : undefined,
          ]}
        >
          <ThemedText style={styles.primaryButtonText}>
            {alreadyReported ? 'Already reported' : busyAction === 'report' ? 'Submitting...' : `Report ${reportReason}`}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => void handleBlock()}
          disabled={busyAction !== null || alreadyBlocked}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed ? styles.buttonPressed : undefined,
            busyAction === 'block' ? styles.buttonDisabled : undefined,
            alreadyBlocked ? styles.buttonDisabled : undefined,
          ]}
        >
          <ThemedText style={styles.secondaryButtonText}>
            {alreadyBlocked ? 'Already blocked' : busyAction === 'block' ? 'Blocking...' : 'Block member'}
          </ThemedText>
        </Pressable>
      </View>

      {footerHint ? <ThemedText style={styles.cardCopy}>{footerHint}</ThemedText> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 18, gap: 12 },
  cardCopy: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  reasonChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.16)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  reasonChipActive: {
    backgroundColor: 'rgba(39,86,107,0.12)',
    borderColor: 'rgba(39,86,107,0.4)',
  },
  reasonChipText: { color: '#27566B', fontWeight: '600' },
  reasonChipTextActive: { fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 88,
    textAlignVertical: 'top',
    borderColor: 'rgba(39,86,107,0.24)',
    color: '#18212B',
    backgroundColor: 'transparent',
  },
  actionRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: '#27566B',
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.24)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#27566B', fontWeight: '700' },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.6 },
});
