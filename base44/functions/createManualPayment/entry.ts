import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { planId, planType, email, amount, paymentMethod, paymentHandle, paymentNote } = await req.json();

    if (!planId || !planType || !email) {
      return Response.json({ error: 'Missing payment details' }, { status: 400 });
    }

    const payment = await base44.asServiceRole.entities.Payment.create({
      email: String(email).trim().toLowerCase(),
      plan_id: planId,
      plan_type: planType,
      payment_method: paymentMethod || 'manual',
      payment_handle: paymentHandle || '',
      payment_note: paymentNote || '',
      status: 'pending',
      amount: Number(amount) || 0,
      currency: 'usd'
    });

    return Response.json({ success: true, payment });
  } catch (error) {
    console.error('createManualPayment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});