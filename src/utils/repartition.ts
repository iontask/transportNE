import { Eleve, Chauffeur, AffectationEleve, ResultatRepartition, Alerte, OptionVoyageChauffeur, OPTIONS_VOYAGE_CHAUFFEUR } from '../types';

// ============================================================
// CONSTANTES
// ============================================================

export const VOYAGES = [
  { id: 'MATIN_1', libelle: 'Matin 1', heure: '08:30', niveau: null },
  { id: 'MATIN_2', libelle: 'Matin 2', heure: '09:15', niveau: null },
  { id: 'APRES_MIDI_15H15', libelle: 'Après-midi 15h15', heure: '15:15', niveau: 1 },
  { id: 'APRES_MIDI_16H00', libelle: 'Après-midi 16h00', heure: '16:00', niveau: 2 },
] as const;

export const ZONE_ECOLE = 'ain sebaa';

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

// Normaliser n'importe quelle valeur de voyage en l'une des 7 options valides :
// N1, N2, N1 AIN SEBAA, N2 AIN SEBAA, SANS, N1 ET N2, N1 AIN SEBAA ET N2 AIN SEBAA
export const normaliserOptionVoyage = (val: string | null | undefined): OptionVoyageChauffeur => {
  if (!val) return 'SANS';
  const clean = val.toString().trim().toUpperCase();
  if (clean === 'SANS' || clean === '' || clean === '-' || clean === '0') return 'SANS';

  const has1 = clean.includes('1');
  const has2 = clean.includes('2');
  const hasAinSebaa = clean.includes('AIN SEBAA') || clean.includes('AIN-SEBAA') || clean.includes('AIN_SEBAA');

  if (has1 && has2) {
    return hasAinSebaa ? 'N1 AIN SEBAA ET N2 AIN SEBAA' : 'N1 ET N2';
  }
  if (has1) {
    return hasAinSebaa ? 'N1 AIN SEBAA' : 'N1';
  }
  if (has2) {
    return hasAinSebaa ? 'N2 AIN SEBAA' : 'N2';
  }
  return 'SANS';
};

// Extraire les niveaux depuis une chaîne de config
// Ex: "N1 ET N2" -> [1, 2]
//     "N1 AIN SEBAA" -> [1]
//     "SANS" -> []
export const extraireNiveaux = (config: string): number[] => {
  if (!config || config.toUpperCase().includes('SANS')) return [];
  const niveaux: number[] = [];
  if (config.includes('1')) niveaux.push(1);
  if (config.includes('2')) niveaux.push(2);
  return niveaux;
};

// Vérifier si le voyage cible AIN SEBAA
export const cibleAinSebaa = (config: string): boolean => {
  return (config || '').toUpperCase().includes('AIN SEBAA');
};

// Obtenir la config d'un chauffeur pour un voyage donné
export const getConfigVoyage = (chauffeur: Chauffeur, voyageId: string): string => {
  switch (voyageId) {
    case 'MATIN_1': return chauffeur.voyageMatin1 || 'SANS';
    case 'MATIN_2': return chauffeur.voyageMatin2 || 'SANS';
    case 'APRES_MIDI_15H15': return chauffeur.voyageApresMidi15h15 || 'SANS';
    case 'APRES_MIDI_16H00': return chauffeur.voyageApresMidi16h00 || 'SANS';
    default: return 'SANS';
  }
};

// Vérifier si un voyage est configuré "SANS" rotation pour un chauffeur
export const estVoyageSans = (chauffeur: Chauffeur, voyageId: string): boolean => {
  const config = getConfigVoyage(chauffeur, voyageId);
  return !config || config.trim().toUpperCase().includes('SANS');
};

// Obtenir l'ensemble des clés d'emplacements configurés "SANS" (ex: "ch1_MATIN_2")
// qui doivent initialement recevoir 0 élève et être verrouillés avec un cadenas
export const obtenirEmplacementsSansVerrouilles = (chauffeurs: Chauffeur[]): Set<string> => {
  const set = new Set<string>();
  chauffeurs.forEach((c) => {
    VOYAGES.forEach((v) => {
      if (estVoyageSans(c, v.id)) {
        set.add(`${c.id}_${v.id}`);
      }
    });
  });
  return set;
};

// ============================================================
// ALGORITHME PRINCIPAL
// ============================================================

