import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { apiRequest } from '@/lib/api';
import { supabase, supabaseEnvError } from '@/lib/supabase';

type SessionState = {
  user: {
    id: string;
    email?: string;
    phone?: string;
    email_confirmed_at?: string;
  };
  profile_exists: boolean;
  onboarding_complete: boolean;
};

type ProfileRecord = {
  user_id: string;
  display_name: string;
  date_of_birth: string;
  bio?: string;
  avatar_url?: string;
  country_code?: string;
  age_verified_status: 'pending' | 'self_attested' | 'verified' | 'rejected';
  profile_status: 'pending' | 'active' | 'paused' | 'banned';
  safety_notes?: string;
  onboarding_completed_at?: string;
};

type InterestRecord = {
  id: string;
  name: string;
  category?: string;
};

type UserInterestRecord = {
  user_id: string;
  interest_id: string;
};

type QueueEntryRecord = {
  user_id: string;
  queued_at?: string;
  last_active_at?: string;
  preferred_language?: string;
  country_code?: string;
  is_available: boolean;
};

type MatchJoinResponse = {
  match_context?: {
    pool: 'preferred' | 'fallback';
    reason: string;
    shared_interests: string[];
  } | null;
  status: 'queued' | 'matched';
  queue_entry?: QueueEntryRecord | null;
  session_id?: string | null;
  matched_profile?: {
    user_id: string;
    display_name: string;
    avatar_url?: string;
    country_code?: string;
  } | null;
};

type QueueStatusResponse = {
  queue_entry?: QueueEntryRecord | null;
  queue_position?: number | null;
  queue_size?: number;
  members_ahead?: number | null;
};

type MatchPreviewResponse = {
  generated_at: string;
  available_candidates: number;
  fallback_candidates: number;
  preferred_candidates: number;
  recommendation: string;
  recommendation_reason: string;
  recommended_pool: 'preferred' | 'fallback' | 'queue';
  top_shared_category?: string | null;
  top_shared_category_count?: number | null;
  top_shared_interest?: string | null;
  shared_interests: string[];
};

type SaveProfileInput = {
  display_name: string;
  date_of_birth: string;
  bio?: string;
  avatar_url?: string;
  country_code?: string;
  age_verified_status?: 'pending' | 'self_attested' | 'verified' | 'rejected';
  profile_status?: 'pending' | 'active' | 'paused' | 'banned';
};

