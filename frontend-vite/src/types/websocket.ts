// WebSocket Type Definitions
// This file contains all WebSocket-related TypeScript interfaces and types

export interface WebSocketMessage {
  requestId: string;
  update: string;
  completed?: boolean;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  connectionAttempts: number;
}

export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';