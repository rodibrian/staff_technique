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

// Stat de visite (démonstration). Utile aussi pour le dashboard admin.
incCounter(keys.visits, 1);

const placeholderImage = "./assets/images/hero.svg";

const app = Vue.createApp({
  data() {
    const pages = getJson(keys.pages, {});
    const contact = pages?.contact || {};
    return {
      placeholderImage,

      stats: getJson(keys.stats, { projects: 0, years: 0, clients: 0, response: "-" }),
      pages,
      contact: {
        phone: contact.phone || "+261 00 000 00",
        whatsapp: contact.whatsapp || "+261 00 000 00",
        email: contact.email || "contact@example.com",
      },

      services: getJson(keys.services, []),
      projects: getJson(keys.projects, []),
      articles: getJson(keys.articles, []).filter((a) => a?.published !== false),
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

app.mount("body");

