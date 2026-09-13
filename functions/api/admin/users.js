import { requireAdmin } from './_guard.js';
import { json } from '../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: 'No autorizado.' }, 401);
  const db = env.DB;
  const { results } = await db.prepare(
    'SELECT id, email, name, email_verified, created_at, last_login_at FROM users ORDER BY created_at DESC LIMIT 200'
  ).all();
  return json({ ok: true, users: results });
}
