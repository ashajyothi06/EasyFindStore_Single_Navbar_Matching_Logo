import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { SiteHeader } from "./components/SiteHeader";
import { CategoriesPage } from "./pages/CategoriesPage";
import { HomePage } from "./pages/HomePage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminOrdersPage } from "./pages/AdminOrdersPage";
import { AdminSupportPage } from "./pages/AdminSupportPage";
import { AdminOrderDetailPage } from "./pages/AdminOrderDetailPage";
import { AdminOffersPage } from "./pages/AdminOffersPage";
import { AdminCustomersPage } from "./pages/AdminCustomersPage";
import { AdminDeliveryPricingPage } from "./pages/AdminDeliveryPricingPage";
import { AdminServiceAreasPage } from "./pages/AdminServiceAreasPage";
import { AdminCatalogPage } from "./pages/AdminCatalogPage";
import { AdminCategoryFormPage } from "./pages/AdminCategoryFormPage";
import { AdminItemFormPage } from "./pages/AdminItemFormPage";
import { AdminTransactionsPage } from "./pages/AdminTransactionsPage";
import { CommerceGate } from "./components/CommerceGates";

import { DashboardPage } from "./pages/DashboardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ItemPage } from "./pages/ItemPage";
import { LoginPage } from "./pages/LoginPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { OrdersPage } from "./pages/OrdersPage";
import { UserRegistrationPage } from "./pages/UserRegistrationPage";
import { AddressFormPage } from "./pages/AddressFormPage";
import { AddressesPage } from "./pages/AddressesPage";
import SupportTicketsPage from "./pages/SupportTicketsPage";
import RaiseTicketPage from "./pages/RaiseTicketPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import RefundPolicy from "./pages/RefundPolicy";
import ShoppingPolicy from "./pages/ShoppingPolicy";
import AboutUsPage from "./pages/AboutUsPage";
import ContactUsPage from "./pages/ContactUsPage";
import Footer from "./components/Footer";
import AppContent from "./components/AppContent";

export default function App() {
  const pathname = useLocation().pathname.replace(/\/+$/, "") || "/";
  const hideHeader = ["/react/login", "/login", "/register", "/register/user", "/store/register", "/store/login"].includes(pathname);
  const showFooter = !hideHeader && !pathname.startsWith("/admin") && !pathname.startsWith("/seller") && !pathname.startsWith("/delivery");
  return <AppContent>
    {!hideHeader && <SiteHeader />}
    <main><Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/store" element={<CategoriesPage />} />
      <Route path="/juice" element={<Navigate to="/categories" replace />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/categories/:slug" element={<CategoriesPage />} />
      <Route path="/item/id/:itemId" element={<ItemPage />} />
      <Route path="/item/:categorySlug/:itemSlug" element={<ItemPage />} />
      <Route path="/cart" element={<CommerceGate />} />
      <Route path="/store/cart" element={<CommerceGate />} />
      <Route path="/checkout" element={<CommerceGate checkout />} />
      <Route path="/store/checkout" element={<CommerceGate checkout />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/orders/:orderId" element={<OrderDetailPage />} />
      <Route path="/addresses" element={<AddressesPage />} />
      <Route path="/addresses/new" element={<AddressFormPage />} />
      <Route path="/addresses/:addressId/edit" element={<AddressFormPage />} />
      <Route path="/react/login" element={<LoginPage />} />
      <Route path="/store/login" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<UserRegistrationPage />} />
      <Route path="/register/user" element={<UserRegistrationPage />} />
      <Route path="/store/register" element={<UserRegistrationPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/admin/profile" element={<ProfilePage />} />
      <Route path="/support" element={<Navigate to="/support/tickets" replace />} />
      <Route path="/support/tickets" element={<SupportTicketsPage />} />
      <Route path="/support/tickets/new" element={<RaiseTicketPage />} />
      <Route path="/complaint-management" element={<Navigate to="/admin/complaints" replace />} />
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="/admin/orders" element={<AdminOrdersPage />} />
      <Route path="/admin/complaints" element={<AdminSupportPage kind="complaints" />} />
      <Route path="/admin/enquiries" element={<AdminSupportPage kind="enquiries" />} />
      <Route path="/admin/orders/:orderId" element={<AdminOrderDetailPage />} />
      <Route path="/admin/customers" element={<AdminCustomersPage />} />
      <Route path="/admin/accounts" element={<Navigate to="/admin/customers" replace />} />
      <Route path="/admin/catalog" element={<AdminCatalogPage />} />
      <Route path="/admin/catalog/categories/new" element={<AdminCategoryFormPage />} />
      <Route path="/admin/catalog/categories/:categoryId/edit" element={<AdminCategoryFormPage />} />
      <Route path="/admin/catalog/categories/:categoryId/items/new" element={<AdminItemFormPage />} />
      <Route path="/admin/catalog/categories/:categoryId/items/:itemId/edit" element={<AdminItemFormPage />} />
      <Route path="/admin/service-areas" element={<AdminServiceAreasPage />} />
      <Route path="/admin/offers" element={<AdminOffersPage />} />
      <Route path="/admin/coupons" element={<AdminOffersPage />} />
      <Route path="/admin/catalog/sales" element={<AdminOffersPage />} />
      <Route path="/admin/delivery-pricing" element={<AdminDeliveryPricingPage />} />
      <Route path="/admin/payment-transactions" element={<AdminTransactionsPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-conditions" element={<TermsAndConditions />} />
      <Route path="/refund-policy" element={<RefundPolicy />} />
      <Route path="/shopping-policy" element={<ShoppingPolicy />} />
      <Route path="/about-us" element={<AboutUsPage />} />
      <Route path="/contact-us" element={<ContactUsPage />} />
      {/* Historical URLs remain harmless but old role-specific pages are unavailable. */}
      <Route path="/register/seller" element={<Navigate to="/register/user" replace />} />
      <Route path="/register/delivery" element={<Navigate to="/register/user" replace />} />
      <Route path="/seller/*" element={<Navigate to="/" replace />} />
      <Route path="/delivery/*" element={<Navigate to="/" replace />} />
      <Route path="/seller-delivery-manager/*" element={<Navigate to="/" replace />} />
      <Route path="/subscription/*" element={<Navigate to="/categories" replace />} />
      <Route path="/subscriptions/*" element={<Navigate to="/categories" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></main>
    {showFooter && <Footer />}
  </AppContent>;
}
