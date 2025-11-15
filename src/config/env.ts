const DEFAULT_BACKEND_URL = 'http://localhost:8090';

// Get backend URL from environment variable, with fallback
let backendUrl = (import.meta.env?.VITE_BACKEND_URL as string | undefined) ?? DEFAULT_BACKEND_URL;

// Ensure URL has protocol (http:// or https://)
if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
  // Default to https for production-like domains, http for IPs/localhost
  if (backendUrl.includes('localhost') || backendUrl.match(/^\d+\.\d+\.\d+\.\d+/)) {
    backendUrl = `http://${backendUrl}`;
  } else {
    backendUrl = `https://${backendUrl}`;
  }
}

// Socket URL can be different from backend URL (e.g., for WebSocket connections)
let socketUrl = (import.meta.env?.VITE_SOCKET_URL as string | undefined) ?? backendUrl;

// Ensure socket URL has protocol
if (socketUrl && !socketUrl.startsWith('http://') && !socketUrl.startsWith('https://')) {
  if (socketUrl.includes('localhost') || socketUrl.match(/^\d+\.\d+\.\d+\.\d+/)) {
    socketUrl = `http://${socketUrl}`;
  } else {
    socketUrl = `https://${socketUrl}`;
  }
}

// STUN servers for WebRTC - can be customized via environment variables
const DEFAULT_STUN_SERVERS = [
  "stun:stun.l.google.com:19302",
  "stun:global.stun.twilio.com:3478",
  "stun:stun1.l.google.com:19302",
  "stun:stun2.l.google.com:19302",
  "stun:stun3.l.google.com:19302",
  "stun:stun4.l.google.com:19302",
];

const stunServers = (import.meta.env?.VITE_STUN_SERVERS as string | undefined)
  ? (import.meta.env.VITE_STUN_SERVERS as string).split(',').map(s => s.trim())
  : DEFAULT_STUN_SERVERS;

export const env = {
  backendUrl,
  socketUrl,
  stunServers,
};

export default env;

