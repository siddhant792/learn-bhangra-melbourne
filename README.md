# Learn Bhangra

Vue/Vite website hosted on the existing Vercel project. Supabase PostgreSQL and Edge Functions handle bookings, Stripe Checkout, webhooks, and scheduled maintenance. Vercel has no booking API or server functions. Visitors can select multiple tickets without an account; payment credentials and canonical prices stay in Supabase.

## Run locally

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

These commands run only the frontend. There is no local payment simulator, Express server, SQLite runtime, or API proxy. Booking tests use the hosted Supabase Edge Function; use an HTTPS Vercel Preview for the full payment flow.

## Stripe ticketing setup

### Deploy to the linked Supabase project

Project: `gqogroabhqnxtmvgnqnh`. Run these in the authenticated terminal; enter any database password directly there, never in chat:

```bash
supabase db push
supabase functions deploy bookings-test --use-api --project-ref gqogroabhqnxtmvgnqnh
supabase functions deploy bookings --use-api --project-ref gqogroabhqnxtmvgnqnh
```

The migrations create private, RLS-enabled booking tables and server-only transaction functions. They also create two paused Supabase Cron jobs, running every two minutes when enabled. The scheduler credential is generated in Supabase Vault; it is never stored in frontend code. No Auth settings from the CLI-generated configuration are pushed by these database migrations.

In Supabase Dashboard > Edge Functions > Secrets, set `APP_TEST_ORIGIN` to the exact stable Vercel Preview origin, `STRIPE_TEST_SECRET_KEY` to the Stripe sandbox secret key, and `STRIPE_TEST_WEBHOOK_SECRET` to the signing secret for this endpoint:

`https://gqogroabhqnxtmvgnqnh.supabase.co/functions/v1/bookings-test/stripe/webhook`

Subscribe to `checkout.session.completed`, `checkout.session.expired`, and `checkout.session.async_payment_succeeded`. No local Stripe CLI forwarding is needed. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically. All custom backend setting names are in [supabase/functions/.env.example](supabase/functions/.env.example); do not put those secrets in Vercel or any `VITE_*` variable.

On the existing Vercel project's Preview environment, set `VITE_SUPABASE_URL=https://gqogroabhqnxtmvgnqnh.supabase.co` and `VITE_BOOKING_FUNCTION=bookings-test`, then redeploy a Preview. These two values are public and are also listed in [.env.example](.env.example). CORS and checkout enforce the configured website origin. Stripe calls Supabase directly, so Vercel Preview deployment protection does not block the webhook.

Update [supabase/functions/_shared/workshops.json](supabase/functions/_shared/workshops.json) with confirmed future dates, AUD-cent prices and actual direct-sale capacities, then redeploy both functions. Null capacity or price blocks sales; there are deliberately no invented live defaults. Test with Stripe's `4242 4242 4242 4242` card, a future expiry and any CVC. Test-mode tickets carry a `TEST-` prefix and are not valid for admission; no ticket emails are sent in test mode.

Enable `bhangra-test-maintenance` in Supabase Dashboard > Cron after test credentials are configured. Webhooks and confirmation lookups confirm payment immediately; Cron recovers interrupted checkout requests and retries unsent live emails. Jobs start paused, and neither function enables live sales merely by being deployed.

### Go live separately

Set `APP_LIVE_ORIGIN`, `STRIPE_LIVE_SECRET_KEY`, and `STRIPE_LIVE_WEBHOOK_SECRET` in Supabase. Register the live webhook at `/functions/v1/bookings/stripe/webhook`. Change only the production Vercel setting to `VITE_BOOKING_FUNCTION=bookings` when approved, and enable `bhangra-live-maintenance`. Test and live orders, counters, rate limits and worker leases are separated by mode inside the same database; sandbox bookings cannot consume live seats.

The owner updates public workshop descriptions and media in [src/content.js](src/content.js). An owner dashboard, discounts, check-in scanner, newsletter sending and automatic refunds are not implemented. Refunds remain an organiser-managed Stripe operation; ticket codes and inventory must be reviewed before resale.

### How payment and payouts work

