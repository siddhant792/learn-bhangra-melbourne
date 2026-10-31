<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CircleCheck, Printer, RefreshCw, Ticket } from '@lucide/vue'
import { money } from '../composables/useTickets.js'
import { bookingFetch } from '../composables/bookingApi.js'
import ArrowIcon from '../components/ArrowIcon.vue'

const route = useRoute()
const order = ref(null)
const loading = ref(false)
const error = ref('')
let timer
let attempts = 0
let stopped = false
async function check() {
  clearTimeout(timer)
  const sessionId = route.query.session_id
  if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) { error.value = 'This booking link is incomplete.'; return }
  loading.value = true
  error.value = ''
  try {
    const response = await bookingFetch(`/orders/${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Your booking could not be loaded.')
    if (stopped) return
    order.value = data
    if (data.status === 'paid') { try { sessionStorage.removeItem('bhangra-checkout') } catch {} }
    else if (!['expired', 'failed'].includes(data.status) && attempts++ < 8) timer = setTimeout(check, 3000)
  } catch (failure) { if (!stopped) error.value = failure.message || 'Your booking could not be loaded.' }
  finally { loading.value = false }
}
function printTickets() { window.print() }
onMounted(check)
onBeforeUnmount(() => { stopped = true; clearTimeout(timer) })
</script>

<template>
  <section class="confirmation-page section-pad">
    <template v-if="order?.status === 'paid'">
      <CircleCheck class="confirmation-icon" :size="48" aria-hidden="true" />
      <p class="eyebrow">{{ order.test ? 'STRIPE TEST MODE · NO REAL PAYMENT' : 'SEE YOU ON THE DANCE FLOOR' }}</p>
      <h1>{{ order.test ? 'Test booking complete.' : 'Your tickets are ready.' }}</h1>
      <p class="confirmation-summary">{{ order.title }} · {{ order.label }}</p>
      <p>{{ order.location }}</p>
      <p>{{ order.quantity }} {{ order.quantity === 1 ? 'ticket' : 'tickets' }} · {{ money(order.amount) }} {{ order.test ? 'test total · nothing charged' : 'AUD paid' }}</p>
      <p v-if="order.test" class="booking-notice">These test tickets are not valid for admission. No real money was charged and no ticket email was sent.</p>
      <p v-else-if="order.emailSent" class="booking-notice">Your tickets have also been emailed to the address used at checkout.</p>
      <p v-else-if="order.emailEnabled" class="booking-notice">Your ticket email is being prepared. Keep this link or print your tickets below.</p>
      <p v-else class="booking-notice">Keep this booking link or print your tickets for the workshop.</p>
      <div class="confirmation-actions"><button class="button button-dark" @click="printTickets"><Printer :size="18" /> Print tickets</button><RouterLink to="/workshops" class="text-link">More workshops <ArrowIcon /></RouterLink></div>
      <ol class="issued-tickets"><li v-for="(code, index) in order.tickets" :key="code"><span><Ticket :size="20" /> {{ order.test ? 'Test ticket' : 'Ticket' }} {{ index + 1 }} of {{ order.quantity }}</span><strong>{{ order.title }}</strong><p>{{ order.label }}</p><p v-if="order.test" class="demo-ticket-disclaimer">TEST ONLY · NOT VALID FOR ADMISSION</p><code>{{ code }}</code></li></ol>
    </template>
    <template v-else>
      <p class="eyebrow">YOUR BOOKING</p>
      <h1>{{ ['expired', 'failed'].includes(order?.status) ? 'Checkout ended.' : 'Checking your payment.' }}</h1>
      <p v-if="loading" role="status">Please wait while we confirm your booking with Stripe.</p>
      <p v-else-if="order && !['expired', 'failed'].includes(order.status)">Your payment has not been confirmed yet. Check again before making another booking.</p>
      <p v-else-if="order">This checkout did not produce confirmed tickets.</p>
      <p v-if="error" role="alert" class="booking-error">{{ error }}</p>
      <div class="confirmation-actions"><button class="button button-dark" :disabled="loading" @click="check"><RefreshCw :size="18" /> Check again</button><RouterLink to="/workshops" class="text-link">Find a workshop <ArrowIcon /></RouterLink></div>
    </template>
  </section>
</template>