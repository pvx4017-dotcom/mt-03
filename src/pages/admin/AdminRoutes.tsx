import { Routes, Route, Navigate } from "react-router-dom"
import { AdminRouteGuard } from "@/components/auth/AdminRouteGuard"
import AdminDashboard from "./AdminDashboard"
import AdminProductCategoriesPage, {
  AdminRecommendedShopsPage,
  AdminGeneralShopsPage,
} from "./AdminCatalogPages"
import AdminUsersPage, {
  AdminCreditManagementPage,
  AdminVerificationPage,
  AdminBankAccountsPage,
  AdminWithdrawPasswordsPage,
  AdminCustomerTopupPage,
} from "./AdminUserPages"
import {
  AdminCustomerDepositsPage,
  AdminCustomerWithdrawalsPage,
  AdminPaymentLimitsPage,
} from "./AdminFinancePages"
import {
  AdminCustomerStoreProductsPage,
  AdminCartPage,
  AdminShippingOrdersPage,
  AdminReceivingOrdersPage,
} from "./AdminOrderPages"
import {
  AdminSlideImagesPage,
  AdminNotificationsPage,
  AdminChatPage,
} from "./AdminCommPages"
import AdminAddProductPage from "./AdminAddProductPage"
import AdminSettingsPage from "./AdminSettingsPage"

export default function AdminRoutes() {
  return (
    <AdminRouteGuard>
      <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="customer-store-products" element={<AdminCustomerStoreProductsPage />} />
      <Route path="cart" element={<AdminCartPage />} />
      <Route path="shipping-orders" element={<AdminShippingOrdersPage />} />
      <Route path="receiving-orders" element={<AdminReceivingOrdersPage />} />
      <Route path="slide-images" element={<AdminSlideImagesPage />} />
      <Route path="product-categories" element={<AdminProductCategoriesPage />} />
      <Route path="recommended-shops" element={<AdminRecommendedShopsPage />} />
      <Route path="general-shops" element={<AdminGeneralShopsPage />} />
      <Route path="add-product" element={<AdminAddProductPage />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="credit-management" element={<AdminCreditManagementPage />} />
      <Route path="verification" element={<AdminVerificationPage />} />
      <Route path="bank-accounts" element={<AdminBankAccountsPage />} />
      <Route path="withdraw-passwords" element={<AdminWithdrawPasswordsPage />} />
      <Route path="customer-topup" element={<AdminCustomerTopupPage />} />
      <Route path="customer-deposits" element={<AdminCustomerDepositsPage />} />
      <Route path="customer-withdrawals" element={<AdminCustomerWithdrawalsPage />} />
      <Route path="payment-limits" element={<AdminPaymentLimitsPage />} />
      <Route path="notifications" element={<AdminNotificationsPage />} />
      <Route path="chat" element={<AdminChatPage />} />
      <Route path="settings" element={<AdminSettingsPage />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
    </AdminRouteGuard>
  )
}
