import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const catalogue = JSON.parse(readFileSync(new URL('../supabase/functions/_shared/workshops.json', import.meta.url), 'utf8'))
const routes = [
  '/', '/home', '/aboutus', '/about-1', '/meet-the-founder', '/what-is-bhangra-energy',
  '/hgscevents', '/workshops', '/workshops?view=past', '/past-workshops',
  '/past-workshops?choreography=Shades', '/merchandise', '/media', '/getintouch',
  '/frequentlyaskedquestions', '/privacypolicy', '/terms-of-service', '/terms-of-use',
  '/workshops/desi-cardio/tickets', '/workshops/intermediate/tickets',
  '/workshops/unknown/tickets', '/booking/confirmation', '/not-a-real-page',
]
const bookingStates = ['sold-out', 'unconfirmed', 'offline', 'cancelled']
const confirmations = ['paid_1', 'paid_3', 'paid_10', 'live_3', 'pending', 'expired', 'failed', 'error']

function availability(state) {
  const workshops = catalogue.map(workshop => ({ ...workshop, tickets: workshop.tickets.map((ticket, index) => ({
    ...ticket,
    startsAt: new Date(Date.now() + (index + 2) * 86400000).toISOString(),
    capacity: 10,
    remaining: state === 'sold-out' ? 0 : state === 'unconfirmed' ? null : 10,
    bookable: Boolean(ticket.amount) && !['sold-out', 'unconfirmed'].includes(state),
  })) }))
  return { workshops, checkoutReady: true, test: true }
}

async function mockBookings(page) {
  await page.route('**/functions/v1/bookings-test/**', async route => {
    const url = new URL(route.request().url())
    const state = new URL(page.url()).searchParams.get('audit')
    const headers = { 'access-control-allow-origin': '*' }
    if (url.pathname.endsWith('/workshops')) {
      if (state === 'offline') { await route.fulfill({ status: 503, headers, json: { error: 'Audit availability failure' } }); return }
      await route.fulfill({ headers, json: availability(state) })
      return
    }
    if (url.pathname.includes('/orders/')) {
      const session = url.pathname.split('/').pop().replace('cs_test_', '')
      if (session === 'error') { await route.fulfill({ status: 404, headers, json: { error: 'This booking could not be found.' } }); return }
      const quantity = Number(session.split('_').pop()) || 1
      const status = session.startsWith('paid_') || session.startsWith('live_') ? 'paid' : session
      await route.fulfill({ headers, json: {
        status, quantity, test: !session.startsWith('live_'), amount: quantity * 2200,
        title: 'Desi Cardio', label: 'Jodi Jam · 5 November', location: catalogue[0].location,
        tickets: status === 'paid' ? Array.from({ length: quantity }, (_, index) => `TEST-11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`) : [],
      } })
      return
    }
    if (url.pathname.endsWith('/checkout/cancel')) {
      await route.fulfill({ headers, json: { status: 'cancelled' } })
      return
    }
    if (url.pathname.endsWith('/checkout')) {
      const { quantity } = route.request().postDataJSON()
      await route.fulfill({ headers, json: { sessionId: `cs_test_paid_${quantity}` } })
      return
    }
    await route.fulfill({ status: 400, headers, json: { error: 'Unexpected audit API request' } })
  })
}

async function ready(page, path) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main h1')).toHaveCount(1)
  await page.evaluate(() => document.fonts.ready)
  if (await page.locator('.ticket-picker').count()) await expect(page.locator('.ticket-picker')).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByText('Please wait while we confirm your booking with Stripe.')).toHaveCount(0)
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let offset = 0; offset < height; offset += 700) {
    await page.evaluate(position => scrollTo(0, position), offset)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  }
  await expect.poll(() => page.locator('main img').evaluateAll(images => images.filter(image => !image.complete || !image.naturalWidth).map(image => image.getAttribute('src')))).toEqual([])
  await page.evaluate(() => scrollTo(0, 0))
}

