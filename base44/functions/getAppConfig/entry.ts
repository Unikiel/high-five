import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function loadOrCreateConfig(svc: any) {
  const rows = await svc.AppConfig.list('-created_date', 1);
  if (rows?.length) return rows[0];
  return await svc.AppConfig.create({
    require_invitation: false,
    updated_at: new Date().toISOString(),
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;
    const config = await loadOrCreateConfig(svc);
    return Response.json({
      require_invitation: Boolean(config.require_invitation),
      updated_at: config.updated_at || null,
      id: config.id,
    });
  } catch (error) {
    console.error('getAppConfig error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
