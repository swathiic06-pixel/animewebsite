import React, { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Heart,
  Faders,
  MagnifyingGlass,
  Sparkle,
  ShoppingBag,
  Check,
  X,
  ArrowRight
} from '@phosphor-icons/react'
import { useApp } from '../../context/AppContext'
import { useCart } from '../../context/CartContext'
import { formatPrice } from '../../utils/formatPrice'
import { handleImageError } from '../../utils/imageFallback'
import { cldUrl } from '../../lib/cloudinary'
import { getProductCoverImage } from '../../utils/productImages'

export default function Home() {
  const { products, categories = [], banners = {} } = useApp()
  const heroBanner = banners?.hero
  const { addToCart, items } = useCart()

  const [searchParams, setSearchParams] = useSearchParams()

  // URL State — default 'all'
  const activeCategory = searchParams.get('category') || 'all'
  const searchQuery = searchParams.get('q') || ''

  // UI State
  const [showSearchInput, setShowSearchInput] = useState(Boolean(searchQuery))
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  const [sortBy, setSortBy] = useState('featured')
  const [inStockOnly, setInStockOnly] = useState(false)

  // Local Wishlist state
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem('animemax_wishlist')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('animemax_wishlist', JSON.stringify(wishlist))
    } catch {
      // quota or private mode fallback
    }
  }, [wishlist])

  const toggleWishlist = (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    setWishlist(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  // Dynamic Category Pills from categories table, ordered by display_order with 'All' first
  const filterPills = useMemo(() => {
    const allPill = { id: 'all', label: 'All' }
    const sorted = [...categories].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    const categoryPills = sorted.map(c => ({
      id: c.slug || c.id,
      categoryId: c.id,
      slug: c.slug,
      label: c.name
    }))
    return [allPill, ...categoryPills]
  }, [categories])

  const handleCategoryChange = (catId) => {
    if (!catId || catId === 'all') {
      searchParams.delete('category')
    } else {
      searchParams.set('category', catId)
    }
    setSearchParams(searchParams)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (localSearch.trim()) {
      searchParams.set('q', localSearch.trim())
    } else {
      searchParams.delete('q')
    }
    setSearchParams(searchParams)
  }

  // Selected Category Object
  const isAll = !activeCategory || activeCategory.toLowerCase() === 'all'
  const activeCategoryObj = useMemo(() => {
    if (isAll) return null
    const lower = activeCategory.toLowerCase()
    return categories.find(
      c => (c.slug && c.slug.toLowerCase() === lower) ||
           (c.id && c.id === activeCategory) ||
           (c.name && c.name.toLowerCase() === lower)
    ) || null
  }, [categories, activeCategory, isAll])

  // Filtered & Sorted Catalog
  const filteredCatalog = useMemo(() => {
    return products.filter((item) => {
      // Category matching:
      // When active tab is 'all', skip category filter entirely
      let matchesCat = isAll
      if (!matchesCat) {
        const lowerActive = activeCategory.toLowerCase()
        const itemCat = (item.category || '').toLowerCase()
        const itemSeries = (item.series || '').toLowerCase()
        const itemCatId = item.category_id

        if (activeCategoryObj && itemCatId && itemCatId === activeCategoryObj.id) {
          matchesCat = true
        } else if (activeCategoryObj && (itemCat === activeCategoryObj.name.toLowerCase() || itemCat === activeCategoryObj.slug.toLowerCase())) {
          matchesCat = true
        } else if (itemCat === lowerActive || itemSeries === lowerActive) {
          matchesCat = true
        }
      }

      const q = searchQuery.toLowerCase().trim()
      const matchesQuery = !q ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.series && item.series.toLowerCase().includes(q)) ||
        (item.edition && item.edition.toLowerCase().includes(q)) ||
        (item.color && item.color.toLowerCase().includes(q)) ||
        (item.hw_num && String(item.hw_num) === q) ||
        (item.hw_num && String(item.hw_num).includes(q)) ||
        (item.sort_order && String(item.sort_order).includes(q))

      // In stock checking: true boolean, 'true' string, or stock count
      const isInStock = item.in_stock === true || item.in_stock === 'true' || item.in_stock === 1
      const matchesStock = !inStockOnly || isInStock

      return matchesCat && matchesQuery && matchesStock
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price
      if (sortBy === 'price-high') return b.price - a.price
      if (sortBy === 'hw-asc') return (a.sort_order ?? a.hw_num ?? 999) - (b.sort_order ?? b.hw_num ?? 999)
      if (sortBy === 'hw-desc') return (b.sort_order ?? b.hw_num ?? 999) - (a.sort_order ?? a.hw_num ?? 999)
      const orderA = a.sort_order !== undefined && a.sort_order !== null ? a.sort_order : 999
      const orderB = b.sort_order !== undefined && b.sort_order !== null ? b.sort_order : 999
      if (orderA !== orderB) return orderA - orderB
      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    })
  }, [products, isAll, activeCategory, activeCategoryObj, searchQuery, inStockOnly, sortBy])


  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── Hero Banner Section (Kinetic Editorial Style) ─────────────── */}
      {heroBanner && isAll && !searchQuery && (
        <div className="relative rounded-[16px] overflow-hidden border border-[#E5E5E5] bg-[#F8F8F6] p-6 sm:p-8 flex flex-col justify-between min-h-[220px] sm:min-h-[260px]">
          <div className="relative z-10 max-w-lg space-y-3">
            {heroBanner.eyebrow_tag && (
              <span className="inline-flex items-center px-3 py-1 rounded-[12px] text-xs font-bold bg-[#111111] text-white uppercase tracking-wider font-['Inter']">
                {heroBanner.eyebrow_tag}
              </span>
            )}
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#111111] tracking-tight leading-tight font-['Syne']">
              {heroBanner.headline || 'GET UP TO 50% OFF'}
            </h2>
            {heroBanner.subtext && (
              <p className="text-sm text-[#6B6B6B] leading-relaxed max-w-md font-['Inter']">
                {heroBanner.subtext}
              </p>
            )}
            {heroBanner.cta_text && (
              <div className="pt-2">
                <a
                  href={heroBanner.cta_link || '#catalog-view'}
                  className="sf-btn-primary inline-flex items-center gap-2"
                >
                  <span>{heroBanner.cta_text}</span>
                  <ArrowRight size={16} />
                </a>
              </div>
            )}
          </div>
          {heroBanner.image_url && (
            <div className="absolute right-0 bottom-0 top-0 w-1/2 sm:w-5/12 pointer-events-none overflow-hidden flex items-end justify-end opacity-40 sm:opacity-90">
              <img
                src={heroBanner.image_url}
                alt={heroBanner.headline || 'Hero promotional banner'}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#F8F8F6] via-[#F8F8F6]/40 to-transparent" />
            </div>
          )}
        </div>
      )}

      {/* ── Page Header: Title + Filter Pills + Search/Filters ─────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0 w-full">

        <div className="space-y-3 min-w-0 flex-1 max-w-full">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#111111] tracking-tight" style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>
            Explore
          </h1>

          {/* Filter chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            {filterPills.map((pill) => {
              const isActive = activeCategory === pill.id
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => handleCategoryChange(pill.id)}
                  className={['sf-chip whitespace-nowrap', isActive ? 'active' : ''].join(' ')}
                >
                  {pill.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {showSearchInput ? (
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                autoFocus
                placeholder="Search products..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="sf-input pl-9 pr-8 w-48 sm:w-60"
                style={{ height: '40px' }}
              />
              <MagnifyingGlass size={16} className="text-[#6B6B6B] absolute left-3 pointer-events-none" />
              <button
                type="button"
                onClick={() => {
                  setShowSearchInput(false)
                  setLocalSearch('')
                  searchParams.delete('q')
                  setSearchParams(searchParams)
                }}
                className="absolute right-2.5 p-1 text-[#6B6B6B] hover:text-[#111111]"
              >
                <X size={14} />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowSearchInput(true)}
              className="sf-btn-secondary h-10 px-3"
              style={{ height: '40px' }}
              title="Search store"
            >
              <MagnifyingGlass size={20} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowFiltersModal(true)}
            className="relative sf-btn-secondary h-10 px-4 gap-2"
            style={{ height: '40px' }}
          >
            <Faders size={16} />
            <span className="text-sm">Filters</span>
            {(inStockOnly || sortBy !== 'featured') && (
              <span className="w-2 h-2 rounded-[12px] bg-[#DC2626]" />
            )}
          </button>
        </div>
      </div>

      {/* ── Product Catalog ─────────────────────────────────────────────── */}
      <section id="catalog-view" className="space-y-4">

        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
          <div>
            <h2 className="text-xl font-bold text-[#111111]" style={{ fontFamily: 'Syne, sans-serif' }}>
              All Products ({filteredCatalog.length})
            </h2>
            <p className="text-sm text-[#6B6B6B] mt-0.5">
              {isAll ? 'Showing all items' : `Category: ${activeCategoryObj?.name || activeCategory}`}
              {searchQuery && ` · "${searchQuery}"`}
            </p>

          </div>

          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                searchParams.delete('q')
                setSearchParams(searchParams)
              }}
              className="text-sm font-medium text-[#DC2626] hover:underline flex items-center gap-1"
            >
              <span>Clear "{searchQuery}"</span>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Product Cards Grid */}
        {filteredCatalog.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredCatalog.map((product) => {
              const isCarted = items.some(i => i.id === product.id)
              const isWished = wishlist.includes(product.id)

              return (
                <div key={product.id} className="sf-product-card group relative flex flex-col">

                  {/* Top badges + wishlist */}
                  <div className="flex items-center justify-between p-3 pb-0 z-10">
                    <div className="flex items-center gap-1 flex-wrap">
                      {product.hw_num && (
                        <span className="sf-badge text-[10px] px-1.5 py-0.5">HW# {product.hw_num}</span>
                      )}
                      <span className="sf-badge text-[10px] px-1.5 py-0.5">
                        {product.series || product.category || 'Merch'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className="p-1.5 rounded-[12px] bg-white border border-[#E5E5E5] text-[#6B6B6B] hover:text-[#DC2626] hover:border-[#DC2626] transition-colors"
                      aria-label="Wishlist item"
                    >
                      <Heart
                        size={14}
                        weight={isWished ? 'fill' : 'regular'}
                        className={isWished ? 'text-[#DC2626]' : ''}
                      />
                    </button>
                  </div>

                  {/* Product Image */}
                  {(() => {
                    const coverImageUrl = getProductCoverImage(product)
                    return (
                      <Link
                        to={`/product/${product.id}`}
                        className="relative aspect-square overflow-hidden bg-[#18181b]/5 m-3 rounded-[12px] border border-[#E5E5E5] flex items-center justify-center p-2 block group"
                      >
                        {coverImageUrl && (
                          <div
                            className="absolute inset-0 bg-cover bg-center blur-md opacity-25 scale-125 pointer-events-none"
                            style={{ backgroundImage: `url(${coverImageUrl})` }}
                            aria-hidden="true"
                          />
                        )}
                        <img
                          src={cldUrl(coverImageUrl, { width: 400, height: 400, crop: 'limit' })}
                          alt={product.name}
                          loading="lazy"
                          onError={handleImageError}
                          className="sf-product-img relative z-10 max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                        {!product.in_stock && (
                          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[12px]" style={{ background: 'rgba(17,17,17,0.4)' }}>
                            <span className="px-3 py-1 rounded-[12px] bg-[#DC2626] text-white text-[10px] font-bold tracking-widest uppercase">
                              Sold Out
                            </span>
                          </div>
                        )}
                      </Link>
                    )
                  })()}

                  {/* Product Details */}
                  <div className="px-3 pb-3">
                    <Link to={`/product/${product.id}`}>
                      <h3 className="text-xs sm:text-sm font-semibold text-[#111111] line-clamp-1 hover:text-[#DC2626] transition-colors">
                        {product.name}
                      </h3>
                    </Link>

                    {(product.edition || product.color) && (
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[#6B6B6B] truncate">
                        {product.edition && (
                          <span className="px-1 py-0.5 rounded-[12px] bg-white border border-[#E5E5E5] font-semibold text-[#111111]">
                            {product.edition}
                          </span>
                        )}
                        {product.color && product.color !== product.edition && (
                          <span className="text-[#6B6B6B] truncate">· {product.color}</span>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-[#6B6B6B] line-clamp-1 mt-0.5">{product.description}</p>

                    {/* Price + Add */}
                    <div className="mt-3 pt-2 border-t border-[#E5E5E5] flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#DC2626]">
                        {formatPrice(product.price)}
                      </span>

                      <button
                        type="button"
                        onClick={() => addToCart(product, 1)}
                        disabled={!product.in_stock}
                        className={[
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-xs font-semibold transition-all',
                          !product.in_stock
                            ? 'bg-[#F8F8F6] text-[#6B6B6B] cursor-not-allowed border border-[#E5E5E5]'
                            : isCarted
                            ? 'bg-white text-[#111111] border border-[#E5E5E5] hover:bg-[#F1F1EE]'
                            : 'bg-[#111111] hover:bg-[#DC2626] text-white border-none'
                        ].join(' ')}
                      >
                        {isCarted ? (
                          <><Check size={14} /><span>Added</span></>
                        ) : (
                          <><ShoppingBag size={14} /><span>{product.in_stock ? 'Add' : 'Out'}</span></>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="sf-empty-state my-6">
            <Sparkle size={32} className="text-[#6B6B6B] mb-4" />
            <h3 className="text-xl font-bold text-[#111111] mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
              No products found
            </h3>
            <p className="text-sm text-[#6B6B6B] max-w-[45ch] mb-6">
              We couldn't find any products matching your filters or search.
            </p>
            <button
              type="button"
              onClick={() => {
                handleCategoryChange('all')
                setInStockOnly(false)
                setSortBy('featured')
                searchParams.delete('q')
                setSearchParams(searchParams)
              }}
              className="sf-btn-primary"
            >
              Reset Filters
            </button>
          </div>
        )}

      </section>

      {/* ── Filters Modal ─────────────────────────────────────────────────── */}
      {showFiltersModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sf-animate-fade-in"
          style={{ background: 'rgba(17,17,17,0.4)' }}
        >
          <div className="bg-white rounded-[12px] border border-[#E5E5E5] max-w-sm w-full p-6 relative sf-animate-slide-up">
            <button
              onClick={() => setShowFiltersModal(false)}
              className="absolute top-4 right-4 p-2 rounded-[12px] text-[#6B6B6B] hover:text-[#111111] hover:bg-[#F8F8F6] transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-[#111111] mb-5" style={{ fontFamily: 'Syne, sans-serif' }}>Filter Products</h3>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#111111] mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="sf-input"
                  style={{ height: '48px' }}
                >
                  <option value="featured">Featured / HW# Position (Default)</option>
                  <option value="hw-asc">HW# Low → High</option>
                  <option value="hw-desc">HW# High → Low</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[#111111] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="rounded-[4px] border-[#E5E5E5] text-[#DC2626] focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Show In-Stock Only</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => { setInStockOnly(false); setSortBy('featured') }}
                className="sf-btn-secondary flex-1"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setShowFiltersModal(false)}
                className="sf-btn-primary flex-1"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
