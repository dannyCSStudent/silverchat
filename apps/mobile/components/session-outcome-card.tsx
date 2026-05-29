import { useMemo } from 'react';

import { FreshnessLine } from '@/components/freshness-line';
import { ReadinessMetricList } from '@/components/readiness-metric-list';
import { SessionMemberCard } from '@/components/session-member-card';

type SessionOutcomeCardProps = {
  title?: string;
  sessionId: string;
  status?: string | null;
  currentUserRole: 'initiator' | 'recipient';
  createdAt?: string | null;
  endedAt?: string | null;
  durationLabel?: string | null;
  otherMember: {
    user_id: string;
    display_name: string;
    avatar_url?: string | null;
    country_code?: string | null;
  };
};

export function SessionOutcomeCard({
  title = 'Session detail',
  sessionId,
  status,
  currentUserRole,
  createdAt,
  endedAt,
  durationLabel,
  otherMember,
}: SessionOutcomeCardProps) {
  const computedDurationLabel = useMemo(() => {
    if (durationLabel) {
      return durationLabel;
    }

    if (!createdAt || !endedAt) {
      return null;
    }

    const startedAt = new Date(createdAt).getTime();
    const finishedAt = new Date(endedAt).getTime();
    if (Number.isNaN(startedAt) || Number.isNaN(finishedAt) || finishedAt <= startedAt) {
      return null;
    }

    const durationMinutes = Math.max(1, Math.round((finishedAt - startedAt) / 60000));
    return durationMinutes === 1 ? 'About 1 minute' : `${durationMinutes} minutes`;
  }, [createdAt, durationLabel, endedAt]);

  return (
    <SessionMemberCard
      title={title}
      member={otherMember}
      footer={
        <>
          <FreshnessLine prefix="Started" timestamp={createdAt ?? null} />
          <FreshnessLine prefix="Ended" timestamp={endedAt ?? null} />
          <ReadinessMetricList
            metrics={[
              { label: 'Session id', value: sessionId },
              { label: 'Status', value: status ?? 'matched' },
              { label: 'Role', value: currentUserRole },
              { label: 'Length', value: computedDurationLabel ?? '—' },
            ]}
          />
        </>
      }
    />
  );
}
