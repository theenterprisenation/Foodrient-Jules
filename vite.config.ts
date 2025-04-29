import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Custom middleware to add security headers
const addSecurityHeaders = () => {
  return {
    name: 'add-security-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Add Cross-Origin-Embedder-Policy header
        res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
        
        // Add Cross-Origin-Resource-Policy header
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        
        // Add CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
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
    // Handle client-side routing
    historyApiFallback: true,
    // Configure CORS for the dev server
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  },
  preview: {
    // Also handle client-side routing in preview mode
    historyApiFallback: true,
  },
});