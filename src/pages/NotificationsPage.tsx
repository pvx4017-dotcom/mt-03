import { useCallback, useEffect, useState } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { useBodyClass } from "@/hooks/useBodyClass"
import {
  fetchNotifications,
  formatRelativeTime,
  markNotificationRead,
  type NotificationRow,
} from "@/lib/customerApi"

type Tab = "service" | "platform" | "personal"

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "service", label: "ข้อความบริการลูกค้า", icon: "fa-headset" },
  { id: "platform", label: "ข้อความแพลตฟอร์ม", icon: "fa-envelope" },
  { id: "personal", label: "ข้อความส่วนบุคคล", icon: "fa-envelope" },
]

export default function NotificationsPage() {
  useBodyClass("page-sub")
  const [activeTab, setActiveTab] = useState<Tab>("service")
  const [rowsByTab, setRowsByTab] = useState<Partial<Record<Tab, NotificationRow[]>>>({})
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const loadTab = useCallback(async (tabId: Tab) => {
    const rows = await fetchNotifications(tabId)
    setRowsByTab((prev) => ({ ...prev, [tabId]: rows }))
  }, [])

  useEffect(() => {
    tabs.forEach((t) => {
      loadTab(t.id)
    })
  }, [loadTab])

  const handleTabClick = async (tabId: Tab) => {
    setActiveTab(tabId)
    setExpandedId(null)
    if (!rowsByTab[tabId]) await loadTab(tabId)
  }

  const handleItemClick = async (row: NotificationRow) => {
    const id = Number(row.id ?? 0)
    if (expandedId === id) return
    setExpandedId(id)
    if (id > 0) {
      markNotificationRead(id).catch(() => {})
      setRowsByTab((prev) => ({
        ...prev,
        [activeTab]: (prev[activeTab] ?? []).map((r) =>
          Number(r.id) === id ? { ...r, is_read: 1 } : r,
        ),
      }))
    }
  }

  const rows = rowsByTab[activeTab] ?? []
  const tabMeta = tabs.find((t) => t.id === activeTab)

  return (
    <div id="app" className="fade-in">
      <PageHeader title="ข้อความ" backTo="/" />

      <div className="tabs-container">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => handleTabClick(tab.id)}
            role="button"
          >
            {tab.label}
          </div>
        ))}
      </div>

      <div className="content-area">
        <div className="notification-list tab-content active">
          {rows.length === 0 ? (
            <div className="notification-item">
              <div className="notification-avatar">
                <i className={`fa-solid ${tabMeta?.icon ?? "fa-bell"}`} />
              </div>
              <div className="notification-content">
                <div className="notification-title">ยังไม่มีข้อความในขณะนี้</div>
                <div className="notification-snippet">เมื่อมีข้อความใหม่ ระบบจะแสดงในหน้านี้</div>
                <div className="notification-time">-</div>
              </div>
            </div>
          ) : (
            rows.map((item) => {
              const id = Number(item.id ?? 0)
              const unread = Number(item.is_read ?? 0) !== 1
              return (
                <div
                  key={id || String(item.title)}
                  className={`notification-item${unread ? " unread" : ""}${expandedId === id ? " expanded" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleItemClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      handleItemClick(item)
                    }
                  }}
                >
                  <div className="notification-avatar">
                    <i
                      className={`fa-solid ${tabMeta?.icon ?? "fa-bell"}`}
                      style={{ color: "#4361EE" }}
                    />
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{item.title || "ข้อความแจ้งเตือน"}</div>
                    <div className="notification-snippet">{item.message || "-"}</div>
                    <div className="notification-time">{formatRelativeTime(item.created_at)}</div>
                    <div className="notification-expand-hint">แตะเพื่อดูข้อความเต็ม</div>
                    <div className="notification-full">{item.message || "-"}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
