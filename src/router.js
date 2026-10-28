import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import WorkshopsView from './views/WorkshopsView.vue'
import EditorialView from './views/EditorialView.vue'
import GalleryView from './views/GalleryView.vue'
import FaqView from './views/FaqView.vue'
import ContactView from './views/ContactView.vue'
import LegalView from './views/LegalView.vue'

const routes = [
  { path: '/', alias: '/home', component: HomeView, meta: { title: 'Find your people. Feel the beat.' } },
  { path: '/aboutus', alias: '/about-1', component: EditorialView, props: { kind: 'story' }, meta: { title: 'Our story' } },
  { path: '/meet-the-founder', component: EditorialView, props: { kind: 'collective' }, meta: { title: 'Meet the collective' } },
  { path: '/what-is-bhangra-energy', component: EditorialView, props: { kind: 'culture' }, meta: { title: 'Bhangra energy & community' } },
  { path: '/hgscevents', component: WorkshopsView, props: { mode: 'events' }, meta: { title: "What's on" } },
  { path: '/workshops', component: WorkshopsView, props: { mode: 'workshops' }, meta: { title: 'Workshops' } },
  { path: '/media', component: GalleryView, meta: { title: 'The movement gallery' } },
  { path: '/getintouch', component: ContactView, meta: { title: 'Get in touch' } },
  { path: '/frequentlyaskedquestions', component: FaqView, meta: { title: 'Your questions, answered' } },
  { path: '/privacypolicy', component: LegalView, props: { kind: 'privacy' }, meta: { title: 'Privacy preview' } },
  { path: '/terms-of-service', component: LegalView, props: { kind: 'service' }, meta: { title: 'Booking information' } },
  { path: '/terms-of-use', component: LegalView, props: { kind: 'use' }, meta: { title: 'Website terms preview' } },
  { path: '/:pathMatch(.*)*', component: EditorialView, props: { kind: 'missing' }, meta: { title: 'Page not found' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, top: 100, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }
    if (to.path === from.path) return false
    return { top: 0 }
  },
})
router.afterEach((to) => {
  document.title = `${to.meta.title} | Learn Bhangra`
})
export default router
