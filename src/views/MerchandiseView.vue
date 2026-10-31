<script setup>
import { merchandise } from '../content.js'
import BrandSpark from '../components/BrandSpark.vue'
import FollowBanner from '../components/FollowBanner.vue'
</script>

<template>
  <section class="page-hero pink">
    <p class="eyebrow">A LITTLE OF THE COLLECTIVE</p>
    <h1>Merchandise</h1>
    <p>T-shirts and tote bags from Learn Bhangra.</p>
    <span class="page-hero-doodle" aria-hidden="true"><BrandSpark /></span>
  </section>
  <section class="section-pad merchandise-list" aria-label="Merchandise catalogue">
    <div class="merchandise-grid">
      <article v-for="product in merchandise" :key="product.id" class="merchandise-product" :aria-labelledby="`merchandise-${product.id}`">
        <img :src="product.image" :alt="product.alt" width="1000" height="1000" />
        <div class="merchandise-details">
          <p class="eyebrow">Design preview</p>
          <h2 :id="`merchandise-${product.id}`">{{ product.name }}</h2>
          <p>{{ product.description }}</p>
        </div>
      </article>
    </div>
  </section>
  <FollowBanner />
</template>

<style scoped>
.merchandise-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-xl); }
.merchandise-product { min-width: 0; }
.merchandise-product > img { display: block; width: 100%; height: auto; aspect-ratio: 1; object-fit: contain; border-radius: 6px; }
.merchandise-details { padding-top: var(--space-lg); }
.merchandise-details .eyebrow { margin-bottom: var(--space-sm); }
.merchandise-details h2 { font-size: 1.75rem; line-height: 1.2; margin: 0 0 var(--space-sm); }
.merchandise-details > p:last-child { margin: 0; }
@media (max-width: 600px) {
  .merchandise-grid { grid-template-columns: minmax(0, 1fr); gap: var(--space-2xl); }
  .merchandise-details h2 { font-size: 1.5rem; }
}
</style>