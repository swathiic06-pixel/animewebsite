import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase, supabaseAnon, isSupabaseConfigured } from '../lib/supabaseClient'
import { isClerkConfigured, OWNER_CLERK_ID, isOwnerUser } from '../lib/clerkClient'

const AppContext = createContext(null)

const PRODUCTS_STORAGE_KEY = 'animemax_products_v2'
const CATEGORIES_STORAGE_KEY = 'animemax_categories_v1'
const ORDERS_STORAGE_KEY = 'animemax_orders_v1'
const PROFILES_STORAGE_KEY = 'animemax_profiles_v1'
const MOCK_USER_STORAGE_KEY = 'animemax_mock_user_v1'
const BANNERS_STORAGE_KEY = 'animemax_banners_v1'
const REQUESTS_STORAGE_KEY = 'animemax_requests_v1'
const REPLACEMENTS_STORAGE_KEY = 'animemax_replacements_v2'

export function generateUUID() {
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

  const [requests, setRequests] = useState(() => {
    try {
      const saved = localStorage.getItem(REQUESTS_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [replacementRequests, setReplacementRequests] = useState(() => {
    try {
      const saved = localStorage.getItem(REPLACEMENTS_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
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

  // Sync requests to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests))
    } catch (e) {
      console.error(e)
    }
  }, [requests])

  const categoriesTableAvailableRef = useRef(true)

  // Dedicated function to fetch/refresh categories from Supabase
  const refreshCategories = useCallback(async () => {
    if (!isSupabaseConfigured || !categoriesTableAvailableRef.current) return

    try {
      const client = supabaseAnon || supabase
      const { data: remoteCategories, error: catErr } = await client
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (!catErr && Array.isArray(remoteCategories) && remoteCategories.length > 0) {
        setCategories(remoteCategories)
        try {
          localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(remoteCategories))
        } catch (e) {}
      } else if (catErr && (catErr.code === 'PGRST205' || catErr.message?.includes('schema cache'))) {
        categoriesTableAvailableRef.current = false
      } else if (catErr) {
        console.warn('Categories fetch notice:', catErr.message)
      }
    } catch (err) {
      console.warn('Failed to refresh categories from Supabase:', err)
    }
  }, [])

  // Dedicated function to fetch/refresh products from Supabase (single shared store catalog)
  const refreshProducts = useCallback(async () => {
    if (!isSupabaseConfigured) return

    try {
      const client = supabaseAnon || supabase
      const { data: remoteProducts, error: prodErr } = await client
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('[Supabase products refresh]', { count: remoteProducts?.length, prodErr: prodErr?.message })

      // Also fetch product images gallery
      const { data: remoteImages } = await client
        .from('product_images')
        .select('*')
        .order('sort_order', { ascending: true })

      const imagesByProduct = new Map()
      if (Array.isArray(remoteImages)) {
        remoteImages.forEach(img => {
          if (!imagesByProduct.has(img.product_id)) {
            imagesByProduct.set(img.product_id, [])
          }
          imagesByProduct.get(img.product_id).push(img)
        })
      }

      if (!prodErr && Array.isArray(remoteProducts)) {
        const cleanRemote = remoteProducts
          .filter(p => p && p.id && !p.id.startsWith('hw-') && !p.id.startsWith('prod-00') && p.name?.toLowerCase() !== 'supabase' && p.name?.toLowerCase() !== 'demo' && p.name?.toLowerCase() !== 'demo product')
          .map(p => {
            const imgs = imagesByProduct.get(p.id) || []
            const cover = imgs.find(i => i.is_cover) || imgs[0]
            const coverUrl = cover?.image_url || p.image_url || ''
            return {
              ...p,
              image_url: coverUrl,
              images: imgs.length > 0 ? imgs : (coverUrl ? [{ id: `legacy-${p.id}`, product_id: p.id, image_url: coverUrl, sort_order: 0, is_cover: true }] : [])
            }
          })

        setProducts(cleanRemote)
        try {
          localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(cleanRemote))
        } catch (e) {}
      } else if (prodErr) {
        console.warn('Products refresh notice:', prodErr.message)
      }
    } catch (err) {
      console.warn('Failed to refresh products from Supabase:', err)
    }
  }, [])



  // Dedicated function to fetch/refresh homepage banners from Supabase
  const refreshBanners = useCallback(async () => {
    if (!isSupabaseConfigured) return

    try {
      const client = supabaseAnon || supabase
      const { data: remoteBanners, error: banErr } = await client
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
          try {
            localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(merged))
          } catch {}
          return merged
        })
      } else if (banErr) {
        console.warn('Homepage banners fetch notice:', banErr.message)
      }
    } catch (err) {
      console.warn('Failed to refresh banners from Supabase:', err)
    }
  }, [])

  // Dedicated function to fetch/refresh orders from Supabase
  const refreshOrders = useCallback(async () => {
    if (!isSupabaseConfigured) return

    try {
      const client = supabaseAnon || supabase
      let { data: remoteOrders, error: ordErr } = await client
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })

      if (ordErr && (ordErr.code === 'PGRST301' || ordErr.message?.includes('key') || ordErr.message?.includes('JWT'))) {
        if (supabaseAnon && client !== supabaseAnon) {
          const retry = await supabaseAnon
            .from('orders')
            .select('*, order_items(*)')
            .order('created_at', { ascending: false })
          remoteOrders = retry.data
          ordErr = retry.error
        }
      }

      if (!ordErr && Array.isArray(remoteOrders)) {
        const cleanRemote = remoteOrders
          .filter(o => o && o.id && o.id !== 'ord-9042' && o.id !== 'ord-8711' && !String(o.id).startsWith('ord-demo'))
          .map(o => {
            const relItems = Array.isArray(o.order_items) ? o.order_items : []
            const enrichedItems = (Array.isArray(o.items) ? o.items : []).map((it, idx) => {
              const pId = String(it.product_id || it.id || '')
              const matchOi = relItems.find(oi => String(oi.product_id) === pId) || relItems[idx]
              return {
                ...it,
                order_item_id: matchOi ? matchOi.id : (it.order_item_id || null)
              }
            })
            return {
              ...o,
              items: enrichedItems
            }
          })
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
  }, [])

  // Dedicated function to fetch/refresh product gallery images from Supabase
  const refreshProductImages = useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const client = supabaseAnon || supabase
      const { data: remoteImages, error: imgErr } = await client
        .from('product_images')
        .select('*')
        .order('sort_order', { ascending: true })

      if (!imgErr && Array.isArray(remoteImages)) {
        const imagesByProduct = new Map()
        remoteImages.forEach(img => {
          if (!imagesByProduct.has(img.product_id)) {
            imagesByProduct.set(img.product_id, [])
          }
          imagesByProduct.get(img.product_id).push(img)
        })

        setProducts(prevProducts => {
          const updated = prevProducts.map(p => {
            const imgs = imagesByProduct.get(p.id) || []
            if (imgs.length === 0) return p
            const cover = imgs.find(i => i.is_cover) || imgs[0]
            return {
              ...p,
              image_url: cover?.image_url || p.image_url,
              images: imgs
            }
          })
          try {
            localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated))
          } catch {}
          return updated
        })
      }
    } catch (err) {
      console.warn('Failed to refresh product images:', err)
    }
  }, [])

  // Dedicated function to fetch/refresh buyer product requests from Supabase
  const refreshRequests = useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const client = supabaseAnon || supabase
      const { data: remoteRequests, error } = await client
        .from('product_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(remoteRequests)) {
        setRequests(remoteRequests)
        try {
          localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(remoteRequests))
        } catch {}
      } else if (error) {
        console.warn('Product requests fetch warning:', error.message)
      }
    } catch (err) {
      console.warn('Failed to refresh requests:', err)
    }
  }, [])

  // Dedicated function to fetch/refresh replacement requests from Supabase
  const refreshReplacementRequests = useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const client = supabaseAnon || supabase
      const { data: remoteReplacements, error } = await client
        .from('replacement_requests')
        .select(`
          *,
          images:replacement_request_images(*)
        `)
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(remoteReplacements)) {
        setReplacementRequests(remoteReplacements)
        try {
          localStorage.setItem(REPLACEMENTS_STORAGE_KEY, JSON.stringify(remoteReplacements))
        } catch {}
      } else if (error) {
        console.warn('Replacement requests fetch warning:', error.message)
      }
    } catch (err) {
      console.warn('Failed to refresh replacement requests:', err)
    }
  }, [])

  // Dedicated function to fetch/refresh buyer profiles from Supabase
  const refreshBuyerProfiles = useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const client = supabaseAnon || supabase
      const { data: remoteProfiles, error: profErr } = await client
        .from('buyer_profiles')
        .select('*')

      if (!profErr && Array.isArray(remoteProfiles)) {
        const profMap = {}
        remoteProfiles.forEach(p => {
          if (p.user_id) profMap[p.user_id] = p
        })
        setBuyerProfiles(profMap)
        try {
          localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profMap))
        } catch {}
      }
    } catch (err) {
      console.warn('Failed to refresh buyer profiles:', err)
    }
  }, [])

  // Master function to sync the entire store and admin suite at once
  const [isSyncingAll, setIsSyncingAll] = useState(false)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)

  const refreshAllAdminData = useCallback(async () => {
    setIsSyncingAll(true)
    try {
      await Promise.allSettled([
        refreshProducts(),
        refreshCategories(),
        refreshOrders(),
        refreshRequests(),
        refreshReplacementRequests(),
        refreshBanners(),
        refreshBuyerProfiles(),
      ])
    } finally {
      setIsSyncingAll(false)
    }
  }, [refreshProducts, refreshCategories, refreshOrders, refreshRequests, refreshReplacementRequests, refreshBanners, refreshBuyerProfiles])

  // Load all store data from Supabase on mount
  useEffect(() => {
    if (!isSupabaseConfigured) return

    async function loadSupabaseData() {
      setIsLoading(true)
      try {
        await Promise.allSettled([
          refreshProducts(),
          refreshCategories(),
          refreshOrders(),
          refreshRequests(),
          refreshBanners(),
          refreshBuyerProfiles(),
        ])
      } catch (err) {
        console.warn('Supabase initial fetch notice:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadSupabaseData()
  }, [refreshProducts, refreshCategories, refreshOrders, refreshRequests, refreshBanners, refreshBuyerProfiles])

  // Cross-tab storage synchronization across all store entities
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
      } else if (e.key === CATEGORIES_STORAGE_KEY) {
        try {
          const updated = JSON.parse(e.newValue || '[]')
          if (Array.isArray(updated)) setCategories(updated)
        } catch {}
      } else if (e.key === REQUESTS_STORAGE_KEY) {
        try {
          const updated = JSON.parse(e.newValue || '[]')
          if (Array.isArray(updated)) setRequests(updated)
        } catch {}
      } else if (e.key === BANNERS_STORAGE_KEY) {
        try {
          const updated = JSON.parse(e.newValue || '{}')
          if (typeof updated === 'object' && updated !== null) setBanners(prev => ({ ...prev, ...updated }))
        } catch {}
      } else if (e.key === PROFILES_STORAGE_KEY) {
        try {
          const updated = JSON.parse(e.newValue || '{}')
          if (typeof updated === 'object' && updated !== null) setBuyerProfiles(updated)
        } catch {}
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Supabase Realtime subscriptions: Live synchronization across all owners, devices, and browsers
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const client = supabaseAnon || supabase
    if (!client || typeof client.channel !== 'function') return

    const adminSyncChannel = client
      .channel('animemax-admin-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async (payload) => {
        console.log('[Realtime] Products change:', payload.eventType)
        await refreshProducts()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_images' }, async (payload) => {
        console.log('[Realtime] Product images change:', payload.eventType)
        await refreshProducts()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, async (payload) => {
        console.log('[Realtime] Categories change:', payload.eventType)
        await refreshCategories()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async (payload) => {
        console.log('[Realtime] Orders change:', payload.eventType)
        await refreshOrders()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_requests' }, async (payload) => {
        console.log('[Realtime] Product requests change:', payload.eventType)
        await refreshRequests()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replacement_requests' }, async (payload) => {
        console.log('[Realtime] Replacement requests change:', payload.eventType)
        await refreshReplacementRequests()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replacement_request_images' }, async (payload) => {
        console.log('[Realtime] Replacement request images change:', payload.eventType)
        await refreshReplacementRequests()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, async (payload) => {
        console.log('[Realtime] Order items change:', payload.eventType)
        await refreshOrders()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homepage_banners' }, async (payload) => {
        console.log('[Realtime] Homepage banners change:', payload.eventType)
        await refreshBanners()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buyer_profiles' }, async (payload) => {
        console.log('[Realtime] Buyer profiles change:', payload.eventType)
        await refreshBuyerProfiles()
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true)
          console.log('[Supabase Realtime] Connected to live store channel')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsRealtimeConnected(false)
          console.warn('[Supabase Realtime] Channel status:', status, err)
        }
      })

    return () => {
      try {
        client.removeChannel(adminSyncChannel)
        setIsRealtimeConnected(false)
      } catch {}
    }
  }, [refreshProducts, refreshCategories, refreshOrders, refreshRequests, refreshReplacementRequests, refreshBanners, refreshBuyerProfiles])

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

    if (isSupabaseConfigured) {
      try {
        const client = supabase || supabaseAnon
        let { data, error } = await client
          .from('categories')
          .insert([newCategory])
          .select()

        if (error && supabaseAnon && client !== supabaseAnon) {
          const retry = await supabaseAnon.from('categories').insert([newCategory]).select()
          data = retry.data
          error = retry.error
        }

        if (!error && data?.[0]) {
          const created = data[0]
          setCategories(prev => {
            const next = [...prev.filter(c => c.id !== created.id && c.slug !== created.slug), created]
            return next.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          })
          try {
            localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories))
          } catch {}
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
      const sorted = next.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      try {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(sorted))
        window.dispatchEvent(new Event('storage'))
      } catch (e) {}
      return sorted
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

    if (isSupabaseConfigured) {
      try {
        const client = supabase || supabaseAnon
        let { error } = await client.from('categories').update(sanitized).eq('id', id)
        if (error && supabaseAnon && client !== supabaseAnon) {
          await supabaseAnon.from('categories').update(sanitized).eq('id', id)
        }
      } catch (err) {
        console.warn('Supabase category update error:', err)
      }
    }

    setCategories(prev => {
      const next = prev.map(c => (c.id === id ? { ...c, ...sanitized } : c))
      const sorted = next.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      try {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(sorted))
        window.dispatchEvent(new Event('storage'))
      } catch (e) {}
      return sorted
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

    if (isSupabaseConfigured) {
      try {
        const client = supabase || supabaseAnon
        let { error } = await client.from('categories').delete().eq('id', id)
        if (error && supabaseAnon && client !== supabaseAnon) {
          await supabaseAnon.from('categories').delete().eq('id', id)
        }
      } catch (err) {
        console.warn('Supabase category delete error:', err)
      }
    }

    setCategories(prev => {
      const next = prev.filter(c => c.id !== id)
      try {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(next))
        window.dispatchEvent(new Event('storage'))
      } catch (e) {}
      return next
    })
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

    // Extract images if provided
    const rawImages = Array.isArray(productData.images) ? productData.images : []
    const coverFromImages = rawImages.find(img => img.is_cover) || rawImages[0]
    const resolvedImageUrl = coverFromImages?.image_url || productData.image_url || ''

    // Strip client-only or non-existent columns (category_slug, images)
    const { category_slug, images, ...cleanProductData } = productData

    const newProduct = {
      id: generateUUID(),
      created_at: new Date().toISOString(),
      ...cleanProductData,
      image_url: resolvedImageUrl,
      in_stock: inStock,
      stock: stockUnits,
      price: parseFloat(productData.price) || 0,
      display_section: section,
      sort_order: sortOrder,
      category_id: categoryId,
      category: categoryName,
    }

    let imageRows = []
    if (rawImages.length > 0) {
      imageRows = rawImages.map((img, idx) => ({
        product_id: newProduct.id,
        image_url: typeof img === 'string' ? img : img.image_url,
        sort_order: (img.sort_order !== undefined && img.sort_order !== null) ? Number(img.sort_order) : idx,
        is_cover: typeof img === 'object' && img.is_cover !== undefined ? Boolean(img.is_cover) : (idx === 0)
      }))
    } else if (resolvedImageUrl) {
      imageRows = [{
        product_id: newProduct.id,
        image_url: resolvedImageUrl,
        sort_order: 0,
        is_cover: true
      }]
    }

    if (imageRows.length > 0 && !imageRows.some(i => i.is_cover)) {
      imageRows[0].is_cover = true
    }

    newProduct.images = imageRows

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
    if (isSupabaseConfigured) {
      try {
        const client = supabase || supabaseAnon
        const payload = cleanProductData ? {
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
          display_section: newProduct.display_section,
          sort_order: newProduct.sort_order,
          category_id: newProduct.category_id,
          created_at: newProduct.created_at
        } : newProduct

        let { data, error } = await client.from('products').insert([payload]).select()

        if (error && supabaseAnon && client !== supabaseAnon) {
          const retry = await supabaseAnon.from('products').insert([payload]).select()
          data = retry.data
          error = retry.error
        }

        if (!error && data && data[0]) {
          const finalItem = { ...newProduct, ...data[0], images: imageRows }
          const finalList = [finalItem, ...resolvedList]
          setProducts(finalList)
          try {
            localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(finalList))
          } catch (e) {}
        } else if (error) {
          // If columns don't exist yet on Supabase schema, fallback to inserting core fields:
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
          const retryClient = supabaseAnon || client
          await retryClient.from('products').insert([coreFallback])
        }

        // Insert gallery images into product_images table
        if (imageRows.length > 0) {
          try {
            const imgClient = supabaseAnon || supabase
            await imgClient.from('product_images').insert(imageRows)
          } catch (imgErr) {
            console.warn('Supabase product_images insert warning:', imgErr)
          }
        }
      } catch (err) {
        console.warn('Supabase product insert error (persisted in localStorage):', err)
      }
    }

    return newProduct
  }


  const updateProduct = async (id, updates) => {
    const rawImages = Array.isArray(updates.images) ? updates.images : null
    let imageRows = null
    let coverUrl = updates.image_url

    if (rawImages) {
      imageRows = rawImages.map((img, idx) => ({
        product_id: id,
        image_url: typeof img === 'string' ? img : img.image_url,
        sort_order: (img.sort_order !== undefined && img.sort_order !== null) ? Number(img.sort_order) : idx,
        is_cover: typeof img === 'object' && img.is_cover !== undefined ? Boolean(img.is_cover) : (idx === 0)
      }))
      if (imageRows.length > 0 && !imageRows.some(i => i.is_cover)) {
        imageRows[0].is_cover = true
      }
      const cover = imageRows.find(i => i.is_cover) || imageRows[0]
      if (cover?.image_url) {
        coverUrl = cover.image_url
      }
    }

    const sanitized = {
      ...updates,
      price: updates.price !== undefined ? parseFloat(updates.price) : undefined,
      stock: updates.stock !== undefined ? parseInt(updates.stock) : undefined,
      sort_order: updates.sort_order !== undefined ? parseInt(updates.sort_order) || 0 : undefined,
    }
    if (coverUrl !== undefined) {
      sanitized.image_url = coverUrl
    }
    delete sanitized.category_slug
    delete sanitized.images

    let currentList = products
    if (sanitized.display_section) {
      currentList = await resolvePlacements(products, id, sanitized.display_section)
    }

    const updatedList = currentList.map(p => {
      if (p.id !== id) return p
      const updated = { ...p, ...sanitized }
      if (imageRows) {
        updated.images = imageRows
      }
      return updated
    })
    setProducts(updatedList)
    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updatedList))
      window.dispatchEvent(new Event('storage'))
    } catch (e) {}

    if (isSupabaseConfigured) {
      try {
        const client = supabase || supabaseAnon
        let { error } = await client.from('products').update(sanitized).eq('id', id)
        if (error && supabaseAnon && client !== supabaseAnon) {
          const retry = await supabaseAnon.from('products').update(sanitized).eq('id', id)
          error = retry.error
        }
        if (error) {
          // Fallback if schema does not have display_section or sort_order yet
          const { display_section, sort_order, category_id, ...fallbackUpdates } = sanitized
          if (Object.keys(fallbackUpdates).length > 0) {
            const fallbackClient = supabaseAnon || client
            await fallbackClient.from('products').update(fallbackUpdates).eq('id', id)
          }
        }

        if (imageRows) {
          try {
            const imgClient = supabaseAnon || client
            await imgClient.from('product_images').delete().eq('product_id', id)
            if (imageRows.length > 0) {
              await imgClient.from('product_images').insert(imageRows)
            }
          } catch (imgErr) {
            console.warn('Failed to update product_images in Supabase:', imgErr)
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

    // Manual override: sets manually_sold_out as override
    const newManuallySoldOut = !Boolean(product.manually_sold_out)
    // in_stock is computed based on stock > 0 and !manually_sold_out
    const newInStock = Number(product.stock) > 0 && !newManuallySoldOut

    const updates = {
      manually_sold_out: newManuallySoldOut,
      in_stock: newInStock,
    }

    await updateProduct(id, updates)
  }

  const deleteProduct = async (id) => {
    // 1. Immediately update local state & localStorage so UI is instant and doesn't flicker
    setProducts(prev => {
      const next = prev.filter(p => p.id !== id)
      try {
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(next))
        window.dispatchEvent(new Event('storage'))
      } catch (e) {}
      return next
    })

    // 2. Persist deletion to Supabase
    if (isSupabaseConfigured) {
      try {
        const client = supabase || supabaseAnon
        let { error } = await client.from('products').delete().eq('id', id)
        if (error && supabaseAnon && client !== supabaseAnon) {
          const retry = await supabaseAnon.from('products').delete().eq('id', id)
          error = retry.error
        }
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

  // Product Requests Operations
  const submitProductRequest = async ({ product_name, reference_image_url, user_id }) => {
    const trimmedName = (product_name || '').trim()
    const trimmedImg = (reference_image_url || '').trim()

    if (!trimmedName && !trimmedImg) {
      throw new Error('Please provide a product/character name or a reference photo.')
    }

    const newRequest = {
      id: generateUUID(),
      product_name: trimmedName || null,
      reference_image_url: trimmedImg || null,
      user_id: user_id || null,
      status: 'new',
      created_at: new Date().toISOString()
    }

    // Optimistically update React state & localStorage
    setRequests(prev => [newRequest, ...prev])
    try {
      localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify([newRequest, ...requests]))
    } catch {}

    if (isSupabaseConfigured && supabase) {
      const client = supabaseAnon || supabase
      const { data, error } = await client
        .from('product_requests')
        .insert([{
          id: newRequest.id,
          product_name: newRequest.product_name,
          reference_image_url: newRequest.reference_image_url,
          user_id: newRequest.user_id,
          status: 'new',
          created_at: newRequest.created_at
        }])
        .select()

      if (error) {
        console.error('Supabase request insert error:', error)
        // Rollback on failure
        setRequests(prev => prev.filter(r => r.id !== newRequest.id))
        throw new Error(error.message || 'Failed to submit request')
      }

      if (data && data[0]) {
        setRequests(prev => [data[0], ...prev.filter(r => r.id !== newRequest.id)])
        return data[0]
      }
    }

    return newRequest
  }

  const updateRequestStatus = async (id, status) => {
    const valid = ['new', 'reviewing', 'fulfilled', 'declined']
    if (!valid.includes(status)) {
      throw new Error(`Invalid status: ${status}`)
    }

    // Optimistic update
    setRequests(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, status } : r)
      try {
        localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(updated))
        window.dispatchEvent(new Event('storage'))
      } catch {}
      return updated
    })

    if (isSupabaseConfigured) {
      try {
        const client = supabaseAnon || supabase
        let { error } = await client
          .from('product_requests')
          .update({ status })
          .eq('id', id)

        if (error && supabaseAnon && client !== supabaseAnon) {
          const retry = await supabaseAnon.from('product_requests').update({ status }).eq('id', id)
          error = retry.error
        }

        if (error) {
          console.error('Failed to update request status in Supabase:', error)
          await refreshRequests()
        }
      } catch (err) {
        console.error('Error updating request status:', err)
        await refreshRequests()
      }
    }
  }

  const deleteRequest = async (id) => {
    setRequests(prev => {
      const updated = prev.filter(r => r.id !== id)
      try {
        localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(updated))
        window.dispatchEvent(new Event('storage'))
      } catch {}
      return updated
    })

    if (isSupabaseConfigured) {
      try {
        const client = supabaseAnon || supabase
        let { error } = await client.from('product_requests').delete().eq('id', id)
        if (error && supabaseAnon && client !== supabaseAnon) {
          await supabaseAnon.from('product_requests').delete().eq('id', id)
        }
      } catch (err) {
        console.error('Failed to delete request from Supabase:', err)
      }
    }
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
        const client = supabaseAnon || supabase
        // Try atomic RPC create_order_with_stock_decrement first
        let rpcSuccess = false
        try {
          const { data: rpcData, error: rpcErr } = await client.rpc('create_order_with_stock_decrement', {
            p_order_id: newOrderId,
            p_user_id: orderData.user_id || null,
            p_buyer_name: orderData.buyer_name,
            p_buyer_phone: orderData.buyer_phone,
            p_buyer_whatsapp: orderData.buyer_whatsapp,
            p_buyer_address: orderData.buyer_address,
            p_total_amount: orderData.total_amount,
            p_items: orderData.items,
          })
          if (!rpcErr) {
            rpcSuccess = true
            console.log('[Supabase] Atomic order creation & stock decrement succeeded:', newOrderId)
          } else {
            console.warn('[Supabase] RPC create_order_with_stock_decrement notice:', rpcErr.message)
          }
        } catch (rpcEx) {
          console.warn('[Supabase] RPC execution failed, falling back to direct insert:', rpcEx)
        }

        // Fallback: direct insert into orders and order_items if RPC was not used
        if (!rpcSuccess) {
          let { error } = await client.from('orders').insert([newOrder])
          if (error && (error.code === 'PGRST301' || error.message?.includes('key') || error.message?.includes('JWT'))) {
            if (supabaseAnon && client !== supabaseAnon) {
              const retry = await supabaseAnon.from('orders').insert([newOrder])
              error = retry.error
            }
          }

          // Insert into order_items relational table
          if (Array.isArray(orderData.items) && orderData.items.length > 0) {
            const orderItemsRows = orderData.items.map(item => ({
              order_id: newOrderId,
              product_id: item.product_id || item.id,
              quantity: Number(item.qty || item.quantity || 1),
              price_at_purchase: Number(item.price || 0)
            }))
            await client.from('order_items').insert(orderItemsRows).catch(() => {})
          }
        }

        // Trigger notify-owner Edge Function in background
        client.functions.invoke('notify-owner', { body: { record: newOrder } }).catch(err => {
          console.log('[notify-owner] Edge function notice:', err?.message)
        })
      } catch (err) {
        console.warn('[Supabase] Remote order insert error (non-fatal, order saved locally):', err)
      }
    }

    // Atomically decrement stock in local products state immediately
    if (Array.isArray(orderData.items) && orderData.items.length > 0) {
      setProducts(prevProducts => {
        const next = prevProducts.map(p => {
          const matchItem = orderData.items.find(item => String(item.product_id || item.id) === String(p.id))
          if (matchItem) {
            const qty = Number(matchItem.qty || matchItem.quantity || 1)
            const newStock = Math.max(0, (Number(p.stock) || 0) - qty)
            const inStock = newStock > 0 && !p.manually_sold_out
            return { ...p, stock: newStock, in_stock: inStock }
          }
          return p
        })
        try {
          localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(next))
        } catch {}
        return next
      })
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

  // Server-side enforced order cancellation (Part 1)
  const cancelOrder = async (orderId, userId = null) => {
    // 1. Client-side pre-guard
    const targetOrder = orders.find(o => String(o.id) === String(orderId))
    if (targetOrder) {
      const hoursSincePlaced = (Date.now() - new Date(targetOrder.created_at).getTime()) / 36e5
      if (hoursSincePlaced >= 24) {
        throw new Error('Cancellation window has closed (must be within 24 hours of placement).')
      }
      if (!['pending', 'qr_sent', 'payment_confirmed'].includes(targetOrder.status)) {
        throw new Error(`Order cannot be cancelled once dispatched or completed (current status: "${targetOrder.status}").`)
      }
    }

    // 2. Server-side enforcement via Postgres RPC
    if (isSupabaseConfigured) {
      const client = supabaseAnon || supabase
      const { error } = await client.rpc('cancel_order', {
        p_order_id: orderId,
        p_user_id: userId || null,
      })
      if (error) {
        throw new Error(error.message || 'Server rejected cancellation request.')
      }
    }

    const cancelledAt = new Date().toISOString()

    // 3. Update order in local state
    setOrders(prev => {
      const next = prev.map(o => (String(o.id) === String(orderId) ? { ...o, status: 'cancelled', cancelled_at: cancelledAt } : o))
      try {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(next))
        window.dispatchEvent(new Event('storage'))
      } catch (e) {}
      return next
    })

    // 4. Restore product stock locally for all items in that order
    if (targetOrder?.items) {
      setProducts(prevProducts => {
        const next = prevProducts.map(p => {
          const matchItem = targetOrder.items.find(item => String(item.product_id || item.id) === String(p.id))
          if (matchItem) {
            const qty = Number(matchItem.qty || matchItem.quantity || 1)
            const newStock = (Number(p.stock) || 0) + qty
            const inStock = newStock > 0 && !p.manually_sold_out
            return { ...p, stock: newStock, in_stock: inStock }
          }
          return p
        })
        try {
          localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(next))
        } catch {}
        return next
      })
    }

    // Refresh products from remote database to ensure sync
    refreshProducts()
    return true
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    // If updating to cancelled, delegate to cancelOrder to trigger stock restoration
    if (newStatus === 'cancelled') {
      try {
        await cancelOrder(orderId)
        return
      } catch (err) {
        console.warn('cancelOrder failed, applying direct status update:', err.message)
      }
    }

    const updates = { status: newStatus }
    if (newStatus === 'delivered') {
      updates.delivered_at = new Date().toISOString()
    }

    // 1. Immediately update React state and localStorage immutably
    setOrders(prev => {
      const next = prev.map(o => (String(o.id) === String(orderId) ? { ...o, ...updates } : o))
      try {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(next))
        window.dispatchEvent(new Event('storage'))
      } catch (e) {}
      return next
    })

    // 2. Persist update to Supabase
    if (isSupabaseConfigured) {
      try {
        const client = supabaseAnon || supabase
        let { error } = await client
          .from('orders')
          .update(updates)
          .eq('id', orderId)

        if (error && supabaseAnon && client !== supabaseAnon) {
          const retry = await supabaseAnon.from('orders').update(updates).eq('id', orderId)
          error = retry.error
        }

        if (error) {
          console.warn(`[Supabase] Failed to update order #${orderId} status:`, error.message || error)
        } else {
          console.log(`[Supabase] Order #${orderId} status successfully updated to "${newStatus}"`)
        }

        // Auto-generate invoice when order is payment verified or shipped
        if (newStatus === 'payment_confirmed' || newStatus === 'shipped') {
          generateInvoice(orderId).catch(() => {})
        }
      } catch (err) {
        console.error('[Supabase] updateOrderStatus exception:', err)
      }
    }
  }  // Replacement Requests Operations (Amazon-Style Flow)
  const createReplacementRequest = async ({
    orderId,
    orderItemId,
    reasonCategory,
    description,
    imageUrls = [],
    userId = null
  }) => {
    const order = orders.find(o => String(o.id) === String(orderId))
    if (!order) {
      throw new Error('Order not found.')
    }
    if (order.status !== 'delivered') {
      throw new Error(`Replacements can only be requested for delivered orders (current status: "${order.status}").`)
    }
    if (!order.delivered_at) {
      throw new Error('Delivery timestamp is missing for this order.')
    }

    const daysSinceDelivery = (Date.now() - new Date(order.delivered_at).getTime()) / (24 * 36e5)
    if (daysSinceDelivery > 5) {
      throw new Error('Replacement window has closed (5 days post-delivery limit).')
    }
    if (!orderItemId) {
      throw new Error('Specific line item must be selected for replacement.')
    }
    if (!imageUrls || imageUrls.length === 0) {
      throw new Error('At least one photo is required as evidence.')
    }
    if (imageUrls.length > 5) {
      throw new Error('A maximum of 5 photos can be attached.')
    }

    let newRequest = null

    // Call atomic Supabase RPC with server-side 5-day & duplicate verification
    if (isSupabaseConfigured) {
      const client = supabaseAnon || supabase
      const { data, error } = await client.rpc('submit_replacement_request', {
        p_order_id: orderId,
        p_order_item_id: orderItemId,
        p_reason_category: reasonCategory,
        p_description: description.trim(),
        p_image_urls: imageUrls,
        p_user_id: userId || mockUser?.id || null
      })

      if (error) {
        console.error('[Supabase] submit_replacement_request error:', error.message)
        throw new Error(error.message || 'Failed to submit replacement request.')
      }
      newRequest = data
    } else {
      // Local / Offline fallback
      const newId = generateUUID()
      newRequest = {
        id: newId,
        order_id: orderId,
        order_item_id: orderItemId,
        reason_category: reasonCategory,
        description: description.trim(),
        status: 'pending',
        created_at: new Date().toISOString(),
        images: imageUrls.map((url, idx) => ({
          id: generateUUID(),
          replacement_request_id: newId,
          image_url: url,
          sort_order: idx
        }))
      }
    }

    setReplacementRequests(prev => [newRequest, ...prev.filter(r => r.id !== newRequest.id)])
    try {
      localStorage.setItem(REPLACEMENTS_STORAGE_KEY, JSON.stringify([newRequest, ...replacementRequests]))
    } catch {}

    // Trigger notify-owner Edge Function in background
    if (isSupabaseConfigured) {
      const client = supabaseAnon || supabase
      const targetItem = order.items?.find(it => it.order_item_id === orderItemId || (it.product_id || it.id) === orderItemId)
      client.functions.invoke('notify-owner', {
        body: {
          type: 'replacement_request',
          record: {
            ...newRequest,
            product_name: targetItem?.name || 'Anime Collectible',
            buyer_name: order.buyer_name,
            buyer_phone: order.buyer_phone || order.buyer_whatsapp,
            image_urls: imageUrls
          }
        }
      }).catch(err => {
        console.log('[notify-owner] replacement alert notice:', err?.message)
      })
    }

    return newRequest
  }

  const updateReplacementDecision = async ({
    requestId,
    status,
    ownerNote = null,
    trackingNumber = null
  }) => {
    let updated = null

    if (isSupabaseConfigured) {
      const client = supabaseAnon || supabase
      const { data, error } = await client.rpc('update_replacement_decision', {
        p_request_id: requestId,
        p_status: status,
        p_owner_note: ownerNote || null,
        p_tracking_number: trackingNumber || null
      })

      if (error) {
        console.warn('[Supabase] update_replacement_decision RPC failed, falling back to direct update:', error.message)
        const patch = {
          status,
          ...(ownerNote !== null ? { owner_note: ownerNote } : {}),
          ...(trackingNumber ? { tracking_number: trackingNumber, shipped_at: new Date().toISOString() } : {}),
          ...(['approved', 'declined'].includes(status) ? { resolved_at: new Date().toISOString() } : {})
        }
        await client.from('replacement_requests').update(patch).eq('id', requestId)
      } else {
        updated = data
      }
    }

    setReplacementRequests(prev => {
      const next = prev.map(r => {
        if (String(r.id) === String(requestId)) {
          return updated || {
            ...r,
            status,
            ...(ownerNote !== null ? { owner_note: ownerNote } : {}),
            ...(trackingNumber !== null ? { tracking_number: trackingNumber, shipped_at: new Date().toISOString() } : {}),
            ...(['approved', 'declined'].includes(status) ? { resolved_at: new Date().toISOString() } : {})
          }
        }
        return r
      })
      try {
        localStorage.setItem(REPLACEMENTS_STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })

    // Trigger notify-owner / buyer Edge Function
    if (isSupabaseConfigured) {
      const client = supabaseAnon || supabase
      const req = replacementRequests.find(r => String(r.id) === String(requestId))
      client.functions.invoke('notify-owner', {
        body: {
          type: 'replacement_decision',
          record: {
            ...(req || {}),
            ...(updated || {}),
            status,
            owner_note: ownerNote,
            tracking_number: trackingNumber
          }
        }
      }).catch(err => {
        console.log('[notify-owner] decision alert notice:', err?.message)
      })
    }

    return updated
  }

  // Backward compatibility wrapper
  const updateReplacementStatus = async (requestId, newStatus, ownerNote = null, trackingNumber = null) => {
    return updateReplacementDecision({ requestId, status: newStatus, ownerNote, trackingNumber })
  }

  // Shiprocket Shipping Operations (Part 5)
  const createShiprocketShipment = async (orderId, dimensions = {}) => {
    let shipmentData = {
      shiprocket_shipment_id: `SR-${Date.now().toString().slice(-6)}`,
      tracking_number: `AMX${Math.floor(100000000 + Math.random() * 900000000)}IN`,
      tracking_url: '',
      label_url: '',
    }
    shipmentData.tracking_url = `https://shiprocket.co/tracking/${shipmentData.tracking_number}`
    shipmentData.label_url = `https://app.shiprocket.in/print/label/${shipmentData.shiprocket_shipment_id}`

    if (isSupabaseConfigured) {
      try {
        const client = supabaseAnon || supabase
        const { data, error } = await client.functions.invoke('shiprocket-shipment', {
          body: { orderId, ...dimensions }
        })
        if (!error && data?.shipment) {
          shipmentData = data.shipment
        }
      } catch (err) {
        console.warn('[shiprocket-shipment] Edge function fallback:', err)
      }

      // Persist to orders table
      try {
        const client = supabaseAnon || supabase
        await client.from('orders').update({
          shiprocket_shipment_id: shipmentData.shiprocket_shipment_id,
          tracking_number: shipmentData.tracking_number,
          tracking_url: shipmentData.tracking_url,
          label_url: shipmentData.label_url,
          status: 'shipped'
        }).eq('id', orderId)
      } catch {}
    }

    // Update order locally
    setOrders(prev => {
      const next = prev.map(o => (String(o.id) === String(orderId) ? {
        ...o,
        ...shipmentData,
        status: o.status === 'delivered' ? 'delivered' : 'shipped'
      } : o))
      try {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })

    return shipmentData
  }

  // Auto-Generated Invoice Operations (Part 5)
  const generateInvoice = async (orderId) => {
    const order = orders.find(o => String(o.id) === String(orderId))
    if (!order) return null

    let invoiceUrl = order.invoice_url

    if (isSupabaseConfigured) {
      try {
        const client = supabaseAnon || supabase
        const { data, error } = await client.functions.invoke('generate-invoice', {
          body: { orderId }
        })
        if (!error && data?.invoice_url) {
          invoiceUrl = data.invoice_url
        }
      } catch (err) {
        console.warn('[generate-invoice] Edge function notice:', err)
      }
    }

    if (!invoiceUrl) {
      // Offline fallback: data URI invoice document
      const invNum = `INV-${new Date().getFullYear()}-${String(order.id).slice(0, 8).toUpperCase()}`
      invoiceUrl = `data:text/html;charset=utf-8,${encodeURIComponent(`
        <html><head><title>Invoice ${invNum}</title></head>
        <body style="font-family:sans-serif;padding:30px;">
          <h1 style="color:#DC2626;">ANIMEMAX INVOICE</h1>
          <p><strong>Order #:</strong> ${order.id}</p>
          <p><strong>Buyer:</strong> ${order.buyer_name}</p>
          <p><strong>Total:</strong> ₹${order.total_amount}</p>
        </body></html>
      `)}`
    }

    setOrders(prev => {
      const next = prev.map(o => (String(o.id) === String(orderId) ? { ...o, invoice_url: invoiceUrl } : o))
      try {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })

    return invoiceUrl
  }

  // Daily Summary Report Operation (Part 4)
  const sendDailySummary = async () => {
    if (!isSupabaseConfigured) return { success: false, message: 'Backend not configured' }
    try {
      const client = supabaseAnon || supabase
      const { data, error } = await client.functions.invoke('daily-summary')
      if (error) throw error
      return data
    } catch (err) {
      console.error('[daily-summary] Error triggering daily summary:', err)
      throw err
    }
  }

  const deleteOrder = async (orderId) => {
    // 1. Immediately update state and localStorage
    setOrders(prev => {
      const next = prev.filter(o => String(o.id) !== String(orderId))
      try {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(next))
        window.dispatchEvent(new Event('storage'))
      } catch (e) {}
      return next
    })

    // 2. Persist deletion to Supabase
    if (isSupabaseConfigured) {
      try {
        const client = supabaseAnon || supabase
        let { error } = await client.from('orders').delete().eq('id', orderId)
        if (error && supabaseAnon && client !== supabaseAnon) {
          const retry = await supabaseAnon.from('orders').delete().eq('id', orderId)
          error = retry.error
        }
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

    setBuyerProfiles(prev => {
      const next = { ...prev, [userId]: updated }
      try {
        localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(next))
        window.dispatchEvent(new Event('storage'))
      } catch (e) {}
      return next
    })

    if (isSupabaseConfigured) {
      try {
        const client = supabaseAnon || supabase
        let { error } = await client.from('buyer_profiles').upsert([updated])
        if (error && supabaseAnon && client !== supabaseAnon) {
          await supabaseAnon.from('buyer_profiles').upsert([updated])
        }
      } catch (err) {
        console.error(err)
      }
    }
  }

  // Homepage Banner Operations
  const updateBanner = async (section, data) => {
    const updated = {
      ...(banners[section] || INITIAL_BANNERS[section] || {}),
      ...data,
      section,
      updated_at: new Date().toISOString()
    }

    setBanners(prev => {
      const next = { ...prev, [section]: updated }
      try {
        localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(next))
        window.dispatchEvent(new Event('storage'))
      } catch (e) {}
      return next
    })

    if (isSupabaseConfigured) {
      try {
        const client = supabaseAnon || supabase
        let { error } = await client
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

        if (error && supabaseAnon && client !== supabaseAnon) {
          await supabaseAnon
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
        }

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

  // Low stock products calculation (Part 3)
  const lowStockProducts = React.useMemo(() => {
    return products.filter((p) => {
      const threshold = p.low_stock_threshold !== undefined && p.low_stock_threshold !== null ? Number(p.low_stock_threshold) : 2
      const stock = Number(p.stock) || 0
      return stock <= threshold
    })
  }, [products])

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
        cancelOrder,
        updateOrderStatus,
        deleteOrder,
        refreshOrders,
        getBuyerProfile,
        saveBuyerProfile,
        updateBanner,
        resetBanner,
        refreshBanners,
        refreshProductImages,
        refreshProducts,
        refreshBuyerProfiles,
        refreshAllAdminData,
        isRealtimeConnected,
        isSyncingAll,
        requests,
        submitProductRequest,
        updateRequestStatus,
        deleteRequest,
        refreshRequests,
        replacementRequests,
        refreshReplacementRequests,
        createReplacementRequest,
        updateReplacementDecision,
        updateReplacementStatus,
        createShiprocketShipment,
        generateInvoice,
        sendDailySummary,
        lowStockProducts,
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
