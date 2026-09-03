/**
 * functions/api/lead-handler.js — Cloudflare Pages Function
 * -----------------------------------------------------------
 * Esta es la alternativa a api/lead-handler.php para cuando el sitio
 * vive en GitHub (que NO corre PHP). Cloudflare Pages sí puede ejecutar
 * este tipo de función (JavaScript), gratis, y sigue usando tu mismo
 * repo de GitHub como fuente — no tienes que mover el código.
 *
 * CÓMO ACTIVARLO (una sola vez, ~10 minutos):
 * 1. Entra a https://dash.cloudflare.com → Workers & Pages → Create → Pages
 *    → "Connect to Git" → elige tu repo de GitHub (kernel-shield).
 * 2. Déjalo con la config por defecto (no necesita build, es HTML/CSS/JS puro).
 * 3. Una vez desplegado, te da una URL tipo kernel-shield.pages.dev.
 *    Puedes conectar tu dominio kernelshield.xyz ahí mismo (DNS → Cloudflare).
 * 4. En Cloudflare Pages → tu proyecto → Settings → Environment variables,
 *    agrega una variable llamada DISCORD_WEBHOOK con tu URL de webhook.
 *    (Así ni siquiera queda escrita en este archivo / en GitHub).
 * 5. Listo. app.js YA intenta llamar a /api/lead-handler.php primero;
 *    en Cloudflare Pages esa ruta cae automáticamente en este archivo
 *    porque Pages Functions responde cualquier request a /api/* con el
 *    archivo que coincida en /functions/api/.
 *
 * Ventaja sobre GitHub Pages solo: el webhook deja de estar expuesto en
 * el navegador, y sigue siendo gratis.
 */

const RATE_LIMIT_MAX = 4;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutos

function clean(value, max = 500) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = env.ALLOWED_ORIGIN || 'https://kernelshield.xyz';
  const corsHeaders = origin === allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin } : {};

  let data;
  try {
    data = await request.json();
  } catch (_) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), { status: 400, headers: corsHeaders });
  }

  // Honeypot
  if (data.website) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }

  const name = clean(data.name, 80);
  const email = clean(data.email, 120);
  const phone = clean(data.telefono, 30);
  const country = clean(data.pais, 60);
  const discord = clean(data.discord, 60);
  const wanted = clean(data.solicitado, 300);
  const loc = clean(data.ubicacion_preferida, 60);
  const message = clean(data.mensaje, 800);

  if (name.length < 2) return new Response(JSON.stringify({ ok: false, error: 'invalid_name' }), { status: 422, headers: corsHeaders });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new Response(JSON.stringify({ ok: false, error: 'invalid_email' }), { status: 422, headers: corsHeaders });
  if (phone.length < 5) return new Response(JSON.stringify({ ok: false, error: 'invalid_phone' }), { status: 422, headers: corsHeaders });
  if (country.length < 2) return new Response(JSON.stringify({ ok: false, error: 'invalid_country' }), { status: 422, headers: corsHeaders });

  // Rate limit por IP usando KV (opcional). Si no configuras el KV
  // namespace "RATE_LIMIT_KV" en Cloudflare, esta parte se salta sola
  // y el formulario sigue funcionando (solo sin límite server-side).
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (env.RATE_LIMIT_KV) {
    const key = 'rl:' + ip;
    const raw = await env.RATE_LIMIT_KV.get(key);
    const hits = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recent = hits.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= RATE_LIMIT_MAX) {
      return new Response(JSON.stringify({ ok: false, error: 'rate_limited' }), { status: 429, headers: corsHeaders });
    }
    recent.push(now);
    await env.RATE_LIMIT_KV.put(key, JSON.stringify(recent), { expirationTtl: 3600 });
  }

  const webhookUrl = env.DISCORD_WEBHOOK;
  let discordOk = false;
  if (webhookUrl) {
    try {
      const dcRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'KernelShield · Ventas',
          embeds: [{
            title: '🟡 Venta pendiente — Nueva cotización VPS',
            color: 16759808,
            fields: [
              { name: 'Nombre', value: name, inline: true },
              { name: 'Email', value: email, inline: true },
              { name: 'Teléfono / WhatsApp', value: phone, inline: true },
              { name: 'País', value: country, inline: true },
              { name: 'Discord', value: discord || 'No indicado', inline: true },
              { name: 'Ubicación preferida', value: loc || 'No indicada', inline: true },
              { name: 'Solicitado', value: wanted || 'No especificado' },
              { name: 'Mensaje', value: message || 'Sin mensaje extra' }
            ],
            footer: { text: 'kernelshield.xyz — IP: ' + ip },
            timestamp: new Date().toISOString()
          }]
        })
      });
      discordOk = dcRes.ok;
    } catch (_) {
      discordOk = false;
    }
  }

  // Si el visitante tiene sesión activa, la cotización queda vinculada a su
  // cuenta y aparecerá en su panel (/cuenta.html). Si no, se guarda igual
  // (sin dueño) para que quede en el registro comercial.
  let quoteId = null;
  if (env.DB) {
    try {
      const { getSessionUser } = await import('./_lib/auth.js');
      const user = await getSessionUser(env.DB, request);
      const result = await env.DB.prepare(
        `INSERT INTO quotes (user_id, name, email, phone, country, discord, requested, location_pref, message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(user ? user.id : null, name, email, phone, country, discord || null, wanted || null, loc || null, message || null).run();
      quoteId = result.meta.last_row_id;
    } catch (_) {
      // Si D1 aún no está enlazado a este proyecto, seguimos funcionando
      // igual con la notificación a Discord de más abajo.
    }
  }

  return new Response(JSON.stringify({ ok: true, discord: discordOk, quoteId }), { status: 200, headers: corsHeaders });
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get('Origin') || '';
  const allowedOrigin = context.env.ALLOWED_ORIGIN || 'https://kernelshield.xyz';
  const headers = origin === allowedOrigin
    ? { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' }
    : {};
  return new Response(null, { status: 204, headers });
}
