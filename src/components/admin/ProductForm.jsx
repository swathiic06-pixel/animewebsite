import React, { useState, useRef, useMemo } from 'react'
import { 
  Sparkles, 
  AlertCircle, 
  Upload, 
  Loader2, 
  X, 
  Link as LinkIcon, 
  Check, 
  Star, 
  Trash2, 
  ArrowLeft, 
  ArrowRight,
  GripVertical,
  Plus,
  Image as ImageIcon
} from 'lucide-react'
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

  // Gallery images state (array of { id, image_url, sort_order, is_cover })
  const [galleryImages, setGalleryImages] = useState(() => {
    if (Array.isArray(initialProduct?.images) && initialProduct.images.length > 0) {
      return [...initialProduct.images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    }
    if (initialProduct?.image_url) {
      return [{
        id: 'img-' + Date.now(),
        image_url: initialProduct.image_url,
        sort_order: 0,
        is_cover: true
      }]
    }
    return []
  })

  // Pending asynchronous uploads [{ id, name }]
  const [uploadingFiles, setUploadingFiles] = useState([])
  const [urlInput, setUrlInput] = useState('')
  const [uploadMode, setUploadMode] = useState('file') // 'file' | 'url'
  const [isDragActive, setIsDragActive] = useState(false)
  const [draggedIdx, setDraggedIdx] = useState(null)
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

  const MAX_IMAGES = 8

  // ── Multi-file Upload via Cloudinary ────────────────────────────────────
  const handleFilesUpload = async (filesList) => {
    if (!filesList || filesList.length === 0) return
    setUploadError('')

    const currentTotal = galleryImages.length + uploadingFiles.length
    const availableSlots = MAX_IMAGES - currentTotal
    if (availableSlots <= 0) {
      setUploadError(`Maximum cap of ${MAX_IMAGES} photos reached per product.`)
      return
    }

    const filesToProcess = Array.from(filesList).slice(0, availableSlots)
    if (filesList.length > availableSlots) {
      setUploadError(`Only ${availableSlots} more photo(s) could be added (max ${MAX_IMAGES}).`)
    }

    // Process each file
    for (const file of filesToProcess) {
      if (!file.type.match(/^image\/(jpeg|png|webp|jpg)$/i)) {
        setUploadError(`"${file.name}" is not a supported format. Please use JPG, PNG, or WebP.`)
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError(`"${file.name}" exceeds 5MB limit. Please compress before uploading.`)
        continue
      }

      const tempId = 'up-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)
      setUploadingFiles(prev => [...prev, { id: tempId, name: file.name }])

      try {
        const { secure_url } = await uploadImage(file, PRESETS.products)
        setGalleryImages(prev => {
          const hasCover = prev.some(img => img.is_cover)
          const newImg = {
            id: 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            image_url: secure_url,
            sort_order: prev.length,
            is_cover: !hasCover // first image uploaded automatically becomes cover
          }
          return [...prev, newImg]
        })
        setErrors(prev => ({ ...prev, images: undefined, image_url: undefined }))
      } catch (err) {
        setUploadError(`Failed to upload "${file.name}": ${err.message}`)
      } finally {
        setUploadingFiles(prev => prev.filter(u => u.id !== tempId))
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileInputChange = (e) => {
    handleFilesUpload(e.target.files)
  }

  // ── Drag & Drop Handlers for Dropzone ────────────────────────────────────
  const handleDropzoneDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }

  const handleDropzoneDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }

  const handleDropzoneDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files)
    }
  }

  // ── Add from URL ────────────────────────────────────────────────────────
  const handleAddUrl = (e) => {
    if (e) e.preventDefault()
    const trimmed = urlInput.trim()
    if (!trimmed) return

    if (galleryImages.length >= MAX_IMAGES) {
      setUploadError(`Maximum of ${MAX_IMAGES} photos reached per product.`)
      return
    }

    setGalleryImages(prev => {
      const hasCover = prev.some(img => img.is_cover)
      return [
        ...prev,
        {
          id: 'img-url-' + Date.now(),
          image_url: trimmed,
          sort_order: prev.length,
          is_cover: !hasCover
        }
      ]
    })
    setUrlInput('')
    setErrors(prev => ({ ...prev, images: undefined, image_url: undefined }))
  }

  // ── Set as Cover ────────────────────────────────────────────────────────
  const handleSetCover = (targetIdx) => {
    setGalleryImages(prev => prev.map((img, idx) => ({
      ...img,
      is_cover: idx === targetIdx
    })))
    setErrors(prev => ({ ...prev, images: undefined }))
  }

  // ── Delete Image with confirmation ──────────────────────────────────────
  const handleDeleteImage = (targetIdx) => {
    const target = galleryImages[targetIdx]
    if (galleryImages.length === 1) {
      if (!window.confirm('This is the only photo for this product. Products require at least one cover image. Are you sure you want to remove it?')) {
        return
      }
    } else if (target?.is_cover) {
      if (!window.confirm('This is currently the cover photo. Removing it will assign another photo as the cover. Continue?')) {
        return
      }
    }

    setGalleryImages(prev => {
      const filtered = prev.filter((_, idx) => idx !== targetIdx)
      if (target?.is_cover && filtered.length > 0) {
        filtered[0].is_cover = true
      }
      return filtered.map((img, idx) => ({ ...img, sort_order: idx }))
    })
  }

  // ── Reorder Images (Move Left / Right) ───────────────────────────────────
  const handleMoveImage = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= galleryImages.length) return
    setGalleryImages(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIdx, 1)
      updated.splice(toIdx, 0, moved)
      return updated.map((img, idx) => ({ ...img, sort_order: idx }))
    })
  }

  // ── Drag & Drop Reorder Handlers for Thumbnails ─────────────────────────
  const handleThumbnailDragStart = (e, index) => {
    setDraggedIdx(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleThumbnailDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleThumbnailDrop = (e, index) => {
    e.preventDefault()
    if (draggedIdx !== null && draggedIdx !== index) {
      handleMoveImage(draggedIdx, index)
    }
    setDraggedIdx(null)
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Product name is required'
    if (!formData.price || isNaN(formData.price) || Number(formData.price) < 0) {
      newErrors.price = 'Valid price is required'
    }
    if (galleryImages.length === 0 && uploadingFiles.length === 0) {
      newErrors.images = 'At least one product photo (the cover image) is required'
    } else if (galleryImages.length > 0 && !galleryImages.some(img => img.is_cover)) {
      newErrors.images = 'Please designate one photo as the Cover Image'
    }
    if (collisionWarning && !confirmReplace) {
      newErrors.placement = 'Please confirm replacing the currently featured product before saving'
    }
    return newErrors
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (uploadingFiles.length > 0) return
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

    // Determine the primary cover image URL
    const coverImage = galleryImages.find(img => img.is_cover) || galleryImages[0]
    const finalCoverUrl = coverImage?.image_url || formData.image_url || ''

    onSubmit({
      ...formData,
      image_url: finalCoverUrl,
      images: galleryImages,
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

      {/* ── Multi-Image Product Gallery ────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-[#F5F6F8] border border-[#EDEDED] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-semibold text-[#111827] flex items-center gap-1.5">
              <span>Product Gallery</span>
              <span className="text-rose-500">*</span>
              <span className="text-[11px] font-normal text-[#6B7280]">
                ({galleryImages.length}/{MAX_IMAGES} photos)
              </span>
            </label>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              Buyers can browse through these photos. Click the star on any photo to set it as the cover.
            </p>
          </div>
          
          {/* Toggle between Upload and URL modes */}
          <div className="flex items-center gap-1 bg-white border border-[#EDEDED] rounded-lg p-0.5">
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
          </div>
        </div>

        {/* Upload Mode UI */}
        {uploadMode === 'file' ? (
          <div className="space-y-2">
            {!isCloudinaryConfigured && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span>Cloudinary not configured — set <code className="font-mono bg-white px-1 rounded border border-amber-200">VITE_CLOUDINARY_CLOUD_NAME</code> in <code className="font-mono bg-white px-1 rounded border border-amber-200">.env</code> to enable direct file uploads.</span>
              </div>
            )}

            <label
              onDragOver={handleDropzoneDragOver}
              onDragLeave={handleDropzoneDragLeave}
              onDrop={handleDropzoneDrop}
              className={`flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-[#3B82F6] bg-blue-50/50'
                  : galleryImages.length >= MAX_IMAGES
                  ? 'border-[#EDEDED] bg-gray-50 cursor-not-allowed opacity-60'
                  : 'border-[#D1D5DB] hover:border-[#3B82F6] bg-white'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/jpg"
                onChange={handleFileInputChange}
                disabled={galleryImages.length >= MAX_IMAGES || !isCloudinaryConfigured}
                className="hidden"
              />
              <div className="text-center space-y-1">
                <Upload className="w-5 h-5 text-[#6B7280] mx-auto" />
                <p className="text-xs text-[#111827] font-medium">
                  {galleryImages.length >= MAX_IMAGES
                    ? `Maximum ${MAX_IMAGES} photos reached`
                    : 'Click to select multiple photos or drag & drop here'}
                </p>
                <p className="text-[11px] text-[#9CA3AF]">
                  Select up to 8 images at once · JPG, PNG, WebP · max 5 MB each
                </p>
              </div>
            </label>
          </div>
        ) : (
          /* URL input mode */
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddUrl(e) }}
                placeholder="Paste image URL (https://...)..."
                disabled={galleryImages.length >= MAX_IMAGES}
                className="w-full bg-white border border-[#EDEDED] rounded-xl pl-9 pr-4 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
              />
              <LinkIcon className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-3" />
            </div>
            <button
              type="button"
              onClick={handleAddUrl}
              disabled={!urlInput.trim() || galleryImages.length >= MAX_IMAGES}
              className="px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add URL</span>
            </button>
          </div>
        )}

        {/* Upload error display */}
        {uploadError && (
          <p className="text-rose-500 text-xs flex items-start gap-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </p>
        )}

        {errors.images && (
          <p className="text-rose-500 text-xs flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" /> {errors.images}
          </p>
        )}

        {/* Uploading queue indicators */}
        {uploadingFiles.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1D4ED8]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Uploading {uploadingFiles.length} photo(s) to Cloudinary...</span>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-[#2563EB]">
              {uploadingFiles.map(u => (
                <span key={u.id} className="bg-white/80 px-2 py-0.5 rounded-md border border-blue-200 truncate max-w-[200px]">
                  {u.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Thumbnail Grid with Controls ──────────────────────────────────── */}
        {galleryImages.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
              <span>Gallery Preview &amp; Order:</span>
              <span>Drag to reorder or use arrows</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {galleryImages.map((img, idx) => (
                <div
                  key={img.id || `${img.image_url}-${idx}`}
                  draggable
                  onDragStart={(e) => handleThumbnailDragStart(e, idx)}
                  onDragOver={handleThumbnailDragOver}
                  onDrop={(e) => handleThumbnailDrop(e, idx)}
                  className={`group relative rounded-xl border overflow-hidden bg-white shadow-2xs transition-all ${
                    img.is_cover
                      ? 'border-[#3B82F6] ring-2 ring-[#3B82F6]/30'
                      : 'border-[#EDEDED] hover:border-gray-400'
                  }`}
                >
                  {/* Thumbnail Image */}
                  <div className="aspect-square w-full bg-gray-100 relative overflow-hidden">
                    <img
                      src={img.image_url}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />

                    {/* Drag Handle indicator */}
                    <div className="absolute top-1.5 left-1.5 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-3 h-3" />
                    </div>

                    {/* Cover Badge */}
                    {img.is_cover ? (
                      <span className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-[#3B82F6] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                        <Star className="w-2.5 h-2.5 fill-white" />
                        COVER
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetCover(idx)}
                        className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/60 hover:bg-[#3B82F6] text-white text-[10px] font-medium px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Set as Cover Image"
                      >
                        <Star className="w-2.5 h-2.5" />
                        Set Cover
                      </button>
                    )}
                  </div>

                  {/* Thumbnail Bottom Controls */}
                  <div className="p-2 bg-white flex items-center justify-between border-t border-[#EDEDED] text-[11px]">
                    <span className="text-[#9CA3AF] font-mono font-medium">#{idx + 1}</span>

                    <div className="flex items-center gap-1">
                      {/* Move left */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveImage(idx, idx - 1)}
                        className="p-1 rounded text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Move photo earlier"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>

                      {/* Move right */}
                      <button
                        type="button"
                        disabled={idx === galleryImages.length - 1}
                        onClick={() => handleMoveImage(idx, idx + 1)}
                        className="p-1 rounded text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Move photo later"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(idx)}
                        className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors ml-1"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
          disabled={isSubmitting || uploadingFiles.length > 0}
          className="px-5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold shadow-2xs transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {uploadingFiles.length > 0 ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Uploading ({uploadingFiles.length})...</span>
            </>
          ) : (
            <span>{initialProduct ? 'Update Product' : 'Save Product'}</span>
          )}
        </button>
      </div>

    </form>
  )
}
