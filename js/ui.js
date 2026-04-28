/**
 * ui.js (UI/UX only)
 * Couche d'amélioration visuelle: animations, counters, carousel, sticky header state.
 *
 * Contraintes respectées:
 * - Ne modifie pas la logique métier Vue / localStorage
 * - Ne change pas les workflows existants
 * - Progressive enhancement: si une lib CDN manque, le site reste fonctionnel
 */

function onReady(fn) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
  else fn();
}

function safeNumber(text) {
  const n = Number(String(text).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function initHeaderMicroUX() {
  const header = document.querySelector(".siteHeader");
  if (!header) return;

  const set = () => {
    header.classList.toggle("siteHeader--scrolled", window.scrollY > 6);
  };
  set();
  window.addEventListener("scroll", set, { passive: true });
}

function initWow() {
  if (!window.WOW) return;
  try {
    new window.WOW({ live: false, offset: 70, mobile: true }).init();
  } catch {
    // ignore
  }
}

function initCounters() {
  const nodes = Array.from(document.querySelectorAll("[data-counter]"));
  if (nodes.length === 0) return;

  const animate = (el) => {
    const target = Number(el.getAttribute("data-counter-target") || "0");
    const suffix = el.getAttribute("data-counter-suffix") || "";
    const duration = 900;
    const start = performance.now();

    const step = (t) => {
      const p = Math.min(1, (t - start) / duration);
      // easing: easeOutCubic
      const e = 1 - Math.pow(1 - p, 3);
      const v = Math.round(target * e);
      el.textContent = `${v}${suffix}`;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        if (el.getAttribute("data-counter-done") === "1") continue;
        el.setAttribute("data-counter-done", "1");
        animate(el);
      }
    },
    { threshold: 0.4 }
  );

  for (const el of nodes) io.observe(el);
}

function initProjectsCarousel() {
  const container = document.querySelector("#realisations .swiper");
  if (!container) return;
  if (!window.Swiper) return;

  try {
    // eslint-disable-next-line no-new
    const swiper = new window.Swiper(container, {
      slidesPerView: 1.08,
      spaceBetween: 14,
      speed: 450,
      grabCursor: true,
      watchOverflow: true,
      navigation: {
        nextEl: "#projectsNext",
        prevEl: "#projectsPrev",
      },
      pagination: {
        el: "#projectsDots",
        clickable: true,
      },
      breakpoints: {
        640: { slidesPerView: 1.6, spaceBetween: 16 },
        768: { slidesPerView: 2.2, spaceBetween: 18 },
        1024: { slidesPerView: 3, spaceBetween: 18 },
      },
    });

    // Vue met à jour la liste (filtre catégories) après init.
    // Sans update(), Swiper peut garder un état incohérent (pagination/largeur/slides).
    const wrapper = container.querySelector(".swiper-wrapper");
    if (wrapper && window.MutationObserver) {
      const scheduleUpdate = () => {
        try {
          swiper.update();
          swiper.slideTo(0, 0);
        } catch {
          // ignore
        }
      };

      const mo = new MutationObserver(() => {
        // micro-délai: laisse Vue appliquer le DOM final
        setTimeout(scheduleUpdate, 0);
      });
      mo.observe(wrapper, { childList: true, subtree: true });

      // Bonus: si l’utilisateur clique sur un chip, on force l’update.
      const chips = document.querySelector("#realisations");
      if (chips) {
        chips.addEventListener(
          "click",
          (e) => {
            if (e?.target && e.target.closest && e.target.closest(".chip")) setTimeout(scheduleUpdate, 0);
          },
          { passive: true }
        );
      }
    }
  } catch {
    // ignore
  }
}

function waitForVueRender() {
  // Vue est monté sur <body>; on attend que les stats/projects existent dans le DOM.
  let tries = 0;
  const tick = () => {
    tries += 1;
    const stats = document.querySelectorAll(".statNumber");
    const hasProjects = document.querySelector("#realisations");
    if (stats.length > 0 && hasProjects) {
      // Counters: transforme le texte actuel en target, sans toucher aux données Vue.
      for (const el of stats) {
        if (el.hasAttribute("data-counter")) continue;
        const n = safeNumber(el.textContent);
        // On ne counter-anime que les valeurs numériques.
        if (n == null) continue;
        el.setAttribute("data-counter", "1");
        el.setAttribute("data-counter-target", String(n));
        el.textContent = "0";
      }

      initWow();
      initCounters();
      initProjectsCarousel();
      return;
    }
    if (tries < 30) setTimeout(tick, 120);
  };
  tick();
}

onReady(() => {
  initHeaderMicroUX();
  waitForVueRender();
});

