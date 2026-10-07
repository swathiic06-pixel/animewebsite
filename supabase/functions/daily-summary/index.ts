// Supabase Edge Function: daily-summary
// Scheduled once daily (e.g. 9 PM IST) or invoked manually from Admin panel
// Compiles today's orders, revenue, status breakdown, and low-stock products

/// <reference path="../deno.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Compute beginning of today in IST (UTC+5:30)
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const istDate = new Date(now.getTime() + istOffset)
    const startOfTodayIst = new Date(Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), istDate.getUTCDate()) - istOffset)

    // 1. Fetch orders placed today
    const { data: todayOrders, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', startOfTodayIst.toISOString())
      .order('created_at', { ascending: false })

    if (orderErr) {
      console.warn('[daily-summary] Order fetch error:', orderErr.message)
    }

    const ordersList = todayOrders || []
    const totalOrders = ordersList.length
    const totalRevenue = ordersList
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

    // 2. Breakdown by status
    const statusCounts: Record<string, number> = {
      pending: 0,
      qr_sent: 0,
      payment_confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      replacement_requested: 0,
    }

    ordersList.forEach((o) => {
      const st = o.status || 'pending'
      statusCounts[st] = (statusCounts[st] || 0) + 1
    })

    // 3. Fetch low stock products (stock <= low_stock_threshold)
    const { data: allProducts, error: prodErr } = await supabase
      .from('products')
      .select('id, name, stock, low_stock_threshold, in_stock, price')
      .order('stock', { ascending: true })

    if (prodErr) {
      console.warn('[daily-summary] Product fetch error:', prodErr.message)
    }

    const lowStockProducts = (allProducts || []).filter(
      (p) => p.stock <= (p.low_stock_threshold || 2)
    )

    console.log(`[daily-summary] Orders: ${totalOrders}, Revenue: ₹${totalRevenue}, Low stock count: ${lowStockProducts.length}`)

    // 4. Build Email & WhatsApp message
    const ownerEmail = Deno.env.get('OWNER_EMAIL') || 'owner@animemax.store'
    const ownerPhone = Deno.env.get('OWNER_WHATSAPP_NUMBER') || '+919842562164'
    const adminUrl = Deno.env.get('ADMIN_URL') || 'https://animemax.store/admin'

    const emailSubject = `📊 AnimeMax Daily Summary — ${totalOrders} Orders | ₹${totalRevenue} Revenue`
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
        <h2 style="color: #DC2626; margin-top: 0;">🎌 AnimeMax Daily Store Summary</h2>
        <p style="color: #666; font-size: 13px;">Report generated on ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
        
        <div style="display: flex; gap: 10px; margin: 20px 0;">
          <div style="flex: 1; padding: 15px; background: #f9f9f9; border-radius: 6px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #111;">${totalOrders}</div>
            <div style="font-size: 12px; color: #666; text-transform: uppercase;">Today's Orders</div>
          </div>
          <div style="flex: 1; padding: 15px; background: #f9f9f9; border-radius: 6px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #DC2626;">₹${totalRevenue}</div>
            <div style="font-size: 12px; color: #666; text-transform: uppercase;">Total Revenue</div>
          </div>
        </div>

        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 8px; font-size: 14px;">Orders by Status</h3>
        <ul style="font-size: 13px; color: #444; line-height: 1.8; list-style: none; padding-left: 0;">
          <li>⏳ <strong>Pending QR:</strong> ${statusCounts.pending}</li>
          <li>📲 <strong>QR Sent:</strong> ${statusCounts.qr_sent}</li>
          <li>✅ <strong>Payment Confirmed:</strong> ${statusCounts.payment_confirmed}</li>
          <li>🚚 <strong>Shipped:</strong> ${statusCounts.shipped}</li>
          <li>📦 <strong>Delivered:</strong> ${statusCounts.delivered}</li>
          <li>🚫 <strong>Cancelled:</strong> ${statusCounts.cancelled}</li>
        </ul>

        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 8px; font-size: 14px; margin-top: 20px;">
          ⚠️ Low Stock Alert (${lowStockProducts.length} items)
        </h3>
        ${
          lowStockProducts.length === 0
            ? '<p style="color: #16a34a; font-size: 13px;">✓ All products have healthy inventory levels.</p>'
            : `<table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background: #f5f5f5; text-align: left;">
                    <th style="padding: 6px;">Product</th>
                    <th style="padding: 6px;">Stock Remaining</th>
                    <th style="padding: 6px;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${lowStockProducts
                    .map(
                      (p) => `<tr>
                    <td style="padding: 6px; border-bottom: 1px solid #eee;">${p.name}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold; color: ${p.stock === 0 ? '#dc2626' : '#d97706'};">${p.stock} units</td>
                    <td style="padding: 6px; border-bottom: 1px solid #eee;">${p.stock === 0 ? 'SOLD OUT' : 'LOW'}</td>
                  </tr>`
                    )
                    .join('')}
                </tbody>
              </table>`
        }

        <div style="margin-top: 25px; text-align: center;">
          <a href="${adminUrl}" style="background-color: #111; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">
            Open AnimeMax Admin Dashboard
          </a>
        </div>
      </div>
    `

    // Dispatch via Resend or SendGrid if configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
    let emailSent = false
    let emailError: string | null = null

    if (resendApiKey) {
      try {
        const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'AnimeMax Reports <onboarding@resend.dev>'
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [ownerEmail],
            subject: emailSubject,
            html: emailHtml,
          }),
        })
        if (res.ok) {
          emailSent = true
          console.log(`[daily-summary] Successfully sent summary report to ${ownerEmail}`)
        } else {
          emailError = await res.text()
          console.warn('[daily-summary] Resend error:', emailError)
        }
      } catch (e) {
        emailError = e instanceof Error ? e.message : String(e)
        console.error('[daily-summary] Resend error:', e)
      }
    } else if (sendgridApiKey) {
      try {
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendgridApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: ownerEmail }] }],
            from: { email: 'reports@animemax.store', name: 'AnimeMax Reports' },
            subject: emailSubject,
            content: [{ type: 'text/html', value: emailHtml }],
          }),
        })
        if (res.ok) emailSent = true
      } catch (e) {
        emailError = e instanceof Error ? e.message : String(e)
        console.error('[daily-summary] SendGrid error:', e)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalOrders,
          totalRevenue,
          statusCounts,
          lowStockCount: lowStockProducts.length,
          lowStockProducts: lowStockProducts.map((p) => ({
            id: p.id,
            name: p.name,
            stock: p.stock,
            threshold: p.low_stock_threshold,
          })),
        },
        emailSent,
        emailError,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[daily-summary] Error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
