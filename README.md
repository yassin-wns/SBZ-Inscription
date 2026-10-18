# Student Management System

Application web de gestion de la scolarité inspirée d'un institut supérieur (ISET de Sidi Bouzid) : tableau de bord, inscription des étudiants, recherche, modification et suppression. Elle est développée en **HTML5, CSS3 et JavaScript vanilla**, sans framework ni backend. Les données sont stockées dans le navigateur grâce au **LocalStorage**.

> Projet de portfolio réalisé dans le cadre de ma formation en Multimédia et Développement Web (MDW).

## Contexte

Projet pédagogique inspiré du fonctionnement d'un service de scolarité. Il est **non officiel** et sans lien avec le système d'information de l'ISET. Les départements proposés (Technologies de l'Informatique, Génie Mécanique, Génie Électrique, Génie des Procédés) et les parcours suggérés sont à adapter. Ne saisissez jamais de vraies données personnelles (CIN, etc.). Le logo de l'ISET Sidi Bouzid appartient à l'institut : il est utilisé ici à titre pédagogique et doit être retiré à la demande de l'établissement.

## Objectifs

- Construire une interface de type tableau de bord (SaaS) propre, lisible et responsive.
- Mettre en pratique le JavaScript ES6+ : manipulation du DOM, gestion d'événements, validation de formulaires.
- Comprendre la persistance de données côté navigateur avec le LocalStorage.
- Structurer un projet front-end simple et le publier sur GitHub Pages.

## Fonctionnalités

**Tableau de bord**
- Nombre total d'étudiants.
- Répartition par année d'étude, par département et par statut.
- Les 5 derniers étudiants ajoutés.
- Statistiques mises à jour automatiquement après chaque modification.

**Gestion des étudiants**
- Inscription avec numéro généré automatiquement (`SBZ-0001`, `SBZ-0002`, ...).
- Données saisies : année universitaire, CIN, date de naissance, nom, prénom, email, téléphone, département, parcours, année d'étude, statut (Inscrit, Redoublant, Diplômé, Abandon) et date d'inscription.
- Validation : champs obligatoires, CIN de 8 chiffres et unique, date de naissance passée, email unique, téléphone tunisien facultatif.
- Modification d'un étudiant avec formulaire pré-rempli.
- Suppression avec boîte de confirmation.
- Messages de succès, d'erreur et d'information.

**Liste des étudiants**
- Recherche par nom, CIN, email ou numéro d'inscription.
- Filtres par année d'étude et par département, tri par nom ou par date d'inscription.
- Pagination (8 étudiants par page).
- Message d'état vide.
- Affichage responsive : le tableau devient une liste de cartes sur petit écran.

**Design et animations**
- Palette bleu, jaune et blanc reprise du logo de l'ISET.
- Écran d'accueil animé (une fois par session, ignorable au clic), transitions entre les pages, compteur animé, effets au survol. Les animations sont désactivées si le système demande « réduire les animations ».

