/**
 * storage.js
 * Abstraction localStorage avec versionnement minimal.
 *
 * Objectif: éviter les "magic strings" dans tout le code.
 */

import { safeJsonParse } from "./utils.js";

const PREFIX = "dolice_v1:";

export const keys = {
  seedDone: `${PREFIX}seedDone`,

  admin: `${PREFIX}admin`,
  security: `${PREFIX}security`,

  services: `${PREFIX}services`,
  projects: `${PREFIX}projects`,
  articles: `${PREFIX}articles`,
  testimonials: `${PREFIX}testimonials`,
  quotes: `${PREFIX}quotes`,
  messages: `${PREFIX}messages`,
  pages: `${PREFIX}pages`,
  partners: `${PREFIX}partners`,
  stats: `${PREFIX}stats`,
  visits: `${PREFIX}visits`,

  activityLog: `${PREFIX}activity`,

  // Miroir JSON des données (synchronisé après chaque mise à jour admin).
  jsonMirror: `${PREFIX}jsonMirror`,

  // Cloudinary config (unsigned upload) - stocké en local pour l'admin.
  cloudinary: `${PREFIX}cloudinary`,
};

export function getJson(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw == null) return fallback;
  return safeJsonParse(raw, fallback);
}

export function setJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function remove(key) {
  localStorage.removeItem(key);
}

export function pushLog(entry) {
  const log = getJson(keys.activityLog, []);
  log.unshift(entry);
  // On garde un log court: pratique pour debug, sans gonfler le stockage.
  setJson(keys.activityLog, log.slice(0, 200));
}

export function incCounter(key, delta = 1) {
  const current = Number(localStorage.getItem(key) || "0");
  const next = Number.isFinite(current) ? current + delta : delta;
  localStorage.setItem(key, String(next));
  return next;
}

