import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  // The prototype is published as a standalone page: relative asset URLs, and
  // fonts inlined because the host only serves fonts from data: URIs
  const prototype = mode === "prototype";
  return {
    plugins: [react(), tailwindcss()],
    base: prototype ? "./" : "/",
    build: prototype
      ? { assetsInlineLimit: (file: string) => file.endsWith(".woff2") }
      : {},
  };
});
