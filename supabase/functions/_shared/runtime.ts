import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import workshops from './workshops.json' with { type: 'json' }
import { createSupabaseStore } from './store.js'
import { createBookingHandler } from './booking-api.js'
import { testWorkshopCatalogue } from './ticketing.js'

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

export function serveBookings(mode: 'test' | 'live', functionName: string) {
  let handler: ReturnType<typeof createBookingHandler> | undefined
  Deno.serve(async request => {
    try {
      if (!handler) {
        const prefix = mode === 'live' ? 'LIVE' : 'TEST'
        const origin = Deno.env.get(`APP_${prefix}_ORIGIN`) || ''
        const key = Deno.env.get(`STRIPE_${prefix}_SECRET_KEY`)
        if (key && !key.startsWith(`sk_${mode}_`)) throw new Error('Stripe key mode mismatch.')
        const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          global: { fetch: (input, options) => fetch(input, { ...options, signal: options?.signal || AbortSignal.timeout(8000) }) },
        })
        handler = createBookingHandler({ mode, functionName, origin, workshops: mode === 'test' ? testWorkshopCatalogue(workshops) : workshops, store: createSupabaseStore({ client, mode }),
          stripe: key ? new Stripe(key, { httpClient: Stripe.createFetchHttpClient(), maxNetworkRetries: 1, timeout: 6000 }) : null,
          cryptoProvider: Stripe.createSubtleCryptoProvider(), webhookSecret: Deno.env.get(`STRIPE_${prefix}_WEBHOOK_SECRET`),
          cronSecret: undefined, emailKey: Deno.env.get('RESEND_API_KEY'), fromEmail: Deno.env.get('FROM_EMAIL'),
          schedule: (promise: Promise<unknown>) => EdgeRuntime.waitUntil(promise),
        })
      }
      return await handler(request)
    } catch {
      return Response.json({ error: 'Booking service is not configured yet.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
    }
  })
}