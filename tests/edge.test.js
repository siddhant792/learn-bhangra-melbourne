import test from 'node:test'
import assert from 'node:assert/strict'
import Stripe from 'stripe'
import { createBookingHandler } from '../supabase/functions/_shared/booking-api.js'
import { bookingUrl } from '../src/composables/bookingApi.js'
import { isSellable, validateBooking } from '../supabase/functions/_shared/ticketing.js'
import { createServer } from 'vite'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

test('Workshop card keeps its ticket link when availability fails', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, entries: [] } })
  try {
    const tickets = await vite.ssrLoadModule('/src/composables/useTickets.js')
    await tickets.refreshTickets()
    const { default: EventCard } = await vite.ssrLoadModule('/src/components/EventCard.vue')
    const app = createSSRApp(EventCard, { event: { id: 'dance', title: 'Dance', details: [] } })
    app.component('RouterLink', { props: ['to'], setup(props, { slots }) {
      return () => h('a', { href: typeof props.to === 'string' ? props.to : props.to.path }, slots.default?.())
    } })
    const html = await renderToString(app)
    assert.match(html, /href="\/workshops\/dance\/tickets"/)
    assert.match(html, /Get tickets/)
    assert.doesNotMatch(html, /href="\/past-workshops"/)
  } finally { await vite.close() }
})

test('Frontend calls Supabase directly and unconfirmed or invalid tickets cannot be purchased', () => {
  assert.equal(bookingUrl('/checkout', { VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_BOOKING_FUNCTION: 'bookings-test' }),
    'https://project.supabase.co/functions/v1/bookings-test/checkout')
  assert.throws(() => bookingUrl('/checkout', {}), /not configured/)
  assert.throws(() => bookingUrl('/checkout', { VITE_SUPABASE_URL: 'http://project.supabase.co' }), /Invalid/)
  const ticket = { id: 'session', label: 'Test session', startsAt: new Date(Date.now() + 86400000).toISOString(), amount: 2200, capacity: 5, active: true }
  const workshops = [{ id: 'dance', tickets: [ticket] }]
  assert.equal(validateBooking(workshops, 'dance', 'session', 5, 5).amount, 11000)
  for (const quantity of [0, -1, 1.5, '2', null, Infinity, 6]) assert.throws(() => validateBooking(workshops, 'dance', 'session', quantity, 5))
  assert.equal(isSellable({ ...ticket, capacity: null }), false)
  assert.equal(isSellable({ ...ticket, amount: null }), false)
  assert.equal(isSellable({ ...ticket, startsAt: new Date(Date.now() + 30 * 60000).toISOString() }), false)
})

test('Edge configuration accepts a trailing slash and returns matching CORS headers', async () => {
  const origin = 'https://learn-bhangra-melbourne.vercel.app'
  const handler = createBookingHandler({ stripe: new Stripe('sk_test_fixture'), store: { takeMaintenanceLease: async () => false },
    workshops: [], origin: origin + '/', mode: 'test', functionName: 'bookings-test', webhookSecret: 'whsec_fixture' })
  const url = 'https://project.supabase.co/functions/v1/bookings-test/workshops'
  const response = await handler(new Request(url, { headers: { Origin: origin } }))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('access-control-allow-origin'), origin)
  assert.equal((await response.json()).checkoutReady, true)
  assert.equal((await handler(new Request(url, { method: 'OPTIONS', headers: { Origin: origin } }))).status, 204)
})

test('Edge handler verifies untouched Stripe payloads, mode and browser origins', async () => {
  const verifier = new Stripe('sk_test_fixture')
  let fulfilled = 0
  const secret = 'whsec_fixture'
  const store = { get: async () => ({ id: 'fixture' }), fulfill: async () => { fulfilled++; return {} },
    takeMaintenanceLease: async () => false }
  const handler = createBookingHandler({ stripe: verifier, store, workshops: [], origin: 'https://dance.example', mode: 'test',
    functionName: 'bookings-test', webhookSecret: secret, cronSecret: 'fixture' })
  const call = (path, options) => handler(new Request(`https://project.supabase.co/functions/v1/bookings-test${path}`, options))
  const body = JSON.stringify({ type: 'checkout.session.completed', livemode: false,
    data: { object: { id: 'cs_test_fixture', metadata: { orderId: 'fixture' }, status: 'complete', payment_status: 'paid' } } }, null, 2)
  const signature = verifier.webhooks.generateTestHeaderString({ payload: body, secret })
  assert.equal((await call('/stripe/webhook', { method: 'POST', body })).status, 400)
  assert.equal((await call('/stripe/webhook', { method: 'POST', body, headers: { 'stripe-signature': signature } })).status, 200)
  assert.equal(fulfilled, 1)
  assert.equal((await call('/stripe/webhook', { method: 'POST', body: body + ' ', headers: { 'stripe-signature': signature } })).status, 400)
  assert.equal((await call('/checkout', { method: 'POST', body: '{}', headers: { Origin: 'https://foreign.example' } })).status, 403)
  assert.equal((await call('/checkout', { method: 'OPTIONS', headers: { Origin: 'https://dance.example' } })).status, 204)
  assert.equal((await call('/maintenance')).status, 401)
  assert.equal((await call('/maintenance', { headers: { Authorization: 'Bearer fixture' } })).status, 202)
  const live = body.replace('"livemode": false', '"livemode": true')
  assert.equal((await call('/stripe/webhook', { method: 'POST', body: live,
    headers: { 'stripe-signature': verifier.webhooks.generateTestHeaderString({ payload: live, secret }) } })).status, 400)
})