export const repartir = (
  eleves: Eleve[],
  chauffeurs: Chauffeur[]
): ResultatRepartition => {
  const affectations: AffectationEleve[] = [];
  const alertes: Alerte[] = [];

  // Set des élèves déjà affectés (par voyage)
  // Clé: `${voyageId}_${eleveId}`
  const elevesAffectes = new Set<string>();

  // ============================================================
  // ÉTAPE 1 : ANALYSE PRÉALABLE
  // ============================================================

  // 1.1 Grouper les élèves par zone et niveau
  const elevesParZoneEtNiveau: Record<string, { 1: Eleve[]; 2: Eleve[] }> = {};
  eleves.forEach((eleve) => {
    const zoneKey = eleve.zone ? eleve.zone.trim().toLowerCase() : 'inconnue';
    if (!elevesParZoneEtNiveau[zoneKey]) {
      elevesParZoneEtNiveau[zoneKey] = { 1: [], 2: [] };
    }
    const niv = eleve.niveau === 2 ? 2 : 1;
    elevesParZoneEtNiveau[zoneKey][niv].push(eleve);
  });

  // 1.2 Grouper les chauffeurs par zone
  const chauffeursParZone: Record<string, Chauffeur[]> = {};
  chauffeurs.forEach((chauffeur) => {
    const zoneKey = chauffeur.zone ? chauffeur.zone.trim().toLowerCase() : 'inconnue';
    if (!chauffeursParZone[zoneKey]) {
      chauffeursParZone[zoneKey] = [];
    }
    chauffeursParZone[zoneKey].push(chauffeur);
  });

  // 1.3 Calculer les déficits par zone
  Object.keys(elevesParZoneEtNiveau).forEach((zone) => {
    const elevesZone = elevesParZoneEtNiveau[zone];
    const totalEleves = elevesZone[1].length + elevesZone[2].length;
    const chauffeursZone = chauffeursParZone[zone] || [];
    const capaciteZone = chauffeursZone.reduce((sum, c) => sum + (c.places || 0), 0);

    if (totalEleves > capaciteZone) {
      alertes.push({
        type: 'DEFICIT_ZONE',
        message: `Zone ${zone.toUpperCase()} : ${totalEleves} élèves pour ${capaciteZone} places (déficit de ${totalEleves - capaciteZone})`,
        severite: 'WARNING',
        details: { zone, totalEleves, capaciteZone },
      });
    }
  });

  // ============================================================
  // ÉTAPE 2 : AFFECTATION PAR VOYAGE
  // ============================================================

  // Pour chaque voyage, dans l'ordre chronologique
  VOYAGES.forEach((voyage) => {
    const voyageId = voyage.id;
    const niveauCible = voyage.niveau; // null = tous niveaux

    // 2.1 Déterminer les chauffeurs actifs pour ce voyage
    const chauffeursActifs = chauffeurs
      .filter((c) => {
        const config = getConfigVoyage(c, voyageId);
        return !config.toUpperCase().includes('SANS');
      })
      .sort((a, b) => b.places - a.places); // Trier par capacité décroissante

    // 2.2 Déterminer les niveaux à affecter pour ce voyage
    const niveauxAffecter: number[] = niveauCible ? [niveauCible] : [1, 2];

    // 2.3 Pour chaque chauffeur actif
    chauffeursActifs.forEach((chauffeur) => {
      const config = getConfigVoyage(chauffeur, voyageId);
      const niveauxChauffeur = extraireNiveaux(config);
      const cibleAinSebaaChauffeur = cibleAinSebaa(config);
      const zoneChauffeur = (chauffeur.zone || '').trim().toLowerCase();

      let placesDisponibles = chauffeur.places;

      // Filtrer les niveaux selon la config du chauffeur
      const niveauxEffectifs = niveauxAffecter.filter((n) => 
        niveauxChauffeur.includes(n)
      );

      // Déterminer l'ordre des zones prioritaires pour ce chauffeur selon sa configuration de voyage :
      // - Si la config cible spécifiquement AIN SEBAA (ex: "N1 AIN SEBAA", "N2 AIN SEBAA", "N1 AIN SEBAA ET N2 AIN SEBAA") :
      //   Priorité 1 : AIN SEBAA (zone école)
      //   Priorité 2 : Sa propre zone (si différente d'ain sebaa)
      //   Priorité 3 : Autres zones
      // - Si la config est standard (ex: "N1", "N2", "N1 ET N2") :
      //   Priorité 1 : Sa propre zone
      //   Priorité 2 : AIN SEBAA (si différente de sa zone)
      //   Priorité 3 : Autres zones si navette/places restantes
      const zoneP1 = cibleAinSebaaChauffeur ? ZONE_ECOLE : zoneChauffeur;
      const zoneP2 = cibleAinSebaaChauffeur ? zoneChauffeur : ZONE_ECOLE;

      // 2.3.1 PRIORITÉ 1 : Zone cible principale du voyage
      niveauxEffectifs.forEach((niveau) => {
        if (placesDisponibles <= 0) return;

        const elevesZone = elevesParZoneEtNiveau[zoneP1]?.[niveau as 1 | 2] || [];
        const elevesEligibles = elevesZone.filter((e) => 
          !elevesAffectes.has(`${voyageId}_${e.id}`)
        );

        const nbAPrendre = Math.min(elevesEligibles.length, placesDisponibles);
        const elevesPris = elevesEligibles.slice(0, nbAPrendre);

        elevesPris.forEach((eleve) => {
          affectations.push({
            eleveId: eleve.id,
            chauffeurId: chauffeur.id,
            voyageId,
          });
          elevesAffectes.add(`${voyageId}_${eleve.id}`);
          placesDisponibles--;
        });
      });

      // 2.3.2 PRIORITÉ 2 : Zone secondaire (si différente et places restantes)
      if (placesDisponibles > 0 && zoneP2 !== zoneP1) {
        niveauxEffectifs.forEach((niveau) => {
          if (placesDisponibles <= 0) return;

          const elevesZone = elevesParZoneEtNiveau[zoneP2]?.[niveau as 1 | 2] || [];
          const elevesEligibles = elevesZone.filter((e) => 
            !elevesAffectes.has(`${voyageId}_${e.id}`)
          );

          const nbAPrendre = Math.min(elevesEligibles.length, placesDisponibles);
          const elevesPris = elevesEligibles.slice(0, nbAPrendre);

          elevesPris.forEach((eleve) => {
            affectations.push({
              eleveId: eleve.id,
              chauffeurId: chauffeur.id,
              voyageId,
            });
            elevesAffectes.add(`${voyageId}_${eleve.id}`);
            placesDisponibles--;
          });
        });
      }

      // 2.3.3 PRIORITÉ 3 : Autres zones restantes
      if (placesDisponibles > 0 && (cibleAinSebaaChauffeur || zoneChauffeur === ZONE_ECOLE)) {
        niveauxEffectifs.forEach((niveau) => {
          if (placesDisponibles <= 0) return;

          Object.keys(elevesParZoneEtNiveau).forEach((zone) => {
            if (zone === zoneP1 || zone === zoneP2) return;
            if (placesDisponibles <= 0) return;

            const elevesZone = elevesParZoneEtNiveau[zone]?.[niveau as 1 | 2] || [];
            const elevesEligibles = elevesZone.filter((e) => 
              !elevesAffectes.has(`${voyageId}_${e.id}`)
            );

            const nbAPrendre = Math.min(elevesEligibles.length, placesDisponibles);
            const elevesPris = elevesEligibles.slice(0, nbAPrendre);

            elevesPris.forEach((eleve) => {
              affectations.push({
                eleveId: eleve.id,
                chauffeurId: chauffeur.id,
                voyageId,
              });
              elevesAffectes.add(`${voyageId}_${eleve.id}`);
              placesDisponibles--;
            });
          });
        });
      }
    });
  });

  // ============================================================
  // ÉTAPE 3 : CONSTRUIRE LES RÉSULTATS
  // ============================================================

  return construireResultatDepuisAffectations(eleves, chauffeurs, affectations, alertes);
};

