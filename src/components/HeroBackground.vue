<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { media } from '../content.js'
import { useInlinePlayback } from '../composables/useInlinePlayback.js'

const uploadedVideos = import.meta.glob('/public/videos/*.{mp4,webm,mov,m4v}', { eager: true, query: '?url', import: 'default' })
const mobilePreference = window.matchMedia('(max-width: 600px)')
const mobile = ref(mobilePreference.matches)
const source = computed(() => (mobile.value && media.heroVideoMobile) || media.heroVideo || Object.keys(uploadedVideos).sort()[0]?.replace('/public', '') || '')
const poster = computed(() => (mobile.value && media.heroPosterMobile) || media.heroPoster || '/art/dance-party.svg')
function updateViewport() { mobile.value = mobilePreference.matches }
const background = ref(null)
const inView = ref(true)
const video = ref(null)
const failed = ref(false)
const available = computed(() => Boolean(source.value) && !failed.value)
const { playing, wantsPlayback, syncPlayback, togglePlayback } = useInlinePlayback(video, inView)
let observer

watch(source, () => { failed.value = false })
onMounted(() => {
  mobilePreference.addEventListener('change', updateViewport)
  observer = new IntersectionObserver(([entry]) => {
    inView.value = entry.isIntersecting
    syncPlayback()
  }, { threshold: 0.1 })
  observer.observe(background.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  mobilePreference.removeEventListener('change', updateViewport)
})
</script>

<template>
  <div ref="background" class="hero-background" aria-hidden="true">
    <img class="hero-background-poster" :src="poster" alt="" fetchpriority="high" />
    <video v-if="available" ref="video" class="hero-background-video" :src="source" :poster="poster" muted loop playsinline :autoplay="wantsPlayback" preload="metadata" tabindex="-1" @loadedmetadata="syncPlayback" @canplay="syncPlayback" @playing="playing = true" @pause="playing = false" @error="failed = true"></video>
    <div class="hero-background-overlay"></div>
  </div>
  <button v-if="available" class="hero-video-control" type="button" :aria-label="playing ? 'Pause background video' : 'Play background video'" @click="togglePlayback">
    <span aria-hidden="true">{{ playing ? 'Ⅱ' : '▶' }}</span> {{ playing ? 'Pause the moment' : 'Play the moment' }}
  </button>
  <span v-else class="hero-media-note">Concept preview · awaiting client dance footage</span>
</template>
