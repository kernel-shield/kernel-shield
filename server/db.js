/**
 * db.js — Conexión a Postgres (Supabase, gratis)
 * -------------------------------------------------------------
 * 1. Crea cuenta en https://supabase.com → nuevo proyecto.
 * 2. Ve a Settings → Database → copia el "Connection String" (URI).
 * 3. Pégalo en Render como variable de entorno DATABASE_URL.
 */
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  Falta la variable de entorno DATABASE_URL (conexión a la base de datos).');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // requerido por Supabase
});

module.exports = pool;
