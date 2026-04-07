// WebSocket Error Handler
// Handles WebSocket connection errors and provides user feedback

export class WebSocketErrorHandler {
  static handleConnectionError(error: Event): void {
    console.error('WebSocket connection error:', error);
    
    // In a real application, you would notify the user through a notification system
    // For now, we'll just log the error
    console.warn('Unable to establish real-time connection. Falling back to polling.');
  }

  static handleMessageError(error: any): void {
    console.error('WebSocket message error:', error);
    
    // Log error for debugging
    console.error('Failed to process WebSocket message:', {
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  static handleReconnectionFailure(attempts: number): void {
    console.error(`WebSocket reconnection failed after ${attempts} attempts`);
    
    // In a real application, you would show a persistent notification
    console.warn('Unable to maintain real-time connection. Please refresh the page.');
  }

  static handleUnexpectedClose(code: number, reason: string): void {
    console.warn('WebSocket closed unexpectedly:', { code, reason });
    
    // Handle different close codes
    switch (code) {
      case 1000: // Normal closure
        console.log('WebSocket closed normally');
        break;
      case 1001: // Going away
        console.log('WebSocket closed - page is being refreshed or navigated away');
        break;
      case 1006: // Abnormal closure
        console.warn('WebSocket closed abnormally - connection lost');
        break;
      default:
        console.warn(`WebSocket closed with code ${code}: ${reason}`);
    }
  }
}