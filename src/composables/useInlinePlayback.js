import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export function useInlinePlayback(video, visible, suspended = ref(false)) {
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  const reducedMotion = ref(motionPreference.matches)
  const hidden = ref(document.hidden)
  const userPlayback = ref(null)
  const playing = ref(false)
  const blocked = ref(false)
  const wantsPlayback = computed(() => visible.value && !hidden.value && !suspended.value && (userPlayback.value ?? !reducedMotion.value))

  async function syncPlayback() {
    const player = video.value
    if (!player) return
    // Set DOM properties before play(): Safari checks these, not just markup.
    player.muted = true
    player.defaultMuted = true
    player.playsInline = true
    player.autoplay = wantsPlayback.value
    if (!wantsPlayback.value) { player.pause(); return }
    try {
      await player.play()
      if (player === video.value) blocked.value = false
    } catch (error) {
      if (player === video.value && error.name === 'NotAllowedError') blocked.value = true
    }
    if (player !== video.value || !wantsPlayback.value) player.pause()
  }

  function togglePlayback() { userPlayback.value = !playing.value; syncPlayback() }
  function updateVisibility() { hidden.value = document.hidden; syncPlayback() }
  function updateMotion() { reducedMotion.value = motionPreference.matches; userPlayback.value = null; syncPlayback() }
  function retryBlockedPlayback() { if (blocked.value && wantsPlayback.value) syncPlayback() }

  watch([video, wantsPlayback], syncPlayback, { flush: 'post' })
  onMounted(() => {
    motionPreference.addEventListener('change', updateMotion)
    document.addEventListener('visibilitychange', updateVisibility)
    window.addEventListener('pageshow', updateVisibility)
    document.addEventListener('click', retryBlockedPlayback)
    document.addEventListener('keydown', retryBlockedPlayback)
    syncPlayback()
  })
  onBeforeUnmount(() => {
    motionPreference.removeEventListener('change', updateMotion)
    document.removeEventListener('visibilitychange', updateVisibility)
    window.removeEventListener('pageshow', updateVisibility)
    document.removeEventListener('click', retryBlockedPlayback)
    document.removeEventListener('keydown', retryBlockedPlayback)
    video.value?.pause()
  })

  return { playing, wantsPlayback, syncPlayback, togglePlayback }
}
