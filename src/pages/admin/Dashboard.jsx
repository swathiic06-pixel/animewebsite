import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  ShoppingBag, 
  IndianRupee, 
  Users, 
  Clock, 
  MoreHorizontal, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronDown,
  Info,
  CheckCircle2,
  TrendingUp,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react'
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar,
  Cell
} from 'recharts'
import { useApp } from '../../context/AppContext'
import { formatPrice } from '../../utils/formatPrice'
import { cldUrl } from '../../lib/cloudinary'
import FulfillmentDetailsModal from '../../components/admin/FulfillmentDetailsModal'

export default function Dashboard() {
  const { products, orders, buyerProfiles, refreshAllAdminData, isSyncingAll } = useApp()

  const [dateRangeKey, setDateRangeKey] = useState('30d')
  const [activeMenu, setActiveMenu] = useState(null)
  const [isFulfillmentModalOpen, setIsFulfillmentModalOpen] = useState(false)

  // Ensure fresh shared data across all tables on mount
  useEffect(() => {
    if (refreshAllAdminData) {
      refreshAllAdminData()
    }
  }, [])

  // Live date range & metrics calculation derived directly from store orders & products
  const {
    activePeriod,
    bestSellers,
    pendingPct,
    confirmedPct,
    shippedPct,
    totalStatusOrders
  } = useMemo(() => {
    const daysMap = { '7d': 7, '30d': 30, '90d': 90 }
    const days = daysMap[dateRangeKey] || 30
    const now = Date.now()
    const msInDay = 24 * 60 * 60 * 1000

    // Filter orders within selected period
    const currentOrders = orders.filter((o) => {
      if (!o.created_at) return true
      const orderTime = new Date(o.created_at).getTime()
      return (now - orderTime) <= (days * msInDay)
    })

    // Filter orders within preceding period for comparative deltas
    const previousOrders = orders.filter((o) => {
      if (!o.created_at) return false
      const orderTime = new Date(o.created_at).getTime()
      const diff = now - orderTime
      return diff > (days * msInDay) && diff <= (days * 2 * msInDay)
    })

    // Revenue calculation (excluding cancelled orders)
    const currentRevenue = currentOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

    const previousRevenue = previousOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

    const currentOrdersCount = currentOrders.length
    const previousOrdersCount = previousOrders.length

    // Unique customer calculation
    const currentCustomers = new Set(
      currentOrders.map((o) => o.user_id || o.buyer_phone || o.buyer_whatsapp || o.buyer_name).filter(Boolean)
    ).size
    const previousCustomers = new Set(
      previousOrders.map((o) => o.user_id || o.buyer_phone || o.buyer_whatsapp || o.buyer_name).filter(Boolean)
    ).size

    // Fulfillment stage counts
    const pendingCount = currentOrders.filter((o) => o.status === 'pending' || o.status === 'qr_sent').length
    const confirmedCount = currentOrders.filter((o) => o.status === 'payment_confirmed').length
    const shippedCount = currentOrders.filter((o) => o.status === 'shipped').length
    const totalStatusOrders = pendingCount + confirmedCount + shippedCount

    const calcDelta = (curr, prev) => {
      if (prev === 0) {
        return { delta: curr > 0 ? '+100%' : '+0%', isPos: true }
      }
      const pct = Math.round(((curr - prev) / prev) * 100)
      return { delta: `${pct >= 0 ? '+' : ''}${pct}%`, isPos: pct >= 0 }
    }

    const revDelta = calcDelta(currentRevenue, previousRevenue)
    const ordDelta = calcDelta(currentOrdersCount, previousOrdersCount)
    const custDelta = calcDelta(currentCustomers, previousCustomers)

    // Dynamic timeline chart buckets
    const numBuckets = dateRangeKey === '7d' ? 7 : 6
    const bucketDuration = (days * msInDay) / numBuckets
    const chartData = []

    for (let i = numBuckets - 1; i >= 0; i--) {
      const bucketEnd = now - i * bucketDuration
      const bucketStart = bucketEnd - bucketDuration
      const labelDate = new Date(bucketEnd)
      const label = labelDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })

      const bucketCurrRev = currentOrders
        .filter((o) => {
          if (o.status === 'cancelled') return false
          const t = new Date(o.created_at || now).getTime()
          return t >= bucketStart && t <= bucketEnd
        })
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

      const bucketPrevRev = previousOrders
        .filter((o) => {
          if (o.status === 'cancelled') return false
          const t = new Date(o.created_at || 0).getTime()
          const prevStart = bucketStart - (days * msInDay)
          const prevEnd = bucketEnd - (days * msInDay)
          return t >= prevStart && t <= prevEnd
        })
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

      chartData.push({
        date: label,
        current: bucketCurrRev,
        previous: bucketPrevRev
      })
    }

    // Busiest day analysis (Sun–Sat)
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayCounts = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 }
    currentOrders.forEach((o) => {
      const d = new Date(o.created_at || now).getDay()
      const dayName = daysOfWeek[d]
      if (dayCounts[dayName] !== undefined) {
        dayCounts[dayName]++
      }
    })

    const maxDayOrders = Math.max(...Object.values(dayCounts), 0)
    const busiestDayData = daysOfWeek.map((day) => ({
      day,
      orders: dayCounts[day],
      isPeak: maxDayOrders > 0 && dayCounts[day] === maxDayOrders
    }))

    // Fulfillment Rate
    const fulfillmentRate = totalStatusOrders > 0
      ? Math.round((shippedCount / totalStatusOrders) * 100)
      : 100

    const startRange = new Date(now - days * msInDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endRange = new Date(now).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    const activePeriod = {
      label: dateRangeKey === '7d' ? 'Last 7 days' : dateRangeKey === '30d' ? 'Last 30 days' : 'Last 90 days',
      dateRangeDisplay: `${startRange} – ${endRange}`,
      revenue: currentRevenue,
      revenueDelta: revDelta.delta,
      isRevenueDeltaPos: revDelta.isPos,
      ordersCount: currentOrdersCount,
      ordersDelta: ordDelta.delta,
      isOrdersDeltaPos: ordDelta.isPos,
      newCustomers: currentCustomers,
      customersDelta: custDelta.delta,
      isCustomersDeltaPos: custDelta.isPos,
      pendingCount,
      pendingDelta: pendingCount === 0 ? 'All clear' : `${pendingCount} pending`,
      isPendingBacklog: pendingCount > 5,
      chartData,
      orderStatusDistribution: {
        pending: pendingCount,
        confirmed: confirmedCount,
        shipped: shippedCount
      },
      busiestDayData,
      fulfillmentRate
    }

    const pendingPct = totalStatusOrders > 0 ? Math.round((pendingCount / totalStatusOrders) * 100) : 0
    const confirmedPct = totalStatusOrders > 0 ? Math.round((confirmedCount / totalStatusOrders) * 100) : 0
    const shippedPct = totalStatusOrders > 0 ? 100 - pendingPct - confirmedPct : 0

    // Best Selling Products dynamically calculated from actual orders items
    const salesMap = {}
    currentOrders.forEach((o) => {
      if (o.status === 'cancelled') return
      (o.items || []).forEach((item) => {
        const id = item.id || item.product_id || item.name
        if (!salesMap[id]) {
          const catalogMatch = products.find((p) => p.id === id || p.name?.toLowerCase() === item.name?.toLowerCase())
          salesMap[id] = {
            id,
            name: catalogMatch?.name || item.name || 'Anime Product',
            image_url: catalogMatch?.image_url || item.image_url || '',
            sold: 0,
            revenue: 0,
            inStock: catalogMatch ? (catalogMatch.in_stock && catalogMatch.stock > 0) : true
          }
        }
        const qty = Number(item.qty) || 1
        const price = Number(item.price) || 0
        salesMap[id].sold += qty
        salesMap[id].revenue += price * qty
      })
    })

    const bestSellers = Object.values(salesMap).sort((a, b) => b.sold - a.sold)

    return {
      activePeriod,
      bestSellers,
      pendingPct,
      confirmedPct,
      shippedPct,
      totalStatusOrders
    }
  }, [orders, products, dateRangeKey])

  const toggleMenu = (menuName) => {
    setActiveMenu((prev) => (prev === menuName ? null : menuName))
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans antialiased text-[#111827]">
      
      {/* 2. Page Header: Large bold title + date range + period filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Store performance, revenue trends, and fulfillment pipeline.
          </p>
        </div>

        {/* Right-aligned Date Range + Period Filter + Sync Button */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => refreshAllAdminData && refreshAllAdminData(true)}
            disabled={isSyncingAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#EDEDED] text-xs font-semibold text-[#111827] hover:bg-gray-50 shadow-2xs transition-all"
            title="Refresh all store data (orders, catalog, analytics)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin text-[#3B82F6]' : 'text-[#6B7280]'}`} />
            <span className="hidden sm:inline">{isSyncingAll ? 'Syncing...' : 'Sync Store'}</span>
          </button>

          <span className="text-xs font-medium text-[#6B7280] bg-white px-3 py-1.5 rounded-lg border border-[#EDEDED] shadow-2xs hidden md:inline-block">
            {activePeriod.dateRangeDisplay}
          </span>

          <div className="relative inline-block">
            <select
              value={dateRangeKey}
              onChange={(e) => setDateRangeKey(e.target.value)}
              className="appearance-none bg-white border border-[#EDEDED] text-xs font-semibold text-[#111827] rounded-xl pl-3.5 pr-8 py-2 shadow-2xs hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] cursor-pointer"
            >
              <option value="7d">Last 7 days ▾</option>
              <option value="30d">Last 30 days ▾</option>
              <option value="90d">Last 90 days ▾</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] absolute right-3 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. Stat Cards (Top Row — 4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Orders */}
        <div className="bg-white rounded-xl border border-[#EDEDED] p-5 shadow-2xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Orders</span>
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#9CA3AF]">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
              {activePeriod.ordersCount}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span>▲</span> {activePeriod.ordersDelta}
              </span>
              <span className="text-[11px] text-[#6B7280]">vs. last period</span>
            </div>
          </div>
        </div>

        {/* Card 2: Revenue */}
        <div className="bg-white rounded-xl border border-[#EDEDED] p-5 shadow-2xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#9CA3AF]">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
              {formatPrice(activePeriod.revenue)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span>▲</span> {activePeriod.revenueDelta}
              </span>
              <span className="text-[11px] text-[#6B7280]">vs. last period</span>
            </div>
          </div>
        </div>

        {/* Card 3: New Customers */}
        <div className="bg-white rounded-xl border border-[#EDEDED] p-5 shadow-2xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">New Customers</span>
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#9CA3AF]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
              {activePeriod.newCustomers}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span>▲</span> {activePeriod.customersDelta}
              </span>
              <span className="text-[11px] text-[#6B7280]">vs. last period</span>
            </div>
          </div>
        </div>

        {/* Card 4: Pending QR (Flagged in orange if high, signaling backlog) */}
        <div className={`bg-white rounded-xl border p-5 shadow-2xs hover:shadow-sm transition-shadow ${
          activePeriod.isPendingBacklog ? 'border-amber-200 ring-1 ring-amber-100' : 'border-[#EDEDED]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Pending QR</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              activePeriod.isPendingBacklog ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-[#9CA3AF]'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
              {activePeriod.pendingCount}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activePeriod.isPendingBacklog
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {activePeriod.pendingDelta}
              </span>
              <span className="text-[11px] text-[#6B7280]">vs. last period</span>
            </div>
          </div>
        </div>

      </div>

      {/* Middle Row: Left Column (Total Revenue Panel) & Right Column (Busiest Day + Fulfillment Rate) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* 4. Total Revenue Panel (Left, Large Card: 7 or 8 columns on large screens) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#EDEDED] p-5 sm:p-6 shadow-2xs space-y-6">
          
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#111827]">Total Revenue</h2>
              <p className="text-xs text-[#6B7280] mt-0.5">Revenue trend & comparative performance</p>
            </div>

            {/* Overflow "⋯" Menu */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('revenue')}
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-gray-100 transition-colors"
                aria-label="Revenue options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {activeMenu === 'revenue' && (
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-[#EDEDED] py-1.5 z-20 text-xs">
                  <button 
                    onClick={() => setActiveMenu(null)}
                    className="w-full text-left px-3.5 py-1.5 text-[#4B5563] hover:text-[#111827] hover:bg-gray-50"
                  >
                    Refresh chart
                  </button>
                  <Link 
                    to="/admin/orders"
                    className="block px-3.5 py-1.5 text-[#4B5563] hover:text-[#111827] hover:bg-gray-50"
                  >
                    View confirmed orders
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Revenue Top Stat & Delta */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
              {formatPrice(activePeriod.revenue)}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ▲ {activePeriod.revenueDelta}
              </span>
              <span className="text-xs text-[#6B7280]">vs last period</span>
            </div>
          </div>

          {/* Line Chart spanning full card width */}
          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={activePeriod.chartData} 
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={{ stroke: '#EDEDED' }}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  dy={8}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  tickFormatter={(val) => val === 0 ? '₹0' : (val >= 1000 ? `₹${Math.round(val / 1000)}k` : `₹${val}`)}
                  dx={-5}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 rounded-xl shadow-lg border border-[#EDEDED] text-xs space-y-1.5">
                          <p className="font-bold text-[#111827]">{label}</p>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                            <span className="text-[#6B7280]">Current Period:</span>
                            <span className="font-bold text-[#111827]">{formatPrice(payload[0]?.value)}</span>
                          </div>
                          {payload[1] && (
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                              <span className="text-[#6B7280]">Previous Period:</span>
                              <span className="font-bold text-[#4B5563]">{formatPrice(payload[1]?.value)}</span>
                            </div>
                          )}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                {/* Solid blue line = current period */}
                <Line 
                  type="monotone" 
                  dataKey="current" 
                  name="Current Period"
                  stroke="#3B82F6" 
                  strokeWidth={2.5} 
                  dot={{ r: 3.5, fill: '#3B82F6', strokeWidth: 0 }}
                  activeDot={{ r: 5, stroke: '#FFFFFF', strokeWidth: 2 }}
                />
                {/* Dashed light-gray line = previous period */}
                <Line 
                  type="monotone" 
                  dataKey="previous" 
                  name="Previous Period"
                  stroke="#9CA3AF" 
                  strokeWidth={1.8} 
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Segmented Horizontal Bar below chart (Pending / Payment Confirmed / Shipped) */}
          <div className="pt-4 border-t border-[#EDEDED] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#111827]">Order Fulfillment Pipeline</span>
              <span className="text-[#6B7280] font-medium">{totalStatusOrders} total orders</span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-3 rounded-full bg-gray-100 flex overflow-hidden p-0.5 gap-0.5">
              {/* Blue segment: Pending */}
              <div 
                className="bg-[#3B82F6] h-full rounded-l-full transition-all duration-500 hover:brightness-105" 
                style={{ width: `${pendingPct}%` }}
                title={`Pending: ${activePeriod.orderStatusDistribution.pending} (${pendingPct}%)`}
              />
              {/* Green segment: Payment Confirmed */}
              <div 
                className="bg-[#16A34A] h-full transition-all duration-500 hover:brightness-105" 
                style={{ width: `${confirmedPct}%` }}
                title={`Payment Confirmed: ${activePeriod.orderStatusDistribution.confirmed} (${confirmedPct}%)`}
              />
              {/* Orange segment: Shipped */}
              <div 
                className="bg-[#F59E0B] h-full rounded-r-full transition-all duration-500 hover:brightness-105" 
                style={{ width: `${shippedPct}%` }}
                title={`Shipped: ${activePeriod.orderStatusDistribution.shipped} (${shippedPct}%)`}
              />
            </div>

            {/* Segment Legend with Counts & Percentages */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                <span className="text-[#6B7280]">
                  Pending: <strong className="text-[#111827]">{activePeriod.orderStatusDistribution.pending}</strong> ({pendingPct}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                <span className="text-[#6B7280]">
                  Payment Confirmed: <strong className="text-[#111827]">{activePeriod.orderStatusDistribution.confirmed}</strong> ({confirmedPct}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                <span className="text-[#6B7280]">
                  Shipped: <strong className="text-[#111827]">{activePeriod.orderStatusDistribution.shipped}</strong> ({shippedPct}%)
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* 5. Right-Column Cards (4 columns on large screens) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* 5.1 Busiest Order Day */}
          <div className="bg-white rounded-xl border border-[#EDEDED] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#111827]">Busiest Order Day</h3>
                <p className="text-[11px] text-[#6B7280] mt-0.5">Order volume by day of week</p>
              </div>
              <button 
                onClick={() => toggleMenu('busiest')}
                className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-gray-100 transition-colors"
                aria-label="Day options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Bar Chart: Sun–Sat */}
            <div className="h-44 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={activePeriod.busiestDayData}
                  margin={{ top: 25, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis 
                    dataKey="day" 
                    tickLine={false} 
                    axisLine={{ stroke: '#EDEDED' }}
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(243, 244, 246, 0.6)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white px-2.5 py-1.5 rounded-lg shadow-md border border-[#EDEDED] text-[11px]">
                            <p className="font-bold text-[#111827]">
                              {payload[0].payload.day}: {payload[0].value} orders
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar 
                    dataKey="orders" 
                    radius={[6, 6, 0, 0]}
                    // Label peak bar with exact order count above the bar
                    label={({ x, y, width, value, index }) => {
                      const item = activePeriod.busiestDayData[index]
                      if (!item?.isPeak || item.orders === 0) return null
                      return (
                        <g>
                          <rect
                            x={x - 12}
                            y={y - 20}
                            width={width + 24}
                            height="16"
                            rx="8"
                            fill="#3B82F6"
                          />
                          <text
                            x={x + width / 2}
                            y={y - 8}
                            fill="#FFFFFF"
                            textAnchor="middle"
                            fontSize="9"
                            fontWeight="bold"
                          >
                            {value} orders
                          </text>
                        </g>
                      )
                    }}
                  >
                    {activePeriod.busiestDayData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isPeak ? '#3B82F6' : '#E5E7EB'} 
                        className="transition-colors hover:opacity-90"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="text-[11px] text-[#6B7280] pt-1 border-t border-[#EDEDED] flex items-center justify-between">
              <span>Peak Day: <strong className="text-[#111827]">{activePeriod.busiestDayData.find(d => d.isPeak)?.day || 'None yet'}</strong></span>
              <span className="text-[#3B82F6] font-semibold">{totalStatusOrders > 0 ? `${activePeriod.busiestDayData.find(d => d.isPeak)?.orders || 0} Orders` : 'No Activity'}</span>
            </div>
          </div>

          {/* 5.2 Order Fulfillment Rate */}
          <div className="bg-white rounded-xl border border-[#EDEDED] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#111827]">Order Fulfillment Rate</h3>
                <p className="text-[11px] text-[#6B7280] mt-0.5">Dispatched within SLA target</p>
              </div>
              <button 
                onClick={() => toggleMenu('fulfillment')}
                className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-gray-100 transition-colors"
                aria-label="Fulfillment options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Semi-circular gauge chart in green tones */}
            <div className="relative flex flex-col items-center justify-center pt-2">
              <svg className="w-44 h-24" viewBox="0 0 160 90">
                {/* Track Background Arc */}
                <path
                  d="M 15 80 A 65 65 0 0 1 145 80"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="6 4"
                />
                {/* Green Progress Arc */}
                <path
                  d="M 15 80 A 65 65 0 0 1 145 80"
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(activePeriod.fulfillmentRate / 100) * 204} 300`}
                  className="transition-all duration-1000"
                />
                {/* Inner Percentage display */}
                <text
                  x="80"
                  y="72"
                  textAnchor="middle"
                  fontSize="24"
                  fontWeight="800"
                  fill="#111827"
                  fontFamily="sans-serif"
                >
                  {activePeriod.fulfillmentRate}%
                </text>
              </svg>

              {/* Caption */}
              <p className="text-xs font-medium text-[#6B7280] text-center mt-1">
                {totalStatusOrders > 0 ? (activePeriod.fulfillmentRate >= 90 ? 'Exceeding 90% SLA target' : 'Working towards 90% SLA target') : 'No orders awaiting fulfillment'}
              </p>

              {/* Show Details Button */}
              <button
                onClick={() => setIsFulfillmentModalOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EDEDED] hover:bg-gray-50 text-xs font-semibold text-[#111827] transition-colors"
              >
                <span>Show details</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* 6. Best Selling Products (Bottom, Full Width Table) */}
      <div className="bg-white rounded-xl border border-[#EDEDED] shadow-2xs overflow-hidden">
        
        {/* Table Header Row */}
        <div className="p-5 sm:px-6 flex items-center justify-between border-b border-[#EDEDED]">
          <div>
            <h2 className="text-base font-bold text-[#111827]">Best Selling Products</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">Top performing inventory sorted by units sold</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/products"
              className="text-xs font-semibold text-[#3B82F6] hover:underline flex items-center gap-1"
            >
              <span>Manage all products</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>

            <button 
              onClick={() => toggleMenu('products')}
              className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-gray-100 transition-colors"
              aria-label="Table options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clean Styled HTML Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#111827]">
            <thead className="bg-[#F5F6F8] text-[11px] uppercase tracking-wider text-[#6B7280] border-b border-[#EDEDED]">
              <tr>
                <th scope="col" className="px-5 py-3.5 font-semibold">ID</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Name</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Sold</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Revenue</th>
                <th scope="col" className="px-5 py-3.5 font-semibold text-right">Stock Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDEDED] font-normal">
              {bestSellers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-xs text-[#6B7280]">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-[#9CA3AF] mb-3">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-sm text-[#111827] mb-1">No sales recorded yet</p>
                    <p>Top performing anime products will automatically appear here once customer orders are placed.</p>
                  </td>
                </tr>
              ) : (
                bestSellers.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                  {/* ID */}
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold text-[#6B7280]">
                    #{item.id}
                  </td>

                  {/* Name with thumbnail image to the left */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={cldUrl(item.image_url, { width: 80, height: 80, crop: 'fill' })}
                        alt={item.name}
                        loading="lazy"
                        className="w-10 h-10 rounded-lg object-cover bg-gray-100 border border-[#EDEDED] shrink-0"
                      />
                      <span className="font-semibold text-[#111827] truncate max-w-xs sm:max-w-md">
                        {item.name}
                      </span>
                    </div>
                  </td>

                  {/* Units Sold */}
                  <td className="px-5 py-3.5 font-medium text-[#4B5563]">
                    {item.sold} sold
                  </td>

                  {/* Revenue in muted green tone */}
                  <td className="px-5 py-3.5 font-semibold text-emerald-700">
                    {formatPrice(item.revenue)}
                  </td>

                  {/* Stock Status Badge */}
                  <td className="px-5 py-3.5 text-right">
                    {item.inStock ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        In Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        Sold Out
                      </span>
                    )}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Fulfillment Details Modal */}
      <FulfillmentDetailsModal 
        isOpen={isFulfillmentModalOpen} 
        onClose={() => setIsFulfillmentModalOpen(false)} 
        rate={activePeriod.fulfillmentRate}
      />

    </div>
  )
}
