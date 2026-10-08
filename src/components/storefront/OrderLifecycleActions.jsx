import React, { useState, useEffect } from 'react'
import {
  Clock,
  XCircle,
  ArrowsClockwise,
  UploadSimple,
  FileText,
  Truck,
  CheckCircle,
  WarningCircle,
  ArrowSquareOut,
  Image as ImageIcon
} from '@phosphor-icons/react'
import { useApp } from '../../context/AppContext'
import { uploadImage, PRESETS } from '../../lib/cloudinary'

export default function OrderLifecycleActions({ order }) {
  const { cancelOrder, createReplacementRequest, generateInvoice, replacementRequests, mockUser } = useApp()

  // Live timer tick for accurate countdowns
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Modals state
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)

  // ── 1. Part 1: Cancellation Window Calculation ──────────────────────────
  const createdTime = order.created_at ? new Date(order.created_at).getTime() : now
  const msSincePlaced = Math.max(0, now - createdTime)
  const cancelWindowMs = 24 * 60 * 60 * 1000 // 24 hours
  const cancelMsRemaining = cancelWindowMs - msSincePlaced
  const isWithin24Hours = cancelMsRemaining > 0
  const isCancellableStatus = ['pending', 'qr_sent', 'payment_confirmed'].includes(order.status)
  const canCancel = isWithin24Hours && isCancellableStatus

  // Format countdown string
  const formatCountdown = (ms) => {
    if (ms <= 0) return '0h 0m'
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours}h ${minutes}m ${seconds}s`
  }

  // ── 2. Part 2: Replacement Window Calculation (Within 5 Days of Delivery)
  const deliveredTime = order.delivered_at ? new Date(order.delivered_at).getTime() : null
  const replacementWindowMs = 5 * 24 * 60 * 60 * 1000 // 5 days
  const msSinceDelivered = deliveredTime ? Math.max(0, now - deliveredTime) : null
  const replacementMsRemaining = msSinceDelivered !== null ? replacementWindowMs - msSinceDelivered : 0
  const isWithin5DaysDelivery = replacementMsRemaining > 0
  const isDelivered = order.status === 'delivered'
  const isReplacementRequested = order.status === 'replacement_requested'
  const isReplacementResolved = order.status === 'replacement_resolved'
  const canRequestReplacement = isDelivered && isWithin5DaysDelivery

  const formatDaysCountdown = (ms) => {
    if (ms <= 0) return '0 days remaining'
    const totalHours = Math.floor(ms / (3600 * 1000))
    const days = Math.floor(totalHours / 24)
    const hours = totalHours % 24
    return `${days}d ${hours}h left`
  }

  // Find existing replacement request for this order
  const existingReplacement = (replacementRequests || []).find(
    (r) => String(r.order_id) === String(order.id)
  )

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleConfirmCancel = async () => {
    setIsCancelling(true)
    setCancelError('')
    try {
      await cancelOrder(order.id, mockUser?.id)
      setShowCancelModal(false)
    } catch (err) {
      setCancelError(err?.message || 'Failed to cancel order.')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleDownloadInvoice = async () => {
    if (order.invoice_url) {
      const win = window.open()
      if (win) {
        win.document.write(`<iframe src="${order.invoice_url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`)
      } else {
        window.location.href = order.invoice_url
      }
      return
    }

    setIsGeneratingInvoice(true)
    try {
      const url = await generateInvoice(order.id)
      if (url) {
        const win = window.open()
        if (win) {
          win.document.write(`<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`)
        } else {
          window.location.href = url
        }
      }
    } catch (err) {
      console.warn('Invoice generation error:', err)
    } finally {
      setIsGeneratingInvoice(false)
    }
  }

  return (
    <div className="pt-3 border-t border-[#E5E5E5] space-y-3 font-sans">

      {/* ── Tracking Notice Banner (Part 5) ─────────────────────────── */}
      {order.tracking_number && (
        <div className="p-3 rounded-[12px] bg-blue-50/70 border border-blue-200 text-xs text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-blue-600 flex-shrink-0" weight="bold" />
            <div>
              <span className="font-semibold">Courier Tracking: </span>
              <span className="font-mono font-bold">{order.tracking_number}</span>
            </div>
          </div>
          <a
            href={order.tracking_url || `https://shiprocket.co/tracking/${order.tracking_number}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 underline text-xs"
          >
            <span>Live Shiprocket Tracking</span>
            <ArrowSquareOut size={13} />
          </a>
        </div>
      )}

      {/* ── Action Rows ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">

        {/* Left Side: Status Timers & Windows */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Part 1: Cancellation Timer */}
          {order.status !== 'cancelled' && (
            canCancel ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                <Clock size={14} className="text-amber-600 animate-pulse" />
                <span>Cancel available for {formatCountdown(cancelMsRemaining)}</span>
              </span>
            ) : isCancellableStatus ? (
              <span className="inline-flex items-center gap-1 text-[#6B6B6B]">
                <Clock size={13} />
                <span>Cancellation window closed</span>
              </span>
            ) : order.status === 'shipped' || order.status === 'delivered' ? (
              <span className="inline-flex items-center gap-1 text-[#6B6B6B]">
                <CheckCircle size={13} className="text-emerald-600" />
                <span>Order dispatched (replacement policy applies)</span>
              </span>
            ) : null
          )}

          {/* Order Level Replacement Status Notice */}
          {existingReplacement && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-medium">
              <ArrowsClockwise size={13} className="text-blue-600" />
              <span>Replacement Request Active for Item</span>
            </span>
          )}
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">

          {/* Invoice Button (Part 5) */}
          {['payment_confirmed', 'shipped', 'delivered', 'replacement_requested', 'replacement_resolved'].includes(order.status) && (
            <button
              onClick={handleDownloadInvoice}
              disabled={isGeneratingInvoice}
              className="sf-btn-secondary text-xs h-8 px-3 gap-1.5 font-medium cursor-pointer"
              style={{ height: '32px', minHeight: 'unset', fontSize: '12px' }}
              title="Download official Tax Invoice"
            >
              <FileText size={14} />
              <span>{isGeneratingInvoice ? 'Preparing...' : 'Tax Invoice'}</span>
            </button>
          )}

          {/* Part 1: Cancel Button */}
          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
            >
              <XCircle size={14} weight="bold" />
              <span>Cancel Order</span>
            </button>
          )}

        </div>
      </div>

      {/* ── Cancel Confirmation Modal (Part 1) ────────────────────── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-[16px] max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E5E5E5]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 flex-shrink-0">
                <WarningCircle size={22} weight="bold" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#111111]">Cancel Order #{order.id}?</h3>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  You are within the 24-hour window. Cancelling will stop payment processing and automatically restore stock for all items in this order.
                </p>
              </div>
            </div>

            {cancelError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {cancelError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="sf-btn-secondary text-xs h-9 px-4"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-[10px] text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel & Restore Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
