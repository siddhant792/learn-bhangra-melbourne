<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { links } from './content.js'
import ArrowIcon from './components/ArrowIcon.vue'
import BrandSpark from './components/BrandSpark.vue'
const route = useRoute()
const menuOpen = ref(false)
const menuButton = ref(null)
const main = ref(null)
const nav = [{ label: 'Home', to: '/' }, { label: 'Our story', to: '/aboutus' }, { label: 'Workshops', to: '/workshops' }, { label: "What’s on", to: '/hgscevents' }, { label: 'FAQs', to: '/frequentlyaskedquestions' }, { label: 'Contact', to: '/getintouch' }]
function closeMenu(restoreFocus = false) { menuOpen.value = false; if (restoreFocus) nextTick(() => menuButton.value?.focus()) }
function escape(event) { if (event.key === 'Escape' && menuOpen.value) closeMenu(true) }
watch(() => route.fullPath, async () => { closeMenu(); await nextTick(); main.value?.focus({ preventScroll: true }) })
onMounted(() => document.addEventListener('keydown', escape))
onBeforeUnmount(() => document.removeEventListener('keydown', escape))
</script>

<template>
  <a href="#main-content" class="skip-link">Skip to content</a>
  <header class="site-header">
    <RouterLink to="/" class="wordmark" aria-label="Learn Bhangra Melbourne home"><span>learn<span class="logo-spark" aria-hidden="true"><BrandSpark /></span><br /><b>bhangra.</b></span><span class="logo-city">MELBOURNE</span></RouterLink>
    <nav class="desktop-nav" aria-label="Main navigation"><RouterLink v-for="item in nav" :key="item.to" :to="item.to" :class="{ 'nav-home': item.to === '/' }">{{ item.label }}</RouterLink></nav>
    <RouterLink to="/workshops" class="button button-dark nav-cta">Let’s dance <ArrowIcon /></RouterLink>
    <button ref="menuButton" class="menu-button" :aria-expanded="menuOpen" aria-controls="mobile-nav" :aria-label="menuOpen ? 'Close navigation' : 'Open navigation'" @click="menuOpen = !menuOpen"><span aria-hidden="true">{{ menuOpen ? '×' : '☰' }}</span></button>
    <nav v-if="menuOpen" id="mobile-nav" class="mobile-nav" aria-label="Mobile navigation"><RouterLink v-for="item in nav" :key="item.to" :to="item.to">{{ item.label }} <ArrowIcon /></RouterLink><RouterLink to="/workshops" class="button button-dark">Find your workshop <ArrowIcon /></RouterLink></nav>
  </header>
  <main id="main-content" ref="main" tabindex="-1"><RouterView /></main>
  <footer class="site-footer">
    <div class="footer-top"><div class="footer-brand"><RouterLink to="/" class="footer-wordmark">learn bhangra<span aria-hidden="true"><BrandSpark /></span></RouterLink><p>Punjabi roots. Melbourne moves.<br />A little courage. A whole lot of joy.</p><a :href="links.instagram" target="_blank" rel="noopener noreferrer" class="social-link">@learnbhangra_melbourne <ArrowIcon /><span class="sr-only"> (Instagram, new tab)</span></a></div><div class="footer-links"><div><h2>COME DANCE</h2><RouterLink to="/workshops">Workshops</RouterLink><RouterLink to="/hgscevents">What’s on</RouterLink><RouterLink to="/frequentlyaskedquestions">FAQs</RouterLink><RouterLink to="/getintouch">Get in touch</RouterLink></div><div><h2>GET TO KNOW US</h2><RouterLink to="/aboutus">Our story</RouterLink><RouterLink to="/meet-the-founder">Meet the collective</RouterLink><RouterLink to="/what-is-bhangra-energy">Community</RouterLink><RouterLink to="/media">Gallery</RouterLink></div></div></div>
    <div class="footer-bottom"><p>© {{ new Date().getFullYear() }} Learn Bhangra Melbourne · Concept preview</p><div><RouterLink to="/privacypolicy">Privacy</RouterLink><RouterLink to="/terms-of-service">Booking terms</RouterLink><RouterLink to="/terms-of-use">Website terms</RouterLink></div><p>Made for <em>moving.</em></p></div>
  </footer>
</template>
