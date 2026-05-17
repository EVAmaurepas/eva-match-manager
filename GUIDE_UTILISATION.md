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

- **Génération Avancée (Match après Match) :** L'algorithme de matchmaking 4v4 optimise à la fois le temps de jeu et la variété des rencontres pour briser les "pools de joueurs fixes". Il fonctionne en 4 étapes :
  1. **Score Individuel de Priorité :** Calcule un score pour chaque joueur combinant son attente consécutive sur le banc (`consecutiveBench` avec poids 10), le temps écoulé depuis sa dernière participation (`timeSinceLastMatch` avec poids 1), son volume total de jeu (`gamesPlayed` avec poids -3), et un léger bruit aléatoire pour conserver un roulement naturel.
  2. **Sélection intelligente du groupe de 8 :** Identifie les 12 meilleurs joueurs candidats, puis teste les 495 combinaisons de 8 joueurs possibles pour retenir celle qui maximise la priorité collective tout en minimisant la répétition des mêmes joueurs ensemble (historique de co-présence en match).
  3. **Création d'Équipes 4v4 Optimales :** Divise les 8 joueurs choisis en deux équipes en équilibrant leur niveau global (force des équipes avec poids 6), tout en minimisant le fait de rejouer avec les mêmes coéquipiers (historique des coéquipiers avec poids -5) ou contre les mêmes adversaires (historique des adversaires avec poids -2).
  4. **Atténuation de l'Historique (Decay) :** À chaque validation de match, les historiques d'affinités sont multipliés par `0.95` pour accorder la priorité au brassage récent et éviter que le système ne se fige dans le temps.
- **File d'attente :** Vous pouvez préparer plusieurs matchs à l'avance.
- **Remplacement Manuel :** Si un joueur présent dans un match généré doit être remplacé (ex : fatigue ou indisponibilité), l'administrateur peut cliquer sur l'icône d'échange ($\rightleftarrows$) à côté de son nom. Une fenêtre affiche alors tous les joueurs actuellement sur le banc (avec leurs statistiques de jeu et temps d'attente), permettant d'effectuer le remplacement en un clic tout en recalculant automatiquement l'équilibrage de force des équipes.
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
