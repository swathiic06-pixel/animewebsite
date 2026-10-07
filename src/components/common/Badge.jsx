import React from 'react'

/**
 * StockBadge — used on storefront ProductCard & ProductDetail.
 * Kinetic Editorial styling: 12px radius, #E5E5E5 border, no pill shapes.
 * Also used by admin pages (OrderStatusBadge is admin-safe since it was already
 * admin-styled with coloured backgrounds).
 */
export function StockBadge({ inStock, stock }) {
  const isOutOfStock = inStock === false || (stock !== undefined && stock !== null && stock !== '' && Number(stock) <= 0)
  if (isOutOfStock) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-[12px] text-xs font-semibold bg-white border border-[#E5E5E5] text-[#111111] font-['Inter']">
        Sold Out
      </span>
    )
  }

  if (stock && stock <= 5) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-[12px] text-xs font-semibold bg-white border border-[#E5E5E5] text-[#6B6B6B] font-['Inter']">
        Only {stock} Left
      </span>
    )
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-[12px] text-xs font-semibold bg-white border border-[#E5E5E5] text-[#111111] font-['Inter']">
      In Stock
    </span>
  )
}

/**
 * OrderStatusBadge — used in Admin panel and Order Confirmation.
 * Kept with coloured backgrounds (admin uses this too).
 */
export function OrderStatusBadge({ status }) {
  const statusConfig = {
    pending: {
      label: 'Pending QR Code',
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-500'
    },
    qr_sent: {
      label: 'QR Sent on WhatsApp',
      bg: 'bg-sky-50 text-sky-800 border-sky-200',
      dot: 'bg-sky-500'
    },
    payment_confirmed: {
      label: 'Payment Verified',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-500'
    },
    shipped: {
      label: 'Order Shipped',
      bg: 'bg-purple-50 text-purple-800 border-purple-200',
      dot: 'bg-purple-500'
    },
    delivered: {
      label: 'Delivered',
      bg: 'bg-teal-50 text-teal-800 border-teal-200',
      dot: 'bg-teal-500'
    },
    replacement_requested: {
      label: 'Replacement Requested',
      bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      dot: 'bg-indigo-500'
    },
    replacement_resolved: {
      label: 'Replacement Resolved',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-500'
    },
    cancelled: {
      label: 'Cancelled',
      bg: 'bg-rose-50 text-rose-800 border-rose-200',
      dot: 'bg-rose-500'
    }
  }

  const current = statusConfig[status] || statusConfig.pending

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${current.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${current.dot}`}></span>
      {current.label}
    </span>
  )
}

/**
 * TrackingBadge — displays courier tracking number with link
 */
export function TrackingBadge({ trackingNumber, trackingUrl }) {
  if (!trackingNumber) return null

  return (
    <a
      href={trackingUrl || `https://shiprocket.co/tracking/${trackingNumber}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
      title="Track Shipment on Shiprocket"
    >
      <span>🚚 {trackingNumber}</span>
      <span className="text-[10px] text-blue-500 underline font-sans">Track</span>
    </a>
  )
}

/**
 * CategoryBadge — used on storefront ProductCard & ProductDetail.
 * Kinetic Editorial: 12px radius, neutral palette per DESIGN.md.
 */
export function CategoryBadge({ category }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] text-[10px] font-semibold tracking-wider uppercase border border-[#E5E5E5] bg-white text-[#6B6B6B] font-['Inter']">
      {category}
    </span>
  )
}
