# Déploiement sur GitHub Pages

Ce guide vous explique comment publier l'application **Transport Scolaire - AIN SEBAA** sur **GitHub Pages** en quelques clics.

---

## ⚙️ Ce qui a été configuré automatiquement

1. **Chemins relatifs (`base: './'`)** : configuré dans `vite.config.ts` pour que les scripts, styles et polices se chargent correctement quelle que soit l'URL de votre dépôt (`https://<utilisateur>.github.io/<nom-du-repo>/`).
2. **Workflow GitHub Actions (`.github/workflows/deploy.yml`)** : compile et déploie automatiquement le site à chaque `git push`.
3. **Architecture 100% autonome dans le navigateur** :
   - Algorithme d'affectation et calculs d'équilibrage
   - Scénarios d'optimisation (carburant, flotte, charge)
   - Import et export Excel (fichiers élèves et chauffeurs)
   - Génération de listes d'embarquement PDF avec émargement
   - Sauvegarde et restauration des configurations JSON

---

## 🚀 Étapes de mise en ligne

### Étape 1 : Exporter le projet sur GitHub
- Dans Google AI Studio, cliquez sur le menu des paramètres en haut à droite (**Settings** ou icône engrenage).
- Choisissez **Export to GitHub** (ou téléchargez le ZIP puis poussez-le sur un nouveau dépôt GitHub).

### Étape 2 : Activer GitHub Actions pour GitHub Pages
1. Ouvrez votre dépôt sur **GitHub**.
2. Cliquez sur l'onglet **Settings** (Paramètres du dépôt).
3. Dans le menu latéral gauche, cliquez sur **Pages** (dans la section *Code and automation*).
4. Sous **Build and deployment** :
   - Pour **Source**, sélectionnez **GitHub Actions** (au lieu de *Deploy from a branch*).

### Étape 3 : Déploiement automatique
- Dès la sélection de **GitHub Actions** (ou dès votre prochain `git push`), le workflow `.github/workflows/deploy.yml` se lance automatiquement.
- Vous pouvez suivre son avancement dans l'onglet **Actions** de votre dépôt.
- Une fois terminé, GitHub affiche l'adresse publique de votre application :
  `https://<votre-identifiant>.github.io/<nom-du-repo>/`

---

## 🛠️ Déploiement manuel local (Alternative facultative)

Si vous préférez compiler et déployer localement :
```bash
# 1. Compiler le site statique
npm run build:static

# 2. Le dossier "dist" généré contient tous les fichiers prêts à être hébergés
```
