import React, { useState } from 'react'
import { Edit2, Trash2, Power, Eye, CheckCircle2, XCircle } from 'lucide-react'
import { formatPrice } from '../../utils/formatPrice'
import { CategoryBadge, StockBadge } from '../common/Badge'
import Modal from '../common/Modal'
import { handleImageError } from '../../utils/imageFallback'
import { cldUrl } from '../../lib/cloudinary'
import { getProductCoverImage } from '../../utils/productImages'

export default function ProductTable({ products, onEdit, onDelete, onToggleSoldOut }) {
  const [deleteCandidate, setDeleteCandidate] = useState(null)

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-[#EDEDED] bg-white shadow-2xs">
        <table className="w-full text-left text-xs text-[#111827]">
          <thead className="bg-[#F5F6F8] text-[11px] uppercase tracking-wider text-[#6B7280] border-b border-[#EDEDED]">
            <tr>
              <th scope="col" className="px-5 py-3.5 font-semibold">Product</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">HW# / Pos</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Placement</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Series / Category</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Edition / Color</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Price</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Stock</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Status</th>
              <th scope="col" className="px-5 py-3.5 font-semibold text-center">Stock Toggle</th>
              <th scope="col" className="px-5 py-3.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDEDED] font-normal">
            {products.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-5 py-12 text-center text-xs text-[#6B7280]">
                  <p className="font-bold text-sm text-[#111827] mb-1">No products found</p>
                  <p>Your store catalog is currently empty. Click "+ Add New Product" to add launch inventory.</p>
                </td>
              </tr>
            ) : (
              products.map((product) => {
              const isSoldOut = !product.in_stock || product.stock <= 0
              return (
                <tr 
                  key={product.id} 
                  className={`hover:bg-gray-50/70 transition-colors ${isSoldOut ? 'bg-rose-50/20' : ''}`}
                >
                  {/* Image & Title */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={cldUrl(getProductCoverImage(product), { width: 80, height: 80, crop: 'fill' })}
                        alt={product.name}
                        loading="lazy"
                        onError={handleImageError}
                        className="w-10 h-10 rounded-lg object-cover bg-gray-100 border border-[#EDEDED] shrink-0"
                      />
                      <div className="max-w-xs">
                        <p className="font-bold text-[#111827] truncate">{product.name}</p>
                        <p className="text-[10px] text-[#6B7280] font-mono truncate">{product.id}</p>
                      </div>
                    </div>
                  </td>

                  {/* HW# and Position Column */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {product.hw_num ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        HW# {product.hw_num}
                      </span>
                    ) : (
                      <span className="text-[#9CA3AF] font-mono text-xs">#{product.sort_order ?? '—'}</span>
                    )}
                  </td>

                  {/* Homepage Placement Badge */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {product.display_section === 'hero' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <span>👑 Hero</span>
                        {product.sort_order ? <span className="text-[9px] opacity-75">#{product.sort_order}</span> : null}
                      </span>
                    )}
                    {product.display_section === 'spotlight' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                        <span>✨ Spotlight</span>
                        {product.sort_order ? <span className="text-[9px] opacity-75">#{product.sort_order}</span> : null}
                      </span>
                    )}
                    {product.display_section === 'favourites' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                        <span>❤️ Favourites</span>
                        {product.sort_order ? <span className="text-[9px] opacity-75">#{product.sort_order}</span> : null}
                      </span>
                    )}
                    {(!product.display_section || product.display_section === 'grid') && (
                      <span className="text-[#9CA3AF] text-xs font-medium">—</span>
                    )}
                  </td>

                  {/* Category / Series */}
                  <td className="px-5 py-3.5">
                    <CategoryBadge category={product.category || product.series || 'General'} />
                  </td>


                  {/* Edition / Color */}
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                    <span className="font-semibold text-[#111827]">{product.edition || '—'}</span>
                    {product.color && product.color !== product.edition && (
                      <span className="text-[#6B7280] text-[10px] block">{product.color}</span>
                    )}
                  </td>

                  {/* Price */}
                  <td className="px-5 py-3.5 font-bold text-[#111827]">
                    {formatPrice(product.price)}
                  </td>

                  {/* Stock */}
                  <td className="px-5 py-3.5">
                    <span className={`font-mono font-semibold ${product.stock <= 3 ? 'text-amber-600' : 'text-[#111827]'}`}>
                      {product.stock} units
                    </span>
                  </td>

                  {/* Storefront status badge */}
                  <td className="px-5 py-3.5">
                    <StockBadge inStock={product.in_stock} stock={product.stock} />
                  </td>

                  {/* Quick One-Click Sold Out Toggle Button */}
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => onToggleSoldOut(product.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        product.in_stock
                          ? 'bg-gray-100 hover:bg-rose-50 text-[#4B5563] hover:text-rose-700 border border-gray-200 hover:border-rose-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-2xs'
                      }`}
                      title="Click to toggle between In Stock and Sold Out without deleting"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{product.in_stock ? 'Mark Sold Out' : 'Restore Stock'}</span>
                    </button>
                  </td>

                  {/* Edit and Delete action buttons */}
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onEdit(product)}
                        className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 transition-colors"
                        title="Edit Product Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeleteCandidate(product)}
                        className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteCandidate)}
        onClose={() => setDeleteCandidate(null)}
        title="Confirm Product Deletion"
      >
        <div className="space-y-4 text-xs text-[#374151]">
          <p>
            Are you sure you want to permanently delete{' '}
            <strong className="text-[#111827]">"{deleteCandidate?.name}"</strong>?
          </p>
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
            <strong>Tip:</strong> If you simply ran out of stock, use <strong>"Mark Sold Out"</strong> instead so buyers can still see the item in your catalog.
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#EDEDED]">
            <button
              onClick={() => setDeleteCandidate(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4B5563] hover:text-[#111827] hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (deleteCandidate) {
                  onDelete(deleteCandidate.id)
                  setDeleteCandidate(null)
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition-colors"
            >
              Delete Product
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
