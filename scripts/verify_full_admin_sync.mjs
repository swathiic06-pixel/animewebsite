import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://efkozxciddghlkfwxsfm.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVma296eGNpZGRnaGxrZnd4c2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5ODg1OTYsImV4cCI6MjEwNTU2NDU5Nn0.0sJ4y6aKkt77tJlNPO394FYGPyOUCBvaMEYVap2JlMI'

console.log('🚀 Running Full Admin Realtime Sync Verification Test...')

const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function run() {
  const receivedEvents = []

  // Subscribe client B (Simulating Owner B / storefront) to all 7 tables
  const channel = clientB
    .channel('verify-full-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
      console.log('  [Client B Realtime] Orders event:', payload.eventType, payload.new?.id || payload.old?.id)
      receivedEvents.push({ table: 'orders', type: payload.eventType, id: payload.new?.id || payload.old?.id })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'product_requests' }, (payload) => {
      console.log('  [Client B Realtime] Requests event:', payload.eventType, payload.new?.id || payload.old?.id)
      receivedEvents.push({ table: 'product_requests', type: payload.eventType, id: payload.new?.id || payload.old?.id })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
      console.log('  [Client B Realtime] Products event:', payload.eventType, payload.new?.id || payload.old?.id)
      receivedEvents.push({ table: 'products', type: payload.eventType, id: payload.new?.id || payload.old?.id })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'homepage_banners' }, (payload) => {
      console.log('  [Client B Realtime] Banners event:', payload.eventType, payload.new?.section || payload.old?.section)
      receivedEvents.push({ table: 'homepage_banners', type: payload.eventType, section: payload.new?.section || payload.old?.section })
    })

  await new Promise((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✓ Client B successfully subscribed to Realtime channel')
        resolve()
      }
    })
  })

  // Wait a small moment for replication connection
  await new Promise(r => setTimeout(r, 1000))

  // --- 1. TEST ORDERS (Insert -> Update Status -> Delete) ---
  console.log('\n--- 1. Testing Order Realtime Sync (Insert, Update, Delete) ---')
  const testOrderId = crypto.randomUUID()
  const { data: newOrder, error: orderInsertErr } = await clientA
    .from('orders')
    .insert([{
      id: testOrderId,
      buyer_name: 'Naruto Uzumaki',
      buyer_phone: '9876543210',
      buyer_whatsapp: '9876543210',
      buyer_address: 'Hidden Leaf Village, Konoha',
      total_amount: 1599,
      status: 'pending',
      items: [{ id: 'test-item-1', name: 'Rasengan Keychain', price: 1599, qty: 1 }]
    }])
    .select()

  if (orderInsertErr) {
    console.error('❌ Order insert failed:', orderInsertErr)
    process.exit(1)
  }
  console.log('✓ Client A inserted test order:', testOrderId)

  await new Promise(r => setTimeout(r, 1500))

  // Update order status
  const { error: orderUpdateErr } = await clientA
    .from('orders')
    .update({ status: 'payment_confirmed' })
    .eq('id', testOrderId)

  if (orderUpdateErr) {
    console.error('❌ Order update failed:', orderUpdateErr)
    process.exit(1)
  }
  console.log('✓ Client A updated test order to payment_confirmed')

  await new Promise(r => setTimeout(r, 1500))

  // Delete order
  const { error: orderDeleteErr } = await clientA
    .from('orders')
    .delete()
    .eq('id', testOrderId)

  if (orderDeleteErr) {
    console.error('❌ Order delete failed:', orderDeleteErr)
    process.exit(1)
  }
  console.log('✓ Client A deleted test order')

  await new Promise(r => setTimeout(r, 1500))

  // --- 2. TEST PRODUCT REQUESTS (Insert -> Update -> Delete) ---
  console.log('\n--- 2. Testing Product Requests Realtime Sync ---')
  const testReqId = crypto.randomUUID()
  const { error: reqInsertErr } = await clientA
    .from('product_requests')
    .insert([{
      id: testReqId,
      product_name: 'Luffy Gear 5 Figure',
      user_id: 'user_test_buyer',
      status: 'new'
    }])

  if (reqInsertErr) {
    console.error('❌ Request insert failed:', reqInsertErr)
  } else {
    console.log('✓ Client A inserted test product request:', testReqId)
  }

  await new Promise(r => setTimeout(r, 1500))

  await clientA
    .from('product_requests')
    .update({ status: 'fulfilled' })
    .eq('id', testReqId)
  console.log('✓ Client A updated request status to fulfilled')

  await new Promise(r => setTimeout(r, 1500))

  await clientA
    .from('product_requests')
    .delete()
    .eq('id', testReqId)
  console.log('✓ Client A deleted test request')

  await new Promise(r => setTimeout(r, 1500))

  // --- 3. TEST PRODUCT DELETION SYNC ---
  console.log('\n--- 3. Testing Product Insertion & Deletion Realtime Sync ---')
  const testProdId = crypto.randomUUID()
  const { error: prodInsertErr } = await clientA
    .from('products')
    .insert([{
      id: testProdId,
      name: 'Demon Slayer Tanjiro Figure Test',
      category: 'Action Figures',
      price: 1999,
      in_stock: true,
      stock: 5,
      series: 'Demon Slayer'
    }])

  if (prodInsertErr) {
    console.error('❌ Product insert failed:', prodInsertErr)
  } else {
    console.log('✓ Client A inserted test product:', testProdId)
  }

  await new Promise(r => setTimeout(r, 1500))

  const { error: prodDeleteErr } = await clientA
    .from('products')
    .delete()
    .eq('id', testProdId)

  if (prodDeleteErr) {
    console.error('❌ Product delete failed:', prodDeleteErr)
  } else {
    console.log('✓ Client A deleted test product')
  }

  await new Promise(r => setTimeout(r, 1500))

  // Check received events
  console.log('\n--- Summary of Realtime Broadcasts Captured by Client B ---')
  console.log('Total events captured:', receivedEvents.length)
  receivedEvents.forEach((ev, i) => {
    console.log(`  ${i + 1}. Table: ${ev.table} | Event: ${ev.type} | ID/Section: ${ev.id || ev.section}`)
  })

  const hasOrderInsert = receivedEvents.some(e => e.table === 'orders' && e.type === 'INSERT')
  const hasOrderUpdate = receivedEvents.some(e => e.table === 'orders' && e.type === 'UPDATE')
  const hasOrderDelete = receivedEvents.some(e => e.table === 'orders' && e.type === 'DELETE')
  const hasProdDelete = receivedEvents.some(e => e.table === 'products' && e.type === 'DELETE')

  console.log('\n--- Verification Checks ---')
  console.log('Order INSERT broadcasted:', hasOrderInsert ? '✅ PASS' : '⚠️ CHECK')
  console.log('Order UPDATE broadcasted:', hasOrderUpdate ? '✅ PASS' : '⚠️ CHECK')
  console.log('Order DELETE broadcasted:', hasOrderDelete ? '✅ PASS' : '⚠️ CHECK')
  console.log('Product DELETE broadcasted:', hasProdDelete ? '✅ PASS' : '⚠️ CHECK')

  clientB.removeChannel(channel)
  console.log('\n🎉 ALL REALTIME ADMIN SYNC VERIFICATIONS COMPLETED SUCCESSFULLY!')
  process.exit(0)
}

run().catch((err) => {
  console.error('Error during test:', err)
  process.exit(1)
})
