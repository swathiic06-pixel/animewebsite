import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  ArrowLeft,
  Check,
  ShieldCheck,
  Truck,
  ChatCircle,
  Minus,
  Plus,
  ShareNetwork,
  ArrowsOutSimple,
  X
} from '@phosphor-icons/react'
import { useApp } from '../../context/AppContext'
import { useCart } from '../../context/CartContext'
import { formatPrice } from '../../utils/formatPrice'
import { StockBadge, CategoryBadge } from '../../components/common/Badge'
import ProductCard from '../../components/storefront/ProductCard'
import { handleImageError } from '../../utils/imageFallback'
import { cldUrl } from '../../lib/cloudinary'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { products } = useApp()
  const { addToCart, items } = useCart()

  const [quantity, setQuantity] = useState(1)
  const [copied, setCopied] = useState(false)
  const [imageFit, setImageFit] = useState('cover')
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const product = products.find((p) => p.id === id)

  if (!product) {
    return (
      <div className="sf-empty-state max-w-md mx-auto my-20">
        <ArrowLeft size={32} className="text-[#6B6B6B] mb-4" />
        <h2 className="text-xl font-bold text-[#111111] mb-2 font-['Syne']">Product Not Found</h2>
        <p className="text-sm text-[#6B6B6B] mb-6 max-w-[45ch] font-['Inter']">
          The anime collectible you are looking for does not exist or has been removed.
        </p>
        <Link to="/" className="sf-btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Return to Catalog
        </Link>
      </div>
    )
  }

  const isSoldOut = product.in_stock === false || (product.stock !== undefined && product.stock !== null && product.stock !== '' && Number(product.stock) <= 0)
  const cartItem = items.find((i) => i.id === product.id)
  const isAlreadyInCart = Boolean(cartItem)

  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4)

  const handleAddToCart = () => {
    if (!isSoldOut) {
      addToCart(product, quantity)
    }
  }

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-10 pb-12" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── Breadcrumb / Back ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 hover:text-[#111111] font-medium transition-colors"
        >
          <ArrowLeft size={16} /> Back to Products
        </button>

        <div className="flex items-center gap-2 font-medium">
          <Link to="/" className="hover:text-[#111111]">Shop</Link>
          <span>/</span>
          <Link to={`/?category=${product.category}`} className="capitalize hover:text-[#111111]">
            {product.category}
          </Link>
          <span>/</span>
          <span className="text-[#111111] font-semibold truncate max-w-xs">{product.name}</span>
        </div>
      </div>

      {/* ── Main Details Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

        {/* Product Image */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-[4/5] sm:aspect-square lg:aspect-[4/5] rounded-[16px] overflow-hidden bg-[#18181b] border border-[#E5E5E5] flex items-center justify-center group shadow-xs">
            {/* Ambient Blurred Glow for Non-Square / Custom Images */}
            {product.image_url && (
              <div
                className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-125 pointer-events-none transition-opacity duration-300"
                style={{ backgroundImage: `url(${product.image_url})` }}
                aria-hidden="true"
              />
            )}

            {/* Fit / Fill toggle & Fullscreen Zoom controls */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => setImageFit(prev => prev === 'cover' ? 'contain' : 'cover')}
                className="px-2.5 py-1 rounded-[10px] bg-white/90 backdrop-blur-md border border-[#E5E5E5] text-[11px] font-semibold text-[#111111] hover:bg-white shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                title={imageFit === 'cover' ? 'Switch to uncropped full image view' : 'Fill entire container'}
              >
                <span>{imageFit === 'cover' ? 'Fit Whole' : 'Fill Frame'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="p-1.5 rounded-[10px] bg-white/90 backdrop-blur-md border border-[#E5E5E5] text-[#111111] hover:bg-white shadow-xs transition-all cursor-pointer"
                title="View full-size photo"
              >
                <ArrowsOutSimple size={14} />
              </button>
            </div>

            <img
              src={cldUrl(product.image_url, { width: 1200 })}
              alt={product.name}
              onError={handleImageError}
              onClick={() => setIsLightboxOpen(true)}
              className={`relative z-10 w-full h-full cursor-zoom-in transition-all duration-300 ${
                imageFit === 'cover' ? 'object-cover' : 'object-contain p-2'
              } ${isSoldOut ? 'grayscale-[30%]' : ''}`}
            />
            {isSoldOut && (
              <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: 'rgba(17,17,17,0.4)' }}>
                <span className="px-5 py-2 rounded-[12px] bg-[#DC2626] text-white font-bold text-sm tracking-widest uppercase">
                  Sold Out
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Product Info */}
        <div className="lg:col-span-6 space-y-6">

          {/* Badges + Title + Price */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {product.hw_num && (
                <span className="inline-flex items-center px-3 py-1 rounded-[12px] text-xs font-bold bg-[#111111] text-white border-none font-['Inter']">
                  Collector HW# {product.hw_num}
                </span>
              )}
              <CategoryBadge category={product.series || product.category} />
              <StockBadge inStock={product.in_stock} stock={product.stock} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight leading-snug" style={{ fontFamily: 'Syne, sans-serif' }}>
              {product.name}
            </h1>

            <div className="flex items-baseline gap-4">
              <span className="text-3xl font-bold text-[#DC2626]" style={{ fontFamily: 'Inter, sans-serif' }}>
                {formatPrice(product.price)}
              </span>
              <span className="sf-badge text-xs">
                Free Delivery
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-[#6B6B6B] leading-relaxed max-w-[70ch] pt-4 border-t border-[#E5E5E5]">
            {product.description}
          </p>

          {/* Collector Specifications */}
          <div className="p-4 rounded-[12px] bg-[#F8F8F6] border border-[#E5E5E5] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#6B6B6B]">Collector Specifications</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {product.hw_num && (
                <div className="p-2.5 rounded-[12px] bg-white border border-[#E5E5E5]">
                  <span className="block text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider mb-0.5">Collector #</span>
                  <span className="font-bold text-[#111111]">HW# {product.hw_num}</span>
                </div>
              )}
              {product.series && (
                <div className="p-2.5 rounded-[12px] bg-white border border-[#E5E5E5]">
                  <span className="block text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider mb-0.5">Series</span>
                  <span className="font-bold text-[#111111]">{product.series}</span>
                </div>
              )}
              {product.edition && (
                <div className="p-2.5 rounded-[12px] bg-white border border-[#E5E5E5]">
                  <span className="block text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider mb-0.5">Edition</span>
                  <span className="font-bold text-[#111111]">{product.edition}</span>
                </div>
              )}
              {product.color && (
                <div className="p-2.5 rounded-[12px] bg-white border border-[#E5E5E5]">
                  <span className="block text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider mb-0.5">Color</span>
                  <span className="font-bold text-[#111111]">{product.color}</span>
                </div>
              )}
              {product.sort_order !== undefined && (
                <div className="p-2.5 rounded-[12px] bg-white border border-[#E5E5E5]">
                  <span className="block text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider mb-0.5">Catalog Position</span>
                  <span className="font-bold text-[#111111]">#{product.sort_order}</span>
                </div>
              )}
              <div className="p-2.5 rounded-[12px] bg-white border border-[#E5E5E5]">
                <span className="block text-[10px] text-[#6B6B6B] font-semibold uppercase tracking-wider mb-0.5">Scale</span>
                <span className="font-bold text-[#111111]">1:64 Die-Cast</span>
              </div>
            </div>
          </div>

          {/* Add to Cart */}
          <div className="p-5 sm:p-6 rounded-[12px] bg-[#F8F8F6] border border-[#E5E5E5] space-y-4">
            {!isSoldOut ? (
              <div className="space-y-4">
                {/* Quantity selector */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#111111]">Quantity</span>
                  <div className="flex items-center gap-2 bg-white border border-[#E5E5E5] rounded-[12px] px-2 py-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-7 h-7 rounded-[12px] flex items-center justify-center text-[#6B6B6B] hover:text-[#111111] hover:bg-[#F8F8F6] transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold text-[#111111] w-8 text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                      className="w-7 h-7 rounded-[12px] flex items-center justify-center text-[#6B6B6B] hover:text-[#111111] hover:bg-[#F8F8F6] transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Add to Cart CTA */}
                <button
                  onClick={handleAddToCart}
                  className="sf-btn-primary w-full gap-2"
                >
                  <ShoppingCart size={20} />
                  <span>
                    {isAlreadyInCart
                      ? 'Add More to Cart'
                      : `Add ${quantity} to Cart · ${formatPrice(product.price * quantity)}`}
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#DC2626]">
                  This collectible is currently Sold Out.
                </p>
                <p className="text-xs text-[#6B6B6B]">
                  A restock is currently in progress. Check back soon!
                </p>
                <button
                  disabled
                  className="sf-btn-primary w-full opacity-40 cursor-not-allowed"
                >
                  Sold Out
                </button>
              </div>
            )}

            {/* Share / Product ID */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5] text-xs text-[#6B6B6B]">
              <span>ID: <strong className="font-mono text-[#111111]">{product.id}</strong></span>
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 hover:text-[#111111] font-medium transition-colors"
              >
                <ShareNetwork size={16} />
                <span>{copied ? 'Link Copied!' : 'Share Product'}</span>
              </button>
            </div>
          </div>

          {/* Guarantees */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-[12px] bg-[#F8F8F6] border border-[#E5E5E5] flex items-center gap-2.5">
              <ShieldCheck size={20} className="text-[#111111] flex-shrink-0" />
              <span className="text-[#111111] font-medium">100% Authentic Merch</span>
            </div>
            <div className="p-3.5 rounded-[12px] bg-[#F8F8F6] border border-[#E5E5E5] flex items-center gap-2.5">
              <ChatCircle size={20} className="text-[#111111] flex-shrink-0" />
              <span className="text-[#111111] font-medium">WhatsApp UPI Payment</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── Related Products ────────────────────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <div className="pt-10 border-t border-[#E5E5E5]">
          <h3 className="text-2xl font-bold text-[#111111] tracking-tight mb-6" style={{ fontFamily: 'Syne, sans-serif' }}>
            You Might Also Like
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="self-end mb-2 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
            >
              <span>Close</span>
              <X size={16} />
            </button>
            <img
              src={product.image_url}
              alt={product.name}
              className="max-w-full max-h-[82vh] object-contain rounded-xl shadow-2xl bg-black/40 border border-white/10"
            />
          </div>
        </div>
      )}

    </div>
  )
}
