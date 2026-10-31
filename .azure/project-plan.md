# Project Plan

**Status**: Planning
**Created**: 2026-10-28
**Mode**: NEW

---

## 1. Project Overview

**Goal**: Create an original, polished, responsive Learn Bhangra Melbourne website mockup with four pages, energetic community-focused editorial design, and external booking links. Use JavaScript, Vue 3, Vue Router, and Vite only; no backend, database, Azure infrastructure, deployment, or automated test cases. Use the existing reference only for broad visual direction, never its content, code, assets, or distinctive compositions.

**App Type**: Frontend-only SPA

**API Login**: No

**Mode**: NEW

**Deployment Plan**: No deployment requested; local frontend mockup only.

Confirmed requirements govern implementation. Existing starter dependencies include Vue, Vue Router, Vite, and lucide-vue-next. Preserve the root application layout. Use original illustrated placeholders and a typographic wordmark; do not download or reuse third-party media without permission. Do not invent testimonials, prices, instructors, timetables, venues, or organisational claims.

---

## 2. Learn Bhangra Melbourne — Frontend

| Component | Technology |
|-----------|------------|
| **Language** | JavaScript |
| **Runtime** | Node.js; browser for the delivered SPA |
| **Framework** | Vue 3 + Vite |
| **Routing** | Vue Router |
| **Package Manager** | npm |
| **Icons** | lucide-vue-next |
| **Test Runner** | None — explicitly excluded |
| **Mocking Library** | None |
| **Test Command** | None — no test cases or test tooling |
| **Build Command** | npm run build |
| **Validation** | Production build and manual route, keyboard, interaction, and responsive checks |

One Essential frontend service, ID `bhangra`, rooted at `.`. All copy, FAQs, link definitions, and original artwork are bundled locally. External booking providers are Enhancement services: unavailable links must not prevent browsing the website. No API client, data-fetching layer, analytics, contact submission endpoint, credentials, container orchestration, or emulator is required.

---

## 3. Services Required

| Azure Service | Role in App | Environment Variable | Default Value (Local) | Classification |
|---------------|-------------|----------------------|-----------------------|----------------|
| None | Frontend-only local mockup; no Azure resources requested | — | — | — |

**Data Stores**: No datastore required. Bundled static illustrations are application assets, not managed file storage.

Known external destinations from the confirmed requirements:

- Link hub: https://linktr.ee/learnbhangramelbourne
- Instagram: https://www.instagram.com/learnbhangra_melbourne/
- Intermediate Bhangra Workshop booking destination: https://events.humanitix.com/intermediate-bhangra-workshop-npujzkyw/tickets?dateId=6ada12fac8b735aaa5a7e335
- Desi Cardio destination: https://events.humanitix.com/desi-cardio

Event dates, availability, prices, skill requirements, and venue details have not been freshly verified in this planning turn. Do not present the previously observed 31 October date as a current event. Display “Check organiser listing for current details” beside workshop links. Recheck before publishing any time-sensitive claim. External navigation must use descriptive labels; new-tab links include `rel="noopener noreferrer"`.

---

## 4. Prerequisites

### Run

| Tool | Service(s) | Installed | Version |
|------|------------|-----------|---------|
| Node.js | bhangra | ✅ | v20.18.1 |
| npm | bhangra | ✅ | 10.8.2 |

Versions were detected in the available execution environment. Confirm the same tools resolve in the project's VS Code terminal. Select a Vite version compatible with the actual runtime; do not silently upgrade to a Vite release requiring a newer Node version.

### Debug

| Tool | Service(s) | Installed | Version |
|------|------------|-----------|---------|
| Chrome | bhangra | ✅ | 156.0.8078.48 |

Chrome was detected by its macOS app bundle. Browser developer tools and VS Code's built-in JavaScript debugger suffice. No Azure extensions, Docker, Compose, or emulators are needed. Double-check any tools later marked ❓ before proceeding. No debug configuration is created during planning.

---

## 5. Design System & UI

**Component Library**: User override — Vue 3 semantic components with custom CSS, plus lucide-vue-next icons; no additional UI library. This preserves the confirmed Vue + Vite-only stack rather than introducing Vuetify.

