<script setup>
import { ref } from 'vue'
import ArrowIcon from './ArrowIcon.vue'
defineProps({ event: { type: Object, required: true } })
const expanded = ref(false)
const imageFailed = ref(false)
</script>

<template>
  <article class="event-card">
    <div class="event-art">
      <img v-if="!imageFailed" :src="event.image" :alt="`${event.title} — official event poster`" loading="lazy" @error="imageFailed = true" />
      <div v-else class="poster-fallback"><span>LEARN BHANGRA<br />MELBOURNE</span><strong>{{ event.title }}</strong><span>View the official poster on the booking page ↗</span></div>
      <span class="event-level">{{ event.level }}</span>
    </div>
    <div class="event-body">
      <p class="eyebrow">{{ event.eyebrow }}</p>
      <h3>{{ event.title }}</h3>
      <p class="event-description">{{ event.description }}</p>
      <dl class="event-meta"><div><dt>When</dt><dd>{{ event.date }}<span v-if="event.time"> · {{ event.time }}</span></dd></div><div><dt>Where</dt><dd>{{ event.location }}</dd></div><div><dt>Tickets</dt><dd>{{ event.price }}</dd></div></dl>
      <button class="details-toggle" :aria-expanded="expanded" :aria-controls="`details-${event.id}`" @click="expanded = !expanded">{{ expanded ? 'Less detail' : 'The full rundown' }} <span aria-hidden="true">{{ expanded ? '−' : '+' }}</span></button>
      <div v-if="expanded" :id="`details-${event.id}`" class="event-details"><ul><li v-for="detail in event.details" :key="detail">{{ detail }}</li></ul><ul v-if="event.sessions?.length"><li v-for="session in event.sessions" :key="session.date + session.title">{{ session.date }} — {{ session.title }}</li></ul><p>Dates, availability and prices may change. Confirm the latest details with the organiser before booking.</p></div>
      <a :href="event.booking" class="button button-dark event-book" target="_blank" rel="noopener noreferrer">View tickets <ArrowIcon /><span class="sr-only"> (opens external booking page in a new tab)</span></a>
    </div>
  </article>
</template>
