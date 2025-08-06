import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppContext } from '@/context/AppContext';
import { StockTick, KafkaMetrics } from '@/types';

interface UseSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  subscribe: (symbols: string[]) => void;
}

export const useSocket = (options: UseSocketOptions = {}): UseSocketReturn => {
  const {
    url = process.env.NODE_ENV === 'production' 
      ? `${window.location.protocol}//${window.location.host}`
      : 'http://localhost:8080',
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000
  } = options;

  const { actions } = useAppContext();
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionAttemptsRef = useRef(0);

  // Clear reconnection timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Handle connection
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    try {
      actions.setConnectionStatus({ 
        reconnecting: true, 
        error: null 
      });

      const socket = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: false, // We'll handle reconnection manually
        forceNew: true
      });

      socketRef.current = socket;

      // Connection successful
      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        connectionAttemptsRef.current = 0;
        clearReconnectTimeout();
        
        actions.setConnectionStatus({
          connected: true,
          reconnecting: false,
          error: null,
          lastConnected: new Date().toISOString(),
          connectionCount: connectionAttemptsRef.current + 1
        });

        // Subscribe to stock updates
        socket.emit('subscribe', ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN']);
      });

      // Handle stock tick data
      socket.on('stock-tick', (data: StockTick) => {
        try {
          // Validate the data structure
          if (data && typeof data === 'object' && data.symbol && typeof data.price === 'number') {
            actions.addStockTick(data);
          } else {
            console.warn('Invalid stock tick data received:', data);
          }
        } catch (error) {
          console.error('Error processing stock tick:', error);
        }
      });

      // Handle metrics updates
      socket.on('metrics', (data: KafkaMetrics) => {
        try {
          if (data && typeof data === 'object') {
            actions.updateMetrics(data);
          }
        } catch (error) {
          console.error('Error processing metrics:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        actions.setConnectionStatus({
          connected: false,
          reconnecting: false,
          error: `Disconnected: ${reason}`
        });

        // Attempt reconnection if not manually disconnected
        if (reason !== 'io client disconnect' && connectionAttemptsRef.current < reconnectionAttempts) {
          scheduleReconnection();
        }
      });

      // Handle connection errors
      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        actions.setConnectionStatus({
          connected: false,
          reconnecting: false,
          error: `Connection error: ${error.message}`
        });

        if (connectionAttemptsRef.current < reconnectionAttempts) {
          scheduleReconnection();
        } else {
          actions.setConnectionStatus({
            reconnecting: false,
            error: 'Max reconnection attempts reached'
          });
        }
      });

      // Handle other error events
      socket.on('error', (error) => {
        console.error('Socket error:', error);
        actions.setError(`Socket error: ${error}`);
      });

    } catch (error) {
      console.error('Failed to create socket connection:', error);
      actions.setConnectionStatus({
        connected: false,
        reconnecting: false,
        error: `Failed to connect: ${error}`
      });
    }
  }, [url, actions, reconnectionAttempts]);

  // Schedule reconnection with exponential backoff
  const scheduleReconnection = useCallback(() => {
    clearReconnectTimeout();
    connectionAttemptsRef.current++;
    
    const delay = Math.min(
      reconnectionDelay * Math.pow(2, connectionAttemptsRef.current - 1),
      30000 // Max 30 seconds
    );

    console.log(`Scheduling reconnection attempt ${connectionAttemptsRef.current} in ${delay}ms`);
    
    actions.setConnectionStatus({
      reconnecting: true,
      error: `Reconnecting in ${Math.round(delay / 1000)}s... (attempt ${connectionAttemptsRef.current}/${reconnectionAttempts})`
    });

    reconnectTimeoutRef.current = setTimeout(() => {
      if (connectionAttemptsRef.current <= reconnectionAttempts) {
        connect();
      }
    }, delay);
  }, [connect, reconnectionDelay, reconnectionAttempts, actions]);

  // Disconnect socket
  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    connectionAttemptsRef.current = reconnectionAttempts; // Prevent auto-reconnection
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    actions.setConnectionStatus({
      connected: false,
      reconnecting: false,
      error: null
    });
  }, [actions, reconnectionAttempts]);

  // Subscribe to specific symbols
  const subscribe = useCallback((symbols: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', symbols);
    }
  }, []);

  // Initialize connection
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      clearReconnectTimeout();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [autoConnect, connect, clearReconnectTimeout]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, we might want to reduce activity
        console.log('Page hidden, maintaining connection');
      } else {
        // Page is visible, ensure connection is active
        console.log('Page visible, checking connection');
        if (!socketRef.current?.connected && autoConnect) {
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connect, autoConnect]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network online, attempting to reconnect');
      if (!socketRef.current?.connected && autoConnect) {
        connectionAttemptsRef.current = 0; // Reset attempts
        connect();
      }
    };

    const handleOffline = () => {
      console.log('Network offline');
      actions.setConnectionStatus({
        connected: false,
        error: 'Network offline'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connect, autoConnect, actions]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
    connect,
    disconnect,
    subscribe
  };
};