// Construire un ResultatRepartition complet à partir d'une liste d'affectations existantes
export const construireResultatDepuisAffectations = (
  eleves: Eleve[],
  chauffeurs: Chauffeur[],
  affectations: AffectationEleve[],
  alertesInitiales: Alerte[] = []
): ResultatRepartition => {
  const alertes: Alerte[] = [...alertesInitiales];
  const elevesMap = new Map(eleves.map((e) => [e.id, e]));
  const elevesAffectes = new Set<string>();
  affectations.forEach((a) => elevesAffectes.add(`${a.voyageId}_${a.eleveId}`));

  // 3.1 Par chauffeur
  const parChauffeur: ResultatRepartition['parChauffeur'] = {};

  chauffeurs.forEach((chauffeur) => {
    const voyagesChauffeur: Record<string, {
      voyageId: string;
      eleves: Eleve[];
      placesUtilisees: number;
      placesTotales: number;
      tauxRemplissage: number;
    }> = {};

    VOYAGES.forEach((voyage) => {
      const elevesVoyage = affectations
        .filter((a) => a.chauffeurId === chauffeur.id && a.voyageId === voyage.id)
        .map((a) => elevesMap.get(a.eleveId)!)
        .filter(Boolean);

      voyagesChauffeur[voyage.id] = {
        voyageId: voyage.id,
        eleves: elevesVoyage,
        placesUtilisees: elevesVoyage.length,
        placesTotales: chauffeur.places,
        tauxRemplissage: chauffeur.places > 0 
          ? elevesVoyage.length / chauffeur.places 
          : 0,
      };
    });

    const totalEleves = Object.values(voyagesChauffeur)
      .reduce((sum: number, v) => sum + v.placesUtilisees, 0);
    // Calculer les places théoriques attendues : uniquement sur les voyages actifs (non 'SANS' ou ayant des élèves)
    const voyagesActifs = Object.values(voyagesChauffeur).filter((v) => {
      const isSans = estVoyageSans(chauffeur, v.voyageId);
      return !isSans || v.placesUtilisees > 0;
    });
    const nbVoyagesComptes = Math.max(
      voyagesActifs.length,
      voyagesActifs.length > 0 ? 2 : 1
    );
    const totalPlaces = nbVoyagesComptes * chauffeur.places;

    parChauffeur[chauffeur.id] = {
      chauffeur,
      voyages: voyagesChauffeur,
      totalEleves,
      totalPlaces,
      tauxGlobal: totalPlaces > 0 ? Math.min(1, totalEleves / totalPlaces) : 0,
    };
  });

  // 3.2 Par voyage
  const parVoyage: ResultatRepartition['parVoyage'] = {};

  VOYAGES.forEach((voyage) => {
    const chauffeursVoyage = chauffeurs
      .filter((c) => {
        const config = getConfigVoyage(c, voyage.id);
        const hasAffectations = affectations.some(
          (a) => a.chauffeurId === c.id && a.voyageId === voyage.id
        );
        return !config.toUpperCase().includes('SANS') || hasAffectations;
      })
      .map((chauffeur) => {
        const elevesVoyage = affectations
          .filter((a) => a.chauffeurId === chauffeur.id && a.voyageId === voyage.id)
          .map((a) => elevesMap.get(a.eleveId)!)
          .filter(Boolean);

        return {
          chauffeur,
          eleves: elevesVoyage,
          placesUtilisees: elevesVoyage.length,
          placesTotales: chauffeur.places,
        };
      });

    const totalEleves = chauffeursVoyage.reduce((s, c) => s + c.placesUtilisees, 0);
    const totalPlaces = chauffeursVoyage.reduce((s, c) => s + c.placesTotales, 0);

    // Calcul de l'optimisation pour ce voyage :
    // Nombre de transports (bus) réellement mobilisés (avec au moins 1 élève)
    // et total des places offertes par ces transports utilisés
    const chauffeursUtilises = chauffeursVoyage.filter((c) => c.placesUtilisees > 0);
    const nbTransportsUtilises = chauffeursUtilises.length;
    const placesTransportsUtilises = chauffeursUtilises.reduce((s, c) => s + c.placesTotales, 0);
    const tauxOptimisation = placesTransportsUtilises > 0
      ? Math.round((totalEleves / placesTransportsUtilises) * 100)
      : 0;
    const placesMoyenneParTransportUtilise = nbTransportsUtilises > 0
      ? Math.round((placesTransportsUtilises / nbTransportsUtilises) * 10) / 10
      : 0;

    parVoyage[voyage.id] = {
      voyageId: voyage.id,
      chauffeurs: chauffeursVoyage,
      totalEleves,
      totalPlaces,
      nbTransportsUtilises,
      placesTransportsUtilises,
      tauxOptimisation,
      placesMoyenneParTransportUtilise,
    };
  });

  // 3.3 Élèves non affectés
  const elevesNonAffectes: Eleve[] = [];
  eleves.forEach((eleve) => {
    const estAffecte = VOYAGES.some((voyage) => 
      elevesAffectes.has(`${voyage.id}_${eleve.id}`)
    );
    if (!estAffecte) {
      elevesNonAffectes.push(eleve);
    }
  });

  // 3.4 Alertes
  // Surcharges
  Object.values(parChauffeur).forEach((result) => {
    Object.values(result.voyages).forEach((v) => {
      if (v.placesUtilisees > v.placesTotales) {
        alertes.push({
          type: 'SURCHARGE',
          message: `${result.chauffeur.nom} - ${v.voyageId} : ${v.placesUtilisees}/${v.placesTotales} places (Surcharge)`,
          severite: 'ERROR',
          details: { chauffeur: result.chauffeur, voyage: v },
        });
      }
    });
  });

  // Sous-utilisations (<50% de remplissage sur un voyage actif avec des élèves)
  Object.values(parChauffeur).forEach((result) => {
    Object.values(result.voyages).forEach((v) => {
      const isSans = estVoyageSans(result.chauffeur, v.voyageId);
      if (isSans && v.placesUtilisees === 0) return;
      if (v.placesTotales > 0 && v.tauxRemplissage < 0.5 && v.placesUtilisees > 0) {
        alertes.push({
          type: 'SOUS_UTILISATION',
          message: `${result.chauffeur.nom} - ${v.voyageId} : ${v.placesUtilisees}/${v.placesTotales} places (${Math.round(v.tauxRemplissage * 100)}%)`,
          severite: 'WARNING',
          details: { chauffeur: result.chauffeur, voyage: v },
        });
      }
    });
  });

  // Non affectés
  if (elevesNonAffectes.length > 0) {
    alertes.push({
      type: 'NON_AFFECTE',
      message: `${elevesNonAffectes.length} élève(s) non affecté(s)`,
      severite: 'ERROR',
      details: { eleves: elevesNonAffectes },
    });
  }

  return {
    affectations,
    parChauffeur,
    parVoyage,
    statistiques: {
      totalEleves: eleves.length,
      totalAffectations: affectations.length,
      elevesNonAffectes,
      alertes,
    },
  };
};

// ============================================================
// AJUSTEMENT & RÉÉQUILIBRAGE EN TEMPS RÉEL
// ============================================================

export interface TransfertOptions {
  sourceChauffeurId: string;
  destinationChauffeurId: string;
  voyageId: string;
  nombre?: number;
  eleveIds?: string[];
}

// Transférer des élèves d'un chauffeur source vers un chauffeur destination en temps réel
export const transfererEleves = (
  resultatActuel: ResultatRepartition,
  eleves: Eleve[],
  chauffeurs: Chauffeur[],
  options: TransfertOptions
): ResultatRepartition => {
  const { sourceChauffeurId, destinationChauffeurId, voyageId, nombre, eleveIds } = options;

  if (sourceChauffeurId === destinationChauffeurId) return resultatActuel;

  const nouvellesAffectations = [...resultatActuel.affectations];

  // Trouver les affectations sur ce créneau pour le chauffeur source
  const affectationsSource = nouvellesAffectations.filter(
    (a) => a.chauffeurId === sourceChauffeurId && a.voyageId === voyageId
  );

  if (affectationsSource.length === 0) return resultatActuel;

  let aTransferer: AffectationEleve[] = [];

  if (eleveIds && eleveIds.length > 0) {
    const idsSet = new Set(eleveIds);
    aTransferer = affectationsSource.filter((a) => idsSet.has(a.eleveId));
  } else {
    const quantite = Math.min(nombre || 1, affectationsSource.length);
    aTransferer = affectationsSource.slice(-quantite);
  }

  if (aTransferer.length === 0) return resultatActuel;

  const idTransferes = new Set(aTransferer.map((a) => a.eleveId));

  const affectationsModifiees = nouvellesAffectations.map((aff) => {
    if (aff.voyageId === voyageId && aff.chauffeurId === sourceChauffeurId && idTransferes.has(aff.eleveId)) {
      return {
        ...aff,
        chauffeurId: destinationChauffeurId,
      };
    }
    return aff;
  });

  return construireResultatDepuisAffectations(eleves, chauffeurs, affectationsModifiees);
};

