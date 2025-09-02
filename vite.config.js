import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: true }, // SW also in dev so you can test install
      manifest: {
        name: "PhaseFit",
        short_name: "PhaseFit",
        description: "Cycle-aware nutrition & workout planner",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
          {
            // quick, no-files-needed icons via data URLs (fine for demo)
            src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192"><rect fill="%23fce7f3" width="100%" height="100%"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="80" fill="%23be185d">PF</text></svg>',
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any"
          },
          {
            src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect fill="%23fce7f3" width="100%" height="100%"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="210" fill="%23be185d">PF</text></svg>',
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any"
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            // API calls: online first (falls back to cache if offline)
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // static assets: stale-while-revalidate
            urlPattern: ({ request }) =>
              ["document", "script", "style", "image", "font"].includes(request.destination),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "static-cache" },
          },
        ],
      },
    }),
  ],
});
