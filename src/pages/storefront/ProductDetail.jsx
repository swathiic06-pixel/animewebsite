import React, { useState, useMemo, useEffect, useRef } from 'react'
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
  X,
  CaretLeft,
  CaretRight
} from '@phosphor-icons/react'
import { useApp } from '../../context/AppContext'
import { useCart } from '../../context/CartContext'
import { formatPrice } from '../../utils/formatPrice'
import { StockBadge, CategoryBadge } from '../../components/common/Badge'
import ProductCard from '../../components/storefront/ProductCard'
import { handleImageError } from '../../utils/imageFallback'
import { cldUrl } from '../../lib/cloudinary'
import { getProductImages } from '../../utils/productImages'

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

  // Resolve all gallery images in sort_order
  const productImages = useMemo(() => {
    return getProductImages(product)
  }, [product])

  // Default to index of cover image
  const initialIndex = useMemo(() => {
    const idx = productImages.findIndex(i => i.is_cover)
    return idx >= 0 ? idx : 0
  }, [productImages])

  const [activeImageIndex, setActiveImageIndex] = useState(initialIndex)
  const [isImageLoading, setIsImageLoading] = useState(true)

  // Reset active image index when product changes or images list refreshes
  useEffect(() => {
    setActiveImageIndex(initialIndex)
    setIsImageLoading(true)
  }, [product?.id, initialIndex])

  const activeImage = productImages[activeImageIndex] || productImages[0] || { image_url: product?.image_url }

  // Touch swipe support for mobile gallery
  const touchStartXRef = useRef(null)
  const touchEndXRef = useRef(null)

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX
    touchEndXRef.current = e.touches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null || touchEndXRef.current === null) return
    const diff = touchStartXRef.current - touchEndXRef.current
    const minSwipeDistance = 40
    if (diff > minSwipeDistance && productImages.length > 1) {
      // Swiped left -> next image
      setActiveImageIndex(prev => (prev + 1) % productImages.length)
      setIsImageLoading(true)
    } else if (diff < -minSwipeDistance && productImages.length > 1) {
      // Swiped right -> prev image
      setActiveImageIndex(prev => (prev - 1 + productImages.length) % productImages.length)
      setIsImageLoading(true)
    }
    touchStartXRef.current = null
    touchEndXRef.current = null
  }

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

        {/* Product Image & Gallery */}
        <div className="lg:col-span-6 space-y-3">
          <div 
            className="relative aspect-[4/5] sm:aspect-square lg:aspect-[4/5] rounded-[16px] overflow-hidden bg-[#18181b] border border-[#E5E5E5] flex items-center justify-center group shadow-xs select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Ambient Blurred Glow for Non-Square / Custom Images */}
            {activeImage?.image_url && (
              <div
                className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-125 pointer-events-none transition-all duration-300"
                style={{ backgroundImage: `url(${activeImage.image_url})` }}
                aria-hidden="true"
              />
            )}

            {/* Skeleton / Shimmer placeholder while loading */}
            {isImageLoading && (
              <div className="absolute inset-0 bg-[#27272a] animate-pulse z-15 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
              </div>
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

            {/* Navigation arrows for desktop when multiple images exist */}
            {productImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveImageIndex(prev => (prev - 1 + productImages.length) % productImages.length)
                    setIsImageLoading(true)
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#111111] flex items-center justify-center shadow-md backdrop-blur-xs transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Previous photo"
                >
                  <CaretLeft size={18} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveImageIndex(prev => (prev + 1) % productImages.length)
                    setIsImageLoading(true)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#111111] flex items-center justify-center shadow-md backdrop-blur-xs transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Next photo"
                >
                  <CaretRight size={18} weight="bold" />
                </button>
              </>
            )}

            <img
              key={activeImage?.image_url}
              src={cldUrl(activeImage?.image_url, { width: 1200 })}
              alt={`${product.name} - photo ${activeImageIndex + 1}`}
              onLoad={() => setIsImageLoading(false)}
              onError={(e) => {
                setIsImageLoading(false)
                handleImageError(e)
              }}
              onClick={() => setIsLightboxOpen(true)}
              className={`relative z-10 w-full h-full cursor-zoom-in transition-all duration-300 ${
                imageFit === 'cover' ? 'object-cover' : 'object-contain p-2'
              } ${isSoldOut ? 'grayscale-[30%]' : ''}`}
            />

            {isSoldOut && (
              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(17,17,17,0.4)' }}>
                <span className="px-5 py-2 rounded-[12px] bg-[#DC2626] text-white font-bold text-sm tracking-widest uppercase">
                  Sold Out
                </span>
              </div>
            )}
          </div>

          {/* ── Thumbnail Strip (Only shown when > 1 image) ── */}
          {productImages.length > 1 && (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
              {productImages.map((img, idx) => {
                const isSelected = idx === activeImageIndex
                return (
                  <button
                    key={img.id || `${img.image_url}-${idx}`}
                    type="button"
                    onClick={() => {
                      if (idx !== activeImageIndex) {
                        setActiveImageIndex(idx)
                        setIsImageLoading(true)
                      }
                    }}
                    className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-[12px] overflow-hidden bg-[#18181b]/5 flex-shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-[#111111] ring-offset-2 scale-100 shadow-sm'
                        : 'opacity-70 hover:opacity-100 border border-[#E5E5E5]'
                    }`}
                    title={`View photo ${idx + 1}`}
                  >
                    <img
                      src={cldUrl(img.image_url, { width: 160, height: 160, crop: 'fill' })}
                      alt={`Thumbnail ${idx + 1}`}
                      onError={handleImageError}
                      className="w-full h-full object-cover"
                    />
                    {img.is_cover && (
                      <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded-[4px] bg-black/80 text-[8px] font-bold text-white uppercase tracking-tight">
                        Cover
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
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

            {/* Share */}
            <div className="flex items-center justify-end pt-2 border-t border-[#E5E5E5] text-xs text-[#6B6B6B]">
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 hover:text-[#111111] font-medium transition-colors cursor-pointer"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="relative max-w-4xl w-full max-h-[92vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between mb-3 text-white">
              <span className="text-xs text-white/70 font-medium">
                Photo {activeImageIndex + 1} of {productImages.length}
              </span>
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
              >
                <span>Close</span>
                <X size={16} />
              </button>
            </div>
            
            <div className="relative flex items-center justify-center w-full">
              {productImages.length > 1 && (
                <button
                  onClick={() => setActiveImageIndex(prev => (prev - 1 + productImages.length) % productImages.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Previous image"
                >
                  <CaretLeft size={22} weight="bold" />
                </button>
              )}

              <img
                src={activeImage?.image_url}
                alt={product.name}
                className="max-w-full max-h-[78vh] object-contain rounded-xl shadow-2xl bg-black/40 border border-white/10"
              />

              {productImages.length > 1 && (
                <button
                  onClick={() => setActiveImageIndex(prev => (prev + 1) % productImages.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Next image"
                >
                  <CaretRight size={22} weight="bold" />
                </button>
              )}
            </div>

            {/* Lightbox thumbnail row if > 1 image */}
            {productImages.length > 1 && (
              <div className="flex items-center gap-2 mt-4 overflow-x-auto max-w-full py-1">
                {productImages.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      idx === activeImageIndex ? 'border-white scale-105' : 'border-white/30 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