// Réassigner un élève spécifique à un autre chauffeur sur un voyage donné
export const reassignerEleve = (
  resultatActuel: ResultatRepartition,
  eleves: Eleve[],
  chauffeurs: Chauffeur[],
  eleveId: string,
  voyageId: string,
  nouveauChauffeurId: string
): ResultatRepartition => {
  const existait = resultatActuel.affectations.some(
    (a) => a.eleveId === eleveId && a.voyageId === voyageId
  );

  let nouvellesAffectations: AffectationEleve[];
  if (existait) {
    nouvellesAffectations = resultatActuel.affectations.map((a) => {
      if (a.eleveId === eleveId && a.voyageId === voyageId) {
        return { ...a, chauffeurId: nouveauChauffeurId };
      }
      return a;
    });
  } else {
    nouvellesAffectations = [
      ...resultatActuel.affectations,
      { eleveId, voyageId, chauffeurId: nouveauChauffeurId },
    ];
  }

  return construireResultatDepuisAffectations(eleves, chauffeurs, nouvellesAffectations);
};

// ============================================================
// VÉRIFICATION DE VERROUILLAGE (CHAUFFEUR OU EMPLACEMENT SPÉCIFIQUE)
// ============================================================
export const estEmplacementVerrouille = (
  chauffeurId: string,
  voyageId: string,
  chauffeursVerrouilles: Set<string> | string[] = new Set(),
  emplacementsVerrouilles: Set<string> | string[] = new Set()
): boolean => {
  const setChauffeurs = new Set(chauffeursVerrouilles);
  const setEmplacements = new Set(emplacementsVerrouilles);
  return setChauffeurs.has(chauffeurId) || setEmplacements.has(`${chauffeurId}_${voyageId}`);
};

export interface ResultatInterchange {
  succes: boolean;
  message: string;
  nouveauResultat?: ResultatRepartition;
  motif?: 'DIFFERENT_ZONE' | 'SAME_STUDENT' | 'SAME_CHAUFFEUR' | 'CHAUFFEUR_VERROUILLE' | 'NON_TROUVE';
}

// Interchanger (permuter) 2 élèves entre 2 chauffeurs sur un voyage donné
// CONDITION STRICTE : Les deux élèves DOIVENT appartenir à la même zone de résidence
export const interchangerElevesMemeZone = (
  resultatActuel: ResultatRepartition,
  eleves: Eleve[],
  chauffeurs: Chauffeur[],
  eleveAId: string,
  eleveBId: string,
  voyageId: string,
  chauffeursVerrouilles: Set<string> | string[] = new Set(),
  emplacementsVerrouilles: Set<string> | string[] = new Set()
): ResultatInterchange => {
  if (eleveAId === eleveBId) {
    return {
      succes: false,
      motif: 'SAME_STUDENT',
      message: 'Impossible : vous avez sélectionné le même élève.',
    };
  }

  const mapEleves = new Map(eleves.map((e) => [e.id, e]));
  const eleveA = mapEleves.get(eleveAId);
  const eleveB = mapEleves.get(eleveBId);

  if (!eleveA || !eleveB) {
    return {
      succes: false,
      motif: 'NON_TROUVE',
      message: 'Un des élèves est introuvable dans la base de données.',
    };
  }

  const zoneA = (eleveA.zone || '').trim().toLowerCase();
  const zoneB = (eleveB.zone || '').trim().toLowerCase();

  // VALIDATION STRICTE DE LA CONDITION DEMANDÉE : MÊME ZONE
  if (zoneA !== zoneB) {
    return {
      succes: false,
      motif: 'DIFFERENT_ZONE',
      message: `⛔ Interchange interdit : L'élève "${eleveA.nom} ${eleveA.prenom}" est en zone "${eleveA.zone.toUpperCase()}" tandis que "${eleveB.nom} ${eleveB.prenom}" est en zone "${eleveB.zone.toUpperCase()}". L'interchange par Drag & Drop exige impérativement que les deux élèves soient dans la MÊME ZONE.`,
    };
  }

  // Trouver les affectations sur ce voyage
  const affA = resultatActuel.affectations.find(
    (a) => a.eleveId === eleveAId && a.voyageId === voyageId
  );
  const affB = resultatActuel.affectations.find(
    (a) => a.eleveId === eleveBId && a.voyageId === voyageId
  );

  if (!affA || !affB) {
    return {
      succes: false,
      motif: 'NON_TROUVE',
      message: 'Un des deux élèves n\'est pas affecté sur ce créneau horaire.',
    };
  }

  if (affA.chauffeurId === affB.chauffeurId) {
    return {
      succes: false,
      motif: 'SAME_CHAUFFEUR',
      message: `Ces deux élèves (${eleveA.nom} et ${eleveB.nom}) sont déjà assignés au même chauffeur.`,
    };
  }

  const chauffeurA = chauffeurs.find((c) => c.id === affA.chauffeurId);
  const chauffeurB = chauffeurs.find((c) => c.id === affB.chauffeurId);

  const slotAVerrouille = estEmplacementVerrouille(affA.chauffeurId, voyageId, chauffeursVerrouilles, emplacementsVerrouilles);
  const slotBVerrouille = estEmplacementVerrouille(affB.chauffeurId, voyageId, chauffeursVerrouilles, emplacementsVerrouilles);

  if (slotAVerrouille || slotBVerrouille) {
    const nomVerrouille = slotAVerrouille ? chauffeurA?.nom : chauffeurB?.nom;
    return {
      succes: false,
      motif: 'CHAUFFEUR_VERROUILLE',
      message: `L'emplacement de ${nomVerrouille} sur ce voyage est verrouillé 🔒. Déverrouillez-le pour autoriser l'échange d'élèves.`,
    };
  }

  // Réaliser le swap des deux chauffeurs pour ces élèves sur ce voyage
  const nouvellesAffectations = resultatActuel.affectations.map((a) => {
    if (a.voyageId === voyageId && a.eleveId === eleveAId) {
      return { ...a, chauffeurId: affB.chauffeurId };
    }
    if (a.voyageId === voyageId && a.eleveId === eleveBId) {
      return { ...a, chauffeurId: affA.chauffeurId };
    }
    return a;
  });

  const nouveauResultat = construireResultatDepuisAffectations(eleves, chauffeurs, nouvellesAffectations);

  return {
    succes: true,
    nouveauResultat,
    message: `✓ Interchange validé : ${eleveA.nom} (affecté à ${chauffeurB?.nom}) ⇄ ${eleveB.nom} (affecté à ${chauffeurA?.nom}) dans la zone commune "${eleveA.zone.toUpperCase()}".`,
  };
};

