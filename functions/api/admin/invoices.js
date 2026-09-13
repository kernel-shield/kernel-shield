import { requireAdmin } from './_guard.js';
import { json, clean } from '../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: 'No autorizado.' }, 401);
  const db = env.DB;
  const { results } = await db.prepare(
    `SELECT i.*, u.email AS user_email FROM invoices i
     JOIN users u ON u.id = i.user_id ORDER BY i.created_at DESC LIMIT 200`
  ).all();
  return json({ ok: true, invoices: results });
}

export async function onRequestPost({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: 'No autorizado.' }, 401);
  const db = env.DB;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }

  const userId = parseInt(body.user_id, 10);
  const amount = Number(body.amount);
  const description = clean(body.description, 200);
  const dueDate = clean(body.due_date, 20);
  const serviceId = body.service_id ? parseInt(body.service_id, 10) : null;

  if (!userId || !amount || amount <= 0 || description.length < 2) {
    return json({ error: 'Datos inválidos.' }, 400);
  }
  const user = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (!user) return json({ error: 'Usuario no encontrado.' }, 404);

  const amountCents = Math.round(amount * 100);
  await db.prepare(
    'INSERT INTO invoices (user_id, service_id, amount_cents, description, due_date) VALUES (?, ?, ?, ?, ?)'
  ).bind(userId, serviceId, amountCents, description, dueDate || null).run();

  return json({ ok: true }, 201);
}

export async function onRequestPatch({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: 'No autorizado.' }, 401);
  const db = env.DB;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  const id = parseInt(body.id, 10);
  const status = clean(body.status, 20);
  const allowed = ['pendiente', 'pagada', 'cancelada'];
  if (!id || !allowed.includes(status)) return json({ error: 'Datos inválidos.' }, 400);
  const paidAt = status === 'pagada' ? new Date().toISOString() : null;
  await db.prepare('UPDATE invoices SET status = ?, paid_at = ? WHERE id = ?').bind(status, paidAt, id).run();
  return json({ ok: true });
}
