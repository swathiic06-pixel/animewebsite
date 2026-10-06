import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Package, 
  Check, 
  ExternalLink,
  ArrowUpDown,
  Tag,
  RefreshCw,
  Car,
  Truck,
  Zap,
  Sparkles,
  Image as LucideImage,
  Swords,
  Radio,
  Smile
} from 'lucide-react'
import { useApp, generateSlug } from '../../context/AppContext'
import Modal from '../../components/common/Modal'

export default function ManageCategories() {
  const { categories = [], products = [], addCategory, updateCategory, deleteCategory, refreshCategories, refreshProducts } = useApp()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Ensure latest shared categories and products are loaded on mount
  useEffect(() => {
    if (refreshCategories) refreshCategories()
    if (refreshProducts) refreshProducts()
  }, [])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      if (refreshCategories) await refreshCategories()
      if (refreshProducts) await refreshProducts()
    } finally {
      setIsRefreshing(false)
    }
  }

  const getCategoryLucideIcon = (cat) => {
    const s = (cat.slug || cat.name || '').toLowerCase()
    const ic = (cat.icon || '').toLowerCase()
    if (ic === 'car' || s.includes('hot-wheel') || s.includes('wheel')) return Car
    if (ic === 'truck' || s.includes('die-cast') || s.includes('cast')) return Truck
    if (ic === 'bolt' || ic === 'lightning' || s.includes('marvel')) return Zap
    if (ic === 'sparkles' || ic === 'sparkle' || s.includes('anime')) return Sparkles
    if (ic === 'image' || s.includes('poster') || s.includes('decor') || s.includes('wall')) return LucideImage
    if (ic === 'sword' || s.includes('katana') || s.includes('blade')) return Swords
    if (ic === 'radio' || s.includes('rc-car') || s.includes('rc')) return Radio
    if (ic === 'user' || s.includes('shinchan') || s.includes('shin')) return Smile
    return Tag
  }

  const [searchFilter, setSearchFilter] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [deleteWarningCat, setDeleteWarningCat] = useState(null)
  const [toastMessage, setToastMessage] = useState('')

  // Form states for Add / Edit
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formOrder, setFormOrder] = useState(1)
  const [isSlugManual, setIsSlugManual] = useState(false)
  const [formError, setFormError] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // Count products per category
  const getProductCount = (category) => {
    return products.filter((p) => {
      return (
        p.category_id === category.id ||
        (p.category && p.category.toLowerCase() === category.name.toLowerCase()) ||
        (p.category && p.category.toLowerCase() === category.slug.toLowerCase())
      )
    }).length
  }

  const sortedCategories = [...categories].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

  const filteredCategories = sortedCategories.filter((cat) => {
    const q = searchFilter.toLowerCase().trim()
    if (!q) return true
    return cat.name.toLowerCase().includes(q) || cat.slug.toLowerCase().includes(q)
  })

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormName('')
    setFormSlug('')
    const nextOrder = categories.length > 0 
      ? Math.max(...categories.map(c => c.display_order || 0)) + 1 
      : 1
    setFormOrder(nextOrder)
    setIsSlugManual(false)
    setFormError('')
    setIsAddModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (cat) => {
    setEditingCategory(cat)
    setFormName(cat.name)
    setFormSlug(cat.slug)
    setFormOrder(cat.display_order || 0)
    setIsSlugManual(true)
    setFormError('')
  }

  // Name change auto-generates slug unless manually edited
  const handleNameChange = (e) => {
    const val = e.target.value
    setFormName(val)
    if (!isSlugManual) {
      setFormSlug(generateSlug(val))
    }
  }

  // Save Add
  const handleSaveAdd = async (e) => {
    e.preventDefault()
    if (!formName.trim()) {
      setFormError('Category name is required')
      return
    }
    const finalSlug = formSlug.trim() ? generateSlug(formSlug) : generateSlug(formName)
    if (categories.some(c => c.slug.toLowerCase() === finalSlug.toLowerCase())) {
      setFormError(`A category with slug "${finalSlug}" already exists. Please choose a different slug.`)
      return
    }

    try {
      await addCategory({
        name: formName.trim(),
        slug: finalSlug,
        display_order: parseInt(formOrder) || 1
      })
      setIsAddModalOpen(false)
      showToast(`Category "${formName.trim()}" created successfully!`)
    } catch (err) {
      setFormError(err.message || 'Failed to save category')
    }
  }

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingCategory) return
    if (!formName.trim()) {
      setFormError('Category name is required')
      return
    }
    const finalSlug = formSlug.trim() ? generateSlug(formSlug) : generateSlug(formName)
    const duplicate = categories.find(
      c => c.id !== editingCategory.id && c.slug.toLowerCase() === finalSlug.toLowerCase()
    )
    if (duplicate) {
      setFormError(`A category with slug "${finalSlug}" already exists. Please choose a different slug.`)
      return
    }

    try {
      await updateCategory(editingCategory.id, {
        name: formName.trim(),
        slug: finalSlug,
        display_order: parseInt(formOrder) || 0
      })
      setEditingCategory(null)
      showToast(`Category "${formName.trim()}" updated successfully!`)
    } catch (err) {
      setFormError(err.message || 'Failed to update category')
    }
  }

  // Quick display order update directly on the list
  const handleQuickOrderChange = async (cat, newOrderVal) => {
    const parsed = parseInt(newOrderVal)
    if (isNaN(parsed)) return
    await updateCategory(cat.id, { display_order: parsed })
  }

  // Handle Delete Request
  const handleDeleteRequest = (cat) => {
    const count = getProductCount(cat)
    if (count > 0) {
      setDeleteWarningCat({ cat, count })
      return
    }
    setDeleteWarningCat({ cat, count: 0 })
  }

  const handleConfirmDelete = async () => {
    if (!deleteWarningCat) return
    const res = await deleteCategory(deleteWarningCat.cat.id)
    if (res.success) {
      showToast(`Category "${deleteWarningCat.cat.name}" removed`)
      setDeleteWarningCat(null)
    } else {
      alert(res.error || 'Failed to delete category')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans antialiased text-[#111827]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-[#111827] text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-white/10 animate-in fade-in slide-in-from-bottom-5">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
              Manage Categories
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#3B82F6] border border-blue-100">
              {categories.length} Total
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Create unlimited store categories, adjust display ordering for storefront filter tabs, and assign product types.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#EDEDED] bg-white hover:bg-gray-50 text-xs font-semibold text-[#4B5563] shadow-2xs transition-all disabled:opacity-50"
            title="Refresh shared store categories"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#3B82F6] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Sync Categories'}</span>
          </button>

          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#EDEDED] bg-white hover:bg-gray-50 text-xs font-semibold text-[#4B5563] shadow-2xs transition-all"
          >
            <Package className="w-3.5 h-3.5 text-[#6B7280]" />
            <span>View Products</span>
          </Link>
          
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold shadow-2xs transition-all"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-[#EDEDED] shadow-2xs">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search categories by name or slug..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-[#F5F6F8] border border-[#EDEDED] rounded-xl pl-9 pr-4 py-2 text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
          />
          <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3.5 top-2.5" />
        </div>

        <div className="text-xs text-[#6B7280] flex items-center gap-1.5 self-start sm:self-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span>Ordering: Lower numbers appear first on storefront</span>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-2xl border border-[#EDEDED] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#EDEDED] bg-[#F5F6F8] text-[#4B5563] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4 w-28">Order</th>
                <th className="py-3 px-4">Category Name</th>
                <th className="py-3 px-4">URL Slug</th>
                <th className="py-3 px-4 text-center">Assigned Products</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDEDED]">
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#6B7280]">
                    <Tag className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-sm text-[#111827]">No categories found</p>
                    <p className="text-xs mt-1">Try a different search or click "+ Add Category" to create one.</p>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => {
                  const productCount = getProductCount(cat)
                  return (
                    <tr key={cat.id} className="hover:bg-[#F9FAFB] transition-colors group">
                      {/* Display Order input */}
                      <td className="py-3.5 px-4 font-mono font-medium">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            defaultValue={cat.display_order ?? 0}
                            onBlur={(e) => handleQuickOrderChange(cat, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleQuickOrderChange(cat, e.target.value)
                                e.target.blur()
                              }
                            }}
                            className="w-14 bg-[#F5F6F8] border border-[#EDEDED] rounded-lg px-2 py-1 text-xs text-[#111827] text-center font-bold focus:outline-none focus:border-[#3B82F6]"
                            title="Edit order number and click outside or press Enter to save"
                          />
                        </div>
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#111827] text-sm flex items-center gap-2.5">
                          {(() => {
                            const IconComponent = getCategoryLucideIcon(cat)
                            return (
                              <div className="w-7 h-7 rounded-lg bg-[#F5F6F8] border border-[#EDEDED] flex items-center justify-center text-[#4B5563] shrink-0">
                                <IconComponent className="w-3.5 h-3.5" />
                              </div>
                            )
                          })()}
                          <span>{cat.name}</span>
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs text-[#4B5563] bg-[#F5F6F8] px-2 py-0.5 rounded-md border border-[#EDEDED]">
                          /{cat.slug}
                        </span>
                      </td>

                      {/* Product Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          productCount > 0 
                            ? 'bg-blue-50 text-[#3B82F6] border border-blue-100'
                            : 'bg-gray-100 text-[#6B7280]'
                        }`}>
                          <Package className="w-3 h-3" />
                          <span>{productCount}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(cat)}
                            className="p-1.5 rounded-lg border border-[#EDEDED] bg-white text-[#4B5563] hover:text-[#3B82F6] hover:border-blue-200 hover:bg-blue-50 transition-colors"
                            title="Edit category"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteRequest(cat)}
                            className="p-1.5 rounded-lg border border-[#EDEDED] bg-white text-[#4B5563] hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                            title="Delete category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* ── Add Category Modal ───────────────────────────────────────────── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Category"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Anime Figures, Keychains, Toy Cars"
              value={formName}
              onChange={handleNameChange}
              className="w-full bg-white border border-[#EDEDED] rounded-xl px-3.5 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">
              URL Slug <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2 text-xs font-mono text-[#9CA3AF]">/</span>
              <input
                type="text"
                required
                placeholder="anime-figures"
                value={formSlug}
                onChange={(e) => {
                  setIsSlugManual(true)
                  setFormSlug(e.target.value)
                }}
                className="w-full bg-white border border-[#EDEDED] rounded-xl pl-7 pr-3.5 py-2 text-sm font-mono text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
              />
            </div>
            <p className="text-[11px] text-[#6B7280] mt-1">Used in storefront URL filters (e.g. ?category=anime-figures)</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">
              Display Order
            </label>
            <input
              type="number"
              min="0"
              value={formOrder}
              onChange={(e) => setFormOrder(e.target.value)}
              className="w-full bg-white border border-[#EDEDED] rounded-xl px-3.5 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
            />
            <p className="text-[11px] text-[#6B7280] mt-1">Determines the position of the filter chip on the storefront.</p>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="pt-3 border-t border-[#EDEDED] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4B5563] bg-white border border-[#EDEDED] hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold shadow-2xs transition-colors"
            >
              Save Category
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Category Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(editingCategory)}
        onClose={() => setEditingCategory(null)}
        title={`Edit Category: ${editingCategory?.name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full bg-white border border-[#EDEDED] rounded-xl px-3.5 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">
              URL Slug <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2 text-xs font-mono text-[#9CA3AF]">/</span>
              <input
                type="text"
                required
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                className="w-full bg-white border border-[#EDEDED] rounded-xl pl-7 pr-3.5 py-2 text-sm font-mono text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
              />
            </div>
            <p className="text-[11px] text-[#6B7280] mt-1">Changes to slug will update the URL filter on storefront.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">
              Display Order
            </label>
            <input
              type="number"
              min="0"
              value={formOrder}
              onChange={(e) => setFormOrder(e.target.value)}
              className="w-full bg-white border border-[#EDEDED] rounded-xl px-3.5 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
            />
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="pt-3 border-t border-[#EDEDED] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setEditingCategory(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4B5563] bg-white border border-[#EDEDED] hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold shadow-2xs transition-colors"
            >
              Update Category
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation / Warning Modal ──────────────────────────── */}
      <Modal
        isOpen={Boolean(deleteWarningCat)}
        onClose={() => setDeleteWarningCat(null)}
        title="Delete Category"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {deleteWarningCat && deleteWarningCat.count > 0 ? (
            /* Blocked Deletion Warning */
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Category Has Assigned Products</span>
                </div>
                <p className="leading-relaxed">
                  The category <strong>"{deleteWarningCat.cat.name}"</strong> still has{' '}
                  <strong className="text-amber-950 font-extrabold">{deleteWarningCat.count} active product(s)</strong> assigned to it.
                </p>
                <p className="text-[11px] text-amber-700">
                  To prevent orphaned products on your storefront, please reassign or delete those products in Products &amp; Inventory before deleting this category.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteWarningCat(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#111827] bg-[#F5F6F8] hover:bg-gray-200 transition-colors"
                >
                  Understood
                </button>
                <Link
                  to="/admin/products"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#3B82F6] hover:bg-blue-600 transition-colors"
                >
                  Manage Products
                </Link>
              </div>
            </div>
          ) : (
            /* Safe to delete confirmation */
            <div className="space-y-3">
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Are you sure you want to delete the category <strong>"{deleteWarningCat?.cat.name}"</strong>? This action cannot be undone.
              </p>

              <div className="pt-3 border-t border-[#EDEDED] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteWarningCat(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4B5563] bg-white border border-[#EDEDED] hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
                >
                  Delete Category
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
