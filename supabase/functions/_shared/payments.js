import { BookingError } from './ticketing.js'

export function createPayments({ stripe, store, workshops, origin, now = Date.now }) {
  async function createSession(order) {
    const session = await stripe.checkout.sessions.create({ mode: 'payment', payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'aud', unit_amount: order.unit_amount,
        product_data: { name: order.title, description: `${order.label} · ${order.location}` } }, quantity: order.quantity }],
      metadata: { orderId: order.id }, client_reference_id: order.id, expires_at: order.expires_at,
      success_url: `${origin}/booking/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/workshops/${encodeURIComponent(order.workshop_id)}/tickets?cancelled=1&order_id=${order.id}`,
    }, { idempotencyKey: `checkout-${order.id}` })
    await store.attachSession(order.id, session.id)
    return session
  }
  async function refresh(session) {
    const order = await store.get(session.metadata?.orderId)
    if (!order) return null
    if (order.session_id && order.session_id !== session.id) throw new BookingError('Checkout session mismatch.', 409)
    if (session.status === 'complete' && session.payment_status === 'paid') return store.fulfill(session)
    if (session.status === 'expired') await store.release(order.id, 'expired')
    return store.get(order.id)
  }
  async function checkout(payload) {
    if (!stripe) throw new BookingError('Online booking is not available yet. Please contact Learn Bhangra.', 503)
    if (typeof payload.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.requestId)) {
      throw new BookingError('Refresh the page and start a new checkout.')
    }
    const order = await store.reserve(workshops, payload, now())
    if (order.state === 'paid') return { sessionId: order.session_id }
    if (!['creating', 'open'].includes(order.state)) throw new BookingError('This checkout has ended. Start a new booking.', 409)
    try {
      const session = order.session_id ? await stripe.checkout.sessions.retrieve(order.session_id) : await createSession(order)
      const updated = await refresh(session)
      if (updated?.state === 'paid') return { sessionId: session.id }
      if (session.status !== 'open' || !session.url) throw new BookingError('This checkout has ended. Start a new booking.', 409)
      return { url: session.url }
    } catch (error) {
      if (!order.session_id && ['StripeInvalidRequestError', 'StripeAuthenticationError', 'StripePermissionError'].includes(error.type)) await store.release(order.id, 'failed')
      throw error
    }
  }
  async function cancel(id) {
    const order = await store.get(id)
    if (!stripe || !order?.session_id) return
    let session = await stripe.checkout.sessions.retrieve(order.session_id)
    if (session.status === 'open') session = await stripe.checkout.sessions.expire(session.id)
    return refresh(session)
  }
  async function reconcile({ deadline = Infinity } = {}) {
    if (!stripe) return
    for (const order of await store.pending()) {
      if (Date.now() >= deadline) break
      try {
        const session = order.session_id ? await stripe.checkout.sessions.retrieve(order.session_id) : await createSession(order)
        await refresh(session)
      } catch (error) {
        if (!order.session_id && error.type === 'StripeInvalidRequestError') await store.release(order.id, 'failed')
      } finally { await store.markChecked(order.id) }
    }
  }
  return { checkout, cancel, refresh, reconcile }
}