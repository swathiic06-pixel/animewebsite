import React from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Eye, Check } from '@phosphor-icons/react'
import { formatPrice } from '../../utils/formatPrice'
import { StockBadge, CategoryBadge } from '../common/Badge'
import { useCart } from '../../context/CartContext'
import { handleImageError } from '../../utils/imageFallback'
import { cldUrl } from '../../lib/cloudinary'

export default function ProductCard({ product }) {
  const { addToCart, items } = useCart()
  const isSoldOut = product.in_stock === false || (product.stock !== undefined && product.stock !== null && product.stock !== '' && Number(product.stock) <= 0)
  const cartItem = items.find((i) => i.id === product.id)
  const isAlreadyInCart = Boolean(cartItem)

  const handleQuickAdd = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isSoldOut) {
      addToCart(product, 1)
    }
  }

  return (
    <div className={`sf-product-card group relative flex flex-col ${isSoldOut ? 'opacity-80' : ''}`}>

      {/* Product Image & Badges */}
      <Link to={`/product/${product.id}`} className="relative aspect-[4/5] overflow-hidden bg-[#18181b]/5 flex items-center justify-center p-3 block group">
        {product.image_url && (
          <div
            className="absolute inset-0 bg-cover bg-center blur-md opacity-25 scale-125 pointer-events-none"
            style={{ backgroundImage: `url(${product.image_url})` }}
            aria-hidden="true"
          />
        )}
        <img
          src={cldUrl(product.image_url, { width: 400, height: 500, crop: 'limit' })}
          alt={product.name}
          loading="lazy"
          onError={handleImageError}
          className={`sf-product-img relative z-10 max-w-full max-h-full object-contain ${isSoldOut ? 'grayscale-[30%]' : ''}`}
        />

        {/* Top-left badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {product.hw_num && (
            <span className="sf-badge text-[10px] bg-[#111111] text-white border-none px-2 py-0.5 rounded-[12px] font-bold tracking-wider uppercase font-['Inter']">
              HW# {product.hw_num}
            </span>
          )}
          <CategoryBadge category={product.series || product.category} />
        </div>

        {/* Top-right: stock badge */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <StockBadge inStock={product.in_stock} stock={product.stock} />
        </div>

        {/* Sold out overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-[rgba(17,17,17,0.4)] flex items-center justify-center">
            <span className="px-4 py-1.5 rounded-[12px] bg-[#DC2626] text-white font-bold text-xs tracking-widest uppercase font-['Inter']">
              Sold Out
            </span>
          </div>
        )}
      </Link>

      {/* Product Details */}
      <div className="p-4 flex-1 flex flex-col justify-between bg-[#F8F8F6]">
        <div>
          <Link to={`/product/${product.id}`}>
            <h3 className="text-[#111111] font-semibold text-sm line-clamp-2 hover:text-[#DC2626] transition-colors leading-snug font-['Inter']">
              {product.name}
            </h3>
          </Link>

          {(product.edition || product.color) && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[#6B6B6B] truncate font-['Inter']">
              {product.edition && (
                <span className="px-1.5 py-0.5 rounded-[12px] bg-white border border-[#E5E5E5] text-[10px] font-semibold text-[#111111]">
                  {product.edition}
                </span>
              )}
              {product.color && product.color !== product.edition && (
                <span className="text-[#6B6B6B] truncate text-[11px]">
                  · {product.color}
                </span>
              )}
            </div>
          )}

          <p className="text-xs text-[#6B6B6B] line-clamp-2 mt-1.5 leading-relaxed font-['Inter']">
            {product.description}
          </p>
        </div>

        {/* Price & Action */}
        <div className="mt-4 pt-3 border-t border-[#E5E5E5] flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] text-[#6B6B6B] block font-semibold uppercase tracking-wider font-['Inter']">Price</span>
            <span className="text-base font-bold text-[#DC2626] tracking-tight font-['Inter']">
              {formatPrice(product.price)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              to={`/product/${product.id}`}
              className="p-2 rounded-[12px] text-[#6B6B6B] hover:text-[#111111] hover:bg-white border border-transparent hover:border-[#E5E5E5] transition-colors"
              title="View Details"
            >
              <Eye size={16} />
            </Link>

            <button
              onClick={handleQuickAdd}
              disabled={isSoldOut}
              className={[
                'flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-xs font-semibold transition-all font-[\'Inter\']',
                isSoldOut
                  ? 'bg-[#F8F8F6] text-[#6B6B6B] cursor-not-allowed border border-[#E5E5E5]'
                  : isAlreadyInCart
                  ? 'bg-white text-[#111111] border border-[#E5E5E5] hover:bg-[#F1F1EE]'
                  : 'bg-[#DC2626] hover:bg-[#B91C1C] text-white border-none'
              ].join(' ')}
              title={isSoldOut ? 'Item is sold out' : 'Add to cart'}
            >
              {isAlreadyInCart && !isSoldOut ? (
                <>
                  <Check size={14} />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <ShoppingCart size={14} />
                  <span>{isSoldOut ? 'Sold Out' : 'Add'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
