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
    
    if (body.display_name !== undefined) updateData.display_name = body.display_name;
    if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.password !== undefined) updateData.password = body.password;
    
    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updatedUser = await base44.auth.updateMe(updateData);
    return Response.json(updatedUser);
  } catch (error) {
    console.error('Update failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});