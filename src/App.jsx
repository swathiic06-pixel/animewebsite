import React, { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import CartDrawer from './components/storefront/CartDrawer'
import StorefrontSidebar from './components/storefront/StorefrontSidebar'
import StorefrontTopBar from './components/storefront/StorefrontTopBar'
import StorefrontFooter from './components/storefront/StorefrontFooter'
import AdminLayout from './components/admin/AdminLayout'

// Storefront Pages
import Home from './pages/storefront/Home'
import ProductDetail from './pages/storefront/ProductDetail'
import Cart from './pages/storefront/Cart'
import Checkout from './pages/storefront/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'

// Account Pages
import SignIn from './pages/account/SignIn'
import SignUp from './pages/account/SignUp'
import Account from './pages/account/Account'
import OrderHistory from './pages/account/OrderHistory'

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin'
import Dashboard from './pages/admin/Dashboard'
import ManageProducts from './pages/admin/ManageProducts'
import ManageCategories from './pages/admin/ManageCategories'
import ManageOrders from './pages/admin/ManageOrders'
import ManageRequests from './pages/admin/ManageRequests'
import ManageBanners from './pages/admin/ManageBanners'
import Customers from './pages/admin/Customers'
import Messages from './pages/admin/Messages'
import AdminSettings from './pages/admin/AdminSettings'

// Route Guards
import ProtectedBuyerRoute from './routes/ProtectedBuyerRoute'
import ProtectedAdminRoute from './routes/ProtectedAdminRoute'
import { X } from '@phosphor-icons/react'

export default function App() {
  const location = useLocation()
  const isAdminPath = location.pathname.startsWith('/admin')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className={`min-h-screen flex flex-col ${isAdminPath ? 'bg-[#F5F6F8] text-[#111827]' : 'bg-[#FFFFFF] text-[#111111]'}`}>
      {isAdminPath ? (
        /* ─────────────────────────────────────────────────────────────────
           Admin Layout: Light SaaS Theme (#FFFFFF Sidebar, #F5F6F8 Canvas)
           NO data-theme="storefront" here — admin stays untouched.
           ───────────────────────────────────────────────────────────────── */
        <AdminLayout>
          <Routes>
            <Route path="/admin" element={<ProtectedAdminRoute><Dashboard /></ProtectedAdminRoute>} />
            <Route path="/admin/products" element={<ProtectedAdminRoute><ManageProducts /></ProtectedAdminRoute>} />
            <Route path="/admin/categories" element={<ProtectedAdminRoute><ManageCategories /></ProtectedAdminRoute>} />
            <Route path="/admin/orders" element={<ProtectedAdminRoute><ManageOrders /></ProtectedAdminRoute>} />
            <Route path="/admin/requests" element={<ProtectedAdminRoute><ManageRequests /></ProtectedAdminRoute>} />
            <Route path="/admin/content" element={<ProtectedAdminRoute><ManageBanners /></ProtectedAdminRoute>} />
            <Route path="/admin/customers" element={<ProtectedAdminRoute><Customers /></ProtectedAdminRoute>} />
            <Route path="/admin/settings" element={<ProtectedAdminRoute><AdminSettings /></ProtectedAdminRoute>} />
            <Route path="/admin/messages" element={<ProtectedAdminRoute><Messages /></ProtectedAdminRoute>} />
            <Route path="/admin/login/*" element={<AdminLogin />} />
          </Routes>
        </AdminLayout>

      ) : (
        /* ─────────────────────────────────────────────────────────────────
           Storefront Layout: Kinetic Editorial Design System
           data-theme="storefront" scopes all CSS tokens to this subtree.
           ───────────────────────────────────────────────────────────────── */
        <div
          data-theme="storefront"
          className="bg-[#FFFFFF] w-full"
          style={{
            minHeight: '100dvh',
            /* dvh fallback for browsers without dvh support */
            /* @supports not (min-height: 100dvh) { min-height: 100vh } */
            overflowX: 'hidden',
            colorScheme: 'light',
          }}
        >
          {/* Global Slide-out Shopping Cart Drawer */}
          <CartDrawer />

          <div
            className="flex max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-12"
            style={{
              minHeight: '100dvh',
              // Padding for notched phones (safe-area insets)
              paddingLeft: 'max(1rem, env(safe-area-inset-left))',
              paddingRight: 'max(1rem, env(safe-area-inset-right))',
            }}
          >

            {/* Desktop Floating Left Sidebar */}
            <div className="hidden lg:block flex-shrink-0">
              <StorefrontSidebar />
            </div>

            {/* Mobile Navigation Drawer */}
            {mobileNavOpen && (
              <div className="fixed inset-0 z-50 lg:hidden flex">
                <div
                  className="fixed inset-0 bg-[rgba(17,17,17,0.4)]"
                  onClick={() => setMobileNavOpen(false)}
                />
                {/* Drawer panel — does NOT contain a sticky sidebar, just scrollable nav content */}
                <div
                  className="relative z-10 bg-white h-full overflow-y-auto border-r border-[#E5E5E5] flex flex-col"
                  style={{
                    width: 'min(18rem, 85vw)',
                    paddingLeft: 'env(safe-area-inset-left)',
                    paddingBottom: 'env(safe-area-inset-bottom)',
                  }}
                >
                  <div className="flex justify-end p-4">
                    <button
                      onClick={() => setMobileNavOpen(false)}
                      className="p-2 rounded-[12px] text-[#6B6B6B] hover:text-[#111111] hover:bg-[#F8F8F6] transition-colors"
                      aria-label="Close navigation"
                      style={{ minWidth: '44px', minHeight: '44px' }}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {/* Render sidebar in non-sticky context inside drawer */}
                  <div onClick={() => setMobileNavOpen(false)} className="flex-1 px-2 pb-6">
                    <StorefrontSidebar />
                  </div>
                </div>
              </div>
            )}

            {/* Main Storefront Area */}
            <div className="flex-1 flex flex-col min-w-0">
              <StorefrontTopBar onMobileMenuToggle={() => setMobileNavOpen(true)} />

              <main className="flex-1 py-6">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />

                  {/* Account Routes */}
                  <Route path="/signin/*" element={<SignIn />} />
                  <Route path="/signup/*" element={<SignUp />} />
                  <Route path="/account" element={<ProtectedBuyerRoute><Account /></ProtectedBuyerRoute>} />
                  <Route path="/orders" element={<ProtectedBuyerRoute><OrderHistory /></ProtectedBuyerRoute>} />

                  {/* Fallback */}
                  <Route path="*" element={<Home />} />
                </Routes>
              </main>

              <StorefrontFooter />
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