type AuthContextValue = {
  availableInterests: InterestRecord[];
  emailAddress: string | null;
  emailVerified: boolean;
  envError: string | null;
  hasCompletedInterests: boolean;
  hasCompletedProfile: boolean;
  initialized: boolean;
  interests: string[];
  loading: boolean;
  message: string | null;
  matchPreview: MatchPreviewResponse | null;
  lastSyncedAt: string | null;
  queueEntry: QueueEntryRecord | null;
  queuePosition: number | null;
  queueSize: number;
  membersAhead: number | null;
  onboardingChecklist: Array<{
    complete: boolean;
    id: 'email' | 'profile' | 'interests' | 'onboarding';
    label: string;
  }>;
  queueEligible: boolean;
  profile: ProfileRecord | null;
  session: Session | null;
  sessionState: SessionState | null;
  joinQueue: () => Promise<MatchJoinResponse>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  user: User | null;
  clearMessage: () => void;
  refreshData: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  saveInterests: (interestIds: string[]) => Promise<void>;
  saveProfile: (payload: SaveProfileInput) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AccountSnapshot = {
  availableInterests: InterestRecord[];
  interests: string[];
  profile: ProfileRecord | null;
  sessionState: SessionState | null;
  queueEntry: QueueEntryRecord | null;
  queuePosition: number | null;
  queueSize: number;
  membersAhead: number | null;
};

async function authorizedRequest<T>(session: Session, path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return apiRequest<T>(path, {
    ...options,
    headers,
  });
}

async function loadAccountSnapshot(nextSession: Session | null): Promise<AccountSnapshot> {
  const availableInterests = await apiRequest<InterestRecord[]>('/interests/');

  if (!nextSession) {
    return {
      availableInterests,
      interests: [],
      profile: null,
      sessionState: null,
      queueEntry: null,
      queuePosition: null,
      queueSize: 0,
      membersAhead: null,
    };
  }

  const [sessionState, profile, userInterests, queueStatus] = await Promise.all([
    authorizedRequest<SessionState>(nextSession, '/auth/session'),
    authorizedRequest<ProfileRecord | null>(nextSession, '/profiles/me'),
    authorizedRequest<UserInterestRecord[]>(nextSession, '/interests/me'),
    authorizedRequest<QueueStatusResponse>(nextSession, '/match/queue'),
  ]);

  return {
    availableInterests,
    interests: userInterests.map((item) => item.interest_id),
    profile,
    sessionState,
    queueEntry: queueStatus.queue_entry ?? null,
    queuePosition: queueStatus.queue_position ?? null,
    queueSize: queueStatus.queue_size ?? 0,
    membersAhead: queueStatus.members_ahead ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [availableInterests, setAvailableInterests] = useState<InterestRecord[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [matchPreview, setMatchPreview] = useState<MatchPreviewResponse | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [queueEntry, setQueueEntry] = useState<QueueEntryRecord | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [queueSize, setQueueSize] = useState(0);
  const [membersAhead, setMembersAhead] = useState<number | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const lastRefreshAtRef = useRef(0);
  const emailAddress = user?.email ?? sessionState?.user.email ?? null;
  const emailVerified = Boolean(
    sessionState?.user.email_confirmed_at ?? (user as User & { email_confirmed_at?: string } | null)?.email_confirmed_at,
  );
  const hasCompletedProfile = Boolean(
    profile &&
      profile.display_name.trim() &&
      profile.date_of_birth &&
      profile.country_code?.trim(),
  );
  const hasCompletedInterests = interests.length > 0;
  const onboardingChecklist: AuthContextValue['onboardingChecklist'] = [
    { complete: emailVerified, id: 'email', label: 'Verified email address' },
    { complete: hasCompletedProfile, id: 'profile', label: 'Completed profile basics' },
    { complete: hasCompletedInterests, id: 'interests', label: 'Selected conversation interests' },
    {
      complete: Boolean(sessionState?.onboarding_complete && profile?.onboarding_completed_at),
      id: 'onboarding',
      label: 'Finished onboarding flow',
    },
  ];
  const queueEligible =
    onboardingChecklist.every((item) => item.complete) &&
    profile?.profile_status === 'active';

  const isQueueEligibleSnapshot = useCallback(
    (
      nextProfile: ProfileRecord | null,
      nextInterests: string[],
      nextSessionState: SessionState | null,
    ) =>
      Boolean(
        nextSessionState?.onboarding_complete &&
          nextProfile &&
          nextProfile.display_name.trim() &&
          nextProfile.date_of_birth &&
          nextProfile.country_code?.trim() &&
          nextProfile.onboarding_completed_at &&
          nextInterests.length > 0 &&
          nextProfile.profile_status === 'active',
      ),
    [],
  );

  const loadMatchPreview = useCallback(
    async (
      nextSession: Session | null,
      nextProfile: ProfileRecord | null,
      nextInterests: string[],
      nextSessionState: SessionState | null,
    ) => {
      if (!nextSession || !isQueueEligibleSnapshot(nextProfile, nextInterests, nextSessionState)) {
        setMatchPreview(null);
        return;
      }

      try {
        const preview = await authorizedRequest<MatchPreviewResponse>(nextSession, '/match/preview');
        setMatchPreview(preview);
      } catch {
        setMatchPreview(null);
      }
    },
    [isQueueEligibleSnapshot],
  );

  const refreshData = useCallback(
    async (nextSession = session) => {
      const now = Date.now();
      if (now - lastRefreshAtRef.current < 2500) {
        return;
      }

      try {
        const snapshot = await loadAccountSnapshot(nextSession);
        setAvailableInterests(snapshot.availableInterests);
        setProfile(snapshot.profile);
        setSessionState(snapshot.sessionState);
        setInterests(snapshot.interests);
        setQueueEntry(snapshot.queueEntry);
        await loadMatchPreview(nextSession, snapshot.profile, snapshot.interests, snapshot.sessionState);
        lastRefreshAtRef.current = Date.now();
        setLastSyncedAt(new Date().toISOString());
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Unable to refresh account data.');
      }
    },
    [loadMatchPreview, session],
  );

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (supabaseEnvError) {
        try {
          const snapshot = await loadAccountSnapshot(null);
          if (active) {
            setAvailableInterests(snapshot.availableInterests);
            setMatchPreview(null);
            setQueueEntry(snapshot.queueEntry);
            setQueuePosition(snapshot.queuePosition);
            setQueueSize(snapshot.queueSize);
            setMembersAhead(snapshot.membersAhead);
            setLastSyncedAt(new Date().toISOString());
          }
        } catch {
          // Ignore API bootstrap failures when auth env is not configured.
        }

        if (active) {
          setInitialized(true);
        }
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (!active) {
        return;
      }

      if (error) {
        setMessage(error.message);
      }

      const nextSession = data.session;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      try {
        const snapshot = await loadAccountSnapshot(nextSession);
        if (!active) {
          return;
        }
        setAvailableInterests(snapshot.availableInterests);
        setProfile(snapshot.profile);
        setSessionState(snapshot.sessionState);
        setInterests(snapshot.interests);
        setQueueEntry(snapshot.queueEntry);
        setQueuePosition(snapshot.queuePosition);
        setQueueSize(snapshot.queueSize);
        setMembersAhead(snapshot.membersAhead);
        await loadMatchPreview(nextSession, snapshot.profile, snapshot.interests, snapshot.sessionState);
        lastRefreshAtRef.current = Date.now();
        setLastSyncedAt(new Date().toISOString());
      } catch (snapshotError) {
        setMessage(
          snapshotError instanceof Error
            ? snapshotError.message
            : 'Unable to refresh account data.',
        );
      }
      if (active) {
        setInitialized(true);
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      void refreshData(nextSession);
      setInitialized(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signUp(email: string, password: string) {
    if (supabaseEnvError) {
      throw new Error(supabaseEnvError);
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      setMessage('Account created. Check your email if confirmation is enabled.');
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    if (supabaseEnvError) {
      throw new Error(supabaseEnvError);
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      setMessage('Signed in.');
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    if (supabaseEnvError) {
      throw new Error(supabaseEnvError);
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } finally {
      setLoading(false);
    }
  }

  async function requestPasswordReset(email: string) {
    if (supabaseEnvError) {
      throw new Error(supabaseEnvError);
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        throw error;
      }

      setMessage('Password reset email sent if the account exists.');
    } finally {
      setLoading(false);
    }
  }

  async function resendVerificationEmail() {
    if (supabaseEnvError) {
      throw new Error(supabaseEnvError);
    }

    if (!emailAddress) {
      throw new Error('No email address is available for this account.');
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        email: emailAddress,
        type: 'signup',
      });
      if (error) {
        throw error;
      }

      setMessage('Verification email resent.');
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(payload: SaveProfileInput) {
    if (!session) {
      throw new Error('You must be signed in first.');
    }

    setLoading(true);
    setMessage(null);

    try {
      await authorizedRequest<ProfileRecord>(session, '/profiles/me', {
        method: 'PUT',
        body: JSON.stringify({
          age_verified_status: payload.age_verified_status ?? 'self_attested',
          avatar_url: payload.avatar_url || null,
          bio: payload.bio || null,
          country_code: payload.country_code || null,
          date_of_birth: payload.date_of_birth,
          display_name: payload.display_name,
          profile_status: payload.profile_status ?? 'pending',
        }),
      });

      await refreshData(session);
      setMessage('Profile saved. Match signals refreshed.');
    } finally {
      setLoading(false);
    }
  }

  async function saveInterests(interestIds: string[]) {
    if (!session) {
      throw new Error('You must be signed in first.');
    }

    setLoading(true);
    setMessage(null);

    try {
      await authorizedRequest<UserInterestRecord[]>(session, '/interests/me', {
        method: 'PUT',
        body: JSON.stringify({ interest_ids: interestIds }),
      });

      if (profile && interestIds.length > 0 && !profile.onboarding_completed_at) {
        await authorizedRequest<ProfileRecord>(session, '/profiles/me', {
          method: 'PATCH',
          body: JSON.stringify({
            onboarding_completed_at: new Date().toISOString(),
            profile_status: 'active',
          }),
        });
      }

      await refreshData(session);
      setMessage('Interests saved. Match signals refreshed.');
    } finally {
      setLoading(false);
    }
  }

  async function joinQueue() {
    if (!session) {
      throw new Error('You must be signed in first.');
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await authorizedRequest<MatchJoinResponse>(session, '/match/join', {
        method: 'POST',
        body: JSON.stringify({
          country_code: profile?.country_code || null,
        }),
      });

      setQueueEntry(response.queue_entry ?? null);
      if (response.status === 'matched') {
        setMatchPreview(null);
        setQueuePosition(null);
        setQueueSize(0);
        setMembersAhead(null);
      } else {
        const queueStatus = await authorizedRequest<QueueStatusResponse>(session, '/match/queue');
        setQueueEntry(queueStatus.queue_entry ?? response.queue_entry ?? null);
        setQueuePosition(queueStatus.queue_position ?? null);
        setQueueSize(queueStatus.queue_size ?? 0);
        setMembersAhead(queueStatus.members_ahead ?? null);
      }

      setMessage(
        response.status === 'matched'
          ? [
              `Match found with ${response.matched_profile?.display_name ?? 'another member'}.`,
              response.match_context?.reason ?? null,
            ]
              .filter(Boolean)
              .join(' ')
          : 'You are now in the matchmaking queue.',
      );
      return response;
    } finally {
      setLoading(false);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      availableInterests,
      emailAddress,
      emailVerified,
      clearMessage: () => setMessage(null),
      envError: supabaseEnvError,
      hasCompletedInterests,
      hasCompletedProfile,
      initialized,
      interests,
      matchPreview,
      lastSyncedAt,
      queueEntry,
      queuePosition,
      queueSize,
      membersAhead,
      joinQueue,
      loading,
      message,
      onboardingChecklist,
      queueEligible,
      profile,
      refreshData,
      requestPasswordReset,
      resendVerificationEmail,
      saveInterests,
      saveProfile,
      session,
      sessionState,
      signIn,
      signOut,
      signUp,
      user,
    }),
    [
      availableInterests,
      emailAddress,
      emailVerified,
      hasCompletedInterests,
      hasCompletedProfile,
      initialized,
      interests,
      matchPreview,
      lastSyncedAt,
      queueEntry,
      queuePosition,
      queueSize,
      membersAhead,
      joinQueue,
      loading,
      message,
      onboardingChecklist,
      profile,
      queueEligible,
      session,
      sessionState,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
