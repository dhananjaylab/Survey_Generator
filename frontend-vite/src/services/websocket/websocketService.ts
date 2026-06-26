/**
 * WebSocket service — connects to /ws/survey/{requestId} with JWT auth.
 *
 * Phase 1 change: appends ?token=<access_token> to the connection URL,
 * since the browser WebSocket API cannot send custom headers during
 * the handshake. The backend validates this token and closes with
 * 4001 (unauthorized) or 4003 (forbidden) on failure.
 *
 * Phase 2 change: does NOT attempt to reconnect on 4001/4003 — these
 * are permanent auth failures, not transient network issues. Reconnect
 * is only attempted for other close codes (1006, etc).
 */
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8000';

const AUTH_CLOSE_CODES = new Set([4001, 4003]);

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'failed';

export interface ProgressMessage {
  request_id: string;
  update: string;
  completed?: boolean;
}

function buildUrl(requestId: string): string {
  const { tokens } = useAuthStore.getState();
  const token = tokens?.access_token ?? '';
  // encodeURIComponent guards against '+' / '/' / '=' in JWT being mangled
  return `${WS_BASE_URL}/ws/survey/${requestId}?token=${encodeURIComponent(token)}`;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelayMs = 2000;
  private manualClose = false;

  connect(
    requestId: string,
    onMessage: (msg: ProgressMessage) => void,
    onStatusChange: (status: WebSocketStatus) => void
  ): void {
    this.manualClose = false;
    this._open(requestId, onMessage, onStatusChange);
  }

  private _open(
    requestId: string,
    onMessage: (msg: ProgressMessage) => void,
    onStatusChange: (status: WebSocketStatus) => void
  ): void {
    onStatusChange('connecting');

    const url = buildUrl(requestId);
    // Never log the full URL — it contains the JWT.
    logger.debug(`[ws] connecting to /ws/survey/${requestId} (token redacted)`);

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      logger.debug('[ws] connected');
      this.reconnectAttempts = 0;
      onStatusChange('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: ProgressMessage = JSON.parse(event.data);
        onMessage(msg);
      } catch (err) {
        logger.warn('[ws] failed to parse message', err);
      }
    };

    this.ws.onclose = (event) => {
      logger.debug(`[ws] closed — code=${event.code} reason=${event.reason}`);
      onStatusChange('disconnected');

      if (this.manualClose) return;

      if (AUTH_CLOSE_CODES.has(event.code)) {
        // Permanent auth failure — do not retry.
        logger.warn(`[ws] auth failure (code ${event.code}) — not reconnecting`);
        onStatusChange('failed');
        return;
      }

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts += 1;
        const delay = this.reconnectDelayMs * this.reconnectAttempts;
        logger.debug(`[ws] reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => this._open(requestId, onMessage, onStatusChange), delay);
      } else {
        logger.warn('[ws] max reconnect attempts reached');
        onStatusChange('failed');
      }
    };

    this.ws.onerror = (err) => {
      logger.warn('[ws] error', err);
    };
  }

  disconnect(): void {
    this.manualClose = true;
    this.ws?.close();
    this.ws = null;
  }
}
