import test from 'node:test'
import assert from 'node:assert/strict'
import Stripe from 'stripe'
import { createBookingHandler } from '../supabase/functions/_shared/booking-api.js'
import { bookingUrl } from '../src/composables/bookingApi.js'
import { isSellable, validateBooking } from '../supabase/functions/_shared/ticketing.js'

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