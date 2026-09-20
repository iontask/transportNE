import { Chauffeur, Eleve, ResultatRepartition, AffectationEleve } from '../types';
import {
  VOYAGES,
  VOYAGE_KEY_TO_ID,
  VOYAGE_ID_TO_KEY,
  normaliserNomZone,
  obtenirZonesVoyageChauffeur,
  obtenirZoneOriginaleVoyage,
  obtenirZonesChauffeur,
  estVoyageSans,
  extraireNiveaux,
  getConfigVoyage,
  chauffeurDessertZonePourVoyage,
  repartir,
  optimiserContinuiteMatinApresMidi,
  construireResultatDepuisAffectations,
} from './repartition';

export interface RecommandationZoneIA {
  id: string;
  chauffeurId: string;
  chauffeurNom: string;
  zone: string;
  zoneNormalisee: string;
  action: 'AJOUTER' | 'ENLEVER';
  voyagesCibles: string[]; // e.g. ['MATIN_1', 'APRES_MIDI_15H15']
  voyagesLibelles: string;  // e.g. "Matin 1 & Après-midi 15h15"
  zoneOriginaleChauffeur: string;
  isZoneOriginale: boolean; // toujours false car la zone originale est strictement protégée
  priorite: 'HAUTE' | 'MOYENNE' | 'OPTIMISATION';
  categorie: 'CONTINUITE' | 'COUVERTURE_ELEVES' | 'DESENCOMBREMENT';
  motif: string;
  gainEstime: {
    elevesCouverture: number;
    elevesContinuite: number;
    nomsElevesConcernes: string[];
    placesLibresActuelles: number;
  };
  selectionnee: boolean;
  isZoneCommune?: boolean;
  seuil60Concerne?: boolean;
}

export interface OptionsAnalyseZonesIA {
  maxZonesParChauffeur?: number; // default 3
  zoneCommune?: string; // default 'ain sebaa'
  seuilRemplissageCible?: number; // default 0.60
}

export interface AnalyseZonesIAResultat {
  recommandations: RecommandationZoneIA[];
  statistiquesActuelles: {
    totalEleves: number;
    elevesAffectes: number;
    elevesNonAffectes: number;
    tauxCouverture: number;
    elevesMemeChauffeur: number;
    elevesChauffeurDifferent: number;
    tauxContinuite: number;
  };
  statistiquesPrevisionnelles: {
    elevesAffectes: number;
    elevesNonAffectes: number;
    tauxCouverture: number;
    elevesMemeChauffeur: number;
    tauxContinuite: number;
    gainNetEleves: number;
    gainNetContinuite: number;
  };
  zonesAvecDeficit: Array<{
    zone: string;
    nbElevesNonAffectes: number;
    chauffeursRecommandes: string[];
  }>;
  syntheseIA: string;
}

const LIBELLES_VOYAGES: Record<string, string> = {
  MATIN_1: 'Matin 1 (08h30)',
  MATIN_2: 'Matin 2 (09h15)',
  APRES_MIDI_15H15: 'Après-midi (15h15)',
  APRES_MIDI_16H00: 'Après-midi (16h00)',
};

/**
 * Analyse la répartition actuelle et génère des recommandations précises
 * d'AJOUT ou de RETRAIT de zones en plus de la zone originale pour chaque chauffeur,
 * dans le double objectif :
 * 1. Couvrir le maximum d'élèves (0 non affecté).
 * 2. Garantir que chaque élève reste avec son chauffeur respectif matin et après-midi (100% continuité).
 */
