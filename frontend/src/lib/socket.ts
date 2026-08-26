import { io } from 'socket.io-client';

const getSocketServerUrl = () => {
    if (typeof window === 'undefined') return 'http://127.0.0.1:4000';

    const hostname = window.location.hostname;

    // Si estás en local o en la red Wi-Fi (IP), conectar directo al backend en el puerto 4000
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
        return `http://${hostname}:4000`;
    }

    // Si estás navegando desde el túnel de Cloudflare (datos móviles), usar el mismo origen
    return window.location.origin;
};

export const socket = io(getSocketServerUrl(), {
    autoConnect: true,
    path: '/socket.io', // Sin barra al final
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
});