import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { localUploadPlugin } from "./scripts/vite-local-upload-plugin.ts"

function assertSupabaseEnvForBuild(command: "build" | "serve", mode: string) {
  if (command !== "build") return
  const fileEnv = loadEnv(mode, process.cwd(), "VITE_")
  const url = (fileEnv.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim()
  const key = (fileEnv.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim()
  if (!url || !key) {
    throw new Error(
      "Build ต้องมี VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY — บนเครื่องใส่ใน .env / บน Vercel ตั้งที่ Settings → Environment Variables แล้ว Redeploy",
    )
  }
}

export default defineConfig(({ command, mode }) => {
  assertSupabaseEnvForBuild(command, mode)
  return {
    plugins: [react(), localUploadPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
