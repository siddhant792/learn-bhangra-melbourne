# Learn Bhangra Melbourne

Original, frontend-only Vue/Vite concept: Punjabi roots, Melbourne moves. No backend, payments, analytics, signup service or invented testimonials.

## Run locally

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

Use the URL printed by Vite. JavaScript, Vue 3 and Vue Router are used throughout. For production hosting, rewrite unknown paths to `index.html` so direct visits to history-mode routes work.

## Content and media

`src/content.js` holds verified public workshop listings, official external contact/booking links, FAQs and media configuration. Published events are not a live schedule; check official booking pages for current dates, prices and availability. Event posters remain attributed to their public listings and are never presented as videos.

The cobalt-blue homepage uses a full-width background media stage with overlaid text. Add an approved MP4/WebM/MOV/M4V to `public/videos/` (the first filename alphabetically is selected), or set `media.heroVideo` to an explicit local or remote video URL. The background plays muted, loops, and stays inline on phones; a visible pause/play button is provided. It pauses for reduced-motion preferences and while the tab is hidden. Browser autoplay restrictions leave a manual play option. Missing or failed footage shows a blue illustration fallback and an honest pending-footage note, not a pretend video. Set `media.heroPoster` to an approved landscape still for the best loading experience.

The hero is a silent 17-second edit of three client workshop reels, with short crossfades and separate landscape (`/videos/hero-desktop.mp4`) and portrait (`/videos/hero-mobile.mp4`) exports. Phones up to 600px wide use the portrait edit to preserve full-body movement; desktop uses a dancer-focused crop. Matching real stills load before playback. The gallery contains two 24-second workshop excerpts with audio plus the previously supplied community reel. Original user downloads are left untouched. `media.heroVideoMobile` and `media.heroPosterMobile` override desktop media on phones; `media.reels` configures gallery clips.

Workshop footage was downloaded through VideoDropper's public form API from URLs extracted locally from the supplied Instagram page, not from logged-in credentials. Hero sources:
- https://www.instagram.com/learnbhangra_melbourne/reel/DeogT3WJvmm/
- https://www.instagram.com/learnbhangra_melbourne/reel/DeodtqOpGIN/
- https://www.instagram.com/learnbhangra_melbourne/reel/DeoeisHphfX/

The gallery accepts additional approved uploads via `media.reels`:

```javascript
media.reels = [
  { src: '/videos/approved-clip.mp4', poster: '/art/dance-party.svg', title: 'Our community in motion' },
]
```

Place video files under `public/videos/` before configuring them. Obtain permission from creators and people featured. With no clips supplied, the gallery shows explicitly labelled original illustrations and the status “Concept preview · dance videos coming soon”; there are no fake play buttons. Native accessible video dialogs support Escape, focus return and pause on close.

## Interactions and routes

- Responsive navigation, keyboard focus, skip link and reduced-motion support.
- Workshop filters encoded in the URL; two-question finder; expandable event details and external tickets.
- Native keyboard-accessible FAQ accordions.
- Contact form validates locally and produces a copyable draft for Instagram. It never submits or claims a message was sent; no draft is persisted.
- Editorial story, collective, culture, gallery and transparent concept legal pages. `/home` and `/about-1` preserve legacy aliases. The historical `/meet-the-founder` path intentionally presents the collective without inventing a founder.

## Sources and limits

Public Learn Bhangra Melbourne Instagram and Linktree are the contact/source destinations configured in `src/content.js`; workshop artwork and facts come from linked public event listings. The original community reel was supplied locally by the user; additional public workshop reels were downloaded during asset preparation through the requested VideoDropper service. No account credentials were used, and the website itself does not contact a downloader. The broad community/editorial aesthetic was inspired by the supplied reference, but layout, copy and concept illustrations are original. Team biographies and final approved legal policies remain intentionally unfilled. Google Fonts are requested in CSS and have system fallbacks; remove that import or bundle licensed local fonts if external requests are undesirable.

This is a design preview, not a production legal document or a real booking/contact system. Browser verification and production build should be performed after dependency/content/asset setup is complete.
