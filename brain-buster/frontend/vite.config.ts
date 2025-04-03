import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/games/brain-buster/', // Angepasst für die Bereitstellung unter https://mrx3k1.de/games/brain-buster
    server: {
        proxy: {
            '/socket-api': {
                target: 'http://localhost:4999',
                ws: true,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/socket-api/, '')
            }
        }
    }
});