// Déplacer un élève vers un autre chauffeur
// CONDITION STRICTE : L'élève et le chauffeur cible doivent être dans la même zone
export const deplacerEleveVersChauffeurMemeZone = (
  resultatActuel: ResultatRepartition,
  eleves: Eleve[],
  chauffeurs: Chauffeur[],
  eleveId: string,
  destinationChauffeurId: string,
  voyageId: string,
  chauffeursVerrouilles: Set<string> | string[] = new Set(),
  emplacementsVerrouilles: Set<string> | string[] = new Set()
): ResultatInterchange => {
  const eleve = eleves.find((e) => e.id === eleveId);
  const destinationChauffeur = chauffeurs.find((c) => c.id === destinationChauffeurId);

  if (!eleve || !destinationChauffeur) {
    return {
      succes: false,
      motif: 'NON_TROUVE',
      message: 'Élève ou chauffeur introuvable.',
    };
  }

  if (estEmplacementVerrouille(destinationChauffeurId, voyageId, chauffeursVerrouilles, emplacementsVerrouilles)) {
    return {
      succes: false,
      motif: 'CHAUFFEUR_VERROUILLE',
      message: `L'emplacement de ${destinationChauffeur.nom} sur ce voyage est verrouillé 🔒. Déverrouillez-le pour autoriser l'ajout d'élèves.`,
    };
  }

  const zoneEleve = (eleve.zone || '').trim().toLowerCase();
  const zoneChauffeur = (destinationChauffeur.zone || '').trim().toLowerCase();

  if (zoneEleve !== zoneChauffeur) {
    return {
      succes: false,
      motif: 'DIFFERENT_ZONE',
      message: `⛔ Déplacement interdit : L'élève "${eleve.nom}" est en zone "${eleve.zone.toUpperCase()}" alors que le bus de "${destinationChauffeur.nom}" dessert la zone "${destinationChauffeur.zone.toUpperCase()}".`,
    };
  }

  // Vérifier la capacité du chauffeur destination
  const affsDest = resultatActuel.affectations.filter(
    (a) => a.chauffeurId === destinationChauffeurId && a.voyageId === voyageId
  );
  if (affsDest.length >= destinationChauffeur.places) {
    return {
      succes: false,
      message: `Attention : Le véhicule de ${destinationChauffeur.nom} est déjà complet (${affsDest.length}/${destinationChauffeur.places} places).`,
    };
  }

  const nouvellesAffectations = resultatActuel.affectations.map((a) => {
    if (a.voyageId === voyageId && a.eleveId === eleveId) {
      return { ...a, chauffeurId: destinationChauffeurId };
    }
    return a;
  });

  const nouveauResultat = construireResultatDepuisAffectations(eleves, chauffeurs, nouvellesAffectations);

  return {
    succes: true,
    nouveauResultat,
    message: `✓ Élève "${eleve.nom}" transféré avec succès vers le véhicule de "${destinationChauffeur.nom}" (Zone: ${eleve.zone.toUpperCase()}).`,
  };
};

export interface ResultatAjustementDirect {
  nouveauResultat: ResultatRepartition;
  succes: boolean;
  delta: number;
  effectue: number;
  message: string;
  impacts: Array<{ chauffeurNom: string; delta: number }>;
}

