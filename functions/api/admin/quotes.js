import { requireAdmin } from './_guard.js';
import { json, clean } from '../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: 'No autorizado.' }, 401);
  const db = env.DB;
  const { results } = await db.prepare(
    'SELECT * FROM quotes ORDER BY created_at DESC LIMIT 200'
  ).all();
  return json({ ok: true, quotes: results });
}

export async function onRequestPatch({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: 'No autorizado.' }, 401);
  const db = env.DB;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  const id = parseInt(body.id, 10);
  const status = clean(body.status, 20);
  const allowed = ['pendiente', 'cotizado', 'aprobado', 'rechazado'];
  if (!id || !allowed.includes(status)) return json({ error: 'Datos inválidos.' }, 400);
  await db.prepare('UPDATE quotes SET status = ? WHERE id = ?').bind(status, id).run();
  return json({ ok: true });
}
