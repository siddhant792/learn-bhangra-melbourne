<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CalendarDays, Images, Music2, Play, Search, X } from '@lucide/vue'
import { media } from '../content.js'
import BrandSpark from '../components/BrandSpark.vue'
import FollowBanner from '../components/FollowBanner.vue'

const route = useRoute()
const router = useRouter()
const searchMode = computed(() => route.query.browse === 'date' ? 'date' : 'choreography')
function updateQuery(key, value) {
  const query = { ...route.query }
  if (value) query[key] = value
  else delete query[key]
  router.replace({ path: route.path, query })
}
const choreographyQuery = computed({ get: () => typeof route.query.q === 'string' ? route.query.q : '', set: value => updateQuery('q', value) })
const workshopDate = computed({ get: () => typeof route.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.date) ? route.query.date : '', set: value => updateQuery('date', value) })
const activeSearch = computed(() => searchMode.value === 'date' ? workshopDate.value : choreographyQuery.value)
function normalized(value) { return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-AU').trim() }
const filteredWorkshops = computed(() => media.reels.filter(workshop => {
  if (searchMode.value === 'date') return !workshopDate.value || (workshop.dateISO || workshop.date) === workshopDate.value
  const words = normalized(choreographyQuery.value).split(/\s+/).filter(Boolean)
  const searchable = normalized([workshop.title, workshop.choreography, workshop.song, workshop.artist].filter(Boolean).join(' '))
  return words.every(word => searchable.includes(word))
}))
function clearSearch() { updateQuery(searchMode.value === 'date' ? 'date' : 'q', '') }
function displayDate(workshop) {
  if (workshop.date) return workshop.date
  const date = new Date(`${workshop.dateISO}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-AU', { dateStyle: 'long', timeZone: 'UTC' }).format(date)
}
const selected = ref(null)
const mode = ref('video')
const dialog = ref(null)
const video = ref(null)
let trigger
function photos(workshop) { return workshop.photos || (workshop.poster ? [{ src: workshop.poster, caption: 'Still from the workshop video' }] : []) }
async function open(workshop, kind, event) {
  trigger = event.currentTarget
  selected.value = workshop
  mode.value = kind
  await nextTick()
  dialog.value.showModal()
}
function close() { video.value?.pause(); dialog.value.close(); selected.value = null; trigger?.focus() }
function cancel(event) { event.preventDefault(); close() }
function backdrop(event) {
  if (event.target !== dialog.value) return
  const bounds = dialog.value.getBoundingClientRect()
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close()
}
onBeforeUnmount(() => video.value?.pause())
</script>

<template>
  <section class="page-hero pink"><p class="eyebrow">GOOD TIMES, ON REPEAT</p><h1>Past workshops.<br /><em>Still feeling it.</em></h1><p>Choreography, familiar faces, and moments from the dance floor.</p><span class="page-hero-doodle" aria-hidden="true"><BrandSpark /></span></section>
  <section class="section-pad past-workshops">
    <div class="past-search-toolbar">
      <div class="past-search-modes" role="group" aria-label="Search past workshops by">
        <button type="button" :aria-pressed="searchMode === 'date'" @click="updateQuery('browse', 'date')"><CalendarDays :size="18" aria-hidden="true" /> By date</button>
        <button type="button" :aria-pressed="searchMode === 'choreography'" @click="updateQuery('browse', 'choreography')"><Music2 :size="18" aria-hidden="true" /> By choreography</button>
      </div>
      <div class="past-search-field">
        <label :class="{ 'sr-only': searchMode === 'choreography' }" :for="searchMode === 'date' ? 'past-workshop-date' : 'past-choreography'">{{ searchMode === 'date' ? 'Workshop date' : 'Song or choreography' }}</label>
        <div class="past-search-input">
          <template v-if="searchMode === 'date'"><input id="past-workshop-date" v-model="workshopDate" type="date" /></template>
          <template v-else><Search :size="18" aria-hidden="true" /><input id="past-choreography" v-model="choreographyQuery" type="search" placeholder="Search song, artist, or choreography" autocomplete="off" /></template>
          <button v-if="activeSearch" type="button" :aria-label="searchMode === 'date' ? 'Clear date' : 'Clear search'" :title="searchMode === 'date' ? 'Clear date' : 'Clear search'" @click="clearSearch"><X :size="18" /></button>
        </div>
      </div>
      <p class="past-search-count" role="status" aria-live="polite">{{ filteredWorkshops.length }} {{ filteredWorkshops.length === 1 ? 'workshop' : 'workshops' }}</p>
    </div>
    <div v-if="filteredWorkshops.length" class="past-workshop-grid">
      <article v-for="workshop in filteredWorkshops" :key="workshop.src" class="past-workshop-tile">
        <img :src="workshop.poster" :alt="workshop.title" loading="lazy" />
        <div class="past-workshop-body"><p v-if="displayDate(workshop)" class="eyebrow">{{ displayDate(workshop) }}</p><h2>{{ workshop.title }}</h2><p v-if="workshop.choreography">Choreography: {{ workshop.choreography }}</p><p v-if="workshop.song">Song: {{ workshop.song }}{{ workshop.artist ? ` · ${workshop.artist}` : '' }}</p><div class="past-workshop-actions"><button v-if="workshop.src" class="button button-dark" @click="open(workshop, 'video', $event)"><Play :size="17" /> Video</button><button v-if="photos(workshop).length" class="button button-light" @click="open(workshop, 'photos', $event)"><Images :size="18" /> Photos</button></div></div>
      </article>
    </div>
    <div v-if="media.reels.length && !filteredWorkshops.length" class="empty-state past-search-empty"><h2>No workshops found.</h2><p>{{ searchMode === 'date' ? 'No workshops are listed for this date.' : 'No choreography matches this search.' }}</p><button type="button" class="text-link" @click="clearSearch">Show all workshops</button></div>
    <div v-if="!media.reels.length" class="empty-state"><h2>More moments soon.</h2><p>Workshop photos and videos will appear here once shared by Learn Bhangra.</p></div>
  </section>
  <FollowBanner />
  <dialog ref="dialog" class="video-dialog workshop-media-dialog" aria-labelledby="workshop-media-title" @cancel="cancel" @keydown.esc.stop.prevent="close" @click="backdrop">
    <div v-if="selected" class="dialog-content"><div class="dialog-heading"><h2 id="workshop-media-title">{{ selected.title }}</h2><button class="media-close" aria-label="Close workshop media" title="Close" autofocus @click="close"><X :size="22" /></button></div><video v-if="mode === 'video'" ref="video" :src="selected.src" :poster="selected.poster" controls playsinline preload="metadata"></video><div v-else class="workshop-photos"><figure v-for="photo in photos(selected)" :key="photo.src"><img :src="photo.src" :alt="photo.alt || photo.caption || selected.title" /><figcaption v-if="photo.caption">{{ photo.caption }}</figcaption></figure></div></div>
  </dialog>
</template>