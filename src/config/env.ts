const DEFAULT_BACKEND_URL = 'http://52.65.130.42:8090';

const backendUrl = (import.meta.env?.VITE_BACKEND_URL as string | undefined) ?? DEFAULT_BACKEND_URL;
const socketUrl = (import.meta.env?.VITE_SOCKET_URL as string | undefined) ?? backendUrl;

export const env = {
  backendUrl,
  socketUrl,
};

export default env;

