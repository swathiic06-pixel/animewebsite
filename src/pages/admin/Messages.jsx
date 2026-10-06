import React, { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  Send, 
  CheckCircle, 
  Clock, 
  Copy, 
  ExternalLink,
  Sparkles,
  QrCode,
  Truck
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { OWNER_UPI_ID, OWNER_WHATSAPP } from '../../lib/clerkClient'
import { formatPrice } from '../../utils/formatPrice'

export default function Messages() {
  const { orders, refreshOrders } = useApp()
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    if (refreshOrders) {
      refreshOrders()
    }
  }, [])

  const pendingOrders = orders.filter((o) => o.status === 'pending')

  const copyToClipboard = (text, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const templates = [
    {
      id: 'qr',
      title: '1. Send UPI QR Code',
      icon: QrCode,
      color: 'bg-[#D6FF4A]/30 text-black',
      text: (order) => 
        `👋 Hi ${order?.buyer_name || '[Buyer]'}!\n\n` +
        `Thank you for ordering at AnimeMax! 🎌\n` +
        `📦 Order ID: #${order?.id || '1234'}\n` +
        `💰 Total: ${formatPrice(order?.total_amount || 2499)}\n\n` +
        `📲 UPI ID: ${OWNER_UPI_ID}\n\n` +
        `Please pay using Google Pay, PhonePe, or Paytm and reply with a screenshot or UTR number to confirm your order. Thank you!`
    },
    {
      id: 'payment_confirmed',
      title: '2. Payment Verified',
      icon: CheckCircle,
      color: 'bg-[#B8A4FF]/30 text-black',
      text: (order) =>
        `✅ Payment Verified!\n\n` +
        `Hi ${order?.buyer_name || '[Buyer]'}, we have successfully received your payment for Order #${order?.id || '1234'}.\n\n` +
        `Our team is packaging your anime collectibles securely. You will receive a dispatch tracking update shortly! 🚚`
    },
    {
      id: 'dispatch',
      title: '3. Dispatched with Tracking',
      icon: Truck,
      color: 'bg-[#D6FF4A]/30 text-black',
      text: (order) =>
        `🚀 Your Order is on the Way!\n\n` +
        `Hi ${order?.buyer_name || '[Buyer]'}, Order #${order?.id || '1234'} has been dispatched via Express Delivery to:\n` +
        `📍 ${order?.buyer_address || '[Delivery Address]'}\n\n` +
        `Estimated arrival: 2-4 business days. Thank you for supporting AnimeMax!`
    }
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight font-display">
          Messages & Support
        </h1>
        <p className="text-xs text-[#8A8A8A] mt-1">
          WhatsApp communication center for sending UPI QR payment requests and tracking updates.
        </p>
      </div>

      {/* Orders awaiting QR notification */}
      {pendingOrders.length > 0 && (
        <div className="p-5 rounded-2xl bg-[#D6FF4A]/20 border border-[#D6FF4A]/50 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#D6FF4A] flex items-center justify-center text-black shrink-0 font-bold">
              {pendingOrders.length}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111111]">
                {pendingOrders.length} {pendingOrders.length === 1 ? 'order' : 'orders'} waiting for a WhatsApp QR message!
              </h3>
              <p className="text-xs text-slate-700 mt-0.5">
                Quickly dispatch UPI payment links to complete their checkout.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Templates */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-[#111111]">
          Standard WhatsApp Templates
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map((tpl) => {
            const Icon = tpl.icon
            const sampleText = tpl.text(pendingOrders[0] || null)
            const isCopied = copiedId === tpl.id

            return (
              <div
                key={tpl.id}
                className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${tpl.color} flex items-center justify-center`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-bold text-[#111111]">{tpl.title}</h3>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F5F5F3] rounded-xl text-[11px] text-slate-700 font-mono whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                    {sampleText}
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard(sampleText, tpl.id)}
                  className="w-full py-2 px-3 rounded-xl bg-black hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  {isCopied ? <CheckCircle className="w-3.5 h-3.5 text-[#D6FF4A]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copied to Clipboard!' : 'Copy Template'}</span>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pending Orders Action Queue */}
      <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-[#111111]">
          Recent Orders Requiring WhatsApp Follow-Up
        </h2>

        {orders.length === 0 ? (
          <p className="text-xs text-[#8A8A8A]">No active orders to display.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.slice(0, 6).map((order) => {
              const cleanPhone = (order.buyer_whatsapp || order.buyer_phone || '').replace(/\D/g, '')
              const waLink = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(templates[0].text(order))}`

              return (
                <div key={order.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#111111]">#{order.id}</span>
                      <span className="text-[#8A8A8A]">•</span>
                      <span className="font-semibold text-[#111111]">{order.buyer_name}</span>
                      <span className="text-[#8A8A8A]">•</span>
                      <span className="text-emerald-600 font-medium">📱 {order.buyer_whatsapp}</span>
                    </div>
                    <p className="text-[11px] text-[#8A8A8A] mt-0.5">
                      {order.items?.map((i) => `${i.name} (x${i.qty})`).join(', ')} • <strong>{formatPrice(order.total_amount)}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-[#111111] capitalize">
                      {order.status.replace('_', ' ')}
                    </span>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#D6FF4A] hover:bg-[#c9f635] text-black shadow-sm transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message on WhatsApp</span>
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
