import { BookingError, publicWorkshop } from './ticketing.js'
import { createPayments } from './payments.js'

export function createBookingHandler({ stripe, store, workshops, origin, mode, functionName, webhookSecret, cronSecret,
  cryptoProvider, schedule = promise => promise, emailKey, fromEmail }) {
  if (!['test', 'live'].includes(mode)) throw new Error('Invalid payment mode.')
  if (origin && (new URL(origin).origin !== origin || !origin.startsWith('https://'))) throw new Error('APP_ORIGIN must be an HTTPS website origin.')
  const ids = workshops.flatMap(workshop => workshop.tickets.map(ticket => ticket.id))
  if (new Set(ids).size !== ids.length) throw new Error('Ticket IDs must be unique.')
  const ready = Boolean(origin && stripe && store && webhookSecret)
  const payments = createPayments({ stripe: ready ? stripe : null, store, workshops, origin })
  let maintaining = false
  async function maintenance() {
    if (!ready || maintaining) return false
    maintaining = true
    try {
      if (!(await store.takeMaintenanceLease())) return false
      const deadline = Date.now() + 40000
      await payments.reconcile({ deadline: Date.now() + 15000 })
      if (mode === 'live' && emailKey && fromEmail) {
        for (const order of await store.unsent()) {
          if (Date.now() >= deadline) break
          try {
            const response = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(10000),
              headers: { Authorization: `Bearer ${emailKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `tickets-${order.id}` },
              body: JSON.stringify({ from: fromEmail, to: [order.email], subject: `Your tickets: ${order.title}`,
                text: `${order.title}\n${order.label}\n${order.location}\n\n${JSON.parse(order.tickets).join('\n')}\n\nView your tickets: ${origin}/booking/confirmation?session_id=${order.session_id}` }) })
            if (response.ok) await store.markEmailSent(order.id)
          } finally { await store.markChecked(order.id) }
        }
      }
      return true
    } finally { maintaining = false }
  }
  function background() { schedule(maintenance().catch(() => console.error('Booking maintenance failed; queued for retry.'))) }
  return async function handler(request) {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer', Vary: 'Origin', 'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type, authorization' }
    const respond = (data, status = 200) => new Response(JSON.stringify(data), { status, headers })
    const path = new URL(request.url).pathname.split(`/${functionName}`)[1] || '/'
    try {
      if (request.method === 'OPTIONS') return request.headers.get('origin') === origin
        ? new Response(null, { status: 204, headers }) : respond({ error: 'Origin not allowed.' }, 403)
      if (path === '/stripe/webhook' && request.method === 'POST') {
        if (!ready) return respond({ error: 'Payments unavailable.' }, 503)
        let event
        try {
          const raw = await request.text()
          if (new TextEncoder().encode(raw).length > 262144) return respond({ error: 'Webhook too large.' }, 413)
          event = await stripe.webhooks.constructEventAsync(raw, request.headers.get('stripe-signature'), webhookSecret, undefined, cryptoProvider)
          if (event.livemode !== (mode === 'live')) throw new Error('Payment mode mismatch.')
        } catch { return respond({ error: 'Invalid webhook signature.' }, 400) }
        try {
          if (['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.expired'].includes(event.type)) await payments.refresh(event.data.object)
          background()
          return respond({ received: true })
        } catch { return respond({ error: 'Payment update will be retried.' }, 500) }
      }
      if (path === '/maintenance' && request.method === 'GET') {
        const authorization = request.headers.get('authorization') || ''
        const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
        if (!token || token.length > 256 || !(cronSecret ? token === cronSecret : await store.authorizeMaintenance(token))) return respond({ error: 'Unauthorized.' }, 401)
        if (!ready) return respond({ error: 'Payments unavailable.' }, 503)
        background()
        return respond({ accepted: true }, 202)
      }
      if (request.headers.get('origin') && request.headers.get('origin') !== origin) return respond({ error: 'Origin not allowed.' }, 403)
      if (store.checkLimit && (path === '/workshops' || path.startsWith('/checkout') || path.startsWith('/orders/'))) {
        const address = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
        const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${mode}:${address}`))
        const key = Array.from(new Uint8Array(digest),byte => byte.toString(16).padStart(2,'0')).join('')
        if (!(await store.checkLimit(key))) return respond({ error: 'Too many requests. Please wait a minute and try again.' },429)
      }
      if (path === '/workshops' && request.method === 'GET') {
        const remaining = new Map(await Promise.all(workshops.flatMap(workshop => workshop.tickets.map(async ticket => [ticket.id, await store.remaining(ticket)]))))
        if (ready) background()
        return respond({ checkoutReady: ready, test: mode === 'test', workshops: workshops.map(workshop => publicWorkshop(workshop, ticket => remaining.get(ticket.id), ready)) })
      }
      if (path.startsWith('/checkout') && request.method === 'POST') {
        if (request.headers.get('origin') !== origin) return respond({ error: 'Checkout must start on the Learn Bhangra website.' }, 403)
        const raw = await request.text()
        if (new TextEncoder().encode(raw).length > 12288) return respond({ error: 'Request too large.' }, 413)
        let payload
        try { payload = JSON.parse(raw) } catch { throw new BookingError('Invalid request.') }
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new BookingError('Invalid request.')
        if (path === '/checkout') return respond(await payments.checkout(payload))
        if (path === '/checkout/cancel') {
          if (typeof payload.requestId !== 'string' || payload.requestId.length > 36) throw new BookingError('Invalid checkout request.')
          const order = await payments.cancel(payload.requestId)
          return respond({ status: order?.state || 'expired', sessionId: order?.session_id })
        }
      }
      if (path.startsWith('/orders/') && request.method === 'GET') {
        if (!ready) throw new BookingError('Booking confirmation is unavailable.', 503)
        const id = path.slice('/orders/'.length)
        if (!/^cs_(?:test_|live_)?[a-zA-Z0-9]{8,200}$/.test(id)) throw new BookingError('Invalid booking link.')
        const session = await stripe.checkout.sessions.retrieve(id)
        if (session.livemode !== (mode === 'live')) throw new BookingError('Invalid booking link.')
        const order = await payments.refresh(session)
        if (!order) throw new BookingError('Booking not found.', 404)
        if (order.state === 'paid') background()
        return respond({ status: order.state, test: mode === 'test', title: order.title, label: order.label, startsAt: order.starts_at,
          location: order.location, quantity: order.quantity, amount: order.unit_amount * order.quantity, currency: 'aud',
          tickets: order.state === 'paid' ? JSON.parse(order.tickets).map(code => mode === 'test' ? `TEST-${code}` : code) : [],
          emailEnabled: mode === 'live' && Boolean(emailKey && fromEmail), emailSent: mode === 'live' && Boolean(order.email_sent) })
      }
      return respond({ error: 'Endpoint not found.' }, 404)
    } catch (error) {
      if (error instanceof BookingError) return respond({ error: error.message }, error.status)
      console.error('Booking operation failed:', error.code || error.name)
      return respond({ error: 'Checkout is temporarily unavailable. Please retry your current booking.' }, 502)
    }
  }
}