- Visitors choose a session and a whole-number quantity up to the available capacity. The server creates a Stripe Checkout session using its own price, not a price supplied by the browser.
- The card form is hosted securely by Stripe. These are Learn Bhangra's direct ticket sales, not Humanitix sales; Shopify is not needed. The app never receives or stores card numbers.
- Stripe credits payments to the owner's Stripe balance and pays out to the connected bank account according to the account's configured payout schedule and eligibility. Settlement times and fees are set by Stripe, not hard-coded by this site.
- Checkout requests are idempotent. PostgreSQL locks and reserves seats before Stripe checkout opens; a 35-minute hold is released only when Stripe confirms expiration. Sales close 35 minutes before a session starts. Database-backed limits allow 20 public booking API requests per minute per forwarded IP and payment mode; the IP is hashed before storage. These limits are not a substitute for platform abuse protection.
- Signed webhooks, or a server-side lookup of the returned Stripe session, confirm payment before unique ticket codes are issued. Repeated notifications do not issue extra tickets. The confirmation page supports printing and can be revisited with its private session link; do not share that link publicly.
- Enable successful-payment receipts in the Stripe Dashboard. For automatic ticket emails, set `RESEND_API_KEY` and `FROM_EMAIL` from a verified email domain. The server retries unsent tickets and uses an email idempotency key. Without an email provider, confirmed tickets are still available on the confirmation page, but no ticket email is claimed to have been sent.

### Inventory and deployment requirements

`capacity` is the number of places allocated to direct website sales. Subtract any already-sold Humanitix tickets and stop external sales or allocate separate inventory; there is no Humanitix inventory synchronisation. Do not change or reuse a ticket ID after taking bookings.

Supabase provides the shared durable database; no application disk or Node process is required. Keep service-role access private, configure backups and retention for your plan, and protect emails and ticket codes. Edge Functions preserve the raw webhook body and verify it using Stripe's Web Crypto-compatible verifier. Cron credentials in Vault and privileged network queues must remain restricted to trusted database administrators. Publish approved privacy, cancellation and refund terms before real sales. No real funds were processed during implementation testing.

### Verification

```bash
npm test
npm run check:edge
npm run build
```

Tests execute the booking migration in PGlite PostgreSQL and cover inventory, mode isolation, retry idempotency, paid-ticket issuance, expiry, private permissions, rate limits, raw signatures, CORS and maintenance authorization. Deno checks the actual deployable function entry points. PGlite tests do not prove multi-connection locking on the hosted database. A full hosted Stripe test purchase still requires deployed migrations/functions, Stripe sandbox credentials, a configured Preview origin and saleable ticket configuration.

## Content and media

[src/content.js](src/content.js) holds public workshop descriptions, original source links, FAQs and media configuration. The booking server supplies saleable sessions and availability. Event posters remain attributed to their public listings and are never presented as videos. The homepage's primary action opens the Workshops page so visitors can choose an event; each workshop's Get tickets action opens its ticket picker. The secondary homepage action opens the story page.

`/past-workshops` presents tiles with separate Video and Photos actions and two search modes: **By date** (calendar picker) and **By choreography** (title, choreography, song, or artist). Search state is kept in the URL; only the active mode filters the tiles. Set `dateISO` to the confirmed workshop date in `YYYY-MM-DD` format for date filtering and automatic display. An optional `date` can provide a custom display label. No dates are inferred from Instagram upload dates. For richer entries, add `choreography`, `song`, `artist`, and `photos: [{ src: '/media/photo.jpg', alt: 'Description', caption: 'Caption' }]` to a `media.reels` entry. Existing poster frames are explicitly captioned as video stills, not invented photo albums. Unknown dates and songs remain omitted. `/media` retains the earlier full video gallery.

The cobalt-blue homepage uses a full-width background media stage with overlaid text. Add an approved MP4/WebM/MOV/M4V to `public/videos/` (the first filename alphabetically is selected), or set `media.heroVideo` to an explicit local or remote video URL. The background plays muted, loops, and stays inline on phones; a visible pause/play button is provided. It pauses offscreen, for reduced-motion preferences and while the tab is hidden. Hero and ambient previews share Safari-compatible playback handling: explicit muted/default-muted/inline DOM properties, visibility-aware autoplay, readiness retries and resume checks after scrolling, tab return or back/forward restoration. If autoplay is denied, the next click/tap or key press retries eligible visible clips without overriding a manual pause. iOS Low Power Mode and browser autoplay settings can still require pressing Play; the site cannot override those policies. Missing or failed footage shows a blue illustration fallback and an honest pending-footage note, not a pretend video. Set `media.heroPoster` to an approved landscape still for the best loading experience.

