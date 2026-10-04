import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase, supabaseAnon, isSupabaseConfigured } from '../lib/supabaseClient'
import { isClerkConfigured, OWNER_CLERK_ID, isOwnerUser } from '../lib/clerkClient'

const AppContext = createContext(null)

const PRODUCTS_STORAGE_KEY = 'animemax_products_v2'
const ORDERS_STORAGE_KEY = 'animemax_orders_v1'
const PROFILES_STORAGE_KEY = 'animemax_profiles_v1'
const MOCK_USER_STORAGE_KEY = 'animemax_mock_user_v1'
const BANNERS_STORAGE_KEY = 'animemax_banners_v1'
const CATEGORIES_STORAGE_KEY = 'animemax_categories_v1'

export function generateSlug(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const INITIAL_CATEGORIES = [
  { id: 'cat-hot-wheels', name: 'Hot Wheels', slug: 'hot-wheels', display_order: 1, icon: 'car' },
  { id: 'cat-die-cast', name: 'Die Cast', slug: 'die-cast', display_order: 2, icon: 'truck' },
  { id: 'cat-marvel', name: 'Marvel', slug: 'marvel', display_order: 3, icon: 'bolt' },
  { id: 'cat-anime', name: 'Anime', slug: 'anime', display_order: 4, icon: 'sparkles' },
  { id: 'cat-posters-wall-decor', name: 'Posters & Wall Decor', slug: 'posters-wall-decor', display_order: 5, icon: 'image' },
  { id: 'cat-katanas', name: 'Katanas', slug: 'katanas', display_order: 6, icon: 'sword' },
  { id: 'cat-rc-cars', name: 'RC Cars', slug: 'rc-cars', display_order: 7, icon: 'radio' },
  { id: 'cat-shinchan', name: 'Shinchan', slug: 'shinchan', display_order: 8, icon: 'user' },
]

export const APPROVED_CATEGORY_SLUGS = [
  'hot-wheels',
  'die-cast',
  'marvel',
  'anime',
  'posters-wall-decor',
  'katanas',
  'rc-cars',
  'shinchan'
]


export const INITIAL_BANNERS = {
  hero: {
    section: 'hero',
    eyebrow_tag: 'Exclusive Season Drop',
    headline: 'GET UP TO 50% OFF',
    subtext: 'Authentic die-cast models, collector merchandise, and wall scrolls. Fresh drops added regularly.',
    cta_text: 'Get Discount',
    cta_link: '#catalog-view',
    image_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
    updated_at: new Date().toISOString()
  },
  weekly_drop: {
    section: 'weekly_drop',
    eyebrow_tag: 'Weekly Drop',
    headline: 'New Arrivals — Fresh Drops Weekly',
    subtext: 'Curated street apparel & limited run art scrolls.',
    cta_text: 'View Arrivals',
    cta_link: '/?category=clothing',
    image_url: '',
    updated_at: new Date().toISOString()
  },
  collector_spotlight: {
    section: 'collector_spotlight',
    eyebrow_tag: 'Collector Spotlight',
    headline: 'Demon Slayer Nichirin Swords & Statues',
    subtext: 'Official scale replica blades with zinc-alloy display stands.',
    cta_text: 'Avail Offers',
    cta_link: '/?category=accessories',
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    updated_at: new Date().toISOString()
  },
  style_editorial: {
    section: 'style_editorial',
    eyebrow_tag: 'Style Editorial',
    headline: 'Bring Bold Fashion → Your Anime, Your Style',
    subtext: 'Heavyweight cotton hoodies, woven tapestry jackets, and Akatsuki cloaks crafted for fans who wear their passion boldly.',
    cta_text: 'Shop Apparel Collection',
    cta_link: '/?category=clothing',
    image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
    updated_at: new Date().toISOString()
  }
}

const INITIAL_DEMO_ORDERS = []

export function AppProvider({ children }) {
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem(PRODUCTS_STORAGE_KEY)
      if (saved !== null) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((p) => p && p.id && !p.id.startsWith('prod-00') && !p.id.startsWith('hw-'))
          localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(cleaned))
          return cleaned
        }
      }
      return []
    } catch {
      return []
    }
  })

  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(ORDERS_STORAGE_KEY)
      if (saved !== null) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((o) => o && o.id && o.id !== 'ord-9042' && o.id !== 'ord-8711' && !String(o.id).startsWith('ord-demo'))
          localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(cleaned))
          return cleaned
        }
      }
      return []
    } catch {
      return []
    }
  })

  const [buyerProfiles, setBuyerProfiles] = useState(() => {
    try {
      const saved = localStorage.getItem(PROFILES_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        delete parsed.user_demo_buyer
        return parsed
      }
      return {}
    } catch {
      return {}
    }
  })

  // Homepage promotional banners state
  const [banners, setBanners] = useState(() => {
    try {
      const saved = localStorage.getItem(BANNERS_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.hero?.subtext && parsed.hero.subtext.includes('Akihabara')) {
          parsed.hero.subtext = INITIAL_BANNERS.hero.subtext
          localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(parsed))
        }
        return { ...INITIAL_BANNERS, ...parsed }
      }
      return INITIAL_BANNERS
    } catch {
      return INITIAL_BANNERS
    }
  })

  // Dynamic categories state (Part 1: owner-managed categories)
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const approvedMap = new Map(INITIAL_CATEGORIES.map(c => [c.slug, c]))
          const validSaved = parsed.filter(c => c && c.slug && approvedMap.has(c.slug))

          // Add any missing approved categories from INITIAL_CATEGORIES
          const existingSlugs = new Set(validSaved.map(c => c.slug))
          INITIAL_CATEGORIES.forEach(cat => {
            if (!existingSlugs.has(cat.slug)) {
              validSaved.push(cat)
            }
          })

          const sorted = validSaved.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(sorted))
          return sorted
        }
      }
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(INITIAL_CATEGORIES))
      return INITIAL_CATEGORIES
    } catch {
      return INITIAL_CATEGORIES
    }
  })


  // User state - defaults to guest visitor
  const [mockUser, setMockUser] = useState(() => {
    try {
      const saved = localStorage.getItem(MOCK_USER_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.id !== 'user_demo_buyer') return parsed
      }
    } catch {}
    return {
      id: null,
      fullName: 'Guest Visitor',
      role: 'guest'
    }
  })

  const logoutHandlerRef = useRef(null)

  const registerLogoutHandler = useCallback((handler) => {
    logoutHandlerRef.current = handler
  }, [])

  const logout = useCallback(async () => {
    if (logoutHandlerRef.current) {
      try {
        await logoutHandlerRef.current()
      } catch (err) {
        console.warn('Error during auth provider logout:', err)
      }
    }
    setMockUser({
      id: null,
      fullName: 'Guest Visitor',
      role: 'guest',
      authSource: null
    })
    try {
      localStorage.removeItem(MOCK_USER_STORAGE_KEY)
    } catch {}
  }, [])

  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(mockUser))
    } catch (e) {
      console.error(e)
    }
  }, [mockUser])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__setMockUser = setMockUser
      window.__mockUser = mockUser
    }
  }, [mockUser, setMockUser])

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products))
    } catch (e) {
      console.error(e)
    }
  }, [products])

  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders))
    } catch (e) {
      console.error(e)
    }
  }, [orders])

  useEffect(() => {
    try {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(buyerProfiles))
    } catch (e) {
      console.error(e)
    }
  }, [buyerProfiles])

  useEffect(() => {
    try {
      localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(banners))
    } catch (e) {
      console.error(e)
    }
  }, [banners])

  // Sync categories to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories))
    } catch (e) {
      console.error(e)
    }
  }, [categories])

  const categoriesTableAvailableRef = useRef(true)

  // Dedicated function to fetch/refresh categories from Supabase
  const refreshCategories = async () => {
    if (!isSupabaseConfigured || !supabase || !categoriesTableAvailableRef.current) return

    try {
      const { data: remoteCategories, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (!catErr && Array.isArray(remoteCategories) && remoteCategories.length > 0) {
        setCategories(remoteCategories)
      } else if (catErr && (catErr.code === 'PGRST205' || catErr.message?.includes('schema cache'))) {
        categoriesTableAvailableRef.current = false
      } else if (catErr) {
        console.warn('Categories fetch notice:', catErr.message)
      }
    } catch (err) {
      console.warn('Failed to refresh categories from Supabase:', err)
    }
  }



  // Dedicated function to fetch/refresh homepage banners from Supabase
  const refreshBanners = async () => {
    if (!isSupabaseConfigured || !supabase) return

    try {
      const { data: remoteBanners, error: banErr } = await supabase
        .from('homepage_banners')
        .select('*')

      if (!banErr && remoteBanners && remoteBanners.length > 0) {
        const remoteMap = {}
        remoteBanners.forEach(b => {
          if (b.section) {
            remoteMap[b.section] = b
          }
        })
        setBanners(prev => {
          const merged = { ...prev }
          Object.keys(remoteMap).forEach(sec => {
            const local = prev[sec]
            const remote = remoteMap[sec]
            if (!local || !local.updated_at || !remote.updated_at || new Date(remote.updated_at) >= new Date(local.updated_at)) {
              merged[sec] = remote
            }
          })
          return merged
        })
      } else if (banErr) {
        console.warn('Homepage banners fetch notice:', banErr.message)
      }
    } catch (err) {
      console.warn('Failed to refresh banners from Supabase:', err)
    }
  }

  // Dedicated function to fetch/refresh orders from Supabase
  const refreshOrders = async () => {
    if (!isSupabaseConfigured) return

    try {
      const client = supabaseAnon || supabase
      let { data: remoteOrders, error: ordErr } = await client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (ordErr && (ordErr.code === 'PGRST301' || ordErr.message?.includes('key') || ordErr.message?.includes('JWT'))) {
        if (supabaseAnon && client !== supabaseAnon) {
          const retry = await supabaseAnon
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
          remoteOrders = retry.data
          ordErr = retry.error
        }
      }

      if (!ordErr && Array.isArray(remoteOrders)) {
        const cleanRemote = remoteOrders.filter(
          o => o && o.id && o.id !== 'ord-9042' && o.id !== 'ord-8711' && !String(o.id).startsWith('ord-demo')
        )
        setOrders(cleanRemote)
        try {
          localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(cleanRemote))
        } catch (e) {}
      } else if (ordErr) {
        console.warn('Orders fetch warning:', ordErr.message)
      }
    } catch (err) {
      console.warn('Failed to refresh orders from Supabase:', err)
    }
  }

  // Load from Supabase if configured
  useEffect(() => {
    if (!isSupabaseConfigured) return

    async function loadSupabaseData() {
      setIsLoading(true)
      try {
        const client = supabaseAnon || supabase
        const { data: remoteProducts, error: prodErr } = await client
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })

        if (!prodErr && Array.isArray(remoteProducts)) {
          const cleanRemote = remoteProducts.filter(
            p => p && p.id && !p.id.startsWith('hw-') && !p.id.startsWith('prod-00')
          )
          // Preserve any locally added products that are not yet on remote Supabase
          setProducts(prevLocal => {
            const remoteMap = new Map(cleanRemote.map(p => [p.id, p]))
            const localOnly = (prevLocal || []).filter(
              lp => lp && lp.id && !remoteMap.has(lp.id) && !lp.id.startsWith('hw-') && !lp.id.startsWith('prod-00')
            )
            const merged = [...cleanRemote, ...localOnly]
            try {
              localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(merged))
            } catch (e) {}
            return merged
          })
        } else if (prodErr) {
          console.warn('Products fetch notice:', prodErr.message)
        }

        const { data: remoteProfiles, error: profErr } = await client
          .from('buyer_profiles')
          .select('*')

        if (!profErr && Array.isArray(remoteProfiles)) {
          const profMap = {}
          remoteProfiles.forEach(p => {
            if (p.user_id) profMap[p.user_id] = p
          })
          setBuyerProfiles(profMap)
        }

        await refreshOrders()
        await refreshBanners()
        await refreshCategories()

      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local store', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadSupabaseData()
  }, [])

  // Cross-tab storage synchronization
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === PRODUCTS_STORAGE_KEY) {
        try {
          const updated = JSON.parse(e.newValue || '[]')
          if (Array.isArray(updated)) {
            setProducts(updated.filter(p => p && p.id && !p.id.startsWith('hw-') && !p.id.startsWith('prod-00')))
          }
        } catch {}
      } else if (e.key === ORDERS_STORAGE_KEY) {
        try {
          const updated = JSON.parse(e.newValue || '[]')
          if (Array.isArray(updated)) {
            setOrders(updated.filter(o => o && o.id && o.id !== 'ord-9042' && o.id !== 'ord-8711' && !String(o.id).startsWith('ord-demo')))
          }
        } catch {}
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Supabase Realtime subscriptions for multi-device / multi-browser live sync
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const client = supabaseAnon || supabase
    if (!client || typeof client.channel !== 'function') return

    const productChannel = client
      .channel('animemax-live-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
        try {
          const { data } = await client.from('products').select('*').order('created_at', { ascending: false })
          if (Array.isArray(data)) {
            const clean = data.filter(p => p && p.id && !p.id.startsWith('hw-') && !p.id.startsWith('prod-00'))
            setProducts(clean)
            try {
              localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(clean))
            } catch {}
          }
        } catch {}
      })
      .subscribe()

    const orderChannel = client
      .channel('animemax-live-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        await refreshOrders()
      })
      .subscribe()

    return () => {
      try {
        client.removeChannel(productChannel)
        client.removeChannel(orderChannel)
      } catch {}
    }
  }, [])

  // Helper to demote conflicting products when assigning single-slot or max-slot sections
  const resolvePlacements = async (currentProducts, targetId, newSection) => {
    if (!newSection || newSection === 'grid') return currentProducts

    let updatedList = [...currentProducts]

    if (newSection === 'hero' || newSection === 'spotlight') {
      // Single-slot: demote any other product in this slot to grid
      const conflicting = updatedList.find(p => p.id !== targetId && p.display_section === newSection)
      if (conflicting) {
        updatedList = updatedList.map(p => 
          p.id === conflicting.id ? { ...p, display_section: 'grid' } : p
        )
        if (isSupabaseConfigured && supabase) {
          try {
            await supabase.from('products').update({ display_section: 'grid' }).eq('id', conflicting.id)
          } catch (e) {
            // Ignored if column doesn't exist yet
          }
        }
      }
    } else if (newSection === 'favourites') {
      // Favourites allows up to 2 products. If 2 already exist, demote the oldest/lowest-priority to grid
      const existingFavs = updatedList.filter(p => p.id !== targetId && p.display_section === 'favourites')
      if (existingFavs.length >= 2) {
        // Sort by sort_order descending so the highest sort_order gets demoted
        const sortedFavs = [...existingFavs].sort((a, b) => (b.sort_order || 0) - (a.sort_order || 0))
        const toDemote = sortedFavs[0]
        updatedList = updatedList.map(p => 
          p.id === toDemote.id ? { ...p, display_section: 'grid' } : p
        )
        if (isSupabaseConfigured && supabase) {
          try {
            await supabase.from('products').update({ display_section: 'grid' }).eq('id', toDemote.id)
          } catch (e) {
            // Ignored if column doesn't exist yet
          }
        }
      }
    }

    return updatedList
  }

  // Category Operations (Part 1: Unlimited, Owner-Managed Categories)
  const addCategory = async (catData) => {
    const rawName = (catData.name || '').trim()
    if (!rawName) throw new Error('Category name is required')
    const slug = (catData.slug || generateSlug(rawName)).trim()
    const displayOrder = parseInt(catData.display_order) || (categories.length + 1)

    const newCategory = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'cat-' + Date.now(),
      name: rawName,
      slug: slug,
      display_order: displayOrder,
      created_at: new Date().toISOString(),
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .insert([newCategory])
          .select()

        if (!error && data?.[0]) {
          const created = data[0]
          setCategories(prev => {
            const next = [...prev.filter(c => c.id !== created.id && c.slug !== created.slug), created]
            return next.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          })
          return created
        } else if (error && error.code !== 'PGRST205') {
          console.warn('Supabase category insert notice:', error.message)
        }
      } catch (err) {
        console.warn('Supabase category insert error, saved locally:', err)
      }
    }

    setCategories(prev => {
      const next = [...prev.filter(c => c.slug !== newCategory.slug), newCategory]
      return next.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    })
    return newCategory
  }

  const updateCategory = async (id, updates) => {
    const sanitized = {
      ...updates,
      name: updates.name ? updates.name.trim() : undefined,
      display_order: updates.display_order !== undefined ? parseInt(updates.display_order) : undefined,
      slug: updates.slug ? generateSlug(updates.slug) : undefined,
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('categories').update(sanitized).eq('id', id)
      } catch (err) {
        console.warn('Supabase category update error:', err)
      }
    }

    setCategories(prev => {
      const next = prev.map(c => (c.id === id ? { ...c, ...sanitized } : c))
      return next.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    })
  }

  const deleteCategory = async (id) => {
    const target = categories.find(c => c.id === id)
    if (!target) return { success: false, error: 'Category not found' }

    // Check if any product is assigned to this category
    const assignedProducts = products.filter(p => {
      return (
        p.category_id === id ||
        (p.category && p.category.toLowerCase() === target.name.toLowerCase()) ||
        (p.category && p.category.toLowerCase() === target.slug.toLowerCase())
      )
    })

    if (assignedProducts.length > 0) {
      return {
        success: false,
        error: `Cannot delete "${target.name}": ${assignedProducts.length} product(s) are currently assigned to it. Please reassign those products first.`
      }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('categories').delete().eq('id', id)
      } catch (err) {
        console.warn('Supabase category delete error:', err)
      }
    }

    setCategories(prev => prev.filter(c => c.id !== id))
    return { success: true }
  }

  // Product Operations
  const addProduct = async (productData) => {
    const section = productData.display_section || 'grid'
    const sortOrder = parseInt(productData.sort_order) || 0
    const inStock = productData.in_stock !== false && productData.in_stock !== 'false'
    const stockUnits = parseInt(productData.stock) >= 0 ? parseInt(productData.stock) : 10

    let categoryId = productData.category_id || null
    let categoryName = productData.category || ''
    if (categoryId && !categoryName) {
      const matchCat = categories.find(c => c.id === categoryId)
      if (matchCat) categoryName = matchCat.name
    } else if (categoryName && !categoryId) {
      const matchCat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase() || c.slug.toLowerCase() === categoryName.toLowerCase())
      if (matchCat) categoryId = matchCat.id
    }

    // Strip client-only or non-existent columns (e.g. category_slug)
    const { category_slug, ...cleanProductData } = productData

    const newProduct = {
      id: generateUUID(),
      created_at: new Date().toISOString(),
      ...cleanProductData,
      in_stock: inStock,
      stock: stockUnits,
      price: parseFloat(productData.price) || 0,
      display_section: section,
      sort_order: sortOrder,
      category_id: categoryId,
      category: categoryName,
    }

    // Resolve any placement collisions first
    const resolvedList = await resolvePlacements(products, newProduct.id, section)
    const nextProducts = [newProduct, ...resolvedList]

    // 1. Instantly update React state & localStorage so the product appears on the storefront immediately
    setProducts(nextProducts)
    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(nextProducts))
      window.dispatchEvent(new Event('storage'))
    } catch (e) {}

    // 2. Persist to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('products').insert([newProduct]).select()
        if (!error && data && data[0]) {
          const finalItem = { ...newProduct, ...data[0] }
          const finalList = [finalItem, ...resolvedList]
          setProducts(finalList)
          try {
            localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(finalList))
          } catch (e) {}
          return finalItem
        } else if (error) {
          // If columns don't exist yet on Supabase schema (e.g. display_section, sort_order, category_id),
          // fallback to inserting ONLY the supported core database fields:
          const coreFallback = {
            id: newProduct.id,
            name: newProduct.name,
            description: newProduct.description || '',
            price: newProduct.price,
            category: newProduct.category || 'General',
            series: newProduct.series || null,
            edition: newProduct.edition || null,
            color: newProduct.color || null,
            hw_num: newProduct.hw_num !== undefined ? newProduct.hw_num : null,
            image_url: newProduct.image_url,
            stock: newProduct.stock,
            in_stock: newProduct.in_stock,
            created_at: newProduct.created_at
          }
          const { data: fbData, error: fbErr } = await supabase.from('products').insert([coreFallback]).select()
          if (!fbErr && fbData?.[0]) {
            const returned = { ...newProduct, ...fbData[0], display_section: section, sort_order: sortOrder, category_id: categoryId }
            const finalList = [returned, ...resolvedList]
            setProducts(finalList)
            try {
              localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(finalList))
            } catch (e) {}
            return returned
          } else {
            console.warn('Supabase product insert notice (persisted in localStorage):', error.message || fbErr?.message)
          }
        }
      } catch (err) {
        console.warn('Supabase product insert error (persisted in localStorage):', err)
      }
    }

    return newProduct
  }


  const updateProduct = async (id, updates) => {
    const sanitized = {
      ...updates,
      price: updates.price !== undefined ? parseFloat(updates.price) : undefined,
      stock: updates.stock !== undefined ? parseInt(updates.stock) : undefined,
      sort_order: updates.sort_order !== undefined ? parseInt(updates.sort_order) || 0 : undefined,
    }
    delete sanitized.category_slug

    let currentList = products
    if (sanitized.display_section) {
      currentList = await resolvePlacements(products, id, sanitized.display_section)
    }

    const updatedList = currentList.map(p => (p.id === id ? { ...p, ...sanitized } : p))
    setProducts(updatedList)
    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updatedList))
    } catch (e) {}

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('products').update(sanitized).eq('id', id)
        if (error) {
          // Fallback if schema does not have display_section or sort_order yet
          const { display_section, sort_order, category_id, ...fallbackUpdates } = sanitized
          if (Object.keys(fallbackUpdates).length > 0) {
            await supabase.from('products').update(fallbackUpdates).eq('id', id)
          }
        }
      } catch (err) {
        console.error(err)
      }
    }
  }

  const toggleSoldOut = async (id) => {
    const product = products.find(p => p.id === id)
    if (!product) return

    const newInStock = !product.in_stock
    const updates = {
      in_stock: newInStock,
      stock: newInStock ? Math.max(product.stock, 5) : 0
    }

    await updateProduct(id, updates)
  }

  const deleteProduct = async (id) => {
    // 1. Immediately update local state & localStorage so UI is instant and doesn't flicker
    setProducts(prev => {
      const next = prev.filter(p => p.id !== id)
      try {
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(next))
      } catch (e) {}
      return next
    })

    // 2. Persist deletion to Supabase
    if (isSupabaseConfigured) {
      try {
        const client = supabaseAnon || supabase
        const { error } = await client.from('products').delete().eq('id', id)
        if (error) {
          console.warn('[Supabase] Failed to delete product from database:', error.message)
        } else {
          console.log(`[Supabase] Product ${id} deleted successfully from database`)
        }
      } catch (err) {
        console.error('[Supabase] deleteProduct exception:', err)
      }
    }
  }

  // Helper to ensure valid RFC4122 v4 UUID for Supabase
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      try {
        return crypto.randomUUID()
      } catch {}
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  // Order Operations
  const createOrder = async (orderData) => {
    const newOrderId = generateUUID()
    const newOrder = {
      id: newOrderId,
      status: 'pending',
      created_at: new Date().toISOString(),
      ...orderData,
    }

    if (isSupabaseConfigured) {
      try {
        // ALWAYS use the clean supabaseAnon client for order placement.
        // Orders are open to anyone (guest or signed-in buyer) via public insert RLS policy.
        // Using the pure anon client ensures PostgREST never fails due to third-party JWT algorithm mismatches.
        const client = supabaseAnon || supabase
        let { error } = await client.from('orders').insert([newOrder])
        
        if (error && (error.code === 'PGRST301' || error.message?.includes('key') || error.message?.includes('JWT'))) {
          console.warn('[Supabase] Retrying order insert with clean anon client due to JWT auth error:', error.message)
          if (supabaseAnon && client !== supabaseAnon) {
            const retry = await supabaseAnon.from('orders').insert([newOrder])
            error = retry.error
          }
        }

        if (error) {
          console.warn('[Supabase] Remote order insert encountered an issue, saved locally:', error.message || error)
        } else {
          console.log('[Supabase] Order placed successfully:', newOrderId)
        }
      } catch (err) {
        console.warn('[Supabase] Remote order insert error (non-fatal, order saved locally):', err)
      }
    }

    setOrders(prev => [newOrder, ...prev])

    // If order has a user_id, upsert their buyer profile details
    if (newOrder.user_id) {
      saveBuyerProfile(newOrder.user_id, {
        phone: newOrder.buyer_phone,
        whatsapp: newOrder.buyer_whatsapp,
        address: newOrder.buyer_address,
      })
    }

    return newOrder
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    // 1. Immediately update React state and localStorage immutably
    setOrders(prev => {
      const next = prev.map(o => (String(o.id) === String(orderId) ? { ...o, status: newStatus } : o))
      try {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(next))
      } catch (e) {}
      return next
    })

    // 2. Persist update to Supabase
    if (isSupabaseConfigured) {
      try {
        const client = supabaseAnon || supabase
        const { error } = await client
          .from('orders')
          .update({ status: newStatus })
          .eq('id', orderId)

        if (error) {
          console.warn(`[Supabase] Failed to update order #${orderId} status:`, error.message || error)
        } else {
          console.log(`[Supabase] Order #${orderId} status successfully updated to "${newStatus}"`)
        }
      } catch (err) {
        console.error('[Supabase] updateOrderStatus exception:', err)
      }
    }
  }

  const deleteOrder = async (orderId) => {
    // 1. Immediately update state and localStorage
    setOrders(prev => {
      const next = prev.filter(o => String(o.id) !== String(orderId))
      try {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(next))
      } catch (e) {}
      return next
    })

    // 2. Persist deletion to Supabase
    if (isSupabaseConfigured) {
      try {
        const client = supabaseAnon || supabase
        const { error } = await client.from('orders').delete().eq('id', orderId)
        if (error) {
          console.warn('[Supabase] Failed to delete order from database:', error.message)
        } else {
          console.log(`[Supabase] Order #${orderId} deleted successfully from database`)
        }
      } catch (err) {
        console.error('[Supabase] deleteOrder exception:', err)
      }
    }
  }

  // Buyer Profile Operations
  const getBuyerProfile = (userId) => {
    return buyerProfiles[userId] || null
  }

  const saveBuyerProfile = async (userId, data) => {
    const updated = {
      user_id: userId,
      ...data,
      updated_at: new Date().toISOString()
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('buyer_profiles').upsert([updated])
      } catch (err) {
        console.error(err)
      }
    }

    setBuyerProfiles(prev => ({
      ...prev,
      [userId]: updated
    }))
  }

  // Homepage Banner Operations
  const updateBanner = async (section, data) => {
    const updated = {
      ...(banners[section] || INITIAL_BANNERS[section] || {}),
      ...data,
      section,
      updated_at: new Date().toISOString()
    }

    setBanners(prev => ({
      ...prev,
      [section]: updated
    }))

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('homepage_banners')
          .upsert({
            section,
            eyebrow_tag: updated.eyebrow_tag || '',
            headline: updated.headline || '',
            subtext: updated.subtext || '',
            cta_text: updated.cta_text || '',
            cta_link: updated.cta_link || '',
            image_url: updated.image_url || '',
            updated_at: updated.updated_at
          }, { onConflict: 'section' })

        if (error) {
          console.warn('Supabase banner upsert notice:', error.message)
        }
      } catch (err) {
        console.warn('Failed to upsert banner to Supabase:', err)
      }
    }

    return updated
  }

  const resetBanner = async (section) => {
    if (!INITIAL_BANNERS[section]) return
    return await updateBanner(section, INITIAL_BANNERS[section])
  }

  return (
    <AppContext.Provider
      value={{
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        refreshCategories,
        products,
        orders,
        banners,
        isLoading,
        mockUser,
        setMockUser,
        logout,
        registerLogoutHandler,
        isLiveBackend: isSupabaseConfigured && isClerkConfigured,
        addProduct,
        updateProduct,
        toggleSoldOut,
        deleteProduct,
        createOrder,
        updateOrderStatus,
        deleteOrder,
        refreshOrders,
        getBuyerProfile,
        saveBuyerProfile,
        updateBanner,
        resetBanner,
        refreshBanners,

      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
