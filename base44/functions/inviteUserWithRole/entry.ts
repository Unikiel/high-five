import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const VALID_ROLES = ['admin', 'tutor', 'assistant', 'student'];

async function upsertInvitation(svc: any, email: string, role: string, invitedBy: string) {
  const existing = await svc.Invitation.filter({ email }, '-created_date', 5);
  const payload = {
    email,
    role,
    status: 'pending',
    invited_by: invitedBy,
    invited_at: new Date().toISOString(),
  };
  if (existing?.length) {
    return await svc.Invitation.update(existing[0].id, payload);
  }
  return await svc.Invitation.create(payload);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email, role } = await req.json();
    if (!email || !VALID_ROLES.includes(role)) {
      return Response.json({ error: 'A valid email and role are required' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Platform invites only support base roles "user" / "admin"
    const baseRole = role === 'admin' ? 'admin' : 'user';
    await base44.users.inviteUser(normalizedEmail, baseRole);

    // Poll for the invited user record and apply the app role reliably
    let roleApplied = false;
    for (let attempt = 0; attempt < 8 && !roleApplied; attempt++) {
      const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
      const match = users.find((u) => (u.email || '').toLowerCase() === normalizedEmail);
      if (match) {
        await base44.asServiceRole.entities.User.update(match.id, { role });
        roleApplied = true;
      } else {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    // Record in Invitation allowlist so invite-only signup can admit this email
    let invitationRecorded = false;
    try {
      await upsertInvitation(
        base44.asServiceRole.entities,
        normalizedEmail,
        role,
        user.email || '',
      );
      invitationRecorded = true;
    } catch (e) {
      console.error('Invitation upsert failed', e.message);
    }

    // Follow-up email stating the actual app role (the platform invite letter always says "user")
    let welcomeSent = false;
    if (roleApplied) {
      const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: normalizedEmail,
          from_name: 'High Five',
          subject: `Welcome to High Five — you've been added as a ${roleLabel}`,
          body: `Hi,\n\nYou've been invited to join High Five as a ${roleLabel}.\n\nThe invitation email from the platform may mention a generic "user" account level — please ignore that. Once you accept the invitation and sign in, your account will have full ${roleLabel} access.\n\nSee you inside!\nThe High Five Team`
        });
        welcomeSent = true;
      } catch (e) {
        console.error('Welcome email failed', e.message);
      }
    }

    return Response.json({
      invited: true,
      role_applied: roleApplied,
      invitation_recorded: invitationRecorded,
      role,
      welcome_email_sent: welcomeSent,
    });
  } catch (error) {
    console.error('inviteUserWithRole error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
