import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const { priceId, planId, planType, email } = await req.json();

    if (!priceId || !planId || !planType) {
      return Response.json({ error: 'Missing plan details' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://high-five.base44.app';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      success_url: `${origin}/pricing?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        plan_id: planId,
        plan_type: planType,
        email: email || ''
      },
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          plan_id: planId,
          plan_type: planType,
          email: email || ''
        }
      }
    });

    await base44.asServiceRole.entities.Payment.create({
      email: email || '',
      plan_id: planId,
      plan_type: planType,
      stripe_session_id: session.id,
      status: 'pending',
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || 'usd'
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createCheckoutSession error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});