// Ajuster directement le nombre d'élèves d'un chauffeur sur un créneau horaire
// avec répartition équitable du surplus chez les collègues ou réduction équitable chez les autres
// Les chauffeurs et emplacements verrouillés (cadenas 🔒) sont exclus de tout impact externe
export const ajusterNombreElevesDirect = (
  resultatActuel: ResultatRepartition,
  eleves: Eleve[],
  chauffeurs: Chauffeur[],
  chauffeurId: string,
  voyageId: string,
  nouveauNombre: number,
  chauffeurIdsVerrouilles: Set<string> | string[] = new Set(),
  emplacementsVerrouilles: Set<string> | string[] = new Set()
): ResultatAjustementDirect => {
  const setVerrouilles = new Set(chauffeurIdsVerrouilles);
  const setEmplacements = new Set(emplacementsVerrouilles);
  const chauffeurCible = chauffeurs.find((c) => c.id === chauffeurId);
  if (!chauffeurCible) {
    return {
      nouveauResultat: resultatActuel,
      succes: false,
      delta: 0,
      effectue: 0,
      message: 'Chauffeur introuvable.',
      impacts: [],
    };
  }

  const mapEleves = new Map(eleves.map((e) => [e.id, e]));
  const ciblePlaces = chauffeurCible.places;
  const nombreVise = Math.max(0, Math.min(ciblePlaces, Math.round(nouveauNombre)));

  let affectationsCourantes = [...resultatActuel.affectations];
  const affsCibleActuelles = affectationsCourantes.filter(
    (a) => a.chauffeurId === chauffeurId && a.voyageId === voyageId
  );
  const actuel = affsCibleActuelles.length;
  const delta = nombreVise - actuel;

  if (delta === 0) {
    return {
      nouveauResultat: resultatActuel,
      succes: true,
      delta: 0,
      effectue: 0,
      message: `Le nombre d'élèves de ${chauffeurCible.nom} est déjà de ${actuel}.`,
      impacts: [],
    };
  }

  const voyageDef = VOYAGES.find((v) => v.id === voyageId);
  const niveauRequis = voyageDef?.niveau;
  const zoneCible = (chauffeurCible.zone || '').trim().toLowerCase();

  const impactsMap = new Map<string, number>();

  // =========================================================================
  // CAS 1 : RÉDUCTION (delta < 0)
  // L'utilisateur réduit le nombre d'élèves de ce chauffeur.
  // Le surplus (-delta élèves) doit être redistribué ÉQUITABLEMENT aux autres chauffeurs
  // selon leurs contraintes et capacités.
  // =========================================================================
  if (delta < 0) {
    const aRetirer = Math.min(-delta, actuel);

    // Trier les élèves de ce chauffeur pour retirer d'abord ceux qui ne sont pas de sa zone
    const elevesCibleObj = affsCibleActuelles
      .map((aff) => ({ aff, eleve: mapEleves.get(aff.eleveId) }))
      .filter((item): item is { aff: AffectationEleve; eleve: Eleve } => Boolean(item.eleve));

    elevesCibleObj.sort((a, b) => {
      const aMemeZone = (a.eleve.zone || '').trim().toLowerCase() === zoneCible;
      const bMemeZone = (b.eleve.zone || '').trim().toLowerCase() === zoneCible;
      if (!aMemeZone && bMemeZone) return -1;
      if (aMemeZone && !bMemeZone) return 1;
      return 0;
    });

    const aRedistribuer = elevesCibleObj.slice(0, aRetirer);
    let totalRedistribue = 0;

    // Décompte actuel des places occupées par chauffeur sur ce voyage
    const occupationParChauffeur = new Map<string, number>();
    chauffeurs.forEach((c) => {
      const nb = affectationsCourantes.filter(
        (a) => a.chauffeurId === c.id && a.voyageId === voyageId
      ).length;
      occupationParChauffeur.set(c.id, nb);
    });

    // Redistribuer chaque élève équitablement
    aRedistribuer.forEach(({ aff, eleve }) => {
      // Trouver tous les collègues receveurs éligibles (non verrouillés)
      const candidats = chauffeurs.filter((c) => {
        if (c.id === chauffeurId) return false;
        if (estEmplacementVerrouille(c.id, voyageId, chauffeurIdsVerrouilles, emplacementsVerrouilles)) return false; // Protégé par cadenas global ou emplacement 🔒
        const occ = occupationParChauffeur.get(c.id) || 0;
        if (occ >= c.places) return false; // Plus de place

        // Vérifier les contraintes de voyage du chauffeur candidat
        const config = getConfigVoyage(c, voyageId);
        const niveauxChauffeur = extraireNiveaux(config);
        const cibleAin = cibleAinSebaa(config);

        // Si le voyage a un niveau spécifique imposé
        if (niveauRequis && eleve.niveau !== niveauRequis) return false;
        // Si le chauffeur candidat a des niveaux configurés
        if (niveauxChauffeur.length > 0 && !niveauxChauffeur.includes(eleve.niveau)) return false;
        // Si le chauffeur candidat est restreint exclusivement à AIN SEBAA
        if (cibleAin && (eleve.zone || '').trim().toLowerCase() !== ZONE_ECOLE) {
          // Si le candidat a sa zone propre différente d'ain sebaa, on peut accepter s'il n'est pas exclusif
          if (config.includes('AIN SEBAA ET') || config.includes('ET N2')) {
            // toléré
          }
        }
        return true;
      });

      if (candidats.length === 0) {
        // Pas d'autre chauffeur disponible avec de la place
        return;
      }

      // ÉQUITÉ DE REDISTRIBUTION :
      // On classe les candidats pour donner la priorité :
      // 1. Même zone géographique que l'élève (meilleure cohérence de tournée)
      // 2. Taux d'occupation actuel le plus faible (équilibrage équitable des charges)
      // 3. Nombre de places disponibles restantes
      candidats.sort((a, b) => {
        const occA = occupationParChauffeur.get(a.id) || 0;
        const occB = occupationParChauffeur.get(b.id) || 0;
        const dispoA = a.places - occA;
        const dispoB = b.places - occB;

        const zoneEleve = (eleve.zone || '').trim().toLowerCase();
        const aMemeZone = (a.zone || '').trim().toLowerCase() === zoneEleve;
        const bMemeZone = (b.zone || '').trim().toLowerCase() === zoneEleve;

        if (aMemeZone && !bMemeZone) return -1;
        if (!aMemeZone && bMemeZone) return 1;

        // Équité : celui qui a le moins d'élèves reçoit en priorité
        if (occA !== occB) return occA - occB;

        // Sinon celui qui a le plus de places disponibles
        return dispoB - dispoA;
      });

      const receveurChoisi = candidats[0];

      // Appliquer le transfert
      affectationsCourantes = affectationsCourantes.map((a) => {
        if (a.eleveId === aff.eleveId && a.voyageId === voyageId && a.chauffeurId === chauffeurId) {
          return { ...a, chauffeurId: receveurChoisi.id };
        }
        return a;
      });

      occupationParChauffeur.set(chauffeurId, (occupationParChauffeur.get(chauffeurId) || 0) - 1);
      occupationParChauffeur.set(receveurChoisi.id, (occupationParChauffeur.get(receveurChoisi.id) || 0) + 1);

      impactsMap.set(receveurChoisi.nom, (impactsMap.get(receveurChoisi.nom) || 0) + 1);
      totalRedistribue++;
    });

    const nouveauResultat = construireResultatDepuisAffectations(eleves, chauffeurs, affectationsCourantes);
    const impacts = Array.from(impactsMap.entries()).map(([chauffeurNom, d]) => ({
      chauffeurNom,
      delta: d,
    }));

    const detailsImpacts = impacts
      .map((imp) => `${imp.chauffeurNom} (+${imp.delta})`)
      .join(', ');

    const nbVerrouillesChauffeurs = setVerrouilles.size;
    const nbVerrouillesEmplacements = setEmplacements.size;
    let mentionVerrou = '';
    if (nbVerrouillesChauffeurs > 0 || nbVerrouillesEmplacements > 0) {
      const parts: string[] = [];
      if (nbVerrouillesChauffeurs > 0) parts.push(`${nbVerrouillesChauffeurs} chauffeur(s) verrouillé(s)`);
      if (nbVerrouillesEmplacements > 0) parts.push(`${nbVerrouillesEmplacements} emplacement(s) figé(s)`);
      mentionVerrou = ` (${parts.join(', ')} 🔒 préservé(s))`;
    }

    return {
      nouveauResultat,
      succes: totalRedistribue > 0,
      delta,
      effectue: totalRedistribue,
      message:
        totalRedistribue > 0
          ? `✓ Réduction appliquée : ${chauffeurCible.nom} passe à ${actuel - totalRedistribue} élèves (-${totalRedistribue}). Surplus redistribué équitablement vers : ${detailsImpacts}.${mentionVerrou}`
          : `Aucun chauffeur disponible ou non-verrouillé n'avait de place pour absorber le surplus de ${chauffeurCible.nom}.`,
      impacts,
    };
  }

  // =========================================================================
  // CAS 2 : AUGMENTATION (delta > 0)
  // L'utilisateur augmente le nombre d'élèves de ce chauffeur.
  // La réduction chez les autres chauffeurs doit être ÉQUITABLE.
  // On prélève en priorité chez les collègues les plus chargés sur ce créneau.
  // =========================================================================
  const aAjouter = Math.min(delta, ciblePlaces - actuel);
  let totalAjoute = 0;

  // Décompte actuel des élèves par chauffeur sur ce voyage
  const occupationParChauffeur = new Map<string, number>();
  chauffeurs.forEach((c) => {
    const nb = affectationsCourantes.filter(
      (a) => a.chauffeurId === c.id && a.voyageId === voyageId
    ).length;
    occupationParChauffeur.set(c.id, nb);
  });

  const configCible = getConfigVoyage(chauffeurCible, voyageId);
  const niveauxCible = extraireNiveaux(configCible);
  const cibleAinSebaaCible = cibleAinSebaa(configCible);

  // Boucle de prélèvement 1 par 1 pour garantir une réduction parfaitement équitable
  for (let step = 0; step < aAjouter; step++) {
    // Identifier tous les autres chauffeurs donateurs (non verrouillés) qui ont au moins 1 élève sur ce voyage
    const donateursCandidats = chauffeurs.filter((c) => {
      if (c.id === chauffeurId) return false;
      if (estEmplacementVerrouille(c.id, voyageId, chauffeurIdsVerrouilles, emplacementsVerrouilles)) return false; // Protégé par cadenas global ou emplacement 🔒
      const nb = occupationParChauffeur.get(c.id) || 0;
      return nb > 0;
    });

    if (donateursCandidats.length === 0) break;

    // Pour chaque donateur candidat, trouver s'il a un élève compatible avec le chauffeur cible
    type DonateurOption = {
      chauffeur: Chauffeur;
      affEleve: AffectationEleve;
      eleve: Eleve;
      nbActuel: number;
      score: number;
    };

    const optionsDisponibles: DonateurOption[] = [];

    donateursCandidats.forEach((donateur) => {
      const nb = occupationParChauffeur.get(donateur.id) || 0;
      const affs = affectationsCourantes.filter(
        (a) => a.chauffeurId === donateur.id && a.voyageId === voyageId
      );

      // Chercher les élèves compatibles avec notre chauffeur cible
      const elevesCompatibles = affs
        .map((a) => ({ aff: a, eleve: mapEleves.get(a.eleveId) }))
        .filter((item): item is { aff: AffectationEleve; eleve: Eleve } => {
          if (!item.eleve) return false;
          const e = item.eleve;
          if (niveauRequis && e.niveau !== niveauRequis) return false;
          if (niveauxCible.length > 0 && !niveauxCible.includes(e.niveau)) return false;
          if (cibleAinSebaaCible && (e.zone || '').trim().toLowerCase() !== ZONE_ECOLE) {
            // toléré si la zone du chauffeur cible correspond à l'élève
            if ((e.zone || '').trim().toLowerCase() !== zoneCible) return false;
          }
          return true;
        });

      if (elevesCompatibles.length > 0) {
        // Choisir l'élève le plus approprié à céder
        // (priorité à un élève de la zone du chauffeur cible ou hors-zone du donateur)
        const zoneDonateur = (donateur.zone || '').trim().toLowerCase();
        elevesCompatibles.sort((a, b) => {
          const aZoneEleve = (a.eleve.zone || '').trim().toLowerCase();
          const bZoneEleve = (b.eleve.zone || '').trim().toLowerCase();

          const aPourCible = aZoneEleve === zoneCible;
          const bPourCible = bZoneEleve === zoneCible;
          if (aPourCible && !bPourCible) return -1;
          if (!aPourCible && bPourCible) return 1;

          const aHorsDonateur = aZoneEleve !== zoneDonateur;
          const bHorsDonateur = bZoneEleve !== zoneDonateur;
          if (aHorsDonateur && !bHorsDonateur) return -1;
          if (!aHorsDonateur && bHorsDonateur) return 1;

          return 0;
        });

        const choosen = elevesCompatibles[0];

        // Calcul du score d'équité pour le donateur :
        // PLUS le donateur a d'élèves, PLUS il doit donner en premier !
        // Bonus si même zone géographique pour la cohérence de tournée
        let score = nb * 10;
        if (zoneDonateur === zoneCible) score += 50;

        optionsDisponibles.push({
          chauffeur: donateur,
          affEleve: choosen.aff,
          eleve: choosen.eleve,
          nbActuel: nb,
          score,
        });
      }
    });

    if (optionsDisponibles.length === 0) break;

    // Trier les options : le donateur avec le score le plus élevé (le plus chargé) cède un élève
    optionsDisponibles.sort((a, b) => b.score - a.score);
    const donateurChoisi = optionsDisponibles[0];

    // Effectuer le transfert
    affectationsCourantes = affectationsCourantes.map((a) => {
      if (
        a.eleveId === donateurChoisi.affEleve.eleveId &&
        a.voyageId === voyageId &&
        a.chauffeurId === donateurChoisi.chauffeur.id
      ) {
        return { ...a, chauffeurId };
      }
      return a;
    });

    occupationParChauffeur.set(chauffeurId, (occupationParChauffeur.get(chauffeurId) || 0) + 1);
    occupationParChauffeur.set(
      donateurChoisi.chauffeur.id,
      (occupationParChauffeur.get(donateurChoisi.chauffeur.id) || 0) - 1
    );

    impactsMap.set(
      donateurChoisi.chauffeur.nom,
      (impactsMap.get(donateurChoisi.chauffeur.nom) || 0) - 1
    );
    totalAjoute++;
  }

  const nouveauResultat = construireResultatDepuisAffectations(eleves, chauffeurs, affectationsCourantes);
  const impacts = Array.from(impactsMap.entries()).map(([chauffeurNom, d]) => ({
    chauffeurNom,
    delta: d,
  }));

  const detailsImpacts = impacts
    .map((imp) => `${imp.chauffeurNom} (${imp.delta})`)
    .join(', ');

  const nbVerrouillesChauffeurs = setVerrouilles.size;
  const nbVerrouillesEmplacements = setEmplacements.size;
  let mentionVerrou = '';
  if (nbVerrouillesChauffeurs > 0 || nbVerrouillesEmplacements > 0) {
    const parts: string[] = [];
    if (nbVerrouillesChauffeurs > 0) parts.push(`${nbVerrouillesChauffeurs} chauffeur(s) verrouillé(s)`);
    if (nbVerrouillesEmplacements > 0) parts.push(`${nbVerrouillesEmplacements} emplacement(s) figé(s)`);
    mentionVerrou = ` (${parts.join(', ')} 🔒 préservé(s))`;
  }

  return {
    nouveauResultat,
    succes: totalAjoute > 0,
    delta,
    effectue: totalAjoute,
    message:
      totalAjoute > 0
        ? `✓ Augmentation appliquée : ${chauffeurCible.nom} passe à ${actuel + totalAjoute} élèves (+${totalAjoute}). Réduction équitable effectuée chez : ${detailsImpacts}.${mentionVerrou}`
        : `Impossible de trouver des élèves transférables chez les chauffeurs disponibles (les autres sont peut-être verrouillés 🔒 ou complets) pour ${chauffeurCible.nom}.`,
    impacts,
  };
};

