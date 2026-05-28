export type MatchSignalSuggestion = {
  category: string;
  count: number;
  kind: 'interest' | 'profile';
  sample: string | null;
  missingFlowSteps?: string[];
  missingProfileFields?: string[];
};

export type MatchGuidanceMode = 'profile' | 'interest' | 'queue' | 'overlap' | 'boost';

export type MatchGuidanceSurface = 'account' | 'queue' | 'setup';

export type MatchPreviewLike = {
  recommended_pool: 'preferred' | 'fallback' | 'queue';
  shared_interests: string[];
  top_shared_category?: string | null;
  top_shared_category_count?: number | null;
  top_shared_interest?: string | null;
};

export function getMatchGuidanceCopy(mode: MatchGuidanceMode, surface: MatchGuidanceSurface) {
  switch (mode) {
    case 'profile':
      return {
        actionLabel: surface === 'setup' ? 'Open profile' : 'Finish onboarding',
        title: 'Profile blocker',
      };
    case 'interest':
      return {
        actionLabel: 'Review interests',
        title: 'Interest boost',
      };
    case 'queue':
      return {
        actionLabel: 'Refresh signals',
        title: 'Queue supply',
      };
    case 'overlap':
      return {
        actionLabel: 'Review interests',
        title: 'Weak overlap',
      };
    case 'boost':
    default:
      return {
        actionLabel: surface === 'account' ? 'Finish onboarding' : 'Update profile',
        title: 'Match boost',
      };
  }
}

export function getMatchPreviewGuidance(input: {
  availableInterests: Array<{ category?: string; id: string; name: string }>;
  interests: string[];
  matchPreview: MatchPreviewLike | null;
  profile: {
    country_code?: string | null;
    date_of_birth?: string | null;
    display_name?: string | null;
    onboarding_completed_at?: string | null;
  } | null;
}) {
  if (!input.matchPreview) {
    return null;
  }

  if (input.matchPreview.recommended_pool === 'queue') {
    return {
      hint: 'More active members are needed before the queue can form a better match.',
      title: getMatchGuidanceCopy('queue', 'queue').title,
    };
  }

  if (input.matchPreview.shared_interests.length === 0) {
    return {
      hint: 'Add more interests to increase overlap in future matches.',
      title: getMatchGuidanceCopy('interest', 'queue').title,
    };
  }

  if (
    input.matchPreview.top_shared_category &&
    input.matchPreview.top_shared_category_count != null &&
    input.matchPreview.top_shared_category_count < 2
  ) {
    return {
      hint: `Add more interests in ${input.matchPreview.top_shared_category} to strengthen this match signal.`,
      title: getMatchGuidanceCopy('overlap', 'queue').title,
    };
  }

  const strongestMissingCategory = getMatchSignalSuggestion(
    input.availableInterests,
    input.interests,
    input.profile,
  );

  if (strongestMissingCategory && strongestMissingCategory.kind === 'profile') {
    const missingProfileFields =
      strongestMissingCategory.missingProfileFields?.join(', ') ??
      strongestMissingCategory.sample ??
      'profile basics';
    const missingFlowSteps = strongestMissingCategory.missingFlowSteps?.length
      ? ` Flow step: ${strongestMissingCategory.missingFlowSteps.join(', ')}.`
      : '';
    return {
      hint: `Still missing: ${missingProfileFields}.${missingFlowSteps}`,
      title: getMatchGuidanceCopy('profile', 'queue').title,
    };
  }

  if (strongestMissingCategory && input.interests.length < 3) {
    const { category, count } = strongestMissingCategory;
    return {
      hint: `You still have ${count} unselected ${category} interest${count === 1 ? '' : 's'} available. Add one to widen future matches.`,
      title: getMatchGuidanceCopy('boost', 'queue').title,
    };
  }

  return {
    hint:
      input.interests.length < 3
        ? 'A wider interest set usually improves fallback matches and reduces queue waits.'
        : 'Your current signals are in a good place for the queue.',
    title: getMatchGuidanceCopy('boost', 'queue').title,
  };
}

export function getMatchSignalSuggestion(
  availableInterests: Array<{ category?: string; id: string; name: string }>,
  selectedInterestIds: string[],
  profile: {
    country_code?: string | null;
    date_of_birth?: string | null;
    display_name?: string | null;
    onboarding_completed_at?: string | null;
  } | null,
) {
  const missingProfileFields = [
    !profile?.display_name?.trim() ? 'display name' : null,
    !profile?.date_of_birth ? 'date of birth' : null,
    !profile?.country_code?.trim() ? 'country code' : null,
  ].filter(Boolean) as string[];
  const missingFlowSteps = [!profile?.onboarding_completed_at ? 'finished onboarding' : null].filter(
    Boolean,
  ) as string[];

  if (missingProfileFields.length > 0 || missingFlowSteps.length > 0) {
    return {
      category: 'Profile',
      count: missingProfileFields.length + missingFlowSteps.length,
      sample: missingProfileFields[0] ?? missingFlowSteps[0] ?? null,
      kind: 'profile' as const,
      missingFlowSteps,
      missingProfileFields,
    };
  }

  const selectedInterestSet = new Set(selectedInterestIds);
  const candidateByCategory = availableInterests.reduce<Record<string, MatchSignalSuggestion>>(
    (categories, interest) => {
      if (selectedInterestSet.has(interest.id)) {
        return categories;
      }

      const category = interest.category ?? 'General';
      const current = categories[category] ?? {
        category,
        count: 0,
        sample: interest.name,
        kind: 'interest' as const,
      };
      categories[category] = {
        category,
        count: current.count + 1,
        sample: current.sample ?? interest.name,
        kind: 'interest' as const,
      };
      return categories;
    },
    {},
  );

  const strongestCategory = Object.values(candidateByCategory).sort(
    (left, right) => right.count - left.count,
  )[0];

  return strongestCategory ?? null;
}
