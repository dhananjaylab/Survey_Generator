import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';
import { websocketService } from '../websocketService';

// Mock the websocketService
vi.mock('../websocketService', () => ({
  websocketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    onStatusChange: vi.fn(),
  },
}));

describe('useWebSocket', () => {
  const mockRequestId = 'test-request-123';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() =>
      useWebSocket({ requestId: mockRequestId })
    );

    expect(result.current.status).toBe('disconnected');
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should auto-connect when autoConnect is true', () => {
    const mockConnect = vi.mocked(websocketService.connect);
    mockConnect.mockResolvedValue();

    renderHook(() =>
      useWebSocket({ 
        requestId: mockRequestId, 
        autoConnect: true 
      })
    );

    expect(mockConnect).toHaveBeenCalledWith(mockRequestId);
  });

  it('should subscribe to messages and status changes', () => {
    const mockSubscribe = vi.mocked(websocketService.subscribe);
    const mockOnStatusChange = vi.mocked(websocketService.onStatusChange);
    const mockUnsubscribe = vi.fn();
    const mockStatusUnsubscribe = vi.fn();
    
    mockSubscribe.mockReturnValue(mockUnsubscribe);
    mockOnStatusChange.mockReturnValue(mockStatusUnsubscribe);

    const onMessage = vi.fn();
    const onStatusChange = vi.fn();

    const { unmount } = renderHook(() =>
      useWebSocket({ 
        requestId: mockRequestId,
        onMessage,
        onStatusChange
      })
    );

    expect(mockSubscribe).toHaveBeenCalledWith(mockRequestId, onMessage);
    expect(mockOnStatusChange).toHaveBeenCalledWith(expect.any(Function));

    // Test cleanup on unmount
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockStatusUnsubscribe).toHaveBeenCalled();
  });

  it('should handle connect function', async () => {
    const mockConnect = vi.mocked(websocketService.connect);
    mockConnect.mockResolvedValue();

    const { result } = renderHook(() =>
      useWebSocket({ requestId: mockRequestId })
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(mockConnect).toHaveBeenCalledWith(mockRequestId);
  });

  it('should handle connect errors', async () => {
    const mockConnect = vi.mocked(websocketService.connect);
    const error = new Error('Connection failed');
    mockConnect.mockRejectedValue(error);

    const { result } = renderHook(() =>
      useWebSocket({ requestId: mockRequestId })
    );

    await act(async () => {
      try {
        await result.current.connect();
      } catch (err) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe('Connection failed');
  });

  it('should handle disconnect function', () => {
    const mockDisconnect = vi.mocked(websocketService.disconnect);

    const { result } = renderHook(() =>
      useWebSocket({ requestId: mockRequestId })
    );

    act(() => {
      result.current.disconnect();
    });

    expect(mockDisconnect).toHaveBeenCalled();
    expect(result.current.error).toBe(null);
  });

  it('should update status when status changes', () => {
    const mockOnStatusChange = vi.mocked(websocketService.onStatusChange);
    let statusCallback: (status: any) => void = () => {};
    
    mockOnStatusChange.mockImplementation((callback) => {
      statusCallback = callback;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useWebSocket({ requestId: mockRequestId })
    );

    // Simulate status change
    act(() => {
      statusCallback('connecting');
    });

    expect(result.current.status).toBe('connecting');
    expect(result.current.isConnecting).toBe(true);
    expect(result.current.isConnected).toBe(false);

    // Simulate connected status
    act(() => {
      statusCallback('connected');
    });

    expect(result.current.status).toBe('connected');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isConnecting).toBe(false);
  });
});