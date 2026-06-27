/**
 * useWebSocket hook — wraps WebSocketService with React state.
 *
 * Phase 2 addition: `hasFailed` flag, set true when the service reports
 * status 'failed' (auth failure or exhausted reconnects). Consumers
 * (e.g. CreateSurveyPage) use this to decide whether to fall back to
 * polling — polling is pointless if the auth token itself is invalid,
 * but useful for transient network drops.
 *
 * `connect` is wrapped in useCallback with a stable dependency array so
 * it can be safely used as a useEffect dependency without re-triggering
 * on every render.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { WebSocketService, type ProgressMessage, type WebSocketStatus } from './websocketService';

interface UseWebSocketResult {
  status: WebSocketStatus;
  hasFailed: boolean;
  lastMessage: ProgressMessage | null;
  connect: (requestId: string) => void;
  disconnect: () => void;
}

export function useWebSocket(onMessage?: (msg: ProgressMessage) => void): UseWebSocketResult {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [hasFailed, setHasFailed] = useState(false);
  const [lastMessage, setLastMessage] = useState<ProgressMessage | null>(null);

  const serviceRef = useRef<WebSocketService | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  if (!serviceRef.current) {
    serviceRef.current = new WebSocketService();
  }

  const handleStatusChange = useCallback((newStatus: WebSocketStatus) => {
    setStatus(newStatus);
    if (newStatus === 'failed') {
      setHasFailed(true);
    }
    if (newStatus === 'connecting') {
      setHasFailed(false);
    }
  }, []);

  const connect = useCallback((requestId: string) => {
    setHasFailed(false);
    serviceRef.current?.connect(
      requestId,
      (msg) => {
        setLastMessage(msg);
        onMessageRef.current?.(msg);
      },
      handleStatusChange
    );
  }, [handleStatusChange]);

  const disconnect = useCallback(() => {
    serviceRef.current?.disconnect();
    setStatus('disconnected');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      serviceRef.current?.disconnect();
    };
  }, []);

  return { status, hasFailed, lastMessage, connect, disconnect };
}
