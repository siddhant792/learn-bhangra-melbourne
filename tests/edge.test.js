import test from 'node:test'
import assert from 'node:assert/strict'
import Stripe from 'stripe'
import { createBookingHandler } from '../supabase/functions/_shared/booking-api.js'
import { bookingUrl } from '../src/composables/bookingApi.js'
import { isSellable, validateBooking, testWorkshopCatalogue } from '../supabase/functions/_shared/ticketing.js'
import { createServer } from 'vite'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
import { existsSync } from 'node:fs'

test('Workshops embeds past media under one navigation item without duplicate page sections', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, entries: [] } })
  try {
    const { default: Workshops } = await vite.ssrLoadModule('/src/views/WorkshopsView.vue')
    const { default: App } = await vite.ssrLoadModule('/src/App.vue')
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/workshops', component: Workshops },
      { path: '/:pathMatch(.*)*', component: { render: () => null } },
    ] })
    await router.push('/workshops?view=past')
    const app = createSSRApp(App)
    app.use(router)
    const html = await renderToString(app)
    const nav = html.match(/<nav class="desktop-nav"[^>]*>(.*?)<\/nav>/s)?.[1]
    assert.ok(nav)
    assert.doesNotMatch(nav, /Past Workshops/)
    assert.match(html, /aria-label="Workshop views"/)
    const tabs = html.match(/<nav[^>]*aria-label="Workshop views"[^>]*>(.*?)<\/nav>/s)?.[1]
    assert.equal((tabs.match(/aria-current="page"/g) || []).length, 1)
    assert.match(tabs, /<a[^>]*aria-current="page"[^>]*>Past<\/a>/)
    assert.match(html, /past-workshop-grid/)
    assert.match(html, /Video/)
    assert.match(html, /Photos/)
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1)
    assert.equal((html.match(/class="follow-banner/g) || []).length, 1)
    await router.push('/workshops')
    const upcoming = await renderToString(createSSRApp(App).use(router))
    assert.match(upcoming, /Filter workshops by experience/)
    assert.doesNotMatch(upcoming, /past-workshop-grid/)
  } finally { await vite.close() }
})

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

test('Merchandise lists two design previews without purchase controls', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, entries: [] } })
  try {
    const { default: Merchandise } = await vite.ssrLoadModule('/src/views/MerchandiseView.vue')
    const { merchandise } = await vite.ssrLoadModule('/src/content.js')
    for (const product of merchandise) assert.ok(existsSync(new URL('../public' + product.image, import.meta.url)))
    const html = await renderToString(createSSRApp(Merchandise))
    assert.match(html, /Learn Bhangra T-shirt/)
    assert.match(html, /Learn Bhangra tote bag/)
    assert.equal((html.match(/class="merchandise-product"/g) || []).length, 2)
    assert.equal((html.match(/Design preview<\/p>/g) || []).length, 2)
    assert.doesNotMatch(html, /<form|Add to cart|Buy now|checkout|<select|<input/i)
  } finally { await vite.close() }
})

test('Site shell has no Stripe test banner even when test mode is active', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, entries: [] } })
  try {
    const { default: App } = await vite.ssrLoadModule('/src/App.vue')
    const tickets = await vite.ssrLoadModule('/src/composables/useTickets.js')
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/:pathMatch(.*)*', component: { render: () => h('p', 'Catalogue page') } },
    ] })
    await router.push('/merchandise')
    const app = createSSRApp({ setup() {
      tickets.useTickets().testMode.value = true
      return () => h(App)
    } }).use(router)
    const html = await renderToString(app)
    assert.match(html, /Catalogue page/)
    assert.doesNotMatch(html, /demo-banner|Stripe test mode|No real charges/)
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
  const largeSession = [{ id: 'dance', tickets: [{ ...ticket, capacity: 50 }] }]
  assert.equal(validateBooking(largeSession, 'dance', 'session', 10, 50).amount, 22000)
  assert.throws(() => validateBooking(largeSession, 'dance', 'session', 11, 50), /between 1 and 10/)
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

test('Sandbox fills unset seats without changing live inventory or unconfirmed prices', () => {
  const source = [{ id: 'dance', tickets: [{ id: 'session', capacity: null, amount: 2200 }, { id: 'unknown', capacity: null, amount: null }] }]
  const sandbox = testWorkshopCatalogue(source)
  assert.equal(sandbox[0].tickets[0].capacity, 10)
  assert.equal(source[0].tickets[0].capacity, null)
  assert.equal(sandbox[0].tickets[1].amount, null)
  assert.equal(isSellable(sandbox[0].tickets[1]), false)
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

test('Checkout diagnostics expose a safe failure type but never credentials', async () => {
  const requestId = '11111111-1111-4111-8111-111111111111'
  const stripe = { checkout: { sessions: { create: async () => { throw Object.assign(new Error('sensitive-key-value'), { type: 'StripeAuthenticationError' }) } } } }
  const store = { reserve: async () => ({ id: requestId, state: 'creating', quantity: 1, unit_amount: 2200 }), release: async () => {} }
  const handler = createBookingHandler({ stripe, store, workshops: [], origin: 'https://dance.example', mode: 'test', functionName: 'bookings-test', webhookSecret: 'whsec_fixture' })
  const response = await handler(new Request('https://project.supabase.co/functions/v1/bookings-test/checkout', {
    method: 'POST', headers: { Origin: 'https://dance.example' }, body: JSON.stringify({ requestId }) }))
  assert.equal(response.status, 502)
  const data = await response.json()
  assert.equal(data.code, 'StripeAuthenticationError')
  assert.doesNotMatch(JSON.stringify(data), /sensitive-key-value/)
})