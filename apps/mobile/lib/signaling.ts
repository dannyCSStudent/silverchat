import { mobileEnv } from '@/lib/env';

function toWebSocketOrigin(apiBaseUrl: string) {
  const url = new URL(apiBaseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

export function buildSignalingUrl(sessionId: string, accessToken: string) {
  const url = new URL('/ws/signaling', toWebSocketOrigin(mobileEnv.apiBaseUrl));
  url.searchParams.set('session_id', sessionId);
  url.searchParams.set('token', accessToken);
  return url.toString();
}

export type SignalingMessage =
  | {
      type: 'ready' | 'peer-joined' | 'peer-left' | 'pong' | 'left';
      session_id: string;
      user_id?: string;
      from_user_id?: string;
      peer_count?: number;
    }
  | {
      type: string;
      session_id: string;
      from_user_id?: string;
      payload?: unknown;
    };
