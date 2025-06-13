// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
var addSecurityHeaders = () => {
  return {
    name: "add-security-headers",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        res.setHeader("Cross-Origin-Resource-Policy", "same-site");
        next();
      });
    }
  };
};
var vite_config_default = defineConfig({
  plugins: [
    react(),
    addSecurityHeaders()
  ],
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  server: {
    // Enable HTTPS for local development
    https: true,
    // Handle client-side routing
    historyApiFallback: true,
    // Configure CORS for the dev server
    cors: {
      origin: "https://localhost:5173",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "apikey"],
      credentials: true
    }
  },
  preview: {
    // Also handle client-side routing in preview mode
    historyApiFallback: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbi8vIEN1c3RvbSBtaWRkbGV3YXJlIHRvIGFkZCBzZWN1cml0eSBoZWFkZXJzXG5jb25zdCBhZGRTZWN1cml0eUhlYWRlcnMgPSAoKSA9PiB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ2FkZC1zZWN1cml0eS1oZWFkZXJzJyxcbiAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgICAvLyBBZGQgc2VjdXJpdHkgaGVhZGVycyBidXQgbGV0IFZpdGUgaGFuZGxlIENPUlNcbiAgICAgICAgcmVzLnNldEhlYWRlcignQ3Jvc3MtT3JpZ2luLUVtYmVkZGVyLVBvbGljeScsICdyZXF1aXJlLWNvcnAnKTtcbiAgICAgICAgcmVzLnNldEhlYWRlcignQ3Jvc3MtT3JpZ2luLVJlc291cmNlLVBvbGljeScsICdzYW1lLXNpdGUnKTtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xufTtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIGFkZFNlY3VyaXR5SGVhZGVycygpXG4gIF0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0J10sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIC8vIEVuYWJsZSBIVFRQUyBmb3IgbG9jYWwgZGV2ZWxvcG1lbnRcbiAgICBodHRwczogdHJ1ZSxcbiAgICAvLyBIYW5kbGUgY2xpZW50LXNpZGUgcm91dGluZ1xuICAgIGhpc3RvcnlBcGlGYWxsYmFjazogdHJ1ZSxcbiAgICAvLyBDb25maWd1cmUgQ09SUyBmb3IgdGhlIGRldiBzZXJ2ZXJcbiAgICBjb3JzOiB7XG4gICAgICBvcmlnaW46ICdodHRwczovL2xvY2FsaG9zdDo1MTczJyxcbiAgICAgIG1ldGhvZHM6IFsnR0VUJywgJ1BPU1QnLCAnUFVUJywgJ0RFTEVURScsICdPUFRJT05TJ10sXG4gICAgICBhbGxvd2VkSGVhZGVyczogWydDb250ZW50LVR5cGUnLCAnQXV0aG9yaXphdGlvbicsICdhcGlrZXknXSxcbiAgICAgIGNyZWRlbnRpYWxzOiB0cnVlXG4gICAgfVxuICB9LFxuICBwcmV2aWV3OiB7XG4gICAgLy8gQWxzbyBoYW5kbGUgY2xpZW50LXNpZGUgcm91dGluZyBpbiBwcmV2aWV3IG1vZGVcbiAgICBoaXN0b3J5QXBpRmFsbGJhY2s6IHRydWUsXG4gIH0sXG59KTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQW9CO0FBQ3RQLE9BQU8sV0FBVztBQUdsQixJQUFNLHFCQUFxQixNQUFNO0FBQy9CLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLGdCQUFnQixRQUFRO0FBQ3RCLGFBQU8sWUFBWSxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVM7QUFFekMsWUFBSSxVQUFVLGdDQUFnQyxjQUFjO0FBQzVELFlBQUksVUFBVSxnQ0FBZ0MsV0FBVztBQUN6RCxhQUFLO0FBQUEsTUFDUCxDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0Y7QUFDRjtBQUdBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLG1CQUFtQjtBQUFBLEVBQ3JCO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsY0FBYztBQUFBLEVBQzFCO0FBQUEsRUFDQSxRQUFRO0FBQUE7QUFBQSxJQUVOLE9BQU87QUFBQTtBQUFBLElBRVAsb0JBQW9CO0FBQUE7QUFBQSxJQUVwQixNQUFNO0FBQUEsTUFDSixRQUFRO0FBQUEsTUFDUixTQUFTLENBQUMsT0FBTyxRQUFRLE9BQU8sVUFBVSxTQUFTO0FBQUEsTUFDbkQsZ0JBQWdCLENBQUMsZ0JBQWdCLGlCQUFpQixRQUFRO0FBQUEsTUFDMUQsYUFBYTtBQUFBLElBQ2Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUE7QUFBQSxJQUVQLG9CQUFvQjtBQUFBLEVBQ3RCO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
