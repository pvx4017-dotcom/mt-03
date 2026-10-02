import { Routes, Route, Navigate } from "react-router-dom"
import { AdminRouteGuard } from "@/components/auth/AdminRouteGuard"
import AdminLayout from "@/components/admin/AdminLayout"
import AdminOverviewPage from "./AdminOverviewPage"
import AdminProductCategoriesPage, {
  AdminRecommendedShopsPage,
  AdminGeneralShopsPage,
  AdminUserShopsPage,
} from "./AdminCatalogPages"
import AdminUsersPage, {
  AdminCreditManagementPage,
  AdminVerificationPage,
  AdminBankAccountsPage,
  AdminWithdrawPasswordsPage,
  AdminCustomerTopupPage,
  AdminShippingAddressesPage,
} from "./AdminUserPages"
import {
  AdminCustomerDepositsPage,
  AdminCustomerWithdrawalsPage,
  AdminPaymentLimitsPage,
  AdminSellerLevelsPage,
  AdminReceivingAccountsPage,
  AdminLoansPage,
  AdminCouponsPage,
  AdminFeedbackPage,
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
      <AdminLayout>
        <Routes>
          <Route index element={<AdminOverviewPage />} />
          <Route path="customer-store-products" element={<AdminCustomerStoreProductsPage />} />
          <Route path="cart" element={<AdminCartPage />} />
          <Route path="shipping-orders" element={<AdminShippingOrdersPage />} />
          <Route path="receiving-orders" element={<AdminReceivingOrdersPage />} />
          <Route path="slide-images" element={<AdminSlideImagesPage />} />
          <Route path="product-categories" element={<AdminProductCategoriesPage />} />
          <Route path="recommended-shops" element={<AdminRecommendedShopsPage />} />
          <Route path="general-shops" element={<AdminGeneralShopsPage />} />
          <Route path="user-shops" element={<AdminUserShopsPage />} />
          <Route path="add-product" element={<AdminAddProductPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="customer-shipping-addresses" element={<AdminShippingAddressesPage />} />
          <Route path="credit-management" element={<AdminCreditManagementPage />} />
          <Route path="verification" element={<AdminVerificationPage />} />
          <Route path="bank-accounts" element={<AdminBankAccountsPage />} />
          <Route path="withdraw-passwords" element={<AdminWithdrawPasswordsPage />} />
          <Route path="customer-topup" element={<AdminCustomerTopupPage />} />
          <Route path="customer-deposits" element={<AdminCustomerDepositsPage />} />
          <Route path="customer-withdrawals" element={<AdminCustomerWithdrawalsPage />} />
          <Route path="payment-limits" element={<AdminPaymentLimitsPage />} />
          <Route path="receiving-accounts" element={<AdminReceivingAccountsPage />} />
          <Route path="seller-levels" element={<AdminSellerLevelsPage />} />
          <Route path="loans" element={<AdminLoansPage />} />
          <Route path="coupons" element={<AdminCouponsPage />} />
          <Route path="feedback" element={<AdminFeedbackPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="chat" element={<AdminChatPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AdminLayout>
    </AdminRouteGuard>
  )
}
