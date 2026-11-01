<script setup>
import { merchandise } from '../content.js'
import { ShoppingCart } from '@lucide/vue'
import BrandSpark from '../components/BrandSpark.vue'
import FollowBanner from '../components/FollowBanner.vue'
const groups = [
  { id: 't-shirts', name: 'T-shirts' },
  { id: 'tote-bags', name: 'Tote bags' },
].map(group => ({ ...group, products: merchandise.filter(product => product.category === group.id) }))
</script>

<template>
  <section class="page-hero pink">
    <p class="eyebrow">A LITTLE OF THE COLLECTIVE</p>
    <h1>Merchandise</h1>
    <p>T-shirts and tote bags from Learn Bhangra.</p>
    <span class="page-hero-doodle" aria-hidden="true"><BrandSpark /></span>
  </section>
  <section class="section-pad merchandise-list" aria-label="Merchandise catalogue">
    <div v-for="group in groups" :key="group.id" class="merchandise-group">
      <h2>{{ group.name }}</h2>
      <div class="merchandise-grid">
        <article v-for="product in group.products" :key="product.id" class="merchandise-product" :aria-labelledby="`merchandise-${product.id}`">
          <img :src="product.image" :alt="product.alt" :width="product.width" :height="product.height" loading="lazy" decoding="async" />
          <div class="merchandise-details">
            <p class="eyebrow">Design preview</p>
            <h3 :id="`merchandise-${product.id}`">{{ product.name }}</h3>
            <p>{{ product.description }}</p>
            <p class="merchandise-price">${{ product.price.toFixed(2) }} AUD</p>
            <button type="button" class="merchandise-cart" :aria-label="`Add to cart: ${product.name}`"><ShoppingCart :size="18" aria-hidden="true" />Add to cart</button>
          </div>
        </article>
      </div>
    </div>
  </section>
  <FollowBanner />
</template>

<style scoped>
.merchandise-group + .merchandise-group { margin-top: var(--space-2xl); }
.merchandise-group > h2 { font-size: 1.75rem; margin: 0 0 var(--space-lg); }
.merchandise-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-lg); }
.merchandise-product { min-width: 0; display: flex; flex-direction: column; }
.merchandise-product > img { display: block; width: 100%; height: auto; object-fit: contain; border-radius: 6px; }
.merchandise-details { padding-top: var(--space-md); display: flex; flex-direction: column; flex: 1; }
.merchandise-details .eyebrow { margin-bottom: var(--space-sm); }
.merchandise-details h3 { font-size: 1.2rem; line-height: 1.3; margin: 0 0 var(--space-sm); }
.merchandise-details > p { margin: 0; font-size: .9rem; }
.merchandise-details .merchandise-price { margin-top: auto; padding-top: var(--space-md); font-size: 1.1rem; font-weight: 600; }
.merchandise-cart { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 44px; margin-top: var(--space-sm); padding: 10px 12px; border: 0; border-radius: 6px; background: #191919; color: #fff; font: inherit; font-size: .9rem; cursor: pointer; }
.merchandise-cart:hover { background: #333; }
.merchandise-cart:active { background: #080808; }
.merchandise-cart:focus-visible { outline: 2px solid #1537e8; outline-offset: 3px; }
@media (max-width: 1000px) {
  .merchandise-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 600px) {
  .merchandise-grid { gap: var(--space-lg) var(--space-md); }
  .merchandise-details h3 { font-size: 1rem; }
  .merchandise-details > p:not(.merchandise-price) { font-size: .85rem; }
}
</style>