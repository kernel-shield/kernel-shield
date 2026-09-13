import { requireAdmin } from './_guard.js';
import { json, clean } from '../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: 'No autorizado.' }, 401);
  const db = env.DB;
  const { results } = await db.prepare(
    `SELECT s.*, u.email AS user_email FROM services s
     JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC LIMIT 200`
  ).all();
  return json({ ok: true, services: results });
}

export async function onRequestPost({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: 'No autorizado.' }, 401);
  const db = env.DB;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }

  const userId = parseInt(body.user_id, 10);
  const planName = clean(body.plan_name, 80);
  const location = clean(body.location, 60);
  const ipAddress = clean(body.ip_address, 45);

  if (!userId || planName.length < 2) return json({ error: 'Datos inválidos.' }, 400);

  const user = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (!user) return json({ error: 'Usuario no encontrado.' }, 404);

  await db.prepare(
    'INSERT INTO services (user_id, plan_name, location, ip_address) VALUES (?, ?, ?, ?)'
  ).bind(userId, planName, location, ipAddress).run();

  return json({ ok: true }, 201);
}

export async function onRequestPatch({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: 'No autorizado.' }, 401);
  const db = env.DB;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  const id = parseInt(body.id, 10);
  const status = clean(body.status, 20);
  const allowed = ['activo', 'suspendido', 'cancelado'];
  if (!id || !allowed.includes(status)) return json({ error: 'Datos inválidos.' }, 400);
  await db.prepare('UPDATE services SET status = ? WHERE id = ?').bind(status, id).run();
  return json({ ok: true });
}
