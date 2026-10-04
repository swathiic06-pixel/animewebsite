import { chromium } from 'playwright'

async function runTest() {
  console.log('🧪 Starting End-to-End Test for Admin Add Product -> Storefront Appearance...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  const consoleErrors = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })

  try {
    // 1. Visit admin login and set mock owner credentials
    await page.goto('http://localhost:5173/admin/login')
    await page.evaluate(() => {
      localStorage.setItem('animemax_mock_user_v1', JSON.stringify({
        id: 'user_owner_animemax',
        fullName: 'Sai Sharaan (Owner)',
        primaryEmailAddress: { emailAddress: 'owner@animemax.store' },
        role: 'owner'
      }))
    })

    // 2. Navigate to admin products
    await page.goto('http://localhost:5173/admin/products')
    await page.waitForTimeout(1000)

    // Verify Add New Product button is present
    const addBtn = page.locator('button:has-text("Add New Product")')
    await addBtn.click()
    await page.waitForTimeout(500)

    const testProductName = 'Goku Ultra Instinct Figure ' + Date.now().toString().slice(-4)
    console.log(`Adding test product: "${testProductName}"`)

    // Fill form
    await page.locator('input[name="name"]').fill(testProductName)
    await page.locator('input[name="price"]').fill('1299')
    await page.locator('input[name="image_url"]').fill('https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600')
    
    // Select category "Anime"
    await page.locator('select[name="category_id"]').selectOption({ label: 'Anime' })

    // Submit form
    const submitBtn = page.locator('button[type="submit"]:has-text("Save Product")')
    await submitBtn.click()
    await page.waitForTimeout(1000)

    // Verify product is in Admin table
    const tableHasProduct = await page.locator(`td:has-text("${testProductName}")`).isVisible()
    console.log(`✓ Product visible in Admin Products table: ${tableHasProduct}`)
    if (!tableHasProduct) throw new Error('Product not found in Admin table after adding!')

    // 3. Navigate to Storefront
    console.log('\n--- Navigating to Storefront ---')
    await page.goto('http://localhost:5173/')
    await page.waitForTimeout(1000)

    // Check if the product appears in Storefront Catalog
    const storefrontProduct = page.locator(`h3:has-text("${testProductName}")`)
    const isVisibleOnStorefront = await storefrontProduct.isVisible()
    console.log(`✓ Product visible in Storefront All Products grid: ${isVisibleOnStorefront}`)
    if (!isVisibleOnStorefront) throw new Error('Product failed to appear on Storefront!')

    // 4. Test page reload on Storefront to ensure it persists
    console.log('\n--- Reloading Storefront page to test persistence ---')
    await page.reload()
    await page.waitForTimeout(1000)

    const isVisibleAfterReload = await storefrontProduct.isVisible()
    console.log(`✓ Product visible after page reload: ${isVisibleAfterReload}`)
    if (!isVisibleAfterReload) throw new Error('Product disappeared after page reload!')

    // 5. Test Category filter on Storefront
    console.log('\n--- Testing Category Filter for "Anime" ---')
    const animePill = page.locator('.sf-chip', { hasText: 'Anime' })
    await animePill.click()
    await page.waitForTimeout(500)

    const isVisibleInAnimeCategory = await storefrontProduct.isVisible()
    console.log(`✓ Product visible when filtered by "Anime" category: ${isVisibleInAnimeCategory}`)
    if (!isVisibleInAnimeCategory) throw new Error('Product did not appear under Anime category filter!')

    // Screenshot
    await page.screenshot({ path: 'verify_product_added_storefront.png', fullPage: false })
    console.log('📸 Saved verify_product_added_storefront.png')

    console.log('\n🎉 ALL TESTS PASSED! Product was added in Admin and appears seamlessly in Storefront!')

  } catch (err) {
    console.error('❌ Test failed:', err.message)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

runTest()
