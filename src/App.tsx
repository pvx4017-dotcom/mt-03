import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AppProvider } from "@/context/AppContext"
import { SessionIdleGuard } from "@/components/auth/SessionIdleGuard"
import HomePage from "@/pages/HomePage"
import SearchPage from "@/pages/SearchPage"
import CategoriesPage from "@/pages/CategoriesPage"
import CartPage from "@/pages/CartPage"
import ProfilePage from "@/pages/ProfilePage"
import LoginPage from "@/pages/LoginPage"
import NotificationsPage from "@/pages/NotificationsPage"
import ProductDetailPage from "@/pages/ProductDetailPage"
import CategoryDetailPage from "@/pages/CategoryDetailPage"
import DepositHistoryPage from "@/pages/DepositHistoryPage"
import MyStoreProductsPage from "@/pages/MyStoreProductsPage"
import SettingsPage from "@/pages/SettingsPage"
import WithdrawPage from "@/pages/WithdrawPage"
import DepositPage from "@/pages/DepositPage"
import AddressPage from "@/pages/AddressPage"
import ShopDetailPage from "@/pages/ShopDetailPage"
import NoticeDetailPage, { PrivacyPolicyPage } from "@/pages/NoticeDetailPage"
import OrderHistoryPage, {
  PendingPaymentPage,
  ToShipPage,
  ToReceivePage,
  CompletedOrdersPage,
} from "@/pages/orders/OrderPages"
import {
  CheckinPage,
  CouponPage,
  ReviewsPage,
  HelpCenterPage,
  ChatDetailPage,
  OpenStorePage,
  HelpManualPage,
  FollowingShopsPage,
  CollectionsPage,
  FeedbackPage,
  AboutPage,
} from "@/pages/MiscPages"
import AdminRoutes from "@/pages/admin/AdminRoutes"
import {
  VerificationPage,
  LinkAccountPage,
  ChangePasswordPage,
  WithdrawPasswordPage,
  WithdrawHistoryPage,
} from "@/pages/SettingsSubPages"

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <SessionIdleGuard />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login-register" element={<LoginPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/shop/:id" element={<ShopDetailPage />} />
          <Route path="/category-detail" element={<CategoryDetailPage />} />
          <Route path="/notice-detail" element={<NoticeDetailPage />} />

          <Route path="/orders" element={<OrderHistoryPage />} />
          <Route path="/order-list" element={<Navigate to="/orders" replace />} />
          <Route path="/pending-payment" element={<PendingPaymentPage />} />
          <Route path="/orders/pending-payment" element={<Navigate to="/pending-payment" replace />} />
          <Route path="/to-ship" element={<ToShipPage />} />
          <Route path="/orders/to-ship" element={<Navigate to="/to-ship" replace />} />
          <Route path="/to-receive" element={<ToReceivePage />} />
          <Route path="/orders/to-receive" element={<Navigate to="/to-receive" replace />} />
          <Route path="/orders/completed" element={<CompletedOrdersPage />} />
          <Route path="/completed" element={<CompletedOrdersPage />} />

          <Route path="/withdraw" element={<WithdrawPage />} />
          <Route path="/deposit" element={<DepositPage />} />
          <Route path="/deposit-history" element={<DepositHistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/address" element={<AddressPage />} />
          <Route path="/verification" element={<VerificationPage />} />
          <Route path="/link-account" element={<LinkAccountPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/withdraw-password" element={<WithdrawPasswordPage />} />
          <Route path="/withdraw-history" element={<WithdrawHistoryPage />} />

          <Route path="/checkin" element={<CheckinPage />} />
          <Route path="/coupon" element={<CouponPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/help-center" element={<HelpCenterPage />} />
          <Route path="/chat-detail" element={<ChatDetailPage />} />
          <Route path="/open-store" element={<OpenStorePage />} />
          <Route path="/my-store-products" element={<MyStoreProductsPage />} />
          <Route path="/help-manual" element={<HelpManualPage />} />
          <Route path="/following-shops" element={<FollowingShopsPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />

          <Route path="/admin/*" element={<AdminRoutes />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
