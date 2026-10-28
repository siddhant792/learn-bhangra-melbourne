<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { events, media, links } from '../content.js'
import ArrowIcon from '../components/ArrowIcon.vue'
import BrandSpark from '../components/BrandSpark.vue'
import FollowBanner from '../components/FollowBanner.vue'
const reels = computed(() => media.reels.filter(reel => reel.src))
const selected = ref(null)
const dialog = ref(null)
const video = ref(null)
const playbackFailed = ref(false)
let trigger = null
async function open(reel, event) { trigger = event.currentTarget; selected.value = reel; playbackFailed.value = false; await nextTick(); dialog.value.showModal() }
function close() { video.value?.pause(); dialog.value?.close(); selected.value = null; trigger?.focus() }
function cancel(event) { event.preventDefault(); close() }
function backdrop(event) { if (event.target === dialog.value) { const box = dialog.value.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close() } }
onBeforeUnmount(() => video.value?.pause())
</script>
<template>
  <section class="page-hero orange"><p class="eyebrow">OUR LITTLE CORNER OF THE DANCE FLOOR</p><h1>Catch a feeling.<br /><em>Keep it moving.</em></h1><p>A home for the moments that make the movement.</p><span class="page-hero-doodle" aria-hidden="true"><BrandSpark /></span></section>
  <section class="gallery-page section-pad"><div class="section-heading"><div><p class="eyebrow">THE MOVEMENT GALLERY</p><h2>{{ reels.length ? 'Our community,' : 'The energy,' }} <em>{{ reels.length ? 'in motion.' : 'illustrated.' }}</em></h2></div><span v-if="!reels.length" class="preview-status"><span aria-hidden="true"></span> Concept preview · dance videos coming soon</span></div><div v-if="reels.length" class="reel-grid"><button v-for="reel in reels" :key="reel.src" class="reel-card" @click="open(reel, $event)"><img :src="reel.poster || media.heroPoster" :alt="reel.title" loading="lazy" /><span class="reel-play" aria-hidden="true">▶</span><span class="reel-title">{{ reel.title }} <ArrowIcon /></span><span class="sr-only">Play video</span></button></div><div v-else class="illustration-gallery"><figure><img src="/art/dance-party.svg" alt="Original illustration of a joyful Bhangra dance gathering" /><figcaption>01 / GOOD PEOPLE, GREAT ENERGY <span>Original concept illustration</span></figcaption></figure><figure><img src="/art/dance-detail.svg" alt="Original illustration exploring Bhangra dance and expressive movement" /><figcaption>02 / THE JOY IS IN THE DOING <span>Original concept illustration</span></figcaption></figure><figure><img src="/art/dhol.svg" alt="Original illustration of a Punjabi dhol drum" /><figcaption>03 / IT STARTS WITH THE BEAT <span>Original concept illustration</span></figcaption></figure></div><div v-if="!reels.length" class="gallery-note"><h3>Space for your <em>real moves.</em></h3><p>Community dance videos will live here once approved clips are supplied. These illustrations are concept artwork, not footage of our classes.</p><a :href="links.instagram" class="text-link" target="_blank" rel="noopener noreferrer">See the official Instagram <ArrowIcon /><span class="sr-only"> (new tab)</span></a></div></section>
  <section class="poster-section section-pad"><div class="section-heading"><div><p class="eyebrow">FROM THE COMMUNITY NOTICEBOARD</p><h2>Posters with <em>personality.</em></h2></div></div><p>Official public workshop artwork. These are event posters, not playable videos.</p><div class="poster-gallery"><a v-for="event in events" :key="event.id" :href="event.booking" target="_blank" rel="noopener noreferrer"><img :src="event.image" :alt="`${event.title} official event poster`" loading="lazy" /><span>{{ event.title }} <ArrowIcon /><span class="sr-only"> — external event page (new tab)</span></span></a></div></section><FollowBanner />
  <dialog ref="dialog" class="video-dialog" aria-labelledby="video-title" @cancel="cancel" @click="backdrop"><div v-if="selected" class="dialog-content"><div class="dialog-heading"><h2 id="video-title">{{ selected.title }}</h2><button class="dialog-close" aria-label="Close video" autofocus @click="close">×</button></div><video v-if="!playbackFailed" ref="video" :src="selected.src" :poster="selected.poster" controls playsinline preload="metadata" @error="playbackFailed = true"></video><p v-else role="status" class="video-error">This clip couldn’t load. Please try again later or visit the official Instagram.</p></div></dialog>
</template>
