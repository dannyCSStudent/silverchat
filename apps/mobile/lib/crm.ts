import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type ClientStatus = 'lead' | 'active' | 'completed';
export type ClientInteractionType = 'call' | 'email' | 'meeting' | 'note' | 'follow_up';

export type ClientTag = {
  id: string;
  name: string;
  color: string;
};

export type Client = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  profile_image_url?: string;
  banner_image_url?: string;
  status: ClientStatus;
  notes?: string;
  last_contacted_at?: string;
  tags?: ClientTag[];
};

export type ClientSummary = {
  id: string;
  name: string;
};

export type ClientActivity = {
  id: string;
  client_id: string;
  interaction_type: ClientInteractionType;
  notes?: string;
  timestamp: string;
};

export type ClientTagAssignment = {
  client_id: string;
  tag_id: string;
};

function inferApiBaseUrl() {
  const platformConfiguredApiUrl =
    (Platform.OS === 'android' ? process.env.EXPO_PUBLIC_API_URL_ANDROID : undefined)?.trim() ||
    (Platform.OS === 'web' ? process.env.EXPO_PUBLIC_API_URL_WEB : undefined)?.trim() ||
    (Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_API_URL_IOS : undefined)?.trim();
  const configuredApiUrl = platformConfiguredApiUrl || process.env.EXPO_PUBLIC_API_URL?.trim();

  if (configuredApiUrl) {
    return configuredApiUrl;
  }

  const hostCandidate = Constants.expoConfig?.hostUri ?? Constants.linkingUri;
  const host = hostCandidate?.match(/^(?:.*:\/\/)?([^/:]+)/)?.[1];

  if (host) {
    return `http://${host}:8000`;
  }

  return 'http://127.0.0.1:8000';
}

export const apiBaseUrl = inferApiBaseUrl();

export const fallbackClients: Client[] = [
  {
    id: 'sample-1',
    name: 'Acorn Atelier',
    email: 'ops@acornatelier.com',
    profile_image_url: 'https://randomuser.me/api/portraits/women/44.jpg',
    banner_image_url: 'https://picsum.photos/id/1011/1200/360',
    status: 'active',
    notes: 'Priority account focused on onboarding and expansion scope.',
    last_contacted_at: '2026-03-21T10:00:00.000Z',
    tags: [
      { id: 'priority', name: 'Priority', color: '#f97316' },
      { id: 'design', name: 'Design', color: '#0ea5e9' },
    ],
  },
  {
    id: 'sample-2',
    name: 'Blue Peak Logistics',
    phone: '(312) 555-0184',
    profile_image_url: 'https://randomuser.me/api/portraits/men/32.jpg',
    banner_image_url: 'https://picsum.photos/id/1031/1200/360',
    status: 'lead',
    notes: 'Waiting on budget confirmation before proposal review.',
    tags: [{ id: 'follow-up', name: 'Follow Up', color: '#f59e0b' }],
  },
  {
    id: 'sample-3',
    name: 'Fern Harbor Dental',
    email: 'frontdesk@fernharbor.example',
    profile_image_url: 'https://randomuser.me/api/portraits/women/68.jpg',
    banner_image_url: 'https://picsum.photos/id/1040/1200/360',
    status: 'completed',
    notes: 'Project completed and handed off successfully.',
    last_contacted_at: '2026-03-14T15:30:00.000Z',
  },
];

export const fallbackClientSummaries: ClientSummary[] = fallbackClients.map(({ id, name }) => ({
  id,
  name,
}));

export const fallbackTags: ClientTag[] = [
  { id: 'priority', name: 'Priority', color: '#f97316' },
  { id: 'design', name: 'Design', color: '#0ea5e9' },
  { id: 'follow-up', name: 'Follow Up', color: '#f59e0b' },
];

export const fallbackAssignments: ClientTagAssignment[] = [
  { client_id: 'sample-1', tag_id: 'priority' },
  { client_id: 'sample-1', tag_id: 'design' },
  { client_id: 'sample-2', tag_id: 'follow-up' },
];

export const fallbackActivity: ClientActivity[] = [
  {
    id: 'activity-1',
    client_id: 'sample-1',
    interaction_type: 'meeting',
    notes: 'Reviewed onboarding checklist and next quarter expansion scope.',
    timestamp: '2026-03-23T16:00:00.000Z',
  },
  {
    id: 'activity-2',
    client_id: 'sample-1',
    interaction_type: 'note',
    notes: 'Assigned design and priority tags after kickoff.',
    timestamp: '2026-03-22T11:45:00.000Z',
  },
  {
    id: 'activity-3',
    client_id: 'sample-2',
    interaction_type: 'follow_up',
    notes: 'Sent pricing summary and requested budget confirmation.',
    timestamp: '2026-03-22T13:15:00.000Z',
  },
  {
    id: 'activity-4',
    client_id: 'sample-3',
    interaction_type: 'email',
    notes: 'Shared handoff notes after project completion.',
    timestamp: '2026-03-19T09:30:00.000Z',
  },
];

export const statusTone: Record<ClientStatus, { bg: string; text: string }> = {
  lead: { bg: '#FEF3C7', text: '#92400E' },
  active: { bg: '#DCFCE7', text: '#166534' },
  completed: { bg: '#E2E8F0', text: '#334155' },
};

export const interactionOptions: ClientInteractionType[] = [
  'call',
  'email',
  'meeting',
  'note',
  'follow_up',
];

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  return (await response.json()) as T;
}

export function isUuidLike(value?: string) {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function toLocalDatetimeValue(value?: string) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}
