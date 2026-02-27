import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function getCommitId() {
  const envCommit =
    process.env.VITE_APP_COMMIT ||
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.GITHUB_SHA;

  if (envCommit) {
    return envCommit.slice(0, 7);
  }

  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}

function getAppVersion() {
  try {
    const rootPkg = JSON.parse(
      readFileSync(resolve(__dirname, "../../package.json"), "utf8"),
    );
    return rootPkg.version;
  } catch {
    return "0.0.0";
  }
}

export default defineConfig({
  define: {
    __APP_COMMIT_ID__: JSON.stringify(getCommitId()),
    __APP_VERSION__: JSON.stringify(getAppVersion()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: [
        "pwa/icon.svg",
        "pwa/icon-192.png",
        "pwa/icon-512.png",
        "pwa/icon-maskable-512.png",
        "pwa/apple-touch-icon.png",
      ],
      manifest: {
        id: "/",
        name: "Bomb Busters",
        short_name: "Bomb Busters",
        description:
          "Cooperative multiplayer wire-cutting game where teammates defuse bombs together.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
        icons: [
          {
            src: "/pwa/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        globIgnores: ["**/images/**", "**/audio/**"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.destination === "image" && url.pathname.startsWith("/images/"),
            handler: "CacheFirst",
            options: {
              cacheName: "bb-images-v1",
              expiration: {
                maxEntries: 140,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: ({ request, url }) =>
              request.destination === "audio" && url.pathname.startsWith("/audio/"),
            handler: "CacheFirst",
            options: {
              cacheName: "bb-audio-v1",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
  },
});
