export type Product = {
  id: string
  title: string
  price: number
  image: string
  category: string
  shopName?: string
  reviewCount?: number
  viewCount?: number
  salesVolume?: number
  trustScore?: number
}

export const popularSearches = [
  "Women's clothing",
  "perfume",
  "harem pants",
  "lipstick",
  "makeup",
]
