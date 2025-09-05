import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
   VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["icons/logo.png"],
  manifest: {
    name: "PhaseFit",
    short_name: "PhaseFit",
    description: "AI-powered cycle-based nutrition & fitness coach for women.",
    start_url: "/",
    scope: "/",
    theme_color: "#ec4899",
    background_color: "#ffffff",
    display: "standalone",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/logo-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/logo-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/logo-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      }
    ],
    screenshots: [
      {
        src: "/screenshots/dashboard.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
      },
      {
        src: "/screenshots/planner.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
      }
    ]
  }
})
  ],
});
