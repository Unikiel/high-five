import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) {
      return Response.json({ error: 'email is required' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    const configs = await svc.AppConfig.list('-created_date', 1);
    const requireInvitation = Boolean(configs?.[0]?.require_invitation);

    if (!requireInvitation) {
      return Response.json({
        require_invitation: false,
        allowed: true,
        reason: 'open_signup',
      });
    }

    const invites = await svc.Invitation.filter({ email }, '-created_date', 5);
    const active = (invites || []).find(
      (inv: any) => inv.status === 'pending' || inv.status === 'accepted',
    );

    if (active) {
      return Response.json({
        require_invitation: true,
        allowed: true,
        reason: active.status === 'accepted' ? 'already_accepted' : 'pending_invite',
        role: active.role || 'student',
      });
    }

    // Existing accounts may predate invite-only; do not lock them out of login.
    const users = await svc.User.filter({ email }, '-created_date', 1);
    if (users?.length) {
      return Response.json({
        require_invitation: true,
        allowed: true,
        reason: 'existing_user',
      });
    }

    return Response.json({
      require_invitation: true,
      allowed: false,
      reason: 'not_invited',
    });
  } catch (error) {
    console.error('checkInvitation error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
