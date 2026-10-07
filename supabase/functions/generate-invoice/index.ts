// Supabase Edge Function: generate-invoice
// Generates official AnimeMax Tax Invoice / Receipt for verified orders
// Stores invoice_url on orders record

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
    const payload = await req.json()
    const { orderId } = payload

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Missing orderId' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Fetch order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: `Order #${orderId} not found` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // 2. Fetch items from order_items relational table or fallback to JSON
    let items = order.items || []
    const { data: relationalItems } = await supabase
      .from('order_items')
      .select('*, products(name, price)')
      .eq('order_id', orderId)

    if (relationalItems && relationalItems.length > 0) {
      items = relationalItems.map((ri: any) => ({
        name: ri.products?.name || 'Anime Merchandise',
        qty: ri.quantity,
        price: ri.price_at_purchase,
      }))
    }

    // 3. Generate HTML Invoice
    const dateFormatted = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(order.id).slice(0, 8).toUpperCase()}`

    const rowsHtml = (items || []).map((i: any, index: number) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #EDEDED; text-align: center; color: #6B7280;">${index + 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #EDEDED; font-weight: 600; color: #111827;">${i.name}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #EDEDED; text-align: center; color: #111827;">${i.qty || i.quantity || 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #EDEDED; text-align: right; color: #111827;">₹${Number(i.price).toLocaleString('en-IN')}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #EDEDED; text-align: right; font-weight: 600; color: #111827;">₹${(Number(i.price) * (i.qty || i.quantity || 1)).toLocaleString('en-IN')}</td>
      </tr>
    `).join('')

    const invoiceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceNumber} - AnimeMax</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px; color: #111827; background: #fff; }
    .invoice-card { max-width: 800px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 24px; border-bottom: 2px solid #DC2626; }
    .brand h1 { margin: 0; color: #DC2626; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
    .brand p { margin: 4px 0 0; color: #6B7280; font-size: 13px; }
    .inv-details { text-align: right; }
    .inv-details h2 { margin: 0; font-size: 20px; font-weight: 700; color: #111827; }
    .inv-details p { margin: 4px 0 0; font-size: 13px; color: #6B7280; }
    .grid { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 13px; line-height: 1.6; }
    .col { flex: 1; }
    .col h3 { font-size: 12px; text-transform: uppercase; color: #9CA3AF; margin: 0 0 8px; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
    thead th { background: #F9FAFB; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #4B5563; border-bottom: 1px solid #E5E7EB; text-align: left; }
    .totals { margin-left: auto; width: 280px; font-size: 13px; }
    .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
    .grand-total { font-size: 16px; font-weight: bold; color: #DC2626; border-top: 2px solid #111827; padding-top: 10px; margin-top: 6px; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; background: #DCFCE7; color: #166534; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #9CA3AF; }
    @media print { body { padding: 0; } .invoice-card { border: none; box-shadow: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div class="brand">
        <h1>ANIMEMAX</h1>
        <p>Premium Anime Collectibles & Apparel</p>
        <p>Email: support@animemax.store | WhatsApp: +91 98425 62164</p>
      </div>
      <div class="inv-details">
        <h2>TAX INVOICE</h2>
        <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
        <p><strong>Order ID:</strong> #${order.id}</p>
        <p><strong>Date:</strong> ${dateFormatted}</p>
        <p><span class="badge">PAID VIA UPI</span></p>
      </div>
    </div>

    <div class="grid">
      <div class="col">
        <h3>Billed &amp; Shipped To</h3>
        <strong style="font-size: 14px;">${order.buyer_name}</strong><br>
        ${order.buyer_address}<br>
        Phone: ${order.buyer_whatsapp || order.buyer_phone || 'N/A'}
      </div>
      <div class="col" style="text-align: right;">
        <h3>Fulfillment</h3>
        Shipping Method: Express Courier<br>
        Status: ${order.status?.toUpperCase()}<br>
        ${order.tracking_number ? `Tracking #: <strong>${order.tracking_number}</strong>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th>Item Description</th>
          <th style="text-align: center; width: 60px;">Qty</th>
          <th style="text-align: right; width: 100px;">Unit Price</th>
          <th style="text-align: right; width: 100px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div>
        <span style="color: #6B7280;">Subtotal:</span>
        <span>₹${Number(order.total_amount).toLocaleString('en-IN')}</span>
      </div>
      <div>
        <span style="color: #6B7280;">Shipping & Packaging:</span>
        <span style="color: #16A34A; font-weight: 600;">FREE</span>
      </div>
      <div class="grand-total">
        <span>Total Paid:</span>
        <span>₹${Number(order.total_amount).toLocaleString('en-IN')}</span>
      </div>
    </div>

    <div class="footer">
      <p>Thank you for shopping at AnimeMax! For any queries or replacement requests within 5 days of delivery, contact us on WhatsApp.</p>
      <p>This is a computer-generated tax invoice and requires no physical signature.</p>
    </div>
  </div>
</body>
</html>`

    // Generate data URI or Cloudinary / Supabase storage URL
    // A data URI HTML can be downloaded or opened directly in any browser with window.print()
    const invoiceDataUri = `data:text/html;charset=utf-8,${encodeURIComponent(invoiceHtml)}`

    // 4. Update orders table with invoice_url
    const { error: updateErr } = await supabase
      .from('orders')
      .update({ invoice_url: invoiceDataUri })
      .eq('id', orderId)

    if (updateErr) {
      console.warn('[generate-invoice] Update warning:', updateErr.message)
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        invoiceNumber,
        invoice_url: invoiceDataUri,
        html: invoiceHtml,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[generate-invoice] Error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
