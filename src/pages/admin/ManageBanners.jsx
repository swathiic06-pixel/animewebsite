import React, { useState, useEffect } from 'react'
import { 
  Sliders, 
  Upload, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Sparkles, 
  ArrowRight, 
  ArrowUpRight, 
  Check, 
  RotateCcw, 
  Eye, 
  ExternalLink,
  Info,
  X,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { BANNER_SPECS, uploadBannerImage } from '../../utils/imageCompressor'
import { cldUrl } from '../../lib/cloudinary'
import Modal from '../../components/common/Modal'

export default function ManageBanners() {
  const { banners, updateBanner, resetBanner, refreshBanners } = useApp()

  const [activeSection, setActiveSection] = useState(null)
  const [formData, setFormData] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [useUrlInput, setUseUrlInput] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Re-fetch fresh banners on mount
  useEffect(() => {
    if (refreshBanners) {
      refreshBanners()
    }
  }, [])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      if (refreshBanners) await refreshBanners()
    } finally {
      setIsRefreshing(false)
    }
  }

  const sectionsList = [
    {
      id: 'hero',
      title: 'Hero Promotional Banner',
      description: 'The large primary showcase at the top of the storefront homepage.',
      themeBg: 'bg-[#C9E4C5]',
      themeTextColor: 'text-[#111111]',
      spec: BANNER_SPECS.hero
    },
    {
      id: 'weekly_drop',
      title: 'Weekly Drop Showcase',
      description: 'The vibrant yellow card highlighting weekly new arrivals and apparel.',
      themeBg: 'bg-[#F5E7A8]',
      themeTextColor: 'text-[#111111]',
      spec: BANNER_SPECS.weekly_drop
    },
    {
      id: 'collector_spotlight',
      title: 'Collector Spotlight Card',
      description: 'The full-bleed portrait card spotlighting exclusive replica weapons & statues.',
      themeBg: 'bg-zinc-900',
      themeTextColor: 'text-white',
      spec: BANNER_SPECS.collector_spotlight
    },
    {
      id: 'style_editorial',
      title: 'Style Editorial Banner',
      description: 'The wide lifestyle banner promoting streetwear hoodies and anime jackets.',
      themeBg: 'bg-[#ECECE8]',
      themeTextColor: 'text-[#111111]',
      spec: BANNER_SPECS.style_editorial
    }
  ]

  const triggerToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  const openEditor = (sectionId) => {
    const current = banners[sectionId] || {}
    setFormData({
      section: sectionId,
      eyebrow_tag: current.eyebrow_tag || '',
      headline: current.headline || '',
      subtext: current.subtext || '',
      cta_text: current.cta_text || '',
      cta_link: current.cta_link || '',
      image_url: current.image_url || ''
    })
    setUseUrlInput(!current.image_url?.startsWith('data:') && Boolean(current.image_url))
    setActiveSection(sectionId)
  }

  const handleTextChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.match(/^image\/(jpeg|png|webp|jpg)$/i)) {
      alert('Please select a valid image file (.jpg, .png, or .webp)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please choose a smaller image.')
      return
    }

    try {
      setIsUploading(true)
      const { url } = await uploadBannerImage(activeSection, file)
      setFormData(prev => ({ ...prev, image_url: url }))
    } catch (err) {
      console.error('Image upload failed:', err)
      alert('Failed to process image: ' + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!activeSection || !formData) return

    if (formData.cta_link && formData.cta_link.trim().toLowerCase().startsWith('javascript:')) {
      alert('Invalid link: javascript: URLs are not allowed.')
      return
    }

    try {
      setIsSaving(true)
      await updateBanner(activeSection, formData)
      triggerToast(`${BANNER_SPECS[activeSection]?.label || 'Banner'} updated successfully!`)
      setActiveSection(null)
      setFormData(null)
    } catch (err) {
      alert('Failed to save banner: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async (sectionId) => {
    if (confirm('Are you sure you want to reset this banner to its original default content and photo?')) {
      await resetBanner(sectionId)
      triggerToast('Banner reverted to default content.')
      if (activeSection === sectionId) {
        setActiveSection(null)
        setFormData(null)
      }
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-[#111111] text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-white/10 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight font-display">
            Homepage Content & Promotional Banners
          </h1>
          <p className="text-xs text-[#8A8A8A] mt-1 font-medium">
            Customize photos, marketing headlines, and call-to-action buttons for the 4 fixed homepage promotional sections.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-white hover:bg-gray-50 border border-slate-200 text-[#111111] text-xs font-bold shadow-sm transition-all"
            title="Sync latest banners from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#3B82F6]' : 'text-slate-500'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Banners'}</span>
          </button>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-gray-50 border border-slate-200 text-[#111111] text-xs font-bold shadow-sm transition-all"
          >
            <ExternalLink className="w-4 h-4 text-slate-500" />
            <span>View Live Storefront</span>
          </a>
        </div>
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sectionsList.map((sec) => {
          const banner = banners[sec.id] || {}
          return (
            <div
              key={sec.id}
              className="p-5 sm:p-6 rounded-xl bg-white border border-[#EDEDED] shadow-2xs flex flex-col justify-between space-y-4 hover:border-gray-300 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[#F5F6F8] text-[#111827] border border-[#EDEDED]">
                    {sec.spec.label}
                  </span>
                  <span className="text-[11px] text-[#6B7280] font-mono">
                    {sec.spec.aspectRatio}
                  </span>
                </div>

                {/* Preview Thumbnail Box */}
                <div className={`relative rounded-xl overflow-hidden aspect-[16/9] border border-[#EDEDED] ${sec.themeBg} flex items-center justify-center`}>
                  {banner.image_url ? (
                    <img
                      src={cldUrl(banner.image_url, { width: 800, height: 450, crop: 'fill' })}
                      alt={banner.headline}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-4 text-center">
                      <ImageIcon className="w-8 h-8 text-black/30 mx-auto mb-1" />
                      <span className="text-xs text-black/50 font-semibold">Solid Background Theme</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4 text-white">
                    {banner.eyebrow_tag && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                        {banner.eyebrow_tag}
                      </span>
                    )}
                    <h4 className="text-sm sm:text-base font-black line-clamp-1">
                      {banner.headline}
                    </h4>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#111827]">{sec.title}</h3>
                  <p className="text-xs text-[#6B7280] leading-relaxed">{sec.description}</p>
                </div>

                <div className="p-3 rounded-xl bg-[#F5F6F8] border border-[#EDEDED] text-xs space-y-1">
                  <div className="flex items-center justify-between text-[#6B7280]">
                    <span>Button Text:</span>
                    <span className="font-semibold text-[#111827]">{banner.cta_text || 'None'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#6B7280]">
                    <span>Button Link:</span>
                    <span className="font-mono text-[11px] text-[#111827] truncate max-w-[200px]">{banner.cta_link || 'None'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-[#EDEDED] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleReset(sec.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9CA3AF] hover:text-rose-600 transition-colors"
                  title="Revert back to original default"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>

                <button
                  type="button"
                  onClick={() => openEditor(sec.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold shadow-2xs transition-all"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Edit Content</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit Banner Modal */}
      {activeSection && formData && (
        <Modal
          isOpen={Boolean(activeSection)}
          onClose={() => {
            if (!isSaving && !isUploading) {
              setActiveSection(null)
              setFormData(null)
            }
          }}
          title={`Edit ${BANNER_SPECS[activeSection]?.label || 'Banner'}`}
          maxWidth="max-w-4xl"
        >
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Live WYSIWYG Preview Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-emerald-600" /> Live Storefront Preview
                </span>
                <span className="text-[11px] text-[#8A8A8A]">WYSIWYG Mockup</span>
              </div>

              {/* Render dynamic preview matching storefront layout */}
              <div className="rounded-2xl overflow-hidden border border-black/10 shadow-sm p-1 bg-slate-100">
                {activeSection === 'hero' && (
                  <div className="relative overflow-hidden rounded-xl bg-[#C9E4C5] p-6 flex flex-col justify-between min-h-[220px]">
                    <div className="relative z-10 max-w-xs sm:max-w-sm space-y-2">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-black/10 text-[#111111] text-[10px] font-extrabold uppercase tracking-wider">
                        {formData.eyebrow_tag || 'Exclusive Drop'}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight leading-tight">
                        {formData.headline || 'Your Headline Here'}
                      </h3>
                      <p className="text-xs text-[#111111]/80 leading-relaxed font-medium line-clamp-2">
                        {formData.subtext || 'Supporting description will be displayed here.'}
                      </p>
                      {formData.cta_text && (
                        <div className="pt-2">
                          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#111111] text-white text-[11px] font-bold">
                            <span>{formData.cta_text}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      )}
                    </div>
                    {formData.image_url && (
                      <div className="absolute right-0 bottom-0 top-0 w-5/12 overflow-hidden flex items-end justify-end pointer-events-none">
                        <img
                          src={formData.image_url}
                          alt="Preview"
                          className="w-full h-full object-cover object-top"
                        />
                        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#C9E4C5]/20 to-[#C9E4C5]" />
                      </div>
                    )}
                  </div>
                )}

                {activeSection === 'weekly_drop' && (
                  <div className="relative overflow-hidden rounded-xl bg-[#F5E7A8] p-6 flex flex-col justify-between min-h-[180px]">
                    <div className="flex items-start justify-between relative z-10">
                      <span className="px-2.5 py-0.5 rounded-full bg-black/10 text-[#111111] text-[10px] font-extrabold uppercase tracking-wider">
                        {formData.eyebrow_tag || 'Weekly Drop'}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#111111] shadow-sm">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="space-y-1 relative z-10">
                      <h3 className="text-lg font-black text-[#111111] tracking-tight">
                        {formData.headline || 'New Arrivals — Fresh Drops Weekly'}
                      </h3>
                      <p className="text-xs text-[#111111]/80 font-medium">
                        {formData.subtext || 'Curated street apparel & limited run art scrolls.'}
                      </p>
                    </div>
                    {formData.image_url && (
                      <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-30 overflow-hidden pointer-events-none">
                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                )}

                {activeSection === 'collector_spotlight' && (
                  <div className="relative overflow-hidden rounded-xl bg-zinc-900 p-6 flex flex-col justify-between min-h-[220px]">
                    {formData.image_url ? (
                      <>
                        <img
                          src={formData.image_url}
                          alt="Spotlight Preview"
                          className="absolute inset-0 w-full h-full object-cover object-center"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-tr from-rose-900 to-zinc-900" />
                    )}
                    <div className="relative z-10 flex justify-end">
                      <span className="px-2 py-0.5 rounded-full bg-black/40 text-amber-300 text-[10px] font-bold">
                        Spotlight
                      </span>
                    </div>
                    <div className="relative z-10 space-y-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-300">
                        {formData.eyebrow_tag || 'Collector Spotlight'}
                      </span>
                      <h3 className="text-lg font-black text-white leading-snug">
                        {formData.headline || 'Demon Slayer Nichirin Swords & Statues'}
                      </h3>
                      {formData.cta_text && (
                        <div className="pt-1">
                          <span className="inline-block px-4 py-1.5 rounded-full bg-white text-[#111111] text-[11px] font-extrabold">
                            {formData.cta_text}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeSection === 'style_editorial' && (
                  <div className="relative overflow-hidden rounded-xl bg-[#ECECE8] p-6 flex flex-col justify-between min-h-[200px]">
                    <div className="relative z-10 max-w-xs space-y-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-black/10 text-[#111111] text-[10px] font-extrabold uppercase tracking-wider">
                        {formData.eyebrow_tag || 'Style Editorial'}
                      </span>
                      <h3 className="text-xl font-black text-[#111111] tracking-tight leading-tight">
                        {formData.headline || 'Bring Bold Fashion → Your Anime, Your Style'}
                      </h3>
                      <p className="text-xs text-[#6B6B6B] leading-relaxed line-clamp-2">
                        {formData.subtext || 'Heavyweight cotton hoodies, woven tapestry jackets, and Akatsuki cloaks.'}
                      </p>
                      {formData.cta_text && (
                        <div className="pt-1">
                          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#111111] text-white text-[11px] font-bold">
                            <span>{formData.cta_text}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      )}
                    </div>
                    {formData.image_url && (
                      <div className="absolute right-0 bottom-0 top-0 w-5/12 overflow-hidden pointer-events-none">
                        <img
                          src={formData.image_url}
                          alt="Preview"
                          className="w-full h-full object-cover object-center"
                        />
                        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#ECECE8]/40 to-[#ECECE8]" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Photo / Image Uploader Section */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#F5F5F3] border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-[#111111] uppercase tracking-wider block">
                    Banner Photo
                  </label>
                  <p className="text-[11px] text-[#8A8A8A]">
                    Recommended: <strong className="text-black">{BANNER_SPECS[activeSection]?.recommended}</strong> ({BANNER_SPECS[activeSection]?.aspectRatio}). Max 5MB (.jpg, .png, .webp).
                  </p>
                </div>

                {/* URL vs Upload Toggle */}
                <button
                  type="button"
                  onClick={() => setUseUrlInput(prev => !prev)}
                  className="text-xs text-rose-600 font-semibold hover:underline self-start sm:self-auto"
                >
                  {useUrlInput ? 'Upload file instead' : 'Or paste image link'}
                </button>
              </div>

              {useUrlInput ? (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="url"
                      name="image_url"
                      value={formData.image_url}
                      onChange={handleTextChange}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-black"
                    />
                    <LinkIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-black rounded-xl bg-white transition-colors group">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                      {isUploading ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                          <Loader2 className="w-4 h-4 animate-spin text-black" />
                          <span>Compressing & uploading photo...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 group-hover:text-black">
                          <Upload className="w-4 h-4" />
                          <span>Click to browse photo or drag & drop</span>
                        </div>
                      )}
                    </label>

                    {formData.image_url && (
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-black/10 flex-shrink-0 bg-white shadow-sm">
                        <img
                          src={formData.image_url}
                          alt="Thumbnail"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                          title="Remove photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Text Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Eyebrow Tag (Small Badge)
                </label>
                <input
                  type="text"
                  name="eyebrow_tag"
                  value={formData.eyebrow_tag}
                  onChange={handleTextChange}
                  placeholder="e.g. EXCLUSIVE SEASON DROP"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Main Headline <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="headline"
                  required
                  value={formData.headline}
                  onChange={handleTextChange}
                  placeholder="e.g. GET UP TO 50% OFF"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-black font-semibold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Supporting Description / Subtext
                </label>
                <textarea
                  name="subtext"
                  rows={2}
                  value={formData.subtext}
                  onChange={handleTextChange}
                  placeholder="Supporting promotional text..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Button Text (Optional)
                </label>
                <input
                  type="text"
                  name="cta_text"
                  value={formData.cta_text}
                  onChange={handleTextChange}
                  placeholder="e.g. Shop Now or Get Discount"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Button Destination Link
                </label>
                <input
                  type="text"
                  name="cta_link"
                  value={formData.cta_link}
                  onChange={handleTextChange}
                  placeholder="e.g. /?category=clothing or #catalog-view"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-black font-mono text-[11px]"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleReset(activeSection)}
                className="text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert to original default</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection(null)
                    setFormData(null)
                  }}
                  disabled={isSaving || isUploading}
                  className="px-4 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-bold text-gray-700"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="px-6 py-2.5 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>
        </Modal>
      )}
    </div>
  )
}
