import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const updateData = {};
    
    // Only include fields that can be updated
    if (body.full_name) {
      updateData.full_name = body.full_name;
    }
    if (body.avatar_url) {
      updateData.avatar_url = body.avatar_url;
    }
    if (body.role) {
      updateData.role = body.role;
    }
    
    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Use asServiceRole to update the user with bypass restrictions
    await base44.asServiceRole.entities.User.update(user.id, updateData);

    // Return updated user
    const updatedUser = await base44.auth.me();
    return Response.json({ user: updatedUser });
  } catch (error) {
    console.error('Update failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});