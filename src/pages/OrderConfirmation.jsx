import React from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  CheckCircle,
  ChatCircle,
  ArrowRight,
  Package,
  ShieldCheck,
  House
} from '@phosphor-icons/react'
import { useApp } from '../context/AppContext'
import { formatPrice } from '../utils/formatPrice'
import { OrderStatusBadge } from '../components/common/Badge'
import { OWNER_WHATSAPP, OWNER_UPI_ID } from '../lib/clerkClient'
import { cldUrl } from '../lib/cloudinary'
import OrderLifecycleActions from '../components/storefront/OrderLifecycleActions'
import ItemReplacementBadge from '../components/storefront/ItemReplacementBadge'

export default function OrderConfirmation() {
  const { orderId } = useParams()
  const { orders, mockUser } = useApp()

  let order = orders.find((o) => o.id === orderId)
  if (!order) {
    try {
      const saved = JSON.parse(localStorage.getItem('animemax_orders_v1') || '[]')
      order = saved.find((o) => o.id === orderId)
    } catch {}
  }

  if (!order) {
    return (
      <div className="sf-empty-state max-w-md mx-auto my-20">
        <House size={32} className="text-[#6B6B6B] mb-4" />
        <h1 className="text-2xl font-bold text-[#111111] mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
          Order Confirmed!
        </h1>
        <p className="text-sm text-[#6B6B6B] mb-6">Order #{orderId} has been successfully recorded.</p>
        <Link to="/" className="sf-btn-primary inline-flex items-center gap-2">
          <House size={16} /> Return to Home
        </Link>
      </div>
    )
  }

  const cleanOwnerPhone = OWNER_WHATSAPP.replace(/\D/g, '')
  const whatsappMsg = encodeURIComponent(
    `Hi AnimeMax! I just placed Order #${order.id} for ₹${order.total_amount}. My WhatsApp number is ${order.buyer_whatsapp}. Please send my UPI QR code to complete payment!`
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 pb-16" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── Success Header ───────────────────────────────────────────── */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-[12px] bg-[#F8F8F6] border border-[#E5E5E5] flex items-center justify-center text-[#111111] mx-auto">
          <CheckCircle size={32} weight="fill" className="text-[#111111]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#111111]" style={{ fontFamily: 'Syne, sans-serif' }}>
          Your Order Has Been Placed!
        </h1>
        <p className="text-sm text-[#6B6B6B] max-w-lg mx-auto">
          Order <strong className="font-mono text-[#111111]">#{order.id}</strong> is registered. You'll receive your payment UPI QR code on WhatsApp shortly.
        </p>
      </div>

      {/* ── 4-Step Payment Flow ──────────────────────────────────────── */}
      <div className="p-6 rounded-[12px] bg-[#F8F8F6] border border-[#E5E5E5] space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
          Next Steps: How Your Payment Works
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">

          <div className="p-4 rounded-[12px] bg-white border border-[#E5E5E5] flex gap-3">
            <span className="w-6 h-6 rounded-[12px] bg-[#F8F8F6] border border-[#E5E5E5] text-[#111111] flex items-center justify-center font-bold flex-shrink-0 text-xs">
              1
            </span>
            <div>
              <h4 className="font-semibold text-[#111111] text-sm">Order Alert Sent</h4>
              <p className="text-[#6B6B6B] mt-0.5 leading-relaxed text-xs">The shopkeeper has been notified of your order details.</p>
            </div>
          </div>

          <div className="p-4 rounded-[12px] bg-white border border-[#E5E5E5] flex gap-3">
            <span className="w-6 h-6 rounded-[12px] bg-[#F8F8F6] border border-[#E5E5E5] text-[#111111] flex items-center justify-center font-bold flex-shrink-0 text-xs">
              2
            </span>
            <div>
              <h4 className="font-semibold text-[#111111] text-sm">UPI QR on WhatsApp</h4>
              <p className="text-[#6B6B6B] mt-0.5 leading-relaxed text-xs">Expect a QR message at <strong className="text-[#111111]">{order.buyer_whatsapp}</strong> within 5–15 mins.</p>
            </div>
          </div>

          <div className="p-4 rounded-[12px] bg-white border border-[#E5E5E5] flex gap-3">
            <span className="w-6 h-6 rounded-[12px] bg-[#F8F8F6] border border-[#E5E5E5] text-[#111111] flex items-center justify-center font-bold flex-shrink-0 text-xs">
              3
            </span>
            <div>
              <h4 className="font-semibold text-[#111111] text-sm">Scan &amp; Pay via UPI</h4>
              <p className="text-[#6B6B6B] mt-0.5 leading-relaxed text-xs">Scan with GPay, PhonePe, or Paytm and reply with screenshot/UTR.</p>
            </div>
          </div>

          <div className="p-4 rounded-[12px] bg-white border border-[#E5E5E5] flex gap-3">
            <span className="w-6 h-6 rounded-[12px] bg-[#F8F8F6] border border-[#E5E5E5] text-[#111111] flex items-center justify-center font-bold flex-shrink-0 text-xs">
              4
            </span>
            <div>
              <h4 className="font-semibold text-[#111111] text-sm">Dispatched with Tracking</h4>
              <p className="text-[#6B6B6B] mt-0.5 leading-relaxed text-xs">Parcel will be safely bubble-wrapped and dispatched to your address.</p>
            </div>
          </div>

        </div>

        {/* WhatsApp fast-track CTA */}
        <div className="pt-2">
          <a
            href={`https://wa.me/${cleanOwnerPhone}?text=${whatsappMsg}`}
            target="_blank"
            rel="noreferrer"
            className="sf-btn-primary w-full justify-center gap-2"
          >
            <ChatCircle size={20} />
            <span>Fast-Track: Message Owner on WhatsApp Now</span>
          </a>
        </div>
      </div>

      {/* ── Order Summary Receipt ────────────────────────────────────── */}
      <div className="p-6 rounded-[12px] bg-white border border-[#E5E5E5] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
          <div>
            <h3 className="text-sm font-bold text-[#111111]" style={{ fontFamily: 'Syne, sans-serif' }}>Order Details</h3>
            <p className="text-xs text-[#6B6B6B]">{new Date(order.created_at).toLocaleString()}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        {/* Shipping address */}
        <div className="p-3.5 rounded-[12px] bg-[#F8F8F6] border border-[#E5E5E5] text-sm text-[#111111] space-y-1">
          <p><span className="text-[#6B6B6B] font-semibold">Recipient:</span> {order.buyer_name}</p>
          <p><span className="text-[#6B6B6B] font-semibold">WhatsApp:</span> {order.buyer_whatsapp}</p>
          <p><span className="text-[#6B6B6B] font-semibold">Shipping Address:</span> {order.buyer_address}</p>
        </div>

        {/* Items */}
        <div className="space-y-3 text-sm">
          {order.items.map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-[12px] bg-[#FAF9F5]/40 border border-[#EDEDED] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={cldUrl(item.image_url, { width: 160, height: 160, crop: 'fill' })}
                    alt={item.name}
                    loading="lazy"
                    className="w-11 h-11 object-cover rounded-[12px] bg-[#F8F8F6] border border-[#E5E5E5]"
                  />
                  <div>
                    <p className="font-semibold text-[#111111]">{item.name}</p>
                    <p className="text-xs text-[#6B6B6B]">Qty: {item.qty} × {formatPrice(item.price)}</p>
                  </div>
                </div>
                <span className="font-bold text-[#111111]">{formatPrice(item.price * item.qty)}</span>
              </div>

              {/* Per-Item Replacement Request & Status */}
              <ItemReplacementBadge order={order} item={item} />
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-[#E5E5E5] font-bold text-[#111111]">
          <span>Total Amount Payable</span>
          <span className="text-lg text-[#DC2626]">{formatPrice(order.total_amount)}</span>
        </div>

        {/* Order Lifecycle Actions: 24h Cancel, 5-Day Replacement, Tracking, Invoice */}
        <OrderLifecycleActions order={order} />
      </div>

      {/* ── Bottom Actions ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link to="/" className="sf-btn-secondary w-full sm:w-auto px-6">
          Continue Shopping
        </Link>
        {mockUser.role !== 'guest' && (
          <Link to="/orders" className="sf-btn-primary w-full sm:w-auto px-6 gap-2">
            <Package size={16} />
            <span>View in Order History</span>
          </Link>
        )}
      </div>

    </div>
  )
}
