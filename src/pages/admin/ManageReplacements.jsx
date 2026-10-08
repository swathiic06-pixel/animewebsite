import React, { useState, useMemo } from 'react'
import {
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  Eye,
  X,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Phone,
  MessageCircle,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  AlertTriangle,
  Info,
  Calendar,
  Package,
  Layers
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { cldUrl } from '../../lib/cloudinary'
import { formatPrice } from '../../utils/formatPrice'

const REASON_BADGES = {
  damaged: { label: 'Damaged on Arrival', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
  wrong_item: { label: 'Wrong Item Received', bg: 'bg-purple-50 text-purple-800 border-purple-200' },
  defective: { label: 'Defective / Not Working', bg: 'bg-orange-50 text-orange-800 border-orange-200' },
  missing_parts: { label: 'Missing Parts', bg: 'bg-blue-50 text-blue-800 border-blue-200' },
  other: { label: 'Other Issue', bg: 'bg-gray-100 text-gray-800 border-gray-300' },
}

const STATUS_BADGES = {
  pending: { label: 'Pending Review', bg: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500 animate-pulse' },
  approved: { label: 'Approved', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle },
  shipped: { label: 'Shipped', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200', icon: Truck },
  declined: { label: 'Declined', bg: 'bg-rose-50 text-rose-800 border-rose-200', icon: XCircle },
}

export default function ManageReplacements() {
  const {
    replacementRequests = [],
    refreshReplacementRequests,
    updateReplacementDecision,
    orders = [],
    products = []
  } = useApp()

  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'pending' | 'approved' | 'shipped' | 'declined'
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)

  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState([])
  const [activePhotoIdx, setActivePhotoIdx] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  // Decision box state
  const [activeAction, setActiveAction] = useState(null) // 'approve' | 'decline' | 'ship' | null
  const [actionNote, setActionNote] = useState('')
  const [trackingNumberInput, setTrackingNumberInput] = useState('')
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false)
  const [decisionError, setDecisionError] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    if (refreshReplacementRequests) {
      await refreshReplacementRequests()
    }
    setTimeout(() => setIsRefreshing(false), 500)
    showToast('Replacement requests refreshed')
  }

  // Pre-index orders for instantaneous lookups
  const ordersMap = useMemo(() => {
    const map = new Map()
    orders.forEach(o => map.set(String(o.id), o))
    return map
  }, [orders])

  // Counts by status
  const counts = useMemo(() => ({
    all: replacementRequests.length,
    pending: replacementRequests.filter(r => r.status === 'pending').length,
    approved: replacementRequests.filter(r => r.status === 'approved').length,
    shipped: replacementRequests.filter(r => r.status === 'shipped').length,
    declined: replacementRequests.filter(r => r.status === 'declined').length,
  }), [replacementRequests])

  // Filter and search
  const filteredRequests = useMemo(() => {
    return replacementRequests.filter(req => {
      // 1. Status filter
      if (statusFilter !== 'all' && req.status !== statusFilter) {
        return false
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const order = ordersMap.get(String(req.order_id))
        const orderMatch = String(req.order_id || '').toLowerCase().includes(q)
        const descMatch = String(req.description || '').toLowerCase().includes(q)
        const reasonMatch = String(req.reason_category || '').toLowerCase().includes(q)
        const buyerMatch = String(order?.buyer_name || '').toLowerCase().includes(q)
        const phoneMatch = String(order?.buyer_phone || order?.buyer_whatsapp || '').toLowerCase().includes(q)
        const trackingMatch = String(req.tracking_number || '').toLowerCase().includes(q)

        return orderMatch || descMatch || reasonMatch || buyerMatch || phoneMatch || trackingMatch
      }

      return true
    })
  }, [replacementRequests, statusFilter, searchQuery, ordersMap])

  // Open detail view
  const handleOpenDetail = (req) => {
    setSelectedRequest(req)
    setActiveAction(null)
    setActionNote(req.owner_note || '')
    setTrackingNumberInput(req.tracking_number || '')
    setDecisionError('')
  }

  // Open Lightbox
  const handleOpenLightbox = (images, initialIdx = 0) => {
    setLightboxImages(images || [])
    setActivePhotoIdx(initialIdx)
    setIsLightboxOpen(true)
  }

  // Decision submission
  const handleDecisionSubmit = async (status) => {
    if (!selectedRequest) return
    setDecisionError('')

    if (status === 'declined' && !actionNote.trim()) {
      setDecisionError('Please provide a reason so the buyer understands why the claim is declined.')
      return
    }

    if (status === 'shipped' && !trackingNumberInput.trim()) {
      setDecisionError('Please enter a tracking number for the replacement parcel.')
      return
    }

    setIsSubmittingDecision(true)
    try {
      await updateReplacementDecision({
        requestId: selectedRequest.id,
        status,
        ownerNote: actionNote.trim() || null,
        trackingNumber: trackingNumberInput.trim() || null
      })

      // Update selected request in modal
      setSelectedRequest(prev => ({
        ...prev,
        status,
        owner_note: actionNote.trim() || prev.owner_note,
        tracking_number: trackingNumberInput.trim() || prev.tracking_number,
        resolved_at: ['approved', 'declined'].includes(status) ? new Date().toISOString() : prev.resolved_at,
        shipped_at: status === 'shipped' ? new Date().toISOString() : prev.shipped_at
      }))

      setActiveAction(null)
      showToast(`Replacement request marked as ${status.toUpperCase()}!`)
    } catch (err) {
      setDecisionError(err?.message || 'Failed to update replacement status.')
    } finally {
      setIsSubmittingDecision(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
              Replacement Requests
            </h1>
            {counts.pending > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>{counts.pending} Pending</span>
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Amazon-style replacement claims queue. Review customer evidence photos and make single-decision approvals, declines, or shipping updates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#EDEDED] text-xs font-semibold text-[#111827] hover:bg-gray-50 shadow-2xs transition-all cursor-pointer"
            title="Sync latest replacement claims from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#3B82F6]' : 'text-[#6B7280]'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Queue'}</span>
          </button>
        </div>
      </div>

      {/* ── Status Metrics Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setStatusFilter('pending')}
          className={`p-4 rounded-xl border bg-white shadow-2xs cursor-pointer transition-all ${
            statusFilter === 'pending' ? 'ring-2 ring-amber-500 border-transparent' : 'border-[#EDEDED] hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span className="font-medium">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-[#111827] mt-1">{counts.pending}</p>
          <p className="text-[11px] text-amber-600 mt-0.5">Awaiting evidence decision</p>
        </div>

        <div
          onClick={() => setStatusFilter('approved')}
          className={`p-4 rounded-xl border bg-white shadow-2xs cursor-pointer transition-all ${
            statusFilter === 'approved' ? 'ring-2 ring-emerald-500 border-transparent' : 'border-[#EDEDED] hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span className="font-medium">Approved</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-[#111827] mt-1">{counts.approved}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">Ready for shipment tracking</p>
        </div>

        <div
          onClick={() => setStatusFilter('shipped')}
          className={`p-4 rounded-xl border bg-white shadow-2xs cursor-pointer transition-all ${
            statusFilter === 'shipped' ? 'ring-2 ring-indigo-500 border-transparent' : 'border-[#EDEDED] hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span className="font-medium">Shipped</span>
            <Truck className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-extrabold text-[#111827] mt-1">{counts.shipped}</p>
          <p className="text-[11px] text-indigo-600 mt-0.5">Dispatched with tracking</p>
        </div>

        <div
          onClick={() => setStatusFilter('declined')}
          className={`p-4 rounded-xl border bg-white shadow-2xs cursor-pointer transition-all ${
            statusFilter === 'declined' ? 'ring-2 ring-rose-500 border-transparent' : 'border-[#EDEDED] hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span className="font-medium">Declined</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-[#111827] mt-1">{counts.declined}</p>
          <p className="text-[11px] text-rose-600 mt-0.5">Claims closed with reason</p>
        </div>
      </div>

      {/* ── Filter Tabs & Search Bar ─────────────────────────────────────── */}
      <div className="bg-white p-3.5 rounded-xl border border-[#EDEDED] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Claims', count: counts.all },
            { id: 'pending', label: 'Pending Review', count: counts.pending },
            { id: 'approved', label: 'Approved', count: counts.approved },
            { id: 'shipped', label: 'Shipped', count: counts.shipped },
            { id: 'declined', label: 'Declined', count: counts.declined },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#111827] text-white shadow-2xs'
                  : 'bg-[#F5F6F8] text-[#6B7280] hover:text-[#111827] hover:bg-gray-200/60'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-white text-[#6B7280] border border-[#EDEDED]'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Order ID, buyer, reason..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#EDEDED] text-xs bg-[#F5F6F8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#111827]"
          />
        </div>
      </div>

      {/* ── Request Queue Table ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#EDEDED] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#EDEDED] bg-[#F9FAFB] text-[#6B7280]">
                <th className="px-5 py-3.5 font-semibold">Order &amp; Product</th>
                <th className="px-5 py-3.5 font-semibold">Reason Category</th>
                <th className="px-5 py-3.5 font-semibold">Evidence Photos</th>
                <th className="px-5 py-3.5 font-semibold">Submitted</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDEDED]">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6B7280]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-[#9CA3AF]">
                        <RotateCcw className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-sm text-[#111827]">No replacement requests found</p>
                      <p className="text-xs max-w-sm">
                        {searchQuery ? 'Try clearing your search query to see all replacement claims.' : 'Delivered order customers have not submitted any replacement claims.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const order = ordersMap.get(String(req.order_id))
                  const matchedItem = (order?.items || []).find(
                    it => it.order_item_id === req.order_item_id ||
                          it.product_id === req.order_item_id ||
                          it.id === req.order_item_id
                  ) || order?.items?.[0]

                  const reasonCfg = REASON_BADGES[req.reason_category] || REASON_BADGES.other
                  const statusCfg = STATUS_BADGES[req.status] || STATUS_BADGES.pending
                  const images = Array.isArray(req.images) ? req.images : []

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-[#F9FAFB]/75 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetail(req)}
                    >
                      {/* Order & Product */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={cldUrl(matchedItem?.image_url || 'https://via.placeholder.com/80', { width: 80, height: 80, crop: 'fill' })}
                            alt={matchedItem?.name || 'Product'}
                            className="w-11 h-11 rounded-lg object-cover bg-gray-50 border border-[#EDEDED] flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-mono font-bold text-[#111827] text-xs">
                              #{String(req.order_id).slice(0, 8)}
                            </p>
                            <p className="text-xs text-[#111827] font-medium line-clamp-1 max-w-xs mt-0.5">
                              {matchedItem?.name || 'Anime Item'}
                            </p>
                            <p className="text-[11px] text-[#6B7280]">
                              Buyer: <span className="text-[#374151] font-semibold">{order?.buyer_name || 'Customer'}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Reason Category */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${reasonCfg.bg}`}>
                          {reasonCfg.label}
                        </span>
                      </td>

                      {/* Photos Evidence Stack */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {images.length > 0 ? (
                          <div
                            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenLightbox(images, 0)
                            }}
                          >
                            <div className="flex -space-x-2">
                              {images.slice(0, 3).map((img, i) => (
                                <img
                                  key={img.id || i}
                                  src={cldUrl(img.image_url, { width: 48, height: 48, crop: 'fill' })}
                                  alt="Evidence"
                                  className="w-7 h-7 rounded-md object-cover border-2 border-white shadow-2xs"
                                />
                              ))}
                            </div>
                            <span className="text-[11px] font-bold text-blue-600 underline ml-1">
                              {images.length} photo{images.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">No photos</span>
                        )}
                      </td>

                      {/* Submitted Date */}
                      <td className="px-5 py-4 whitespace-nowrap text-[#6B7280] text-[11px]">
                        {new Date(req.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusCfg.bg}`}>
                          {statusCfg.dot && <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />}
                          {statusCfg.icon && <statusCfg.icon className="w-3.5 h-3.5" />}
                          <span>{statusCfg.label}</span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenDetail(req)
                          }}
                          className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-[#111827] hover:text-white text-[#111827] text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Review</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Request Detail Modal / Slideover ─────────────────────────────── */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans animate-fade-in">
          <div className="bg-white rounded-[20px] max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#EDEDED] flex flex-col">

            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-[#EDEDED] flex items-start justify-between gap-4 sticky top-0 bg-white z-20 rounded-t-[20px]">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-[#111827]">
                    Replacement Claim #{selectedRequest.id.slice(0, 8)}
                  </h2>
                  {(() => {
                    const cfg = STATUS_BADGES[selectedRequest.status] || STATUS_BADGES.pending
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg}`}>
                        {cfg.dot && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
                        {cfg.icon && <cfg.icon className="w-3.5 h-3.5" />}
                        <span>{cfg.label}</span>
                      </span>
                    )
                  })()}
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Order #{selectedRequest.order_id} · Submitted on {new Date(selectedRequest.created_at).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1.5 rounded-full text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-6 flex-1 text-xs">

              {/* Order & Buyer Context Box */}
              {(() => {
                const order = ordersMap.get(String(selectedRequest.order_id))
                const matchedItem = (order?.items || []).find(
                  it => it.order_item_id === selectedRequest.order_item_id ||
                        it.product_id === selectedRequest.order_item_id ||
                        it.id === selectedRequest.order_item_id
                ) || order?.items?.[0]

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Buyer card */}
                    <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#EDEDED] space-y-1.5">
                      <p className="font-bold text-[#111827] text-xs flex items-center gap-1.5">
                        <span>Buyer Details</span>
                      </p>
                      <p className="text-[#374151]"><strong>Name:</strong> {order?.buyer_name || 'N/A'}</p>
                      <p className="text-[#374151]"><strong>Phone:</strong> {order?.buyer_phone || order?.buyer_whatsapp || 'N/A'}</p>
                      <p className="text-[#374151] line-clamp-2"><strong>Address:</strong> {order?.buyer_address || 'N/A'}</p>
                      <p className="text-[#6B7280] text-[11px] pt-1">
                        <strong>Delivered:</strong> {order?.delivered_at ? new Date(order.delivered_at).toLocaleDateString() : 'N/A'}
                      </p>

                      {order?.buyer_whatsapp && (
                        <a
                          href={`https://wa.me/${order.buyer_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${order.buyer_name}, regarding your replacement claim for order #${order.id.slice(0, 8)}:`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 pt-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Contact Buyer on WhatsApp</span>
                        </a>
                      )}
                    </div>

                    {/* Item card */}
                    <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#EDEDED] flex items-start gap-3">
                      <img
                        src={cldUrl(matchedItem?.image_url || 'https://via.placeholder.com/120', { width: 120, height: 120, crop: 'fill' })}
                        alt={matchedItem?.name}
                        className="w-16 h-16 rounded-xl object-cover bg-white border border-[#EDEDED] flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          Selected Item
                        </span>
                        <p className="font-bold text-[#111827] line-clamp-2 text-xs">
                          {matchedItem?.name || 'Anime Item'}
                        </p>
                        <p className="text-[11px] text-[#6B7280]">
                          Qty: {matchedItem?.qty || 1} · {formatPrice(matchedItem?.price || matchedItem?.price_at_purchase || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Reason Category & Buyer Description */}
              <div className="p-4 rounded-xl border border-[#EDEDED] bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#111827]">Issue Category:</span>
                  {(() => {
                    const cfg = REASON_BADGES[selectedRequest.reason_category] || REASON_BADGES.other
                    return (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg}`}>
                        {cfg.label}
                      </span>
                    )
                  })()}
                </div>
                <div className="space-y-1 pt-1">
                  <p className="font-bold text-[#6B7280] text-[11px] uppercase tracking-wider">Buyer's Description:</p>
                  <p className="p-3 rounded-lg bg-[#F9FAFB] border border-[#EDEDED] text-[#1F2937] leading-relaxed italic">
                    "{selectedRequest.description}"
                  </p>
                </div>
              </div>

              {/* Photo Evidence Gallery */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[#111827]">
                    Photo Evidence ({(selectedRequest.images || []).length} attached)
                  </p>
                  <span className="text-[11px] text-[#6B7280]">Click photo to open full zoom viewer</span>
                </div>

                {Array.isArray(selectedRequest.images) && selectedRequest.images.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                    {selectedRequest.images.map((img, idx) => (
                      <div
                        key={img.id || idx}
                        onClick={() => handleOpenLightbox(selectedRequest.images, idx)}
                        className="relative group aspect-square rounded-xl overflow-hidden border border-[#EDEDED] bg-gray-50 cursor-pointer shadow-2xs hover:shadow-md transition-all"
                      >
                        <img
                          src={cldUrl(img.image_url, { width: 220, height: 220, crop: 'fill' })}
                          alt={`Evidence ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Maximize2 className="w-5 h-5 drop-shadow" />
                        </div>
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-[#EDEDED] text-center text-[#9CA3AF]">
                    No evidence photos attached.
                  </div>
                )}
              </div>

              {/* Current Status Note / Decision Log */}
              {selectedRequest.owner_note && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 space-y-1">
                  <p className="font-bold text-xs flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span>Store Decision Note:</span>
                  </p>
                  <p className="text-xs leading-relaxed pl-5">
                    "{selectedRequest.owner_note}"
                  </p>
                </div>
              )}

              {/* Shipped Tracking Banner */}
              {selectedRequest.status === 'shipped' && selectedRequest.tracking_number && (
                <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="font-bold text-xs">Replacement Dispatched</p>
                      <p className="font-mono font-bold text-sm text-indigo-700">{selectedRequest.tracking_number}</p>
                    </div>
                  </div>
                  <a
                    href={`https://shiprocket.co/tracking/${selectedRequest.tracking_number}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 underline"
                  >
                    <span>Track Shipment</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* ── Decision Actions Box ──────────────────────────────────── */}
              <div className="p-4 sm:p-5 rounded-xl border border-[#EDEDED] bg-[#FAF9F6]/80 space-y-3">
                <p className="font-bold text-sm text-[#111827]">
                  Decision &amp; Fulfillment Actions
                </p>

                {decisionError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{decisionError}</span>
                  </div>
                )}

                {/* 1. Pending Status Actions */}
                {selectedRequest.status === 'pending' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setActiveAction(activeAction === 'approve' ? null : 'approve')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          activeAction === 'approve'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve Claim</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveAction(activeAction === 'decline' ? null : 'decline')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          activeAction === 'decline'
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Decline Claim</span>
                      </button>
                    </div>

                    {/* Note input field for decision */}
                    {activeAction && (
                      <div className="p-3.5 rounded-xl bg-white border border-[#EDEDED] space-y-2.5 animate-fade-in">
                        <label className="block text-xs font-bold text-[#111827]">
                          {activeAction === 'approve'
                            ? 'Store Note to Buyer (Optional):'
                            : 'Reason for Declining (Required):'}
                        </label>
                        <textarea
                          value={actionNote}
                          onChange={(e) => setActionNote(e.target.value)}
                          placeholder={
                            activeAction === 'approve'
                              ? 'e.g., Claim approved. We are preparing a replacement figure and will dispatch within 2 business days.'
                              : 'e.g., Damage is cosmetic outer packaging only, or item is outside 5-day defect coverage.'
                          }
                          rows={2}
                          className="w-full text-xs p-3 rounded-lg border border-[#EDEDED] bg-[#F9FAFB] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#111827]"
                        />

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setActiveAction(null)}
                            disabled={isSubmittingDecision}
                            className="px-3 py-1.5 rounded-lg border border-[#EDEDED] text-xs font-medium text-[#6B7280] hover:text-[#111827] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDecisionSubmit(activeAction === 'approve' ? 'approved' : 'declined')}
                            disabled={isSubmittingDecision}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer ${
                              activeAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                            }`}
                          >
                            {isSubmittingDecision ? 'Saving...' : activeAction === 'approve' ? 'Confirm Approval' : 'Confirm Decline'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Approved Status Actions: Mark Replacement Shipped */}
                {selectedRequest.status === 'approved' && (
                  <div className="space-y-3">
                    <p className="text-xs text-emerald-800 font-medium">
                      ✓ This claim was approved. When you dispatch the replacement collectible, record the tracking number below.
                    </p>

                    <div className="p-3.5 rounded-xl bg-white border border-[#EDEDED] space-y-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#111827]">
                          Tracking Number / AWB <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={trackingNumberInput}
                          onChange={(e) => setTrackingNumberInput(e.target.value)}
                          placeholder="e.g. AMX98472910IN, SR1283749"
                          className="w-full text-xs p-2.5 rounded-lg border border-[#EDEDED] bg-[#F9FAFB] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#111827] font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#111827]">
                          Additional Note (Optional):
                        </label>
                        <input
                          type="text"
                          value={actionNote}
                          onChange={(e) => setActionNote(e.target.value)}
                          placeholder="e.g. Dispatched via Bluedart Express"
                          className="w-full text-xs p-2.5 rounded-lg border border-[#EDEDED] bg-[#F9FAFB] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#111827]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDecisionSubmit('shipped')}
                        disabled={isSubmittingDecision || !trackingNumberInput.trim()}
                        className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Truck className="w-4 h-4" />
                        <span>{isSubmittingDecision ? 'Updating...' : 'Mark Replacement Shipped'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Completed/Shipped or Declined Status */}
                {(selectedRequest.status === 'shipped' || selectedRequest.status === 'declined') && (
                  <p className="text-xs text-[#6B7280]">
                    This claim is finalized. Status is recorded and visible to the customer on their order page.
                  </p>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-[#EDEDED] flex items-center justify-end gap-2 bg-[#F9FAFB] rounded-b-[20px]">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 rounded-xl border border-[#EDEDED] bg-white text-xs font-semibold text-[#111827] hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Fullscreen Lightbox Photo Viewer ─────────────────────────────── */}
      {isLightboxOpen && lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-fade-in select-none">
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white z-10">
            <span className="text-xs font-semibold tracking-wide text-white/80">
              Evidence Photo {activePhotoIdx + 1} of {lightboxImages.length}
            </span>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="Close viewer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Photo Center */}
          <div className="relative flex items-center justify-center flex-1 my-2">
            {lightboxImages.length > 1 && (
              <button
                onClick={() => setActivePhotoIdx(prev => (prev - 1 + lightboxImages.length) % lightboxImages.length)}
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg"
                title="Previous photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={lightboxImages[activePhotoIdx]?.image_url}
              alt="Evidence full size"
              className="max-w-full max-h-[76vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />

            {lightboxImages.length > 1 && (
              <button
                onClick={() => setActivePhotoIdx(prev => (prev + 1) % lightboxImages.length)}
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg"
                title="Next photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails */}
          {lightboxImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10">
              {lightboxImages.map((img, idx) => (
                <button
                  key={img.id || idx}
                  onClick={() => setActivePhotoIdx(idx)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    idx === activePhotoIdx ? 'border-white scale-110 shadow-lg' : 'border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Toast Notification ───────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111827] text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-slide-up">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  )
}
