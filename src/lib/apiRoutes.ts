/** Route keys สำหรับ local Supabase router — ไม่มี HTTP ไป PHP server */
export const API = {
  adminProductCategories: "admin/product-categories",
  adminRecommendedShops: "admin/shops/recommended",
  adminGeneralShops: "admin/shops/general",
  adminSlideImages: "admin/slides",
  adminStoreProducts: "admin/products",
  adminUsers: "admin/users",
  adminIdentityVerifications: "admin/verifications",
  adminBankAccounts: "admin/bank-accounts",
  adminDepositRequests: "admin/deposits",
  adminWithdrawRequests: "admin/withdrawals",
  adminPaymentLimits: "admin/payment-limits",
  adminCommission: "admin/commission",
  adminNotifications: "admin/notifications",
  customerShopProducts: "customer/shop-products",
  adminCart: "admin/cart",
  adminCartOrders: "admin/cart-orders",
  adminShippingHistory: "admin/shipping-history",
  supportChat: "support/chat",
  adminCustomerTopup: "admin/customer-topup",
  adminWithdrawPasswords: "admin/withdraw-passwords",
  orderHubCounts: "orders/hub-counts",
  userInfo: "user/info",
  productOrders: "orders/cart-items",
  reviewsList: "reviews/list",
  reviewsPending: "reviews/pending",
  submitReview: "reviews/submit",
  submitReviewAdmin: "reviews/submit-admin",
  shopFollows: "shop/follows",
  userNotifications: "notifications/user",
  otherStoreProducts: "store/other-products",
  storeStatus: "store/status",
  customerStoreMirror: "customer/store-products-mirror",
  authProcess: "auth/process",
  ordersConfirm: "orders/confirm",
  ordersCreate: "orders/create",
  ordersDelete: "orders/delete",
  ordersUpdateQty: "orders/update-qty",
  ordersSetQty: "orders/set-qty",
  walletDeposit: "wallet/deposit",
  walletWithdraw: "wallet/withdraw",
  walletHistory: "wallet/history",
  storeAddProduct: "store/add-product",
  storeSubmit: "store/submit",
  bankSubmit: "bank/submit",
  verificationSubmit: "verification/submit",
  userUpdatePassword: "user/update-password",
  userSetWithdrawPassword: "user/set-withdraw-password",
} as const

export type ApiRoute = (typeof API)[keyof typeof API]

export function apiPath(route: ApiRoute, query?: Record<string, string | number | undefined>) {
  if (!query) return route
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${route}?${qs}` : route
}