**Style Direction**: A bright, original dance-community editorial site: oversized ink headlines, saffron highlights, berry calls to action, cream surfaces, asymmetric section rhythm, generous spacing, and sculptural original illustrations. Avoid imitating the reference's distinctive compositions. Illustrations communicate movement, not portraits of real instructors or evidence of real events.

**Typography**: System-ui and Arial Black fallback for bold editorial headings; system-ui body text. No remote fonts or unlicensed font assets.

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#982449` | Berry booking buttons, active navigation, and community section accents |
| `accent` | `#F5AD32` | Saffron movement motifs and highlighted headline panels, paired with dark ink |
| `surface` | `#FFF8EB` | Warm cream page backgrounds and spacious story sections |
| `text` | `#211A24` | Dark ink headlines, navigation, and body copy |
| `muted` | `#6D5D65` | Supporting captions and explicit event-verification notes |
| `border` | `#DDCBBB` | Card outlines, FAQ dividers, and illustration frames |

Use cream/white text on berry, ink text on saffron, and visible focus rings. Verify WCAG AA contrast in implementation. Avoid text over busy artwork. Respect reduced motion; use no essential animation. At narrow widths, stack editorial columns and provide a keyboard-accessible mobile menu with accurate expanded state. Use semantic landmarks, one h1 per page, a skip link, descriptive links, native buttons, visible focus, and accessible accordion controls.

### Pages

| Page | Route | Purpose | Layout |
|------|-------|---------|--------|
| Home | `/` | Introduce the Melbourne Bhangra mockup and guide visitors to workshops | `header, nav, hero, two-column(main+main), card-list, actions, footer` |
| Classes & Workshops | `/classes` | Present known organiser listing names without unverified scheduling claims | `header, nav, hero, card-list, two-column(main+actions), footer` |
| About | `/about` | Explain Bhangra and the site's community-focused direction without invented biography | `header, nav, two-column(hero+main), grid, actions, footer` |
| Contact & FAQ | `/contact` | Offer confirmed external contact channels and practical booking guidance | `header, nav, hero, two-column(actions+list), footer` |

All pages share the original typographic wordmark, navigation, footer, illustration language, and contact destinations. Vue Router handles route navigation, a catch-all not-found state, route-specific titles, scroll reset, and accessible focus placement. No fabricated contact email or phone number; no form that pretends to submit.

### Sample Content

Home — editorial sections:

| Section | Heading | Supporting Copy | Action |
|---------|---------|-----------------|--------|
| Hero | Move to the beat. Make it Bhangra. | Explore Bhangra workshops in Melbourne and find your next step through the organiser's links. | Explore workshops → `/classes` |
| Introduction | Rhythm. Movement. Connection. | Bhangra is a Punjabi dance tradition celebrated through expressive movement and rhythm. | Discover Bhangra → `/about` |
| Workshop highlight | Find your next workshop | Browse organiser listings for current dates, availability, and booking details. | Open organiser links → Link hub |
| Social invitation | Keep the rhythm going | Follow the organiser on Instagram for updates. | Visit Instagram |

Classes & Workshops — listing cards:

| Listing | Description | Verification Note | Action |
|---------|-------------|-------------------|--------|
| Intermediate Bhangra Workshop | A workshop listing linked by the organiser | Check organiser listing for current dates, level guidance, venue, and availability | View workshop listing → confirmed Humanitix URL |
| Desi Cardio Melbourne | Bhangra x Garba listing linked by the organiser | Check organiser listing for current details; no date or price asserted | View Desi Cardio listing → confirmed Humanitix URL |
| More ways to move | Find the organiser's latest published links | No additional timetable has been verified | Explore organiser links → Link hub |

About — explanatory panels:

| Panel | Heading | Content |
|-------|---------|---------|
| Dance | Rooted in Punjab | Bhangra is associated with Punjabi culture and energetic dance movement. |
| Movement | Follow the rhythm | Explore expressive movement and musical rhythm without promises about class structure or suitability. |
| Melbourne | Find local workshops | Use Learn Bhangra Melbourne's published channels to check workshop details. |
| Media | An original visual direction | Original illustrative artwork and a text wordmark are used for this mockup; no real instructor portraits or third-party photography. |

