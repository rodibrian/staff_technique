# dolice_startup — Mini plateforme vitrine (100% statique)

Ce projet implémente le cahier des charges en respectant la contrainte **GitHub Pages**: **aucun backend** et **aucune base de données serveur**.  
Les contenus (services, réalisations, articles, FAQ, partenaires, devis, messages…) sont stockés côté navigateur via **localStorage** et gérés dans `admin.html`.

## Démarrage

- **Site public**: ouvrir `index.html`
- **Administration**: ouvrir `admin.html`

### Identifiants admin (démo)

- Email: `admin@demo.local`
- Mot de passe: `Admin@1234`

> Après connexion: onglet **Sécurité** pour changer le mot de passe (hash SHA‑256 côté client).

## Arborescence

- `index.html`: site public
- `admin.html`: back-office (auth + dashboard + CRUD)
- `css/styles.css`: styles complémentaires
- `js/app.js`: logique Vue du site public
- `js/admin.js`: logique Vue du back-office
- `js/lib/*`: utilitaires, stockage, seed de données fictives
- `assets/images/*`: images fictives (SVG) pour une bonne mise en page

## Notes importantes (GitHub Pages)

- **Sécurité**: l’auth est “best effort” car 100% côté client.
- **Données**: localStorage dépend du navigateur (pas multi-utilisateur réel).
- **Export/Import**: disponible dans l’admin → onglet **Outils** pour sauvegarder/restaurer.

