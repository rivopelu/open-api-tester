import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

function getClientPort(env: Record<string, string>): number {
  if (env.VITE_PORT && !Number.isNaN(Number(env.VITE_PORT))) {
    return Number(env.VITE_PORT);
  }
  if (env.CLIENT_URL) {
    try {
      const parsedUrl = new URL(env.CLIENT_URL);
      if (parsedUrl.port) return Number(parsedUrl.port);
    } catch {
      // ignore invalid URL and use fallback
    }
  }
  return 7792;
}

function getApiProxyTarget(env: Record<string, string>): string {
  if (env.VITE_API_PROXY_TARGET) {
    return env.VITE_API_PROXY_TARGET;
  }
  if (env.VITE_API_URL) {
    try {
      return new URL(env.VITE_API_URL).origin;
    } catch {
      // ignore invalid URL and use fallback
    }
  }
  const backendPort = env.PORT || "8888";
  return `http://localhost:${backendPort}`;
}

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(import.meta.dirname, "../..");
  const env = loadEnv(mode, envDir, "");

  return {
    plugins: [react(), tailwindcss()],
    envDir,
    resolve: {
      alias: {
        "@modern-api-studio/types": path.resolve(
          import.meta.dirname,
          "../../packages/types/index.ts",
        ),
        "@modern-api-studio/utils": path.resolve(
          import.meta.dirname,
          "../../packages/utils/index.ts",
        ),
      },
    },
    server: {
      port: getClientPort(env),
      proxy: {
        "/api": {
          target: getApiProxyTarget(env),
          changeOrigin: true,
        },
      },
    },
    optimizeDeps: {
      include: ["js-yaml", "uuid"],
    },
  };
});
