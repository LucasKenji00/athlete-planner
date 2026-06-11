export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const { sessionId, nutrition_upsell } = await req.json()

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: session, error } = await supabase
    .from('quiz_sessions')
    .update({ nutrition_upsell: !!nutrition_upsell })
    .eq('id', sessionId)
    .select('email, status')
    .single()

  if (error || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  if (session.status !== 'pending') {
    return NextResponse.json({ error: 'This session has already been paid' }, { status: 409 })
  }

  const origin = req.headers.get('origin') ?? 'http://localhost:3000'
  const priceId = nutrition_upsell
    ? process.env.STRIPE_PRICE_ID_NUTRITION!
    : process.env.STRIPE_PRICE_ID!

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'payment',
    customer_email: session.email ?? undefined,  // pre-fill — less friction
    client_reference_id: sessionId,
    success_url: `${origin}/loading/${sessionId}`,
    cancel_url:  `${origin}/quiz`,
    metadata: { sessionId },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
