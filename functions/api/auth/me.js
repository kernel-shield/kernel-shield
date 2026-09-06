import { getSessionUser, json } from '../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const db = env.DB;
  const user = await getSessionUser(db, request);
  if (!user) return json({ error: 'No has iniciado sesión.' }, 401);

  const { results: quotes } = await db.prepare(
    `SELECT id, requested, location_pref, status, created_at
     FROM quotes WHERE user_id = ? ORDER BY created_at DESC LIMIT 25`
  ).bind(user.id).all();

  const { results: services } = await db.prepare(
    `SELECT id, plan_name, location, ip_address, status, renews_at, created_at
     FROM services WHERE user_id = ? ORDER BY created_at DESC`
  ).bind(user.id).all();

  return json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: !!user.email_verified,
      memberSince: user.created_at
    },
    quotes,
    services
  });
}
