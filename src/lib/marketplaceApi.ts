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
  product_image: string
  product_images: string
  product_price: string | number
}

function getPrimaryImage(row: ApiProduct): string {
  const multiRaw = String(row.product_images || "").trim()
  if (multiRaw) {
    try {
      const parsed = JSON.parse(multiRaw) as unknown
      if (Array.isArray(parsed)) {
        const first = parsed.map(String).find((v) => v.trim())
        if (first) return asset(first.trim())
      }
    } catch {
      /* legacy data */
    }
  }
  const legacy = String(row.product_image || "").trim()
  if (legacy) return asset(legacy)
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
  }
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
  const rows = await dbFetchShops(false)
  return rows.filter((s) => s.shop_name?.trim()) as ApiShop[]
}

export async function fetchProducts(): Promise<ApiProduct[]> {
  if (!isSupabaseConfigured()) return []
  return (await dbFetchProducts()) as ApiProduct[]
}

export function shopPath(name: string): string {
  return `/shop/${encodeURIComponent(name.trim())}`
}