// Auto-équilibrer intelligemment les taux de remplissage pour éliminer les taux de 50%
// Les chauffeurs et emplacements verrouillés sont protégés et ne subissent aucun transfert
export const autoEquilibrerTaux = (
  resultatActuel: ResultatRepartition,
  eleves: Eleve[],
  chauffeurs: Chauffeur[],
  chauffeurIdsVerrouilles: Set<string> | string[] = new Set(),
  emplacementsVerrouilles: Set<string> | string[] = new Set()
): { nouveauResultat: ResultatRepartition; totalDeplaces: number } => {
  const setVerrouilles = new Set(chauffeurIdsVerrouilles);
  const setEmplacements = new Set(emplacementsVerrouilles);
  let affectationsCourantes = [...resultatActuel.affectations];
  let totalDeplaces = 0;

  // Grouper les chauffeurs par zone
  const chauffeursParZone: Record<string, Chauffeur[]> = {};
  chauffeurs.forEach((c) => {
    const z = (c.zone || 'inconnue').trim().toLowerCase();
    if (!chauffeursParZone[z]) chauffeursParZone[z] = [];
    chauffeursParZone[z].push(c);
  });

  // Pour chaque voyage chronologique
  VOYAGES.forEach((voyage) => {
    const voyageId = voyage.id;

    // Équilibrer au sein de chaque zone
    Object.entries(chauffeursParZone).forEach(([_, chauffeursZone]) => {
      // Exclure les chauffeurs ou emplacements verrouillés sur ce voyage
      const chauffeursActifs = chauffeursZone.filter((c) => 
        !estEmplacementVerrouille(c.id, voyageId, setVerrouilles, setEmplacements)
      );
      if (chauffeursActifs.length < 2) return;

      // Trouver les chauffeurs donateurs (taux > 80% ou pleins) et receveurs (taux <= 50% ou 0)
      const statsChauffeurs = chauffeursActifs.map((c) => {
        const affs = affectationsCourantes.filter(
          (a) => a.chauffeurId === c.id && a.voyageId === voyageId
        );
        return {
          chauffeur: c,
          nb: affs.length,
          places: c.places,
          dispo: Math.max(0, c.places - affs.length),
          taux: c.places > 0 ? affs.length / c.places : 0,
        };
      });

      // Trier : ceux qui ont le plus d'élèves d'abord, ceux qui en ont le moins ensuite
      statsChauffeurs.sort((a, b) => b.nb - a.nb);

      statsChauffeurs.forEach((donateur) => {
        if (donateur.nb <= 10) return; // Ne pas vider un chauffeur déjà peu rempli

        statsChauffeurs.forEach((receveur) => {
          if (receveur.chauffeur.id === donateur.chauffeur.id) return;
          if (receveur.dispo <= 0) return;

          // Si le donateur a beaucoup plus d'élèves que le receveur
          const difference = donateur.nb - receveur.nb;
          if (difference >= 6) {
            // Nombre d'élèves à transférer pour équilibrer
            const transfertPossible = Math.min(
              Math.floor(difference / 2),
              receveur.dispo,
              Math.max(1, Math.floor(donateur.nb * 0.35))
            );

            if (transfertPossible > 0) {
              const affsDonateur = affectationsCourantes.filter(
                (a) => a.chauffeurId === donateur.chauffeur.id && a.voyageId === voyageId
              );

              const aDeplacer = affsDonateur.slice(-transfertPossible);
              const idsADeplacer = new Set(aDeplacer.map((a) => a.eleveId));

              affectationsCourantes = affectationsCourantes.map((aff) => {
                if (
                  aff.voyageId === voyageId &&
                  aff.chauffeurId === donateur.chauffeur.id &&
                  idsADeplacer.has(aff.eleveId)
                ) {
                  return { ...aff, chauffeurId: receveur.chauffeur.id };
                }
                return aff;
              });

              donateur.nb -= transfertPossible;
              receveur.nb += transfertPossible;
              receveur.dispo -= transfertPossible;
              totalDeplaces += transfertPossible;
            }
          }
        });
      });
    });
  });

  const nouveauResultat = construireResultatDepuisAffectations(eleves, chauffeurs, affectationsCourantes);
  return { nouveauResultat, totalDeplaces };
};

