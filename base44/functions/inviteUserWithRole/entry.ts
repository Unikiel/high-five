import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const VALID_ROLES = ['admin', 'tutor', 'assistant', 'student'];

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

    return Response.json({ invited: true, role_applied: roleApplied, role });
  } catch (error) {
    console.error('inviteUserWithRole error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});