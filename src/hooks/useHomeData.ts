import { useEffect, useState } from "react"
import type { Product } from "@/data/products"
import {
  fetchCategories,
  fetchProducts,
  fetchShops,
  fetchSlideBanners,
  mapApiProduct,
  type ApiCategory,
  type ApiShop,
} from "@/lib/marketplaceApi"

type HomeData = {
  categories: ApiCategory[]
  shops: ApiShop[]
  banners: string[]
  dailyProducts: Product[]
  catalogProducts: Product[]
  guessProducts: Product[]
  loading: boolean
  error: boolean
}

const empty: HomeData = {
  categories: [],
  shops: [],
  banners: [],
  dailyProducts: [],
  catalogProducts: [],
  guessProducts: [],
  loading: true,
  error: false,
}

function pickGuessProducts(all: Product[], excludeIds: Set<string>, limit = 12): Product[] {
  return [...all]
    .filter((p) => !excludeIds.has(p.id))
    .sort((a, b) => (b.salesVolume ?? 0) - (a.salesVolume ?? 0))
    .slice(0, limit)
}

export function useHomeData(): HomeData {
  const [state, setState] = useState<HomeData>(empty)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [categories, shops, apiProducts, banners] = await Promise.all([
          fetchCategories(),
          fetchShops(),
          fetchProducts(),
          fetchSlideBanners(),
        ])

        if (cancelled) return

        const mapped = apiProducts.map(mapApiProduct)
        const dailyProducts = mapped.slice(0, 12)
        const dailyIds = new Set(dailyProducts.map((p) => p.id))

        setState({
          categories,
          shops,
          banners,
          dailyProducts,
          catalogProducts: mapped,
          guessProducts: pickGuessProducts(mapped, dailyIds),
          loading: false,
          error: false,
        })
      } catch {
        if (cancelled) return
        setState({
          categories: [],
          shops: [],
          banners: [],
          dailyProducts: [],
          catalogProducts: [],
          guessProducts: [],
          loading: false,
          error: true,
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
