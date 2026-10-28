<script setup>
import { faqs } from '../content.js'
defineProps({ limit: { type: Number, default: 0 } })
</script>
<template>
  <div class="faq-list"><details v-for="(faq, index) in (limit ? faqs.slice(0, limit) : faqs)" :key="faq.question"><summary><span class="faq-number">0{{ index + 1 }}</span><span>{{ faq.question }}</span><span class="faq-plus" aria-hidden="true">+</span></summary><div class="faq-answer"><p>{{ faq.answer }}</p></div></details></div>
</template>
