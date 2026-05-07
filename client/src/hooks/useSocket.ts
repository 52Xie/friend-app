import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(userId: number) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());

  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('register', userId);
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('user_status', ({ user_id, online }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (online) next.add(user_id);
        else next.delete(user_id);
        return next;
      });
    });

    return () => { socket.disconnect(); };
  }, [userId]);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event: string) => {
    socketRef.current?.off(event);
  }, []);

  const emit = useCallback((event: string, data: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { socket: socketRef.current, isConnected, onlineUsers, on, off, emit };
}
