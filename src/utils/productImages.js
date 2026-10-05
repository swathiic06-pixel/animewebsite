/**
 * Utility helpers for resolving product gallery images and cover image.
 */

export function getProductImages(product) {
  if (!product) return []

  if (Array.isArray(product.images) && product.images.length > 0) {
    return [...product.images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }

  // Fallback to product.image_url if images array is not present or empty
  if (product.image_url && typeof product.image_url === 'string' && product.image_url.trim()) {
    return [
      {
        id: `legacy-${product.id || 'cover'}`,
        product_id: product.id,
        image_url: product.image_url.trim(),
        sort_order: 0,
        is_cover: true
      }
    ]
  }

  return []
}

export function getProductCoverImage(product) {
  if (!product) return ''

  if (Array.isArray(product.images) && product.images.length > 0) {
    const cover = product.images.find(img => img.is_cover)
    if (cover?.image_url) return cover.image_url
    
    // Fallback to first image in sort order
    const sorted = [...product.images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    if (sorted[0]?.image_url) return sorted[0].image_url
  }

  return product.image_url || ''
}