export function analyserEtRecommanderZonesIA(
  eleves: Eleve[],
  chauffeurs: Chauffeur[],
  resultat: ResultatRepartition,
  emplacementsVerrouilles: Set<string> | string[] = new Set(),
  options?: OptionsAnalyseZonesIA
): AnalyseZonesIAResultat {
  const maxZones = options?.maxZonesParChauffeur ?? 3;
  const zoneCommuneNorm = options?.zoneCommune ? normaliserNomZone(options.zoneCommune) : 'ain sebaa';
  const seuilCible = options?.seuilRemplissageCible ?? 0.60;

  const setVerrouilles = new Set(emplacementsVerrouilles);
  const chauffeursMap = new Map(chauffeurs.map((c) => [c.id, c]));
  const elevesMap = new Map(eleves.map((e) => [e.id, e]));

  const affectations = resultat.affectations;
  const statsActuelles = resultat.statistiques;

  // 1. Détecter les élèves par voyage
  const affParEleve = new Map<string, { matin?: AffectationEleve; apresMidi?: AffectationEleve }>();
  affectations.forEach((aff) => {
    const cur = affParEleve.get(aff.eleveId) || {};
    if (aff.voyageId === 'MATIN_1' || aff.voyageId === 'MATIN_2') {
      cur.matin = aff;
    } else if (aff.voyageId === 'APRES_MIDI_15H15' || aff.voyageId === 'APRES_MIDI_16H00') {
      cur.apresMidi = aff;
    }
    affParEleve.set(aff.eleveId, cur);
  });

  // Calcul des places occupées actuelles par chauffeur et par voyage
  const placesOccupees = new Map<string, number>(); // clé: `${chauffeurId}_${voyageId}`
  affectations.forEach((aff) => {
    const key = `${aff.chauffeurId}_${aff.voyageId}`;
    placesOccupees.set(key, (placesOccupees.get(key) || 0) + 1);
  });

  const getPlacesLibres = (chauffeurId: string, voyageId: string): number => {
    const ch = chauffeursMap.get(chauffeurId);
    if (!ch) return 0;
    if (estVoyageSans(ch, voyageId)) return 0;
    const occ = placesOccupees.get(`${chauffeurId}_${voyageId}`) || 0;
    return Math.max(0, (ch.places || 0) - occ);
  };

  const recommandations: RecommandationZoneIA[] = [];
  const recommandationsMap = new Map<string, RecommandationZoneIA>(); // clé unique: `${chauffeurId}_${action}_${zone}`

  // =========================================================================
  // OBJECTIF A : CONTINUITÉ DU MÊME CHAUFFEUR MATIN & APRÈS-MIDI
  // Cas où un élève a un chauffeur le matin, mais change l'après-midi (ou vice-versa)
  // parce que son chauffeur du matin ne dessert pas sa zone l'après-midi.
  // =========================================================================
  eleves.forEach((eleve) => {
    const trajets = affParEleve.get(eleve.id);
    const affMatin = trajets?.matin;
    const affAprem = trajets?.apresMidi;
    const zoneEleveNorm = normaliserNomZone(eleve.zone);

    // Cas 1 : L'élève a un chauffeur le matin, et soit n'a pas de chauffeur l'après-midi,
    // soit a un chauffeur différent l'après-midi
    if (affMatin) {
      const chMatin = chauffeursMap.get(affMatin.chauffeurId);
      if (chMatin) {
        const voyageApremCible = eleve.niveau === 1 ? 'APRES_MIDI_15H15' : 'APRES_MIDI_16H00';
        const lockKey = `${chMatin.id}_${voyageApremCible}`;

        // Vérifier si le chauffeur du matin roule l'après-midi et n'est pas verrouillé
        if (!estVoyageSans(chMatin, voyageApremCible) && !setVerrouilles.has(lockKey)) {
          const dessertDeja = chauffeurDessertZonePourVoyage(chMatin, zoneEleveNorm, voyageApremCible);
          const memeChauffeur = affAprem && affAprem.chauffeurId === chMatin.id;

          if (!dessertDeja && !memeChauffeur) {
            const placesLibres = getPlacesLibres(chMatin.id, voyageApremCible);
            const keyRec = `${chMatin.id}_AJOUTER_${zoneEleveNorm}_${voyageApremCible}`;
            const zoneOrig = obtenirZoneOriginaleVoyage(chMatin, voyageApremCible);

            let rec = recommandationsMap.get(keyRec);
            if (!rec) {
              rec = {
                id: `rec-cont-${keyRec}`,
                chauffeurId: chMatin.id,
                chauffeurNom: chMatin.nom,
                zone: eleve.zone,
                zoneNormalisee: zoneEleveNorm,
                action: 'AJOUTER',
                voyagesCibles: [voyageApremCible],
                voyagesLibelles: LIBELLES_VOYAGES[voyageApremCible] || voyageApremCible,
                zoneOriginaleChauffeur: zoneOrig,
                isZoneOriginale: false,
                priorite: 'HAUTE',
                categorie: 'CONTINUITE',
                motif: `Garantir le même chauffeur matin et après-midi pour les élèves de la zone ${eleve.zone.toUpperCase()} transportés par ${chMatin.nom} le matin.`,
                gainEstime: {
                  elevesCouverture: affAprem ? 0 : 1,
                  elevesContinuite: 1,
                  nomsElevesConcernes: [`${eleve.prenom} ${eleve.nom}`.trim()],
                  placesLibresActuelles: placesLibres,
                },
                selectionnee: true,
              };
              recommandationsMap.set(keyRec, rec);
            } else {
              rec.gainEstime.elevesContinuite += 1;
              if (!affAprem) rec.gainEstime.elevesCouverture += 1;
              const nom = `${eleve.prenom} ${eleve.nom}`.trim();
              if (!rec.gainEstime.nomsElevesConcernes.includes(nom)) {
                rec.gainEstime.nomsElevesConcernes.push(nom);
              }
            }
          }
        }
      }
    }

    // Cas 2 : L'élève a un chauffeur l'après-midi mais pas le matin (ou chauffeur différent)
    // et le chauffeur de l'après-midi ne dessert pas la zone le matin
    if (affAprem && (!affMatin || affMatin.chauffeurId !== affAprem.chauffeurId)) {
      const chAprem = chauffeursMap.get(affAprem.chauffeurId);
      if (chAprem) {
        // Déterminer sur quel créneau matin il a le plus de sens d'ajouter la zone
        const configsMatin = ['MATIN_1', 'MATIN_2'];
        for (const vMatin of configsMatin) {
          const lockKey = `${chAprem.id}_${vMatin}`;
          if (!estVoyageSans(chAprem, vMatin) && !setVerrouilles.has(lockKey)) {
            const config = getConfigVoyage(chAprem, vMatin);
            const niveaux = extraireNiveaux(config);
            if (niveaux.includes(eleve.niveau)) {
              const dessertDeja = chauffeurDessertZonePourVoyage(chAprem, zoneEleveNorm, vMatin);
              if (!dessertDeja) {
                const placesLibres = getPlacesLibres(chAprem.id, vMatin);
                const keyRec = `${chAprem.id}_AJOUTER_${zoneEleveNorm}_${vMatin}`;
                const zoneOrig = obtenirZoneOriginaleVoyage(chAprem, vMatin);

                let rec = recommandationsMap.get(keyRec);
                if (!rec) {
                  rec = {
                    id: `rec-cont-matin-${keyRec}`,
                    chauffeurId: chAprem.id,
                    chauffeurNom: chAprem.nom,
                    zone: eleve.zone,
                    zoneNormalisee: zoneEleveNorm,
                    action: 'AJOUTER',
                    voyagesCibles: [vMatin],
                    voyagesLibelles: LIBELLES_VOYAGES[vMatin] || vMatin,
                    zoneOriginaleChauffeur: zoneOrig,
                    isZoneOriginale: false,
                    priorite: 'HAUTE',
                    categorie: 'CONTINUITE',
                    motif: `Permettre à ${chAprem.nom} de prendre en charge le matin ses élèves de l'après-midi de la zone ${eleve.zone.toUpperCase()}.`,
                    gainEstime: {
                      elevesCouverture: affMatin ? 0 : 1,
                      elevesContinuite: 1,
                      nomsElevesConcernes: [`${eleve.prenom} ${eleve.nom}`.trim()],
                      placesLibresActuelles: placesLibres,
                    },
                    selectionnee: true,
                  };
                  recommandationsMap.set(keyRec, rec);
                } else {
                  rec.gainEstime.elevesContinuite += 1;
                  if (!affMatin) rec.gainEstime.elevesCouverture += 1;
                  const nom = `${eleve.prenom} ${eleve.nom}`.trim();
                  if (!rec.gainEstime.nomsElevesConcernes.includes(nom)) {
                    rec.gainEstime.nomsElevesConcernes.push(nom);
                  }
                }
                break; // Un seul créneau matin suffit
              }
            }
          }
        }
      }
    }
  });

  // =========================================================================
  // OBJECTIF B : COUVERTURE DU MAXIMUM D'ÉLÈVES NON AFFECTÉS
  // Pour chaque élève sans transport sur un voyage, trouver le chauffeur ayant des
  // places disponibles qui pourrait ajouter cette zone pour le transporter.
  // =========================================================================
  const elevesNonAffectes = statsActuelles.elevesNonAffectes || [];
  const nonAffectesParZone = new Map<string, Eleve[]>();
  elevesNonAffectes.forEach((e) => {
    const zNorm = normaliserNomZone(e.zone);
    const list = nonAffectesParZone.get(zNorm) || [];
    list.push(e);
    nonAffectesParZone.set(zNorm, list);
  });

  const zonesAvecDeficit: Array<{
    zone: string;
    nbElevesNonAffectes: number;
    chauffeursRecommandes: string[];
  }> = [];

  nonAffectesParZone.forEach((listeElevesZone, zNorm) => {
    const nomZoneAffiche = listeElevesZone[0].zone;
    const chauffeursRecommandesPourZone: string[] = [];

    // Pour chaque voyage où des élèves de cette zone manquent de transport
    VOYAGES.forEach((voyage) => {
      const elevesZoneManquantsVoyage = listeElevesZone.filter((e) => {
        const affsEleve = affectations.filter((a) => a.eleveId === e.id);
        if (voyage.id === 'MATIN_1' || voyage.id === 'MATIN_2') {
          return !affsEleve.some((a) => a.voyageId === 'MATIN_1' || a.voyageId === 'MATIN_2');
        }
        if (voyage.id === 'APRES_MIDI_15H15') {
          return e.niveau === 1 && !affsEleve.some((a) => a.voyageId === 'APRES_MIDI_15H15');
        }
        if (voyage.id === 'APRES_MIDI_16H00') {
          return e.niveau === 2 && !affsEleve.some((a) => a.voyageId === 'APRES_MIDI_16H00');
        }
        return false;
      });

      if (elevesZoneManquantsVoyage.length === 0) return;

      // Chercher les chauffeurs actifs ayant des places libres sur ce voyage et ne desservant pas encore cette zone
      const candidats = chauffeurs.filter((ch) => {
        const lockKey = `${ch.id}_${voyage.id}`;
        if (setVerrouilles.has(lockKey)) return false;
        if (estVoyageSans(ch, voyage.id)) return false;

        const config = getConfigVoyage(ch, voyage.id);
        const niveaux = extraireNiveaux(config);
        const hasNiveauMatch = elevesZoneManquantsVoyage.some((e) => niveaux.includes(e.niveau));
        if (!hasNiveauMatch) return false;

        const dessertDeja = chauffeurDessertZonePourVoyage(ch, zNorm, voyage.id);
        if (dessertDeja) return false;

        const zonesActuelles = obtenirZonesVoyageChauffeur(ch, voyage.id);
        if (zonesActuelles.length >= maxZones && zNorm !== zoneCommuneNorm) return false;

        const libres = getPlacesLibres(ch.id, voyage.id);
        return libres > 0;
      });

      // Trier les candidats par places libres descendantes
      candidats.sort((a, b) => getPlacesLibres(b.id, voyage.id) - getPlacesLibres(a.id, voyage.id));

      let elevesRestants = elevesZoneManquantsVoyage.length;
      for (const ch of candidats) {
        if (elevesRestants <= 0) break;
        const placesLibres = getPlacesLibres(ch.id, voyage.id);
        const aPrendre = Math.min(placesLibres, elevesRestants);

        const keyRec = `${ch.id}_AJOUTER_${zNorm}_${voyage.id}`;
        const zoneOrig = obtenirZoneOriginaleVoyage(ch, voyage.id);

        let rec = recommandationsMap.get(keyRec);
        if (!rec) {
          rec = {
            id: `rec-couv-${keyRec}`,
            chauffeurId: ch.id,
            chauffeurNom: ch.nom,
            zone: nomZoneAffiche,
            zoneNormalisee: zNorm,
            action: 'AJOUTER',
            voyagesCibles: [voyage.id],
            voyagesLibelles: LIBELLES_VOYAGES[voyage.id] || voyage.id,
            zoneOriginaleChauffeur: zoneOrig,
            isZoneOriginale: false,
            priorite: 'HAUTE',
            categorie: 'COUVERTURE_ELEVES',
            motif: `Ajouter la zone ${nomZoneAffiche.toUpperCase()} à ${ch.nom} pour absorber ${aPrendre} élève(s) non affecté(s) grâce à ses ${placesLibres} places libres.`,
            gainEstime: {
              elevesCouverture: aPrendre,
              elevesContinuite: 0,
              nomsElevesConcernes: elevesZoneManquantsVoyage.slice(0, aPrendre).map((e) => `${e.prenom} ${e.nom}`.trim()),
              placesLibresActuelles: placesLibres,
            },
            selectionnee: true,
          };
          recommandationsMap.set(keyRec, rec);
        } else {
          rec.gainEstime.elevesCouverture += aPrendre;
        }

        if (!chauffeursRecommandesPourZone.includes(ch.nom)) {
          chauffeursRecommandesPourZone.push(ch.nom);
        }
        elevesRestants -= aPrendre;
      }
    });

    zonesAvecDeficit.push({
      zone: nomZoneAffiche,
      nbElevesNonAffectes: listeElevesZone.length,
      chauffeursRecommandes: chauffeursRecommandesPourZone,
    });
  });

  // =========================================================================
  // OBJECTIF D : EXTENSION DE LA ZONE COMMUNE POUR LES TRANSPORTS SOUS 60%
  // Pour les bus qui tournent avec peu d'élèves (< 60%), proposer d'ajouter
  // la zone commune (ex: Aïn Sebaâ) pour franchir le seuil et éviter d'être mis à 0,
  // dans le strict respect du plafond de maxZones.
  // =========================================================================
  if (zoneCommuneNorm) {
    chauffeurs.forEach((chauffeur) => {
      VOYAGES.forEach((voyage) => {
        const lockKey = `${chauffeur.id}_${voyage.id}`;
        if (setVerrouilles.has(lockKey) || estVoyageSans(chauffeur, voyage.id)) return;

        const zonesDuVoyage = obtenirZonesVoyageChauffeur(chauffeur, voyage.id);
        const zNorms = zonesDuVoyage.map(normaliserNomZone);
        if (zNorms.includes(zoneCommuneNorm)) return;
        if (zonesDuVoyage.length >= maxZones) return;

        const occ = placesOccupees.get(`${chauffeur.id}_${voyage.id}`) || 0;
        const placesTotales = chauffeur.places || 26;
        if (occ > 0 && occ / placesTotales < seuilCible) {
          const placesLibres = Math.max(0, placesTotales - occ);
          const keyRec = `${chauffeur.id}_AJOUTER_${zoneCommuneNorm}_${voyage.id}`;
          if (!recommandationsMap.has(keyRec)) {
            const zoneOrig = obtenirZoneOriginaleVoyage(chauffeur, voyage.id);
            const libelleCommune = options?.zoneCommune?.toUpperCase() || 'AÏN SEBAÂ';
            recommandationsMap.set(keyRec, {
              id: `rec-commune-seuil-${keyRec}`,
              chauffeurId: chauffeur.id,
              chauffeurNom: chauffeur.nom,
              zone: options?.zoneCommune || 'ain sebaa',
              zoneNormalisee: zoneCommuneNorm,
              action: 'AJOUTER',
              voyagesCibles: [voyage.id],
              voyagesLibelles: LIBELLES_VOYAGES[voyage.id] || voyage.id,
              zoneOriginaleChauffeur: zoneOrig,
              isZoneOriginale: false,
              priorite: 'HAUTE',
              categorie: 'COUVERTURE_ELEVES',
              isZoneCommune: true,
              seuil60Concerne: true,
              motif: `Ajustement Seuil 60% : Assigner la zone commune ${libelleCommune} à ${chauffeur.nom} (${occ}/${placesTotales} places) pour franchir le seuil > 60% et rentabiliser le voyage dans la limite de ${maxZones} zones max.`,
              gainEstime: {
                elevesCouverture: Math.min(placesLibres, Math.ceil(placesTotales * seuilCible) - occ),
                elevesContinuite: 0,
                nomsElevesConcernes: [],
                placesLibresActuelles: placesLibres,
              },
              selectionnee: true,
            });
          }
        }
      });
    });
  }

  // =========================================================================
  // OBJECTIF C : ENLEVER LES ZONES SECONDAIRES INUTILES OU EN SURNOMBRE
  // (Strictement HORS zone originale du chauffeur)
  // Si un chauffeur a une zone supplémentaire configurée où il n'a aucun élève
  // assigné et qui disperse inutilement sa ligne.
  // =========================================================================
  chauffeurs.forEach((chauffeur) => {
    VOYAGES.forEach((voyage) => {
      const lockKey = `${chauffeur.id}_${voyage.id}`;
      if (setVerrouilles.has(lockKey)) return;
      if (estVoyageSans(chauffeur, voyage.id)) return;

      const zonesDuVoyage = obtenirZonesVoyageChauffeur(chauffeur, voyage.id);
      const zoneOriginale = normaliserNomZone(obtenirZoneOriginaleVoyage(chauffeur, voyage.id));

      // Obtenir les élèves affectés à ce chauffeur sur ce voyage
      const affsChauffeurVoyage = affectations.filter(
        (a) => a.chauffeurId === chauffeur.id && a.voyageId === voyage.id
      );
      const zonesUtiliseesParEleves = new Set(
        affsChauffeurVoyage
          .map((a) => {
            const e = elevesMap.get(a.eleveId);
            return e ? normaliserNomZone(e.zone) : '';
          })
          .filter(Boolean)
      );

      zonesDuVoyage.forEach((zone) => {
        const zNorm = normaliserNomZone(zone);
        // PROTECTION ABSOLUE : on ne touche JAMAIS à la zone originale du chauffeur !
        if (zNorm === zoneOriginale) return;

        // Si aucun élève n'est transporté dans cette zone secondaire sur ce voyage
        if (!zonesUtiliseesParEleves.has(zNorm)) {
          const keyRec = `${chauffeur.id}_ENLEVER_${zNorm}_${voyage.id}`;
          if (!recommandationsMap.has(keyRec)) {
            recommandationsMap.set(keyRec, {
              id: `rec-retrait-${keyRec}`,
              chauffeurId: chauffeur.id,
              chauffeurNom: chauffeur.nom,
              zone: zone,
              zoneNormalisee: zNorm,
              action: 'ENLEVER',
              voyagesCibles: [voyage.id],
              voyagesLibelles: LIBELLES_VOYAGES[voyage.id] || voyage.id,
              zoneOriginaleChauffeur: zoneOriginale,
              isZoneOriginale: false,
              priorite: 'OPTIMISATION',
              categorie: 'DESENCOMBREMENT',
              motif: `Retirer la zone secondaire ${zone.toUpperCase()} (inutilisée : 0 élève affecté sur ce trajet) pour recentrer le chauffeur sur sa zone originale (${zoneOriginale.toUpperCase()}).`,
              gainEstime: {
                elevesCouverture: 0,
                elevesContinuite: 0,
                nomsElevesConcernes: [],
                placesLibresActuelles: getPlacesLibres(chauffeur.id, voyage.id),
              },
              selectionnee: true,
            });
          }
        }
      });
    });
  });

  // Fusionner les recommandations identiques qui s'appliquent sur plusieurs voyages d'un même chauffeur
  const consolidatedRecs: RecommandationZoneIA[] = [];
  const groupedByKey = new Map<string, RecommandationZoneIA[]>();

  Array.from(recommandationsMap.values()).forEach((rec) => {
    const groupKey = `${rec.chauffeurId}_${rec.action}_${rec.zoneNormalisee}`;
    const list = groupedByKey.get(groupKey) || [];
    list.push(rec);
    groupedByKey.set(groupKey, list);
  });

  groupedByKey.forEach((list, groupKey) => {
    if (list.length === 1) {
      consolidatedRecs.push(list[0]);
    } else {
      // Regrouper les voyages
      const first = list[0];
      const allVoyages = Array.from(new Set(list.flatMap((r) => r.voyagesCibles)));
      const voyagesLib = allVoyages.length >= 3 
        ? 'Tous les voyages' 
        : allVoyages.map((v) => LIBELLES_VOYAGES[v] || v).join(' & ');

      const totalCouv = list.reduce((sum, r) => sum + r.gainEstime.elevesCouverture, 0);
      const totalCont = list.reduce((sum, r) => sum + r.gainEstime.elevesContinuite, 0);
      const allNoms = Array.from(new Set(list.flatMap((r) => r.gainEstime.nomsElevesConcernes)));

      consolidatedRecs.push({
        ...first,
        id: `rec-group-${groupKey}`,
        voyagesCibles: allVoyages,
        voyagesLibelles: voyagesLib,
        gainEstime: {
          elevesCouverture: totalCouv,
          elevesContinuite: totalCont,
          nomsElevesConcernes: allNoms,
          placesLibresActuelles: first.gainEstime.placesLibresActuelles,
        },
      });
    }
  });

  // Trier les recommandations :
  // 1. Haute priorité (continuité + couverture)
  // 2. Plus grand nombre d'élèves bénéficiaires
  consolidatedRecs.sort((a, b) => {
    const prioWeight = { HAUTE: 3, MOYENNE: 2, OPTIMISATION: 1 };
    const pDiff = prioWeight[b.priorite] - prioWeight[a.priorite];
    if (pDiff !== 0) return pDiff;
    const gainA = a.gainEstime.elevesCouverture * 2 + a.gainEstime.elevesContinuite;
    const gainB = b.gainEstime.elevesCouverture * 2 + b.gainEstime.elevesContinuite;
    return gainB - gainA;
  });

  // =========================================================================
  // CALCUL DES STATISTIQUES PRÉVISIONNELLES
  // =========================================================================
  const gainElevesTotal = consolidatedRecs
    .filter((r) => r.action === 'AJOUTER')
    .reduce((sum, r) => sum + r.gainEstime.elevesCouverture, 0);

  const gainContinuiteTotal = consolidatedRecs
    .filter((r) => r.action === 'AJOUTER')
    .reduce((sum, r) => sum + r.gainEstime.elevesContinuite, 0);

  const totalEleves = eleves.length;
  const elevesAffectesActuels = totalEleves - elevesNonAffectes.length;
  const elevesAffectesPrevisionnels = Math.min(totalEleves, elevesAffectesActuels + gainElevesTotal);
  const nonAffectesPrevisionnels = Math.max(0, totalEleves - elevesAffectesPrevisionnels);

  const nbMemeChauffeurActuel = statsActuelles.nbElevesMemeChauffeur || 0;
  const nbEligiblesContinuite = statsActuelles.nbElevesEligiblesContinuite || 1;
  const nbMemeChauffeurPrevisionnel = Math.min(
    nbEligiblesContinuite,
    nbMemeChauffeurActuel + gainContinuiteTotal
  );

  const tauxContinuiteActuel = statsActuelles.tauxMemeChauffeurMatinApresMidi || 100;
  const tauxContinuitePrevisionnel = Math.min(
    100,
    Math.round((nbMemeChauffeurPrevisionnel / nbEligiblesContinuite) * 100)
  );

  const tauxCouvertureActuel = Math.round((elevesAffectesActuels / (totalEleves || 1)) * 100);
  const tauxCouverturePrevisionnel = Math.round((elevesAffectesPrevisionnels / (totalEleves || 1)) * 100);

  const syntheseIA =
    consolidatedRecs.length > 0
      ? `L'IA a identifié ${consolidatedRecs.length} ajustement(s) stratégique(s) de zones (dont ${
          consolidatedRecs.filter((r) => r.action === 'AJOUTER').length
        } ajouts ciblés et ${
          consolidatedRecs.filter((r) => r.action === 'ENLEVER').length
        } retraits de zones secondaires inutilisées). L'application de ces recommandations permettra d'atteindre ${tauxCouverturePrevisionnel}% de couverture (+${gainElevesTotal} élèves) et de hisser la règle Même Chauffeur à ${tauxContinuitePrevisionnel}% (+${gainContinuiteTotal} continuités sécurisées), tout en sanctuarisant la zone originale de chaque conducteur.`
      : 'Aucun ajustement de zone nécessaire : votre flotte couvre déjà idéalement l’ensemble des zones avec une continuité chauffeur optimale.';

  return {
    recommandations: consolidatedRecs,
    statistiquesActuelles: {
      totalEleves,
      elevesAffectes: elevesAffectesActuels,
      elevesNonAffectes: elevesNonAffectes.length,
      tauxCouverture: tauxCouvertureActuel,
      elevesMemeChauffeur: nbMemeChauffeurActuel,
      elevesChauffeurDifferent: statsActuelles.nbElevesChauffeurDifferent || 0,
      tauxContinuite: tauxContinuiteActuel,
    },
    statistiquesPrevisionnelles: {
      elevesAffectes: elevesAffectesPrevisionnels,
      elevesNonAffectes: nonAffectesPrevisionnels,
      tauxCouverture: tauxCouverturePrevisionnel,
      elevesMemeChauffeur: nbMemeChauffeurPrevisionnel,
      tauxContinuite: tauxContinuitePrevisionnel,
      gainNetEleves: gainElevesTotal,
      gainNetContinuite: gainContinuiteTotal,
    },
    zonesAvecDeficit,
    syntheseIA,
  };
}

