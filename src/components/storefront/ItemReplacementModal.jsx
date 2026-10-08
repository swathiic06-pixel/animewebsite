import React, { useState, useRef } from 'react'
import {
  X,
  UploadSimple,
  Trash,
  CheckCircle,
  WarningCircle,
  Image as ImageIcon,
  ArrowsClockwise,
  Package
} from '@phosphor-icons/react'
import { useApp } from '../../context/AppContext'
import { uploadImage, PRESETS, cldUrl } from '../../lib/cloudinary'
import { formatPrice } from '../../utils/formatPrice'

const REASON_CATEGORIES = [
  { id: 'damaged', label: 'Damaged on Arrival (Broken parts, crushed packaging)' },
  { id: 'wrong_item', label: 'Wrong Item Received (Incorrect character or edition)' },
  { id: 'defective', label: 'Defective / Not Working (Loose joints, paint flaws)' },
  { id: 'missing_parts', label: 'Missing Parts / Accessories (Stand, weapons, cards)' },
  { id: 'other', label: 'Other Issue (Please explain below)' }
]

export default function ItemReplacementModal({
  order,
  item,
  onClose,
  onSuccess
}) {
  const { createReplacementRequest, mockUser } = useApp()

  const [reasonCategory, setReasonCategory] = useState('damaged')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState([]) // [{ id, url, name }]
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const fileInputRef = useRef(null)

  // ── Multi-image Upload via Cloudinary ────────────────────────────────────
  const handleFilesUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files || files.length === 0) return
    setUploadError('')

    const remainingSlots = 5 - photos.length
    if (remainingSlots <= 0) {
      setUploadError('Maximum cap of 5 photos reached.')
      return
    }

    const toProcess = files.slice(0, remainingSlots)
    if (files.length > remainingSlots) {
      setUploadError(`Only ${remainingSlots} more photo(s) could be attached (max 5).`)
    }

    setIsUploading(true)
    for (const file of toProcess) {
      if (!file.type.match(/^image\/(jpeg|png|webp|jpg)$/i)) {
        setUploadError(`"${file.name}" is not supported. Use JPG, PNG, or WebP.`)
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError(`"${file.name}" exceeds 5MB size limit.`)
        continue
      }

      try {
        const res = await uploadImage(file, PRESETS.products)
        setPhotos(prev => [
          ...prev,
          {
            id: 'ph-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            url: res.secure_url,
            name: file.name
          }
        ])
      } catch (err) {
        setUploadError(`Failed to upload "${file.name}": ${err.message}`)
      }
    }
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemovePhoto = (idToRemove) => {
    setPhotos(prev => prev.filter(p => p.id !== idToRemove))
  }

  // ── Submit Replacement Request ──────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')

    if (!description.trim()) {
      setSubmitError('Please describe the issue with this item.')
      return
    }
    if (photos.length === 0) {
      setSubmitError('At least 1 photo is required as proof/evidence of the defect.')
      return
    }

    setIsSubmitting(true)
    try {
      const orderItemId = item.order_item_id || item.product_id || item.id

      await createReplacementRequest({
        orderId: order.id,
        orderItemId: orderItemId,
        reasonCategory,
        description: description.trim(),
        imageUrls: photos.map(p => p.url),
        userId: mockUser?.id || order.user_id || null
      })

      setIsSubmitted(true)
      if (onSuccess) onSuccess()
    } catch (err) {
      setSubmitError(err?.message || 'Failed to submit replacement request.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans animate-fade-in">
      <div className="bg-white rounded-[20px] max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E5E5E5] flex flex-col">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="p-5 sm:p-6 border-b border-[#E5E5E5] flex items-start justify-between gap-4 sticky top-0 bg-white z-10 rounded-t-[20px]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <h2 className="text-base sm:text-lg font-bold text-[#111111]">
                Request Replacement
              </h2>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Order #{order.id.slice(0, 8)} · 5-day post-delivery exchange window
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#6B6B6B] hover:text-[#111111] hover:bg-[#F8F8F6] transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div className="p-5 sm:p-6 space-y-5 flex-1">

          {isSubmitted ? (
            /* ── Confirmation View ── */
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle size={32} weight="bold" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-[#111111]">
                  Replacement Request Submitted
                </h3>
                <p className="text-xs text-[#6B6B6B] max-w-sm mx-auto leading-relaxed">
                  Your request has been submitted — our team will review the photos and issue an exchange decision. You can monitor progress on your order page.
                </p>
              </div>

              <div className="p-3.5 rounded-[12px] bg-[#F8F8F6] border border-[#E5E5E5] text-left text-xs text-[#111111] space-y-1 max-w-md mx-auto">
                <p><span className="text-[#6B6B6B]">Item:</span> <strong>{item.name}</strong></p>
                <p><span className="text-[#6B6B6B]">Reason:</span> <strong className="capitalize">{reasonCategory.replace('_', ' ')}</strong></p>
                <p><span className="text-[#6B6B6B]">Evidence:</span> <strong>{photos.length} photo(s) attached</strong></p>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="sf-btn-primary px-6 h-10 text-xs font-bold"
                >
                  Got It
                </button>
              </div>
            </div>
          ) : (
            /* ── Submission Form ── */
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Pre-Selected Line Item Box */}
              <div className="p-3.5 rounded-[14px] bg-[#F8F8F6] border border-[#E5E5E5] flex items-center gap-3">
                <img
                  src={cldUrl(item.image_url, { width: 120, height: 120, crop: 'fill' })}
                  alt={item.name}
                  className="w-14 h-14 rounded-[10px] object-cover bg-white border border-[#E5E5E5] flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#111111] line-clamp-1">{item.name}</p>
                  <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                    Qty: {item.qty || item.quantity || 1} · {formatPrice(item.price || item.price_at_purchase || 0)}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-100/70 text-emerald-800 rounded-md">
                    Pre-selected item
                  </span>
                </div>
              </div>

              {/* Reason Category Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#111111]">
                  Reason for Replacement <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E5E5] bg-[#F8F8F6] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#111111] font-medium"
                >
                  {REASON_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Issue Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#111111]">
                  Describe the Issue <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what is broken, missing, or wrong with this specific collectible..."
                  rows={3}
                  required
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E5E5] bg-[#F8F8F6] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#111111]"
                />
              </div>

              {/* Photo Evidence Upload (1 to 5 Photos) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#111111]">
                    Attach Photos (Evidence) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-[#6B6B6B]">
                    {photos.length} / 5 photos attached (Min 1 required)
                  </span>
                </div>

                {/* Dropzone trigger */}
                {photos.length < 5 && (
                  <label className="border-2 border-dashed border-[#D4D4D4] hover:border-[#111111] rounded-[14px] p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-[#FAFAFA] hover:bg-white transition-all group">
                    <UploadSimple size={24} className="text-[#6B6B6B] group-hover:text-[#111111] mb-1.5 transition-colors" />
                    <p className="text-xs font-bold text-[#111111]">
                      Click to upload photo evidence
                    </p>
                    <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                      JPG, PNG, WebP up to 5MB each
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleFilesUpload}
                      disabled={isUploading || photos.length >= 5}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Upload Status */}
                {isUploading && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                    <ArrowsClockwise size={14} className="animate-spin text-blue-600" />
                    <span>Uploading photos to cloud storage...</span>
                  </div>
                )}

                {uploadError && (
                  <p className="text-xs text-rose-600 font-medium">{uploadError}</p>
                )}

                {/* Thumbnail Previews Grid */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 pt-1">
                    {photos.map((p, idx) => (
                      <div
                        key={p.id}
                        className="relative group aspect-square rounded-[10px] overflow-hidden border border-[#E5E5E5] bg-[#F8F8F6]"
                      >
                        <img
                          src={cldUrl(p.url, { width: 140, height: 140, crop: 'fill' })}
                          alt={`Proof ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(p.id)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/75 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                          title="Remove photo"
                        >
                          <Trash size={12} />
                        </button>
                        <span className="absolute bottom-1 left-1 px-1 py-0.5 text-[9px] font-bold bg-black/60 text-white rounded">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <WarningCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" weight="bold" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#E5E5E5] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="sf-btn-secondary text-xs h-9 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading || photos.length === 0}
                  className="inline-flex items-center justify-center gap-2 px-5 h-9 rounded-[10px] text-xs font-bold text-white bg-[#111111] hover:bg-black disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <ArrowsClockwise size={14} className="animate-spin" />
                      <span>Submitting Claim...</span>
                    </>
                  ) : (
                    <span>Submit Replacement Request</span>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  )
}
