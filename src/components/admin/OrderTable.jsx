import React, { useState } from 'react'
import {
  MessageSquare,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  Eye,
  Phone,
  MapPin,
  QrCode,
  Trash2,
  FileText,
  Package,
  ExternalLink,
  RotateCcw
} from 'lucide-react'
import { formatPrice } from '../../utils/formatPrice'
import { OrderStatusBadge } from '../common/Badge'
import { OWNER_UPI_ID } from '../../lib/clerkClient'
import Modal from '../common/Modal'
import { cldUrl } from '../../lib/cloudinary'
import { useApp } from '../../context/AppContext'

export default function OrderTable({ orders, onUpdateStatus, onDeleteOrder }) {
  const { createShiprocketShipment, generateInvoice } = useApp()
  const [inspectOrder, setInspectOrder] = useState(null)
  const [showQrModal, setShowQrModal] = useState(null)
  const [deleteCandidate, setDeleteCandidate] = useState(null)

  // Shiprocket Shipment Modal State
  const [shipmentCandidate, setShipmentCandidate] = useState(null)
  const [pkgWeight, setPkgWeight] = useState(0.5)
  const [pkgLength, setPkgLength] = useState(15)
  const [pkgBreadth, setPkgBreadth] = useState(15)
  const [pkgHeight, setPkgHeight] = useState(10)
  const [isCreatingShipment, setIsCreatingShipment] = useState(false)
  const [shipmentError, setShipmentError] = useState('')

  const statuses = [
    { value: 'pending', label: '1. Pending QR' },
    { value: 'qr_sent', label: '2. QR Sent' },
    { value: 'payment_confirmed', label: '3. Payment Verified' },
    { value: 'shipped', label: '4. Shipped' },
    { value: 'delivered', label: '5. Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'replacement_requested', label: 'Replacement Requested' },
    { value: 'replacement_resolved', label: 'Replacement Resolved' },
  ]

  const generateWhatsAppMessage = (order) => {
    const cleanPhone = (order.buyer_whatsapp || order.buyer_phone || '').replace(/\D/g, '')
    const itemsList = order.items.map((i) => `• ${i.name} (x${i.qty}) - ₹${i.price * i.qty}`).join('\n')
    
    const message = 
      `👋 Hi ${order.buyer_name}!\n\n` +
      `Thank you for your order at *AnimeMax*!\n` +
      `📦 *Order ID:* #${order.id}\n\n` +
      `*Your Items:*\n${itemsList}\n\n` +
      `💰 *Total Amount:* ${formatPrice(order.total_amount)}\n\n` +
      `📲 *UPI Payment ID:* \`${OWNER_UPI_ID}\`\n\n` +
      `Please pay via Google Pay, PhonePe, or Paytm and send a screenshot of the payment receipt or UTR number here.\n\n` +
      `Once verified, we will dispatch your parcel to:\n📍 ${order.buyer_address}\n\n` +
      `Thank you for supporting AnimeMax! 🎌`

    return `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(message)}`
  }

  // UPI deep link & QR generator link
  const generateUpiQrUrl = (order) => {
    const upiLink = `upi://pay?pa=${OWNER_UPI_ID}&pn=AnimeMax&am=${order.total_amount}&cu=INR&tn=Order-${order.id}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`
  }

  const handleOpenShipmentModal = (order) => {
    setShipmentCandidate(order)
    setPkgWeight(0.5)
    setPkgLength(15)
    setPkgBreadth(15)
    setPkgHeight(10)
    setShipmentError('')
  }

  const handleGenerateShipment = async (e) => {
    e.preventDefault()
    if (!shipmentCandidate) return
    setIsCreatingShipment(true)
    setShipmentError('')
    try {
      await createShiprocketShipment(shipmentCandidate.id, {
        weight: Number(pkgWeight) || 0.5,
        length: Number(pkgLength) || 15,
        breadth: Number(pkgBreadth) || 15,
        height: Number(pkgHeight) || 10,
      })
      setShipmentCandidate(null)
    } catch (err) {
      setShipmentError(err?.message || 'Failed to create shipment.')
    } finally {
      setIsCreatingShipment(false)
    }
  }

  const handleOpenInvoice = async (order) => {
    if (order.invoice_url) {
      const win = window.open()
      if (win) {
        win.document.write(`<iframe src="${order.invoice_url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`)
      } else {
        window.location.href = order.invoice_url
      }
      return
    }

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
      console.warn('Failed to generate invoice:', err)
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-[#EDEDED] bg-white shadow-2xs font-sans">
        <table className="w-full text-left text-xs text-[#111827]">
          <thead className="bg-[#F5F6F8] text-[11px] uppercase tracking-wider text-[#6B7280] border-b border-[#EDEDED]">
            <tr>
              <th scope="col" className="px-5 py-3.5 font-semibold">Order ID &amp; Date</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Buyer Details</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Items</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Total</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Status</th>
              <th scope="col" className="px-5 py-3.5 font-semibold text-center">Fulfillment &amp; Shipping</th>
              <th scope="col" className="px-5 py-3.5 font-semibold text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDEDED] font-normal">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-xs text-[#6B7280]">
                  <p className="font-bold text-sm text-[#111827] mb-1">No orders found</p>
                  <p>There are no orders matching this filter yet.</p>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                return (
                  <tr key={order.id} className="hover:bg-gray-50/70 transition-colors">
                    
                    {/* ID & Date */}
                    <td className="px-5 py-3.5">
                      <p className="font-mono font-bold text-[#111827]">#{order.id}</p>
                      <p className="text-[10px] text-[#6B7280] mt-0.5 font-medium">
                        {new Date(order.created_at).toLocaleDateString()} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {order.tracking_number && (
                        <a
                          href={order.tracking_url || `https://shiprocket.co/tracking/${order.tracking_number}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 mt-1 font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200"
                        >
                          <Truck className="w-2.5 h-2.5 text-blue-600" />
                          <span>{order.tracking_number}</span>
                        </a>
                      )}
                    </td>

                    {/* Buyer Details */}
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-[#111827]">{order.buyer_name}</p>
                      <div className="flex items-center gap-1 text-[11px] text-emerald-600 mt-0.5 font-medium">
                        <MessageSquare className="w-3 h-3" />
                        <span>{order.buyer_whatsapp || order.buyer_phone}</span>
                      </div>
                    </td>

                    {/* Items summary */}
                    <td className="px-5 py-3.5">
                      <div className="max-w-xs truncate text-[#111827] font-medium">
                        {order.items.map((i) => `${i.name} (x${i.qty})`).join(', ')}
                      </div>
                      <span className="text-[10px] text-[#6B7280]">
                        {order.items.reduce((acc, i) => acc + i.qty, 0)} total items
                      </span>
                    </td>

                    {/* Total */}
                    <td className="px-5 py-3.5 font-bold text-[#111827] text-sm">
                      {formatPrice(order.total_amount)}
                    </td>

                    {/* Status Dropdown */}
                    <td className="px-5 py-3.5">
                      <select
                        value={order.status}
                        onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                        aria-label="Order status"
                        className="bg-[#F5F6F8] border border-[#EDEDED] text-xs text-[#111827] font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] cursor-pointer"
                      >
                        {statuses.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Fulfillment & Shipping Actions */}
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">

                        {/* Mark Shipped button */}
                        {order.status === 'payment_confirmed' && (
                          <button
                            onClick={() => onUpdateStatus(order.id, 'shipped')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs transition-all"
                            title="Quick mark order as Shipped"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Mark Shipped</span>
                          </button>
                        )}

                        {/* Part 2: Mark Delivered button (starts the 5-day replacement window!) */}
                        {order.status === 'shipped' && (
                          <button
                            onClick={() => onUpdateStatus(order.id, 'delivered')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 shadow-2xs transition-all"
                            title="Mark Delivered (starts 5-day replacement clock)"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                            <span>Mark Delivered</span>
                          </button>
                        )}

                        {order.status === 'delivered' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                            <CheckCircle className="w-3 h-3 text-teal-600" />
                            <span>Delivered</span>
                          </span>
                        )}

                        {/* Part 5: Create Shiprocket Shipment */}
                        {!order.tracking_number && ['payment_confirmed', 'shipped'].includes(order.status) && (
                          <button
                            onClick={() => handleOpenShipmentModal(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs transition-all"
                            title="Create Shiprocket consignment & generate AWB tracking"
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span>Shiprocket</span>
                          </button>
                        )}

                        {/* Tax Invoice button */}
                        {['payment_confirmed', 'shipped', 'delivered'].includes(order.status) && (
                          <button
                            onClick={() => handleOpenInvoice(order)}
                            className="p-1.5 rounded-lg bg-gray-100 text-[#4B5563] hover:text-[#111827] hover:bg-gray-200 transition-colors"
                            title="View / Download Tax Invoice"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Send QR WhatsApp */}
                        <a
                          href={generateWhatsAppMessage(order)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-2xs transition-all"
                          title="Open WhatsApp with pre-filled order details & UPI request"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Send QR</span>
                        </a>

                        <button
                          onClick={() => setShowQrModal(order)}
                          className="p-1.5 rounded-lg bg-gray-100 text-[#4B5563] hover:text-[#111827] hover:bg-gray-200 transition-colors"
                          title="View Generated UPI QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Inspect Details & Delete */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setInspectOrder(order)}
                          className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-gray-100 transition-colors"
                          title="Inspect full order"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {onDeleteOrder && (
                          <button
                            onClick={() => setDeleteCandidate(order)}
                            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* ── Shiprocket Shipment Creation Modal (Part 5) ───────────── */}
      <Modal
        isOpen={Boolean(shipmentCandidate)}
        onClose={() => setShipmentCandidate(null)}
        title={`Create Shiprocket Shipment #${shipmentCandidate?.id}`}
        maxWidth="max-w-md"
      >
        {shipmentCandidate && (
          <form onSubmit={handleGenerateShipment} className="space-y-4 text-xs text-[#374151]">
            <p className="text-xs text-[#6B7280]">
              Dispatching to <strong className="text-[#111827]">{shipmentCandidate.buyer_name}</strong> at{' '}
              <strong className="text-[#111827]">{shipmentCandidate.buyer_address}</strong>.
            </p>

            {shipmentError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {shipmentError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">
                  Package Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={pkgWeight}
                  onChange={(e) => setPkgWeight(e.target.value)}
                  className="w-full bg-[#F5F6F8] border border-[#EDEDED] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">
                  Length (cm)
                </label>
                <input
                  type="number"
                  min="1"
                  value={pkgLength}
                  onChange={(e) => setPkgLength(e.target.value)}
                  className="w-full bg-[#F5F6F8] border border-[#EDEDED] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">
                  Breadth (cm)
                </label>
                <input
                  type="number"
                  min="1"
                  value={pkgBreadth}
                  onChange={(e) => setPkgBreadth(e.target.value)}
                  className="w-full bg-[#F5F6F8] border border-[#EDEDED] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  min="1"
                  value={pkgHeight}
                  onChange={(e) => setPkgHeight(e.target.value)}
                  className="w-full bg-[#F5F6F8] border border-[#EDEDED] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                  required
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 text-[11px] text-purple-900 leading-relaxed">
              Shiprocket generates a live AWB and courier tracking number. Credentials are securely stored server-side.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EDEDED]">
              <button
                type="button"
                onClick={() => setShipmentCandidate(null)}
                disabled={isCreatingShipment}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:text-[#111827] hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingShipment}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-2xs"
              >
                <Package className="w-3.5 h-3.5" />
                <span>{isCreatingShipment ? 'Generating AWB...' : 'Create Shipment & AWB'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Inspect Order Modal */}
      <Modal
        isOpen={Boolean(inspectOrder)}
        onClose={() => setInspectOrder(null)}
        title={`Order Inspection #${inspectOrder?.id}`}
      >
        {inspectOrder && (
          <div className="space-y-4 text-xs text-[#374151]">
            {/* Status & Date */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EDEDED]">
              <div>
                <p className="text-[#6B7280]">Order Placed On</p>
                <p className="text-[#111827] font-semibold">
                  {new Date(inspectOrder.created_at).toLocaleString()}
                </p>
              </div>
              <OrderStatusBadge status={inspectOrder.status} />
            </div>

            {/* Timestamps & Lifecycle Badges */}
            {inspectOrder.cancelled_at && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                <strong>Cancelled at:</strong> {new Date(inspectOrder.cancelled_at).toLocaleString()} (Stock automatically restored)
              </div>
            )}

            {inspectOrder.delivered_at && (
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-800">
                <strong>Delivered at:</strong> {new Date(inspectOrder.delivered_at).toLocaleString()} (5-day replacement window started)
              </div>
            )}

            {/* Shipping & Tracking Information (Part 5) */}
            {inspectOrder.tracking_number && (
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 space-y-1">
                <h4 className="font-bold uppercase text-[11px] tracking-wider text-blue-900 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Shiprocket Dispatch Details</span>
                </h4>
                <p><strong>Tracking AWB:</strong> <span className="font-mono font-bold">{inspectOrder.tracking_number}</span></p>
                {inspectOrder.shiprocket_shipment_id && (
                  <p><strong>Shipment ID:</strong> <span className="font-mono">{inspectOrder.shiprocket_shipment_id}</span></p>
                )}
                <div className="pt-1 flex items-center gap-3">
                  <a
                    href={inspectOrder.tracking_url || `https://shiprocket.co/tracking/${inspectOrder.tracking_number}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-700 font-bold hover:underline"
                  >
                    <span>Track on Shiprocket</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {inspectOrder.label_url && (
                    <a
                      href={inspectOrder.label_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-700 font-bold hover:underline"
                    >
                      <span>Shipping Label</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Buyer Details */}
            <div className="p-3.5 rounded-xl bg-[#F5F6F8] border border-[#EDEDED] space-y-1.5">
              <h4 className="font-bold text-[#111827] uppercase text-[11px] tracking-wider">
                Buyer Delivery Information
              </h4>
              <p><strong className="text-[#6B7280]">Name:</strong> {inspectOrder.buyer_name}</p>
              <p><strong className="text-[#6B7280]">Phone:</strong> {inspectOrder.buyer_phone}</p>
              <p><strong className="text-[#6B7280]">WhatsApp:</strong> {inspectOrder.buyer_whatsapp}</p>
              <p><strong className="text-[#6B7280]">Shipping Address:</strong> {inspectOrder.buyer_address}</p>
              <p><strong className="text-[#6B7280]">User Type:</strong> {inspectOrder.user_id ? `Registered (${inspectOrder.user_id})` : 'Guest Checkout'}</p>
            </div>

            {/* Ordered Items */}
            <div className="space-y-2">
              <h4 className="font-bold text-[#111827] uppercase text-[11px] tracking-wider">
                Purchased Items ({inspectOrder.items.length})
              </h4>
              <div className="divide-y divide-[#EDEDED] border border-[#EDEDED] rounded-xl overflow-hidden bg-white">
                {inspectOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={cldUrl(item.image_url, { width: 80, height: 80, crop: 'fill' })}
                        alt={item.name}
                        loading="lazy"
                        className="w-9 h-9 rounded-lg object-cover bg-gray-100 border border-[#EDEDED]"
                      />
                      <div>
                        <p className="font-semibold text-[#111827]">{item.name}</p>
                        <p className="text-[10px] text-[#6B7280]">Qty: {item.qty} × {formatPrice(item.price)}</p>
                      </div>
                    </div>
                    <span className="font-bold text-[#111827]">
                      {formatPrice(item.price * item.qty)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grand Total */}
            <div className="flex justify-between items-center pt-3 border-t border-[#EDEDED] text-sm font-bold text-[#111827]">
              <span>Total Payable</span>
              <span className="text-base text-[#111827]">{formatPrice(inspectOrder.total_amount)}</span>
            </div>

            {/* Actions inside Inspection */}
            <div className="pt-2 border-t border-[#EDEDED] space-y-2">
              <p className="font-bold text-[#111827] uppercase text-[11px] tracking-wider">
                Update Fulfillment Status
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateStatus(inspectOrder.id, 'payment_confirmed')
                    setInspectOrder(prev => ({ ...prev, status: 'payment_confirmed' }))
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                    inspectOrder.status === 'payment_confirmed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white text-[#111827] border-[#EDEDED] hover:bg-gray-50'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onUpdateStatus(inspectOrder.id, 'shipped')
                    setInspectOrder(prev => ({ ...prev, status: 'shipped' }))
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                    inspectOrder.status === 'shipped'
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : 'bg-white text-[#111827] border-[#EDEDED] hover:bg-gray-50'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Shipped</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onUpdateStatus(inspectOrder.id, 'delivered')
                    setInspectOrder(prev => ({ ...prev, status: 'delivered', delivered_at: new Date().toISOString() }))
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                    inspectOrder.status === 'delivered'
                      ? 'bg-teal-50 text-teal-800 border-teal-300'
                      : 'bg-white text-[#111827] border-[#EDEDED] hover:bg-gray-50'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                  <span>Delivered</span>
                </button>
              </div>
            </div>

            {/* Invoice & WhatsApp Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleOpenInvoice(inspectOrder)}
                className="w-full py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                <FileText className="w-4 h-4" />
                <span>View / Print Tax Invoice</span>
              </button>

              <a
                href={generateWhatsAppMessage(inspectOrder)}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open WhatsApp Chat with {inspectOrder.buyer_name}</span>
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* QR Code Preview Modal */}
      <Modal
        isOpen={Boolean(showQrModal)}
        onClose={() => setShowQrModal(null)}
        title={`UPI QR Preview for #${showQrModal?.id}`}
        maxWidth="max-w-md"
      >
        {showQrModal && (
          <div className="flex flex-col items-center text-center space-y-4 text-xs text-[#4B5563]">
            <p>
              This QR code can be scanned with Google Pay, PhonePe, or Paytm for{' '}
              <strong className="text-[#111827]">{formatPrice(showQrModal.total_amount)}</strong>.
            </p>

            <div className="p-4 bg-white rounded-2xl border border-[#EDEDED] shadow-sm">
              <img
                src={generateUpiQrUrl(showQrModal)}
                alt="UPI QR Code"
                className="w-52 h-52 object-contain"
              />
            </div>

            <div className="p-3 rounded-xl bg-[#F5F6F8] border border-[#EDEDED] w-full text-center">
              <p className="text-[#6B7280] text-[11px]">UPI ID: <strong className="text-[#111827] font-mono">{OWNER_UPI_ID}</strong></p>
              <p className="text-[#6B7280] text-[11px] mt-0.5">Amount: <strong className="text-emerald-700 font-bold">{formatPrice(showQrModal.total_amount)}</strong></p>
            </div>

            <a
              href={generateWhatsAppMessage(showQrModal)}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Send QR Link to Buyer's WhatsApp</span>
            </a>
          </div>
        )}
      </Modal>

      {/* Delete Order Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteCandidate)}
        onClose={() => setDeleteCandidate(null)}
        title="Delete Order"
      >
        {deleteCandidate && (
          <div className="space-y-4 text-xs text-[#374151]">
            <p>
              Are you sure you want to permanently delete order <strong className="text-[#111827]">#{deleteCandidate.id}</strong> placed by <strong className="text-[#111827]">{deleteCandidate.buyer_name}</strong>?
            </p>
            <p className="text-[11px] text-[#6B7280]">
              This will remove the order and its items from both the local store and Supabase.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EDEDED]">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:text-[#111827] hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteOrder(deleteCandidate.id)
                  setDeleteCandidate(null)
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-2xs"
              >
                Delete Order
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
