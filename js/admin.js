/**
 * admin.js
 * Interface d’administration (auth + dashboard + CRUD) en 100% statique.
 *
 * Limitations assumées (GitHub Pages):
 * - Auth et sécurité côté client seulement (best effort)
 * - Données stockées localement dans le navigateur (localStorage)
 */

import { ensureSeed } from "./lib/seed.js";
import { keys, getJson, setJson, remove, pushLog } from "./lib/storage.js";
import { uid, nowIso, formatDateFr, excerptText, clamp, isNonEmptyString } from "./lib/utils.js";

ensureSeed();
syncJsonMirror();

const SESSION_KEY = `${keys.security}:session`;
const LOCK_KEY = `${keys.security}:lock`;

function buildJsonMirror() {
  return {
    version: "dolice_v1",
    syncedAt: nowIso(),
    data: {
      admin: getJson(keys.admin, {}),
      security: getJson(keys.security, {}),
      pages: getJson(keys.pages, {}),
      faqs: getJson(`${keys.pages}:faq`, []),
      stats: getJson(keys.stats, {}),
      services: getJson(keys.services, []),
      projects: getJson(keys.projects, []),
      articles: getJson(keys.articles, []),
      testimonials: getJson(keys.testimonials, []),
      quotes: getJson(keys.quotes, []),
      messages: getJson(keys.messages, []),
      partners: getJson(keys.partners, []),
      visits: Number(localStorage.getItem(keys.visits) || "0"),
      activity: getJson(keys.activityLog, []),
    },
  };
}

function syncJsonMirror() {
  // GitHub Pages: le navigateur ne peut pas écrire dans un fichier du projet.
  // Donc on synchronise un snapshot JSON dans localStorage, exportable via "Outils".
  setJson(keys.jsonMirror, buildJsonMirror());
}

function isoFromDateInput(dateValue) {
  if (!dateValue) return new Date().toISOString();
  // yyyy-mm-dd => ISO (00:00)
  const d = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(String(text));
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function readLock() {
  // Verrouillage désactivé (demande temporaire).
  return { untilMs: 0, isLocked: false, untilText: "", failures: [] };
}

function writeLock(next) {
  setJson(LOCK_KEY, next);
}

function recordFailure(securityParams) {
  return readLock();
}

function clearFailures() {
  // Verrouillage désactivé: on garde la clé propre quand même.
  writeLock({ failures: [], untilMs: 0 });
}

function readSession() {
  const s = getJson(SESSION_KEY, null);
  if (!s) return { isAuthed: false, expMs: 0, email: "" };
  const expMs = Number(s.expMs || 0);
  const isAuthed = Date.now() < expMs && Boolean(s.email);
  return { isAuthed, expMs, email: s.email || "" };
}

function writeSession(email, securityParams) {
  const mins = clamp(Number(securityParams.sessionMinutes || 30), 5, 240);
  setJson(SESSION_KEY, { email, expMs: Date.now() + mins * 60_000 });
}

function clearSession() {
  remove(SESSION_KEY);
}

function asArrayCsv(csv) {
  return String(csv || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("lecture fichier impossible"));
    r.onload = () => resolve(String(r.result || ""));
    r.readAsDataURL(file);
  });
}

function suggestAssetPath(kind, filename) {
  const safe = String(filename || "image").replace(/[^\w.\-]+/g, "-");
  const base = safe.toLowerCase();
  if (kind === "service") return `./assets/images/services/${base}`;
  if (kind === "project") return `./assets/images/realisations/${base}`;
  if (kind === "partner") return `./assets/images/partenariats/${base}`;
  if (kind === "article") return `./assets/images/blog/${base}`;
  return `./assets/images/${base}`;
}

function downloadFileFromDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename || "image";
  a.click();
}

