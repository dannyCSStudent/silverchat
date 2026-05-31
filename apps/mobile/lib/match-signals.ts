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

export type MatchSignalGuidance = {
  actionLabel: string | null;
  hint: string | null;
  title: string;
};

export type MatchQualityAssessment = {
  hint: string;
  label: string;
  title: string;
};

export function getProfileFieldImpact(field: string) {
  switch (field) {
    case 'display name':
      return 'Used to make the match feel human and recognizable.';
    case 'date of birth':
      return 'Used to confirm age gates and safety eligibility.';
    case 'country code':
      return 'Used to improve local match quality and preferred-pool selection.';
    default:
      return 'Used by the match gate before you can join.';
  }
}

export function getMatchPoolMessage(pool: MatchPreviewLike['recommended_pool'] | null | undefined) {
  switch (pool) {
    case 'preferred':
      return 'Preferred pool: same-country members are available.';
    case 'fallback':
      return 'Fallback pool: no same-country members are available right now.';
    case 'queue':
      return 'Queue pool: waiting for the next available member.';
    default:
      return null;
  }
}

export function getMatchPoolExplanation(pool: MatchPreviewLike['recommended_pool'] | null | undefined) {
  switch (pool) {
    case 'preferred':
      return 'This usually means a faster match with a stronger local signal.';
    case 'fallback':
      return 'This usually means a broader match search with the best available overlap.';
    case 'queue':
      return 'This means the app is waiting for another eligible member to appear.';
    default:
      return null;
  }
}

export function getMatchQualityAssessment(input: {
  interests: string[];
  matchPreview: MatchPreviewLike | null;
  profile: {
    country_code?: string | null;
    date_of_birth?: string | null;
    display_name?: string | null;
    onboarding_completed_at?: string | null;
  } | null;
}): MatchQualityAssessment | null {
  if (!input.matchPreview) {
    return null;
  }

  const sharedCount = input.matchPreview.shared_interests.length;
  const topCategoryCount = input.matchPreview.top_shared_category_count ?? 0;
  const interestCount = input.interests.length;

  if (input.matchPreview.recommended_pool === 'queue') {
    return {
      hint: 'The queue is still building enough active members to improve the next match.',
      label: 'Queue building',
      title: 'Match quality',
    };
  }

  if (sharedCount === 0 || interestCount < 2) {
    return {
      hint: 'Your current signals are still thin. Add more interests to widen the next match.',
      label: 'Thin signals',
      title: 'Match quality',
    };
  }

  if (topCategoryCount >= 2 && sharedCount >= 2) {
    return {
      hint:
        input.matchPreview.recommended_pool === 'preferred'
          ? 'Same-country members and a strong shared-interest cluster are both available.'
          : 'The app is using the strongest shared-interest cluster available right now.',
      label: input.matchPreview.recommended_pool === 'preferred' ? 'Strong local fit' : 'Strong overlap',
      title: 'Match quality',
    };
  }

  return {
    hint:
      input.matchPreview.recommended_pool === 'preferred'
        ? 'Local candidates are available, but a deeper interest mix still helps the queue.'
        : 'The match is usable, but adding more interests can improve the next signal.',
    label: 'Balanced fit',
    title: 'Match quality',
  };
}

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

export function getMatchSignalGuidance(input: {
  surface: MatchGuidanceSurface;
  suggestion: MatchSignalSuggestion | null;
}): MatchSignalGuidance | null {
  if (!input.suggestion) {
    return null;
  }

  if (input.suggestion.kind === 'profile') {
    const missingProfileFields = input.suggestion.missingProfileFields?.length
      ? `Still missing: ${input.suggestion.missingProfileFields.join(', ')}. `
      : '';
    const missingFlowSteps = input.suggestion.missingFlowSteps?.length
      ? `Flow step: ${input.suggestion.missingFlowSteps.join(', ')}. `
      : '';

    return {
      actionLabel: getMatchGuidanceCopy('profile', input.surface).actionLabel,
      hint: `${missingProfileFields}${missingFlowSteps}Complete those profile fields first, then return here to tune your interest mix.`,
      title: getMatchGuidanceCopy('profile', input.surface).title,
    };
  }

  return {
    actionLabel: getMatchGuidanceCopy('interest', input.surface).actionLabel,
    hint: `${input.suggestion.count} unselected ${input.suggestion.category} interest${input.suggestion.count === 1 ? '' : 's'} remain. Add ${input.suggestion.sample ?? 'one interest'} to strengthen future matches.`,
    title: getMatchGuidanceCopy('interest', input.surface).title,
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
