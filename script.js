document.addEventListener('DOMContentLoaded', () => {


  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });


  const menuToggle = document.getElementById('menuToggle');
  const navLinks   = document.getElementById('navLinks');
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('open');
    navLinks.classList.toggle('open');
  });

  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      menuToggle.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  
  const tabs       = document.querySelectorAll('.game-card');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + target).classList.add('active');
  
      triggerReveal();
    });
  });


  const revealEls = document.querySelectorAll('.reveal');
  const observer  = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        
        const delay = entry.target.closest('.plans-grid')
          ? Array.from(entry.target.closest('.plans-grid').children).indexOf(entry.target) * 80
          : 0;
        setTimeout(() => entry.target.classList.add('visible'), delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  function triggerReveal() {
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
  }
  triggerReveal();

  const container = document.getElementById('heroParticles');
  if (container) {
    const count = 28;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 4 + 1.5;
      p.style.cssText = `
        width: ${size}px; height: ${size}px;
        left: ${Math.random() * 100}%;
        top: ${40 + Math.random() * 55}%;
        --dur: ${6 + Math.random() * 10}s;
        --delay: ${Math.random() * 8}s;
        --op: ${0.15 + Math.random() * 0.35};
        background: ${Math.random() > 0.7 ? '#0aff70' : '#00e5ff'};
      `;
      container.appendChild(p);
    }
  }

  const backToTop = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const domainBtn    = document.getElementById('domainBtn');
  const domainInput  = document.getElementById('domainInput');
  const domainResult = document.getElementById('domainResult');

  const domainPrices = { xyz: '$5.00', com: '$15.00', net: '$18.00' };

  function checkDomain() {
    const val = domainInput.value.trim().toLowerCase();
    if (!val) { showResult('⚠️ Ingresa un dominio', '#ffc107'); return; }

    const ext = val.includes('.') ? val.split('.').pop() : '';
    const price = domainPrices[ext];

    domainResult.style.color = '';
    if (!ext) {
      showResult('⚠️ Incluye la extensión, ej: misitio.com', '#ffc107');
    } else if (price) {
      showResult(`✅ ${val} — ${price}/año — ¡Disponible!`, '#0aff70');
    } else {
      showResult(`ℹ️ Extensión .${ext} no listada. Consulta vía Discord.`, '#00e5ff');
    }
  }

  function showResult(msg, color) {
    domainResult.textContent = msg;
    domainResult.style.color = color;
    domainResult.style.padding = '8px 0';
  }

  domainBtn.addEventListener('click', checkDomain);
  domainInput.addEventListener('keydown', e => { if (e.key === 'Enter') checkDomain(); });

 
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        const offset = 72; 
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });


  const sections = document.querySelectorAll('section[id], div[id]');
  const navAnchors = document.querySelectorAll('.nav-link');
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navAnchors.forEach(a => {
          a.classList.toggle('active-link', a.getAttribute('href') === '#' + entry.target.id);
        });
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px' });
  sections.forEach(s => io.observe(s));

});

const domainBtn = document.getElementById("domainBtn");
const domainInput = document.getElementById("domainInput");
const domainResult = document.getElementById("domainResult");

if (domainBtn) {

  async function checkDomain() {

    const domain = domainInput.value.trim().toLowerCase();

    if (!domain) {

      domainResult.className = "domain-result error";

      domainResult.innerHTML =
        "❌ Introduce un dominio válido.";

      return;

    }

    domainResult.className = "domain-result loading";

    domainResult.innerHTML =
      "⏳ Verificando dominio...";

    try {

      const response = await fetch(
        `https://dns.google/resolve?name=${domain}`
      );

      const data = await response.json();

      if (data.Answer && data.Answer.length > 0) {

        domainResult.className = "domain-result error";

        domainResult.innerHTML =
          `❌ El dominio <strong>${domain}</strong> ya está en uso.`;

      } else {

        domainResult.className = "domain-result success";

        domainResult.innerHTML =
          `✅ El dominio <strong>${domain}</strong> está disponible.`;

      }

    } catch (error) {

      domainResult.className = "domain-result error";

      domainResult.innerHTML =
        "❌ Error verificando el dominio.";

    }

  }

  domainBtn.addEventListener("click", checkDomain);

  domainInput.addEventListener("keypress", function(e){

    if(e.key === "Enter"){
      checkDomain();
    }

  });

}

/* ============================================================
   PEGAR AL FINAL DE script.js — no borra ni reemplaza nada existente
   Convierte los tabs en "páginas" con URL propia (#/vps, #/samp, etc.)
   y activa el mega menú del navbar
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  const VALID_TABS = ['vps','minecraft','mta','samp','openmp','bots','webhosting','gmod','cs2','fivem','amongus','hl2','l4d2'];

  // ---- Mega menú: abrir/cerrar ----
  const megaTriggerLi = document.querySelector('.has-mega');
  const megaTrigger    = document.getElementById('megaTrigger');
  if (megaTrigger && megaTriggerLi) {
    megaTrigger.addEventListener('click', (e) => {
      // en mobile o si no hay hash target, togglear en vez de navegar
      if (window.innerWidth <= 780) {
        e.preventDefault();
        megaTriggerLi.classList.toggle('open');
      }
    });
    megaTriggerLi.addEventListener('mouseenter', () => {
      if (window.innerWidth > 780) megaTriggerLi.classList.add('open');
    });
    megaTriggerLi.addEventListener('mouseleave', () => {
      if (window.innerWidth > 780) megaTriggerLi.classList.remove('open');
    });
    document.addEventListener('click', (e) => {
      if (!megaTriggerLi.contains(e.target)) megaTriggerLi.classList.remove('open');
    });
  }

  // ---- Navegación tipo "página" ----
  const backBtn = document.getElementById('pageBackBtn');

  function activateTab(tabName) {
    document.querySelectorAll('.game-card').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(tc => {
      tc.classList.toggle('active', tc.id === 'tab-' + tabName);
    });
  }

  function goToService(tabName) {
    if (!VALID_TABS.includes(tabName)) return;
    activateTab(tabName);
    document.body.classList.add('page-mode');
    document.body.classList.remove('catalog-mode');
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    megaTriggerLi && megaTriggerLi.classList.remove('open');
  }

  function goToAllPlans() {
    document.body.classList.add('page-mode', 'catalog-mode');
    document.getElementById('planes').scrollIntoView({ behavior: 'auto' });
    megaTriggerLi && megaTriggerLi.classList.remove('open');
  }

  function goHome() {
    document.body.classList.remove('page-mode', 'catalog-mode');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function handleHash() {
    const hash = window.location.hash; // ej: "#/vps"
    if (!hash || hash === '#') { goHome(); return; }
    const clean = hash.replace('#/', '').replace('#', '');
    if (clean === 'all-plans') { goToAllPlans(); return; }
    if (VALID_TABS.includes(clean)) { goToService(clean); return; }
    goHome();
  }

  // Interceptar los data-tab del mega menú y de las game-card para usar el router
  document.querySelectorAll('[data-tab]').forEach(el => {
    el.addEventListener('click', (e) => {
      const tab = el.dataset.tab;
      if (!tab) return;
      // deja que cambie el hash naturalmente; handleHash hace el resto
      history.pushState(null, '', '#/' + tab);
      handleHash();
      e.preventDefault ? null : null;
    });
  });

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      history.pushState(null, '', window.location.pathname);
      goHome();
    });
  }

  window.addEventListener('popstate', handleHash);
  window.addEventListener('hashchange', handleHash);

  // Deep-link al cargar (ej. compartieron tuweb.com/#/samp)
  handleHash();
});