/**
 * Applique une liste de recommandations de zones validées aux chauffeurs
 * et renvoie la nouvelle liste de chauffeurs avec les zones mises à jour par voyage.
 * La zone originale de chaque chauffeur est strictement préservée.
 */
export function appliquerRecommandationsZonesAuxChauffeurs(
  chauffeurs: Chauffeur[],
  recommandationsAAppliquer: RecommandationZoneIA[]
): Chauffeur[] {
  if (recommandationsAAppliquer.length === 0) return chauffeurs;

  const recsParChauffeur = new Map<string, RecommandationZoneIA[]>();
  recommandationsAAppliquer.forEach((r) => {
    const list = recsParChauffeur.get(r.chauffeurId) || [];
    list.push(r);
    recsParChauffeur.set(r.chauffeurId, list);
  });

  return chauffeurs.map((chauffeur) => {
    const recs = recsParChauffeur.get(chauffeur.id);
    if (!recs || recs.length === 0) return chauffeur;

    // Cloner la structure des zones par voyage
    const nouvellesZonesParVoyage: Record<string, string[]> = {};
    const zonesOriginalesParVoyage: Record<string, string> = {};

    VOYAGES.forEach((voyage) => {
      const vId = voyage.id;
      const vKey = VOYAGE_ID_TO_KEY[vId] || vId;

      // Obtenir la liste actuelle des zones et la zone originale
      const zonesActuelles = obtenirZonesVoyageChauffeur(chauffeur, vId);
      const zoneOrig = obtenirZoneOriginaleVoyage(chauffeur, vId);
      const normOrig = normaliserNomZone(zoneOrig);

      let setZones = new Set(zonesActuelles.map(normaliserNomZone));

      // Appliquer les recommandations qui ciblent ce voyage
      recs.forEach((rec) => {
        if (rec.voyagesCibles.includes(vId) || rec.voyagesCibles.includes('TOUS')) {
          if (rec.action === 'AJOUTER') {
            setZones.add(rec.zoneNormalisee);
          } else if (rec.action === 'ENLEVER') {
            // SÉCURITÉ : Ne JAMAIS enlever la zone originale
            if (rec.zoneNormalisee !== normOrig) {
              setZones.delete(rec.zoneNormalisee);
            }
          }
        }
      });

      // S'assurer que la zone originale est toujours présente en tête
      if (normOrig) {
        setZones.add(normOrig);
      }

      const listeFinale = Array.from(setZones);
      // Mettre la zone originale en première position
      const reordonnee = normOrig 
        ? [normOrig, ...listeFinale.filter((z) => z !== normOrig)]
        : listeFinale;

      nouvellesZonesParVoyage[vId] = reordonnee;
      nouvellesZonesParVoyage[vKey] = reordonnee;
      zonesOriginalesParVoyage[vId] = normOrig;
      zonesOriginalesParVoyage[vKey] = normOrig;
    });

    // Union globale de toutes les zones
    const allUnion = Array.from(
      new Set(
        Object.values(nouvellesZonesParVoyage)
          .flat()
          .filter(Boolean)
      )
    );

    return {
      ...chauffeur,
      zonesParVoyage: {
        ...(chauffeur.zonesParVoyage || {}),
        ...nouvellesZonesParVoyage,
      },
      zonesOriginalesParVoyage: {
        ...(chauffeur.zonesOriginalesParVoyage || {}),
        ...zonesOriginalesParVoyage,
      },
      zonesVoyageMatin1: nouvellesZonesParVoyage['MATIN_1'] || chauffeur.zonesVoyageMatin1,
      zonesVoyageMatin2: nouvellesZonesParVoyage['MATIN_2'] || chauffeur.zonesVoyageMatin2,
      zonesVoyageApresMidi15h15: nouvellesZonesParVoyage['APRES_MIDI_15H15'] || chauffeur.zonesVoyageApresMidi15h15,
      zonesVoyageApresMidi16h00: nouvellesZonesParVoyage['APRES_MIDI_16H00'] || chauffeur.zonesVoyageApresMidi16h00,
      zones: allUnion,
      zone: allUnion.join(', '),
    };
  });
}
