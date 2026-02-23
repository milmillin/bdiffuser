import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "node:child_process";

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

export default defineConfig({
  define: {
    __APP_COMMIT_ID__: JSON.stringify(getCommitId()),
  },
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
  },
});
