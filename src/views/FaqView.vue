<script setup>
import FaqList from '../components/FaqList.vue'
import ArrowIcon from '../components/ArrowIcon.vue'
import FollowBanner from '../components/FollowBanner.vue'
</script>
<template><section class="page-hero lilac"><p class="eyebrow">NO QUESTION TOO SMALL</p><h1>A little clarity.<br /><em>A lot less nerves.</em></h1><p>Before you hit the floor, here are a few things worth knowing.</p></section><section class="faq-page section-pad"><FaqList /><div class="faq-contact"><h2>Still wondering <em>something?</em></h2><p>Ask about a workshop, share an access need, or simply say hello.</p><RouterLink to="/getintouch" class="button button-dark">Let’s talk <ArrowIcon /></RouterLink></div></section><FollowBanner /></template>