The hero is a silent 17-second edit of three client workshop reels, with short crossfades and separate landscape (`/videos/hero-desktop.mp4`) and portrait (`/videos/hero-mobile.mp4`) exports. Phones up to 600px wide use the portrait edit to preserve full-body movement; desktop uses a dancer-focused crop. Matching real stills load before playback. The gallery contains four 24-second workshop excerpts with audio plus the previously supplied community reel. Original user downloads are left untouched. `media.heroVideoMobile` and `media.heroPosterMobile` override desktop media on phones; `media.reels` configures gallery clips.

Workshop footage was downloaded through VideoDropper's public form API from URLs extracted locally from the supplied Instagram page, not from logged-in credentials. Hero sources:
- https://www.instagram.com/learnbhangra_melbourne/reel/DeogT3WJvmm/
- https://www.instagram.com/learnbhangra_melbourne/reel/DeodtqOpGIN/
- https://www.instagram.com/learnbhangra_melbourne/reel/DeoeisHphfX/

Below the hero, two different studio reels replace still-image placeholders: a portrait arched paper frame in the introduction and a separately cropped 4:3 landscape edit in a taped, cobalt-shadow feature frame. They do not reuse the hero's workshop sources. `media.intro` and `media.feature` select these clips. Gallery previews form a mixed-aspect-ratio film-frame masonry layout. Muted inline loops load when scrolled into view, pause offscreen or when the tab is hidden, honour reduced-motion preferences, and provide per-clip play/pause controls. Opening a full gallery video pauses its background previews; full videos retain audio controls. Posters remain loading/error fallbacks, while event posters remain static artwork.

Additional studio sources:
- https://www.instagram.com/learnbhangra_melbourne/reel/DeCgwl3pX3N/
- https://www.instagram.com/learnbhangra_melbourne/reel/DeUWBF2Jt7r/

The gallery accepts additional approved uploads via `media.reels`:

```javascript
media.reels = [
  { src: '/videos/approved-clip.mp4', poster: '/art/dance-party.svg', title: 'Our community in motion' },
]
```

Place video files under `public/videos/` before configuring them. Obtain permission from creators and people featured. With no clips supplied, the gallery shows explicitly labelled original illustrations and the status “Concept preview · dance videos coming soon”; there are no fake play buttons. Native accessible video dialogs support Escape, focus return and pause on close.

## Interactions and routes

- Responsive navigation, keyboard focus, skip link and reduced-motion support.
- Brand sparks use inline SVG with inherited theme colours, avoiding iPhone emoji substitution. The header uses a compact two-line Learn Bhangra wordmark without a city badge. Visible branding, headlines, page titles and contact drafts use Learn Bhangra; official Instagram, Linktree and booking URLs remain unchanged.
- Workshop filters encoded in the URL; two-question finder; expandable event details; direct quantity-based checkout and printable paid tickets.
- Native keyboard-accessible FAQ accordions.
- Contact form validates locally and produces a copyable draft for Instagram. It never submits or claims a message was sent; no draft is persisted.
- Editorial story, collective, culture, gallery and transparent concept legal pages. `/home` and `/about-1` preserve legacy aliases. The historical `/meet-the-founder` path intentionally presents the collective without inventing a founder.

## Sources and limits

Public Learn Bhangra Instagram and Linktree are the contact/source destinations configured in `src/content.js`; workshop artwork and facts come from linked public event listings. The original community reel was supplied locally by the user; additional public workshop reels were downloaded during asset preparation through the requested VideoDropper service. No account credentials were used, and the website itself does not contact a downloader. The broad community/editorial aesthetic was inspired by the supplied reference, but layout, copy and concept illustrations are original. Team biographies and final approved legal policies remain intentionally unfilled. Google Fonts are requested in CSS and have system fallbacks; remove that import or bundle licensed local fonts if external requests are undesirable.

The contact form is still draft-only and the explanatory legal pages are not final policies. Real sales require the owner's Stripe account, deployed Supabase backend, confirmed ticket configuration, email setup if wanted, and approved policies.
