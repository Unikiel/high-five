import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const testAccounts = [
    { email: 'test.tutor@highfiveap.com', full_name: 'Test Tutor', role: 'tutor' },
    { email: 'test.assistant@highfiveap.com', full_name: 'Test Assistant', role: 'assistant' },
    { email: 'test.student@highfiveap.com', full_name: 'Test Student', role: 'student' },
  ];

  const results = [];

  for (const account of testAccounts) {
    try {
      // Invite as base "user" role (platform limitation)
      await base44.users.inviteUser(account.email, 'user');
      results.push({ email: account.email, action: 'invited' });
    } catch (err) {
      results.push({ email: account.email, action: 'invite_error', error: err.message });
    }

    // Try to find and update the role immediately (works if user already registered)
    try {
      const users = await base44.asServiceRole.entities.User.filter({ email: account.email });
      if (users && users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, {
          full_name: account.full_name,
          role: account.role,
        });
        results[results.length - 1].role_set = true;
      } else {
        results[results.length - 1].role_set = false;
        results[results.length - 1].note = 'User not registered yet — invite email sent. Set role after they register.';
      }
    } catch (err) {
      results[results.length - 1].role_error = err.message;
    }
  }

  return Response.json({ results });
});