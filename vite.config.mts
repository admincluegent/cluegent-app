import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { version } from './package.json'

// Inject version so the React frontend can read it via import.meta.env.VITE_APP_VERSION
process.env.VITE_APP_VERSION = version;

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: './', // Use relative paths for Electron
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@hooks": path.resolve(__dirname, "./src/hooks"),
            "@config": path.resolve(__dirname, "./src/config"),
        },
    },
    server: {
        host: '127.0.0.1',
        port: 5180,
    },
    build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) {
                        return;
                    }

                    if (
                        id.includes('node_modules/react') ||
                        id.includes('node_modules/react-dom') ||
                        id.includes('node_modules/framer-motion')
                    ) {
                        return 'vendor';
                    }

                    if (
                        id.includes('node_modules/lucide-react') ||
                        id.includes('node_modules/@radix-ui/react-dialog') ||
                        id.includes('node_modules/@radix-ui/react-toast')
                    ) {
                        return 'ui';
                    }
                }
            }
        }
    }
})
