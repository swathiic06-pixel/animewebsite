import React from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  ChatCircle,
  ArrowRight,
  ShoppingBag
} from '@phosphor-icons/react'
import { useApp } from '../../context/AppContext'
import { formatPrice } from '../../utils/formatPrice'
import { OrderStatusBadge } from '../../components/common/Badge'
import { OWNER_WHATSAPP } from '../../lib/clerkClient'
import { cldUrl } from '../../lib/cloudinary'
import ItemReplacementBadge from '../../components/storefront/ItemReplacementBadge'
import OrderLifecycleActions from '../../components/storefront/OrderLifecycleActions'

export default function OrderHistory() {
  const { orders, mockUser } = useApp()

  // Filter orders belonging to the logged-in buyer
  const myOrders = orders.filter((o) => mockUser?.id && o.user_id === mockUser?.id)

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16" style={{ fontFamily: 'Inter, sans-serif' }}>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E5]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
            My Anime Orders
          </h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">
            Track fulfillment status, QR delivery, and dispatch updates.
          </p>
        </div>

        <Link
          to="/"
          className="sf-btn-secondary text-sm h-9 px-4 gap-2"
          style={{ height: '36px', minHeight: 'unset', fontSize: '13px' }}
        >
          <ShoppingBag size={16} /> Shop More
        </Link>
      </div>

      {myOrders.length === 0 ? (
        <div className="sf-empty-state">
          <Package size={32} className="text-[#6B6B6B] mb-4" />
          <h3 className="text-xl font-bold text-[#111111] mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
            No Orders Found
          </h3>
          <p className="text-sm text-[#6B6B6B] max-w-[45ch] mb-6">
            You haven't placed any orders yet. Check out our latest figures and hoodies!
          </p>
          <Link to="/" className="sf-btn-primary inline-flex items-center gap-2">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {myOrders.map((order) => (
            <div
              key={order.id}
              className="p-5 sm:p-6 rounded-[12px] bg-white border border-[#E5E5E5] space-y-4"
            >
              {/* Order Meta Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5E5E5]">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-[#111111] text-sm">#{order.id}</span>
                  <span className="text-xs text-[#E5E5E5]">·</span>
                  <span className="text-xs text-[#6B6B6B]">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              {/* Items in order */}
              <div className="space-y-3">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-[12px] bg-[#FAF9F5]/40 border border-[#EDEDED] space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3">
                        <img
                          src={cldUrl(item.image_url, { width: 160, height: 160, crop: 'fill' })}
                          alt={item.name}
                          loading="lazy"
                          className="w-12 h-12 rounded-[12px] object-cover bg-[#F8F8F6] border border-[#E5E5E5] flex-shrink-0"
                        />
                        <div>
                          <p className="font-medium text-[#111111]">{item.name}</p>
                          <p className="text-xs text-[#6B6B6B]">Qty: {item.qty} × {formatPrice(item.price)}</p>
                        </div>
                      </div>
                      <span className="font-bold text-[#111111]">
                        {formatPrice(item.price * item.qty)}
                      </span>
                    </div>

                    {/* Per-Item Replacement Request & Status */}
                    <ItemReplacementBadge order={order} item={item} />
                  </div>
                ))}
              </div>

              {/* Order Lifecycle Actions: 24h Cancel, Courier Tracking, Invoice */}
              <OrderLifecycleActions order={order} />

              {/* Footer: Total + Actions */}
              <div className="pt-3 border-t border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[#6B6B6B]">Total Paid / Due:</span>
                  <span className="font-bold text-[#DC2626]">{formatPrice(order.total_amount)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${OWNER_WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi AnimeMax, I have an update/inquiry regarding Order #${order.id}.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="sf-btn-secondary text-xs h-8 px-3 gap-1.5"
                    style={{ height: '32px', minHeight: 'unset', fontSize: '12px' }}
                  >
                    <ChatCircle size={14} />
                    <span>Inquire on WhatsApp</span>
                  </a>

                  <Link
                    to={`/order-confirmation/${order.id}`}
                    className="sf-btn-ghost text-xs gap-1"
                    style={{ fontSize: '12px' }}
                  >
                    <span>View Receipt</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  )
}
