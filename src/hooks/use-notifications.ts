'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

export function useNotifications() {
  const { data: session } = useSession();
  const socketRef = useRef<{ disconnect: () => void; connected: boolean; emit: (event: string, data: unknown) => void; on: (event: string, handler: (data: unknown) => void) => void } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const connectionAttemptedRef = useRef(false);

  useEffect(() => {
    // Only connect if user is logged in
    if (!session?.user?.id) return;

    // Only attempt connection once per session
    if (connectionAttemptedRef.current) return;
    connectionAttemptedRef.current = true;

    // Dynamically import socket.io-client to avoid Turbopack issues
    let socket: { disconnect: () => void; connected: boolean; emit: (event: string, data: unknown) => void; on: (event: string, handler: (data: unknown) => void) => void } | null = null;
    
    import('socket.io-client').then(({ io }) => {
      // Connect to notification WebSocket server
      // Use XTransformPort for the gateway
      socket = io('/?XTransformPort=3003', {
        transports: ['websocket', 'polling'],
        forceNew: false,
        reconnection: false, // Handle reconnection ourselves
        timeout: 5000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[Notifications] Connected to notification service');
        setIsConnected(true);
        // Join with user ID to receive targeted notifications
        socket?.emit('join', { userId: session.user.id });
      });

      socket.on('disconnect', () => {
        console.log('[Notifications] Disconnected from notification service');
        setIsConnected(false);
      });

      // Handle incoming notifications
      socket.on('notification', (data: NotificationData) => {
        // Show toast notification based on type
        switch (data.type) {
          case 'success':
            toast.success(data.title, { description: data.message });
            break;
          case 'warning':
            toast.warning(data.title, { description: data.message });
            break;
          case 'error':
            toast.error(data.title, { description: data.message });
            break;
          case 'info':
          default:
            toast.info(data.title, { description: data.message });
            break;
        }
      });

      socket.on('connect_error', () => {
        // Silently fail - don't log to avoid console noise
        // Real-time notifications are optional, DB notifications still work
        setIsConnected(false);
        socketRef.current = null;
      });
    }).catch(() => {
      // Silently fail if socket.io-client fails to load
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
      connectionAttemptedRef.current = false;
    };
  }, [session?.user?.id]);

  const sendNotification = useCallback((userId: string, title: string, message: string, type: NotificationData['type'] = 'info') => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('send-notification', { userId, title, message, type });
    }
  }, []);

  return { sendNotification, isConnected };
}
