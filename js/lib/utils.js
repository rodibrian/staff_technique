/**
 * utils.js
 * Fonctions utilitaires sans dépendances.
 *
 * Note: ce projet est 100% statique (GitHub Pages) => tout se fait côté navigateur.
 */

export function nowIso() {
  return new Date().toISOString();
}

export function uid(prefix = "id") {
  // Identifiant court suffisant pour un stockage local (pas de collision garantie à 100%).
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function toTelHref(phoneRaw) {
  const digits = String(phoneRaw || "").replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

export function toWhatsAppHref(phoneRaw, message = "") {
  // WhatsApp attend un numéro international sans +, espaces, etc.
  const digits = String(phoneRaw || "").replace(/[^\d]/g, "");
  const text = encodeURIComponent(message);
  return `https://wa.me/${digits}${text ? `?text=${text}` : ""}`;
}

export function formatDateFr(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso || "");
  return d.toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "2-digit" });
}

export function excerptText(text, maxLen = 140) {
  const t = String(text || "").trim().replace(/\s+/g, " ");
  if (t.length <= maxLen) return t;
  return `${t.slice(0, clamp(maxLen, 0, 10_000)).trim()}…`;
}

export function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

