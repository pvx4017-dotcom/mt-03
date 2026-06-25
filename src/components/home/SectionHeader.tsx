import { Link } from "react-router-dom"

type Props = {
  title: string
  subtitle?: string
  actionLabel?: string
  actionTo?: string
  /** Font Awesome classes, e.g. "fa-solid fa-tags" */
  iconClass?: string
}

export function SectionHeader({ title, subtitle, actionLabel, actionTo, iconClass }: Props) {
  return (
    <div className="section-header-pro">
      <div className="section-header-pro__left">
        {iconClass ? (
          <span className="section-header-pro__icon" aria-hidden="true">
            <i className={iconClass} />
          </span>
        ) : null}
        <div>
          <h3 className="section-header-pro__title">{title}</h3>
          {subtitle ? <p className="section-header-pro__subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {actionLabel && actionTo ? (
        <Link to={actionTo} className="section-header-pro__action">
          {actionLabel}
          <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  )
}
