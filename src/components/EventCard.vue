<script setup>
import { computed, ref } from 'vue'
import ArrowIcon from './ArrowIcon.vue'
import { money, useTickets } from '../composables/useTickets.js'
const props = defineProps({ event: { type: Object, required: true } })
const { workshops, loading, error: availabilityError } = useTickets()
const next = computed(() => workshops.value.find(workshop => workshop.id === props.event.id)?.tickets
  .filter(ticket => Date.parse(ticket.startsAt) > Date.now()).sort((first, second) => Date.parse(first.startsAt) - Date.parse(second.startsAt))[0])
const price = computed(() => next.value?.amount ? `${money(next.value.amount)} per ticket` : props.event.price)
const expanded = ref(false)
const imageFailed = ref(false)
</script>

<template>
  <article class="event-card">
    <div class="event-art">
      <img v-if="!imageFailed" :src="event.image" :alt="`${event.title} — official event poster`" loading="lazy" @error="imageFailed = true" />
      <div v-else class="poster-fallback"><span>LEARN<br />BHANGRA</span><strong>{{ event.title }}</strong><span>View the official poster on the booking page ↗</span></div>
      <span class="event-level">{{ event.level }}</span>
    </div>
    <div class="event-body">
      <p class="eyebrow">{{ event.eyebrow }}</p>
      <h3>{{ event.title }}</h3>
      <p class="event-description">{{ event.description }}</p>
      <dl class="event-meta"><div><dt>When</dt><dd>{{ next ? next.label : event.date }}<span v-if="event.time"> · {{ event.time }}</span></dd></div><div><dt>Where</dt><dd>{{ event.location }}</dd></div><div><dt>Tickets</dt><dd>{{ price }}</dd></div><div v-if="next?.remaining !== null && next?.remaining !== undefined"><dt>Places</dt><dd>{{ next.remaining }} remaining</dd></div></dl>
      <button class="details-toggle" :aria-expanded="expanded" :aria-controls="`details-${event.id}`" @click="expanded = !expanded">{{ expanded ? 'Less detail' : 'The full rundown' }} <span aria-hidden="true">{{ expanded ? '−' : '+' }}</span></button>
      <div v-if="expanded" :id="`details-${event.id}`" class="event-details"><ul><li v-for="detail in event.details" :key="detail">{{ detail }}</li></ul><ul v-if="event.sessions?.length"><li v-for="session in event.sessions" :key="session.date + session.title">{{ session.date }} — {{ session.title }}</li></ul><p>Dates, availability and prices may change. Confirm the latest details with the organiser before booking.</p></div>
      <RouterLink v-if="next || loading || availabilityError" :to="{ path: `/workshops/${event.id}/tickets`, query: next ? { ticket: next.id } : {} }" class="button button-dark event-book">Get tickets <ArrowIcon /></RouterLink>
      <RouterLink v-else to="/past-workshops" class="button button-dark event-book">Past workshops <ArrowIcon /></RouterLink>
    </div>
  </article>
</template>
