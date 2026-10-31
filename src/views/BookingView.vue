<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CreditCard, LockKeyhole, Minus, Plus, Ticket } from '@lucide/vue'
import { events, links } from '../content.js'
import { money, useTickets } from '../composables/useTickets.js'
import { bookingFetch } from '../composables/bookingApi.js'
import ArrowIcon from '../components/ArrowIcon.vue'

const route = useRoute()
const router = useRouter()
const { workshops, loading, error: availabilityError, checkoutReady, refresh } = useTickets()
const event = computed(() => events.find(item => item.id === route.params.id))
const sessions = computed(() => workshops.value.find(item => item.id === route.params.id)?.tickets
  .filter(ticket => Date.parse(ticket.startsAt) > Date.now()) || [])
const selectedId = ref('')
const quantity = ref(1)
const busy = ref(false)
const error = ref('')
const cancelled = ref(false)
function readPending() { try { return JSON.parse(sessionStorage.getItem('bhangra-checkout') || 'null') } catch { return null } }
const pendingSelection = ref(readPending())
watch([sessions, () => route.params.id], () => {
  if (!sessions.value.some(ticket => ticket.id === selectedId.value)) {
    const previous = pendingSelection.value?.workshopId === route.params.id ? pendingSelection.value : null
    selectedId.value = sessions.value.find(ticket => ticket.id === route.query.ticket)?.id || sessions.value.find(ticket => ticket.id === previous?.ticketId)?.id || sessions.value.find(ticket => ticket.bookable)?.id || sessions.value[0]?.id || ''
    if (previous?.ticketId === selectedId.value && Number.isSafeInteger(previous.quantity) && previous.quantity > 0 && previous.quantity <= 10) quantity.value = previous.quantity
  }
}, { immediate: true })
const ticket = computed(() => sessions.value.find(item => item.id === selectedId.value))
const sessionDate = computed(() => ticket.value ? new Intl.DateTimeFormat('en-AU', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Australia/Melbourne' }).format(new Date(ticket.value.startsAt)) : '')
const resuming = computed(() => pendingSelection.value?.workshopId === route.params.id && pendingSelection.value.ticketId === selectedId.value && pendingSelection.value.quantity === quantity.value && typeof pendingSelection.value.requestId === 'string')
const maximumQuantity = computed(() => Math.min(10, ticket.value?.remaining || 0))
const validQuantity = computed(() => Number.isSafeInteger(quantity.value) && quantity.value >= 1 && quantity.value <= maximumQuantity.value)
const total = computed(() => ticket.value?.amount && (validQuantity.value || resuming.value) ? ticket.value.amount * quantity.value : null)
const canBuy = computed(() => checkoutReady.value && ((ticket.value?.bookable && validQuantity.value) || (resuming.value && Number.isSafeInteger(quantity.value) && quantity.value > 0 && quantity.value <= 10)) && !loading.value && !busy.value)
const unavailable = computed(() => {
  if (loading.value || availabilityError.value) return ''
  if (!ticket.value) return 'No upcoming session has been announced for this workshop.'
  if (ticket.value.amount === null) return 'Ticket pricing is being confirmed. Booking will open soon.'
  if (ticket.value.remaining === null) return 'Places for this session are being confirmed. Booking will open soon.'
  if (ticket.value.remaining === 0) return 'This session is sold out.'
  if (!checkoutReady.value) return 'Online booking is being set up. Please contact Learn Bhangra for tickets.'
  return ''
})
function clearRequest() { pendingSelection.value = null; try { sessionStorage.removeItem('bhangra-checkout') } catch {} }
function requestId() {
  const selection = { workshopId: route.params.id, ticketId: selectedId.value, quantity: quantity.value }
  const previous = pendingSelection.value || readPending()
  if (previous && Object.keys(selection).every(key => previous[key] === selection[key])) return previous.requestId
  const id = crypto.randomUUID()
  pendingSelection.value = { ...selection, requestId: id }
  try { sessionStorage.setItem('bhangra-checkout', JSON.stringify(pendingSelection.value)) } catch {}
  return id
}
async function checkout() {
  if (!canBuy.value) return
  error.value = ''
  busy.value = true
  try {
    const response = await bookingFetch('/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workshopId: route.params.id, ticketId: selectedId.value, quantity: quantity.value, requestId: requestId() }) })
    const data = await response.json()
    if (!response.ok) {
      if ([400, 409].includes(response.status)) { clearRequest(); await refresh() }
      throw new Error(data.error || 'Checkout could not start. Please retry.')
    }
    if (typeof data.sessionId === 'string' && data.sessionId.startsWith('cs_')) {
      await router.push({ path: '/booking/confirmation', query: { session_id: data.sessionId } })
      return
    }
    const url = new URL(data.url)
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Checkout could not start. Please retry.')
    window.location.assign(url.href)
  } catch (failure) {
    error.value = failure.message || 'Checkout could not start. Please retry.'
    busy.value = false
  }
}
onMounted(async () => {
  if (route.query.cancelled !== '1' || typeof route.query.order_id !== 'string') return
  busy.value = true
  try {
    const response = await bookingFetch('/checkout/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: route.query.order_id }) })
    if (!response.ok) throw new Error('We could not release the checkout yet. Its reserved places will be released when Stripe confirms expiry.')
    const data = await response.json()
    if (data.status === 'paid') { router.replace({ path: '/booking/confirmation', query: { session_id: data.sessionId } }); return }
    cancelled.value = true
    clearRequest()
    await router.replace({ path: route.path })
    await refresh()
  } catch (failure) { error.value = failure.message }
  finally { busy.value = false }
})
</script>

<template>
  <section class="booking-page section-pad">
    <RouterLink to="/workshops" class="text-link">All workshops <ArrowIcon /></RouterLink>
    <div v-if="event" class="booking-page-heading"><p class="eyebrow">SAVE YOUR PLACE ON THE DANCE FLOOR</p><h1>{{ event.title }}</h1></div>
    <div v-if="event" class="booking-layout">
      <div class="booking-story">
        <p>{{ event.description }}</p>
        <img :src="event.image" :alt="`${event.title} workshop poster`" />
        <p class="booking-venue">{{ event.location }}</p>
        <ul><li v-for="detail in event.details" :key="detail">{{ detail }}</li></ul>
      </div>
      <form class="ticket-picker" @submit.prevent="checkout" :aria-busy="busy || loading">
        <h2><Ticket :size="25" aria-hidden="true" /> Get tickets</h2>
        <p v-if="cancelled" class="booking-notice" role="status">Checkout cancelled. You can choose tickets again.</p>
        <p v-if="loading" role="status">Checking available places…</p>
        <template v-if="sessions.length">
          <label for="ticket-session">Choose your session</label>
          <select id="ticket-session" v-model="selectedId" :disabled="busy">
            <option v-for="session in sessions" :key="session.id" :value="session.id">{{ session.label }}{{ session.amount ? ` · ${money(session.amount)}` : ' · Price coming soon' }}</option>
          </select>
          <p class="ticket-unit-price">{{ sessionDate }} · Melbourne time</p>
          <p class="ticket-availability" role="status">{{ ticket?.remaining !== null && ticket?.remaining !== undefined ? `${ticket.remaining} places available` : 'Availability to be announced' }}</p>
          <label for="ticket-quantity">Number of tickets</label>
          <div class="quantity-control">
            <button type="button" aria-label="One fewer ticket" title="One fewer ticket" :disabled="busy || !ticket?.bookable || quantity <= 1" @click="quantity = Math.max(1, quantity - 1)"><Minus :size="18" /></button>
            <input id="ticket-quantity" v-model.number="quantity" type="number" min="1" :max="maximumQuantity || 1" step="1" inputmode="numeric" required :disabled="busy || !ticket?.bookable" />
            <button type="button" aria-label="One more ticket" title="One more ticket" :disabled="busy || !ticket?.bookable || quantity >= maximumQuantity" @click="quantity = Math.min(maximumQuantity, quantity + 1)"><Plus :size="18" /></button>
          </div>
          <p class="ticket-unit-price">{{ ticket?.amount ? `${money(ticket.amount)} per ticket · AUD` : 'Price to be announced' }}</p>
          <p v-if="ticket?.bookable && !validQuantity && !resuming" class="booking-error" role="alert">Choose between 1 and {{ maximumQuantity }} tickets.</p>
          <dl class="ticket-total"><dt>Total</dt><dd>{{ total ? money(total) : '—' }}</dd></dl>
        </template>
        <p v-if="unavailable" class="booking-notice" role="status">{{ unavailable }}</p>
        <p v-if="availabilityError || error" class="booking-error" role="alert">{{ error || availabilityError }}</p>
        <button v-if="availabilityError" type="button" class="text-link" @click="refresh">Check availability again <ArrowIcon /></button>
        <button type="submit" class="button button-dark checkout-button" :disabled="!canBuy"><CreditCard :size="20" /> {{ busy ? 'Opening checkout…' : resuming ? 'Resume checkout' : 'Continue to payment' }}</button>
        <p class="checkout-security"><LockKeyhole :size="16" /> Secure card payment through Stripe. No account needed.</p>
        <p class="booking-policy">By continuing, you agree to the <RouterLink to="/terms-of-service">booking information</RouterLink> and <RouterLink to="/privacypolicy">privacy information</RouterLink>.</p>
        <a v-if="unavailable || availabilityError" :href="links.instagram" target="_blank" rel="noopener noreferrer" class="text-link">Ask Learn Bhangra <ArrowIcon /></a>
      </form>
    </div>
    <div v-else class="empty-state"><h1>Workshop not found.</h1><RouterLink to="/workshops" class="text-link">Find a workshop <ArrowIcon /></RouterLink></div>
  </section>
</template>