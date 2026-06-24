import { PageHeader } from "@/components/layout/PageHeader"
import { BottomNav } from "@/components/layout/BottomNav"
import { useBodyClass } from "@/hooks/useBodyClass"

type Props = {
  title: string
  description?: string
  backTo?: string
  showBottomNav?: boolean
  children?: React.ReactNode
}

export default function GenericPage({
  title,
  description,
  backTo = "/profile",
  showBottomNav = false,
  children,
}: Props) {
  useBodyClass("page-sub")

  return (
    <div id="app" className="fade-in">
      <PageHeader title={title} backTo={backTo} />
      <div style={{ padding: "20px 16px", minHeight: "50vh" }}>
        {description && (
          <p style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>
            {description}
          </p>
        )}
        {children}
      </div>
      {showBottomNav && <BottomNav />}
    </div>
  )
}
