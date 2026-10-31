export function bookingUrl(path, settings = import.meta.env || {}) {
  const project = settings.VITE_SUPABASE_URL
  const name = settings.VITE_BOOKING_FUNCTION || 'bookings-test'
  if (!project || !['bookings', 'bookings-test'].includes(name)) throw new Error('Online booking is not configured yet.')
  const url = new URL(project)
  if (url.protocol !== 'https:' || url.pathname !== '/') throw new Error('Invalid booking configuration.')
  return `${url.origin}/functions/v1/${name}${path}`
}
export function bookingFetch(path, options) { return fetch(bookingUrl(path), options) }