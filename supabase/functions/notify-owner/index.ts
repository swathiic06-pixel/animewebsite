// Supabase Edge Function: notify-owner
// Triggered on new order insert via Database Webhook or Supabase client functions.invoke('notify-owner')
// Never expose email/WhatsApp provider credentials to the frontend!

/// <reference path="../deno.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrderItem {
  name: string
  qty?: number
  quantity?: number
  price: number
}

interface OrderRecord {
  id: string
  buyer_name: string
  buyer_phone?: string
  buyer_whatsapp?: string
  buyer_address?: string
  total_amount: number
  items?: OrderItem[]
  status?: string
  created_at?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const order: OrderRecord = payload.record || payload.order || payload

    if (!order || !order.id) {
      return new Response(JSON.stringify({ error: 'Missing order details in payload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const itemsSummary = Array.isArray(order.items)
      ? order.items.map((i) => `${i.name} (x${i.qty || i.quantity || 1}) - ₹${i.price}`).join(', ')
      : 'Items detailed in admin'

    const ownerEmail = Deno.env.get('OWNER_EMAIL') || 'owner@animemax.store'
    const ownerPhone = Deno.env.get('OWNER_WHATSAPP_NUMBER') || '+919842562164'
    const adminUrl = Deno.env.get('ADMIN_URL') || 'https://animemax.store/admin/orders'
    const orderLink = `${adminUrl}?orderId=${order.id}`

    console.log(`[Order Alert] New order #${order.id} from ${order.buyer_name} for ₹${order.total_amount}`)

    const emailSubject = `🔔 New AnimeMax Order #${order.id.slice(0, 8)} - ₹${order.total_amount}`
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
        <h2 style="color: #DC2626; margin-top: 0;">🎌 New AnimeMax Order Received!</h2>
        <p>A new order has been placed on the storefront.</p>
        <hr style="border: 0; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Order ID:</strong></td>
            <td style="padding: 8px 0; font-family: monospace;">#${order.id}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Buyer Name:</strong></td>
            <td style="padding: 8px 0;">${order.buyer_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Phone / WhatsApp:</strong></td>
            <td style="padding: 8px 0;">${order.buyer_whatsapp || order.buyer_phone || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Total Amount:</strong></td>
            <td style="padding: 8px 0; color: #DC2626; font-weight: bold; font-size: 16px;">₹${order.total_amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Items:</strong></td>
            <td style="padding: 8px 0;">${itemsSummary}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Shipping Address:</strong></td>
            <td style="padding: 8px 0;">${order.buyer_address || 'N/A'}</td>
          </tr>
        </table>
        <div style="margin-top: 25px; text-align: center;">
          <a href="${orderLink}" style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Open Order in Admin Panel
          </a>
        </div>
      </div>
    `

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
    let emailSent = false
    let emailError: string | null = null

    // 1. Send via Resend if configured
    if (resendApiKey) {
      try {
        const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'AnimeMax Store <onboarding@resend.dev>'
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
          console.log(`[Resend] Successfully sent order alert to ${ownerEmail}`)
        } else {
          emailError = await res.text()
          console.warn('[Resend] Error:', emailError)
        }
      } catch (err) {
        emailError = err instanceof Error ? err.message : String(err)
        console.error('[Resend] Fetch error:', err)
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
            from: { email: 'orders@animemax.store', name: 'AnimeMax Store' },
            subject: emailSubject,
            content: [{ type: 'text/html', value: emailHtml }],
          }),
        })
        if (res.ok) {
          emailSent = true
          console.log(`[SendGrid] Successfully sent order alert to ${ownerEmail}`)
        } else {
          console.warn('[SendGrid] Error:', await res.text())
        }
      } catch (err) {
        console.error('[SendGrid] Fetch error:', err)
      }
    }

    // 2. Send via Twilio WhatsApp if configured
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioFrom = Deno.env.get('TWILIO_WHATSAPP_FROM')
    let whatsappSent = false

    if (twilioSid && twilioToken && twilioFrom) {
      try {
        const waMessage = `🔔 *New AnimeMax Order Alert!*\n\n` +
          `*Order ID:* #${order.id}\n` +
          `*Buyer:* ${order.buyer_name}\n` +
          `*Phone/WhatsApp:* ${order.buyer_whatsapp || order.buyer_phone}\n` +
          `*Total:* ₹${order.total_amount}\n` +
          `*Items:* ${itemsSummary}\n` +
          `*Address:* ${order.buyer_address}\n\n` +
          `👉 Open Admin: ${orderLink}`

        const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
        const body = new URLSearchParams()
        body.append('From', `whatsapp:${twilioFrom}`)
        body.append('To', `whatsapp:${ownerPhone}`)
        body.append('Body', waMessage)

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        })
        if (res.ok) {
          whatsappSent = true
          console.log(`[Twilio] WhatsApp alert sent to ${ownerPhone}`)
        }
      } catch (err) {
        console.error('[Twilio] Fetch error:', err)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        emailSent,
        emailError,
        whatsappSent,
        delivered: emailSent || whatsappSent,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[notify-owner] Error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
