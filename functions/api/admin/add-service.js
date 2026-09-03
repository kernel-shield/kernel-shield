import { clean, checkOrigin, json } from '../_lib/auth.js';

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function onRequestPost({ request, env }) {
  if (!checkOrigin(request, env)) return json({ error: 'Origen no permitido.' }, 403);

  const provided = request.headers.get('X-Admin-Token') || '';
  if (!env.ADMIN_TOKEN || !safeEqual(provided, env.ADMIN_TOKEN)) {
    return json({ error: 'No autorizado.' }, 401);
  }

  const db = env.DB;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }

  const email = clean(body.email, 190).toLowerCase();
  const planName = clean(body.planName, 120);
  const location = clean(body.location, 80);
  const ipAddress = clean(body.ipAddress, 60);
  const renewsAt = clean(body.renewsAt, 20); // YYYY-MM-DD

  if (!email || !planName) return json({ error: 'Faltan datos: email y planName son obligatorios.' }, 400);

  const user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (!user) return json({ error: 'No existe una cuenta con ese correo.' }, 404);

  await db.prepare(
    'INSERT INTO services (user_id, plan_name, location, ip_address, renews_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(user.id, planName, location || null, ipAddress || null, renewsAt || null).run();

  return json({ ok: true, message: 'Servicio asignado correctamente.' }, 201);
}
