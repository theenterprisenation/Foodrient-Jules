import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Custom middleware to add security headers
const addSecurityHeaders = () => {
  return {
    name: 'add-security-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Add security headers but let Vite handle CORS
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
        next();
      });
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    addSecurityHeaders()
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    // Enable HTTPS for local development
    https: true,
    // Handle client-side routing
    historyApiFallback: true,
    // Configure CORS for the dev server
    cors: {
      origin: 'https://localhost:5173',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'apikey'],
      credentials: true
    }
  },
  preview: {
    // Also handle client-side routing in preview mode
    historyApiFallback: true,
  },
});