Contact & FAQ — channels and questions:

| Entry | Display Copy | Destination or Behaviour |
|-------|--------------|--------------------------|
| Instagram | Ask the organiser through Instagram | Confirmed Instagram profile; do not imply messaging is guaranteed |
| Latest links | Find current booking and event links | Confirmed Link hub |
| Booking FAQ | How do I book? | Follow an organiser booking link; bookings are handled externally |
| Details FAQ | Where can I check dates and locations? | Refer to the organiser listing; no unverified timetable shown |
| Suitability FAQ | Which workshop is right for me? | Check the listing's level guidance or ask the organiser |
| Preparation FAQ | What should I bring? | Refer to organiser guidance; do not invent equipment or clothing requirements |

The above copy is original draft mockup content, not quoted organiser copy. It requires client review before publication. Do not introduce testimonials, membership counts, instructor biographies, schedules, pricing, or contact details not provided by the user.

State treatment: populated content is the default because this site has no asynchronous data. In the visual preview only, depict a clearly labelled optional media-loading skeleton on Home, “No additional timetable supplied” on Classes, and “Live booking availability is not shown here; check the organiser listing” as an inline unavailable-status notice on Contact. Never simulate failed backend calls, infinite loading, made-up event availability, or disabled external links in the finished SPA. About remains populated. Original decorative artwork uses appropriate empty alt text; informative artwork needs descriptive alternatives.

---

## 6. Project Structure

```text
Bhangra/
├── .azure/
│   ├── requirements.json
│   ├── project-plan.md
│   └── .preview-temp/
│       ├── theme.css
│       ├── manifest.json
│       ├── home.html
│       ├── classes-workshops.html
│       ├── about.html
│       └── contact-faq.html
├── package.json
├── package-lock.json
├── index.html
├── vite.config.js
├── public/
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── router/index.js
│   ├── components/
│   │   ├── SiteHeader.vue
│   │   ├── SiteFooter.vue
│   │   ├── WorkshopCard.vue
│   │   ├── MovementIllustration.vue
│   │   └── FaqAccordion.vue
│   ├── pages/
│   │   ├── HomePage.vue
│   │   ├── ClassesPage.vue
│   │   ├── AboutPage.vue
│   │   ├── ContactPage.vue
│   │   └── NotFoundPage.vue
│   ├── content/site.js
│   └── styles/main.css
└── README.md
```

This is the proposed scaffold, not files to create before approval. Keep all application files at the existing root. No backend, database, seed data, test directory, infrastructure, deployment configuration, Docker files, or secrets. Store original illustrations locally or compose them as original inline SVG in Vue components. Preview artifacts remain planning-only visual specifications.

---

## 7. Route Definitions

| # | Method | Path | Description | Request Body | Response Body | Status Codes |
|---|--------|------|-------------|--------------|---------------|--------------|
| 1 | Client navigation | `/` | Home page | — | Vue page | — |
| 2 | Client navigation | `/classes` | Classes & Workshops page | — | Vue page | — |
| 3 | Client navigation | `/about` | About page | — | Vue page | — |
| 4 | Client navigation | `/contact` | Contact & FAQ page | — | Vue page | — |
| 5 | Client navigation | Unmatched path | Accessible not-found page with Home link | — | Vue page | — |

These are browser routes, not HTTP API endpoints. No `/api/health` or fabricated API routes. Verify direct route loads and refreshes under the Vite development/preview server after approval. External bookings and social navigation leave the SPA; there is no reservation, payment, or contact-processing feature.

---

## 8. Next Steps

1. Open the embedded plan webview and generate the four page-specific static previews after it opens. Keep plan status Planning until explicit user approval.
2. Await approval; do not create application code or start a server during planning.
3. After approval, hand off to azure-project-scaffold to implement only this frontend and reproduce the approved visual direction.
4. Validate with `npm run build` and manual checks across all routes at approximately 375 px, 768 px, and 1440 px, including menu, FAQ, keyboard focus, reduced motion, overflow, direct-route refresh, and external link behaviour. Do not add test cases or test dependencies.
5. Document local run/build instructions and the mockup's unverified-content limitations. Backend integration, Azure provisioning, IaC, and deployment are outside scope.
