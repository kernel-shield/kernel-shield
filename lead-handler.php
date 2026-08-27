<?php
/**
 * lead-handler.php — Recepción segura de cotizaciones VPS (Kernel Shield)
 * -------------------------------------------------------------------
 * Por qué existe este archivo:
 * En la versión 100% estática, el webhook de Discord vive expuesto en app.js
 * (visible para cualquiera que abra "Ver código fuente"). Cualquiera podría
 * copiarlo y usarlo para spamear tu canal o, peor, hacer flood de "ventas
 * falsas". Este endpoint corre en TU servidor (requiere hosting con PHP),
 * guarda el webhook aquí (server-side, nunca visible al cliente) y aplica
 * validación + límite de envíos por IP antes de reenviar a Discord/email.
 *
 * CÓMO ACTIVARLO:
 * 1. Sube esta carpeta /api/ a tu hosting con PHP (7.4+).
 * 2. Rellena DISCORD_WEBHOOK_URL y ALLOWED_ORIGIN abajo.
 * 3. En app.js, la función de envío ya intenta usar "/api/lead-handler.php"
 *    primero, y si falla (por ejemplo si sigues en hosting 100% estático)
 *    usa automáticamente el método anterior como respaldo. No tienes que
 *    tocar nada más en el frontend.
 */

// ---- Configuración ----
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1542259087645999297/yHmMqGbIlw5ZMCUBg-xhiQp-GVwODPq6Pv3YrMLGpT1zDLSwl14v1hyNE6LdeBZxXz-o';
const ALLOWED_ORIGIN       = 'https://kernelshield.xyz'; // cambia si usas otro dominio
const NOTIFY_EMAIL         = 'k3rnelshield@gmail.com';
const RATE_LIMIT_MAX       = 4;      // máx. solicitudes...
const RATE_LIMIT_WINDOW    = 600;    // ...por cada 600s (10 min) por IP
const RATE_DIR             = __DIR__ . '/.ratelimit';

// ---- Cabeceras de seguridad básicas ----
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

function respond(int $code, array $body): void {
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

// ---- Solo POST ----
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

// ---- CORS restringido a tu dominio ----
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && $origin !== ALLOWED_ORIGIN) {
    respond(403, ['ok' => false, 'error' => 'origin_not_allowed']);
}
if ($origin === ALLOWED_ORIGIN) {
    header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
}

// ---- Rate limiting simple por IP (archivo local, sin dependencias) ----
function client_ip(): string {
    return $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function rate_limited(string $ip): bool {
    if (!is_dir(RATE_DIR)) {
        @mkdir(RATE_DIR, 0700, true);
    }
    $file = RATE_DIR . '/' . md5($ip) . '.json';
    $now = time();
    $hits = [];
    if (is_file($file)) {
        $raw = json_decode((string) file_get_contents($file), true);
        if (is_array($raw)) {
            $hits = array_filter($raw, fn($t) => $now - $t < RATE_LIMIT_WINDOW);
        }
    }
    if (count($hits) >= RATE_LIMIT_MAX) {
        return true;
    }
    $hits[] = $now;
    @file_put_contents($file, json_encode(array_values($hits)));
    return false;
}

// ---- Lectura y validación del cuerpo ----
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    respond(400, ['ok' => false, 'error' => 'invalid_json']);
}

function clean(string $s, int $max = 500): string {
    $s = strip_tags($s);
    $s = preg_replace('/[\x00-\x1F\x7F]/u', '', $s) ?? '';
    return mb_substr(trim($s), 0, $max);
}

// Honeypot: si el campo "website" viene lleno, es un bot.
if (!empty($data['website'] ?? '')) {
    respond(200, ['ok' => true]); // respondemos "ok" pero no procesamos nada
}

$name    = clean((string) ($data['name'] ?? ''), 80);
$email   = clean((string) ($data['email'] ?? ''), 120);
$phone   = clean((string) ($data['telefono'] ?? ''), 30);
$country = clean((string) ($data['pais'] ?? ''), 60);
$discord = clean((string) ($data['discord'] ?? ''), 60);
$wanted  = clean((string) ($data['solicitado'] ?? ''), 300);
$loc     = clean((string) ($data['ubicacion_preferida'] ?? ''), 60);
$message = clean((string) ($data['mensaje'] ?? ''), 800);

if (mb_strlen($name) < 2) respond(422, ['ok' => false, 'error' => 'invalid_name']);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(422, ['ok' => false, 'error' => 'invalid_email']);
if (mb_strlen($phone) < 5) respond(422, ['ok' => false, 'error' => 'invalid_phone']);
if (mb_strlen($country) < 2) respond(422, ['ok' => false, 'error' => 'invalid_country']);

$ip = client_ip();
if (rate_limited($ip)) {
    respond(429, ['ok' => false, 'error' => 'rate_limited']);
}

// ---- Reenvío a Discord (webhook oculto, nunca llega al navegador) ----
$embed = [
    'username' => 'KernelShield · Ventas',
    'embeds' => [[
        'title' => '🟡 Venta pendiente — Nueva cotización VPS',
        'color' => 16759808,
        'fields' => [
            ['name' => 'Nombre', 'value' => $name, 'inline' => true],
            ['name' => 'Email', 'value' => $email, 'inline' => true],
            ['name' => 'Teléfono / WhatsApp', 'value' => $phone, 'inline' => true],
            ['name' => 'País', 'value' => $country, 'inline' => true],
            ['name' => 'Discord', 'value' => $discord ?: 'No indicado', 'inline' => true],
            ['name' => 'Ubicación preferida', 'value' => $loc ?: 'No indicada', 'inline' => true],
            ['name' => 'Solicitado', 'value' => $wanted ?: 'No especificado'],
            ['name' => 'Mensaje', 'value' => $message ?: 'Sin mensaje extra'],
        ],
        'footer' => ['text' => 'kernelshield.xyz — IP: ' . $ip],
        'timestamp' => date('c'),
    ]],
];

$ch = curl_init(DISCORD_WEBHOOK_URL);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($embed),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 8,
]);
curl_exec($ch);
$discordOk = curl_errno($ch) === 0;
curl_close($ch);

// ---- Notificación por email (usa mail() del servidor; considera SMTP/PHPMailer en producción) ----
$subject = 'Venta pendiente - Cotizacion VPS de ' . $name;
$body = "Nombre: $name\nEmail: $email\nTelefono: $phone\nPais: $country\nDiscord: $discord\n" .
        "Ubicacion preferida: $loc\nSolicitado: $wanted\nMensaje: $message\nIP: $ip\n";
$headers = "From: no-reply@kernelshield.xyz\r\nReply-To: $email\r\n";
@mail(NOTIFY_EMAIL, $subject, $body, $headers);

respond(200, ['ok' => true, 'discord' => $discordOk]);
