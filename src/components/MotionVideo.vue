<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  poster: { type: String, required: true },
  label: { type: String, required: true },
  suspended: { type: Boolean, default: false },
})
const frame = ref(null)
const video = ref(null)
const activated = ref(false)
const visible = ref(false)
const hidden = ref(document.hidden)
const reducedMotion = ref(false)
const userPlayback = ref(null)
const playing = ref(false)
const failed = ref(false)
const wantsPlayback = computed(() => visible.value && !hidden.value && !props.suspended && (userPlayback.value ?? !reducedMotion.value))
let observer
let motionPreference

async function syncPlayback() {
  if (!video.value) return
  if (!wantsPlayback.value) { video.value.pause(); return }
  try { await video.value.play() } catch { playing.value = false }
  if (!wantsPlayback.value) video.value?.pause()
}
function togglePlayback() { userPlayback.value = !playing.value; syncPlayback() }
function updateVisibility() { hidden.value = document.hidden }
function updateMotion() { reducedMotion.value = motionPreference.matches; userPlayback.value = null }
watch(wantsPlayback, syncPlayback)
onMounted(() => {
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotion()
  motionPreference.addEventListener('change', updateMotion)
  document.addEventListener('visibilitychange', updateVisibility)
  observer = new IntersectionObserver(([entry]) => {
    visible.value = entry.isIntersecting
    if (entry.isIntersecting) activated.value = true
  }, { threshold: 0.1 })
  observer.observe(frame.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  motionPreference?.removeEventListener('change', updateMotion)
  document.removeEventListener('visibilitychange', updateVisibility)
  video.value?.pause()
})
</script>

<template>
  <div ref="frame" class="motion-video">
    <img :src="poster" :alt="label" loading="lazy" />
    <video v-if="activated && !failed" ref="video" :src="src" :poster="poster" :aria-label="label" muted loop playsinline preload="metadata" @canplay="syncPlayback" @playing="playing = true" @pause="playing = false" @error="failed = true"></video>
    <button v-if="!failed" class="motion-control" type="button" :aria-label="`${playing ? 'Pause' : 'Play'} preview: ${label}`" @click="togglePlayback"><span aria-hidden="true">{{ playing ? 'Ⅱ' : '▶' }}</span> {{ playing ? 'Pause' : 'Play' }}</button>
    <span v-else class="motion-control motion-unavailable">Still from the dance floor</span>
  </div>
</template>

<style scoped>
.motion-video { position: relative; overflow: hidden; width: 100%; background: var(--burgundy); isolation: isolate; }
.motion-video > img, .motion-video > video { width: 100%; height: 100%; object-fit: cover; object-position: 50% 40%; }
.motion-video > video { position: absolute; inset: 0; }
.motion-control { position: absolute; bottom: 12px; left: 12px; z-index: 2; display: inline-flex; align-items: center; gap: 7px; padding: 9px 13px; border: 1px solid #ffffff66; border-radius: 99px; background: #09238cd9; color: var(--butter); font-size: .65rem; font-weight: 700; letter-spacing: .03em; backdrop-filter: blur(8px); }
.motion-control:focus-visible { outline-color: white; }
.motion-unavailable { font-size: .6rem; }
</style>
