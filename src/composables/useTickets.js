import { computed, onMounted, ref } from 'vue'
import { bookingFetch } from './bookingApi.js'

const workshops = ref([])
const loading = ref(true)
const error = ref('')
const checkoutReady = ref(false)
const testMode = ref(false)
let pending = null

export async function refreshTickets() {
  if (pending) return pending
  loading.value = true
  error.value = ''
  pending = (async () => {
    try {
      const response = await bookingFetch('/workshops', { cache: 'no-store' })
      if (!response.ok) throw new Error('Availability could not be loaded.')
      const data = await response.json()
      if (!Array.isArray(data.workshops)) throw new Error('Availability could not be loaded.')
      workshops.value = data.workshops
      checkoutReady.value = data.checkoutReady === true
      testMode.value = data.test === true
    } catch {
      checkoutReady.value = false
      testMode.value = false
      error.value = 'Online availability is temporarily unavailable. Please try again.'
    } finally { loading.value = false; pending = null }
  })()
  return pending
}

export function useTickets() {
  onMounted(refreshTickets)
  const nextWorkshop = computed(() => workshops.value
    .flatMap(workshop => workshop.tickets.filter(ticket => Date.parse(ticket.startsAt) > Date.now())
      .map(ticket => ({ workshopId: workshop.id, ...ticket })))
    .sort((first, second) => Date.parse(first.startsAt) - Date.parse(second.startsAt))[0])
  return { workshops, loading, error, checkoutReady, testMode, nextWorkshop, refresh: refreshTickets }
}

export function money(amount) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount / 100)
}