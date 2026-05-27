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