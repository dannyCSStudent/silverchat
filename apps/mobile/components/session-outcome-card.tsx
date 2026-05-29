import { FreshnessLine } from '@/components/freshness-line';
import { ReadinessMetricList } from '@/components/readiness-metric-list';
import { SessionMemberCard } from '@/components/session-member-card';

type SessionOutcomeCardProps = {
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
  sessionId,
  status,
  currentUserRole,
  createdAt,
  endedAt,
  durationLabel,
  otherMember,
}: SessionOutcomeCardProps) {
  return (
    <SessionMemberCard
      title="Session detail"
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
              { label: 'Length', value: durationLabel ?? '—' },
            ]}
          />
        </>
      }
    />
  );
}
