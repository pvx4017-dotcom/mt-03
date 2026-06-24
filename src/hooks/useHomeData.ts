import { useEffect, useState } from "react"
import type { Product } from "@/data/products"
import {
  fetchCategories,
  fetchProducts,
  fetchShops,
  mapApiProduct,
  type ApiCategory,
  type ApiShop,
} from "@/lib/marketplaceApi"

type HomeData = {
  categories: ApiCategory[]
  categoriesStatus: string
  shops: ApiShop[]
  shopsStatus: string
  dailyProducts: Product[]
  dailyStatus: string
  catalogProducts: Product[]
  guessProducts: Product[]
  guessStatus: string
  loading: boolean
}

const empty: HomeData = {
  categories: [],
  categoriesStatus: "กำลังโหลดหมวดหมู่…",
  shops: [],
  shopsStatus: "กำลังโหลดร้านค้า…",
  dailyProducts: [],
  dailyStatus: "กำลังโหลดสินค้า…",
  catalogProducts: [],
  guessProducts: [],
  guessStatus: "กำลังโหลดสินค้า…",
  loading: true,
}

export function useHomeData(): HomeData {
  const [state, setState] = useState<HomeData>(empty)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [categories, shops, apiProducts] = await Promise.all([
          fetchCategories(),
          fetchShops(),
          fetchProducts(),
        ])

        if (cancelled) return

        const mapped = apiProducts.map(mapApiProduct)

        setState({
          categories,
          categoriesStatus: categories.length ? "" : "ยังไม่มีหมวดหมู่",
          shops,
          shopsStatus: shops.length ? "" : "ยังไม่มีร้านค้าแนะนำ",
          dailyProducts: mapped.slice(0, 12),
          dailyStatus: mapped.length ? "" : "ยังไม่มีสินค้าหรือข้อมูลไม่ถูกต้อง",
          catalogProducts: mapped,
          guessProducts: mapped.slice(0, 20),
          guessStatus: mapped.length ? "" : "ยังไม่มีสินค้าแนะนำ",
          loading: false,
        })
      } catch {
        if (cancelled) return
        setState({
          categories: [],
          categoriesStatus: "โหลดหมวดหมู่ไม่สำเร็จ — ตรวจสอบการเชื่อมต่อ Supabase",
          shops: [],
          shopsStatus: "โหลดร้านค้าไม่สำเร็จ",
          dailyProducts: [],
          dailyStatus: "โหลดสินค้าไม่สำเร็จ",
          catalogProducts: [],
          guessProducts: [],
          guessStatus: "โหลดสินค้าไม่สำเร็จ",
          loading: false,
        })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
