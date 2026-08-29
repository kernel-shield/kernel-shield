/**
 * server.js — Recepción segura de cotizaciones VPS (Kernel Shield)
 * ------------------------------------------------------------------
 * Pensado para correr en tu nodo Pterodactyl con el egg "Node.js Generic".
 * Requiere Node 18+ (usas Node 20, perfecto — trae fetch nativo, no hace
 * falta instalar node-fetch).
 *
 * Qué hace:
 * 1. Recibe el formulario de cotización desde kernelshield.xyz (dominio
 *    permitido por CORS).
 * 2. Valida y limpia los datos.
 * 3. Aplica un límite de 4 solicitudes cada 10 minutos por IP (anti-spam).
 * 4. Reenvía la notificación a tu webhook de Discord — el webhook vive
 *    SOLO aquí, en el servidor, nunca en el navegador del cliente.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.disable('x-powered-by'); // no anunciar que usamos Express (menos info para atacantes)
app.set('trust proxy', 1); // Render está detrás de un proxy — necesario para leer la IP real
app.use(helmet()); // cabeceras de seguridad estándar (HSTS, X-Content-Type-Options, etc.)

// ---- Configuración (ideal: pon esto en variables de entorno del panel) ----
// Pterodactyl inyecta SERVER_PORT automáticamente según el puerto que
// asignaste al crear el servidor — por eso lo priorizamos sobre PORT.
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
if (!DISCORD_WEBHOOK_URL) {
  console.warn('⚠️  Falta la variable de entorno DISCORD_WEBHOOK_URL en Render.');
}
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://kernelshield.xyz,https://www.kernelshield.xyz')
  .split(',')
  .map(s => s.trim());
const RATE_LIMIT_MAX = 4;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const GLOBAL_RATE_LIMIT_MAX = 60; // máx. 60 peticiones/min por IP a CUALQUIER ruta (anti-flood)
const GLOBAL_RATE_LIMIT_WINDOW_MS = 60 * 1000;

app.use(express.json({ limit: '20kb' }));
app.use(
  cors({
    origin(origin, cb) {
      // Permite peticiones sin Origin (curl/health checks) y las de tu dominio
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error('Origin no permitido'));
    }
  })
);

// ---- Rate limiting simple en memoria (suficiente para un solo proceso) ----
const hitsByIp = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const hits = (hitsByIp.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (hits.length >= RATE_LIMIT_MAX) {
    hitsByIp.set(ip, hits);
    return true;
  }
  hits.push(now);
  hitsByIp.set(ip, hits);
  return false;
}
// Limpieza periódica para no acumular memoria indefinidamente
setInterval(() => {
  const now = Date.now();
  for (const [ip, hits] of hitsByIp) {
    const fresh = hits.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (fresh.length) hitsByIp.set(ip, fresh);
    else hitsByIp.delete(ip);
  }
}, 5 * 60 * 1000);

function clean(value, max = 500) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

// ---- Rate limiting global (protege TODAS las rutas de flood/escaneo) ----
const globalHitsByIp = new Map();
app.use((req, res, next) => {
  const ip = clientIp(req);
  const now = Date.now();
  const hits = (globalHitsByIp.get(ip) || []).filter(t => now - t < GLOBAL_RATE_LIMIT_WINDOW_MS);
  if (hits.length >= GLOBAL_RATE_LIMIT_MAX) {
    return res.status(429).json({ ok: false, error: 'too_many_requests' });
  }
  hits.push(now);
  globalHitsByIp.set(ip, hits);
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/lead-handler', async (req, res) => {
  try {
    const body = req.body || {};

    // Honeypot: si el campo "website" viene lleno, es un bot — respondemos
    // ok pero no procesamos ni notificamos nada.
    if (clean(body.website)) {
      return res.json({ ok: true });
    }

    const name = clean(body.name, 80);
    const email = clean(body.email, 120);
    const phone = clean(body.telefono, 30);
    const country = clean(body.pais, 60);
    const discord = clean(body.discord, 60);
    const solicitado = clean(body.solicitado, 300);
    const ubicacion = clean(body.ubicacion_preferida, 60);
    const mensaje = clean(body.mensaje, 800);

    if (name.length < 2) return res.status(422).json({ ok: false, error: 'invalid_name' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(422).json({ ok: false, error: 'invalid_email' });
    if (phone.length < 5) return res.status(422).json({ ok: false, error: 'invalid_phone' });
    if (country.length < 2) return res.status(422).json({ ok: false, error: 'invalid_country' });

    const ip = clientIp(req);
    if (isRateLimited(ip)) {
      return res.status(429).json({ ok: false, error: 'rate_limited' });
    }

    const discordRes = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'KernelShield · Ventas',
        embeds: [
          {
            title: '🟡 Venta pendiente — Nueva cotización VPS',
            color: 16759808,
            fields: [
              { name: 'Nombre', value: name, inline: true },
              { name: 'Email', value: email, inline: true },
              { name: 'Teléfono / WhatsApp', value: phone, inline: true },
              { name: 'País', value: country, inline: true },
              { name: 'Discord', value: discord || 'No indicado', inline: true },
              { name: 'Ubicación preferida', value: ubicacion || 'No indicada', inline: true },
              { name: 'Solicitado', value: solicitado || 'No especificado' },
              { name: 'Mensaje', value: mensaje || 'Sin mensaje extra' }
            ],
            footer: { text: 'kernelshield.xyz — IP: ' + ip },
            timestamp: new Date().toISOString()
          }
        ]
      })
    });

    return res.json({ ok: true, discord: discordRes.ok });
  } catch (err) {
    console.error('Error en /lead-handler:', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('KernelShield lead-handler escuchando en 0.0.0.0:' + PORT);
});
