# Transport Scolaire - AIN SEBAA (2026-2027)

Application web de gestion du transport scolaire pour les élèves et la flotte de chauffeurs de l'établissement à Aïn Sebaâ.

## Fonctionnalités (Phase 1)
1. **Importation Excel des Élèves** :
   - Support des en-têtes arabes (`النسب`, `الإسم`, `مستوى`, `منطقة`) et français (`nom`, `prenom`, `niveau`, `zone`).
   - Détection automatique de la ligne d'en-tête dans les 10 premières lignes.
   - Validation stricte des niveaux (1 pour sortie 15h15, 2 pour sortie 16h00).
   - Normalisation automatique des zones (minuscules, sans accents).

2. **Importation Excel des Chauffeurs** :
   - Détection automatique des colonnes `CHAUFFEUR`, `ZONE`, `PLACES` (22, 26, 32 places).
   - Prise en charge des colonnes de rotations : `MATIN 1`, `MATIN 2`, `15H15`, `16H00`.

3. **Statistiques & Détection des Déficits** :
   - Total élèves, chauffeurs, et capacité globale en places.
   - Répartition par niveau (Niveau 1 vs Niveau 2).
   - Tableau croisé par zone avec indicateur de statut (Équilibré ou Déficit).
   - Liste détaillée des zones nécessitant des rotations.

4. **Visualisation & Filtres** :
   - Page dédiée avec tableau paginé et recherchable des élèves.
   - Page dédiée avec tableau détaillé des véhicules et des rotations prévues.
   - Modèles de fichiers Excel téléchargeables en un clic.
   - Bouton de chargement d'un jeu de démonstration complet pour tester immédiatement sans fichier externe.

## Fonctionnalités (Phase 2 - Algorithme de Répartition)
1. **Moteur d'affectation automatique (`src/utils/repartition.ts`)** :
   - Gestion stricte des 4 voyages par jour :
     - `MATIN_1` (08h30 - rentrée générale)
     - `MATIN_2` (09h15 - seconde rotation pour Aïn Sebaâ)
     - `APRES_MIDI_15H15` (sortie Niveau 1)
     - `APRES_MIDI_16H00` (sortie Niveau 2)
   - Règles de priorité pondérées :
     - Priorité 1 : Élèves de la zone d'affectation du chauffeur
     - Priorité 2 : Élèves d'Aïn Sebaâ (école)
     - Priorité 3 : Autres zones si le chauffeur cible Aïn Sebaâ
   - Respect absolu de la capacité en places par voyage et équilibrage du taux de remplissage.
2. **Alertes & Diagnostics** :
   - Détection des surcharges de capacité (`SURCHARGE`).
   - Détection des sous-utilisations (`SOUS_UTILISATION` pour < 50% de remplissage).
   - Signalement des élèves non affectés (`NON_AFFECTE`).
   - Alertes préventives de déficit par zone (`DEFICIT_ZONE`).
3. **Tableau de bord de répartition (`src/pages/RepartitionPage.tsx`)** :
   - Bouton de déclenchement avec indicateur de chargement fluide.
   - Statistiques clés : élèves affectés, non affectés, taux global.
   - Tableau récapitulatif par chauffeur sur les 4 créneaux horaires avec jauges et pourcentages.
   - Ventilation détaillée par voyage avec barres de progression de remplissage.
   - Bouton d'impression du rapport récapitulatif.

## Prochaine étape (Phase 3)
- Listes détaillées par chauffeur et par voyage avec export PDF et Excel.
