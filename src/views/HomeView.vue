<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { events, media } from '../content.js'
import HeroBackground from '../components/HeroBackground.vue'
import MotionVideo from '../components/MotionVideo.vue'
import ArrowIcon from '../components/ArrowIcon.vue'
import StarDoodle from '../components/StarDoodle.vue'
import BrandSpark from '../components/BrandSpark.vue'
import EventCard from '../components/EventCard.vue'
import FaqList from '../components/FaqList.vue'
import FollowBanner from '../components/FollowBanner.vue'
import { useTickets } from '../composables/useTickets.js'
const { nextWorkshop, workshops } = useTickets()
const nextLink = '/workshops'
const upcomingEvents = computed(() => workshops.value.length ? events.filter(event => workshops.value.find(item => item.id === event.id)?.tickets.some(ticket => Date.parse(ticket.startsAt) > Date.now())) : events)
const router = useRouter()
const experience = ref('new')
const intention = ref('joy')
function findClass() { router.push({ path: '/workshops', query: { level: experience.value === 'experienced' && intention.value === 'skills' ? 'intermediate' : experience.value === 'new' ? 'first-timers' : 'all' } }) }
</script>

<template>
  <section class="hero hero-immersive">
    <HeroBackground />
    <div class="hero-copy"><p class="eyebrow"><span class="tiny-star" aria-hidden="true"><BrandSpark /></span> PUNJABI ROOTS. JOYFUL MOVES.</p><span class="hero-welcome">Welcome to</span><h1>learn <em>bhangra.</em></h1><p class="hero-intro">Big beats. Good people. A little more you.<br />Find your rhythm, and your people.</p><div class="hero-actions"><RouterLink class="button button-butter hero-ticket-cta" :to="nextLink">{{ nextWorkshop ? 'Get tickets' : 'Find our next workshop' }} <ArrowIcon /></RouterLink><RouterLink class="text-link" to="/aboutus">About Learn Bhangra <ArrowIcon /></RouterLink></div><div class="hero-footnote">{{ nextWorkshop ? `Next workshop: ${nextWorkshop.label}` : 'All heart. No perfect moves required.' }}</div></div>
    <span class="hero-scroll" aria-hidden="true">FEEL THE RHYTHM <span>↓</span></span>
  </section>
  <div class="ticker" aria-label="Good energy. Every body welcome. Feel the dhol. Find your people."><div class="ticker-track" aria-hidden="true"><span v-for="n in 4" :key="n">GOOD ENERGY <span><BrandSpark /></span> EVERY BODY WELCOME <span><BrandSpark /></span> FEEL THE DHOL <span><BrandSpark /></span> FIND YOUR PEOPLE <span><BrandSpark /></span></span></div></div>
  <section class="intro-section section-pad"><div class="intro-collage"><div class="collage-paper"><MotionVideo v-if="media.intro?.src" class="intro-motion" :src="media.intro.src" :poster="media.intro.poster" :label="media.intro.title" /><img v-else src="/media/folk-workshop.jpg" alt="Dancers moving together at a Learn Bhangra workshop" loading="lazy" /><span class="photo-note">a little rhythm goes a long way.</span></div><div class="mini-print"><img src="/art/dhol.svg" alt="" loading="lazy" /><span>FEEL THAT<br /><em>dhol beat.</em></span></div><span class="collage-tape" aria-hidden="true"></span><StarDoodle /></div><div class="intro-copy"><p class="eyebrow">NOT JUST STEPS. A FEELING.</p><h2>Come as you are.<br />Leave a little<br /><em>more you.</em></h2><p>Bhangra is big-hearted, full-body joy. Rooted in Punjabi culture, it brings people together through rhythm, expression and a seriously good beat.</p><p>We’re bringing that feeling to the dance floor. No perfect moves required — just a willingness to give it a go.</p><RouterLink class="text-link" to="/aboutus">A little about us <ArrowIcon /></RouterLink></div></section>
  <section class="workshop-section section-pad"><div class="section-heading"><div><p class="eyebrow">CLEAR A LITTLE SPACE IN YOUR CALENDAR</p><h2>Your next <em>happy hour.</em></h2></div><RouterLink class="text-link" to="/workshops">Explore workshops <ArrowIcon /></RouterLink></div><div class="event-grid"><EventCard v-for="event in upcomingEvents.slice(0, 2)" :key="event.id" :event="event" /></div><p v-if="!upcomingEvents.length" class="source-note">Next workshop date coming soon. Follow Learn Bhangra for the announcement.</p></section>
  <section class="manifesto-section"><p class="eyebrow">THIS IS OUR KIND OF ENERGY</p><h2>Less “am I doing it right?”<br />More <em>“one more song.”</em></h2><div class="manifesto-values"><div><span>01 / THE ROOTS</span><h3>Culture, in motion.</h3><p>Celebrate the Punjabi rhythms and spirit that make Bhangra what it is.</p></div><div><span>02 / THE ROOM</span><h3>Space to be yourself.</h3><p>New to the beat or already in your groove, there’s room for you here.</p></div><div><span>03 / THE FEELING</span><h3>Joy over perfection.</h3><p>Bring your energy. We’ll explore the steps together, one beat at a time.</p></div></div><RouterLink to="/what-is-bhangra-energy" class="button button-butter">Meet the community spirit <ArrowIcon /></RouterLink><StarDoodle class="manifesto-star" /></section>
  <section class="gallery-teaser section-pad"><div class="section-heading"><div><p class="eyebrow">A LITTLE LOOK INSIDE</p><h2>Made of <em>movement.</em></h2></div><RouterLink to="/past-workshops" class="text-link">Past workshops <ArrowIcon /></RouterLink></div><div class="teaser-art"><div class="teaser-frame"><MotionVideo v-if="media.feature?.src" class="feature-motion" :src="media.feature.src" :poster="media.feature.poster" :label="media.feature.title" /><img v-else src="/art/dance-detail.svg" alt="Illustrated study of Bhangra dance, rhythm and vibrant colour" loading="lazy" /><span>THE JOY IS IN THE DOING.</span></div><div class="teaser-copy"><span class="outline-sticker">GOOD VIBES<br /><em>{{ media.reels.length ? 'in motion' : 'in the making' }}</em></span><h3>Real moves.<br />Real people.<br /><em>{{ media.reels.length ? 'Real energy.' : 'Coming soon.' }}</em></h3><p>Revisit the choreography and moments from the dance floor. Videos and photos, together in one place.</p><RouterLink to="/past-workshops" class="text-link">See past workshops <ArrowIcon /></RouterLink></div></div></section>
  <section class="finder-section section-pad"><div><p class="eyebrow">NOT SURE WHERE TO START?</p><h2>Find your<br /><em>first beat.</em></h2><p>Two little questions. A good place to begin.</p></div><form class="finder-form" @submit.prevent="findClass"><fieldset><legend>01. Have you danced Bhangra before?</legend><label><input v-model="experience" type="radio" value="new" name="experience" /> This is my first time</label><label><input v-model="experience" type="radio" value="experienced" name="experience" /> I know a few moves</label></fieldset><fieldset><legend>02. What are you here for?</legend><label><input v-model="intention" type="radio" value="joy" name="intention" /> Good energy & a fun workout</label><label><input v-model="intention" type="radio" value="skills" name="intention" /> Building my dance skills</label></fieldset><button class="button button-dark" type="submit">Find my workshop <ArrowIcon /></button></form></section>
  <section class="home-faq section-pad"><div><p class="eyebrow">BEFORE YOU HIT THE FLOOR</p><h2>A few good <em>questions.</em></h2></div><FaqList :limit="3" /><RouterLink to="/frequentlyaskedquestions" class="text-link">All the answers <ArrowIcon /></RouterLink></section>
  <FollowBanner />
</template>
