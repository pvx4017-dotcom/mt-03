import { asset } from "@/lib/assets"
import type { Product } from "@/data/products"
import { dbFetchCategories, dbFetchProducts, dbFetchShops } from "@/lib/dbService"
import { isSupabaseConfigured } from "@/lib/supabase"

export type ApiCategory = {
  id: number
  category_name: string
  category_image: string
}

export type ApiShop = {
  id: number
  shop_name: string
  shop_image: string
  review_count: number
  view_count: number
  trust_score: string
  sales_volume: number
}

export type ApiProduct = {
  id: number
  shop_name: string
  product_category: string
  product_name: string
  product_description?: string
  product_image: string
  product_images: string
  product_price: string | number
  product_stock?: number
  product_sizes?: string
  product_colors?: string
  review_count?: number
  view_count?: number
  sales_volume?: number
  trust_score?: number | string
}

export function getProductImagePaths(row: Pick<ApiProduct, "product_image" | "product_images">): string[] {
  const paths: string[] = []
  const push = (value: string) => {
    const v = value.trim()
    if (v && !paths.includes(v)) paths.push(v)
  }

  const multiRaw = row.product_images as unknown
  if (multiRaw) {
    if (Array.isArray(multiRaw)) {
      multiRaw.map(String).forEach((v) => push(v))
    } else {
      const s = String(multiRaw).trim()
      if (s) {
        try {
          const parsed = JSON.parse(s) as unknown
          if (Array.isArray(parsed)) parsed.map(String).forEach((v) => push(v))
          else push(s)
        } catch {
          push(s)
        }
      }
    }
  }
  push(String(row.product_image ?? ""))
  return paths
}

export function getProductImageUrls(row: Pick<ApiProduct, "product_image" | "product_images">): string[] {
  const paths = getProductImagePaths(row)
  if (!paths.length) return [asset("logo/shop logo.webp")]
  return paths.map((p) => asset(p))
}

export function getPrimaryImagePath(row: Pick<ApiProduct, "product_image" | "product_images">): string {
  return getProductImagePaths(row)[0] ?? ""
}

function getPrimaryImage(row: ApiProduct): string {
  const path = getPrimaryImagePath(row)
  if (path) return asset(path)
  return asset("logo/shop logo.webp")
}

export function mapApiProduct(row: ApiProduct): Product {
  return {
    id: String(row.id),
    title: String(row.product_name || "สินค้า").trim() || "สินค้า",
    price: Number(row.product_price) || 0,
    image: getPrimaryImage(row),
    category: String(row.product_category || "").trim(),
    shopName: String(row.shop_name || "").trim(),
    reviewCount: Number(row.review_count) || 0,
    viewCount: Number(row.view_count) || 0,
    salesVolume: Number(row.sales_volume) || 0,
    trustScore: Number(row.trust_score) || 0,
  }
}

/** trust_score 0–100 → คะแนนดาว 0–5 */
export function trustScoreToRating(trustScore?: number): number {
  const score = Number(trustScore ?? 0)
  if (!Number.isFinite(score) || score <= 0) return 0
  if (score <= 5) return Math.min(5, score)
  return Math.min(5, Math.round((score / 20) * 10) / 10)
}

/** ย่อตัวเลขสำหรับ card — 1.2k, 56k, 1.5M */
export function formatCompactCount(value: number | string): string {
  const num = Number(value || 0)
  if (!Number.isFinite(num) || num <= 0) return "0"
  if (num >= 1_000_000) {
    const m = num / 1_000_000
    return `${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}M`
  }
  if (num >= 10_000) return `${Math.round(num / 1000)}k`
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`
  return num.toLocaleString("th-TH")
}

export function mapApiShopImage(path: string): string {
  const value = String(path || "").trim()
  if (!value) return asset("logo/shop logo.webp")
  return asset(value)
}

export function formatNumberText(value: number | string): string {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num.toLocaleString("th-TH") : "0"
}

export async function fetchCategories(): Promise<ApiCategory[]> {
  if (!isSupabaseConfigured()) return []
  const rows = await dbFetchCategories()
  return rows.filter((c) => c.category_name?.trim() && c.category_image?.trim()) as ApiCategory[]
}

export async function fetchShops(): Promise<ApiShop[]> {
  if (!isSupabaseConfigured()) return []
  const rows = await dbFetchShops(true)
  return rows.filter((s) => s.shop_name?.trim()) as ApiShop[]
}

export async function fetchSlideBanners(): Promise<string[]> {
  if (!isSupabaseConfigured()) return []
  const { dbFetchSlides } = await import("@/lib/dbService")
  const rows = await dbFetchSlides()
  return rows.map((r) => String(r.slide_image ?? r.image_path ?? "").trim()).filter(Boolean)
}

export async function fetchProducts(): Promise<ApiProduct[]> {
  if (!isSupabaseConfigured()) return []
  return (await dbFetchProducts()) as ApiProduct[]
}

export function shopPath(name: string): string {
  return `/shop/${encodeURIComponent(name.trim())}`
}