async function checkLayout(page, testInfo) {
  const issues = await page.evaluate(() => {
    const found = []
    if (document.documentElement.scrollWidth > innerWidth + 1) found.push('Page overflows horizontally')
    const nav = document.querySelector('.desktop-nav')
    const cta = document.querySelector('.nav-cta')
    if (getComputedStyle(nav).display !== 'none' && nav.getBoundingClientRect().right > cta.getBoundingClientRect().left) found.push('Header navigation overlaps ticket button')
    for (const section of document.querySelectorAll('main > section.section-pad')) {
      const style = getComputedStyle(section)
      const width = section.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      if (innerWidth >= 1440 && width < 600) found.push(`${section.className}: content squeezed to ${width}px`)
    }
    for (const element of document.querySelectorAll('main h1, main h2, main h3, main p, main summary, main button, main label, main input, main select')) {
      if (element.closest('.sr-only') || !element.getClientRects().length || element.clientWidth === 0) continue
      if (element.scrollWidth > element.clientWidth + 2 && ['hidden', 'clip'].includes(getComputedStyle(element).overflowX)) found.push(`Clipped ${element.tagName}: ${element.textContent.trim().slice(0, 65)}`)
    }
    return found
  })
  await page.screenshot({ path: testInfo.outputPath('page.png'), fullPage: true, animations: 'disabled' })
  expect(issues).toEqual([])
}

