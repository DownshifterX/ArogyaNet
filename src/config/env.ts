const DEFAULT_BACKEND_URL = 'http://52.65.130.42:8090';

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

// TURN server configuration
const turnApiUrl = import.meta.env?.VITE_TURN_API_URL as string | undefined;
const iceRelayOnly = import.meta.env?.VITE_ICE_RELAY_ONLY === 'true';

export const env = {
  backendUrl,
  socketUrl,
  turnApiUrl,
  iceRelayOnly,
};

export default env;