**Deux espaces**
- Espace étudiant (page d'accueil) : inscription en ligne avec formulaire validé, puis suivi du dossier grâce au numéro d'inscription et au CIN.
- Espace administration : accès par code de démonstration (`admin2026`, indiqué dans « Accès de démonstration » sur la page de connexion), tableau de bord, liste des dossiers (recherche, filtres, tri, validation, modification, suppression) et bouton « Vider les données » avec confirmation.
- Page Contact (administrateur) : prépare un email à l'étudiant (motif, objet, message modifiable) et l'envoie via la messagerie du système, Gmail (dans le navigateur) ou par copie du message. Le dossier peut être marqué « À corriger » et un historique des messages est conservé dans le navigateur.
- Statuts d'un dossier : En attente, Validé, À corriger, Refusé. L'étudiant voit un message adapté à son statut dans le suivi.
- La session administrateur reste ouverte au rechargement de la page (elle se ferme avec l'onglet).
- Pièces à fournir : l'administrateur coche les pièces reçues ; l'étudiant voit les pièces reçues ou manquantes dans le suivi ; le message « Document manquant » liste automatiquement les pièces manquantes.
- Attestation d'inscription imprimable (dossier validé) avec la mention « document de démonstration ».
- Export CSV de tous les dossiers, compatible Excel.

**Accessibilité**
- HTML sémantique, labels associés aux champs, messages d'erreur lisibles.
- Navigation au clavier et focus visible.

## Technologies utilisées

| Technologie | Utilisation |
|---|---|
| HTML5 | Structure sémantique des pages |
| CSS3 | Variables CSS, Flexbox, Grid, responsive design |
| JavaScript (ES6+) | Logique de l'application et manipulation du DOM |
| LocalStorage | Persistance des données dans le navigateur |

Aucune bibliothèque JavaScript, aucun outil de build. La police Inter est chargée depuis Google Fonts (police système en secours hors connexion).

## Structure du projet

```
student-management-system/
├── index.html      # Structure de l'application (sidebar, vues, formulaire, dialogue)
├── style.css       # Styles : variables, mise en page, composants, responsive
├── script.js       # Logique : état, validation, rendu, LocalStorage
├── assets/
│   └── images/     # Logo de l'ISET (logo-iset-sbz.png) et captures d'écran
└── README.md
```

## Installation et lancement

Aucune installation n'est nécessaire.

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/VOTRE-NOM-UTILISATEUR/student-management-system.git
   cd student-management-system
   ```
2. Ouvrir `index.html` dans un navigateur moderne (Chrome, Edge, Firefox, Safari).

Option recommandée : utiliser l'extension **Live Server** de VS Code (clic droit sur `index.html` puis « Open with Live Server »).

## Déploiement sur GitHub

```bash
git init
git add .
git commit -m "Version initiale : Student Management System"
git branch -M main
git remote add origin https://github.com/VOTRE-NOM-UTILISATEUR/student-management-system.git
git push -u origin main
```

**Publier avec GitHub Pages :** dans le dépôt, ouvrir *Settings* puis *Pages*, choisir *Deploy from a branch*, la branche `main` et le dossier `/ (root)`, puis enregistrer. Le site sera disponible à l'adresse `https://VOTRE-NOM-UTILISATEUR.github.io/student-management-system/` après quelques minutes.

**Vérifications après publication :**
- Le logo s'affiche (chemin `assets/images/logo-iset-sbz.png`, attention aux majuscules/minuscules).
- Les styles sont chargés (pas d'erreur 404 dans la console du navigateur, touche F12).
- Une inscription, la connexion administrateur, la validation d'un dossier et l'export CSV fonctionnent.
- L'affichage est correct sur mobile.

## Captures d'écran

Captures réalisées avec des données fictives.

| Inscription (étudiant) | Tableau de bord (administrateur) |
|---|---|
| ![Formulaire d'inscription](assets/images/student-form.png) | ![Tableau de bord](assets/images/dashboard.png) |

| Liste des dossiers | Page Contact |
|---|---|
| ![Liste des dossiers](assets/images/students-list.png) | ![Page Contact](assets/images/contact.png) |

| Écran d'accueil | Connexion administrateur | Version mobile |
|---|---|---|
| ![Écran d'accueil](assets/images/splash.png) | ![Connexion](assets/images/login.png) | ![Version mobile](assets/images/mobile.png) |

## Comment fonctionne le LocalStorage

Le LocalStorage est un espace de stockage clé / valeur intégré au navigateur.

- Les étudiants sont enregistrés au format JSON sous la clé `sms.students.v2`.
- Au démarrage, l'application lit cette clé. Si elle est vide ou si le JSON est invalide, elle repart d'une liste vide sans planter.
- Après chaque ajout, modification ou suppression, la liste complète est sauvegardée.
- Les données persistent après un rechargement de la page ou la fermeture du navigateur.

**Important :** le LocalStorage est un stockage local au navigateur. Ce n'est **pas** une base de données partagée et ce n'est **pas** sécurisé. Les données ne sont visibles que dans le navigateur et sur l'appareil utilisés, et n'importe qui ayant accès à cet appareil peut les lire ou les modifier. Cette application ne doit pas être utilisée pour de vrais dossiers d'étudiants.

## Limites connues

- Les données sont propres à un navigateur et à un appareil : pas de synchronisation, pas de partage.
- Capacité limitée du LocalStorage (environ 5 Mo selon le navigateur).
- L'accès administrateur est une démonstration : le code est visible dans `script.js`, ce n'est pas une vraie authentification.
- L'application n'envoie pas d'email elle-même : elle prépare le message (lien `mailto:`, Gmail ou copie) et l'administrateur l'envoie. Un vrai envoi nécessite un backend.
- Étudiant et administrateur partagent le même LocalStorage : la démonstration fonctionne dans un seul navigateur.
- Export CSV uniquement : pas d'import de données.
- L'attestation est un document de démonstration, sans signature ni cachet officiels.
- Pas de tests automatisés.
- Vérifié dans Chromium (parcours étudiant et administrateur complets, pagination, affichage mobile 390 px). Non testé sur Firefox et Safari.

## Pistes d'amélioration

Idées non implémentées à ce jour :

- Import de données (CSV / JSON).
- Tri en cliquant sur les en-têtes de colonnes.
- Mode sombre.
- Backend et base de données pour un vrai stockage partagé.
- Tests automatisés.

## Auteur

- **Nom :** _[votre nom]_
- **GitHub :** _[lien vers votre profil GitHub]_
- **LinkedIn :** _[lien vers votre profil LinkedIn]_
