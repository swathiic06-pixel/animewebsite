import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Package, 
  Tags,
  ShoppingBag, 
  Users, 
  Sparkles,
  ExternalLink, 
  Settings,
  HelpCircle,
  ChevronLeft,
  Menu,
  Inbox
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

export default function AdminSidebar({ 
  isCollapsed = false, 
  onToggleCollapse, 
  onOpenHelp,
  onMobileClose 
}) {
  const location = useLocation()
  const { orders, requests = [] } = useApp()

  const pendingCount = orders.filter((o) => o.status === 'pending').length
  const newRequestsCount = requests.filter((r) => r.status === 'new').length

  const primaryNavItems = [
    {
      name: 'Dashboard',
      path: '/admin',
      icon: LayoutDashboard,
      exact: true
    },
    {
      name: 'Orders',
      path: '/admin/orders',
      icon: ShoppingBag,
      badge: pendingCount > 0 ? pendingCount : null
    },
    {
      name: 'Requests',
      path: '/admin/requests',
      icon: Inbox,
      badge: newRequestsCount > 0 ? newRequestsCount : null
    },
    {
      name: 'Products',
      path: '/admin/products',
      icon: Package,
    },
    {
      name: 'Categories',
      path: '/admin/categories',
      icon: Tags,
    },
    {
      name: 'Customers',
      path: '/admin/customers',
      icon: Users,
    },

    {
      name: 'Homepage Content',
      path: '/admin/content',
      icon: Sparkles,
    },
    {
      name: 'Online Store',
      path: '/',
      icon: ExternalLink,
      isExternal: true
    },
  ]

  const secondaryNavItems = [
    {
      name: 'Settings',
      path: '/admin/settings',
      icon: Settings,
    },
    {
      name: 'Help & Support',
      action: 'help',
      icon: HelpCircle,
    }
  ]

  const isActive = (item) => {
    if (item.isExternal || item.action) return false
    if (item.exact) return location.pathname === item.path
    return location.pathname.startsWith(item.path)
  }

  const handleLinkClick = () => {
    if (onMobileClose) {
      onMobileClose()
    }
  }

  return (
    <aside 
      className={`bg-white border-r border-[#EDEDED] flex flex-col justify-between shrink-0 font-sans select-none transition-all duration-200 z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      } h-screen sticky top-0`}
    >
      <div className="flex flex-col h-full">
        {/* Top: Logo / Wordmark + Collapse Button */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#EDEDED] shrink-0">
          <Link 
            to="/admin" 
            onClick={handleLinkClick}
            className="flex items-center gap-2 overflow-hidden group"
          >
            {isCollapsed ? (
              <span className="font-bold text-sm tracking-tight text-[#111827]">
                A<span className="text-[#3B82F6]">M</span>
              </span>
            ) : (
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="font-bold text-base tracking-tight text-[#111827]">
                  Anime<span className="text-[#3B82F6]">Max</span>
                </span>
                <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider bg-gray-100 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              </div>
            )}
          </Link>

          {/* Small Collapse Icon Button */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 transition-colors hidden md:flex items-center justify-center"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Primary Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {primaryNavItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item)

            if (item.isExternal) {
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleLinkClick}
                  title={isCollapsed ? item.name : undefined}
                  className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2 rounded-xl text-xs font-medium text-[#6B7280] hover:text-[#111827] hover:bg-gray-50 transition-colors group`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 text-[#6B7280] group-hover:text-[#111827] shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </div>
                  {!isCollapsed && (
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 shrink-0" />
                  )}
                </Link>
              )
            }

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={handleLinkClick}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-[#EFF6FF] text-[#3B82F6] font-semibold'
                    : 'text-[#4B5563] hover:text-[#111827] hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#3B82F6]' : 'text-[#6B7280]'}`} />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </div>
                {!isCollapsed && item.badge !== null && item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {item.badge}
                  </span>
                )}
                {isCollapsed && item.badge !== null && item.badge !== undefined && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </Link>
            )
          })}
        </div>

        {/* Divider Line */}
        <div className="border-t border-[#EDEDED] my-2 mx-3" />

        {/* Secondary / Footer Navigation */}
        <div className="px-3 pb-4 pt-1 space-y-1 shrink-0">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon

            if (item.action === 'help') {
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    if (onOpenHelp) onOpenHelp()
                    handleLinkClick()
                  }}
                  title={isCollapsed ? item.name : undefined}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2 rounded-xl text-xs font-normal text-[#6B7280] hover:text-[#111827] hover:bg-gray-50 transition-colors`}
                >
                  <Icon className="w-4 h-4 text-[#6B7280] shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </button>
              )
            }

            const active = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={handleLinkClick}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2 rounded-xl text-xs font-normal transition-colors ${
                  active 
                    ? 'bg-[#EFF6FF] text-[#3B82F6] font-semibold' 
                    : 'text-[#6B7280] hover:text-[#111827] hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#3B82F6]' : 'text-[#6B7280]'}`} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
