/**
 * seed.js
 * Données fictives de démonstration.
 *
 * Important:
 * - GitHub Pages => pas de DB serveur
 * - On initialise localStorage une seule fois (modifiable ensuite via admin).
 */

import { keys, getJson, setJson } from "./storage.js";
import { nowIso, uid } from "./utils.js";

const IMG_SERVICE_1 = "./assets/images/hero.svg";
const IMG_SERVICE_2 = "./assets/images/hero.svg";
const IMG_SERVICE_3 = "./assets/images/hero.svg";

const defaultAdmin = {
  // Identifiants DEMO: à changer dans l'admin > Sécurité.
  email: "admin@demo.local",
  // hash SHA-256 de "Admin@1234" (calcul côté client via WebCrypto dans l'admin).
  passwordHash:
    "bc78e58d55cde1346e68f8e5fe588dedf62fa457aa646a500a53347faff6ee24",
  role: "owner",
};

const defaultSecurity = {
  // Anti brute-force (côté client, donc "best effort").
  lockAfterFailures: 5,
  lockMinutes: 10,
  sessionMinutes: 30,
  maxAttemptsWindowMinutes: 10,
};

const defaultContact = {
  phone: "+261 34 00 000 00",
  whatsapp: "+261 34 00 000 00",
  email: "contact@staff-technique.mg",
};

const defaultPages = {
  identity: {
    companyName: "Staff Technique Madagascar",
    slogan: "Finition • Décoration • Bâtiment",
    logo: "./assets/images/logo.svg",
    coverImage: "./assets/images/hero.svg",
    coverTitle: "Donnez une finition professionnelle à vos espaces.",
    coverText:
      "Plafonds, peinture, cloisons, sols, électricité et mobilier — une équipe organisée, des matériaux de qualité, un rendu propre.",
    coverProject: {
      image: "./assets/images/hero.svg",
      title: "Projet vitrine (démo)",
      description: "Un exemple de projet mis en avant sous la cover.",
    },
  },
  about:
    "Staff Technique Madagascar est une entreprise de finition et décoration. Cette section est fictive (démo) et peut être modifiée via l’espace admin.",
  faqIntro:
    "Retrouvez ci‑dessous les réponses aux questions les plus fréquentes. Le contenu est modifiable via l’admin.",
  zones: "Antananarivo • Analamanga • (Démo) autres régions sur demande",
  contact: defaultContact,
};

const defaultStats = {
  projects: 128,
  years: 6,
  clients: 210,
  response: "24h",
};

const defaultServices = [
  {
    id: uid("svc"),
    title: "Plafonds (Placo / PVC)",
    category: "Plafond",
    image: IMG_SERVICE_1,
    description:
      "Pose de plafonds avec finitions propres, intégration luminaires, et options acoustiques selon le besoin.",
    createdAt: nowIso(),
  },
  {
    id: uid("svc"),
    title: "Murs & cloisons",
    category: "Cloisons",
    image: IMG_SERVICE_2,
    description:
      "Création de cloisons, habillage, nivellement et préparation pour peinture ou revêtement décoratif.",
    createdAt: nowIso(),
  },
  {
    id: uid("svc"),
    title: "Peinture intérieure / extérieure",
    category: "Peinture",
    image: IMG_SERVICE_3,
    description:
      "Préparation des supports, protection, application multi‑couches, et contrôle qualité pour un rendu uniforme.",
    createdAt: nowIso(),
  },
  {
    id: uid("svc"),
    title: "Sols (carrelage / revêtements)",
    category: "Sol",
    image: IMG_SERVICE_1,
    description:
      "Pose de revêtements, joints, plinthes, corrections de niveaux et finitions adaptées à l’usage.",
    createdAt: nowIso(),
  },
  {
    id: uid("svc"),
    title: "Électricité (finition)",
    category: "Électricité",
    image: IMG_SERVICE_2,
    description:
      "Passage câbles, appareillage, éclairage et contrôle de sécurité (niveau démo, à cadrer selon normes).",
    createdAt: nowIso(),
  },
  {
    id: uid("svc"),
    title: "Mobilier & décoration",
    category: "Mobilier",
    image: IMG_SERVICE_3,
    description:
      "Conception légère, pose et ajustement de mobilier, finitions décoratives et harmonisation de l’espace.",
    createdAt: nowIso(),
  },
];

const defaultProjects = [
  {
    id: uid("prj"),
    title: "Rénovation salon moderne",
    category: "Résidentiel",
    type: "Peinture + Plafond",
    location: "Antananarivo",
    description:
      "Reprise des supports, peinture satinée, pose plafond et intégration luminaires. Photos fictives (démo).",
    images: ["./assets/images/hero.svg"],
    createdAt: nowIso(),
  },
  {
    id: uid("prj"),
    title: "Bureau — cloisonnement",
    category: "Entreprise",
    type: "Cloisons",
    location: "Ivandry",
    description:
      "Création de cloisons, passages techniques, préparation peinture. Contenu fictif pour démonstration.",
    images: ["./assets/images/hero.svg"],
    createdAt: nowIso(),
  },
  {
    id: uid("prj"),
    title: "Hall d’hôtel — finition",
    category: "Hôtellerie",
    type: "Sol + Décoration",
    location: "Analakely",
    description:
      "Pose revêtements et finitions décoratives. Avant/après simulé par images de démo.",
    images: ["./assets/images/hero.svg"],
    createdAt: nowIso(),
  },
];

