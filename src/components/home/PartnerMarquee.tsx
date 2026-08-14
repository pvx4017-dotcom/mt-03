import { asset, logoAsset } from "@/lib/assets"
import { APP_NAME, PARTNER_LOGOS } from "@/lib/brand"

export function PartnerMarquee() {
  const logos = [
    { src: logoAsset(), label: APP_NAME },
    ...PARTNER_LOGOS.map((p) => ({ src: asset(`partner/${p.file}`), label: p.label })),
  ]
  const loop = [...logos, ...logos]

  return (
    <section className="home-close" aria-label="พันธมิตรและช่องทางชำระเงิน">
      <div className="home-close__brand">
        <img src={logoAsset()} alt="" className="home-close__logo" />
        <div>
          <p className="home-close__name">{APP_NAME}</p>
          <p className="home-close__note">ช้อปปลอดภัย · รองรับ USDT / ETH / BTC</p>
        </div>
      </div>
      <p className="home-close__label">พันธมิตรและช่องทางชำระเงิน</p>
      <div className="partner-marquee">
        <div className="partner-marquee__fade partner-marquee__fade--left" aria-hidden />
        <div className="partner-marquee__fade partner-marquee__fade--right" aria-hidden />
        <div className="partner-marquee__track">
          {loop.map((item, i) => (
            <span className="partner-marquee__item" key={`${item.label}-${i}`}>
              <img src={item.src} alt={item.label} />
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
