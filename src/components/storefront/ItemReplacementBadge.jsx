import React, { useState, useEffect } from 'react'
import {
  ArrowsClockwise,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Eye,
  X,
  ArrowSquareOut,
  Info
} from '@phosphor-icons/react'
import { useApp } from '../../context/AppContext'
import ItemReplacementModal from './ItemReplacementModal'
import { cldUrl } from '../../lib/cloudinary'

export default function ItemReplacementBadge({ order, item }) {
  const { replacementRequests = [] } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [now, setNow] = useState(Date.now())

  // Keep live timer active for countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(timer)
  }, [])

  // ── Find Existing Replacement for this item ───────────────────────────────
  const itemId = item.order_item_id || item.product_id || item.id
  const existingRequest = replacementRequests.find((r) => {
    if (String(r.order_id) !== String(order.id)) return false
    return String(r.order_item_id) === String(item.order_item_id) ||
           String(r.order_item_id) === String(itemId) ||
           String(r.order_item_id) === String(item.product_id)
  })

  // ── 5-day eligibility calculation ────────────────────────────────────────
  const isDelivered = order.status === 'delivered'
  const deliveredTime = order.delivered_at ? new Date(order.delivered_at).getTime() : null
  const windowMs = 5 * 24 * 60 * 60 * 1000 // 5 days in ms
  const msRemaining = deliveredTime ? Math.max(0, windowMs - (now - deliveredTime)) : 0
  const isEligibleWindow = deliveredTime !== null && msRemaining > 0

  const formatCountdown = (ms) => {
    if (ms <= 0) return '0 days left'
    const days = Math.floor(ms / (24 * 3600 * 1000))
    const hours = Math.floor((ms % (24 * 3600 * 1000)) / (3600 * 1000))
    if (days >= 1) {
      return `${days} day${days > 1 ? 's' : ''} left`
    }
    return `${hours} hour${hours > 1 ? 's' : ''} left`
  }

  // ── 1. If Request Already Exists for this Item ────────────────────────────
  if (existingRequest) {
    const status = existingRequest.status // 'pending' | 'approved' | 'declined' | 'shipped'

    return (
      <div className="mt-2 pt-2 border-t border-[#F0F0EE] space-y-1.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {status === 'pending' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Replacement: Pending Review</span>
              </span>
            )}

            {status === 'approved' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
                <CheckCircle size={13} weight="bold" className="text-emerald-600" />
                <span>Replacement: Approved</span>
              </span>
            )}

            {status === 'declined' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-semibold text-[11px]">
                <XCircle size={13} weight="bold" className="text-rose-600" />
                <span>Replacement: Declined</span>
              </span>
            )}

            {status === 'shipped' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold text-[11px]">
                <Truck size={13} weight="bold" className="text-indigo-600" />
                <span>Replacement Shipped</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowDetailModal(true)}
              className="text-[#6B6B6B] hover:text-[#111111] underline text-[11px] font-medium transition-colors cursor-pointer"
            >
              View Claim
            </button>
          </div>

          {/* Tracking info if shipped */}
          {status === 'shipped' && existingRequest.tracking_number && (
            <div className="flex items-center gap-1.5 text-[11px] text-blue-900 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              <Truck size={12} className="text-blue-600" />
              <span>Tracking: {existingRequest.tracking_number}</span>
            </div>
          )}
        </div>

        {/* Owner Note (shown alongside decision) */}
        {existingRequest.owner_note && (
          <div className="p-2.5 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] text-[11px] text-[#111111] flex items-start gap-1.5">
            <Info size={14} className="text-blue-600 mt-0.5 flex-shrink-0" weight="fill" />
            <div>
              <span className="font-semibold text-[#111111]">Store Note: </span>
              <span className="text-[#4B5563]">{existingRequest.owner_note}</span>
            </div>
          </div>
        )}

        {/* ── Read-only Claim Details Modal ── */}
        {showDetailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
            <div className="bg-white rounded-[20px] max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#E5E5E5]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
                <div className="flex items-center gap-2">
                  <ArrowsClockwise size={18} className="text-blue-600" weight="bold" />
                  <h3 className="text-sm font-bold text-[#111111]">Replacement Claim Details</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="p-1 rounded-full text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-1">
                  <p><span className="text-[#6B6B6B]">Item:</span> <strong>{item.name}</strong></p>
                  <p><span className="text-[#6B6B6B]">Reason:</span> <strong className="capitalize">{existingRequest.reason_category?.replace('_', ' ')}</strong></p>
                  <p><span className="text-[#6B6B6B]">Status:</span> <strong className="capitalize">{existingRequest.status}</strong></p>
                  <p><span className="text-[#6B6B6B]">Submitted:</span> {new Date(existingRequest.created_at).toLocaleDateString()}</p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-[#111111]">Your Description:</p>
                  <p className="p-2.5 rounded-lg bg-[#FAFAFA] border border-[#EDEDED] text-[#4B5563] italic">
                    "{existingRequest.description}"
                  </p>
                </div>

                {/* Evidence photos */}
                {Array.isArray(existingRequest.images) && existingRequest.images.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="font-bold text-[#111111]">Submitted Evidence ({existingRequest.images.length} photos):</p>
                    <div className="grid grid-cols-4 gap-2">
                      {existingRequest.images.map((img, i) => (
                        <a
                          key={img.id || i}
                          href={img.image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="aspect-square rounded-lg overflow-hidden border border-[#E5E5E5] block hover:opacity-90"
                        >
                          <img
                            src={cldUrl(img.image_url, { width: 140, height: 140, crop: 'fill' })}
                            alt={`Evidence ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="sf-btn-secondary text-xs h-8 px-4 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── 2. If Order is Delivered & Within 5 Days Window ────────────────────────
  if (isDelivered && isEligibleWindow) {
    return (
      <div className="mt-2 pt-2 border-t border-[#F0F0EE] flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Countdown Badge */}
        <span className="inline-flex items-center gap-1.5 text-[#4B5563] font-medium text-[11px]">
          <Clock size={13} className="text-blue-600" weight="bold" />
          <span>{formatCountdown(msRemaining)} to request a replacement for this item</span>
        </span>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[10px] text-xs font-semibold text-white bg-[#111111] hover:bg-black transition-colors cursor-pointer"
        >
          <ArrowsClockwise size={13} weight="bold" />
          <span>Request Replacement</span>
        </button>

        {showModal && (
          <ItemReplacementModal
            order={order}
            item={item}
            onClose={() => setShowModal(false)}
            onSuccess={() => setShowModal(false)}
          />
        )}
      </div>
    )
  }

  // ── 3. If Order is Delivered but Window Closed ─────────────────────────────
  if (isDelivered && !isEligibleWindow) {
    return (
      <div className="mt-1.5 text-[11px] text-[#9CA3AF] flex items-center gap-1">
        <Clock size={12} />
        <span>Replacement window closed for this item (5 days post-delivery)</span>
      </div>
    )
  }

  return null
}
