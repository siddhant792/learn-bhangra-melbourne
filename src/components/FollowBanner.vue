<script setup>
import { links } from '../content.js'
import ArrowIcon from './ArrowIcon.vue'
import StarDoodle from './StarDoodle.vue'
</script>
<template>
  <section class="follow-banner"><div><p class="eyebrow">THE GOOD STUFF, BETWEEN CLASSES</p><h2>Keep the energy <em>going.</em></h2><p>Workshop updates. A little rhythm. A lot of community.<br />Find us on Instagram — that’s where the next beat drops.</p></div><a :href="links.instagram" class="button button-dark" target="_blank" rel="noopener noreferrer">Follow the movement <ArrowIcon /><span class="sr-only"> on Instagram (new tab)</span></a><StarDoodle /></section>
</template>
