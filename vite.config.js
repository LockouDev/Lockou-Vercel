import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        admin: fileURLToPath(new URL("./admin.html", import.meta.url)),
        adminLogin: fileURLToPath(new URL("./admin-login.html", import.meta.url)),
        robloxOauth: fileURLToPath(new URL("./roblox-oauth.html", import.meta.url)),
        privacyPolicy: fileURLToPath(new URL("./privacy-policy.html", import.meta.url)),
        termsOfService: fileURLToPath(new URL("./terms-of-service.html", import.meta.url))
      }
    }
  }
});
