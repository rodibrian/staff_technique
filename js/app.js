/**
 * app.js (site public)
 * Rôle: lire les données (localStorage) et rendre les sections (Vue).
 *
 * Les données viennent du "seed" (fictif) et sont ensuite gérées via admin.html.
 */

import { ensureSeed } from "./lib/seed.js";
import { keys, getJson, setJson, incCounter } from "./lib/storage.js";
import { excerptText, formatDateFr, toTelHref, toWhatsAppHref, uid, nowIso } from "./lib/utils.js";

ensureSeed();

async function fetchJsonWithTimeout(url, timeoutMs = 3500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    if (!res.ok) return null;
    const ct = String(res.headers?.get?.("content-type") || "").toLowerCase();
    // Si Cloudinary (ou autre) renvoie une page HTML d'erreur, on n'essaie pas de parser en JSON.
    if (ct && !ct.includes("application/json") && !ct.includes("+json")) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function applyCentralContent(bagData) {
  // Centralise uniquement le contenu public (pas de sécurité/admin).
  if (!bagData || typeof bagData !== "object") return;
  if (bagData.pages) setJson(keys.pages, bagData.pages);
  if (bagData.faqs) setJson(`${keys.pages}:faq`, bagData.faqs);
  if (bagData.stats) setJson(keys.stats, bagData.stats);
  if (bagData.services) setJson(keys.services, bagData.services);
  if (bagData.projects) setJson(keys.projects, bagData.projects);
  if (bagData.articles) setJson(keys.articles, bagData.articles);
  if (bagData.testimonials) setJson(keys.testimonials, bagData.testimonials);
  if (bagData.partners) setJson(keys.partners, bagData.partners);
}

// Centralisation: tous les visiteurs chargent la même version du contenu (Cloudinary raw).
// Priorité: runtime-config.json (nouveau) puis site-config.json (compat).
try {
  const runtimeCfg = await fetchJsonWithTimeout("./data/runtime-config.json", 2000);
  const legacyCfg = runtimeCfg ? null : await fetchJsonWithTimeout("./data/site-config.json", 2000);
  const contentUrl = runtimeCfg?.contentUrl || legacyCfg?.contentUrl;
  const enabled = runtimeCfg?.features?.contentSyncEnabled !== false;

  if (enabled && contentUrl) {
    const payload = await fetchJsonWithTimeout(contentUrl, 4000);
    const bagData = payload?.data || payload;
    applyCentralContent(bagData);
  }
} catch {
  // Ne bloque jamais le rendu du site si la centralisation échoue.
}

// Stat de visite (démonstration). Utile aussi pour le dashboard admin.
incCounter(keys.visits, 1);

const placeholderImage = "./assets/images/hero.svg";

function normalizeImageUrl(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  // Évite les URLs data: incomplètes (ex: "data:image/jpeg;base64" sans payload)
  if (s.startsWith("data:image") && !s.includes(",")) return "";
  // Évite les payloads base64 "nus" (ex: "/9j/..." ou "9j/..." => le navigateur fait un GET /9j/...).
  // Symptôme: net::ERR_CONNECTION_RESET 431 (Request Header Fields Too Large)
  if (s.startsWith("/9j/") || s.startsWith("9j/")) return "";
  // Quelques signatures base64 courantes (PNG/JPEG) sans préfixe data:
  if (s.startsWith("iVBOR") || s.startsWith("/iVBOR")) return "";
  return s;
}

const app = Vue.createApp({
  data() {
    const pages = getJson(keys.pages, {});
    const contact = pages?.contact || {};
    return {
      placeholderImage,

      stats: getJson(keys.stats, { projects: 0, years: 0, clients: 0, response: "-" }),
      pages: {
        ...pages,
        identity: pages?.identity
          ? {
              ...pages.identity,
              logo: normalizeImageUrl(pages.identity.logo) || pages.identity.logo,
              coverImage: normalizeImageUrl(pages.identity.coverImage) || pages.identity.coverImage,
              coverProject: pages.identity?.coverProject
                ? {
                    ...pages.identity.coverProject,
                    image: normalizeImageUrl(pages.identity.coverProject.image) || pages.identity.coverProject.image,
                  }
                : pages.identity?.coverProject,
            }
          : pages?.identity,
      },
      contact: {
        phone: contact.phone || "+261 00 000 00",
        whatsapp: contact.whatsapp || "+261 00 000 00",
        email: contact.email || "contact@example.com",
      },

      services: getJson(keys.services, []).map((s) => ({ ...s, image: normalizeImageUrl(s?.image) || placeholderImage })),
      projects: getJson(keys.projects, []).map((p) => ({
        ...p,
        images: Array.isArray(p?.images) ? p.images.map((u) => normalizeImageUrl(u)).filter(Boolean) : [],
      })),
      articles: getJson(keys.articles, [])
        .filter((a) => a?.published !== false)
        .map((a) => ({ ...a, image: normalizeImageUrl(a?.image) || placeholderImage })),
      testimonials: getJson(keys.testimonials, []).filter((t) => t?.approved),
      faqs: getJson(`${keys.pages}:faq`, []),
      partners: getJson(keys.partners, []),

      selectedProjectCategory: "Tous",

      quoteForm: { name: "", phone: "", email: "", type: "", location: "", message: "" },
      quoteSuccess: false,
      lastQuoteAtMs: 0,

      messageForm: { name: "", contact: "", message: "" },
      messageSuccess: false,
      lastMessageAtMs: 0,
    };
  },
  computed: {
    telLink() {
      return toTelHref(this.contact.phone);
    },
    waLink() {
      return toWhatsAppHref(this.contact.whatsapp, "Bonjour, je souhaite demander un devis.");
    },
    projectCategories() {
      const s = new Set(this.projects.map((p) => p?.category).filter(Boolean));
      return Array.from(s).sort((a, b) => String(a).localeCompare(String(b), "fr"));
    },
    filteredProjects() {
      if (this.selectedProjectCategory === "Tous") return this.projects;
      return this.projects.filter((p) => p?.category === this.selectedProjectCategory);
    },
    serviceTypeOptions() {
      // Options = catégories + titres (évite une liste codée en dur)
      const set = new Set();
      for (const s of this.services) {
        if (s?.category) set.add(s.category);
        if (s?.title) set.add(s.title);
      }
      return Array.from(set).sort((a, b) => String(a).localeCompare(String(b), "fr"));
    },
  },
  methods: {
    formatDate(iso) {
      return formatDateFr(iso);
    },
    excerpt(text) {
      return excerptText(text, 150);
    },
    submitQuote() {
      // Anti-spam léger: empêche le spam involontaire (double clic, refresh).
      const now = Date.now();
      if (now - this.lastQuoteAtMs < 4000) return;
      this.lastQuoteAtMs = now;

      const quotes = getJson(keys.quotes, []);
      quotes.unshift({
        id: uid("qte"),
        status: "nouveau",
        createdAt: nowIso(),
        ...this.quoteForm,
      });
      setJson(keys.quotes, quotes);

      this.quoteForm = { name: "", phone: "", email: "", type: "", location: "", message: "" };
      this.quoteSuccess = true;
      setTimeout(() => (this.quoteSuccess = false), 3500);
    },
    submitMessage() {
      const now = Date.now();
      if (now - this.lastMessageAtMs < 4000) return;
      this.lastMessageAtMs = now;

      const messages = getJson(keys.messages, []);
      messages.unshift({
        id: uid("msg"),
        createdAt: nowIso(),
        ...this.messageForm,
      });
      setJson(keys.messages, messages);

      this.messageForm = { name: "", contact: "", message: "" };
      this.messageSuccess = true;
      setTimeout(() => (this.messageSuccess = false), 3500);
    },
  },
});

app.mount("#app");

