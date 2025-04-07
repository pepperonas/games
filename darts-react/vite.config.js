import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/games/darts-react/',  // Dies ist der wichtige Teil
    server: {
        port: 3000,
        open: true
    }
});