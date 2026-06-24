import { Link } from "react-router-dom"
import { useState } from "react"
import { categoryGroups } from "@/data/categories"
import { useApp } from "@/context/AppContext"

export function CategorySidebar() {
  const { sidebarOpen, closeSidebar } = useApp()
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <>
      <div
        className={`sidebar-overlay${sidebarOpen ? " open" : ""}`}
        onClick={closeSidebar}
      />
      <aside className={`category-sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sidebar-header">
          <h3>ทั้งหมด</h3>
          <i className="fa-solid fa-xmark" onClick={closeSidebar} role="button" />
        </div>
        <div className="sidebar-menu-list">
          {categoryGroups.map((group) => (
            <div
              className={`sidebar-menu-item${openItems.has(group.id) ? " active open" : ""}`}
              key={group.id}
            >
              <div
                className="menu-item-header"
                onClick={() => toggleItem(group.id)}
                role="button"
              >
                <span>{group.label}</span>
                <i className="fa-solid fa-chevron-down" />
              </div>
              <div className="subcategory-list">
                {group.subcategories.map((sub) => (
                  <Link
                    key={sub.slug}
                    to={`/categories?cat=${sub.slug}`}
                    onClick={closeSidebar}
                  >
                    {sub.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