// ============================================================
// FONCTIONS D'EXPORT & REQUÊTES
// ============================================================

// Obtenir la liste des élèves d'un chauffeur pour un voyage
export const getElevesChauffeurVoyage = (
  resultat: ResultatRepartition,
  chauffeurId: string,
  voyageId: string
): Eleve[] => {
  return resultat.parChauffeur[chauffeurId]?.voyages[voyageId]?.eleves || [];
};

// Obtenir le récapitulatif par chauffeur
export const getRecapitulatifChauffeurs = (
  resultat: ResultatRepartition
): Array<{
  chauffeur: Chauffeur;
  matin1: number;
  matin2: number;
  apresMidi15h15: number;
  apresMidi16h00: number;
  total: number;
  tauxGlobal: number;
}> => {
  return Object.values(resultat.parChauffeur).map((r) => ({
    chauffeur: r.chauffeur,
    matin1: r.voyages['MATIN_1']?.placesUtilisees || 0,
    matin2: r.voyages['MATIN_2']?.placesUtilisees || 0,
    apresMidi15h15: r.voyages['APRES_MIDI_15H15']?.placesUtilisees || 0,
    apresMidi16h00: r.voyages['APRES_MIDI_16H00']?.placesUtilisees || 0,
    total: r.totalEleves,
    tauxGlobal: r.tauxGlobal,
  }));
};

// ============================================================
// STATISTIQUES D'OPTIMISATION PAR VOYAGE
// ============================================================

export interface StatsOptimisationVoyage {
  nbTransportsUtilises: number;
  placesTransportsUtilises: number;
  totalEleves: number;
  totalPlaces: number;
  tauxOptimisation: number;
  placesMoyenneParTransportUtilise: number;
}

export const getStatsOptimisationVoyage = (voyageData?: {
  chauffeurs?: Array<{ placesUtilisees: number; placesTotales: number }>;
  totalEleves?: number;
  totalPlaces?: number;
  nbTransportsUtilises?: number;
  placesTransportsUtilises?: number;
  tauxOptimisation?: number;
  placesMoyenneParTransportUtilise?: number;
}): StatsOptimisationVoyage => {
  if (!voyageData) {
    return {
      nbTransportsUtilises: 0,
      placesTransportsUtilises: 0,
      totalEleves: 0,
      totalPlaces: 0,
      tauxOptimisation: 0,
      placesMoyenneParTransportUtilise: 0,
    };
  }

  const chauffeurs = voyageData.chauffeurs || [];
  const chauffeursUtilises = chauffeurs.filter((c) => c.placesUtilisees > 0);
  const nbTransportsUtilises = voyageData.nbTransportsUtilises ?? chauffeursUtilises.length;
  const placesTransportsUtilises = voyageData.placesTransportsUtilises ?? chauffeursUtilises.reduce((s, c) => s + c.placesTotales, 0);
  const totalEleves = voyageData.totalEleves ?? chauffeurs.reduce((s, c) => s + c.placesUtilisees, 0);
  const totalPlaces = voyageData.totalPlaces ?? chauffeurs.reduce((s, c) => s + c.placesTotales, 0);
  
  // Taux d'optimisation en pourcentage :
  // Ratio entre le nombre d'élèves transportés et le nombre total de places des transports utilisés
  const tauxOptimisation = voyageData.tauxOptimisation ?? (placesTransportsUtilises > 0
    ? Math.round((totalEleves / placesTransportsUtilises) * 100)
    : 0);

  const placesMoyenneParTransportUtilise = voyageData.placesMoyenneParTransportUtilise ?? (
    nbTransportsUtilises > 0 ? Math.round((placesTransportsUtilises / nbTransportsUtilises) * 10) / 10 : 0
  );

  return {
    nbTransportsUtilises,
    placesTransportsUtilises,
    totalEleves,
    totalPlaces,
    tauxOptimisation,
    placesMoyenneParTransportUtilise,
  };
};
