import { Link } from "react-router-dom"
import type { Product } from "@/data/products"
import { asset, formatPrice } from "@/lib/assets"
import { formatCompactCount, trustScoreToRating } from "@/lib/marketplaceApi"

type Props = {
  product: Product
  variant?: "feed" | "recommend" | "slider" | "shop"
  showShop?: boolean
  linkTo?: string
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

function ProductCardBadges({ product }: { product: Product }) {
  const sold = product.salesVolume ?? 0
  const rating = trustScoreToRating(product.trustScore)

  return (
    <>
      {sold >= 500 ? <span className="product-card-badge product-card-badge--hot">ขายดี</span> : null}
      {rating >= 4.8 ? <span className="product-card-badge product-card-badge--top">Top</span> : null}
    </>
  )
}

function ProductCardMeta({
  product,
  compact = false,
}: {
  product: Product
  compact?: boolean
}) {
  const rating = trustScoreToRating(product.trustScore)
  const reviews = product.reviewCount ?? 0
  const sold = product.salesVolume ?? 0
  const views = product.viewCount ?? 0
  const hasRating = rating > 0
  const hasStats = sold > 0 || views > 0

  if (!hasRating && reviews <= 0 && !hasStats) return null

  if (compact) {
    return (
      <div className="product-card-meta product-card-meta--compact">
        {hasRating ? (
          <span className="product-card-rating">
            <i className="fa-solid fa-star" aria-hidden />
            {rating.toFixed(1)}
          </span>
        ) : null}
        {sold > 0 ? (
          <span className="product-card-stat">
            ขายแล้ว {formatCompactCount(sold)}
          </span>
        ) : views > 0 ? (
          <span className="product-card-stat">
            <i className="fa-regular fa-eye" aria-hidden />
            {formatCompactCount(views)}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <>
      {(hasRating || reviews > 0) && (
        <div className="product-card-meta">
          {hasRating ? (
            <span className="product-card-rating">
              <i className="fa-solid fa-star" aria-hidden />
              {rating.toFixed(1)}
            </span>
          ) : null}
          {reviews > 0 ? (
            <span className="product-card-reviews">({formatCompactCount(reviews)} รีวิว)</span>
          ) : null}
        </div>
      )}
      {hasStats ? (
        <div className="product-card-stats">
          {sold > 0 ? (
            <span className="product-card-stat">
              <i className="fa-solid fa-bag-shopping" aria-hidden />
              ขายแล้ว {formatCompactCount(sold)}
            </span>
          ) : null}
          {views > 0 ? (
            <span className="product-card-stat">
              <i className="fa-regular fa-eye" aria-hidden />
              {formatCompactCount(views)}
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

function ProductCardBodyContent({
  product,
  showShop,
  titleClass,
  priceClass,
  compact = false,
}: {
  product: Product
  showShop: boolean
  titleClass: string
  priceClass: string
  compact?: boolean
}) {
  return (
    <>
      <div className={titleClass}>{product.title}</div>
      <ProductCardMeta product={product} compact={compact} />
      {showShop && product.shopName ? (
        <div className="product-card__shop">
          <i className="fa-solid fa-store" aria-hidden />
          {product.shopName}
        </div>
      ) : null}
      <div className={priceClass}>{product.price.toFixed(2)}</div>
    </>
  )
}

export function ProductCard({ product, variant = "feed", showShop = true, linkTo }: Props) {
  const priceText = formatPrice(product.price)
  const href = linkTo ?? `/product/${product.id}`

  if (variant === "shop") {
    return (
      <Link to={href} className="product-card-link shop-product-link">
        <div className="feed-card feed-card--pro shop-product-card">
          <div className="feed-img-container product-card-media shop-product-card__media">
            <ProductCardBadges product={product} />
            <ProductImage src={product.image} alt={product.title} />
          </div>
          <div className="product-card-body feed-info shop-product-card__body">
            <div className="feed-title shop-product-card__title">{product.title}</div>
            <ProductCardMeta product={product} compact />
            <div className="feed-price shop-product-card__price">{priceText}</div>
          </div>
        </div>
      </Link>
    )
  }

  if (variant === "slider") {
    return (
      <Link to={`/product/${product.id}`} className="product-card product-card--pro">
        <div className="product-image product-image--pro product-card-media">
          <ProductCardBadges product={product} />
          <ProductImage src={product.image} alt={product.title} />
        </div>
        <div className="product-card__body">
          <div className="product-card__title">{product.title}</div>
          <ProductCardMeta product={product} compact />
          <div className="product-price product-price--pro">{priceText}</div>
        </div>
      </Link>
    )
  }

  if (variant === "recommend") {
    return (
      <Link to={`/product/${product.id}`} className="product-card-link">
        <div className="recommend-card recommend-card--pro">
          <div className="recommend-img-container product-card-media">
            <ProductCardBadges product={product} />
            <ProductImage src={product.image} alt={product.title} />
          </div>
          <div className="product-card-body recommend-info">
            <ProductCardBodyContent
              product={product}
              showShop={showShop}
              titleClass="recommend-title"
              priceClass="recommend-price"
            />
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link to={`/product/${product.id}`} className="product-card-link">
      <div className="feed-card feed-card--pro">
        <div className="feed-img-container product-card-media">
          <ProductCardBadges product={product} />
          <ProductImage src={product.image} alt={product.title} />
        </div>
        <div className="product-card-body feed-info">
          <ProductCardBodyContent
            product={product}
            showShop={showShop}
            titleClass="feed-title"
            priceClass="feed-price"
          />
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
