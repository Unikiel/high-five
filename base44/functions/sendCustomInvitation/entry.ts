import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, role } = await req.json();
    
    if (!email || !role) {
      return Response.json({ error: 'Missing email or role' }, { status: 400 });
    }

    // First invite as user (platform requirement)
    await base44.users.inviteUser(email, role === 'admin' ? 'admin' : 'user');

    // Then send a custom email with the correct role mentioned
    const roleLabel = { admin: 'Admin', tutor: 'Tutor', assistant: 'Assistant', student: 'Student' }[role] || 'Student';
    
    const invitationBody = `
Hi there,

You've been invited to join High Five as a ${roleLabel}.

To get started, click the link in your invitation email and register your account.

We're excited to have you on board!

Best regards,
High Five Team
    `.trim();

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `You're invited to join High Five as a ${roleLabel}`,
      body: invitationBody,
      from_name: 'High Five'
    });

    return Response.json({ success: true, message: `Invitation sent to ${email} as ${roleLabel}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});