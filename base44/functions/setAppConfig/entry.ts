import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    if (typeof body.require_invitation !== 'boolean') {
      return Response.json({ error: 'require_invitation (boolean) is required' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    const rows = await svc.AppConfig.list('-created_date', 1);
    const payload = {
      require_invitation: body.require_invitation,
      updated_at: new Date().toISOString(),
    };

    let config;
    if (rows?.length) {
      config = await svc.AppConfig.update(rows[0].id, payload);
    } else {
      config = await svc.AppConfig.create(payload);
    }

    return Response.json({
      require_invitation: Boolean(config.require_invitation),
      updated_at: config.updated_at || payload.updated_at,
      id: config.id,
    });
  } catch (error) {
    console.error('setAppConfig error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
