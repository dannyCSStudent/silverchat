export type MatchSignalSuggestion = {
  category: string;
  count: number;
  sample: string | null;
  kind: 'interest' | 'profile';
};

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
    !profile?.onboarding_completed_at ? 'finished onboarding' : null,
  ].filter(Boolean) as string[];

  if (missingProfileFields.length > 0) {
    return {
      category: 'Profile',
      count: missingProfileFields.length,
      sample: missingProfileFields[0],
      kind: 'profile' as const,
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
