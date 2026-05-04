# 🎮 EVA Match Manager - Guide d'Utilisation

Bienvenue dans l'interface de gestion des matchs **EVA Maurepas**. Cette application a été conçue pour simplifier l'organisation des sessions de jeu, la création d'équipes équilibrées et le suivi des tournois (Khéops League).

---

## 🚀 Présentation de l'Application

L'**EVA Match Manager** est un outil de gestion en temps réel qui permet de :

- Gérer une liste de joueurs (Roster) avec leurs niveaux respectifs.
- Générer automatiquement des matchs équilibrés.
- Suivre l'historique des rencontres de la journée.
- Archiver les sessions passées pour garder une trace des performances.

---

## 🛠️ Fonctionnement de l'Interface

L'application est divisée en 4 onglets principaux :

### 1. Roster (Gestion des Joueurs)

C'est ici que vous enregistrez les participants.

- **Ajout :** Saisissez le nom du joueur et son niveau (1 à 5).
- **Suivi :** Le compteur de matchs joués s'incrémente automatiquement à chaque fois qu'un joueur termine un match.
- **Admin :** Seul l'administrateur peut ajouter, modifier ou supprimer des joueurs.

### 2. Match Area (Zone de Jeu)

Le cœur de l'application.

- **Génération :** L'algorithme sélectionne les joueurs prioritaires (ceux qui ont le moins joué) et crée deux équipes équilibrées en fonction de leurs niveaux.
- **File d'attente :** Vous pouvez préparer plusieurs matchs à l'avance.
- **Validation :** Cliquer sur "Terminer le match" archive la rencontre dans l'historique et met à jour le compteur des joueurs.

### 3. Historique

Affiche tous les matchs joués lors de la session actuelle. Idéal pour vérifier un score ou une composition d'équipe passée.

### 4. Archives

Permet de consulter les sessions précédentes (ex: "Tournoi du 15 Mai"). Chaque archive contient l'état complet des joueurs et des matchs à un instant T.

---

## 🔐 Administration et Sécurité

L'accès est protégé par deux types de comptes :

- **Viewer :** Peut consulter les listes, les matchs et l'historique (idéal pour un affichage sur écran public).
- **Admin :** Possède les droits de modification, de réinitialisation et d'import/export de données.

### Réinitialisation (Reset)

En fin de journée ou de tournoi, l'admin peut cliquer sur **RESET**.

- Vous aurez l'option d'archiver la session actuelle avant de tout effacer.
- Cela remet les compteurs de matchs à zéro et vide le roster pour la session suivante.

---

## 🏗️ Architecture Technique

L'application repose sur une architecture moderne et performante :

### Frontend (Interface)

- **React + Vite :** Pour une interface fluide et ultra-rapide.
- **Lucide React :** Pour une iconographie moderne.
- **CSS Custom (EVA Style) :** Un design "Cyberpunk/Gaming" sur mesure, optimisé pour l'immersion.

### Backend (Serveur)

- **Vercel Serverless Functions :** L'application n'a pas de serveur classique "allumé 24h/24". Le code s'exécute à la demande via des fonctions API (`/api/state`, `/api/login`).
- **Persistence :** Les données sont synchronisées en temps réel entre le navigateur (LocalStorage) et la base de données.

### Base de Données

- **Redis (Serverless) :** Une base de données ultra-rapide (en mémoire) qui stocke l'état global du manager. Cela permet à plusieurs appareils de voir la même liste de joueurs et les mêmes matchs en temps réel.

### Déploiement

- **Vercel :** L'hébergement est géré par Vercel, avec un déploiement continu lié au dépôt GitHub.

---

*Développé pour EVA Maurepas.*
