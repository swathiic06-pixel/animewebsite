import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, RefreshCw, Tags } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import ProductTable from '../../components/admin/ProductTable'
import ProductForm from '../../components/admin/ProductForm'
import Modal from '../../components/common/Modal'

export default function ManageProducts() {
  const { products, categories = [], addProduct, updateProduct, deleteProduct, toggleSoldOut, refreshProducts, refreshCategories } = useApp()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Ensure latest shared catalog and categories are loaded on mount
  useEffect(() => {
    if (refreshProducts) refreshProducts()
    if (refreshCategories) refreshCategories()
  }, [])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      if (refreshProducts) await refreshProducts()
      if (refreshCategories) await refreshCategories()
    } finally {
      setIsRefreshing(false)
    }
  }

  const distinctCategories = Array.from(
    new Set([
      ...categories.map(c => c.name),
      ...products.map(p => p.series || p.category).filter(Boolean)
    ])
  ).sort()


  const filteredProducts = products.filter((p) => {
    const q = searchFilter.toLowerCase().trim()
    const matchesSearch = 
      !q ||
      p.name?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q) ||
      p.series?.toLowerCase().includes(q) ||
      p.edition?.toLowerCase().includes(q) ||
      p.color?.toLowerCase().includes(q) ||
      (p.hw_num && String(p.hw_num).includes(q)) ||
      (p.sort_order && String(p.sort_order).includes(q))
    const pCat = (p.category || '').toLowerCase()
    const pSeries = (p.series || '').toLowerCase()
    const matchesCat = categoryFilter === 'all' || pCat === categoryFilter.toLowerCase() || pSeries === categoryFilter.toLowerCase()
    return matchesSearch && matchesCat
  }).sort((a, b) => (a.sort_order ?? a.hw_num ?? 999) - (b.sort_order ?? b.hw_num ?? 999))

  const handleAddSubmit = async (formData) => {
    await addProduct(formData)
    setIsAddModalOpen(false)
  }

  const handleEditSubmit = async (formData) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, formData)
      setEditingProduct(null)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans antialiased text-[#111827]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
            Products & Inventory
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Add new collectibles, edit pricing, manage stock availability, and configure homepage placement.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EDEDED] bg-white hover:bg-gray-50 text-xs font-semibold text-[#4B5563] shadow-2xs transition-all disabled:opacity-50"
            title="Refresh shared store catalog"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#3B82F6] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Sync Catalog'}</span>
          </button>

          <Link
            to="/admin/categories"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#EDEDED] bg-white hover:bg-gray-50 text-xs font-semibold text-[#4B5563] shadow-2xs transition-all"
            title="Manage store categories and ordering"
          >
            <Tags className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Manage Categories</span>
          </Link>
          
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold shadow-2xs transition-all"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Add New Product</span>
          </button>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-[#EDEDED] shadow-2xs">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by title, HW#, series, or color..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-[#F5F6F8] border border-[#EDEDED] rounded-xl pl-9 pr-4 py-2 text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
          />
          <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3.5 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto self-end">
          <span className="text-xs text-[#6B7280]">Filter:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#F5F6F8] border border-[#EDEDED] text-xs text-[#111827] font-semibold rounded-xl px-3.5 py-1.5 focus:outline-none focus:border-[#3B82F6] cursor-pointer"
          >
            <option value="all">All Series / Categories ({products.length})</option>
            {distinctCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <ProductTable
        products={filteredProducts}
        onEdit={(prod) => setEditingProduct(prod)}
        onDelete={(id) => deleteProduct(id)}
        onToggleSoldOut={(id) => toggleSoldOut(id)}
      />

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Merchandise"
      >
        <ProductForm
          onSubmit={handleAddSubmit}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        title={`Edit Product: ${editingProduct?.name}`}
      >
        {editingProduct && (
          <ProductForm
            initialProduct={editingProduct}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditingProduct(null)}
          />
        )}
      </Modal>
    </div>
  )
}
