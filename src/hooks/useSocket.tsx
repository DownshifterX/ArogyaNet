import { useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { env } from '@/config/env';
import { SocketContext } from '@/contexts/SocketContext';

// Hooks
export function useSocket(): Socket | null {
  const context = useContext(SocketContext);
  return context.socket;
}

export function useSocketContext() {
  return useContext(SocketContext);
}

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    try {
      console.log('🔌 Initializing socket connection to:', env.socketUrl);
      
      const socketInstance = io(env.socketUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });

      socketInstance.on('connect', () => {
        console.log('✅ Socket connected:', socketInstance.id);
        setIsConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('❌ Socket disconnected');
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    } catch (error) {
      console.error('❌ Error initializing socket:', error);
    }
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