const defaultArticles = [
  {
    id: uid("art"),
    title: "Choisir la bonne peinture pour une finition durable",
    author: "Rédaction STM",
    date: new Date().toISOString(),
    image: "./assets/images/hero.svg",
    content:
      "Contenu fictif: conseils sur la préparation des supports, l’importance des sous‑couches et le choix des finitions (mat, satin, brillant).",
    published: true,
    createdAt: nowIso(),
  },
  {
    id: uid("art"),
    title: "Plafonds: PVC vs Placo — comment décider ?",
    author: "Rédaction STM",
    date: new Date().toISOString(),
    image: "./assets/images/hero.svg",
    content:
      "Contenu fictif: comparaison des coûts, entretien, esthétique, et contraintes de pose selon les pièces.",
    published: true,
    createdAt: nowIso(),
  },
];

const defaultTestimonials = [
  {
    id: uid("tst"),
    name: "Client Démo 1",
    company: "Résidentiel",
    rating: 5,
    photo: "",
    message:
      "Travail propre et équipe organisée. Délais respectés. (Avis fictif pour démonstration)",
    approved: true,
    createdAt: nowIso(),
  },
  {
    id: uid("tst"),
    name: "Client Démo 2",
    company: "Entreprise",
    rating: 4,
    photo: "",
    message:
      "Bonne communication et finitions soignées. (Avis fictif pour démonstration)",
    approved: true,
    createdAt: nowIso(),
  },
];

const defaultFaqs = [
  {
    id: uid("faq"),
    q: "Combien de temps pour un devis ?",
    a: "En démo, la réponse est sous 24h. En réel, cela dépend du chantier et des disponibilités.",
    createdAt: nowIso(),
  },
  {
    id: uid("faq"),
    q: "Intervenez-vous en dehors d’Antananarivo ?",
    a: "Oui selon le projet (contenu fictif). Les zones sont modifiables via l’admin.",
    createdAt: nowIso(),
  },
  {
    id: uid("faq"),
    q: "Proposez-vous des visites chantier ?",
    a: "Oui, sur rendez-vous (contenu fictif).",
    createdAt: nowIso(),
  },
  {
    id: uid("faq"),
    q: "Quels services sont disponibles ?",
    a: "Plafond, cloisons, peinture, sol, électricité, mobilier (liste gérée dans l’admin).",
    createdAt: nowIso(),
  },
];

const defaultPartners = [
  { id: uid("par"), name: "Partenaire Démo A", logo: "./assets/images/partenariats/logo-demo.svg", createdAt: nowIso() },
  { id: uid("par"), name: "Partenaire Démo B", logo: "./assets/images/partenariats/logo-demo.svg", createdAt: nowIso() },
  { id: uid("par"), name: "Partenaire Démo C", logo: "./assets/images/partenariats/logo-demo.svg", createdAt: nowIso() },
  { id: uid("par"), name: "Partenaire Démo D", logo: "./assets/images/partenariats/logo-demo.svg", createdAt: nowIso() },
  { id: uid("par"), name: "Partenaire Démo E", logo: "./assets/images/partenariats/logo-demo.svg", createdAt: nowIso() },
  { id: uid("par"), name: "Partenaire Démo F", logo: "./assets/images/partenariats/logo-demo.svg", createdAt: nowIso() },
];

export function ensureSeed() {
  // Migration légère: si une ancienne version a stocké un mauvais hash du compte démo,
  // on le corrige pour éviter "identifiants invalides" après mise à jour du code.
  const storedAdmin = getJson(keys.admin, null);
  if (storedAdmin?.email && String(storedAdmin.email).toLowerCase() === "admin@demo.local") {
    if (storedAdmin.passwordHash !== defaultAdmin.passwordHash) {
      setJson(keys.admin, { ...storedAdmin, passwordHash: defaultAdmin.passwordHash });
    }
  }

  const done = localStorage.getItem(keys.seedDone) === "1";
  if (done) return;

  // Ne pas écraser si l'utilisateur a déjà des données (détection simple).
  const existingServices = getJson(keys.services, null);
  if (Array.isArray(existingServices) && existingServices.length > 0) {
    localStorage.setItem(keys.seedDone, "1");
    return;
  }

  setJson(keys.admin, defaultAdmin);
  setJson(keys.security, defaultSecurity);
  setJson(keys.pages, defaultPages);
  setJson(keys.stats, defaultStats);

  setJson(keys.services, defaultServices);
  setJson(keys.projects, defaultProjects);
  setJson(keys.articles, defaultArticles);
  setJson(keys.testimonials, defaultTestimonials);
  setJson(`${keys.pages}:faq`, defaultFaqs); // faq stockée séparément pour CRUD dédié
  setJson(keys.partners, defaultPartners);

  setJson(keys.quotes, []);
  setJson(keys.messages, []);

  localStorage.setItem(keys.seedDone, "1");

  // Premier snapshot JSON (admin maintient ensuite le miroir à jour).
  try {
    setJson(keys.jsonMirror, {
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
    });
  } catch {
    // non bloquant
  }
}

