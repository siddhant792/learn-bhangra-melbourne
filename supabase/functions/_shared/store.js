import { BookingError, validateBooking } from './ticketing.js'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const errors = {
  REQUEST_CONFLICT: ['This checkout request was already used for another selection.', 409],
  BOOKING_UNAVAILABLE: ['Booking is not open for this session.', 409],
  INVALID_QUANTITY: ['Choose a valid whole number of tickets.', 400],
  INSUFFICIENT_PLACES: ['There are not enough places left for this booking.', 409],
  BOOKING_NOT_FOUND: ['Booking not found.', 404],
  SESSION_CONFLICT: ['Checkout session mismatch.', 409],
  PAYMENT_MISMATCH: ['The payment could not be matched to this booking.', 409],
  INVALID_STATE: ['Invalid booking update.', 400],
}
const normalize = order => order ? { ...order, tickets: order.tickets ? JSON.stringify(order.tickets) : null, email_sent: order.email_sent ? 1 : 0 } : null
export function createSupabaseStore({ client, mode = 'test' }) {
  if (!client || !['test', 'live'].includes(mode)) throw new Error('Invalid database configuration.')
  async function rpc(name, params = {}) {
    const result = await client.rpc(name, { ...params, p_mode: mode })
    if (result.error) {
      if (errors[result.error.message]) throw new BookingError(...errors[result.error.message])
      const error = new Error('Booking database is temporarily unavailable.')
      error.code = result.error.code || 'DATABASE_UNAVAILABLE'
      throw error
    }
    return result.data
  }
  const get = async id => typeof id === 'string' && uuid.test(id) ? normalize(await rpc('bhangra_read_booking', { p_id: id })) : null
  return {
    get,
    remaining: ticket => Number.isSafeInteger(ticket.capacity) && ticket.capacity > 0
      ? rpc('bhangra_booking_remaining', { p_ticket_id: ticket.id, p_capacity: ticket.capacity }) : null,
    async reserve(workshops, payload, now = Date.now()) {
      const previous = await get(payload.requestId)
      if (previous) {
        if (previous.workshop_id !== payload.workshopId || previous.ticket_id !== payload.ticketId || previous.quantity !== payload.quantity) throw new BookingError(...errors.REQUEST_CONFLICT)
        return previous
      }
      const configured = workshops.find(workshop => workshop.id === payload.workshopId)?.tickets.find(ticket => ticket.id === payload.ticketId)
      const { workshop, ticket } = validateBooking(workshops, payload.workshopId, payload.ticketId, payload.quantity, configured?.capacity || 0, now)
      return normalize(await rpc('bhangra_reserve_booking', { p_id: payload.requestId,
        p_workshop: { id: workshop.id, title: workshop.title, location: workshop.location },
        p_ticket: { id: ticket.id, label: ticket.label, startsAt: ticket.startsAt, amount: ticket.amount, capacity: ticket.capacity, active: ticket.active },
        p_quantity: payload.quantity }))
    },
    attachSession: async (id, sessionId) => normalize(await rpc('bhangra_attach_session', { p_id: id, p_session_id: sessionId })),
    fulfill: async session => normalize(await rpc('bhangra_fulfill_booking', { p_id: session.metadata?.orderId, p_session_id: session.id,
      p_currency: session.currency, p_total: session.amount_total, p_paid: session.payment_status === 'paid', p_email: session.customer_details?.email || null })),
    release: async (id, state) => normalize(await rpc('bhangra_release_booking', { p_id: id, p_state: state })),
    pending: async () => (await rpc('bhangra_pending_bookings')).map(normalize),
    unsent: async () => (await rpc('bhangra_unsent_bookings')).map(normalize),
    markEmailSent: id => rpc('bhangra_mark_email_sent', { p_id: id }),
    markChecked: id => rpc('bhangra_mark_checked', { p_id: id }),
    checkLimit: key => rpc('bhangra_check_booking_limit', { p_key: key }),
    authorizeMaintenance: token => rpc('bhangra_authorize_maintenance', { p_token: token }),
    takeMaintenanceLease: () => rpc('bhangra_take_maintenance_lease', { p_seconds: 90 }),
  }
}