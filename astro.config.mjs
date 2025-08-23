// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  adapter: node({
    mode: "standalone", // genera un servidor Node con entry.mjs
  }),
  output: "server", // build como app de servidor (API routes incluidas)
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    // Coolify suele inyectar PORT. Astro la respetará.
    // Si corres en local, usará 4321 por defecto.
    host: true,
  },
});
