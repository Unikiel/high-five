import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const { priceId, planId, planType, email, discountCode } = await req.json();

    if (!priceId || !planId || !planType) {
      return Response.json({ error: 'Missing plan details' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://high-five.base44.app';
    let discounts = [];
    let appliedDiscountCodes = [];
    let combinedPercentOff = 0;
    const requestedCodes = String(discountCode || '')
      .split(',')
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean);

    for (const code of requestedCodes) {
      const matches = await base44.asServiceRole.entities.SpecialDiscount.filter({ code, is_active: true }, '-created_date', 1);
      const special = matches[0];
      const isExpired = special?.expires_at && new Date(special.expires_at) < new Date();
      const planMatches = special && (!special.plan_type || special.plan_type === 'any' || special.plan_type === planType);
      const emailMatches = special && (!special.customer_email || special.customer_email === String(email || '').toLowerCase());
      const canCombine = requestedCodes.length === 1 || special?.is_combinable !== false;
      if (special && !isExpired && planMatches && emailMatches && canCombine) {
        combinedPercentOff += Number(special.percent_off) || 0;
        appliedDiscountCodes.push(special.code);
      }
    }

    combinedPercentOff = Math.min(combinedPercentOff, 100);
    if (combinedPercentOff > 0) {
      const coupon = await stripe.coupons.create({
        percent_off: combinedPercentOff,
        duration: 'once',
        name: appliedDiscountCodes.join(' + ')
      });
      discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      discounts,
      customer_email: email || undefined,
      success_url: `${origin}/pricing?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        plan_id: planId,
        plan_type: planType,
        email: email || '',
        discount_code: appliedDiscountCodes.join(','),
        combined_discount_percent: String(combinedPercentOff)
      },
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          plan_id: planId,
          plan_type: planType,
          email: email || '',
        discount_code: appliedDiscountCodes.join(','),
        combined_discount_percent: String(combinedPercentOff)
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