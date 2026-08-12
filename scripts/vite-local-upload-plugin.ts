/**
 * Vite plugin: POST /api/local-upload → เขียนไฟล์ลง public/
 * ใช้ตอน yarn dev / vite preview (Vercel production ไม่มี disk ถาวร)
 */
import fs from "node:fs"
import type { IncomingMessage, ServerResponse } from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Connect, PreviewServer, ViteDevServer } from "vite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")
const PUBLIC_DIR = path.join(ROOT, "public")

const ALLOWED_PREFIX = /^(uploads\/[a-z0-9_-]+|images|stores|support_chat)$/i

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.end(JSON.stringify(body))
}

function sanitizeFileName(name: string) {
  const base = String(name ?? "").trim().replace(/\\/g, "/").split("/").pop() ?? "file"
  return base.replace(/\s+/g, "_").replace(/[^\w.\-()+]/g, "") || "file"
}

function readBody(req: IncomingMessage) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on("data", (c: Buffer) => chunks.push(c))
    req.on("end", () => resolve(Buffer.concat(chunks)))
    req.on("error", reject)
  })
}

function attachLocalUpload(middlewares: Connect.Server) {
  middlewares.use(async (req, res, next) => {
    const url = req.url ?? ""
    if (!url.startsWith("/api/local-upload")) return next()
    if (req.method !== "POST") {
      return sendJson(res, 405, { success: false, message: "Method not allowed" })
    }

    try {
      const parsed = new URL(url, "http://localhost")
      const prefix = String(parsed.searchParams.get("prefix") ?? "")
        .trim()
        .replace(/^\/+|\/+$/g, "")
        .replace(/\\/g, "/")
      const rawName = String(parsed.searchParams.get("name") ?? "file")

      if (!ALLOWED_PREFIX.test(prefix)) {
        return sendJson(res, 400, {
          success: false,
          message: `prefix ไม่ได้รับอนุญาต: ${prefix}`,
        })
      }

      const body = await readBody(req)
      if (!body.length) {
        return sendJson(res, 400, { success: false, message: "ไม่มีข้อมูลไฟล์" })
      }

      const safeName = sanitizeFileName(rawName)
      const relativePath = `${prefix}/${Date.now()}_${safeName}`
      const absPath = path.join(PUBLIC_DIR, ...relativePath.split("/"))
      const resolved = path.resolve(absPath)
      if (!resolved.startsWith(path.resolve(PUBLIC_DIR) + path.sep)) {
        return sendJson(res, 400, { success: false, message: "path ไม่ปลอดภัย" })
      }

      fs.mkdirSync(path.dirname(resolved), { recursive: true })
      fs.writeFileSync(resolved, body)

      return sendJson(res, 200, { success: true, path: relativePath.replace(/\\/g, "/") })
    } catch (err) {
      return sendJson(res, 500, {
        success: false,
        message: err instanceof Error ? err.message : "อัปโหลดล้มเหลว",
      })
    }
  })
}

export function localUploadPlugin() {
  return {
    name: "local-upload",
    configureServer(server: ViteDevServer) {
      attachLocalUpload(server.middlewares)
    },
    configurePreviewServer(server: PreviewServer) {
      attachLocalUpload(server.middlewares)
    },
  }
}
