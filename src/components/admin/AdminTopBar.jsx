import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  LogOut, 
  Settings, 
  User, 
  Menu,
  ChevronDown,
  ShoppingBag,
  ArrowRight,
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import QuickSearchModal from './QuickSearchModal'

export default function AdminTopBar({ onMobileMenuToggle }) {
  const { mockUser, logout, orders, refreshAllAdminData, isRealtimeConnected, isSyncingAll } = useApp()
  const navigate = useNavigate()

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isDarkTheme, setIsDarkTheme] = useState(false)

  const profileRef = useRef(null)
  const notificationsRef = useRef(null)

  const pendingOrders = orders.filter((o) => o.status === 'pending')

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setIsNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    setIsProfileMenuOpen(false)
    if (logout) {
      await logout()
    }
    navigate('/admin/login')
  }

  const toggleTheme = () => {
    setIsDarkTheme((prev) => !prev)
  }

  const userInitial = (mockUser?.fullName || 'Admin').charAt(0).toUpperCase()

  return (
    <>
      <header className="h-16 bg-white border-b border-[#EDEDED] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
        
        {/* Left: Mobile Hamburger & Search Input */}
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          {/* Mobile hamburger menu toggle */}
          {onMobileMenuToggle && (
            <button
              onClick={onMobileMenuToggle}
              className="p-2 rounded-xl text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 md:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Rounded Search Input with "⌘K" hint */}
          <div 
            onClick={() => setIsSearchOpen(true)}
            className="w-full relative flex items-center cursor-pointer group"
          >
            <div className="w-full flex items-center bg-[#F5F6F8] hover:bg-gray-100/90 border border-[#EDEDED] hover:border-gray-300 rounded-full pl-9 pr-3 py-2 text-xs text-[#9CA3AF] transition-all">
              <Search className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#6B7280] absolute left-3 transition-colors" />
              <span className="truncate">Search products, orders, customers...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 ml-auto px-2 py-0.5 text-[10px] font-mono text-[#6B7280] bg-white border border-[#EDEDED] rounded-md shadow-2xs font-semibold">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right: Actions (Theme toggle, Notifications, Admin Profile) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-4">
          
          {/* Live Store Realtime Sync Indicator & Manual Sync Button */}
          <button
            onClick={() => refreshAllAdminData && refreshAllAdminData(true)}
            disabled={isSyncingAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold text-[#374151] bg-[#F5F6F8] hover:bg-gray-100 border border-[#EDEDED] transition-all hover:border-gray-300 shadow-2xs"
            title={isRealtimeConnected ? "Realtime sync active across all owner accounts. Click to manually refresh all store data." : "Realtime connecting... Click to refresh."}
            aria-label="Realtime store sync"
          >
            <span className="relative flex h-2 w-2">
              {isRealtimeConnected && !isSyncingAll && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isSyncingAll ? 'bg-blue-500' : isRealtimeConnected ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
            </span>
            <span className="hidden md:inline text-[11px] font-bold text-[#111827]">
              {isSyncingAll ? 'Syncing...' : 'Live Store'}
            </span>
            {isSyncingAll && <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />}
          </button>

          {/* Optional Light/Dark Theme Toggle Icon */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-[#6B7280] hover:text-[#111827] hover:bg-[#F5F6F8] transition-colors border border-transparent hover:border-[#EDEDED]"
            title={isDarkTheme ? "Switch to light theme" : "Preview dark theme"}
            aria-label="Toggle theme"
          >
            {isDarkTheme ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-[#6B7280]" />
            )}
          </button>

          {/* Notification Bell with unread badge */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              className="relative p-2 rounded-full text-[#6B7280] hover:text-[#111827] hover:bg-[#F5F6F8] transition-colors border border-transparent hover:border-[#EDEDED]"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {pendingOrders.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
            </button>

            {/* Notification Dropdown Flyout */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#EDEDED] p-3 z-30 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 border-b border-[#EDEDED] px-1">
                  <span className="text-xs font-bold text-[#111827]">Order Notifications</span>
                  {pendingOrders.length > 0 && (
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                      {pendingOrders.length} Pending QR
                    </span>
                  )}
                </div>

                <div className="py-2 space-y-1.5 max-h-64 overflow-y-auto">
                  {pendingOrders.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#9CA3AF]">
                      <p className="font-medium text-[#6B7280]">All caught up!</p>
                      <p>No orders pending QR confirmation right now.</p>
                    </div>
                  ) : (
                    pendingOrders.slice(0, 4).map((order) => (
                      <Link
                        key={order.id}
                        to="/admin/orders"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="block p-2 rounded-xl hover:bg-[#F5F6F8] transition-colors text-xs group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[#111827] group-hover:text-[#3B82F6]">
                            #{order.id}
                          </span>
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            Pending QR
                          </span>
                        </div>
                        <p className="text-[#6B7280] text-[11px] truncate mt-0.5">
                          {order.buyer_name} • ₹{order.total_amount}
                        </p>
                      </Link>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-[#EDEDED]">
                  <Link
                    to="/admin/orders"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="w-full py-1.5 text-center block text-xs font-semibold text-[#3B82F6] hover:underline"
                  >
                    View all orders →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Vertical Separator */}
          <div className="h-5 w-[1px] bg-[#EDEDED] mx-0.5" />

          {/* Admin Avatar + Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 pl-1.5 rounded-full hover:bg-[#F5F6F8] transition-colors border border-transparent hover:border-[#EDEDED]"
              aria-label="Admin profile menu"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#3B82F6] flex items-center justify-center font-bold text-xs shrink-0">
                {userInitial}
              </div>
              <div className="hidden sm:block text-left text-xs pr-1 leading-tight">
                <p className="font-semibold text-[#111827] truncate max-w-[100px]">
                  {mockUser?.fullName || 'Sai Sharaan'}
                </p>
                <p className="text-[10px] text-[#6B7280]">Admin</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF] hidden sm:block" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#EDEDED] p-2 z-30 animate-in fade-in zoom-in-95 duration-100 text-xs">
                <div className="px-3 py-2 border-b border-[#EDEDED]">
                  <p className="font-bold text-[#111827] truncate">
                    {mockUser?.fullName || 'Sai Sharaan'}
                  </p>
                  <p className="text-[11px] text-[#6B7280] truncate mt-0.5">
                    {mockUser?.primaryEmailAddress?.emailAddress || 'owner@animemax.store'}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-[#3B82F6] text-[10px] font-semibold rounded-md">
                    Store Owner
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    to="/admin/settings"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#4B5563] hover:text-[#111827] hover:bg-[#F5F6F8] transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#6B7280]" />
                    <span>Store Settings</span>
                  </Link>

                  <Link
                    to="/"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-[#4B5563] hover:text-[#111827] hover:bg-[#F5F6F8] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShoppingBag className="w-4 h-4 text-[#6B7280]" />
                      <span>Live Storefront</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                  </Link>
                </div>

                <div className="pt-1 border-t border-[#EDEDED]">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors font-medium"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Global Quick Search Command Palette */}
      <QuickSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  )
}
