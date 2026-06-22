import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  mediaDevices,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
} from 'react-native-webrtc';

import { SessionOutcomeCard } from '@/components/session-outcome-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authorizedApiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { MatchSessionDetailResponse } from '@/lib/match-sessions';
import { buildSignalingUrl, type SignalingMessage } from '@/lib/signaling';

type MediaStreamLike = {
  getTracks: () => Array<{ stop: () => void }>;
  toURL: () => string;
};

type SignalMessage = {
  type: 'offer' | 'answer' | 'ice-candidate' | 'ping' | 'leave';
  payload?: unknown;
};

type MediaSignalMessage = Extract<SignalingMessage, { type: 'offer' | 'answer' | 'ice-candidate' }>;

type NativeIceCandidateInit = {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
};

type NativeRTCSessionDescriptionInit = {
  sdp: string;
  type: string | null;
};

type CallHealth = 'idle' | 'connecting' | 'connected' | 'ready' | 'closed' | 'error';

const rtcConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export default function MatchSessionCallScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { session, recentMatches } = useAuth();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const [detail, setDetail] = useState<MatchSessionDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [callState, setCallState] = useState<CallHealth>('idle');
  const [events, setEvents] = useState<string[]>([]);
  const [peerCount, setPeerCount] = useState<number | null>(null);
  const [localStream, setLocalStream] = useState<MediaStreamLike | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStreamLike | null>(null);
  const [restartNonce, setRestartNonce] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const pendingSignalsRef = useRef<string[]>([]);
  const pendingInboundSignalsRef = useRef<MediaSignalMessage[]>([]);
  const pendingIceCandidatesRef = useRef<NativeIceCandidateInit[]>([]);
  const localStreamRef = useRef<MediaStreamLike | null>(null);
  const isInitiatorRef = useRef(true);

  const resolvedSessionId = useMemo(() => {
    if (!sessionId) {
      return null;
    }

    return Array.isArray(sessionId) ? sessionId[0] : sessionId;
  }, [sessionId]);

  const cachedSession = useMemo(
    () => recentMatches.find((item) => item.id === resolvedSessionId) ?? null,
    [recentMatches, resolvedSessionId],
  );

  const summary = detail?.session ?? cachedSession;
  const currentRole = detail?.current_user_role ?? summary?.current_user_role ?? 'initiator';
  const isInitiator = currentRole === 'initiator';

  const pushEvent = useCallback((message: string) => {
    setEvents((current) => [...current.slice(-14), message]);
  }, []);

  const sendSignal = useCallback((message: SignalMessage) => {
    const payload = JSON.stringify(message);
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
      return;
    }

    pendingSignalsRef.current.push(payload);
  }, []);

  const flushPendingSignals = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || pendingSignalsRef.current.length === 0) {
      return;
    }

    const queued = [...pendingSignalsRef.current];
    pendingSignalsRef.current = [];
    queued.forEach((payload) => socket.send(payload));
  }, []);

  const toNativeSessionDescriptionInit = useCallback(
    (payload: unknown): NativeRTCSessionDescriptionInit | null => {
      if (!payload || typeof payload !== 'object') {
        return null;
      }

      const candidate = payload as { sdp?: unknown; type?: unknown };
      if (typeof candidate.sdp !== 'string' || typeof candidate.type !== 'string') {
        return null;
      }

      return {
        sdp: candidate.sdp,
        type: candidate.type,
      };
    },
    [],
  );

  const serializeSessionDescription = useCallback((description: unknown) => {
    const candidate = description as { type?: unknown; sdp?: unknown } | null;
    if (!candidate || typeof candidate.type !== 'string' || typeof candidate.sdp !== 'string') {
      return null;
    }

    return {
      type: candidate.type,
      sdp: candidate.sdp,
    };
  }, []);

  const flushPendingIceCandidates = useCallback((peer: RTCPeerConnection) => {
    if (pendingIceCandidatesRef.current.length === 0) {
      return;
    }

    const queued = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];
    queued.forEach((candidate) => {
      void peer.addIceCandidate(new RTCIceCandidate(candidate)).catch((signalError: unknown) => {
        const message =
          signalError instanceof Error ? signalError.message : 'Unable to apply queued ICE candidate.';
        setError(message);
        setCallState('error');
        pushEvent(`Queued ICE handling failed: ${message}`);
      });
    });
  }, [pushEvent]);

  const handleInboundSignal = useCallback(
    (payload: MediaSignalMessage) => {
      const peer = peerRef.current;
      if (!peer) {
        pendingInboundSignalsRef.current.push(payload);
        pushEvent(`Queued signal until peer is ready: ${payload.type}`);
        return;
      }

      if (payload.type === 'offer' && payload.payload) {
        void (async () => {
          const description = toNativeSessionDescriptionInit(payload.payload);
          if (!description) {
            return;
          }

          await peer.setRemoteDescription(new RTCSessionDescription(description));
          flushPendingIceCandidates(peer);
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          const serializedAnswer = serializeSessionDescription(answer);
          if (!serializedAnswer) {
            throw new Error('Unable to serialize signaling answer.');
          }

          sendSignal({ type: 'answer', payload: serializedAnswer });
        })().catch((signalError: unknown) => {
          const message =
            signalError instanceof Error ? signalError.message : 'Unable to answer signaling offer.';
          setError(message);
          setCallState('error');
          pushEvent(`Offer handling failed: ${message}`);
        });
        return;
      }

      if (payload.type === 'answer' && payload.payload) {
        const description = toNativeSessionDescriptionInit(payload.payload);
        if (!description) {
          return;
        }

        void peer
          .setRemoteDescription(new RTCSessionDescription(description))
          .then(() => {
            flushPendingIceCandidates(peer);
          })
          .catch((signalError: unknown) => {
            const message =
              signalError instanceof Error ? signalError.message : 'Unable to apply signaling answer.';
            setError(message);
            setCallState('error');
            pushEvent(`Answer handling failed: ${message}`);
          });
        return;
      }

      if (payload.type === 'ice-candidate' && payload.payload) {
        if (!peer.remoteDescription) {
          pendingIceCandidatesRef.current.push(payload.payload as NativeIceCandidateInit);
          pushEvent('Queued ICE candidate until remote description is ready.');
          return;
        }

        void peer.addIceCandidate(new RTCIceCandidate(payload.payload as NativeIceCandidateInit)).catch(
          (signalError: unknown) => {
            const message =
              signalError instanceof Error ? signalError.message : 'Unable to apply ICE candidate.';
            setError(message);
            setCallState('error');
            pushEvent(`ICE handling failed: ${message}`);
          },
        );
      }
    },
    [flushPendingIceCandidates, pushEvent, sendSignal, toNativeSessionDescriptionInit],
  );

  const flushPendingInboundSignals = useCallback(() => {
    if (!peerRef.current || pendingInboundSignalsRef.current.length === 0) {
      return;
    }

    const queued = [...pendingInboundSignalsRef.current];
    pendingInboundSignalsRef.current = [];
    queued.forEach((payload) => handleInboundSignal(payload));
  }, [handleInboundSignal]);

  const closeSocket = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = null;

    if (socket) {
      try {
        socket.close(1000, 'Leaving call room');
      } catch {
        // Ignore close failures during teardown.
      }
    }
  }, []);

  const closePeer = useCallback(() => {
    const peer = peerRef.current;
    peerRef.current = null;

    if (peer) {
      try {
        (peer as any).ontrack = null;
        (peer as any).onicecandidate = null;
        (peer as any).onconnectionstatechange = null;
        peer.close();
      } catch {
        // Ignore teardown errors.
      }
    }
  }, []);

  const stopMedia = useCallback(() => {
    const stream = localStreamRef.current;
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const resetCallSession = useCallback(() => {
    closeSocket();
    closePeer();
    stopMedia();
    pendingSignalsRef.current = [];
    setPeerCount(null);
    setMediaError(null);
    setError(null);
    setCallState('idle');
    setLocalStream(null);
    setRemoteStream(null);
  }, [closePeer, closeSocket, stopMedia]);

  const restartCall = useCallback(() => {
    resetCallSession();
    setEvents([]);
    setRestartNonce((current) => current + 1);
    pushEvent('Restarting call room...');
  }, [pushEvent, resetCallSession]);

  const loadDetail = useCallback(async () => {
    if (!session || !resolvedSessionId) {
      setLoadingDetail(false);
      return;
    }

    setLoadingDetail(true);
    setError(null);

    try {
      const response = await authorizedApiRequest<MatchSessionDetailResponse>(
        session,
        `/match/sessions/${resolvedSessionId}`,
      );
      setDetail(response);
    } catch {
      if (cachedSession) {
        setDetail({
          current_user_role: cachedSession.current_user_role ?? 'initiator',
          session: cachedSession,
        });
      } else {
        setError('Unable to load session detail for the call room.');
      }
    } finally {
      setLoadingDetail(false);
    }
  }, [cachedSession, resolvedSessionId, session]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!session || !resolvedSessionId) {
      return;
    }

    let active = true;
    setMediaError(null);
    setCallState('connecting');
    pushEvent(`Requesting camera and microphone for session ${resolvedSessionId}...`);

    void mediaDevices
      .getUserMedia({
        audio: true,
        video: true,
      })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const typedStream = stream as MediaStreamLike;
        localStreamRef.current = typedStream;
        setLocalStream(typedStream);
        pushEvent('Local media stream ready.');
      })
      .catch((mediaError: unknown) => {
        const message = mediaError instanceof Error ? mediaError.message : 'Unable to access camera or microphone.';
        setMediaError(message);
        setCallState('error');
        pushEvent(`Media error: ${message}`);
      });

    return () => {
      active = false;
      stopMedia();
    };
  }, [pushEvent, restartNonce, resolvedSessionId, session, stopMedia]);

  useEffect(() => {
    if (!session || !resolvedSessionId) {
      return;
    }

    const socket = new WebSocket(buildSignalingUrl(resolvedSessionId, session.access_token));
    socketRef.current = socket;
    setCallState((current) => (current === 'error' ? current : 'connecting'));
    pushEvent(`Connecting to signaling room for session ${resolvedSessionId}...`);

    socket.onopen = () => {
      flushPendingSignals();
      setCallState((current) => (current === 'error' ? current : 'connected'));
      pushEvent('Signaling socket connected.');
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string) as SignalingMessage;
        pushEvent(`Signal: ${payload.type}`);
        if ('peer_count' in payload && typeof payload.peer_count === 'number') {
          setPeerCount(payload.peer_count);
        }

        if (payload.type === 'ready') {
          if ('peer_count' in payload && typeof payload.peer_count === 'number' && payload.peer_count < 2) {
            pushEvent('Waiting for the other participant to join.');
          }
          return;
        }

        if (payload.type === 'peer-joined') {
          pushEvent('Another participant joined the room.');
          return;
        }

        if (payload.type === 'peer-left') {
          pushEvent('The other participant left the room.');
          setCallState('closed');
          return;
        }

        if (payload.type === 'left') {
          setCallState('closed');
          pushEvent('You left the room.');
          return;
        }

        if (payload.type === 'offer' || payload.type === 'answer' || payload.type === 'ice-candidate') {
          handleInboundSignal(payload as MediaSignalMessage);
        }
      } catch {
        pushEvent('Received a signaling event.');
      }
    };

    socket.onerror = () => {
      setCallState('error');
      pushEvent('Signaling socket error.');
    };

    socket.onclose = () => {
      setCallState((current) => (current === 'error' ? current : 'closed'));
      pushEvent('Signaling socket closed.');
    };

    return () => {
      try {
        socket.close(1000, 'Leaving call room');
      } catch {
        // Ignore close failures during teardown.
      }
      socketRef.current = null;
    };
  }, [flushPendingSignals, pushEvent, restartNonce, resolvedSessionId, sendSignal, session]);

  useEffect(() => {
    if (!session || !resolvedSessionId || !localStream) {
      return;
    }

    const peer = new RTCPeerConnection(rtcConfiguration);
    peerRef.current = peer;
    isInitiatorRef.current = isInitiator;

    localStream.getTracks().forEach((track) => peer.addTrack(track as any, localStream as any));

    (peer as any).ontrack = (event: { streams?: MediaStreamLike[] }) => {
      const [stream] = event.streams ?? [];
      if (stream) {
        setRemoteStream(stream as MediaStreamLike);
        pushEvent('Remote media stream attached.');
      }
    };

    (peer as any).onicecandidate = (event: { candidate?: { toJSON: () => NativeIceCandidateInit } | null }) => {
      if (event.candidate) {
        sendSignal({
          type: 'ice-candidate',
          payload: event.candidate.toJSON(),
        });
      }
    };

    (peer as any).onconnectionstatechange = () => {
      const state = peer.connectionState;
      if (state === 'connected') {
        setCallState('ready');
        pushEvent('Peer connection ready.');
      } else if (state === 'failed') {
        setCallState('error');
        pushEvent('Peer connection failed.');
      } else if (state === 'disconnected') {
        setCallState('closed');
        pushEvent('Peer connection disconnected.');
      }
    };

    if (isInitiatorRef.current) {
      void (async () => {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        const serializedOffer = serializeSessionDescription(offer);
        if (!serializedOffer) {
          throw new Error('Unable to serialize signaling offer.');
        }

        sendSignal({ type: 'offer', payload: serializedOffer });
        pushEvent('Sent offer.');
      })().catch((signalError: unknown) => {
        const message =
          signalError instanceof Error ? signalError.message : 'Unable to create signaling offer.';
        setError(message);
        setCallState('error');
        pushEvent(`Offer creation failed: ${message}`);
      });
    }

    flushPendingInboundSignals();

    return () => {
      closePeer();
    };
  }, [
    closePeer,
    flushPendingInboundSignals,
    isInitiator,
    localStream,
    pushEvent,
    restartNonce,
    resolvedSessionId,
    sendSignal,
    session,
  ]);

  useEffect(() => {
    if (!session || !resolvedSessionId) {
      return;
    }

    return () => {
      resetCallSession();
    };
  }, [resetCallSession, resolvedSessionId, session]);

  const callStatusLabel =
    callState === 'connected'
      ? 'Signaling connected'
      : callState === 'ready'
        ? 'Media connected'
        : callState === 'connecting'
          ? 'Connecting'
          : callState === 'error'
            ? 'Error'
            : callState === 'closed'
              ? 'Closed'
              : 'Idle';

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <ThemedView style={styles.hero}>
        <ThemedText style={styles.eyebrow}>Match room</ThemedText>
        <ThemedText type="title" style={styles.title}>
          Call room
        </ThemedText>
        <ThemedText style={styles.copy}>
          This screen now joins the session signaling room and prepares local camera and microphone
          access. Real audio/video testing needs a dev client build, not Expo Go.
        </ThemedText>
        <Link href={summary ? `/(private)/sessions/${summary.id}` : '/(private)/(tabs)/queue'} style={styles.inlineLink}>
          <ThemedText style={styles.inlineLinkText}>Back to session</ThemedText>
        </Link>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText style={styles.cardLabel}>Connection</ThemedText>
        <ThemedText type="subtitle">{callStatusLabel}</ThemedText>
        <ThemedText style={styles.cardCopy}>
          {resolvedSessionId
            ? `Session ${resolvedSessionId}`
            : 'No session id available for the call room.'}
        </ThemedText>
        <ThemedText style={styles.cardCopy}>
          {peerCount === null
            ? 'Waiting for room status...'
            : peerCount >= 2
              ? 'Second participant is present.'
              : 'Waiting for another participant to join.'}
        </ThemedText>
        {mediaError ? <ThemedText style={styles.errorText}>{mediaError}</ThemedText> : null}
        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
        <View style={styles.buttonRow}>
          <Pressable
            onPress={() => {
              sendSignal({ type: 'ping', payload: { ts: Date.now() } });
              pushEvent('Sent ping.');
            }}
            style={styles.button}
          >
            <ThemedText style={styles.buttonText}>Send ping</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => void restartCall()}
            style={styles.secondaryButton}
          >
            <ThemedText style={styles.secondaryButtonText}>Retry call</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              sendSignal({ type: 'leave' });
              pushEvent('Requested leave.');
            }}
            style={styles.secondaryButton}
          >
            <ThemedText style={styles.secondaryButtonText}>Leave room</ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      <ThemedView style={styles.mediaCard}>
        <ThemedText style={styles.cardLabel}>Media</ThemedText>
        <View style={styles.videoFrame}>
          {remoteStream ? (
            <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" />
          ) : (
            <View style={styles.placeholder}>
              <ThemedText style={styles.placeholderText}>Remote video will appear here.</ThemedText>
            </View>
          )}
        </View>
        <View style={styles.localPreviewRow}>
          <View style={styles.localPreviewLabelRow}>
            <ThemedText style={styles.cardCopy}>Local preview</ThemedText>
            <ThemedText style={styles.smallStatus}>{localStream ? 'Live' : 'Waiting'}</ThemedText>
          </View>
          <View style={styles.localPreviewFrame}>
            {localStream ? (
              <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" />
            ) : (
              <View style={styles.placeholder}>
                <ThemedText style={styles.placeholderText}>Camera preview will appear here.</ThemedText>
              </View>
            )}
          </View>
        </View>
      </ThemedView>

      {summary ? (
        <SessionOutcomeCard
          sessionId={summary.id}
          status={summary.status}
          currentUserRole={currentRole}
          createdAt={summary.created_at ?? null}
          endedAt={summary.ended_at ?? null}
          otherMember={{
            user_id: summary.other_profile?.user_id ?? 'unknown',
            display_name: summary.other_profile?.display_name ?? 'Another member',
            avatar_url: summary.other_profile?.avatar_url ?? null,
            country_code: summary.other_profile?.country_code ?? null,
          }}
        />
      ) : loadingDetail ? (
        <ThemedView style={styles.card}>
          <ThemedText style={styles.cardCopy}>Loading session detail...</ThemedText>
        </ThemedView>
      ) : error ? null : null}

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Signaling log</ThemedText>
        {events.length > 0 ? (
          <View style={styles.logList}>
            {events.map((event, index) => (
              <ThemedText key={`${event}-${index}`} style={styles.logLine}>
                {event}
              </ThemedText>
            ))}
          </View>
        ) : (
          <ThemedText style={styles.cardCopy}>Waiting for signaling events.</ThemedText>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 18, paddingBottom: 36 },
  hero: { borderRadius: 28, padding: 22, gap: 10 },
  eyebrow: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.3, opacity: 0.62 },
  title: { fontSize: 30, lineHeight: 34 },
  copy: { fontSize: 16, lineHeight: 24, opacity: 0.8 },
  inlineLink: { alignSelf: 'flex-start' },
  inlineLinkText: { color: '#27566B', fontWeight: '700' },
  card: { borderRadius: 24, padding: 18, gap: 10 },
  mediaCard: { borderRadius: 24, padding: 18, gap: 12 },
  cardLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.62 },
  cardCopy: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
  errorText: { color: '#B74444', fontSize: 14, lineHeight: 20 },
  buttonRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  button: {
    borderRadius: 999,
    backgroundColor: '#1F7A61',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#FFF8F2', fontWeight: '700' },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.24)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#27566B', fontWeight: '700' },
  videoFrame: {
    borderRadius: 24,
    minHeight: 260,
    overflow: 'hidden',
    backgroundColor: 'rgba(24,33,43,0.08)',
  },
  remoteVideo: { width: '100%', aspectRatio: 3 / 4 },
  localPreviewRow: { gap: 10 },
  localPreviewLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  smallStatus: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.9, opacity: 0.62 },
  localPreviewFrame: {
    borderRadius: 18,
    minHeight: 160,
    overflow: 'hidden',
    backgroundColor: 'rgba(24,33,43,0.08)',
  },
  localVideo: { width: '100%', aspectRatio: 3 / 4 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18 },
  placeholderText: { fontSize: 14, lineHeight: 20, textAlign: 'center', opacity: 0.62 },
  logList: { gap: 6 },
  logLine: { fontSize: 13, lineHeight: 18, opacity: 0.72 },
});
