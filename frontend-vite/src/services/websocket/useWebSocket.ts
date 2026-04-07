import { useEffect, useRef, useState, useCallback } from 'react';
import type { WebSocketMessage, WebSocketStatus } from '@/types/websocket';
import { websocketService } from './websocketService';

interface UseWebSocketOptions {
  requestId: string;
  autoConnect?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
}

interface UseWebSocketReturn {
  status: WebSocketStatus;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export const useWebSocket = ({
  requestId,
  autoConnect = false,
  onMessage,
  onStatusChange,
}: UseWebSocketOptions): UseWebSocketReturn => {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const statusUnsubscribeRef = useRef<(() => void) | null>(null);

  const connect = useCallback(async () => {
    try {
      setError(null);
      await websocketService.connect(requestId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      throw err;
    }
  }, [requestId]);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
    setError(null);
  }, []);

  useEffect(() => {
    // Subscribe to messages
    if (onMessage) {
      unsubscribeRef.current = websocketService.subscribe(requestId, onMessage);
    }

    // Subscribe to status changes
    const handleStatusChange = (newStatus: WebSocketStatus) => {
      setStatus(newStatus);
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
    };

    statusUnsubscribeRef.current = websocketService.onStatusChange(handleStatusChange);

    // Auto-connect if requested
    if (autoConnect) {
      connect().catch((err) => {
        console.error('Auto-connect failed:', err);
      });
    }

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (statusUnsubscribeRef.current) {
        statusUnsubscribeRef.current();
      }
    };
  }, [requestId, onMessage, onStatusChange, autoConnect, connect]);

  return {
    status,
    connect,
    disconnect,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    error,
  };
};