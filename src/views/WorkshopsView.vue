<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { events, links } from '../content.js'
import EventCard from '../components/EventCard.vue'
import ArrowIcon from '../components/ArrowIcon.vue'
import BrandSpark from '../components/BrandSpark.vue'
import FollowBanner from '../components/FollowBanner.vue'
import { useTickets } from '../composables/useTickets.js'
import PastWorkshopsView from './PastWorkshopsView.vue'
const { upcomingSessions, loading, error: availabilityError, refresh } = useTickets()
defineProps({ mode: { type: String, default: 'workshops' } })
const route = useRoute()
const router = useRouter()
const past = computed(() => route.query.view === 'past')
const upcomingLink = computed(() => {
  const query = { ...route.query }
  delete query.view
  return { path: route.path, query }
})
const pastLink = computed(() => ({ path: route.path, query: { ...route.query, view: 'past' } }))
const filters = [{ id: 'all', label: 'All workshops' }, { id: 'first-timers', label: 'First timers' }, { id: 'intermediate', label: 'Intermediate' }]
const active = computed(() => filters.some(f => f.id === route.query.level) ? route.query.level : 'all')
const filtered = computed(() => upcomingSessions.value.map(session => ({ event: events.find(event => event.id === session.workshopId), session }))
  .filter(({ event }) => event && (active.value === 'all' || (active.value === 'intermediate' ? event.level === 'Intermediate' : event.level === 'All levels'))))
function select(id) {
  const query = { ...route.query }
  if (id === 'all') delete query.level
  else query.level = id
  router.replace({ path: route.path, query })
}
</script>
<template>
  <section class="page-hero pink"><p class="eyebrow">{{ mode === 'events' ? 'MAKE A LITTLE ROOM FOR JOY' : 'YOUR FEET CALLED. THEY WANT IN.' }}</p><h1>{{ mode === 'events' ? 'Good plans.' : 'Find your rhythm.' }}<br /><em>{{ mode === 'events' ? 'Great energy.' : 'Keep your joy.' }}</em></h1><p>Explore publicly listed Learn Bhangra workshops.<br />Bring a friend, or come ready to meet the beat.</p><span class="page-hero-doodle" aria-hidden="true"><BrandSpark /></span></section>
  <nav class="section-pad workshop-view-tabs" aria-label="Workshop views">
    <RouterLink :to="upcomingLink" :aria-current="!past ? 'page' : undefined">Upcoming</RouterLink>
    <RouterLink :to="pastLink" :aria-current="past ? 'page' : undefined">Past</RouterLink>
  </nav>
  <PastWorkshopsView v-if="past" embedded />
  <section v-else class="section-pad workshop-list">
    <div class="workshop-toolbar"><div class="filter-group" aria-label="Filter workshops by experience"><button v-for="filter in filters" :key="filter.id" :aria-pressed="active === filter.id" :class="{ active: active === filter.id }" @click="select(filter.id)">{{ filter.label }}</button></div><span class="results-count" role="status" aria-live="polite">{{ loading && !filtered.length ? 'Checking workshop dates…' : `${filtered.length} ${filtered.length === 1 ? 'workshop' : 'workshops'} to explore` }}</span></div>
    <p class="listing-note">Workshops usually happen every two weeks. Dates appear here as they are confirmed.</p>
    <p v-if="loading && !filtered.length" class="listing-note" role="status">Loading upcoming workshops…</p>
    <div v-else-if="availabilityError && !filtered.length" class="empty-state"><h2>Workshop dates are temporarily unavailable.</h2><p>{{ availabilityError }}</p><button class="button button-dark" @click="refresh">Try again <ArrowIcon /></button></div>
    <div v-else-if="filtered.length" class="event-grid"><EventCard v-for="entry in filtered" :key="`${entry.event.id}-${entry.session.id}`" :event="entry.event" :session="entry.session" /></div>
    <div v-else class="empty-state"><h2>More beats on the way.</h2><p>No upcoming workshop matches this filter yet. Explore all workshops or check Instagram for announcements.</p><button class="button button-dark" @click="select('all')">Show all workshops <ArrowIcon /></button></div>
    <div class="workshop-help"><span aria-hidden="true">↳</span><div><h3>A first-timer? You’re welcome here.</h3><p>The first-timers filter shows all-level listings. Read each workshop’s full rundown to find the right fit for you.</p></div><a :href="links.instagram" class="text-link" target="_blank" rel="noopener noreferrer">Ask us on Instagram <ArrowIcon /><span class="sr-only"> (new tab)</span></a></div>
  </section><FollowBanner />
</template>

<style scoped>
.workshop-view-tabs { display: flex; gap: 24px; padding-top: 24px; padding-bottom: 0; }
.workshop-view-tabs a { padding: 12px 0; border-bottom: 3px solid transparent; font-weight: 700; text-decoration: none; }
.workshop-view-tabs a[aria-current="page"] { border-bottom-color: var(--orange); }
.workshop-list, .workshop-view-tabs + :deep(.past-workshops) { padding-top: 24px; }
</style>
