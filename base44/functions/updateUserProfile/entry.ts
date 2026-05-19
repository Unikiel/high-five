import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { full_name, avatar_url } = await req.json();
    
    // Update the user via the User entity
    await base44.asServiceRole.entities.User.update(user.id, {
      ...(full_name && { full_name }),
      ...(avatar_url && { avatar_url })
    });

    // Return updated user
    const updatedUser = await base44.auth.me();
    return Response.json({ user: updatedUser });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});