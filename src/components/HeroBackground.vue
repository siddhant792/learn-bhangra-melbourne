<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { media } from '../content.js'

const uploadedVideos = import.meta.glob('/public/videos/*.{mp4,webm,mov,m4v}', { eager: true, query: '?url', import: 'default' })
const mobilePreference = window.matchMedia('(max-width: 600px)')
const mobile = ref(mobilePreference.matches)
const source = computed(() => (mobile.value && media.heroVideoMobile) || media.heroVideo || Object.keys(uploadedVideos).sort()[0]?.replace('/public', '') || '')
const poster = computed(() => (mobile.value && media.heroPosterMobile) || media.heroPoster || '/art/dance-party.svg')
function updateViewport() { mobile.value = mobilePreference.matches }
const video = ref(null)
const playing = ref(false)
const failed = ref(false)
const reducedMotion = ref(false)
const available = computed(() => Boolean(source.value) && !failed.value)
let motionPreference
let pausedByUser = false

async function play() {
  if (!video.value || reducedMotion.value || pausedByUser || document.hidden) return
  try { await video.value.play() } catch { playing.value = false }
}
function togglePlayback() {
  if (playing.value) {
    pausedByUser = true
    video.value?.pause()
  } else {
    pausedByUser = false
    video.value?.play().catch(() => { playing.value = false })
  }
}
function updateMotion() {
  reducedMotion.value = motionPreference.matches
  if (reducedMotion.value) video.value?.pause()
  else play()
}
function updateVisibility() {
  if (document.hidden) video.value?.pause()
  else play()
}
watch(source, () => { failed.value = false })
onMounted(() => {
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotion()
  motionPreference.addEventListener('change', updateMotion)
  mobilePreference.addEventListener('change', updateViewport)
  document.addEventListener('visibilitychange', updateVisibility)
})
onBeforeUnmount(() => {
  motionPreference?.removeEventListener('change', updateMotion)
  mobilePreference.removeEventListener('change', updateViewport)
  document.removeEventListener('visibilitychange', updateVisibility)
  video.value?.pause()
})
</script>

<template>
  <div class="hero-background" aria-hidden="true">
    <img class="hero-background-poster" :src="poster" alt="" fetchpriority="high" />
    <video v-if="available" ref="video" class="hero-background-video" :src="source" :poster="poster" muted loop playsinline preload="metadata" tabindex="-1" @canplay="play" @play="playing = true" @pause="playing = false" @error="failed = true"></video>
    <div class="hero-background-overlay"></div>
  </div>
  <button v-if="available" class="hero-video-control" type="button" :aria-label="playing ? 'Pause background video' : 'Play background video'" @click="togglePlayback">
    <span aria-hidden="true">{{ playing ? 'Ⅱ' : '▶' }}</span> {{ playing ? 'Pause the moment' : 'Play the moment' }}
  </button>
  <span v-else class="hero-media-note">Concept preview · awaiting client dance footage</span>
</template>