for (const width of [1920, 1440, 1024, 390]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 1000 } })
    test.beforeEach(async ({ page }) => { await mockBookings(page) })

    for (const path of routes) {
      test(path, async ({ page }, testInfo) => {
        const failures = []
        page.on('pageerror', error => failures.push(error.message))
        await ready(page, path)
        await checkLayout(page, testInfo)
        expect(failures).toEqual([])
      })
    }
    for (const state of bookingStates) {
      test(`booking ${state}`, async ({ page }, testInfo) => {
        const query = state === 'cancelled' ? 'cancelled=1&order_id=audit-cancel&' : ''
        await ready(page, `/workshops/desi-cardio/tickets?${query}audit=${state}`)
        await checkLayout(page, testInfo)
        if (state !== 'cancelled') await expect(page.locator('.checkout-button')).toBeDisabled()
      })
    }
    for (const state of confirmations) {
      test(`confirmation ${state}`, async ({ page }, testInfo) => {
        await ready(page, `/booking/confirmation?session_id=cs_test_${state}`)
        await checkLayout(page, testInfo)
        if (state.startsWith('paid_') || state.startsWith('live_')) await expect(page.locator('.issued-tickets li')).toHaveCount(Number(state.split('_').pop()))
      })
    }

    test('Past Intermediate never flashes as upcoming during loading', async ({ page }, testInfo) => {
      for (const path of ['/', '/workshops', '/hgscevents']) {
        let capture
        const requested = new Promise(resolve => { capture = resolve })
        await page.route('**/bookings-test/workshops', route => capture(route))
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        await expect(page.getByText('Loading upcoming workshops…')).toBeVisible()
        await expect(page.locator('.event-card')).toHaveCount(0)
        const request = await requested
        const data = availability()
        for (const ticket of data.workshops.find(workshop => workshop.id === 'intermediate').tickets) ticket.startsAt = new Date(Date.now() - 86400000).toISOString()
        await request.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: data })
        await expect(page.locator('.event-card')).toHaveCount(path === '/' ? 2 : 3)
        await expect(page.locator('.event-card').filter({ hasText: 'Intermediate Bhangra Workshop' })).toHaveCount(0)
        await expect(page.getByText('Loading upcoming workshops…')).toHaveCount(0)
        await page.unroute('**/bookings-test/workshops')
      }
      await checkLayout(page, testInfo)
    })

    test('Both November sessions have distinct cards and ticket links', async ({ page }, testInfo) => {
      await page.clock.setFixedTime(new Date('2026-11-01T00:00:00Z'))
      await page.route('**/bookings-test/workshops', route => route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: {
        checkoutReady: true, test: true,
        workshops: catalogue.map(workshop => ({ ...workshop, tickets: workshop.tickets.map(ticket => ({
          ...ticket, capacity: 10, remaining: ticket.id === 'desi-nov12' ? 7 : 9,
          bookable: Boolean(ticket.amount) && Date.parse(ticket.startsAt) > Date.parse('2026-11-01T00:00:00Z'),
        })) })),
      } }))
      for (const path of ['/workshops', '/']) {
        await ready(page, path)
        await expect(page.locator('.event-card')).toHaveCount(2)
        await expect(page.locator('.event-card h3')).toHaveText(['Desi Cardio · Jodi Jam · 5 November', 'Desi Cardio · Sangeet Sweat · 12 November'])
        await expect(page.locator('.event-card').first()).toContainText('9 remaining')
        await expect(page.locator('.event-card').nth(1)).toContainText('7 remaining')
        await expect(page.locator('.event-book').first()).toHaveAttribute('href', '/workshops/desi-cardio/tickets?ticket=desi-nov5')
        await expect(page.locator('.event-book').nth(1)).toHaveAttribute('href', '/workshops/desi-cardio/tickets?ticket=desi-nov12')
        await page.locator('.details-toggle').nth(1).click()
        await expect(page.locator('#details-desi-cardio-desi-nov12')).toBeVisible()
        await expect(page.locator('#details-desi-cardio-desi-nov5')).toHaveCount(0)
        await checkLayout(page, testInfo)
      }
      await page.locator('.event-book').nth(1).click()
      await expect(page.locator('#ticket-session')).toHaveValue('desi-nov12')
    })

    test('Future Intermediate remains visible with unconfirmed pricing', async ({ page }, testInfo) => {
      await ready(page, '/workshops?level=intermediate')
      await expect(page.locator('.event-card')).toHaveCount(1)
      await expect(page.locator('.event-card')).toContainText('Intermediate Bhangra Workshop')
      await expect(page.locator('.event-card')).toContainText('Price to be announced')
      await checkLayout(page, testInfo)
    })

    test('Workshop availability error can be retried without false cards', async ({ page }, testInfo) => {
      let requests = 0
      await page.route('**/bookings-test/workshops', route => {
        requests++
        return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, status: requests === 1 ? 503 : 200,
          json: requests === 1 ? { error: 'Audit availability failure' } : availability() })
      })
      await ready(page, '/workshops')
      await expect(page.getByRole('heading', { name: 'Workshop dates are temporarily unavailable.' })).toBeVisible()
      await expect(page.locator('.event-card')).toHaveCount(0)
      await page.getByRole('button', { name: 'Try again' }).click()
      await expect(page.locator('.event-card')).toHaveCount(4)
      await checkLayout(page, testInfo)
    })

    test('FAQ answers and mobile navigation', async ({ page }, testInfo) => {
      await ready(page, '/frequentlyaskedquestions')
      const summaries = page.locator('.faq-page summary')
      for (const summary of await summaries.all()) await summary.click()
      await expect(page.locator('.faq-page details[open]')).toHaveCount(7)
      await checkLayout(page, testInfo)
      if (width === 390) {
        await page.getByRole('button', { name: 'Open navigation' }).click()
        await expect(page.locator('#mobile-nav')).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(page.locator('#mobile-nav')).toHaveCount(0)
        await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused()
      }
    })

    test('Contact validation and prepared draft', async ({ page }, testInfo) => {
      await ready(page, '/getintouch')
      await page.locator('.contact-form button[type="submit"]').click()
      await expect(page.locator('.field-error')).toHaveCount(3)
      await page.locator('#contact-name').fill('Browser audit')
      await page.locator('#contact-email').fill('audit@example.invalid')
      await page.locator('#contact-message').fill('I would like to ask about a first Bhangra workshop.')
      await page.locator('.contact-form button[type="submit"]').click()
      await expect(page.locator('#draft-panel')).toBeVisible()
      await checkLayout(page, testInfo)
    })

    test('Gallery dialog opens and restores focus', async ({ page }, testInfo) => {
      await ready(page, '/media')
      const trigger = page.locator('.reel-open').first()
      await trigger.click()
      await expect(page.locator('dialog[open]')).toBeVisible()
      await checkLayout(page, testInfo)
      await page.keyboard.press('Escape')
      await expect(page.locator('dialog[open]')).toHaveCount(0)
      await expect(trigger).toBeFocused()
    })

    test('Past workshop search and photo dialog', async ({ page }, testInfo) => {
      await ready(page, '/workshops?view=past')
      const search = page.locator('.past-search-field input')
      await search.fill('no-matching-choreography')
      await expect(page.locator('.past-workshop-grid article')).toHaveCount(0)
      await search.fill('')
      const trigger = page.getByRole('button', { name: 'Photos', exact: true }).first()
      await trigger.click()
      await expect(page.locator('dialog[open]')).toBeVisible()
      await checkLayout(page, testInfo)
      await page.keyboard.press('Escape')
      await expect(page.locator('dialog[open]')).toHaveCount(0)
      await expect(trigger).toBeFocused()
    })

    test('Confirmation print styles retain all ticket codes', async ({ page }, testInfo) => {
      await ready(page, '/booking/confirmation?session_id=cs_test_paid_10')
      await page.emulateMedia({ media: 'print' })
      await expect(page.locator('.site-header')).toBeHidden()
      await expect(page.locator('.confirmation-actions')).toBeHidden()
      await expect(page.locator('.issued-tickets code')).toHaveCount(10)
      await expect(page.locator('.demo-ticket-disclaimer')).toHaveCount(10)
      await checkLayout(page, testInfo)
    })
  })
}