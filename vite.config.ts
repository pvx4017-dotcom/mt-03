import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { localUploadPlugin } from "./scripts/vite-local-upload-plugin.ts"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localUploadPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
