export class BookingError extends Error {
  constructor(message, status = 400) { super(message); this.status = status }
}
export function isSellable(ticket, now = Date.now()) {
  return ticket.active === true && Number.isFinite(Date.parse(ticket.startsAt)) && Date.parse(ticket.startsAt) > now + 2100000 &&
    Number.isSafeInteger(ticket.amount) && ticket.amount > 0 && Number.isSafeInteger(ticket.capacity) && ticket.capacity > 0
}
export function validateBooking(workshops, workshopId, ticketId, quantity, remaining, now = Date.now()) {
  const workshop = workshops.find(item => item.id === workshopId)
  const ticket = workshop?.tickets.find(item => item.id === ticketId)
  if (!ticket) throw new BookingError('This ticket could not be found.', 404)
  if (!isSellable(ticket, now)) throw new BookingError('Booking is not open for this session.', 409)
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new BookingError('Choose a whole number of tickets, starting at one.')
  if (quantity > remaining) throw new BookingError('There are not enough places left for this booking.', 409)
  if (!Number.isSafeInteger(ticket.amount * quantity) || ticket.amount * quantity > 99999999) throw new BookingError('This order is too large for one payment.')
  return { workshop, ticket, amount: ticket.amount * quantity }
}
export function publicWorkshop(workshop, getRemaining, checkoutReady, now = Date.now()) {
  return { id: workshop.id, tickets: workshop.tickets.map(ticket => ({ id: ticket.id, label: ticket.label, startsAt: ticket.startsAt,
    amount: ticket.amount, currency: 'aud', remaining: isSellable(ticket, now) ? getRemaining(ticket) : null,
    bookable: checkoutReady && isSellable(ticket, now) && getRemaining(ticket) > 0 })) }
}