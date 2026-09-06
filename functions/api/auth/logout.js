import { destroySession, clearSessionCookieHeader, checkOrigin, json } from '../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!checkOrigin(request, env)) return json({ error: 'Origen no permitido.' }, 403);
  await destroySession(env.DB, request);
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookieHeader() });
}
