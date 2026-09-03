(() => {
  'use strict';
  document.getElementById('year').textContent = new Date().getFullYear();

  // Boot screen
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bootEl = document.getElementById('bootText');
  const bootScreen = document.getElementById('boot');
  const bootSkipBtn = document.getElementById('bootSkip');
  let bootInterval = null;

  function hideBoot() {
    if (bootInterval) clearInterval(bootInterval);
    bootScreen?.classList.add('hide');
  }

  if (prefersReducedMotion) {
    hideBoot();
  } else {
    const bootLines = ['inicializando kernelshield…', 'verificando nodo · miami, fl', 'protección ddos: en línea', 'listo.'];
    let bi = 0;
    bootInterval = setInterval(() => {
      bi++;
      if (bi < bootLines.length) bootEl.textContent = bootLines[bi];
    }, 260);
    window.addEventListener('load', () => setTimeout(hideBoot, 900));
    setTimeout(hideBoot, 1800); // límite duro, nunca bloquea más de ~1.8s
    bootSkipBtn?.addEventListener('click', hideBoot);
  }

  // ====== REGIONES / ESTADO DE RED (sincroniza hero, VPS y datacenter) ======
  const REGIONS = [
    { key: 'miami', label: 'Miami, FL', status: 'stock', ping: 9, pos: { top: 54, left: 57 } },
    { key: 'la', label: 'Los Ángeles, CA', status: 'stock', ping: 24, pos: { top: 44, left: 14 } },
    { key: 'dallas', label: 'Dallas, TX', status: 'stock', ping: 17, pos: { top: 56, left: 33 } },
    { key: 'chile', label: 'Santiago, Chile', status: 'stock', ping: 46, pos: { top: 90, left: 46 } },
    { key: 'asia', label: 'Asia (Hong Kong)', status: 'soon', ping: null, pos: { top: 20, left: 88 } }
  ];
  let selectedRegionKey = 'miami';
  let currentLocation = 'Miami, FL';

  function jitter(base) {
    return base + Math.floor(Math.random() * 5) - 2;
  }

  function renderRegionsBar() {
    const netRegions = document.getElementById('netRegions');
    if (!netRegions) return;
    netRegions.innerHTML = REGIONS.map(r =>
      '<button type="button" class="net-region-btn' + (r.key === selectedRegionKey ? ' active' : '') +
      (r.status === 'soon' ? ' is-soon' : '') + '" data-region="' + r.key + '">' + r.label + '</button>'
    ).join('');
    netRegions.querySelectorAll('.net-region-btn').forEach(btn => {
      btn.addEventListener('click', () => selectRegion(btn.dataset.region));
    });
  }

  function renderReadout() {
    const r = REGIONS.find(x => x.key === selectedRegionKey);
    const readout = document.getElementById('netReadout');
    if (!readout || !r) return;
    if (r.status === 'soon') {
      readout.innerHTML =
        '<div class="nr-loc"><span class="nr-dot soon"></span>' + r.label + '</div>' +
        '<div class="nr-row"><span>Estado</span><b>Próximamente</b></div>' +
        '<div class="nr-row"><span>Red</span><b>En expansión</b></div>' +
        '<div class="nr-row"><span>Notificarme</span><b>Vía Discord</b></div>';
    } else {
      readout.innerHTML =
        '<div class="nr-loc"><span class="nr-dot stock"></span>' + r.label + '</div>' +
        '<div class="nr-row"><span>Latencia estimada</span><b>~' + jitter(r.ping) + ' ms</b></div>' +
        '<div class="nr-row"><span>Anti-DDoS</span><b>10 Tbps</b></div>' +
        '<div class="nr-row"><span>Disponibilidad</span><b>Según stock</b></div>';
    }
  }

  function renderDcFacts() {
    const dcFacts = document.getElementById('dcFacts');
    if (!dcFacts) return;
    dcFacts.innerHTML = REGIONS.map(r =>
      '<div class="dc-fact' + (r.key === selectedRegionKey ? ' active' : '') + (r.status === 'soon' ? ' is-soon' : '') +
      '" data-region="' + r.key + '"><span class="fdot"></span>' + r.label + ' — ' +
      (r.status === 'soon' ? 'Próximamente' : 'Según stock') + '</div>'
    ).join('') + '<div class="dc-fact"><span class="fdot"></span>DDoS 10 Tbps · Anti-DDoS en todos los nodos</div>' +
      '<div class="dc-fact"><span class="fdot"></span>Monitoreo y energía 24/7</div>';
    dcFacts.querySelectorAll('.dc-fact[data-region]').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => selectRegion(el.dataset.region));
    });
  }

  function renderMapPin() {
    const r = REGIONS.find(x => x.key === selectedRegionKey);
    const pin = document.getElementById('mapPin');
    const label = document.getElementById('mapPinLabel');
    if (!pin || !r) return;
    pin.style.top = r.pos.top + '%';
    pin.style.left = r.pos.left + '%';
    label.textContent = r.label + (r.status === 'soon' ? ' — Próximamente' : ' — Según stock');
    pin.querySelector('.pin-dot').classList.toggle('is-soon', r.status === 'soon');
  }

  function syncLocOptions() {
    const r = REGIONS.find(x => x.key === selectedRegionKey);
    if (!r) return;
    document.querySelectorAll('.loc-opt').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.loc === r.label);
    });
    currentLocation = r.label;
  }

  function selectRegion(key) {
    selectedRegionKey = key;
    renderRegionsBar();
    renderReadout();
    renderDcFacts();
    renderMapPin();
    syncLocOptions();
  }

  renderRegionsBar();
  renderReadout();
  renderDcFacts();
  renderMapPin();
  if (!prefersReducedMotion) setInterval(renderReadout, 4000);

  // Medidor de latencia REAL (ping de verdad a tu backend en vivo, sin inventar nada)
  document.getElementById('realPingBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('realPingBtn');
    const out = document.getElementById('realPingResult');
    btn.disabled = true;
    btn.textContent = 'Midiendo…';
    out.textContent = '';
    try {
      const t0 = performance.now();
      await fetch(LEAD_ENDPOINT.replace('/lead-handler', '/health'), { cache: 'no-store' });
      const ms = Math.round(performance.now() - t0);
      out.innerHTML = 'Latencia real medida ahora: <b>' + ms + ' ms</b> (servidor en Oregon, EEUU)';
    } catch (err) {
      out.textContent = 'No se pudo medir ahora mismo (el servidor puede estar despertando, intenta de nuevo en unos segundos).';
    }
    btn.disabled = false;
    btn.textContent = 'Medir de nuevo →';
  });

  // ====== PLANES POR JUEGO ======
  const SPEC_ICONS = {
    slots: '<svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" stroke-linecap="round"/></svg>',
    ram: '<svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="7" width="16" height="10" rx="1.5"/><path d="M8 7V4M12 7V4M16 7V4M8 20v-3M12 20v-3M16 20v-3" stroke-linecap="round"/></svg>',
    ssd: '<svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18" stroke-linecap="round"/><circle cx="7.5" cy="14.5" r="1" fill="currentColor" stroke="none"/></svg>',
    cpu: '<svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3" stroke-linecap="round"/></svg>',
    db: '<svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" stroke-linecap="round"/></svg>',
    price: '<svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20M17 5.5c0-1.9-2.2-3.5-5-3.5s-5 1.6-5 3.5S9.2 9 12 9s5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5" stroke-linecap="round"/></svg>'
  };
  const GAMEPAD_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 8h12l2 9a2.4 2.4 0 0 1-4.3 1.9L14 17h-4l-1.7 1.9A2.4 2.4 0 0 1 4 17l2-9Z"/><path d="M9 11v3M7.5 12.5h3" stroke-linecap="round"/><circle cx="16" cy="11.5" r=".9" fill="currentColor" stroke="none"/><circle cx="18" cy="13.5" r=".9" fill="currentColor" stroke="none"/></svg>';

  function planRow(icon, label) {
    return '<li>' + SPEC_ICONS[icon] + '<span>' + label + '</span></li>';
  }

  function buildPlanCard(p, isPopular) {
    const slotsRow = p.slots ? planRow('slots', p.slots + ' slots') : (p.sites ? planRow('slots', p.sites + ' sitios') : '');
    return '<article class="plan-card' + (isPopular ? ' popular' : '') + '">' +
      '<div class="plan-name">' + p.name + '</div>' +
      '<div class="plan-price">' + p.price + ' <small>/mes</small></div>' +
      '<ul class="plan-specs has-icons">' +
        slotsRow +
        planRow('ram', p.ram + ' RAM') +
        planRow('ssd', p.ssd + ' SSD') +
        planRow('cpu', p.cpu + ' CPU') +
        planRow('db', p.gestion) +
      '</ul>' +
      '<a href="https://discord.gg/Twh4CVvZ3A" target="_blank" rel="noopener" class="btn ' + (isPopular ? 'btn-primary' : 'btn-ghost') + ' btn-full">Comprar Ahora</a>' +
    '</article>';
  }

  const GAME_PLANS = {
    minecraft: { title: 'Minecraft', plans: [
      { name: 'Micro', slots: 15, ram: '1 GB', ssd: '2 GB', cpu: '100%', price: '$1', gestion: '1-DB / 0-Backup' },
      { name: 'Starter', slots: 25, ram: '3 GB', ssd: '4 GB', cpu: '150%', price: '$3', gestion: '2-DB / 1-Backup' },
      { name: 'Advanced', slots: 35, ram: '5 GB', ssd: '6 GB', cpu: '250%', price: '$5', gestion: '3-DB / 2-Backup' },
      { name: 'Premium', slots: 45, ram: '6 GB', ssd: '11 GB', cpu: '300%', price: '$7', gestion: '4-DB / 3-Backup' },
      { name: 'Enterprise', slots: 'Cust', ram: 'Ilim', ssd: 'Ilim', cpu: 'Ilim', price: '$11', gestion: '5-DB / 5-Backup' }
    ]},
    samp: { title: 'SA-MP', plans: [
      { name: 'Micro', slots: 50, ram: '1 GB', ssd: '1 GB', cpu: '50%', price: '$1', gestion: '1-DB / 0-Backup' },
      { name: 'Starter', slots: 100, ram: '2 GB', ssd: '2 GB', cpu: '100%', price: '$2', gestion: '2-DB / 1-Backup' },
      { name: 'Advanced', slots: 200, ram: '3 GB', ssd: '3 GB', cpu: '150%', price: '$3', gestion: '3-DB / 2-Backup' },
      { name: 'Premium', slots: 300, ram: '4 GB', ssd: '4 GB', cpu: '250%', price: '$4', gestion: '4-DB / 3-Backup' },
      { name: 'Enterprise', slots: 'Cust', ram: 'Ilim', ssd: 'Ilim', cpu: 'Ilim', price: '$5', gestion: '5-DB / 5-Backup' }
    ]},
    openmp: { title: 'Open MP', plans: [
      { name: 'Micro', slots: 50, ram: '1 GB', ssd: '1 GB', cpu: '50%', price: '$1', gestion: '1-DB / 0-Backup' },
      { name: 'Starter', slots: 100, ram: '2 GB', ssd: '2 GB', cpu: '80%', price: '$2', gestion: '2-DB / 1-Backup' },
      { name: 'Advanced', slots: 200, ram: '3 GB', ssd: '4 GB', cpu: '130%', price: '$4', gestion: '4-DB / 2-Backup' },
      { name: 'Premium', slots: 300, ram: '4 GB', ssd: '5 GB', cpu: '180%', price: '$6', gestion: '5-DB / 4-Backup' },
      { name: 'Enterprise', slots: 'Cust', ram: 'Ilim', ssd: 'Ilim', cpu: 'Ilim', price: '$8', gestion: '6-DB / 6-Backup' }
    ]},
    mta: { title: 'MTA', plans: [
      { name: 'Micro', slots: 20, ram: '1 GB', ssd: '2 GB', cpu: '50%', price: '$1', gestion: '1-DB / 1-Backup' },
      { name: 'Starter', slots: 64, ram: '3 GB', ssd: '4 GB', cpu: '100%', price: '$3', gestion: '2-DB / 1-Backup' },
      { name: 'Advanced', slots: 128, ram: '4 GB', ssd: '6 GB', cpu: '150%', price: '$5', gestion: '3-DB / 2-Backup' },
      { name: 'Premium', slots: 256, ram: '6 GB', ssd: '9 GB', cpu: '250%', price: '$7', gestion: '4-DB / 3-Backup' },
      { name: 'Enterprise', slots: 'Cust', ram: 'Ilim', ssd: 'Ilim', cpu: 'Ilim', price: '$11', gestion: '5-DB / 5-Backup' }
    ]},
    cs2: { title: 'Counter Strike 2', plans: [
      { name: 'Micro', slots: 12, ram: '2 GB', ssd: '5 GB', cpu: '100%', price: '$4', gestion: '1-DB / 1-Backup' },
      { name: 'Starter', slots: 20, ram: '4 GB', ssd: '8 GB', cpu: '150%', price: '$7', gestion: '2-DB / 1-Backup' },
      { name: 'Advanced', slots: 32, ram: '6 GB', ssd: '10 GB', cpu: '200%', price: '$10', gestion: '3-DB / 2-Backup' },
      { name: 'Premium', slots: 48, ram: '8 GB', ssd: '15 GB', cpu: '250%', price: '$15', gestion: '4-DB / 3-Backup' },
      { name: 'Enterprise', slots: 64, ram: '12 GB', ssd: '20 GB', cpu: '300%', price: '$22', gestion: '5-DB / 5-Backup' }
    ]},
    gmod: { title: "Garry's Mod", plans: [
      { name: 'Micro', slots: 16, ram: '2 GB', ssd: '5 GB', cpu: '100%', price: '$4', gestion: '1-DB / 1-Backup' },
      { name: 'Starter', slots: 32, ram: '4 GB', ssd: '8 GB', cpu: '150%', price: '$7', gestion: '2-DB / 1-Backup' },
      { name: 'Advanced', slots: 64, ram: '6 GB', ssd: '12 GB', cpu: '200%', price: '$10', gestion: '3-DB / 2-Backup' },
      { name: 'Premium', slots: 96, ram: '8 GB', ssd: '18 GB', cpu: '250%', price: '$15', gestion: '4-DB / 3-Backup' },
      { name: 'Enterprise', slots: 'Cust', ram: 'Ilim', ssd: 'Ilim', cpu: 'Ilim', price: '$22', gestion: '5-DB / 5-Backup' }
    ]},
    fivem: { title: 'FiveM', plans: [
      { name: 'Micro', slots: 16, ram: '3 GB', ssd: '6 GB', cpu: '100%', price: '$4', gestion: '1-DB / 1-Backup' },
      { name: 'Starter', slots: 32, ram: '5 GB', ssd: '10 GB', cpu: '150%', price: '$9', gestion: '2-DB / 1-Backup' },
      { name: 'Advanced', slots: 64, ram: '8 GB', ssd: '15 GB', cpu: '200%', price: '$13', gestion: '3-DB / 2-Backup' },
      { name: 'Premium', slots: 96, ram: '12 GB', ssd: '20 GB', cpu: '250%', price: '$20', gestion: '4-DB / 3-Backup' },
      { name: 'Enterprise', slots: 128, ram: '16 GB', ssd: '30 GB', cpu: '300%', price: '$26', gestion: '5-DB / 5-Backup' }
    ]},
    amongus: { title: 'Among Us', plans: [
      { name: 'Micro', slots: 10, ram: '512 MB', ssd: '1 GB', cpu: '25%', price: '$1', gestion: '1-DB / 1-Backup' },
      { name: 'Starter', slots: 15, ram: '1 GB', ssd: '2 GB', cpu: '50%', price: '$3', gestion: '2-DB / 1-Backup' },
      { name: 'Advanced', slots: 30, ram: '2 GB', ssd: '3 GB', cpu: '100%', price: '$4', gestion: '3-DB / 2-Backup' },
      { name: 'Premium', slots: 50, ram: '3 GB', ssd: '5 GB', cpu: '150%', price: '$5', gestion: '4-DB / 3-Backup' },
      { name: 'Enterprise', slots: 'Cust', ram: 'Ilim', ssd: 'Ilim', cpu: 'Ilim', price: '$9', gestion: '5-DB / 5-Backup' }
    ]}
  };
  const GAME_LABELS = { rust: 'Rust', csgo: 'CS:GO', hytale: 'Hytale', haxball: 'Haxball' };

  const gpPanel = document.getElementById('gamePlansPanel');
  const gpTitle = document.getElementById('gpTitle');
  const gpIcon = document.getElementById('gpIcon');
  const gpGrid = document.getElementById('gpGrid');
  const gpClose = document.getElementById('gpClose');
  const gameChips = document.querySelectorAll('.game-chip');
  let activeGame = null;

  function renderGame(key) {
    const data = GAME_PLANS[key];
    gpIcon.innerHTML = GAMEPAD_ICON;
    if (!data) {
      gpTitle.textContent = GAME_LABELS[key] || key;
      gpGrid.innerHTML = '<div class="gp-empty">Soporte para <strong>' + (GAME_LABELS[key] || key) +
        '</strong> próximamente. Escríbenos por <a href="https://discord.gg/Twh4CVvZ3A" target="_blank" rel="noopener" style="color:var(--blue)">Discord</a> si lo necesitas ya.</div>';
      return;
    }
    gpTitle.textContent = data.title;
    gpGrid.innerHTML = data.plans.map((p, i) => buildPlanCard(p, i === 3)).join('');
  }

  function openGame(key) {
    gameChips.forEach(c => c.classList.toggle('active', c.dataset.game === key));
    renderGame(key);
    gpPanel.hidden = false;
    activeGame = key;
    requestAnimationFrame(() => gpPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }
  function closeGamePanel() {
    gpPanel.hidden = true;
    gameChips.forEach(c => c.classList.remove('active'));
    activeGame = null;
  }
  gameChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.game;
      if (activeGame === key) { closeGamePanel(); return; }
      openGame(key);
    });
  });
  gpClose?.addEventListener('click', closeGamePanel);

  // ====== MÉTODOS DE PAGO POR PAÍS ======
  const PAY_ICONS = {
    paypal: '<svg viewBox="0 0 24 24" fill="none"><path d="M7.5 19.5h2.2l.5-3.1h1.7c2.8 0 4.4-1.4 4.8-3.7.5-2.6-.9-4-3.4-4H9.6L7.5 19.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9.2 8.7h3.1c1.5 0 2.4.7 2.1 2.1-.3 1.5-1.5 2.1-3 2.1H9.8l-.6-4.2Z" fill="currentColor" opacity=".35"/><path d="M6 4h7.2c2.6 0 4.3 1.5 3.9 4.1-.5 3.2-2.6 4.4-5.5 4.4H9.4L8.4 18H6L6 4Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    binance: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3 4.5 7.5v4.2c0 4.8 3.3 8.1 7.5 9.3 4.2-1.2 7.5-4.5 7.5-9.3V7.5L12 3Z" stroke="currentColor" stroke-width="1.5"/><path d="M12 8v4l2.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
    crypto: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 8.5h2.6c1.2 0 2 .6 2 1.7s-.8 1.7-2 1.7H10m0 0h2.9c1.3 0 2.1.6 2.1 1.8s-.8 1.8-2.1 1.8H10m0-8.6v8.6m-1.4 0h1.4m0-8.6h-1.4M9.8 6.8v1.7m0 6.8v1.9m2.6-10.4V6.8m0 8.5v1.9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    airtm: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 12.5c1.2 1.8 3 2.7 4 2.7s2.8-.9 4-2.7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M9.2 9.2h.01M14.8 9.2h.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 10h18" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="14.5" r="1.2" fill="currentColor"/><path d="M12 13.5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    bank: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3 3 8.5h18L12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 11v7M9.5 11v7M14.5 11v7M19 11v7M3 21h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    mercadopago: '<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="2.5" width="12" height="19" rx="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 5.5h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="16.5" r="1.3" fill="currentColor"/><path d="M9.5 10.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5-1 2.2-2.5 2.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    nequi: '<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="2.5" width="12" height="19" rx="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 5.5h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="16.5" r="1.3" fill="currentColor"/></svg>',
    mobile: '<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="2.5" width="12" height="19" rx="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 5.5h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M9 15.5h6M9 18h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
  };
  const PAY_DATA = {
    intl: { label: 'Internacional', methods: [
      { name: 'PayPal', note: 'Pagos internacionales al instante', icon: 'paypal' },
      { name: 'Binance Pay', note: 'Pago directo desde tu wallet Binance', icon: 'binance' },
      { name: 'Criptomonedas', note: 'BTC, USDT y otras redes', icon: 'crypto' },
      { name: 'AirTM', note: 'Wallet digital multi-país', icon: 'airtm' },
      { name: 'Visa', note: 'Tarjeta de crédito o débito', icon: 'card' }
    ]},
    do: { label: '🇩🇴 Rep. Dominicana', methods: [
      { name: 'Banreservas', note: 'Transferencia desde cualquier banco hacia Banreservas', icon: 'bank' }
    ]},
    co: { label: '🇨🇴 Colombia', methods: [
      { name: 'Nequi', note: 'Transferencia desde cualquier banco hacia Nequi', icon: 'nequi' }
    ]},
    ve: { label: '🇻🇪 Venezuela', methods: [
      { name: 'Pago Móvil', note: 'Pago móvil interbancario', icon: 'mobile' }
    ]},
    ar: { label: '🇦🇷 Argentina', methods: [
      { name: 'Mercado Pago', note: 'Pago instantáneo con Mercado Pago', icon: 'mercadopago' }
    ]},
    cr: { label: '🇨🇷 Costa Rica', methods: [
      { name: 'Transferencia bancaria', note: 'Transferencias en toda Costa Rica', icon: 'bank' }
    ]}
  };
  let selectedPayTab = 'intl';

  function renderPayTabs() {
    const tabsEl = document.getElementById('payTabs');
    if (!tabsEl) return;
    tabsEl.innerHTML = Object.keys(PAY_DATA).map(key =>
      '<button type="button" class="pay-tab' + (key === selectedPayTab ? ' active' : '') +
      '" data-pay="' + key + '">' + PAY_DATA[key].label + '</button>'
    ).join('');
    tabsEl.querySelectorAll('.pay-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedPayTab = btn.dataset.pay;
        renderPayTabs();
        renderPayPanel();
      });
    });
  }
  function renderPayPanel() {
    const panel = document.getElementById('payPanel');
    if (!panel) return;
    const methods = PAY_DATA[selectedPayTab].methods;
    panel.innerHTML = '<div class="pay-grid">' + methods.map(m =>
      '<div class="pay-chip"><span class="pay-icon" aria-hidden="true">' + PAY_ICONS[m.icon] + '</span>' +
      '<span class="pay-text"><span class="pay-name">' + m.name + '</span><span class="pay-note">' + m.note + '</span></span></div>'
    ).join('') + '</div>';
  }
  renderPayTabs();
  renderPayPanel();


  // ====== ILUSTRACIÓN 3D (isométrica) DE LA SALA DE SERVIDORES ======
  (function renderDatacenterShowcase() {
    const group = document.getElementById('dcsRacks');
    if (!group) return;
    const rackCount = 5;
    const w = 100, h = 150, d = 16, gap = 34, startX = 90, y = 95;
    let svg = '';
    for (let i = 0; i < rackCount; i++) {
      const x = startX + i * (w + gap);
      const ledColors = ['#33d69f', '#33d69f', '#3d7fff', '#33d69f', '#ffb020'];
      svg +=
        '<polygon points="' + x + ',' + y + ' ' + (x + w) + ',' + y + ' ' + (x + w - d) + ',' + (y - d) + ' ' + (x - d) + ',' + (y - d) +
        '" fill="url(#rackTop)"/>' +
        '<polygon points="' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + h) + ' ' + (x + w + d) + ',' + (y + h - d) + ' ' + (x + w + d) + ',' + (y - d) +
        '" fill="url(#rackSide)"/>' +
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" fill="url(#rackFace)" stroke="#262b38" stroke-width="1"/>';
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {
          const lx = x + 14 + col * 26;
          const ly = y + 14 + row * 26;
          const delay = ((i * 7 + row * 3 + col) % 10) * 0.22;
          svg += '<rect class="dcs-led" x="' + lx + '" y="' + ly + '" width="10" height="4" rx="1.5" fill="' +
            ledColors[(row + col + i) % ledColors.length] + '" style="animation-delay:' + delay.toFixed(2) + 's"/>';
        }
      }
    }
    group.innerHTML = svg;
  })();

  // Dropdown "Más" del menú
  const navMoreBtn = document.getElementById('navMoreBtn');
  const navMoreMenu = document.getElementById('navMoreMenu');
  navMoreBtn?.addEventListener('click', e => {
    e.stopPropagation();
    const open = navMoreMenu.classList.toggle('open');
    navMoreBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', e => {
    if (navMoreMenu?.classList.contains('open') && !navMoreMenu.contains(e.target) && e.target !== navMoreBtn) {
      navMoreMenu.classList.remove('open');
      navMoreBtn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && navMoreMenu?.classList.contains('open')) {
      navMoreMenu.classList.remove('open');
      navMoreBtn.setAttribute('aria-expanded', 'false');
    }
  });

  document.querySelector('.burger')?.addEventListener('click', () => {
    const links = document.querySelector('.nav-links');
    const visible = links.style.display === 'flex';
    links.style.display = visible ? 'none' : 'flex';
    if (!visible) {
      links.style.cssText +=
        'position:absolute;top:74px;left:0;right:0;background:#0d0f15;flex-direction:column;padding:20px 32px;border-bottom:1px solid #22262f;z-index:100;';
    }
  });

  // VPS tabs
  function openVpsPanel(name) {
    document.querySelectorAll('.vps-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.panel === name);
    });
    document.querySelectorAll('.vps-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('panel-' + name);
    if (panel) panel.classList.add('active');
  }

  document.querySelectorAll('.vps-tab').forEach(tab => {
    tab.addEventListener('click', () => openVpsPanel(tab.dataset.panel));
  });

  // "Configurar ahora" / links a #configurador → abrir tab custom + scroll
  function goToConfigurator(e) {
    if (e) e.preventDefault();
    openVpsPanel('custom');
    // esperar un frame para que el panel sea visible antes del scroll
    requestAnimationFrame(() => {
      const el = document.getElementById('configurador') || document.getElementById('vps');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    history.replaceState(null, '', '#configurador');
  }

  document.querySelectorAll('a[href="#configurador"]').forEach(a => {
    a.addEventListener('click', goToConfigurator);
  });

  // Si entra directo con #configurador en la URL
  if (location.hash === '#configurador') {
    setTimeout(goToConfigurator, 400);
  }

  // Ubicación preferida (clic en la barra de VPS también sincroniza el estado de red)
  document.querySelectorAll('.loc-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const match = REGIONS.find(r => r.label === btn.dataset.loc);
      if (match) selectRegion(match.key);
    });
  });

  // Configurador (sin precio instantáneo — solo arma la solicitud)
  let currentType = 'xeon';
  const cpuRange = document.getElementById('cpuRange');
  const ramRange = document.getElementById('ramRange');
  const storageRange = document.getElementById('storageRange');
  const TYPE_LABEL = { xeon: 'Intel Xeon', epyc: 'AMD Ryzen EPYC' };

  function updateSummary() {
    if (!cpuRange) return;
    const cpu = +cpuRange.value;
    const ram = +ramRange.value;
    const storage = +storageRange.value;
    document.getElementById('cpuValue').textContent = cpu;
    document.getElementById('ramValue').textContent = ram;
    document.getElementById('storageValue').textContent = storage;
    document.getElementById('sumCpu').textContent = cpu;
    document.getElementById('sumRam').textContent = ram + ' GB';
    document.getElementById('sumStorage').textContent = storage + ' GB';
    document.getElementById('sumType').textContent = TYPE_LABEL[currentType];
  }
  if (cpuRange) {
    [cpuRange, ramRange, storageRange].forEach(el => el.addEventListener('input', updateSummary));
    updateSummary();
  }
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentType = btn.dataset.type || 'xeon';
      updateSummary();
    });
  });

  function getConfig() {
    const cpu = cpuRange ? +cpuRange.value : 2;
    const ram = ramRange ? +ramRange.value : 4;
    const storage = storageRange ? +storageRange.value : 50;
    return { cpu, ram, storage, type: currentType };
  }
  function sanitize(s) {
    return String(s || '')
      .replace(/[<>]/g, '')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim()
      .slice(0, 500);
  }
  function buildConfigText(planOverride) {
    if (planOverride) {
      return [
        '—— Plan de referencia ——',
        planOverride,
        'Ubicación preferida: ' + currentLocation,
        '————————'
      ].join('\n');
    }
    const c = getConfig();
    return [
      '—— Configuración a medida ——',
      'Procesador: ' + TYPE_LABEL[c.type],
      'vCPU / Cores: ' + c.cpu,
      'RAM: ' + c.ram + ' GB',
      'Disco: ' + c.storage + ' GB NVMe',
      'Ubicación preferida: ' + currentLocation,
      '————————'
    ].join('\n');
  }

  // Quote modal
  const modal = document.getElementById('quoteModal');
  const quoteForm = document.getElementById('quoteForm');
  const quoteSuccess = document.getElementById('quoteSuccess');
  let selectedPlanText = null;

  function openModal(planOverride) {
    selectedPlanText = planOverride || null;
    if (planOverride) {
      document.getElementById('configPreview').innerHTML =
        '<strong>' + planOverride + '</strong><br>Ubicación preferida: ' + currentLocation;
    } else {
      const c = getConfig();
      document.getElementById('configPreview').innerHTML =
        '<strong>' + TYPE_LABEL[c.type] + '</strong> · ' + c.cpu + ' vCPU/cores · ' + c.ram + ' GB RAM · ' + c.storage +
        ' GB NVMe<br>Ubicación preferida: ' + currentLocation;
    }
    quoteForm.hidden = false;
    quoteSuccess.hidden = true;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('open'));
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.classList.remove('open');
    setTimeout(() => {
      modal.hidden = true;
      document.body.style.overflow = '';
    }, 250);
  }
  document.getElementById('openQuoteBtn')?.addEventListener('click', () => openModal(null));
  document.querySelectorAll('.quote-plan-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      openModal(btn.dataset.plan || null);
    });
  });
  document.getElementById('closeQuoteBtn')?.addEventListener('click', closeModal);
  document.getElementById('closeSuccessBtn')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal?.classList.contains('open')) closeModal();
  });

  document.getElementById('copyConfigBtn')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(buildConfigText(selectedPlanText));
      document.getElementById('copyConfigBtn').textContent = '¡Copiado!';
      setTimeout(() => {
        document.getElementById('copyConfigBtn').textContent = 'Copiar datos';
      }, 2000);
    } catch (_) {}
  });

  // ====== ENVÍO DE COTIZACIÓN → k3rnelshield@gmail.com + Discord ======
  // Funciona para CUALQUIER cliente desde CUALQUIER país
  // ⚠️ El webhook de Discord YA NO vive aquí. Ahora corre en tu propio
  // backend Node.js (carpeta /server, para subir a tu Pterodactyl).
  // Cambia LEAD_ENDPOINT por tu subdominio real una vez lo despliegues
  // (instrucciones en server/DEPLOY-PTERODACTYL.md).
  const LEAD_ENDPOINT = 'https://kernel-shield.onrender.com/lead-handler';

  quoteForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (document.getElementById('hpWebsite')?.value) return;

    const name = sanitize(document.getElementById('qName').value);
    const email = sanitize(document.getElementById('qEmail').value);
    const phone = sanitize(document.getElementById('qPhone').value);
    const country = sanitize(document.getElementById('qCountry').value);
    const discord = sanitize(document.getElementById('qDiscord').value);
    const message = sanitize(document.getElementById('qMessage').value);

    if (!name || name.length < 2) {
      document.getElementById('qName').focus();
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.getElementById('qEmail').focus();
      return;
    }
    if (!phone || phone.length < 5) {
      document.getElementById('qPhone').focus();
      return;
    }
    if (!country || country.length < 2) {
      document.getElementById('qCountry').focus();
      return;
    }

    const btn = document.getElementById('submitQuoteBtn');
    const orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Enviando…';

    const solicitado = selectedPlanText || (() => {
      const c = getConfig();
      return TYPE_LABEL[c.type] + ' · ' + c.cpu + ' vCPU/cores · ' + c.ram + ' GB RAM · ' + c.storage + ' GB NVMe (a medida)';
    })();

    const formBody = {
      _subject: 'Venta pendiente — Cotización VPS de ' + name,
      _template: 'table',
      _captcha: 'false',
      name: name,
      email: email,
      replyto: email,
      telefono: phone,
      pais: country,
      discord: discord || 'No indicado',
      solicitado: solicitado,
      ubicacion_preferida: currentLocation,
      mensaje: message || 'Sin mensaje extra',
      origen: 'kernelshield.xyz – sistema de cotización VPS'
    };

    let sent = false;

    // 1) Tu backend Node.js (Pterodactyl) — oculta el webhook de Discord
    // y aplica rate-limiting server-side. Si aún no lo desplegaste, esto
    // falla silenciosamente y seguimos con el respaldo por email de abajo.
    try {
      const resLead = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: document.getElementById('hpWebsite')?.value || '',
          name: name,
          email: email,
          telefono: phone,
          pais: country,
          discord: discord,
          solicitado: solicitado,
          ubicacion_preferida: currentLocation,
          mensaje: message
        })
      });
      if (resLead.ok) {
        const dataLead = await resLead.json().catch(() => ({}));
        if (dataLead && dataLead.ok) sent = true;
      }
    } catch (err) {
      /* backend Node aún no disponible: seguimos con el respaldo de abajo */
    }

    // 2) Web3Forms (key correcta) → llega a tu Gmail
    // ⚠️ IMPORTANTE: entra a https://web3forms.com/ → tu dashboard → esta key
    // y activa "Allowed Domains" poniendo solo kernelshield.xyz.
    // Así, aunque alguien copie esta key del código fuente, no podrá usarla desde otro sitio.
    const WEB3FORMS_KEY = 'dee72bfa-1550-49b0-84cd-4ee8c9e4efa2';
    if (!sent) try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: formBody._subject,
          from_name: 'KernelShield',
          name: name,
          email: email,
          replyto: email,
          telefono: formBody.telefono,
          pais: formBody.pais,
          discord: formBody.discord,
          solicitado: formBody.solicitado,
          ubicacion_preferida: formBody.ubicacion_preferida,
          mensaje: formBody.mensaje,
          origen: formBody.origen
        })
      });
      const data = await res.json().catch(() => ({}));
      if (data && data.success) {
        sent = true;
      } else {
        /* silent */
      }
    } catch (err) {
      /* silent */
    }

    // 3) FormSubmit backup → también a k3rnelshield@gmail.com
    if (!sent) {
      try {
        const res2 = await fetch('https://formsubmit.co/ajax/k3rnelshield@gmail.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(formBody)
        });
        const data2 = await res2.json().catch(() => ({}));
        if (res2.ok || data2.success === true || data2.success === 'true') {
          sent = true;
        } else {
          /* silent */
        }
      } catch (err) {
        /* silent */
      }
    }

    // 4) Último recurso: mailto del cliente
    if (!sent) {
      const body =
        'Nueva cotización VPS\n\n' +
        'Nombre: ' + name + '\n' +
        'Email: ' + email + '\n' +
        'Teléfono / WhatsApp: ' + phone + '\n' +
        'País: ' + country + '\n' +
        'Discord: ' + (discord || '—') + '\n\n' +
        buildConfigText(selectedPlanText) + '\n' +
        (message ? '\nMensaje:\n' + message + '\n' : '') +
        '\n— kernelshield.xyz';
      window.location.href =
        'mailto:k3rnelshield@gmail.com?subject=' +
        encodeURIComponent('Cotización VPS – ' + name) +
        '&body=' +
        encodeURIComponent(body);
    }

    quoteForm.hidden = true;
    quoteSuccess.hidden = false;
    btn.disabled = false;
    btn.textContent = orig;
  });
})();

// Estado de sesión en la barra de navegación
(() => {
  'use strict';
  const link = document.getElementById('navAuthLink');
  if (!link) return;
  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then(res => (res.ok ? res.json() : null))
    .then(data => {
      if (data && data.user) {
        link.textContent = data.user.name.split(' ')[0];
        link.href = '/cuenta.html';
      }
    })
    .catch(() => {});
})();
