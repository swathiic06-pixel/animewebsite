import React, { useState, useRef, useMemo } from 'react'
import { Sparkles, AlertCircle, Upload, Loader2, X, Link as LinkIcon, Check } from 'lucide-react'
import { useApp, generateSlug } from '../../context/AppContext'
import { uploadImage, isCloudinaryConfigured, PRESETS } from '../../lib/cloudinary'

export default function ProductForm({ initialProduct = null, onSubmit, onCancel, isSubmitting = false }) {
  const { products = [], categories = [] } = useApp()
  const fileInputRef = useRef(null)

  // Sort categories strictly by display_order (1 to 8)
  const sortedCategories = React.useMemo(() => {
    return [...categories].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
  }, [categories])

  // Find initial category ID
  const defaultCategory = sortedCategories.find(
    c => c.id === initialProduct?.category_id || 
         c.name.toLowerCase() === (initialProduct?.category || '').toLowerCase()
  ) || sortedCategories[0]

  const [formData, setFormData] = useState({
    name: initialProduct?.name || '',
    description: initialProduct?.description || '',
    price: initialProduct?.price !== undefined ? initialProduct.price : '',
    category_id: initialProduct?.category_id || defaultCategory?.id || '',
    category: initialProduct?.category || defaultCategory?.name || '',
    series: initialProduct?.series || '',
    edition: initialProduct?.edition || '',
    color: initialProduct?.color || '',
    hw_num: initialProduct?.hw_num !== undefined ? initialProduct.hw_num : '',
    image_url: initialProduct?.image_url || '',
    stock: initialProduct?.stock !== undefined ? initialProduct.stock : 10,
    in_stock: initialProduct?.in_stock !== undefined ? Boolean(initialProduct.in_stock) : true,
    display_section: initialProduct?.display_section || 'grid',
    sort_order: initialProduct?.sort_order !== undefined ? initialProduct.sort_order : 0,
  })

  // Image upload state
  const [uploadMode, setUploadMode] = useState('url') // 'url' | 'file'
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [confirmReplace, setConfirmReplace] = useState(false)
  const [errors, setErrors] = useState({})

  // Detect collisions with existing placed products
  const collisionWarning = useMemo(() => {
    const otherProducts = products.filter(p => p.id !== initialProduct?.id)

    if (formData.display_section === 'hero') {
      const heroHolder = otherProducts.find(p => p.display_section === 'hero')
      if (heroHolder) {
        return `Hero Banner is currently showing "${heroHolder.name}". Assigning this product will replace it.`
      }
    }

    if (formData.display_section === 'spotlight') {
      const spotHolder = otherProducts.find(p => p.display_section === 'spotlight')
      if (spotHolder) {
        return `Spotlight Card is currently showing "${spotHolder.name}". Assigning this product will replace it.`
      }
    }

    if (formData.display_section === 'favourites') {
      const favHolders = otherProducts.filter(p => p.display_section === 'favourites')
      if (favHolders.length >= 2) {
        const sortedFavs = [...favHolders].sort((a, b) => (b.sort_order || 0) - (a.sort_order || 0))
        return `Favourites Carousel already has 2 products (${favHolders.map(p => `"${p.name}"`).join(', ')}). Assigning this product will replace "${sortedFavs[0].name}".`
      }
    }

    return null
  }, [formData.display_section, products, initialProduct])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (errors[name] || (name === 'display_section' && errors.placement)) {
      setErrors((prev) => ({ ...prev, [name]: undefined, placement: undefined }))
    }
  }

  // ── File upload via Cloudinary ────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError('')
    setIsUploading(true)
    setErrors(prev => ({ ...prev, image_url: undefined }))

    try {
      const { secure_url } = await uploadImage(file, PRESETS.products)
      setFormData(prev => ({ ...prev, image_url: secure_url }))
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Product name is required'
    if (!formData.price || isNaN(formData.price) || Number(formData.price) < 0) {
      newErrors.price = 'Valid price is required'
    }
    if (!formData.image_url.trim()) newErrors.image_url = 'Image URL is required — upload a photo or paste a URL'
    if (collisionWarning && !confirmReplace) {
      newErrors.placement = 'Please confirm replacing the currently featured product before saving'
    }
    return newErrors
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isUploading) return
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    const hwParsed = formData.hw_num !== '' && !isNaN(formData.hw_num) ? parseInt(formData.hw_num) : undefined
    const sortOrderParsed = formData.sort_order !== '' && !isNaN(formData.sort_order)
      ? parseInt(formData.sort_order)
      : (hwParsed !== undefined ? hwParsed : 0)

    const selectedCat = categories.find(c => c.id === formData.category_id || c.name === formData.category)
    const catId = selectedCat?.id || formData.category_id || null
    const catName = selectedCat?.name || formData.category || 'General'
    const catSlug = selectedCat?.slug || generateSlug(catName)

    onSubmit({
      ...formData,
      category_id: catId,
      category: catName,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock) || 0,
      in_stock: Boolean(formData.in_stock),
      hw_num: hwParsed,
      sort_order: sortOrderParsed,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 font-sans text-[#111827]">
      {/* Product Name */}
      <div>
        <label className="block text-xs font-semibold text-[#111827] mb-1.5">
          Product Title <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Gojo Satoru 1/7 Scale Shibuya Arc Figure"
          className="w-full bg-white border border-[#EDEDED] rounded-xl px-3.5 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
        />
        {errors.name && (
          <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" /> {errors.name}
          </p>
        )}
      </div>

      {/* Category & Price */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#111827] mb-1.5">
            Category <span className="text-rose-500">*</span>
          </label>
          <select
            name="category_id"
            value={formData.category_id || ''}
            onChange={(e) => {
              const selected = categories.find(c => c.id === e.target.value)
              setFormData(prev => ({
                ...prev,
                category_id: e.target.value,
                category: selected ? selected.name : prev.category
              }))
            }}
            className="w-full bg-white border border-[#EDEDED] rounded-xl px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] cursor-pointer"
          >
            {sortedCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#111827] mb-1.5">
            Price (₹ INR) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            name="price"
            min="0"
            step="1"
            value={formData.price}
            onChange={handleChange}
            placeholder="e.g. 1499"
            className="w-full bg-white border border-[#EDEDED] rounded-xl px-3.5 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
          />
          {errors.price && (
            <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.price}
            </p>
          )}
        </div>
      </div>

      {/* Stock and In-Stock Toggle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        <div>
          <label className="block text-xs font-semibold text-[#111827] mb-1.5">
            Inventory Units
          </label>
          <input
            type="number"
            name="stock"
            min="0"
            value={formData.stock}
            onChange={handleChange}
            className="w-full bg-white border border-[#EDEDED] rounded-xl px-3.5 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
          />
        </div>

        <div className="pt-0 sm:pt-6">
          <label className="flex items-center gap-2.5 text-xs text-[#111827] font-semibold cursor-pointer bg-[#F5F6F8] p-2.5 rounded-xl border border-[#EDEDED] hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              name="in_stock"
              checked={Boolean(formData.in_stock)}
              onChange={handleChange}
              className="rounded border-[#EDEDED] text-[#3B82F6] focus:ring-[#3B82F6] w-4 h-4 accent-[#3B82F6]"
            />
            <span>Mark as In-Stock on Storefront</span>
          </label>
        </div>
      </div>

      {/* Series, Edition, Color (Optional Collector Meta) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#111827] mb-1.5">
            Anime / Series
          </label>
          <input
            type="text"
            name="series"
            value={formData.series}
            onChange={handleChange}
            placeholder="e.g. Jujutsu Kaisen"
            className="w-full bg-white border border-[#EDEDED] rounded-xl px-3.5 py-2 text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#111827] mb-1.5">
            Edition / Variant
          </label>
          <input
            type="text"
            name="edition"
            value={formData.edition}
            onChange={handleChange}
            placeholder="e.g. Limited Scale, Chase"
            className="w-full bg-white border border-[#EDEDED] rounded-xl px-3.5 py-2 text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#111827] mb-1.5">
            Color / Theme
          </label>
          <input
            type="text"
            name="color"
            value={formData.color}
            onChange={handleChange}
            placeholder="e.g. Metallic Black"
            className="w-full bg-white border border-[#EDEDED] rounded-xl px-3.5 py-2 text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
          />
        </div>
      </div>

      {/* Homepage Placement Control */}
      <div className="p-4 rounded-xl bg-[#F5F6F8] border border-[#EDEDED] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Where should this show on the homepage?</span>
            </label>
            <select
              name="display_section"
              value={formData.display_section}
              onChange={(e) => {
                handleChange(e)
                setConfirmReplace(false)
              }}
              className="w-full bg-white border border-[#EDEDED] rounded-xl px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] cursor-pointer"
            >
              <option value="grid">Product Grid (Default)</option>
              <option value="hero">Hero Banner (Single Slot)</option>
              <option value="spotlight">Spotlight Card (Single Slot)</option>
              <option value="favourites">Favourites Carousel (Max 2)</option>
            </select>
          </div>

          {formData.display_section !== 'grid' && (
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                Sort Order (Lower = Shown First)
              </label>
              <input
                type="number"
                name="sort_order"
                min="0"
                step="1"
                value={formData.sort_order}
                onChange={handleChange}
                placeholder="0"
                className="w-full bg-white border border-[#EDEDED] rounded-xl px-3.5 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
              />
            </div>
          )}
        </div>

        {/* Inline Collision Warning Banner */}
        {collisionWarning && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {collisionWarning}
              </p>
            </div>
            <label className="flex items-center gap-2 pt-1 font-bold text-amber-950 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmReplace}
                onChange={(e) => {
                  setConfirmReplace(e.target.checked)
                  if (errors.placement) setErrors(prev => ({ ...prev, placement: undefined }))
                }}
                className="rounded border-amber-400 text-[#3B82F6] focus:ring-[#3B82F6] w-4 h-4 accent-[#3B82F6]"
              />
              <span>Confirm replacement</span>
            </label>
            {errors.placement && (
              <p className="text-rose-600 text-xs font-semibold">
                {errors.placement}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Product Image ───────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-[#F5F6F8] border border-[#EDEDED] space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[#111827]">
            Product Image <span className="text-rose-500">*</span>
          </label>
          
          {/* Toggle between upload and URL modes — Blue accent for active */}
          <div className="flex items-center gap-1 bg-white border border-[#EDEDED] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setUploadMode('url')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                uploadMode === 'url'
                  ? 'bg-[#3B82F6] text-white shadow-2xs'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <LinkIcon className="w-3 h-3" />
              URL
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('file')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                uploadMode === 'file'
                  ? 'bg-[#3B82F6] text-white shadow-2xs'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <Upload className="w-3 h-3" />
              Upload
            </button>
          </div>
        </div>

        {uploadMode === 'file' ? (
          /* ── File Upload ── */
          <div className="space-y-2">
            {!isCloudinaryConfigured && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span>Cloudinary not configured — set <code className="font-mono bg-white px-1 rounded border border-amber-200">VITE_CLOUDINARY_CLOUD_NAME</code> in <code className="font-mono bg-white px-1 rounded border border-amber-200">.env</code> to enable direct file uploads.</span>
              </div>
            )}

            <label className={`flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              isUploading ? 'border-[#EDEDED] bg-gray-50' : 'border-[#D1D5DB] hover:border-[#3B82F6] bg-white'
            }`}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                onChange={handleFileChange}
                disabled={isUploading || !isCloudinaryConfigured}
                className="hidden"
              />
              {isUploading ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-[#111827]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#3B82F6]" />
                  <span>Uploading to Cloudinary...</span>
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <Upload className="w-5 h-5 text-[#6B7280] mx-auto" />
                  <p className="text-xs text-[#111827] font-medium">
                    Click to browse or drag &amp; drop
                  </p>
                  <p className="text-[11px] text-[#9CA3AF]">
                    JPG, PNG, WebP · max 5 MB
                  </p>
                </div>
              )}
            </label>

            {uploadError && (
              <p className="text-rose-500 text-xs flex items-start gap-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </p>
            )}
          </div>
        ) : (
          /* ── URL Input ── */
          <div className="relative">
            <input
              type="url"
              name="image_url"
              value={formData.image_url}
              onChange={handleChange}
              placeholder="https://res.cloudinary.com/... or any image URL"
              className="w-full bg-white border border-[#EDEDED] rounded-xl pl-9 pr-4 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
            />
            <LinkIcon className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-3" />
          </div>
        )}

        {errors.image_url && (
          <p className="text-rose-500 text-xs flex items-center gap-1 font-medium">
            <AlertCircle className="w-3 h-3" /> {errors.image_url}
          </p>
        )}

        {/* Image preview */}
        {formData.image_url && (
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-[#EDEDED] shadow-2xs">
            <div className="relative w-14 h-14 flex-shrink-0">
              <img
                src={formData.image_url}
                alt="Preview"
                className="w-14 h-14 object-cover rounded-lg bg-gray-50 border border-[#EDEDED]"
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-white hover:bg-rose-600 transition-colors shadow-2xs"
                title="Remove image"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="text-xs text-[#6B7280] min-w-0">
              <p className="text-[#111827] font-semibold">Image Preview</p>
              <p className="truncate text-[11px] text-[#9CA3AF]">{formData.image_url}</p>
              {formData.image_url.includes('res.cloudinary.com') && (
                <p className="text-emerald-600 text-[10px] font-semibold mt-0.5 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Cloudinary CDN
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-[#111827] mb-1.5">
          Product Description
        </label>
        <textarea
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          placeholder="Detailed product description, scale, packaging, and authenticity notes..."
          className="w-full bg-white border border-[#EDEDED] rounded-xl px-3.5 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
        />
      </div>

      {/* Modal Actions */}
      <div className="pt-3 border-t border-[#EDEDED] flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4B5563] bg-white border border-[#EDEDED] hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="px-5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold shadow-2xs transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <span>{initialProduct ? 'Update Product' : 'Save Product'}</span>
          )}
        </button>
      </div>

    </form>
  )
}
