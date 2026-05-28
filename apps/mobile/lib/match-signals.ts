export type MatchSignalSuggestion = {
  category: string;
  count: number;
  sample: string | null;
};

export function getMatchSignalSuggestion(
  availableInterests: Array<{ category?: string; id: string; name: string }>,
  selectedInterestIds: string[],
  profileReady: boolean,
) {
  const selectedInterestSet = new Set(selectedInterestIds);
  const candidateByCategory = availableInterests.reduce<Record<string, MatchSignalSuggestion>>(
    (categories, interest) => {
      if (selectedInterestSet.has(interest.id)) {
        return categories;
      }

      const category = interest.category ?? 'General';
      const current = categories[category] ?? { category, count: 0, sample: interest.name };
      categories[category] = {
        category,
        count: current.count + 1,
        sample: current.sample ?? interest.name,
      };
      return categories;
    },
    {},
  );

  const strongestCategory = Object.values(candidateByCategory).sort(
    (left, right) => right.count - left.count,
  )[0];

  if (!profileReady) {
    return {
      category: 'Profile',
      count: 0,
      sample: 'Complete your profile basics first.',
    };
  }

  return strongestCategory ?? null;
}
