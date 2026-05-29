export type OnboardingNextAction = {
  href: '/(public)/verify-email' | '/(private)/(tabs)' | '/(private)/(tabs)/setup' | '/(private)/(tabs)/queue';
  label: string;
  title: string;
};

export type OnboardingChecklistItem = {
  complete: boolean;
  id: 'email' | 'profile' | 'interests' | 'onboarding';
  label: string;
};

export const ONBOARDING_PATH_STEPS = [
  'Verify email',
  'Complete profile basics',
  'Choose interests',
  'Join the queue',
] as const;

export function getOnboardingNextAction(
  checklist: OnboardingChecklistItem[],
): OnboardingNextAction | null {
  const nextIncomplete = checklist.find((item) => !item.complete);

  if (!nextIncomplete) {
    return null;
  }

  switch (nextIncomplete.id) {
    case 'email':
      return {
        href: '/(public)/verify-email',
        label: 'Verify email',
        title: 'Email verification',
      };
    case 'profile':
      return {
        href: '/(private)/(tabs)',
        label: 'Finish profile',
        title: 'Profile basics',
      };
    case 'interests':
      return {
        href: '/(private)/(tabs)/setup',
        label: 'Choose interests',
        title: 'Interest selection',
      };
    case 'onboarding':
      return {
        href: '/(private)/(tabs)/queue',
        label: 'Review matchmaking gate',
        title: 'Queue eligibility',
      };
    default:
      return null;
  }
}

export function getOnboardingNextActionAfterEmail(
  checklist: OnboardingChecklistItem[],
): OnboardingNextAction | null {
  return getOnboardingNextAction(checklist.filter((item) => item.id !== 'email'));
}
