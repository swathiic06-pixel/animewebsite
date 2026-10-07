import React, { useState, useEffect, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { 
  Search, 
  RefreshCw, 
  Inbox, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X, 
  Trash2, 
  Image as ImageIcon,
  ExternalLink,
  ChevronDown,
  Sparkles,
  UserCheck,
  UserX,
  RotateCcw,
  CheckCircle,
  XCircle,
  Package
} from 'lucide-react'
import { cldUrl } from '../../lib/cloudinary'

export default function ManageRequests() {
  const { 
    requests = [], 
    updateRequestStatus, 
    deleteRequest, 
    refreshRequests,
    replacementRequests = [],
    updateReplacementStatus,
    refreshReplacementRequests,
    orders = []
  } = useApp()

  const [mainTab, setMainTab] = useState('replacements') // 'replacements' | 'products'
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState(null)
  const [deleteCandidate, setDeleteCandidate] = useState(null)

  useEffect(() => {
    if (refreshRequests) refreshRequests()
    if (refreshReplacementRequests) refreshReplacementRequests()
  }, [])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    if (refreshRequests) await refreshRequests()
    if (refreshReplacementRequests) await refreshReplacementRequests()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // Map order details for quick lookup in replacements
  const ordersMap = useMemo(() => {
    const map = new Map()
    orders.forEach((o) => map.set(String(o.id), o))
    return map
  }, [orders])

  // Product inquiries filtering & counting
  const filteredProductRequests = useMemo(() => {
    return (requests || []).filter((r) => {
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (r.product_name && r.product_name.toLowerCase().includes(q)) ||
        (r.id && String(r.id).toLowerCase().includes(q)) ||
        (r.user_id && String(r.user_id).toLowerCase().includes(q))
      return matchesStatus && matchesSearch
    })
  }, [requests, statusFilter, searchQuery])

  const productCounts = useMemo(() => ({
    all: (requests || []).length,
    new: (requests || []).filter((r) => r.status === 'new').length,
    reviewing: (requests || []).filter((r) => r.status === 'reviewing').length,
    fulfilled: (requests || []).filter((r) => r.status === 'fulfilled').length,
    declined: (requests || []).filter((r) => r.status === 'declined').length,
  }), [requests])

  // Replacement requests filtering & counting (Part 2)
  const filteredReplacements = useMemo(() => {
    return (replacementRequests || []).filter((r) => {
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter
      const q = searchQuery.toLowerCase().trim()
      const order = ordersMap.get(String(r.order_id))
      const matchesSearch =
        !q ||
        (r.order_id && String(r.order_id).toLowerCase().includes(q)) ||
        (r.reason && r.reason.toLowerCase().includes(q)) ||
        (order?.buyer_name && order.buyer_name.toLowerCase().includes(q)) ||
        (order?.buyer_phone && String(order.buyer_phone).includes(q))
      return matchesStatus && matchesSearch
    })
  }, [replacementRequests, statusFilter, searchQuery, ordersMap])

  const replacementCounts = useMemo(() => ({
    all: (replacementRequests || []).length,
    pending: (replacementRequests || []).filter((r) => r.status === 'pending').length,
    approved: (replacementRequests || []).filter((r) => r.status === 'approved').length,
    declined: (replacementRequests || []).filter((r) => r.status === 'declined').length,
    completed: (replacementRequests || []).filter((r) => r.status === 'completed').length,
  }), [replacementRequests])

  const formatDate = (dateString) => {
    if (!dateString) return 'Just now'
    try {
      const d = new Date(dateString)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Pending
          </span>
        )
      case 'reviewing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Clock className="w-3 h-3 text-purple-600" />
            Reviewing
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle className="w-3 h-3 text-blue-600" />
            Approved
          </span>
        )
      case 'fulfilled':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {status === 'completed' ? 'Completed' : 'Fulfilled'}
          </span>
        )
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Declined
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-700">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans antialiased text-[#111827]">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
            Customer Requests &amp; Replacements
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Manage 5-day post-delivery replacement requests and custom product inquiries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#EDEDED] text-xs font-semibold text-[#111827] hover:bg-gray-50 shadow-2xs transition-all cursor-pointer"
            title="Sync latest requests from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#3B82F6]' : 'text-[#6B7280]'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Requests'}</span>
          </button>

          {replacementCounts.pending > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-3.5 py-1.5 rounded-xl border border-amber-200 shadow-2xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              <span>{replacementCounts.pending} Pending Replacement{replacementCounts.pending > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Primary Section Tabs: Replacements vs Inquiries ─────────────────── */}
      <div className="flex items-center gap-2 border-b border-[#EDEDED] pb-2">
        <button
          onClick={() => {
            setMainTab('replacements')
            setStatusFilter('all')
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mainTab === 'replacements'
              ? 'bg-[#111827] text-white shadow-2xs'
              : 'text-[#6B7280] hover:text-[#111827] hover:bg-gray-100'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Replacement Requests (Part 2)</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
            mainTab === 'replacements' ? 'bg-white/20 text-white' : 'bg-gray-200 text-[#6B7280]'
          }`}>
            {replacementRequests.length}
          </span>
        </button>

        <button
          onClick={() => {
            setMainTab('products')
            setStatusFilter('all')
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mainTab === 'products'
              ? 'bg-[#111827] text-white shadow-2xs'
              : 'text-[#6B7280] hover:text-[#111827] hover:bg-gray-100'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Product Inquiries</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
            mainTab === 'products' ? 'bg-white/20 text-white' : 'bg-gray-200 text-[#6B7280]'
          }`}>
            {requests.length}
          </span>
        </button>
      </div>

      {/* ── Filter Tabs & Search Bar ───────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-[#EDEDED] shadow-2xs">
        {/* Status Tabs for Active Section */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none">
          {mainTab === 'replacements' ? (
            [
              { id: 'all', label: 'All Replacements', count: replacementCounts.all },
              { id: 'pending', label: 'Pending Review', count: replacementCounts.pending },
              { id: 'approved', label: 'Approved', count: replacementCounts.approved },
              { id: 'completed', label: 'Completed', count: replacementCounts.completed },
              { id: 'declined', label: 'Declined', count: replacementCounts.declined },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#111827] text-white shadow-2xs'
                    : 'text-[#6B7280] hover:text-[#111827] hover:bg-gray-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  statusFilter === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-[#6B7280]'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))
          ) : (
            [
              { id: 'all', label: 'All Inquiries', count: productCounts.all },
              { id: 'new', label: 'New', count: productCounts.new },
              { id: 'reviewing', label: 'Reviewing', count: productCounts.reviewing },
              { id: 'fulfilled', label: 'Fulfilled', count: productCounts.fulfilled },
              { id: 'declined', label: 'Declined', count: productCounts.declined },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#111827] text-white shadow-2xs'
                    : 'text-[#6B7280] hover:text-[#111827] hover:bg-gray-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  statusFilter === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-[#6B7280]'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder={mainTab === 'replacements' ? "Search order ID, reason, buyer..." : "Search product name or ID..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F5F6F8] border border-[#EDEDED] rounded-xl pl-9 pr-4 py-1.5 text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:bg-white transition-all"
          />
          <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-2.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-[#9CA3AF] hover:text-[#111827]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Table Content ──────────────────────────────────────────────────── */}
      {mainTab === 'replacements' ? (
        /* ── REPLACEMENT REQUESTS TABLE (Part 2) ── */
        <div className="overflow-x-auto rounded-xl border border-[#EDEDED] bg-white shadow-2xs">
          <table className="w-full text-left text-xs text-[#111827]">
            <thead className="bg-[#F5F6F8] text-[11px] uppercase tracking-wider text-[#6B7280] border-b border-[#EDEDED]">
              <tr>
                <th scope="col" className="px-5 py-3.5 font-semibold">Defect Photo</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Order Reference &amp; Buyer</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Reason for Replacement</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Date Requested</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3.5 font-semibold text-center">Fulfillment Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDEDED] font-normal">
              {filteredReplacements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-xs text-[#6B7280]">
                    <RotateCcw className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2 opacity-50" />
                    <p className="font-bold text-sm text-[#111827] mb-0.5">No replacement requests found</p>
                    <p>There are no replacement claims matching this status filter.</p>
                  </td>
                </tr>
              ) : (
                filteredReplacements.map((req) => {
                  const order = ordersMap.get(String(req.order_id))
                  return (
                    <tr key={req.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Photo Thumbnail */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {req.reference_image_url ? (
                          <div className="relative group/thumb w-14 h-14 rounded-lg overflow-hidden border border-[#EDEDED] bg-gray-50 shrink-0">
                            <img
                              src={cldUrl(req.reference_image_url, { width: 120, height: 120, crop: 'fill' })}
                              alt="Defect reference"
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => setPreviewImageUrl(req.reference_image_url)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white text-[10px] font-semibold transition-opacity"
                            >
                              View
                            </button>
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg border border-dashed border-[#EDEDED] bg-gray-50 flex flex-col items-center justify-center text-[#9CA3AF]">
                            <ImageIcon className="w-4 h-4 mb-0.5 opacity-60" />
                            <span className="text-[9px]">No photo</span>
                          </div>
                        )}
                      </td>

                      {/* Order Reference & Buyer */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          <p className="font-mono font-bold text-xs text-[#111827]">
                            #{req.order_id}
                          </p>
                          {order ? (
                            <>
                              <p className="text-xs text-[#111827] font-semibold">{order.buyer_name}</p>
                              <p className="text-[11px] text-[#6B7280]">{order.buyer_whatsapp || order.buyer_phone}</p>
                            </>
                          ) : (
                            <p className="text-[11px] text-[#9CA3AF]">Order recorded</p>
                          )}
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="px-5 py-3.5 max-w-sm">
                        <div className="p-2.5 rounded-lg bg-[#F5F6F8] border border-[#EDEDED] text-xs text-[#111827] leading-relaxed">
                          {req.reason}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-[#6B7280]">
                        {formatDate(req.created_at)}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {getStatusBadge(req.status)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {req.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateReplacementStatus(req.id, 'approved')}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                                title="Approve replacement claim"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => updateReplacementStatus(req.id, 'declined')}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                                title="Decline replacement claim"
                              >
                                Decline
                              </button>
                            </>
                          )}

                          {req.status === 'approved' && (
                            <button
                              onClick={() => updateReplacementStatus(req.id, 'completed')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-2xs"
                              title="Mark replacement shipped & completed"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Mark Completed</span>
                            </button>
                          )}

                          {req.status === 'completed' && (
                            <span className="text-[11px] font-semibold text-emerald-700">
                              ✓ Replacement Resolved
                            </span>
                          )}

                          {req.status === 'declined' && (
                            <span className="text-[11px] font-semibold text-rose-700">
                              Declined
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── PRODUCT INQUIRIES TABLE ── */
        <div className="overflow-x-auto rounded-xl border border-[#EDEDED] bg-white shadow-2xs">
          <table className="w-full text-left text-xs text-[#111827]">
            <thead className="bg-[#F5F6F8] text-[11px] uppercase tracking-wider text-[#6B7280] border-b border-[#EDEDED]">
              <tr>
                <th scope="col" className="px-5 py-3.5 font-semibold">Reference Image</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Product Name / Character</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Buyer / User</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Date Submitted</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Current Status</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Update Status</th>
                <th scope="col" className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDEDED] font-normal">
              {filteredProductRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-xs text-[#6B7280]">
                    <Inbox className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2 opacity-50" />
                    <p className="font-bold text-sm text-[#111827] mb-0.5">No inquiries found</p>
                    <p>There are no inquiries matching this filter yet.</p>
                  </td>
                </tr>
              ) : (
                filteredProductRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {req.reference_image_url ? (
                        <div className="relative group/thumb w-14 h-14 rounded-lg overflow-hidden border border-[#EDEDED] bg-gray-50 shrink-0">
                          <img
                            src={cldUrl(req.reference_image_url, { width: 120, height: 120, crop: 'fill' })}
                            alt={req.product_name || 'Product reference'}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => setPreviewImageUrl(req.reference_image_url)}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white text-[10px] font-semibold transition-opacity"
                          >
                            View
                          </button>
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-lg border border-dashed border-[#EDEDED] bg-gray-50 flex flex-col items-center justify-center text-[#9CA3AF]">
                          <ImageIcon className="w-4 h-4 mb-0.5 opacity-60" />
                          <span className="text-[9px]">No photo</span>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      {req.product_name ? (
                        <div>
                          <p className="font-bold text-sm text-[#111827]">{req.product_name}</p>
                          <p className="text-[10px] text-[#9CA3AF] font-mono mt-0.5">ID: {req.id}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-[#9CA3AF] italic">No title provided (Photo only)</p>
                          <p className="text-[10px] text-[#9CA3AF] font-mono mt-0.5">ID: {req.id}</p>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      {req.user_id ? (
                        <div className="flex items-center gap-1.5 text-xs text-[#111827]">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-mono text-[11px] truncate max-w-[120px]">{req.user_id}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                          <UserX className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>Guest Visitor</span>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-[#6B7280]">
                      {formatDate(req.created_at)}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {getStatusBadge(req.status)}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <select
                        value={req.status}
                        onChange={(e) => updateRequestStatus(req.id, e.target.value)}
                        className="bg-white border border-[#EDEDED] rounded-xl px-2.5 py-1 text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#3B82F6] cursor-pointer shadow-2xs hover:bg-gray-50 transition-colors"
                      >
                        <option value="new">New</option>
                        <option value="reviewing">Reviewing</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="declined">Declined</option>
                      </select>
                    </td>

                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => setDeleteCandidate(req)}
                        className="p-1.5 text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete request"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Photo Lightbox Modal ───────────────────────────────────────────── */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-w-3xl w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between mb-3 text-white">
              <span className="text-xs text-white/80 font-semibold">Reference Photo</span>
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
            <img
              src={previewImageUrl}
              alt="Reference preview"
              className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#EDEDED] space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#111827]">Delete Request</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  Are you sure you want to delete this request? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EDEDED]">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteRequest(deleteCandidate.id)
                  setDeleteCandidate(null)
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-2xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
