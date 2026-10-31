import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { createSupabaseStore } from '../supabase/functions/_shared/store.js'
import { createPayments } from '../supabase/functions/_shared/payments.js'

async function fixture() {
  const database = new PGlite()
  await database.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;')
  await database.exec(readFileSync(new URL('../supabase/migrations/202610310001_bookings.sql', import.meta.url), 'utf8'))
  const client = { async rpc(name, params) {
    assert.match(name, /^bhangra_[a-z_]+$/)
    const entries = Object.entries(params)
    try {
      const result = await database.query(`SELECT public.${name}(${entries.map(([key], index) => `${key} => $${index + 1}`).join(', ')}) AS value`,
        entries.map(([, value]) => value !== null && typeof value === 'object' ? JSON.stringify(value) : value))
      return { data: result.rows[0].value }
    } catch (error) { return { error: { message: error.message, code: error.code } } }
  } }
  const ticket = { id: 'session', label: 'Workshop', startsAt: new Date(Date.now() + 86400000 * 7).toISOString(), amount: 2200, capacity: 5, active: true }
  const workshops = [{ id: 'dance', title: 'Dance', location: 'Test studio', tickets: [ticket] }]
  const payload = quantity => ({ workshopId: 'dance', ticketId: 'session', quantity, requestId: randomUUID() })
  return { database, store: createSupabaseStore({ client }), live: createSupabaseStore({ client, mode: 'live' }), ticket, workshops, payload }
}
test('PostgreSQL capacity, idempotency and test/live isolation', async () => {
  const setup = await fixture()
  try {
    const selection = setup.payload(3)
    const order = await setup.store.reserve(setup.workshops, selection)
    assert.equal(await setup.store.remaining(setup.ticket), 2)
    assert.equal(await setup.live.remaining(setup.ticket), 5)
    assert.equal((await setup.store.reserve(setup.workshops, selection)).id, order.id)
    await assert.rejects(setup.store.reserve(setup.workshops, { ...selection, quantity: 2 }), /another selection/)
    await setup.live.reserve(setup.workshops, selection)
    const results = await Promise.allSettled([setup.store.reserve(setup.workshops, setup.payload(2)), setup.store.reserve(setup.workshops, setup.payload(2))])
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
    assert.equal(await setup.store.remaining(setup.ticket), 0)
    await setup.store.release(selection.requestId, 'expired')
    assert.equal(await setup.store.remaining(setup.ticket), 3)
    assert.equal(await setup.live.remaining(setup.ticket), 2)
    assert.equal((await setup.live.get(selection.requestId)).state, 'creating')
    assert.equal(await setup.store.takeMaintenanceLease(), true)
    assert.equal(await setup.store.takeMaintenanceLease(), false)
    assert.equal(await setup.live.takeMaintenanceLease(), true)
    const key = 'a'.repeat(64)
    for (let index = 0; index < 20; index++) assert.equal(await setup.store.checkLimit(key), true)
    assert.equal(await setup.store.checkLimit(key), false)
    assert.equal(await setup.live.checkLimit(key), true)
  } finally { await setup.database.close() }
})
test('Stripe retries retain holds and verified payments issue codes once', async () => {
  const setup = await fixture()
  try {
    const sessions = new Map()
    let failOnce = true
    const stripe = { checkout: { sessions: {
      async create(params, options) {
        if (!sessions.has(options.idempotencyKey)) sessions.set(options.idempotencyKey, { id: `cs_test_${randomUUID().replaceAll('-', '')}`,
          status: 'open', payment_status: 'unpaid', metadata: params.metadata, currency: 'aud',
          amount_total: params.line_items[0].price_data.unit_amount * params.line_items[0].quantity, url: 'https://checkout.stripe.com/fixture' })
        if (failOnce) { failOnce = false; throw Object.assign(new Error('Lost response'), { type: 'StripeConnectionError' }) }
        return sessions.get(options.idempotencyKey)
      },
      async retrieve(id) { return [...sessions.values()].find(session => session.id === id) },
      async expire(id) { const session = await this.retrieve(id); session.status = 'expired'; return session },
    } } }
    const payments = createPayments({ stripe, store: setup.store, workshops: setup.workshops, origin: 'https://dance.example' })
    const selection = setup.payload(3)
    await assert.rejects(payments.checkout(selection), /Lost response/)
    assert.equal(await setup.store.remaining(setup.ticket), 2)
    assert.equal((await payments.checkout(selection)).url, 'https://checkout.stripe.com/fixture')
    assert.equal(sessions.size, 1)
    const session = [...sessions.values()][0]
    session.status = 'complete'; session.payment_status = 'paid'; session.customer_details = { email: 'guest@example.com' }
    await assert.rejects(payments.refresh({ ...session, amount_total: 1 }), /matched/)
    await assert.rejects(payments.refresh({ ...session, currency: 'usd' }), /matched/)
    const paid = await payments.refresh(session)
    assert.equal(new Set(JSON.parse(paid.tickets)).size, 3)
    assert.equal((await payments.refresh(session)).tickets, paid.tickets)
    assert.deepEqual(await payments.checkout(selection), { sessionId: session.id })
    assert.equal((await payments.cancel(selection.requestId)).state, 'paid')
    assert.equal((await setup.store.release(selection.requestId, 'expired')).state, 'paid')
    assert.equal((await setup.store.unsent()).length, 1)
    await setup.store.markEmailSent(selection.requestId)
    assert.equal((await setup.store.unsent()).length, 0)
    await payments.reconcile()
  } finally { await setup.database.close() }
})
test('Booking RPCs and tables deny anonymous and website-user roles', async () => {
  const setup = await fixture()
  try {
    for (const role of ['anon', 'authenticated']) {
      const grants = await setup.database.query(`SELECT has_function_privilege($1,oid,'EXECUTE') AS allowed FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace AND proname LIKE 'bhangra_%'`, [role])
      assert.ok(grants.rows.length >= 10)
      assert.ok(grants.rows.every(row => row.allowed === false))
      await setup.database.exec(`SET ROLE ${role}`)
      await assert.rejects(setup.database.query('SELECT public.bhangra_pending_bookings()'), /permission denied/)
      await assert.rejects(setup.database.query('SELECT * FROM bhangra_private.booking_orders'), /permission denied/)
      await setup.database.exec('RESET ROLE')
    }
    await setup.database.exec('SET ROLE service_role')
    assert.equal((await setup.database.query('SELECT public.bhangra_pending_bookings() AS value')).rows[0].value.length, 0)
    await setup.database.exec('RESET ROLE')
  } finally { await setup.database.close() }
})