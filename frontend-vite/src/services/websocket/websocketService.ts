import type { WebSocketMessage, WebSocketStatus } from '@/types/websocket';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private listeners: Map<string, (message: WebSocketMessage) => void> = new Map();
  private statusListeners: Set<(status: WebSocketStatus) => void> = new Set();
  private isManualClose = false;
  private reconnectTimeoutId: number | null = null;

  constructor(baseUrl: string = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000') {
    this.url = baseUrl;
  }

  connect(requestId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isManualClose = false;
        const wsUrl = `${this.url}/ws/survey/${requestId}`;
        
        console.log(`Connecting to WebSocket: ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
          this.notifyStatusListeners('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('WebSocket message received:', message);
            this.notifyListeners(requestId, message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.notifyStatusListeners('disconnected');
          
          if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect(requestId);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.notifyStatusListeners('error');
          reject(error);
        };

        // Connection timeout
        setTimeout(() => {
          if (this.ws?.readyState === WebSocket.CONNECTING) {
            this.ws.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 5000);

      } catch (error) {
        reject(error);
      }
    });
  }

  private scheduleReconnect(requestId: string): void {
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.notifyStatusListeners('connecting');
    
    this.reconnectTimeoutId = window.setTimeout(() => {
      this.connect(requestId).catch((error) => {
        console.error('Reconnection failed:', error);
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
          this.notifyStatusListeners('error');
        }
      });
    }, delay);
  }

  disconnect(): void {
    this.isManualClose = true;
    
    // Clear any pending reconnection attempts
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.listeners.clear();
    this.reconnectAttempts = 0;
    this.notifyStatusListeners('disconnected');
  }

  subscribe(requestId: string, callback: (message: WebSocketMessage) => void): () => void {
    this.listeners.set(requestId, callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(requestId);
    };
  }

  onStatusChange(callback: (status: WebSocketStatus) => void): () => void {
    this.statusListeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private notifyListeners(requestId: string, message: WebSocketMessage): void {
    const callback = this.listeners.get(requestId);
    if (callback) {
      callback(message);
    }
  }

  private notifyStatusListeners(status: WebSocketStatus): void {
    this.statusListeners.forEach(callback => callback(status));
  }

  getConnectionState(): WebSocketStatus {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'error';
    }
  }

  // Get current connection info for debugging
  getConnectionInfo() {
    return {
      url: this.url,
      readyState: this.ws?.readyState,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      isManualClose: this.isManualClose,
      listenersCount: this.listeners.size,
      statusListenersCount: this.statusListeners.size,
    };
  }
}

export const websocketService = new WebSocketService();