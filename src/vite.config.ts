import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const backendUrl =
    env.VITE_DEV_BACKEND_URL || "http://127.0.0.1:5071";

  const verifyBackendCertificate = backendUrl.startsWith("https://");

  return {
    plugins: [react()],

    server: {
      host: "0.0.0.0", // Accessible from http://192.168.0.219:5173 on your LAN
      port: 5173,

      allowedHosts: [
        "192.168.0.219",
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