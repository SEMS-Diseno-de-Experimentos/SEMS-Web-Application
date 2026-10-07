import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    // "@" apunta a src/. Evita las cadenas de "../../.." al subir de carpeta.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
