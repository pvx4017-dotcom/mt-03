import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  fetchCartOrders,
  fetchOrderHubCounts,
  fetchStoreCustomerStatus,
  fetchUserInfo,
  type CustomerUser,
  type OrderHubCounts,
} from "@/lib/customerApi"
import { clearSession, getSessionUserId, isSessionExpired, markIdleLogout, touchSessionActivity } from "@/lib/session"

type AppContextValue = {
  sessionChecked: boolean
  isLoggedIn: boolean
  user: CustomerUser | null
  login: (user?: CustomerUser) => void
  logout: () => void
  refreshUser: () => Promise<void>
  cartCount: number
  refreshCartCount: () => Promise<void>
  setCartCount: (count: number) => void
  orderHubCounts: OrderHubCounts
  refreshOrderHubCounts: () => Promise<void>
  hasStore: boolean
  refreshStoreStatus: () => Promise<void>
  sidebarOpen: boolean
  openSidebar: () => void
  closeSidebar: () => void
  langOpen: boolean
  openLang: () => void
  closeLang: () => void
  currentLang: string
  setCurrentLang: (code: string) => void
  loginModalOpen: boolean
  showLoginModal: () => void
  hideLoginModal: () => void
  requireLogin: (onSuccess?: () => void) => boolean
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [orderHubCounts, setOrderHubCounts] = useState<OrderHubCounts>({})
  const [hasStore, setHasStore] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [currentLang, setCurrentLang] = useState("th")
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  const isLoggedIn = !!user

  const refreshCartCount = useCallback(async () => {
    try {
      const rows = await fetchCartOrders()
      const total = rows.reduce((sum, r) => sum + Math.max(1, Number(r.quantity ?? 1)), 0)
      setCartCount(total)
    } catch {
      setCartCount(0)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      if (!getSessionUserId()) {
        setUser(null)
        return
      }
      if (isSessionExpired()) {
        clearSession()
        setUser(null)
        markIdleLogout()
        if (!window.location.pathname.startsWith("/login")) {
          window.location.replace("/login")
        }
        return
      }
      const data = await fetchUserInfo()
      if (data.success && data.user) {
        setUser(data.user)
        localStorage.setItem("meta_logged_in", "true")
      } else {
        setUser(null)
        clearSession()
      }
    } catch {
      setUser(null)
      clearSession()
    } finally {
      setSessionChecked(true)
    }
  }, [])

  const refreshOrderHubCounts = useCallback(async () => {
    if (!user) {
      setOrderHubCounts({})
      return
    }
    try {
      const data = await fetchOrderHubCounts()
      if (data.success) {
        setOrderHubCounts({
          pending_payment: data.pending_payment,
          to_ship: data.to_ship,
          to_receive: data.to_receive,
          pending_review: data.pending_review,
          after_sales: data.after_sales,
        })
      }
    } catch {
      setOrderHubCounts({})
    }
  }, [user])

  const refreshStoreStatus = useCallback(async () => {
    try {
      const data = await fetchStoreCustomerStatus()
      setHasStore(!!(data.success && data.has_store))
    } catch {
      setHasStore(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  useEffect(() => {
    if (!sessionChecked) return
    refreshCartCount()
    if (user) {
      refreshOrderHubCounts()
      refreshStoreStatus()
      const t = setInterval(refreshUser, 5000)
      const t2 = setInterval(refreshOrderHubCounts, 30000)
      return () => {
        clearInterval(t)
        clearInterval(t2)
      }
    }
    setCartCount(0)
    setOrderHubCounts({})
    setHasStore(false)
  }, [sessionChecked, user, refreshCartCount, refreshUser, refreshOrderHubCounts, refreshStoreStatus])

  const login = useCallback((nextUser?: CustomerUser) => {
    if (nextUser) setUser(nextUser)
    localStorage.setItem("meta_logged_in", "true")
    touchSessionActivity()
    setLoginModalOpen(false)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
    setCartCount(0)
    setOrderHubCounts({})
    setHasStore(false)
  }, [])

  const requireLogin = useCallback(
    (onSuccess?: () => void) => {
      if (isLoggedIn) {
        onSuccess?.()
        return true
      }
      setLoginModalOpen(true)
      return false
    },
    [isLoggedIn],
  )

  const value = useMemo(
    () => ({
      sessionChecked,
      isLoggedIn,
      user,
      login,
      logout,
      refreshUser,
      cartCount,
      refreshCartCount,
      setCartCount,
      orderHubCounts,
      refreshOrderHubCounts,
      hasStore,
      refreshStoreStatus,
      sidebarOpen,
      openSidebar: () => setSidebarOpen(true),
      closeSidebar: () => setSidebarOpen(false),
      langOpen,
      openLang: () => setLangOpen(true),
      closeLang: () => setLangOpen(false),
      currentLang,
      setCurrentLang,
      loginModalOpen,
      showLoginModal: () => setLoginModalOpen(true),
      hideLoginModal: () => setLoginModalOpen(false),
      requireLogin,
    }),
    [
      sessionChecked,
      isLoggedIn,
      user,
      login,
      logout,
      refreshUser,
      cartCount,
      refreshCartCount,
      orderHubCounts,
      refreshOrderHubCounts,
      hasStore,
      refreshStoreStatus,
      sidebarOpen,
      langOpen,
      currentLang,
      loginModalOpen,
      requireLogin,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
