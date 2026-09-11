import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Prefer authenticated user email; allow body.email for OTP verify before session is set
    const me = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const email = String(me?.email || body.email || '').trim().toLowerCase();
    if (!email) {
      return Response.json({ error: 'email is required' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    const invites = await svc.Invitation.filter({ email }, '-created_date', 10);
    const pending = (invites || []).filter((inv: any) => inv.status === 'pending');

    for (const inv of pending) {
      await svc.Invitation.update(inv.id, { status: 'accepted' });
    }

    return Response.json({
      accepted: pending.length,
      email,
    });
  } catch (error) {
    console.error('acceptInvitation error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