Vue.createApp({
  data() {
    const securityParams = getJson(keys.security, { lockAfterFailures: 5, lockMinutes: 10, sessionMinutes: 30 });
    const session = readSession();
    return {
      tab: "services",

      // UX: pré-remplit les identifiants démo (modifiable par l’utilisateur).
      loginForm: { email: "admin@demo.local", password: "Admin@1234" },
      loginError: "",
      lock: readLock(),
      session,

      securityParams,
      securityForm: { email: getJson(keys.admin, {}).email || "", newPassword: "", newPassword2: "" },

      services: getJson(keys.services, []),
      projects: getJson(keys.projects, []),
      articles: getJson(keys.articles, []),
      testimonials: getJson(keys.testimonials, []),
      quotes: getJson(keys.quotes, []),
      messages: getJson(keys.messages, []),
      partners: getJson(keys.partners, []),
      pagesForm: getJson(keys.pages, { about: "", zones: "", contact: { phone: "", whatsapp: "", email: "" } }),
      faqs: getJson(`${keys.pages}:faq`, []),

      metrics: { visits: Number(localStorage.getItem(keys.visits) || "0"), quotes: 0, projects: 0, messages: 0 },
      activity: getJson(keys.activityLog, []),

      savedNotice: false,
      toolNotice: "",
      toolError: "",

      serviceForm: { id: "", title: "", description: "", image: "./assets/images/hero.svg", category: "" },
      projectForm: { id: "", title: "", description: "", images: [], category: "", type: "", location: "" },
      projectImagesCsv: "",
      articleForm: { id: "", title: "", content: "", image: "./assets/images/hero.svg", date: "", author: "", published: true },
      testimonialForm: { id: "", name: "", company: "", rating: 5, message: "", photo: "", approved: true },
      faqForm: { id: "", q: "", a: "" },
      partnerForm: { id: "", name: "", logo: "./assets/images/logo.svg" },
    };
  },
  mounted() {
    this.refreshMetrics();
    // Si session invalide -> rester sur login
    if (!this.session.isAuthed) this.tab = "services";
  },
  methods: {
    formatIso(iso) {
      return formatDateFr(iso);
    },
    notifySaved() {
      this.savedNotice = true;
      setTimeout(() => (this.savedNotice = false), 1600);
    },
    refreshMetrics() {
      const messages = getJson(keys.messages, []);
      this.metrics = {
        visits: Number(localStorage.getItem(keys.visits) || "0"),
        quotes: Array.isArray(this.quotes) ? this.quotes.length : 0,
        projects: Array.isArray(this.projects) ? this.projects.length : 0,
        messages: Array.isArray(messages) ? messages.length : 0,
      };
    },
    reloadAll() {
      this.services = getJson(keys.services, []);
      this.projects = getJson(keys.projects, []);
      this.articles = getJson(keys.articles, []);
      this.testimonials = getJson(keys.testimonials, []);
      this.quotes = getJson(keys.quotes, []);
      this.messages = getJson(keys.messages, []);
      this.partners = getJson(keys.partners, []);
      this.pagesForm = getJson(keys.pages, { about: "", zones: "", contact: { phone: "", whatsapp: "", email: "" } });
      this.faqs = getJson(`${keys.pages}:faq`, []);
      this.activity = getJson(keys.activityLog, []);
      this.refreshMetrics();
    },

    async login() {
      this.loginError = "";
      this.lock = readLock();
      // Verrouillage désactivé: aucune sortie anticipée.

      const admin = getJson(keys.admin, null);
      if (!admin?.email || !admin?.passwordHash) {
        this.loginError = "Configuration admin manquante. Réinitialisez via Outils.";
        return;
      }

      // Si l'utilisateur clique directement sans rien saisir, on auto-complète (démo).
      if (!this.loginForm.email && !this.loginForm.password) {
        this.loginForm.email = "admin@demo.local";
        this.loginForm.password = "Admin@1234";
      }

      const email = String(this.loginForm.email || "").trim().toLowerCase();
      const pass = String(this.loginForm.password || "");

      if (email !== String(admin.email).toLowerCase()) {
        this.lock = recordFailure(this.securityParams);
        this.loginError = "Identifiants invalides.";
        pushLog({ at: nowIso(), action: "LOGIN_FAIL", detail: "email incorrect" });
        return;
      }

      const hash = await sha256Hex(pass);
      if (hash !== admin.passwordHash) {
        this.lock = recordFailure(this.securityParams);
        this.loginError = "Identifiants invalides.";
        pushLog({ at: nowIso(), action: "LOGIN_FAIL", detail: "mot de passe incorrect" });
        return;
      }

      // OK
      clearFailures();
      writeSession(email, this.securityParams);
      this.session = readSession();
      this.loginForm = { email: "", password: "" };
      pushLog({ at: nowIso(), action: "LOGIN_OK", detail: `session ouverte pour ${email}` });
      syncJsonMirror();
      this.reloadAll();
    },

    logout() {
      clearSession();
      this.session = readSession();
      pushLog({ at: nowIso(), action: "LOGOUT", detail: "session fermée" });
    },

    guard() {
      // Evite les actions si la session a expiré.
      this.session = readSession();
      if (!this.session.isAuthed) {
        this.loginError = "Session expirée. Reconnectez-vous.";
        return false;
      }
      return true;
    },

    // ---- Upload image (base64) ----
    async onPickImage(evt, target) {
      if (!this.guard()) return;
      const files = Array.from(evt?.target?.files || []);
      if (files.length === 0) return;

      try {
        if (target === "project") {
          const urls = [];
          for (const f of files.slice(0, 4)) {
            const url = await fileToDataUrl(f);
            urls.push(url);
            // Le navigateur ne peut pas écrire dans le repo: on télécharge le fichier
            // et on suggère le chemin cible dans l'arborescence du projet.
            downloadFileFromDataUrl(url, f.name);
          }
          const merged = [...asArrayCsv(this.projectImagesCsv), ...urls].slice(0, 6);
          this.projectImagesCsv = merged.join(", ");
          this.projectForm.images = merged;
        } else {
          const f = files[0];
          const url = await fileToDataUrl(f);
          if (target === "service") this.serviceForm.image = url;
          if (target === "article") this.articleForm.image = url;
          if (target === "partner") this.partnerForm.logo = url;
          if (target === "testimonial") this.testimonialForm.photo = url;

          // Télécharge le fichier pour que l'utilisateur puisse le déposer dans:
          // assets/images/<module>/...
          downloadFileFromDataUrl(url, f.name);
        }
      } catch {
        // Silencieux: pas bloquant.
      } finally {
        evt.target.value = "";
      }
    },

    // ---- SERVICES CRUD ----
    resetServiceForm() {
      this.serviceForm = { id: "", title: "", description: "", image: "./assets/images/hero.svg", category: "" };
    },
    editService(s) {
      this.serviceForm = { ...s };
      this.tab = "services";
    },
    saveService() {
      if (!this.guard()) return;
      const f = this.serviceForm;
      if (!isNonEmptyString(f.title) || !isNonEmptyString(f.description) || !isNonEmptyString(f.category)) return;

      const list = [...this.services];
      if (f.id) {
        const idx = list.findIndex((x) => x.id === f.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...f, updatedAt: nowIso() };
        pushLog({ at: nowIso(), action: "SERVICE_UPDATE", detail: f.title });
      } else {
        list.unshift({ ...f, id: uid("svc"), createdAt: nowIso() });
        pushLog({ at: nowIso(), action: "SERVICE_CREATE", detail: f.title });
      }
      this.services = list;
      setJson(keys.services, list);
      syncJsonMirror();
      this.resetServiceForm();
      this.notifySaved();
    },
    deleteService(id) {
      if (!this.guard()) return;
      const next = this.services.filter((s) => s.id !== id);
      this.services = next;
      setJson(keys.services, next);
      pushLog({ at: nowIso(), action: "SERVICE_DELETE", detail: id });
      syncJsonMirror();
      this.refreshMetrics();
    },

    // ---- PROJECTS CRUD ----
    resetProjectForm() {
      this.projectForm = { id: "", title: "", description: "", images: [], category: "", type: "", location: "" };
      this.projectImagesCsv = "";
    },
    editProject(p) {
      this.projectForm = { ...p, images: Array.isArray(p.images) ? p.images : [] };
      this.projectImagesCsv = (this.projectForm.images || []).join(", ");
      this.tab = "projects";
    },
    saveProject() {
      if (!this.guard()) return;
      const f = this.projectForm;
      const images = f.images?.length ? f.images : asArrayCsv(this.projectImagesCsv);
      const payload = { ...f, images };
      if (!isNonEmptyString(payload.title) || !isNonEmptyString(payload.category)) return;

      const list = [...this.projects];
      if (payload.id) {
        const idx = list.findIndex((x) => x.id === payload.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...payload, updatedAt: nowIso() };
        pushLog({ at: nowIso(), action: "PROJECT_UPDATE", detail: payload.title });
      } else {
        list.unshift({ ...payload, id: uid("prj"), createdAt: nowIso() });
        pushLog({ at: nowIso(), action: "PROJECT_CREATE", detail: payload.title });
      }
      this.projects = list;
      setJson(keys.projects, list);
      syncJsonMirror();
      this.resetProjectForm();
      this.notifySaved();
      this.refreshMetrics();
    },
    deleteProject(id) {
      if (!this.guard()) return;
      const next = this.projects.filter((p) => p.id !== id);
      this.projects = next;
      setJson(keys.projects, next);
      pushLog({ at: nowIso(), action: "PROJECT_DELETE", detail: id });
      syncJsonMirror();
      this.refreshMetrics();
    },

    // ---- ARTICLES CRUD ----
    resetArticleForm() {
      this.articleForm = { id: "", title: "", content: "", image: "./assets/images/hero.svg", date: "", author: "", published: true };
    },
    editArticle(a) {
      const d = a?.date ? new Date(a.date) : null;
      const dateInput = d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "";
      this.articleForm = { ...a, date: dateInput, published: a?.published !== false };
      this.tab = "articles";
    },
    saveArticle() {
      if (!this.guard()) return;
      const f = this.articleForm;
      if (!isNonEmptyString(f.title) || !isNonEmptyString(f.content)) return;

      const payload = {
        ...f,
        date: isoFromDateInput(f.date),
        published: f.published !== false,
      };

      const list = [...this.articles];
      if (payload.id) {
        const idx = list.findIndex((x) => x.id === payload.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...payload, updatedAt: nowIso() };
        pushLog({ at: nowIso(), action: "ARTICLE_UPDATE", detail: payload.title });
      } else {
        list.unshift({ ...payload, id: uid("art"), createdAt: nowIso() });
        pushLog({ at: nowIso(), action: "ARTICLE_CREATE", detail: payload.title });
      }
      this.articles = list;
      setJson(keys.articles, list);
      syncJsonMirror();
      this.resetArticleForm();
      this.notifySaved();
    },
    deleteArticle(id) {
      if (!this.guard()) return;
      const next = this.articles.filter((a) => a.id !== id);
      this.articles = next;
      setJson(keys.articles, next);
      pushLog({ at: nowIso(), action: "ARTICLE_DELETE", detail: id });
      syncJsonMirror();
    },

    // ---- TESTIMONIALS CRUD ----
    resetTestimonialForm() {
      this.testimonialForm = { id: "", name: "", company: "", rating: 5, message: "", photo: "", approved: true };
    },
    editTestimonial(t) {
      this.testimonialForm = { ...t };
      this.tab = "testimonials";
    },
    saveTestimonial() {
      if (!this.guard()) return;
      const f = this.testimonialForm;
      const rating = clamp(Number(f.rating || 5), 1, 5);
      if (!isNonEmptyString(f.name) || !isNonEmptyString(f.message)) return;

      const payload = { ...f, rating, approved: Boolean(f.approved) };
      const list = [...this.testimonials];
      if (payload.id) {
        const idx = list.findIndex((x) => x.id === payload.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...payload, updatedAt: nowIso() };
        pushLog({ at: nowIso(), action: "TESTIMONIAL_UPDATE", detail: payload.name });
      } else {
        list.unshift({ ...payload, id: uid("tst"), createdAt: nowIso() });
        pushLog({ at: nowIso(), action: "TESTIMONIAL_CREATE", detail: payload.name });
      }
      this.testimonials = list;
      setJson(keys.testimonials, list);
      syncJsonMirror();
      this.resetTestimonialForm();
      this.notifySaved();
    },
    deleteTestimonial(id) {
      if (!this.guard()) return;
      const next = this.testimonials.filter((t) => t.id !== id);
      this.testimonials = next;
      setJson(keys.testimonials, next);
      pushLog({ at: nowIso(), action: "TESTIMONIAL_DELETE", detail: id });
      syncJsonMirror();
    },

    // ---- QUOTES ----
    updateQuoteStatus(q) {
      if (!this.guard()) return;
      setJson(keys.quotes, this.quotes);
      pushLog({ at: nowIso(), action: "QUOTE_STATUS", detail: `${q.id} -> ${q.status}` });
      syncJsonMirror();
      this.refreshMetrics();
    },
    saveQuoteReply(q) {
      if (!this.guard()) return;
      setJson(keys.quotes, this.quotes);
      pushLog({ at: nowIso(), action: "QUOTE_REPLY", detail: `${q.id}` });
      syncJsonMirror();
      this.notifySaved();
    },
    deleteQuote(id) {
      if (!this.guard()) return;
      this.quotes = this.quotes.filter((q) => q.id !== id);
      setJson(keys.quotes, this.quotes);
      pushLog({ at: nowIso(), action: "QUOTE_DELETE", detail: id });
      syncJsonMirror();
      this.refreshMetrics();
    },
    clearQuotes() {
      if (!this.guard()) return;
      setJson(keys.quotes, []);
      this.quotes = [];
      pushLog({ at: nowIso(), action: "QUOTE_CLEAR", detail: "toutes" });
      syncJsonMirror();
      this.refreshMetrics();
    },
    exportQuotes() {
      if (!this.guard()) return;
      const blob = new Blob([JSON.stringify(this.quotes, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "quotes.json";
      a.click();
      URL.revokeObjectURL(url);
    },

    // ---- MESSAGES ----
    deleteMessage(id) {
      if (!this.guard()) return;
      this.messages = this.messages.filter((m) => m.id !== id);
      setJson(keys.messages, this.messages);
      pushLog({ at: nowIso(), action: "MESSAGE_DELETE", detail: id });
      syncJsonMirror();
      this.refreshMetrics();
    },
    clearMessages() {
      if (!this.guard()) return;
      setJson(keys.messages, []);
      this.messages = [];
      pushLog({ at: nowIso(), action: "MESSAGE_CLEAR", detail: "tous" });
      syncJsonMirror();
      this.refreshMetrics();
    },
    exportMessages() {
      if (!this.guard()) return;
      const blob = new Blob([JSON.stringify(this.messages, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "messages.json";
      a.click();
      URL.revokeObjectURL(url);
    },

    // ---- PAGES ----
    savePages() {
      if (!this.guard()) return;
      setJson(keys.pages, this.pagesForm);
      pushLog({ at: nowIso(), action: "PAGES_SAVE", detail: "pages statiques" });
      syncJsonMirror();
      this.notifySaved();
    },

    // ---- FAQ CRUD ----
    resetFaqForm() {
      this.faqForm = { id: "", q: "", a: "" };
    },
    editFaq(f) {
      this.faqForm = { ...f };
    },
    saveFaq() {
      if (!this.guard()) return;
      const f = this.faqForm;
      if (!isNonEmptyString(f.q) || !isNonEmptyString(f.a)) return;
      const list = [...this.faqs];
      if (f.id) {
        const idx = list.findIndex((x) => x.id === f.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...f, updatedAt: nowIso() };
        pushLog({ at: nowIso(), action: "FAQ_UPDATE", detail: excerptText(f.q, 80) });
      } else {
        list.unshift({ ...f, id: uid("faq"), createdAt: nowIso() });
        pushLog({ at: nowIso(), action: "FAQ_CREATE", detail: excerptText(f.q, 80) });
      }
      this.faqs = list;
      setJson(`${keys.pages}:faq`, list);
      syncJsonMirror();
      this.resetFaqForm();
      this.notifySaved();
    },
    deleteFaq(id) {
      if (!this.guard()) return;
      const next = this.faqs.filter((f) => f.id !== id);
      this.faqs = next;
      setJson(`${keys.pages}:faq`, next);
      pushLog({ at: nowIso(), action: "FAQ_DELETE", detail: id });
      syncJsonMirror();
    },

    // ---- PARTNERS CRUD ----
    resetPartnerForm() {
      this.partnerForm = { id: "", name: "", logo: "./assets/images/logo.svg" };
    },
    editPartner(p) {
      this.partnerForm = { ...p };
      this.tab = "partners";
    },
    savePartner() {
      if (!this.guard()) return;
      const f = this.partnerForm;
      if (!isNonEmptyString(f.name) || !isNonEmptyString(f.logo)) return;

      const list = [...this.partners];
      if (f.id) {
        const idx = list.findIndex((x) => x.id === f.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...f, updatedAt: nowIso() };
        pushLog({ at: nowIso(), action: "PARTNER_UPDATE", detail: f.name });
      } else {
        list.unshift({ ...f, id: uid("par"), createdAt: nowIso() });
        pushLog({ at: nowIso(), action: "PARTNER_CREATE", detail: f.name });
      }
      this.partners = list;
      setJson(keys.partners, list);
      syncJsonMirror();
      this.resetPartnerForm();
      this.notifySaved();
    },
    deletePartner(id) {
      if (!this.guard()) return;
      const next = this.partners.filter((p) => p.id !== id);
      this.partners = next;
      setJson(keys.partners, next);
      pushLog({ at: nowIso(), action: "PARTNER_DELETE", detail: id });
      syncJsonMirror();
    },

    // ---- SECURITY ----
    async changePassword() {
      if (!this.guard()) return;
      const email = String(this.securityForm.email || "").trim().toLowerCase();
      if (!email) return;
      if (this.securityForm.newPassword !== this.securityForm.newPassword2) return;
      if (String(this.securityForm.newPassword).length < 8) return;

      const admin = getJson(keys.admin, {});
      const passwordHash = await sha256Hex(this.securityForm.newPassword);
      setJson(keys.admin, { ...admin, email, passwordHash });
      pushLog({ at: nowIso(), action: "ADMIN_PASSWORD_CHANGE", detail: `email=${email}` });
      syncJsonMirror();
      this.securityForm.newPassword = "";
      this.securityForm.newPassword2 = "";
      this.notifySaved();
    },
    saveSecurityParams() {
      if (!this.guard()) return;
      setJson(keys.security, this.securityParams);
      pushLog({ at: nowIso(), action: "SECURITY_PARAMS_SAVE", detail: JSON.stringify(this.securityParams) });
      syncJsonMirror();
      this.notifySaved();
    },

    // ---- TOOLS ----
    exportAll() {
      if (!this.guard()) return;
      this.toolNotice = "";
      this.toolError = "";

      syncJsonMirror();
      const payload = getJson(keys.jsonMirror, buildJsonMirror());

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "backup-dolice.json";
      a.click();
      URL.revokeObjectURL(url);
      this.toolNotice = "Export terminé.";
    },
    async importAll(evt) {
      if (!this.guard()) return;
      this.toolNotice = "";
      this.toolError = "";
      const file = evt?.target?.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        // Supporte le format `exportAll()`:
        // { version, exportedAt, data: { ... } }
        // Et accepte aussi directement { ... } (data à la racine).
        const bagData = parsed?.data || parsed;
        if (!bagData || typeof bagData !== "object") throw new Error("format invalide");

        const apply = (k, v) => setJson(k, v);
        apply(keys.admin, bagData.admin || getJson(keys.admin, {}));
        apply(keys.security, bagData.security || getJson(keys.security, {}));
        apply(keys.pages, bagData.pages || getJson(keys.pages, {}));
        apply(`${keys.pages}:faq`, bagData.faqs || getJson(`${keys.pages}:faq`, []));
        apply(keys.stats, bagData.stats || getJson(keys.stats, {}));
        apply(keys.services, bagData.services || []);
        apply(keys.projects, bagData.projects || []);
        apply(keys.articles, bagData.articles || []);
        apply(keys.testimonials, bagData.testimonials || []);
        apply(keys.quotes, bagData.quotes || []);
        apply(keys.messages, bagData.messages || []);
        apply(keys.partners, bagData.partners || []);
        if (typeof bagData.visits === "number") localStorage.setItem(keys.visits, String(bagData.visits));
        apply(keys.activityLog, bagData.activity || []);

        pushLog({ at: nowIso(), action: "IMPORT_ALL", detail: "import JSON" });
        syncJsonMirror();
        this.reloadAll();
        this.toolNotice = "Import terminé.";
      } catch (e) {
        this.toolError = `Import impossible: ${e?.message || "erreur"}`;
      } finally {
        evt.target.value = "";
      }
    },
    resetAll() {
      if (!this.guard()) return;
      // On supprime uniquement les clés préfixées (dolice_v1:*)
      for (const k of Object.values(keys)) remove(k);
      remove(`${keys.pages}:faq`);
      localStorage.removeItem(keys.seedDone);
      pushLog({ at: nowIso(), action: "RESET_ALL", detail: "suppression données + reseed" });
      ensureSeed();
      syncJsonMirror();
      this.reloadAll();
      this.toolNotice = "Réinitialisé.";
    },
  },
}).mount("body");

