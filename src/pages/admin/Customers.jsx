import React, { useState, useEffect } from 'react'
import { 
  Users, 
  Search, 
  MessageSquare, 
  ShoppingBag, 
  Mail, 
  Phone, 
  ExternalLink,
  ShieldCheck, 
  UserCheck,
  RefreshCw
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatPrice } from '../../utils/formatPrice'

export default function Customers() {
  const { orders, buyerProfiles, refreshOrders, refreshBuyerProfiles } = useApp()
  const [searchFilter, setSearchFilter] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Sync customer records & profiles on mount
  useEffect(() => {
    if (refreshOrders) refreshOrders()
    if (refreshBuyerProfiles) refreshBuyerProfiles()
  }, [])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      if (refreshOrders) await refreshOrders()
      if (refreshBuyerProfiles) await refreshBuyerProfiles()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Aggregate customers from orders and buyerProfiles
  const customerMap = new Map()

  // Process buyer profiles first
  Object.values(buyerProfiles || {}).forEach((prof) => {
    customerMap.set(prof.user_id, {
      id: prof.user_id,
      name: prof.name || 'Registered Buyer',
      phone: prof.phone || prof.whatsapp || 'N/A',
      whatsapp: prof.whatsapp || prof.phone || 'N/A',
      address: prof.address || 'N/A',
      isRegistered: true,
      ordersCount: 0,
      totalSpent: 0,
      lastOrderDate: null
    })
  })

  // Process orders
  orders.forEach((order) => {
    const key = order.user_id || order.buyer_whatsapp || order.buyer_phone || order.buyer_name
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        id: key,
        name: order.buyer_name,
        phone: order.buyer_phone,
        whatsapp: order.buyer_whatsapp,
        address: order.buyer_address,
        isRegistered: Boolean(order.user_id),
        ordersCount: 0,
        totalSpent: 0,
        lastOrderDate: order.created_at
      })
    }
    const cust = customerMap.get(key)
    cust.ordersCount += 1
    cust.totalSpent += Number(order.total_amount) || 0
    if (!cust.lastOrderDate || new Date(order.created_at) > new Date(cust.lastOrderDate)) {
      cust.lastOrderDate = order.created_at
    }
  })

  const customerList = Array.from(customerMap.values()).filter((c) => {
    const q = searchFilter.toLowerCase()
    return (
      !searchFilter ||
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.whatsapp.toLowerCase().includes(q)
    )
  })

  const totalSpentAll = customerList.reduce((acc, c) => acc + c.totalSpent, 0)
  const repeatCustomers = customerList.filter((c) => c.ordersCount > 1).length

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans antialiased text-[#111827]">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
            Customer Directory
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Manage buyer relationships, lifetime spend, order history, and direct WhatsApp contacts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#EDEDED] text-xs font-semibold text-[#111827] hover:bg-gray-50 shadow-2xs transition-all"
            title="Sync latest customers from orders and profiles"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#3B82F6]' : 'text-[#6B7280]'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Customers'}</span>
          </button>

          <span className="text-xs text-[#6B7280] bg-white px-3 py-1.5 rounded-xl border border-[#EDEDED] shadow-2xs font-semibold">
            {customerList.length} Total Buyers
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="p-5 rounded-xl bg-white border border-[#EDEDED] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Total Customers</p>
            <h3 className="text-2xl font-extrabold text-[#111827] mt-1">{customerList.length}</h3>
            <p className="text-[11px] text-[#6B7280] mt-0.5">Guest & registered accounts</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#3B82F6] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#EDEDED] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Repeat Buyers</p>
            <h3 className="text-2xl font-extrabold text-[#111827] mt-1">{repeatCustomers}</h3>
            <p className="text-[11px] text-[#6B7280] mt-0.5">Placed 2+ orders</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#EDEDED] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Customer Spend</p>
            <h3 className="text-2xl font-extrabold text-[#111827] mt-1">{formatPrice(totalSpentAll)}</h3>
            <p className="text-[11px] text-[#6B7280] mt-0.5">Across store orders</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-50 text-[#4B5563] flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3.5 rounded-xl bg-white border border-[#EDEDED] shadow-2xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by customer name or phone..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-[#F5F6F8] border border-[#EDEDED] rounded-xl pl-9 pr-4 py-2 text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
          />
          <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3.5 top-2.5" />
        </div>
      </div>

      {/* Customers Table */}
      <div className="overflow-x-auto rounded-xl border border-[#EDEDED] bg-white shadow-2xs">
        <table className="w-full text-left text-xs text-[#111827]">
          <thead className="bg-[#F5F6F8] text-[11px] uppercase tracking-wider text-[#6B7280] border-b border-[#EDEDED]">
            <tr>
              <th scope="col" className="px-5 py-3.5 font-semibold">Customer</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Account Type</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">WhatsApp / Phone</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Orders</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Total Spent</th>
              <th scope="col" className="px-5 py-3.5 font-semibold text-right">Quick Contact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDEDED]">
            {customerList.map((customer) => {
              const cleanPhone = (customer.whatsapp || customer.phone || '').replace(/\D/g, '')
              const waLink = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(`Hi ${customer.name}, thank you for choosing AnimeMax!`)}`

              return (
                <tr key={customer.id} className="hover:bg-gray-50/70 transition-colors">
                  
                  {/* Name & Avatar */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-[#3B82F6] border border-blue-200 flex items-center justify-center text-xs font-bold shrink-0">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-[#111827]">{customer.name}</p>
                        <p className="text-[11px] text-[#6B7280] truncate max-w-xs">{customer.address}</p>
                      </div>
                    </div>
                  </td>

                  {/* Account Type */}
                  <td className="px-5 py-3.5">
                    {customer.isRegistered ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-[#3B82F6] border border-blue-200">
                        <ShieldCheck className="w-3 h-3" /> Registered
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-[#6B7280]">
                        Guest Buyer
                      </span>
                    )}
                  </td>

                  {/* WhatsApp / Phone */}
                  <td className="px-5 py-3.5 font-medium text-[#111827]">
                    <div className="flex items-center gap-1 text-xs">
                      <span>{customer.whatsapp || customer.phone}</span>
                    </div>
                  </td>

                  {/* Orders count */}
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-[#111827]">{customer.ordersCount} orders</span>
                  </td>

                  {/* Total spent */}
                  <td className="px-5 py-3.5 font-bold text-[#111827]">
                    {formatPrice(customer.totalSpent)}
                  </td>

                  {/* Contact */}
                  <td className="px-5 py-3.5 text-right">
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-2xs transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </td>

                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}
