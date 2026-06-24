import { Link } from "react-router-dom"
import type { Product } from "@/data/products"
import { asset, formatPrice } from "@/lib/assets"

type Props = {
  product: Product
  variant?: "feed" | "recommend" | "slider"
  showShop?: boolean
}

function ProductImage({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        const img = e.currentTarget
        if (!img.dataset.fallback) {
          img.dataset.fallback = "1"
          img.src = asset("logo/shop logo.webp")
        }
      }}
    />
  )
}

export function ProductCard({ product, variant = "feed", showShop = true }: Props) {
  const priceText = formatPrice(product.price)

  if (variant === "slider") {
    return (
      <Link to={`/product/${product.id}`} className="product-card product-card--pro">
        <div className="product-image product-image--pro">
          <ProductImage src={product.image} alt={product.title} />
        </div>
        <div className="product-card__body">
          <div className="product-card__title">{product.title}</div>
          <div className="product-price product-price--pro">{priceText}</div>
        </div>
      </Link>
    )
  }

  if (variant === "recommend") {
    return (
      <Link to={`/product/${product.id}`} className="product-card-link">
        <div className="recommend-card recommend-card--pro">
          <div className="recommend-img-container">
            <ProductImage src={product.image} alt={product.title} />
          </div>
          <div className="recommend-info">
            <div className="recommend-title">{product.title}</div>
            {showShop && product.shopName ? (
              <div className="product-card__shop">{product.shopName}</div>
            ) : null}
            <div className="recommend-price">{priceText.replace("$", "")}</div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link to={`/product/${product.id}`} className="product-card-link">
      <div className="feed-card feed-card--pro">
        <div className="feed-img-container">
          <ProductImage src={product.image} alt={product.title} />
        </div>
        <div className="feed-info">
          <div className="feed-title">{product.title}</div>
          {showShop && product.shopName ? (
            <div className="product-card__shop">{product.shopName}</div>
          ) : null}
          <div className="feed-price">{product.price.toFixed(2)}</div>
        </div>
      </div>
    </Link>
  )
}

export function ProductFeed({
  products,
  className = "product-feed",
  showShop = true,
}: {
  products: Product[]
  className?: string
  showShop?: boolean
}) {
  return (
    <div className={className}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} variant="feed" showShop={showShop} />
      ))}
    </div>
  )
}
