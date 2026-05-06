import type { ClientStatus } from '@/lib/crm';

const appearancePalettes = [
  {
    bannerStart: '#D98A62',
    bannerEnd: '#27566B',
    avatarStart: '#FFF1E8',
    avatarEnd: '#F3D8CA',
    avatarText: '#7C3419',
    dot: 'rgba(255,255,255,0.18)',
  },
  {
    bannerStart: '#27566B',
    bannerEnd: '#6B9BB0',
    avatarStart: '#E7F4FA',
    avatarEnd: '#C9E2ED',
    avatarText: '#17394A',
    dot: 'rgba(255,255,255,0.16)',
  },
  {
    bannerStart: '#6E5EAA',
    bannerEnd: '#D98A62',
    avatarStart: '#F5ECFF',
    avatarEnd: '#E8D7FF',
    avatarText: '#47367D',
    dot: 'rgba(255,255,255,0.16)',
  },
  {
    bannerStart: '#1F7A61',
    bannerEnd: '#27566B',
    avatarStart: '#E8F8F2',
    avatarEnd: '#D2EFE3',
    avatarText: '#135643',
    dot: 'rgba(255,255,255,0.16)',
  },
];

function hashString(value: string) {
  return value.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
}

export function getClientAppearance(name: string, status: ClientStatus) {
  const palette = appearancePalettes[hashString(name) % appearancePalettes.length];
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const statusGlow =
    status === 'active'
      ? 'rgba(31,122,97,0.2)'
      : status === 'lead'
        ? 'rgba(192,122,35,0.22)'
        : 'rgba(99,102,241,0.18)';

  return {
    initials,
    avatarText: palette.avatarText,
    bannerStart: palette.bannerStart,
    bannerEnd: palette.bannerEnd,
    avatarStart: palette.avatarStart,
    avatarEnd: palette.avatarEnd,
    dot: palette.dot,
    statusGlow,
  };
}
