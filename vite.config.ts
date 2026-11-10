import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const backendUrl =
    env.VITE_DEV_BACKEND_URL || "https://backendfruits.com";

  const verifyBackendCertificate = backendUrl.startsWith("https://");

  return {
    plugins: [react()],

    server: {
      host: true,
      port: 5173,

      allowedHosts: [
        "fruzely.com",
        "www.fruzely.com",
        "backendfrutis.com",
      ],

      proxy: {
        "/react/api": {
          target: backendUrl,
          changeOrigin: true,
          secure: verifyBackendCertificate,
        },

        "/shop": {
          target: backendUrl,
          changeOrigin: true,
          secure: verifyBackendCertificate,
        },

        "/static": {
          target: backendUrl,
          changeOrigin: true,
          secure: verifyBackendCertificate,
        },
        "/media/onedrive": {
          target: backendUrl,
          changeOrigin: true,
          secure: verifyBackendCertificate,
        },
      },
    },
  };
});