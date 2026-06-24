type Props = {
  count?: number
  variant?: "feed" | "slider" | "recommend"
}

export function ProductSkeleton({ count = 6, variant = "feed" }: Props) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`product-skeleton product-skeleton--${variant}`}
          aria-hidden="true"
        >
          <div className="product-skeleton__image" />
          <div className="product-skeleton__line product-skeleton__line--title" />
          <div className="product-skeleton__line product-skeleton__line--price" />
        </div>
      ))}
    </>
  )
}
