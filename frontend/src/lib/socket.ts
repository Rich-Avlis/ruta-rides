import { io, type Socket } from 'socket.io-client';
import { resolveApiUrl } from './apiUrl';

const API_URL = resolveApiUrl();

let socket: Socket | null = null;
let currentToken = '';

/**
 * Reutiliza una sola conexión por token. Si la sesión cambia, reconecta con el
 * token nuevo.
 */
export function getSocket(): Socket {
  const token =
    typeof window !== 'undefined' ? window.localStorage.getItem('token') ?? '' : '';

  if (!socket || token !== currentToken) {
    socket?.disconnect();
    currentToken = token;
    socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }

  return socket;
}

export function closeSocket(): void {
  socket?.disconnect();
  socket = null;
  currentToken = '';
}
