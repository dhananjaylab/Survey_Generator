import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketService } from '../websocketService';
import type { WebSocketMessage } from '@/types/websocket';

// Simple WebSocket mock
const createMockWebSocket = () => {
  const mockWs = {
    readyState: 0, // CONNECTING
    url: '',
    onopen: null as ((event: Event) => void) | null,
    onclose: null as ((event: CloseEvent) => void) | null,
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as ((event: Event) => void) | null,
    close: vi.fn(),
    send: vi.fn(),
    
    // Helper methods for testing
    simulateOpen() {
      this.readyState = 1; // OPEN
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    },
    
    simulateClose(code = 1000, reason = 'Normal closure') {
      this.readyState = 3; // CLOSED
      if (this.onclose) {
        this.onclose(new CloseEvent('close', { code, reason }));
      }
    },
    
    simulateMessage(data: any) {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
      }
    },
    
    simulateError() {
      if (this.onerror) {
        this.onerror(new Event('error'));
      }
    }
  };
  
  return mockWs;
};

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockWebSocket: ReturnType<typeof createMockWebSocket>;
  const mockRequestId = 'test-request-123';

  beforeEach(() => {
    mockWebSocket = createMockWebSocket();
    
    // Mock the global WebSocket constructor
    const MockWebSocketConstructor = function(this: any, url: string) {
      Object.assign(this, mockWebSocket);
      this.url = url;
      // Auto-connect after a short delay
      setTimeout(() => this.simulateOpen(), 10);
    } as any;
    
    (globalThis as any).WebSocket = MockWebSocketConstructor;
    
    service = new WebSocketService('ws://localhost:8000');
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.disconnect();
  });

  describe('connection management', () => {
    it('should connect successfully', async () => {
      const promise = service.connect(mockRequestId);
      
      // Wait for connection
      await expect(promise).resolves.toBeUndefined();
      expect(service.getConnectionState()).toBe('connected');
    });

    it('should disconnect properly', async () => {
      await service.connect(mockRequestId);
      expect(service.getConnectionState()).toBe('connected');
      
      service.disconnect();
      expect(service.getConnectionState()).toBe('disconnected');
      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });

  describe('message handling', () => {
    it('should subscribe to messages', async () => {
      const messageHandler = vi.fn();
      const unsubscribe = service.subscribe(mockRequestId, messageHandler);
      
      await service.connect(mockRequestId);
      
      // Simulate receiving a message
      const mockMessage: WebSocketMessage = {
        requestId: mockRequestId,
        update: 'Processing...',
        completed: false,
      };
      
      mockWebSocket.simulateMessage(mockMessage);
      
      expect(messageHandler).toHaveBeenCalledWith(mockMessage);
      
      // Test unsubscribe
      unsubscribe();
      
      // Send another message - should not be received
      mockWebSocket.simulateMessage({ ...mockMessage, update: 'Another update' });
      
      expect(messageHandler).toHaveBeenCalledTimes(1);
    });

    it('should handle malformed messages gracefully', async () => {
      const messageHandler = vi.fn();
      service.subscribe(mockRequestId, messageHandler);
      
      await service.connect(mockRequestId);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Simulate receiving malformed JSON
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(new MessageEvent('message', { data: 'invalid json' }));
      }
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse WebSocket message:', expect.any(Error));
      expect(messageHandler).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('status tracking', () => {
    it('should notify status listeners', async () => {
      const statusHandler = vi.fn();
      const unsubscribe = service.onStatusChange(statusHandler);
      
      await service.connect(mockRequestId);
      
      expect(statusHandler).toHaveBeenCalledWith('connected');
      
      service.disconnect();
      
      expect(statusHandler).toHaveBeenCalledWith('disconnected');
      
      unsubscribe();
    });

    it('should return correct connection state', () => {
      expect(service.getConnectionState()).toBe('disconnected');
    });
  });

  describe('reconnection logic', () => {
    it('should attempt reconnection on unexpected close', async () => {
      const statusHandler = vi.fn();
      service.onStatusChange(statusHandler);
      
      await service.connect(mockRequestId);
      expect(statusHandler).toHaveBeenCalledWith('connected');
      
      // Simulate unexpected close
      mockWebSocket.simulateClose(1006, 'Abnormal closure');
      
      expect(statusHandler).toHaveBeenCalledWith('disconnected');
      
      // Should attempt to reconnect
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(statusHandler).toHaveBeenCalledWith('connecting');
    });

    it('should not reconnect on manual close', async () => {
      const statusHandler = vi.fn();
      service.onStatusChange(statusHandler);
      
      await service.connect(mockRequestId);
      service.disconnect();
      
      expect(statusHandler).toHaveBeenCalledWith('disconnected');
      
      // Should not attempt to reconnect after manual disconnect
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should have been called: connected, then disconnected
      const calls = statusHandler.mock.calls.map(call => call[0]);
      expect(calls).toContain('connected');
      expect(calls).toContain('disconnected');
      // Should not have any connecting calls after manual disconnect
      expect(calls.filter(call => call === 'connecting').length).toBe(0);
    });
  });

  describe('connection info', () => {
    it('should provide connection info for debugging', () => {
      const info = service.getConnectionInfo();
      
      expect(info).toEqual({
        url: 'ws://localhost:8000',
        readyState: undefined,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        isManualClose: false,
        listenersCount: 0,
        statusListenersCount: 0,
      });
    });
  });
});