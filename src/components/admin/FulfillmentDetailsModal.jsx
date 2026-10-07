import React from 'react'
import { X, CheckCircle2, Clock, Truck, AlertCircle, ArrowUpRight, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

export default function FulfillmentDetailsModal({ isOpen, onClose, rate = 82 }) {
  const { orders } = useApp()

  if (!isOpen) return null

  const pending = orders.filter((o) => o.status === 'pending' || o.status === 'qr_sent').length
  const confirmed = orders.filter((o) => o.status === 'payment_confirmed').length
  const shipped = orders.filter((o) => o.status === 'shipped').length
  const delivered = orders.filter((o) => o.status === 'delivered').length
  const replacements = orders.filter((o) => o.status === 'replacement_requested' || o.status === 'replacement_resolved').length
  const total = orders.length || 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#EDEDED] overflow-hidden flex flex-col z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDEDED]">
          <div>
            <h3 className="text-base font-bold text-[#111827]">Order Fulfillment Rate Breakdown</h3>
            <p className="text-xs text-[#6B7280]">Speed and delivery targets across active orders</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Main KPI overview */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Current Fulfillment</span>
              <p className="text-3xl font-extrabold text-emerald-900 mt-0.5">{rate}%</p>
              <p className="text-xs text-emerald-700 mt-1">Target: 90% orders fulfilled and delivered on time</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-[#EDEDED] bg-white">
              <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                <Clock className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Avg QR Response</span>
              </div>
              <p className="text-base font-bold text-[#111827] mt-1.5">2.4 Hours</p>
              <p className="text-[11px] text-emerald-600 font-medium">Faster than 3.0h SLA</p>
            </div>

            <div className="p-3.5 rounded-xl border border-[#EDEDED] bg-white">
              <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                <Truck className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Avg Dispatch Time</span>
              </div>
              <p className="text-base font-bold text-[#111827] mt-1.5">18.2 Hours</p>
              <p className="text-[11px] text-emerald-600 font-medium">Within 24h window</p>
            </div>
          </div>

          {/* Pipeline breakdown */}
          <div className="p-4 rounded-xl border border-[#EDEDED] space-y-3">
            <h4 className="text-xs font-bold text-[#111827]">Order Queue Status</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Delivered to Buyer</span>
                <span className="font-semibold text-emerald-600">{delivered} orders</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.round((delivered / total) * 100)}%` }} />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[#6B7280]">Shipped / In Transit</span>
                <span className="font-semibold text-amber-600">{shipped} orders</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.round((shipped / total) * 100)}%` }} />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[#6B7280]">Payment Verified (Awaiting Dispatch)</span>
                <span className="font-semibold text-indigo-600">{confirmed} orders</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.round((confirmed / total) * 100)}%` }} />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[#6B7280]">Pending QR / Awaiting Payment</span>
                <span className="font-semibold text-blue-600">{pending} orders</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.round((pending / total) * 100)}%` }} />
              </div>

              {replacements > 0 && (
                <>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[#6B7280]">Replacement Cases</span>
                    <span className="font-semibold text-purple-600">{replacements} orders</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.round((replacements / total) * 100)}%` }} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-[#F5F6F8] border-t border-[#EDEDED] flex items-center justify-between">
          <Link
            to="/admin/orders"
            onClick={onClose}
            className="text-xs font-semibold text-[#3B82F6] hover:underline flex items-center gap-1"
          >
            <span>View Pending Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#111827] text-white text-xs font-medium hover:bg-black transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
