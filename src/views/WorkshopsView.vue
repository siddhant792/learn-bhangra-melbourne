<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { events, links } from '../content.js'
import EventCard from '../components/EventCard.vue'
import ArrowIcon from '../components/ArrowIcon.vue'
import BrandSpark from '../components/BrandSpark.vue'
import FollowBanner from '../components/FollowBanner.vue'
defineProps({ mode: { type: String, default: 'workshops' } })
const route = useRoute()
const router = useRouter()
const filters = [{ id: 'all', label: 'All workshops' }, { id: 'first-timers', label: 'First timers' }, { id: 'intermediate', label: 'Intermediate' }]
const active = computed(() => filters.some(f => f.id === route.query.level) ? route.query.level : 'all')
const filtered = computed(() => events.filter(event => active.value === 'all' || (active.value === 'intermediate' ? event.level === 'Intermediate' : event.level === 'All levels')))
function select(id) { router.replace({ path: route.path, query: id === 'all' ? {} : { level: id } }) }
</script>
<template>
  <section class="page-hero pink"><p class="eyebrow">{{ mode === 'events' ? 'MAKE A LITTLE ROOM FOR JOY' : 'YOUR FEET CALLED. THEY WANT IN.' }}</p><h1>{{ mode === 'events' ? 'Good plans.' : 'Find your rhythm.' }}<br /><em>{{ mode === 'events' ? 'Great energy.' : 'Keep your joy.' }}</em></h1><p>Explore publicly listed Learn Bhangra Melbourne workshops.<br />Bring a friend, or come ready to meet the beat.</p><span class="page-hero-doodle" aria-hidden="true"><BrandSpark /></span></section>
  <section class="section-pad workshop-list"><div class="workshop-toolbar"><div class="filter-group" aria-label="Filter workshops by experience"><button v-for="filter in filters" :key="filter.id" :aria-pressed="active === filter.id" :class="{ active: active === filter.id }" @click="select(filter.id)">{{ filter.label }}</button></div><span class="results-count" role="status" aria-live="polite">{{ filtered.length }} {{ filtered.length === 1 ? 'workshop' : 'workshops' }} to explore</span></div><p class="listing-note">These are published event listings, not a live schedule. Dates may have passed; use the official ticket page to confirm current availability.</p><div v-if="filtered.length" class="event-grid"><EventCard v-for="event in filtered" :key="event.id" :event="event" /></div><div v-else class="empty-state"><h2>More beats on the way.</h2><p>No published workshop matches this filter yet. Explore all workshops or check Instagram for announcements.</p><button class="button button-dark" @click="select('all')">Show all workshops <ArrowIcon /></button></div><div class="workshop-help"><span aria-hidden="true">↳</span><div><h3>A first-timer? You’re welcome here.</h3><p>The first-timers filter shows all-level listings. Read each workshop’s full rundown to find the right fit for you.</p></div><a :href="links.instagram" class="text-link" target="_blank" rel="noopener noreferrer">Ask us on Instagram <ArrowIcon /><span class="sr-only"> (new tab)</span></a></div></section><FollowBanner />
</template>
