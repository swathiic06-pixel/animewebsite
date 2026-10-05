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
  UserX
} from 'lucide-react'
import { cldUrl } from '../../lib/cloudinary'

export default function ManageRequests() {
  const { requests = [], updateRequestStatus, deleteRequest, refreshRequests } = useApp()
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState(null)
  const [deleteCandidate, setDeleteCandidate] = useState(null)

  useEffect(() => {
    if (refreshRequests) {
      refreshRequests()
    }
  }, [])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    if (refreshRequests) {
      await refreshRequests()
    }
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // Filter requests by status tab and search query
  const filteredRequests = useMemo(() => {
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

  // Count requests by status
  const counts = useMemo(() => ({
    all: (requests || []).length,
    new: (requests || []).filter((r) => r.status === 'new').length,
    reviewing: (requests || []).filter((r) => r.status === 'reviewing').length,
    fulfilled: (requests || []).filter((r) => r.status === 'fulfilled').length,
    declined: (requests || []).filter((r) => r.status === 'declined').length,
  }), [requests])

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
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            New
          </span>
        )
      case 'reviewing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Clock className="w-3 h-3 text-purple-600" />
            Reviewing
          </span>
        )
      case 'fulfilled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Fulfilled
          </span>
        )
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <X className="w-3 h-3 text-gray-600" />
            Declined
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-gray-50 text-gray-600 border border-gray-200 capitalize">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans antialiased text-[#111827]">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight flex items-center gap-2.5">
            <Inbox className="w-7 h-7 text-[#3B82F6]" />
            <span>Product &amp; Collectible Requests</span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Review collectible requests submitted by buyers, check reference photos, and update fulfillment stages.
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

          {counts.new > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-3.5 py-1.5 rounded-xl border border-blue-200 shadow-2xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
              <span>{counts.new} New Request{counts.new > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Filter Tabs & Search Bar ───────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-[#EDEDED] shadow-2xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none">
          {[
            { id: 'all', label: 'All Requests', count: counts.all },
            { id: 'new', label: 'New', count: counts.new },
            { id: 'reviewing', label: 'Reviewing', count: counts.reviewing },
            { id: 'fulfilled', label: 'Fulfilled', count: counts.fulfilled },
            { id: 'declined', label: 'Declined', count: counts.declined },
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
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search by item name or ID..."
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

      {/* ── Requests Table ─────────────────────────────────────────────────── */}
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
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-xs text-[#6B7280]">
                  <Inbox className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2 opacity-50" />
                  <p className="font-bold text-sm text-[#111827] mb-1">No requests found</p>
                  <p>
                    {searchQuery || statusFilter !== 'all'
                      ? 'No requests match your current filters. Try changing or clearing your search.'
                      : 'No buyer requests have been submitted yet. When visitors use the "Request Item" button, they will appear here.'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50/70 transition-colors">
                  {/* Reference Image Column */}
                  <td className="px-5 py-3.5">
                    {req.reference_image_url ? (
                      <div className="relative group/thumb w-14 h-14 rounded-lg overflow-hidden border border-[#EDEDED] bg-gray-50 cursor-pointer shadow-2xs">
                        <img
                          src={cldUrl(req.reference_image_url, { width: 120, height: 120, crop: 'fill' })}
                          alt={req.product_name || 'Request reference'}
                          className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                          onClick={() => setPreviewImageUrl(req.reference_image_url)}
                        />
                        <button
                          type="button"
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

                  {/* Product Name / Character */}
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

                  {/* Buyer / User */}
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

                  {/* Date Submitted */}
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs text-[#6B7280]">
                    {formatDate(req.created_at)}
                  </td>

                  {/* Status Badge */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {getStatusBadge(req.status)}
                  </td>

                  {/* Status Updater Dropdown */}
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

                  {/* Actions */}
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

      {/* ── Reference Photo Full-size Lightbox ─────────────────────────────── */}
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
                <span>Close</span>
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewImageUrl}
              alt="Reference detail"
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl bg-black/40 border border-white/10"
            />
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ───────────────────────────────────────────── */}
      {deleteCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDeleteCandidate(null)}
        >
          <div
            className="bg-white rounded-2xl border border-[#EDEDED] p-6 max-w-sm w-full space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111827]">Delete Request</h3>
                <p className="text-xs text-[#6B7280]">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-[#4B5563] leading-relaxed">
              Are you sure you want to remove the request for{' '}
              <strong className="text-[#111827]">
                "{deleteCandidate.product_name || 'Item (Photo only)'}"
              </strong>?
            </p>

            <div className="flex gap-2.5 pt-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4B5563] bg-white border border-[#EDEDED] hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteRequest(deleteCandidate.id)
                  setDeleteCandidate(null)
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-2xs cursor-pointer"
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
