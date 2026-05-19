import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET'));
    } catch (error) {
      console.error('Stripe webhook signature error:', error.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const payments = await base44.asServiceRole.entities.Payment.filter({ stripe_session_id: session.id }, '-created_date', 1);
      const payment = payments[0];
      const subscription = session.subscription ? await stripe.subscriptions.retrieve(session.subscription) : null;
      const accessUntil = subscription?.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : '';

      if (payment) {
        await base44.asServiceRole.entities.Payment.update(payment.id, {
          status: 'active',
          stripe_customer_id: session.customer || '',
          stripe_subscription_id: session.subscription || '',
          access_until: accessUntil,
          amount: session.amount_total ? session.amount_total / 100 : payment.amount || 0,
          currency: session.currency || payment.currency || 'usd'
        });
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const payments = await base44.asServiceRole.entities.Payment.filter({ stripe_subscription_id: subscription.id }, '-created_date', 1);
      if (payments[0]) {
        await base44.asServiceRole.entities.Payment.update(payments[0].id, {
          status: subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : 'expired',
          access_until: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : payments[0].access_until || ''
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const payments = await base44.asServiceRole.entities.Payment.filter({ stripe_subscription_id: subscription.id }, '-created_date', 1);
      if (payments[0]) {
        await base44.asServiceRole.entities.Payment.update(payments[0].id, { status: 'cancelled' });
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('stripeWebhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});