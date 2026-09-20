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

// Normaliser le nom d'une zone (minuscules, sans accents superflus, sans espaces superflus)
export const normaliserNomZone = (zone: string | null | undefined): string => {
  if (!zone) return '';
  return zone
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

// Obtenir la liste dédoublonnée des zones autorisées pour un chauffeur
export const obtenirZonesChauffeur = (
  chauffeur: Chauffeur | { zone?: string; zones?: string[] } | null | undefined
): string[] => {
  if (!chauffeur) return [];
  if (Array.isArray(chauffeur.zones) && chauffeur.zones.length > 0) {
    const list = chauffeur.zones
      .map(normaliserNomZone)
      .filter(Boolean);
    if (list.length > 0) {
      return Array.from(new Set(list));
    }
  }
  if (chauffeur.zone) {
    const parts = chauffeur.zone
      .split(/[,;/+]/)
      .map(normaliserNomZone)
      .filter(Boolean);
    if (parts.length > 0) {
      return Array.from(new Set(parts));
    }
  }
  return [];
};

export const VOYAGE_KEY_TO_ID: Record<string, string> = {
  voyageMatin1: 'MATIN_1',
  voyageMatin2: 'MATIN_2',
  voyageApresMidi15h15: 'APRES_MIDI_15H15',
  voyageApresMidi16h00: 'APRES_MIDI_16H00',
  MATIN_1: 'MATIN_1',
  MATIN_2: 'MATIN_2',
  APRES_MIDI_15H15: 'APRES_MIDI_15H15',
  APRES_MIDI_16H00: 'APRES_MIDI_16H00',
};

export const VOYAGE_ID_TO_KEY: Record<string, 'voyageMatin1' | 'voyageMatin2' | 'voyageApresMidi15h15' | 'voyageApresMidi16h00'> = {
  MATIN_1: 'voyageMatin1',
  MATIN_2: 'voyageMatin2',
  APRES_MIDI_15H15: 'voyageApresMidi15h15',
  APRES_MIDI_16H00: 'voyageApresMidi16h00',
  voyageMatin1: 'voyageMatin1',
  voyageMatin2: 'voyageMatin2',
  voyageApresMidi15h15: 'voyageApresMidi15h15',
  voyageApresMidi16h00: 'voyageApresMidi16h00',
};

// Obtenir la zone originale (zone principale/d'origine) d'un voyage pour un chauffeur
export const obtenirZoneOriginaleVoyage = (
  chauffeur: Chauffeur | null | undefined,
  voyageIdOrKey: string | null | undefined
): string => {
  if (!chauffeur) return '';
  const stdVoyageId = VOYAGE_KEY_TO_ID[voyageIdOrKey || ''] || voyageIdOrKey || 'MATIN_1';
  const stdVoyageKey = VOYAGE_ID_TO_KEY[voyageIdOrKey || ''] || voyageIdOrKey || 'voyageMatin1';

  // 1. Dictionnaire dédié
  if (chauffeur.zonesOriginalesParVoyage) {
    const val = chauffeur.zonesOriginalesParVoyage[stdVoyageId] || chauffeur.zonesOriginalesParVoyage[stdVoyageKey];
    if (val && typeof val === 'string' && val.trim()) {
      return normaliserNomZone(val);
    }
  }

  // 2. Propriétés dédiées
  if (stdVoyageId === 'MATIN_1' && chauffeur.zoneOriginaleVoyageMatin1) {
    return normaliserNomZone(chauffeur.zoneOriginaleVoyageMatin1);
  }
  if (stdVoyageId === 'MATIN_2' && chauffeur.zoneOriginaleVoyageMatin2) {
    return normaliserNomZone(chauffeur.zoneOriginaleVoyageMatin2);
  }
  if (stdVoyageId === 'APRES_MIDI_15H15' && chauffeur.zoneOriginaleVoyageApresMidi15h15) {
    return normaliserNomZone(chauffeur.zoneOriginaleVoyageApresMidi15h15);
  }
  if (stdVoyageId === 'APRES_MIDI_16H00' && chauffeur.zoneOriginaleVoyageApresMidi16h00) {
    return normaliserNomZone(chauffeur.zoneOriginaleVoyageApresMidi16h00);
  }

  // 3. Si l'option cible explicitement Ain Sebaa (ex: N1 AIN SEBAA, N2 AIN SEBAA)
  const config = getConfigVoyage(chauffeur, stdVoyageId);
  if (config && cibleAinSebaa(config)) {
    return ZONE_ECOLE;
  }

  // 4. Si des zones sont explicitement configurées pour ce voyage, la première est la zone originale
  const voyageZones = chauffeur.zonesParVoyage?.[stdVoyageId] || chauffeur.zonesParVoyage?.[stdVoyageKey];
  if (Array.isArray(voyageZones) && voyageZones.length > 0) {
    const firstNorm = normaliserNomZone(voyageZones[0]);
    if (firstNorm) return firstNorm;
  }

  // 5. Zone d'origine générale du chauffeur ou chauffeur.zone
  if (chauffeur.zoneOriginale) {
    return normaliserNomZone(chauffeur.zoneOriginale);
  }
  const general = obtenirZonesChauffeur(chauffeur);
  return general[0] || ZONE_ECOLE;
};

// Obtenir la liste dédoublonnée des zones autorisées pour un voyage spécifique d'un chauffeur
export const obtenirZonesVoyageChauffeur = (
  chauffeur: Chauffeur | null | undefined,
  voyageIdOrKey: string | null | undefined
): string[] => {
  if (!chauffeur) return [];
  if (!voyageIdOrKey) return obtenirZonesChauffeur(chauffeur);

  const stdVoyageId = VOYAGE_KEY_TO_ID[voyageIdOrKey] || voyageIdOrKey;
  const stdVoyageKey = VOYAGE_ID_TO_KEY[voyageIdOrKey] || voyageIdOrKey;

  let zones: string[] = [];

  // 1. Dictionnaire zonesParVoyage
  if (chauffeur.zonesParVoyage) {
    const list = chauffeur.zonesParVoyage[stdVoyageId] || chauffeur.zonesParVoyage[stdVoyageKey];
    if (Array.isArray(list) && list.length > 0) {
      zones = list.map(normaliserNomZone).filter(Boolean);
    }
  }

  // 2. Propriétés dédiées par voyage
  if (zones.length === 0) {
    if (stdVoyageId === 'MATIN_1' && Array.isArray(chauffeur.zonesVoyageMatin1) && chauffeur.zonesVoyageMatin1.length > 0) {
      zones = chauffeur.zonesVoyageMatin1.map(normaliserNomZone).filter(Boolean);
    } else if (stdVoyageId === 'MATIN_2' && Array.isArray(chauffeur.zonesVoyageMatin2) && chauffeur.zonesVoyageMatin2.length > 0) {
      zones = chauffeur.zonesVoyageMatin2.map(normaliserNomZone).filter(Boolean);
    } else if (stdVoyageId === 'APRES_MIDI_15H15' && Array.isArray(chauffeur.zonesVoyageApresMidi15h15) && chauffeur.zonesVoyageApresMidi15h15.length > 0) {
      zones = chauffeur.zonesVoyageApresMidi15h15.map(normaliserNomZone).filter(Boolean);
    } else if (stdVoyageId === 'APRES_MIDI_16H00' && Array.isArray(chauffeur.zonesVoyageApresMidi16h00) && chauffeur.zonesVoyageApresMidi16h00.length > 0) {
      zones = chauffeur.zonesVoyageApresMidi16h00.map(normaliserNomZone).filter(Boolean);
    }
  }

  // 3. Repli : si l'option du voyage cible explicitement AIN SEBAA
  if (zones.length === 0) {
    const config = getConfigVoyage(chauffeur, stdVoyageId);
    if (config && cibleAinSebaa(config)) {
      const general = obtenirZonesChauffeur(chauffeur);
      if (general.includes(ZONE_ECOLE)) {
        zones = [ZONE_ECOLE];
      }
    }
  }

  // 4. Repli par défaut sur les zones globales du chauffeur
  if (zones.length === 0) {
    zones = obtenirZonesChauffeur(chauffeur);
  }

  // S'assurer que la zone originale du voyage est bien incluse et placée en tête (prioritaire)
  const zoneOrig = (
    chauffeur.zonesOriginalesParVoyage?.[stdVoyageId] ||
    chauffeur.zonesOriginalesParVoyage?.[stdVoyageKey] ||
    (stdVoyageId === 'MATIN_1' ? chauffeur.zoneOriginaleVoyageMatin1 : undefined) ||
    (stdVoyageId === 'MATIN_2' ? chauffeur.zoneOriginaleVoyageMatin2 : undefined) ||
    (stdVoyageId === 'APRES_MIDI_15H15' ? chauffeur.zoneOriginaleVoyageApresMidi15h15 : undefined) ||
    (stdVoyageId === 'APRES_MIDI_16H00' ? chauffeur.zoneOriginaleVoyageApresMidi16h00 : undefined)
  );
  if (zoneOrig) {
    const normOrig = normaliserNomZone(zoneOrig);
    if (normOrig) {
      zones = [normOrig, ...zones.filter((z) => z !== normOrig)];
    }
  }

  return Array.from(new Set(zones.filter(Boolean)));
};

// Vérifie si un chauffeur dessert une zone d'élève pour un voyage donné
export const chauffeurDessertZonePourVoyage = (
  chauffeur: Chauffeur | null | undefined,
  zoneEleve: string | null | undefined,
  voyageIdOrKey: string | null | undefined
): boolean => {
  const zNorm = normaliserNomZone(zoneEleve);
  if (!zNorm) return false;
  const zonesVoyage = obtenirZonesVoyageChauffeur(chauffeur, voyageIdOrKey);
  return zonesVoyage.includes(zNorm);
};

// Obtenir l'ensemble de toutes les zones couvertes par un chauffeur sur l'ensemble de ses voyages
export const obtenirToutesZonesChauffeur = (
  chauffeur: Chauffeur | null | undefined
): string[] => {
  if (!chauffeur) return [];
  const setZ = new Set<string>(obtenirZonesChauffeur(chauffeur));
  VOYAGES.forEach((v) => {
    obtenirZonesVoyageChauffeur(chauffeur, v.id).forEach((z) => setZ.add(z));
  });
  return Array.from(setZ);
};

// Vérifie si un chauffeur dessert une zone d'élève donnée (avec voyageId optionnel)
export const chauffeurDessertZone = (
  chauffeur: Chauffeur | { zone?: string; zones?: string[] } | null | undefined,
  zoneEleve: string | null | undefined,
  voyageId?: string
): boolean => {
  if (voyageId && chauffeur && 'voyageMatin1' in chauffeur) {
    return chauffeurDessertZonePourVoyage(chauffeur as Chauffeur, zoneEleve, voyageId);
  }
  const zNorm = normaliserNomZone(zoneEleve);
  if (!zNorm) return false;
  const zonesChauffeur = obtenirZonesChauffeur(chauffeur);
  return zonesChauffeur.includes(zNorm);
};

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
// CONTINUITÉ CHAUFFEUR MATIN / APRÈS-MIDI
// ============================================================

// Vérifier si un chauffeur est compatible pour transporter un élève sur un voyage donné
export const chauffeurPeutTransporterEleve = (
  chauffeur: Chauffeur,
  eleve: Eleve,
  voyageId: string
): boolean => {
  if (estVoyageSans(chauffeur, voyageId)) return false;
  // Vérification de concordance de niveau
  const config = getConfigVoyage(chauffeur, voyageId);
  const niveaux = extraireNiveaux(config);
  if (niveaux.length > 0 && !niveaux.includes(eleve.niveau)) return false;
  if (voyageId === 'APRES_MIDI_15H15' && eleve.niveau !== 1) return false;
  if (voyageId === 'APRES_MIDI_16H00' && eleve.niveau !== 2) return false;
  // Vérification de desserte de la zone
  return chauffeurDessertZonePourVoyage(chauffeur, eleve.zone, voyageId);
};

// Vérifier si un chauffeur peut également transporter cet élève sur son trajet de retour l'après-midi
export const chauffeurPeutPrendreApresMidi = (
  chauffeur: Chauffeur,
  eleve: Eleve
): boolean => {
  const voyageApresMidiId = eleve.niveau === 1 ? 'APRES_MIDI_15H15' : 'APRES_MIDI_16H00';
  return chauffeurPeutTransporterEleve(chauffeur, eleve, voyageApresMidiId);
};

// Optimiseur post-affectation pour maximiser la règle :
// "Les élèves transportés le matin doivent être les mêmes l'après-midi"
export const optimiserContinuiteMatinApresMidi = (
  affectationsInitiales: AffectationEleve[],
  eleves: Eleve[],
  chauffeurs: Chauffeur[],
  emplacementsVerrouilles: Set<string> = new Set()
): AffectationEleve[] => {
  const affectations: AffectationEleve[] = affectationsInitiales.map((a) => ({ ...a }));
  const elevesMap = new Map(eleves.map((e) => [e.id, e]));
  const chauffeursMap = new Map(chauffeurs.map((c) => [c.id, c]));

  const peutPrendre = (chauffeurId: string, eleve: Eleve, voyageId: string): boolean => {
    const c = chauffeursMap.get(chauffeurId);
    if (!c) return false;
    if (emplacementsVerrouilles.has(`${chauffeurId}_${voyageId}`)) return false;
    return chauffeurPeutTransporterEleve(c, eleve, voyageId);
  };

  const getPlacesOccupees = (chId: string, vId: string): number => {
    return affectations.filter((a) => a.chauffeurId === chId && a.voyageId === vId).length;
  };

  const getAffMatin = (eleveId: string) => {
    return affectations.find(
      (a) => a.eleveId === eleveId && (a.voyageId === 'MATIN_1' || a.voyageId === 'MATIN_2')
    );
  };

  const getAffAprem = (eleveId: string) => {
    return affectations.find(
      (a) => a.eleveId === eleveId && (a.voyageId === 'APRES_MIDI_15H15' || a.voyageId === 'APRES_MIDI_16H00')
    );
  };

  // PASSE 1 : ÉCHANGES BILATÉRAUX D'APRÈS-MIDI (15h15 et 16h00)
  // Si A a C1 le matin et C2 l'après-midi, et B a C2 le matin et C1 l'après-midi
  // Échanger A et B l'après-midi restaure la continuité pour les DEUX élèves !
  const voyagesAprem = ['APRES_MIDI_15H15', 'APRES_MIDI_16H00'];
  voyagesAprem.forEach((voyageId) => {
    let continueLoop = true;
    let tour = 0;
    while (continueLoop && tour < 40) {
      continueLoop = false;
      tour++;

      const affsVoyage = affectations.filter((a) => a.voyageId === voyageId);
      for (let i = 0; i < affsVoyage.length; i++) {
        const affA = affsVoyage[i];
        const eleveA = elevesMap.get(affA.eleveId);
        if (!eleveA) continue;
        const matinA = getAffMatin(eleveA.id);
        if (!matinA || matinA.chauffeurId === affA.chauffeurId) continue;

        const cMatinA = matinA.chauffeurId;
        const cActuelA = affA.chauffeurId;

        // Chercher un élève B chez cMatinA
        for (let j = 0; j < affsVoyage.length; j++) {
          if (i === j) continue;
          const affB = affsVoyage[j];
          if (affB.chauffeurId !== cMatinA) continue;

          const eleveB = elevesMap.get(affB.eleveId);
          if (!eleveB) continue;
          const matinB = getAffMatin(eleveB.id);

          const bEstMatinCActuelA = matinB && matinB.chauffeurId === cActuelA;
          const bNeutre = !matinB || matinB.chauffeurId !== cMatinA;

          if (
            (bEstMatinCActuelA || bNeutre) &&
            peutPrendre(cMatinA, eleveA, voyageId) &&
            peutPrendre(cActuelA, eleveB, voyageId)
          ) {
            affA.chauffeurId = cMatinA;
            affB.chauffeurId = cActuelA;
            continueLoop = true;
            break;
          }
        }
        if (continueLoop) break;
      }
    }
  });

  // PASSE 2 : TRANSFERT UNILATÉRAL VERS PLACES DISPONIBLES D'APRÈS-MIDI
  voyagesAprem.forEach((voyageId) => {
    const affsVoyage = affectations.filter((a) => a.voyageId === voyageId);
    affsVoyage.forEach((aff) => {
      const eleve = elevesMap.get(aff.eleveId);
      if (!eleve) return;
      const affMatin = getAffMatin(eleve.id);
      if (!affMatin || affMatin.chauffeurId === aff.chauffeurId) return;

      const cMatinId = affMatin.chauffeurId;
      const cMatin = chauffeursMap.get(cMatinId);
      if (!cMatin) return;

      if (
        peutPrendre(cMatinId, eleve, voyageId) &&
        getPlacesOccupees(cMatinId, voyageId) < cMatin.places
      ) {
        aff.chauffeurId = cMatinId;
      }
    });
  });

  // PASSE 3 : ÉCHANGES BILATÉRAUX DU MATIN (MATIN_1 et MATIN_2)
  const voyagesMatin = ['MATIN_1', 'MATIN_2'];
  voyagesMatin.forEach((voyageId) => {
    let continueLoop = true;
    let tour = 0;
    while (continueLoop && tour < 40) {
      continueLoop = false;
      tour++;

      const affsVoyage = affectations.filter((a) => a.voyageId === voyageId);
      for (let i = 0; i < affsVoyage.length; i++) {
        const affA = affsVoyage[i];
        const eleveA = elevesMap.get(affA.eleveId);
        if (!eleveA) continue;
        const apremA = getAffAprem(eleveA.id);
        if (!apremA || apremA.chauffeurId === affA.chauffeurId) continue;

        const cApremA = apremA.chauffeurId;
        const cActuelA = affA.chauffeurId;

        for (let j = 0; j < affsVoyage.length; j++) {
          if (i === j) continue;
          const affB = affsVoyage[j];
          if (affB.chauffeurId !== cApremA) continue;

          const eleveB = elevesMap.get(affB.eleveId);
          if (!eleveB) continue;
          const apremB = getAffAprem(eleveB.id);

          const bEstApremCActuelA = apremB && apremB.chauffeurId === cActuelA;
          const bNeutre = !apremB || apremB.chauffeurId !== cApremA;

          if (
            (bEstApremCActuelA || bNeutre) &&
            peutPrendre(cApremA, eleveA, voyageId) &&
            peutPrendre(cActuelA, eleveB, voyageId)
          ) {
            affA.chauffeurId = cApremA;
            affB.chauffeurId = cActuelA;
            continueLoop = true;
            break;
          }
        }
        if (continueLoop) break;
      }
    }
  });

  // PASSE 4 : TRANSFERT UNILATÉRAL DU MATIN VERS PLACES DISPONIBLES
  voyagesMatin.forEach((voyageId) => {
    const affsVoyage = affectations.filter((a) => a.voyageId === voyageId);
    affsVoyage.forEach((aff) => {
      const eleve = elevesMap.get(aff.eleveId);
      if (!eleve) return;
      const affAprem = getAffAprem(eleve.id);
      if (!affAprem || affAprem.chauffeurId === aff.chauffeurId) return;

      const cApremId = affAprem.chauffeurId;
      const cAprem = chauffeursMap.get(cApremId);
      if (!cAprem) return;

      if (
        peutPrendre(cApremId, eleve, voyageId) &&
        getPlacesOccupees(cApremId, voyageId) < cAprem.places
      ) {
        aff.chauffeurId = cApremId;
      }
    });
  });

  return affectations;
};

// ============================================================
// ALGORITHME PRINCIPAL
// ============================================================

export interface OptionsRepartition {
  pourcentagesCibles?: Record<string, number>;
}

export const repartir = (
  eleves: Eleve[],
  chauffeurs: Chauffeur[],
  options?: OptionsRepartition
): ResultatRepartition => {
  let affectations: AffectationEleve[] = [];
  const alertes: Alerte[] = [];

  // Set des élèves déjà affectés par voyage (`${voyageId}_${eleveId}`)
  const elevesAffectes = new Set<string>();
  // Set des élèves affectés au matin (pour éviter de doubler un élève sur MATIN_1 et MATIN_2)
  const elevesAffectesMatin = new Set<string>();

  // ============================================================
  // ÉTAPE 1 : ANALYSE PRÉALABLE
  // ============================================================

  // 1.1 Grouper les élèves par zone et niveau
  const elevesParZoneEtNiveau: Record<string, { 1: Eleve[]; 2: Eleve[] }> = {};
  eleves.forEach((eleve) => {
    const zoneKey = normaliserNomZone(eleve.zone) || 'inconnue';
    if (!elevesParZoneEtNiveau[zoneKey]) {
      elevesParZoneEtNiveau[zoneKey] = { 1: [], 2: [] };
    }
    const niv = eleve.niveau === 2 ? 2 : 1;
    elevesParZoneEtNiveau[zoneKey][niv].push(eleve);
  });

  // 1.2 Grouper les chauffeurs par zone (tenant compte de toutes les zones couvertes sur ses voyages)
  const chauffeursParZone: Record<string, Chauffeur[]> = {};
  chauffeurs.forEach((chauffeur) => {
    const zones = obtenirToutesZonesChauffeur(chauffeur);
    const zonesToRegister = zones.length > 0 ? zones : ['inconnue'];
    zonesToRegister.forEach((z) => {
      if (!chauffeursParZone[z]) {
        chauffeursParZone[z] = [];
      }
      chauffeursParZone[z].push(chauffeur);
    });
  });

  // 1.3 Calculer les capacités et déficits par zone
  Object.keys(elevesParZoneEtNiveau).forEach((zone) => {
    const elevesZone = elevesParZoneEtNiveau[zone];
    const totalEleves = elevesZone[1].length + elevesZone[2].length;
    const chauffeursZone = chauffeursParZone[zone] || [];
    const capaciteZone = chauffeursZone.reduce((sum, c) => sum + (c.places || 0), 0);

    if (chauffeursZone.length === 0) {
      alertes.push({
        type: 'ZONE_SANS_CHAUFFEUR',
        message: `Zone ${zone.toUpperCase()} : ${totalEleves} élève(s) inscrit(s), mais AUCUN chauffeur n'a cette zone sélectionnée !`,
        severite: 'ERROR',
        details: { zone, totalEleves, capaciteZone: 0 },
      });
    } else if (totalEleves > capaciteZone) {
      alertes.push({
        type: 'DEFICIT_ZONE',
        message: `Zone ${zone.toUpperCase()} : ${totalEleves} élèves pour ${capaciteZone} places réparties sur ${chauffeursZone.length} chauffeur(s) (déficit de ${totalEleves - capaciteZone})`,
        severite: 'WARNING',
        details: { zone, totalEleves, capaciteZone },
      });
    }
  });

  // ============================================================
  // ÉTAPE 2.1 : AFFECTATION DU MATIN (MATIN_1 & MATIN_2)
  // Anticipation de la règle de continuité : favoriser les élèves que
  // ce chauffeur pourra également transporter l'après-midi !
  // ============================================================
  const voyagesMatin = [
    { id: 'MATIN_1', libelle: 'Matin 1', heure: '08:30', niveau: null },
    { id: 'MATIN_2', libelle: 'Matin 2', heure: '09:15', niveau: null },
  ];

  voyagesMatin.forEach((voyage) => {
    const voyageId = voyage.id;
    const chauffeursActifs = chauffeurs
      .filter((c) => !estVoyageSans(c, voyageId))
      .sort((a, b) => b.places - a.places); // Trier par capacité décroissante

    chauffeursActifs.forEach((chauffeur) => {
      const config = getConfigVoyage(chauffeur, voyageId);
      const niveauxChauffeur = extraireNiveaux(config);
      const cibleAinSebaaChauffeur = cibleAinSebaa(config);
      const zonesAutorisees = obtenirZonesVoyageChauffeur(chauffeur, voyageId);

      let placesDisponibles = chauffeur.places;
      const ciblePct = options?.pourcentagesCibles?.[voyageId];
      if (typeof ciblePct === 'number' && ciblePct < 100) {
        placesDisponibles = Math.max(0, Math.round((chauffeur.places * ciblePct) / 100));
      }
      const niveauxEffectifs = [1, 2].filter((n) => niveauxChauffeur.includes(n));

      const zoneOriginaleDuVoyage = obtenirZoneOriginaleVoyage(chauffeur, voyageId);
      const zonesOrdonnees = [...zonesAutorisees].sort((a, b) => {
        if (cibleAinSebaaChauffeur) {
          if (a === ZONE_ECOLE) return -1;
          if (b === ZONE_ECOLE) return 1;
        }
        if (zoneOriginaleDuVoyage) {
          if (a === zoneOriginaleDuVoyage) return -1;
          if (b === zoneOriginaleDuVoyage) return 1;
        }
        return 0;
      });

      zonesOrdonnees.forEach((zone) => {
        if (placesDisponibles <= 0) return;

        niveauxEffectifs.forEach((niveau) => {
          if (placesDisponibles <= 0) return;

          const elevesZone = elevesParZoneEtNiveau[zone]?.[niveau as 1 | 2] || [];
          // Les élèves éligibles sont ceux qui n'ont pas encore été affectés le matin
          const elevesEligibles = elevesZone.filter((e) => !elevesAffectesMatin.has(e.id));

          // PRIORITÉ CONTINUITÉ MATIN :
          // Prioriser en premier les élèves que ce chauffeur peut aussi prendre l'après-midi
          elevesEligibles.sort((a, b) => {
            const aAprem = chauffeurPeutPrendreApresMidi(chauffeur, a) ? 1 : 0;
            const bAprem = chauffeurPeutPrendreApresMidi(chauffeur, b) ? 1 : 0;
            return bAprem - aAprem;
          });

          const nbAPrendre = Math.min(elevesEligibles.length, placesDisponibles);
          const elevesPris = elevesEligibles.slice(0, nbAPrendre);

          elevesPris.forEach((eleve) => {
            affectations.push({
              eleveId: eleve.id,
              chauffeurId: chauffeur.id,
              voyageId,
            });
            elevesAffectes.add(`${voyageId}_${eleve.id}`);
            elevesAffectesMatin.add(eleve.id);
            placesDisponibles--;
          });
        });
      });
    });
  });

  // Table de correspondance directe Élève -> Chauffeur ayant assuré le matin
  const chauffeurMatinMap = new Map<string, string>();
  affectations.forEach((a) => {
    if (a.voyageId === 'MATIN_1' || a.voyageId === 'MATIN_2') {
      chauffeurMatinMap.set(a.eleveId, a.chauffeurId);
    }
  });

  // ============================================================
  // ÉTAPE 2.2 : AFFECTATION DE L'APRÈS-MIDI (15H15 & 16H00)
  // RÈGLE PRIORITAIRE ABSOLUE : LES ÉLÈVES DU MATIN SONT PRIS EN
  // PRIORITÉ 1 PAR LEUR MÊME CHAUFFEUR DU MATIN !
  // ============================================================
  const voyagesApresMidi = [
    { id: 'APRES_MIDI_15H15', libelle: 'Après-midi 15h15', heure: '15:15', niveau: 1 },
    { id: 'APRES_MIDI_16H00', libelle: 'Après-midi 16h00', heure: '16:00', niveau: 2 },
  ];

  voyagesApresMidi.forEach((voyage) => {
    const voyageId = voyage.id;
    const niveauCible = voyage.niveau;

    const chauffeursActifs = chauffeurs
      .filter((c) => !estVoyageSans(c, voyageId))
      .sort((a, b) => b.places - a.places);

    chauffeursActifs.forEach((chauffeur) => {
      const config = getConfigVoyage(chauffeur, voyageId);
      const niveauxChauffeur = extraireNiveaux(config);
      const cibleAinSebaaChauffeur = cibleAinSebaa(config);
      const zonesAutorisees = obtenirZonesVoyageChauffeur(chauffeur, voyageId);

      let placesDisponibles = chauffeur.places;
      const ciblePct = options?.pourcentagesCibles?.[voyageId];
      if (typeof ciblePct === 'number' && ciblePct < 100) {
        placesDisponibles = Math.max(0, Math.round((chauffeur.places * ciblePct) / 100));
      }
      const niveauxEffectifs = [niveauCible].filter((n) => niveauxChauffeur.includes(n));

      const zoneOriginaleDuVoyage = obtenirZoneOriginaleVoyage(chauffeur, voyageId);
      const zonesOrdonnees = [...zonesAutorisees].sort((a, b) => {
        if (cibleAinSebaaChauffeur) {
          if (a === ZONE_ECOLE) return -1;
          if (b === ZONE_ECOLE) return 1;
        }
        if (zoneOriginaleDuVoyage) {
          if (a === zoneOriginaleDuVoyage) return -1;
          if (b === zoneOriginaleDuVoyage) return 1;
        }
        return 0;
      });

      zonesOrdonnees.forEach((zone) => {
        if (placesDisponibles <= 0) return;

        niveauxEffectifs.forEach((niveau) => {
          if (placesDisponibles <= 0) return;

          const elevesZone = elevesParZoneEtNiveau[zone]?.[niveau as 1 | 2] || [];
          const elevesEligibles = elevesZone.filter((e) => !elevesAffectes.has(`${voyageId}_${e.id}`));

          // TRI DE CONTINUITÉ STRICT :
          // 1. Priorité 1 absolue : élèves transportés par CE chauffeur le matin
          // 2. Priorité 2 : élèves sans transport matin
          // 3. Priorité 3 : élèves dont le chauffeur du matin ne dessert pas cet après-midi
          // 4. Priorité 4 : élèves dont le chauffeur du matin est actif sur ce créneau (laisser la priorité à leur chauffeur)
          elevesEligibles.sort((a, b) => {
            const aChMatin = chauffeurMatinMap.get(a.id);
            const bChMatin = chauffeurMatinMap.get(b.id);

            const aIsSame = aChMatin === chauffeur.id ? 100 : 0;
            const bIsSame = bChMatin === chauffeur.id ? 100 : 0;
            if (aIsSame !== bIsSame) return bIsSame - aIsSame;

            // Si ni l'un ni l'autre n'a ce chauffeur le matin :
            const aChMatinActif = aChMatin
              ? chauffeursActifs.some((c) => c.id === aChMatin && chauffeurDessertZonePourVoyage(c, a.zone, voyageId))
              : false;
            const bChMatinActif = bChMatin
              ? chauffeursActifs.some((c) => c.id === bChMatin && chauffeurDessertZonePourVoyage(c, b.zone, voyageId))
              : false;

            if (aChMatinActif !== bChMatinActif) {
              return aChMatinActif ? 1 : -1;
            }

            return 0;
          });

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
    });
  });

  // ============================================================
  // ÉTAPE 2.3 : POST-OPTIMISATION DE CONTINUITÉ MATIN / APRÈS-MIDI
  // Résolution automatique par échanges et transferts de sièges
  // ============================================================
  affectations = optimiserContinuiteMatinApresMidi(affectations, eleves, chauffeurs);

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

  // 3.5 Continuité Matin / Après-midi (Même chauffeur)
  let nbElevesMemeChauffeur = 0;
  let nbElevesChauffeurDifferent = 0;
  let nbElevesEligiblesContinuite = 0;
  const elevesContinuiteDetails: Array<{
    eleveId: string;
    nomComplet: string;
    zone: string;
    niveau: number;
    chauffeurMatinId: string;
    chauffeurMatinNom: string;
    chauffeurApresMidiId: string;
    chauffeurApresMidiNom: string;
    memeChauffeur: boolean;
    voyageMatin: string;
    voyageApresMidi: string;
    motifDifference?: string;
  }> = [];

  const chauffeursMap = new Map(chauffeurs.map((c) => [c.id, c]));

  eleves.forEach((e) => {
    const affMatin = affectations.find(
      (a) => a.eleveId === e.id && (a.voyageId === 'MATIN_1' || a.voyageId === 'MATIN_2')
    );
    const affAprem = affectations.find(
      (a) => a.eleveId === e.id && (a.voyageId === 'APRES_MIDI_15H15' || a.voyageId === 'APRES_MIDI_16H00')
    );

    if (affMatin && affAprem) {
      nbElevesEligiblesContinuite++;
      const cMatin = chauffeursMap.get(affMatin.chauffeurId);
      const cAprem = chauffeursMap.get(affAprem.chauffeurId);
      const cMatinNom = cMatin?.nom || 'Inconnu';
      const cApremNom = cAprem?.nom || 'Inconnu';
      const memeChauffeur = affMatin.chauffeurId === affAprem.chauffeurId;

      if (memeChauffeur) {
        nbElevesMemeChauffeur++;
      } else {
        nbElevesChauffeurDifferent++;
        let motifDifference = 'Contrainte de rotation ou capacité différente';
        if (cMatin && estVoyageSans(cMatin, affAprem.voyageId)) {
          motifDifference = `${cMatinNom} n'effectue pas de rotation à ${affAprem.voyageId === 'APRES_MIDI_15H15' ? '15h15' : '16h00'}`;
        } else if (cMatin && !chauffeurDessertZonePourVoyage(cMatin, e.zone, affAprem.voyageId)) {
          motifDifference = `${cMatinNom} ne dessert pas ${e.zone} à ${affAprem.voyageId === 'APRES_MIDI_15H15' ? '15h15' : '16h00'}`;
        }
        elevesContinuiteDetails.push({
          eleveId: e.id,
          nomComplet: `${e.prenom} ${e.nom}`.trim(),
          zone: e.zone,
          niveau: e.niveau,
          chauffeurMatinId: affMatin.chauffeurId,
          chauffeurMatinNom: cMatinNom,
          chauffeurApresMidiId: affAprem.chauffeurId,
          chauffeurApresMidiNom: cApremNom,
          memeChauffeur: false,
          voyageMatin: affMatin.voyageId,
          voyageApresMidi: affAprem.voyageId,
          motifDifference,
        });
      }
    }
  });

  const tauxMemeChauffeurMatinApresMidi =
    nbElevesEligiblesContinuite > 0
      ? Math.round((nbElevesMemeChauffeur / nbElevesEligiblesContinuite) * 100)
      : 100;

  if (nbElevesEligiblesContinuite > 0) {
    if (tauxMemeChauffeurMatinApresMidi === 100) {
      alertes.push({
        type: 'CONTINUITE_CHAUFFEUR',
        message: `✓ Règle respectée à 100% : la totalité des élèves (${nbElevesMemeChauffeur}/${nbElevesEligiblesContinuite}) ont exactement le même chauffeur le matin et l'après-midi.`,
        severite: 'INFO',
        details: { nbElevesMemeChauffeur, nbElevesEligiblesContinuite, taux: 100 },
      });
    } else {
      alertes.push({
        type: 'CONTINUITE_CHAUFFEUR',
        message: `Règle même chauffeur respectée à ${tauxMemeChauffeurMatinApresMidi}% (${nbElevesMemeChauffeur}/${nbElevesEligiblesContinuite} élèves). ${nbElevesChauffeurDifferent} élève(s) avec chauffeur différent (rotations 'SANS' ou capacités maximales).`,
        severite: 'INFO',
        details: { nbElevesMemeChauffeur, nbElevesChauffeurDifferent, nbElevesEligiblesContinuite, taux: tauxMemeChauffeurMatinApresMidi },
      });
    }
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
      tauxMemeChauffeurMatinApresMidi,
      nbElevesMemeChauffeur,
      nbElevesChauffeurDifferent,
      nbElevesEligiblesContinuite,
      elevesContinuiteDetails,
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

  // VALIDATION STRICTE DE LA CONDITION : ZONES RESPECTÉES
  const memeZone = zoneA === zoneB;
  if (!memeZone) {
    return {
      succes: false,
      motif: 'DIFFERENT_ZONE',
      message: `⛔ Interchange interdit : L'élève "${eleveA.nom} ${eleveA.prenom}" est en zone "${eleveA.zone.toUpperCase()}" tandis que "${eleveB.nom} ${eleveB.prenom}" est en zone "${eleveB.zone.toUpperCase()}". Les deux élèves doivent appartenir à la même zone pour être interchangés.`,
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

  if (!chauffeurDessertZonePourVoyage(destinationChauffeur, eleve.zone, voyageId)) {
    const zonesDest = obtenirZonesVoyageChauffeur(destinationChauffeur, voyageId).map((z) => z.toUpperCase()).join(', ');
    return {
      succes: false,
      motif: 'DIFFERENT_ZONE',
      message: `⛔ Déplacement interdit : L'élève "${eleve.nom}" est en zone "${eleve.zone.toUpperCase()}" alors que le voyage "${voyageId}" de "${destinationChauffeur.nom}" ne dessert que : [${zonesDest || 'AUCUNE ZONE'}].`,
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

// ============================================================
// AJUSTEMENT DIRECT PAR CURSEUR DE POURCENTAGE PAR VOYAGE
// Modifie en temps réel le taux et le nombre d'élèves d'un voyage
// ============================================================

export interface ResultatAjustementPourcentage {
  nouveauResultat: ResultatRepartition;
  delta: number;
  effectue: number;
  message: string;
}

export const ajusterPourcentageVoyage = (
  resultatActuel: ResultatRepartition,
  eleves: Eleve[],
  chauffeurs: Chauffeur[],
  voyageId: string,
  nouveauPourcentage: number,
  emplacementsVerrouilles: Set<string> | string[] = new Set()
): ResultatAjustementPourcentage => {
  const setVerrouilles = new Set(emplacementsVerrouilles);
  const chauffeursMap = new Map(chauffeurs.map((c) => [c.id, c]));

  // Identifier les chauffeurs actifs pour ce voyage (ceux non 'SANS')
  const chauffeursActifs = chauffeurs.filter((c) => !estVoyageSans(c, voyageId));
  const placesMobilisees = chauffeursActifs.reduce((sum, c) => sum + (c.places || 0), 0);

  if (placesMobilisees === 0) {
    return {
      nouveauResultat: resultatActuel,
      delta: 0,
      effectue: 0,
      message: `Aucun transport actif disponible pour le voyage ${voyageId}.`,
    };
  }

  // Taux cible entre 0% et 100%
  const ciblePourcentageBorne = Math.max(0, Math.min(100, Math.round(nouveauPourcentage)));
  const elevesCibles = Math.min(
    placesMobilisees,
    Math.max(0, Math.round((placesMobilisees * ciblePourcentageBorne) / 100))
  );

  let affectationsCourantes = [...resultatActuel.affectations];
  const affsVoyage = affectationsCourantes.filter((a) => a.voyageId === voyageId);
  const actuelTotal = affsVoyage.length;
  const delta = elevesCibles - actuelTotal;

  if (delta === 0) {
    return {
      nouveauResultat: resultatActuel,
      delta: 0,
      effectue: 0,
      message: `Le voyage ${voyageId} est déjà calé sur ${ciblePourcentageBorne}% (${actuelTotal} élèves).`,
    };
  }

  const isMatin = voyageId === 'MATIN_1' || voyageId === 'MATIN_2';
  let effectue = 0;

  if (delta < 0) {
    // -------------------------------------------------------------
    // RÉDUCTION DU NOMBRE D'ÉLÈVES SUR CE VOYAGE (delta < 0)
    // -------------------------------------------------------------
    const aRetirer = Math.abs(delta);

    // Calcul de l'occupation actuelle par chauffeur sur ce voyage
    const occupationParChauffeur = new Map<string, number>();
    affsVoyage.forEach((a) => {
      occupationParChauffeur.set(a.chauffeurId, (occupationParChauffeur.get(a.chauffeurId) || 0) + 1);
    });

    // Score de continuité : préserver en priorité absolue les élèves ayant le même chauffeur
    const getScoreContinuite = (aff: AffectationEleve): number => {
      if (isMatin) {
        const affAprem = affectationsCourantes.find(
          (a) => a.eleveId === aff.eleveId && (a.voyageId === 'APRES_MIDI_15H15' || a.voyageId === 'APRES_MIDI_16H00')
        );
        if (affAprem && affAprem.chauffeurId === aff.chauffeurId) return 10;
        if (affAprem) return 4;
        return 0;
      } else {
        const affMatin = affectationsCourantes.find(
          (a) => a.eleveId === aff.eleveId && (a.voyageId === 'MATIN_1' || a.voyageId === 'MATIN_2')
        );
        if (affMatin && affMatin.chauffeurId === aff.chauffeurId) return 10;
        if (affMatin) return 4;
        return 0;
      }
    };

    // Candidats au retrait (hors emplacements verrouillés)
    const candidatsRetrait = affsVoyage.filter((aff) => {
      const lockKey = `${aff.chauffeurId}_${voyageId}`;
      return !setVerrouilles.has(lockKey);
    });

    // Trier les candidats au retrait :
    // 1. Faible score de continuité en premier (supprimer les élèves sans continuité d'abord)
    // 2. Chauffeur avec le taux de remplissage le plus élevé en premier (pour équilibrer la flotte)
    candidatsRetrait.sort((a, b) => {
      const scoreA = getScoreContinuite(a);
      const scoreB = getScoreContinuite(b);
      if (scoreA !== scoreB) return scoreA - scoreB;

      const occA = occupationParChauffeur.get(a.chauffeurId) || 0;
      const occB = occupationParChauffeur.get(b.chauffeurId) || 0;
      const chA = chauffeursMap.get(a.chauffeurId);
      const chB = chauffeursMap.get(b.chauffeurId);
      const tauxA = chA && chA.places > 0 ? occA / chA.places : 0;
      const tauxB = chB && chB.places > 0 ? occB / chB.places : 0;
      return tauxB - tauxA;
    });

    const elevesIdsARetirer = new Set(
      candidatsRetrait.slice(0, aRetirer).map((a) => a.eleveId)
    );

    effectue = elevesIdsARetirer.size;
    affectationsCourantes = affectationsCourantes.filter(
      (a) => !(a.voyageId === voyageId && elevesIdsARetirer.has(a.eleveId))
    );
  } else {
    // -------------------------------------------------------------
    // AUGMENTATION DU NOMBRE D'ÉLÈVES SUR CE VOYAGE (delta > 0)
    // -------------------------------------------------------------
    let aAjouter = delta;

    // Déterminer les élèves qui sont déjà sur ce voyage
    const elevesSurCeVoyage = new Set(affsVoyage.map((a) => a.eleveId));

    // Si matin : élèves déjà pris sur l'autre voyage matin
    const autreVoyageMatin = voyageId === 'MATIN_1' ? 'MATIN_2' : 'MATIN_1';
    const elevesSurAutreMatin = new Set(
      isMatin
        ? affectationsCourantes.filter((a) => a.voyageId === autreVoyageMatin).map((a) => a.eleveId)
        : []
    );

    // Niveau ciblé pour l'après-midi
    const niveauRequis =
      voyageId === 'APRES_MIDI_15H15' ? 1 : voyageId === 'APRES_MIDI_16H00' ? 2 : null;

    // Capacité courante par chauffeur sur ce voyage
    const placesOccupees = new Map<string, number>();
    affsVoyage.forEach((a) => {
      placesOccupees.set(a.chauffeurId, (placesOccupees.get(a.chauffeurId) || 0) + 1);
    });

    // Liste des candidats éligibles
    const candidats = eleves.filter((e) => {
      if (elevesSurCeVoyage.has(e.id)) return false;
      if (isMatin && elevesSurAutreMatin.has(e.id)) return false;
      if (niveauRequis !== null && e.niveau !== niveauRequis) return false;
      return true;
    });

    // Trier les candidats pour privilégier ceux qui ont un chauffeur sur l'autre demi-journée
    candidats.sort((a, b) => {
      const affA = affectationsCourantes.find((x) => x.eleveId === a.id);
      const affB = affectationsCourantes.find((x) => x.eleveId === b.id);
      const aHas = affA ? 1 : 0;
      const bHas = affB ? 1 : 0;
      return bHas - aHas;
    });

    for (const eleve of candidats) {
      if (aAjouter <= 0) break;

      // Chauffeur déjà affecté sur l'autre voyage (priorité absolue continuité)
      const affAutre = affectationsCourantes.find(
        (x) =>
          x.eleveId === eleve.id &&
          (isMatin
            ? x.voyageId === 'APRES_MIDI_15H15' || x.voyageId === 'APRES_MIDI_16H00'
            : x.voyageId === 'MATIN_1' || x.voyageId === 'MATIN_2')
      );
      const chPrefereId = affAutre?.chauffeurId;

      // Chauffeurs actifs pouvant accueillir cet élève
      const chauffeursEligibles = chauffeursActifs.filter((c) => {
        const lockKey = `${c.id}_${voyageId}`;
        if (setVerrouilles.has(lockKey)) return false;

        const occ = placesOccupees.get(c.id) || 0;
        if (occ >= c.places) return false;

        if (!chauffeurDessertZonePourVoyage(c, eleve.zone, voyageId)) return false;

        const config = getConfigVoyage(c, voyageId);
        const niveaux = extraireNiveaux(config);
        if (isMatin && !niveaux.includes(eleve.niveau)) return false;

        return true;
      });

      if (chauffeursEligibles.length === 0) continue;

      // Trier les chauffeurs :
      // 1. Chauffeur de continuité en premier
      // 2. Chauffeur avec le plus de places disponibles restantes
      chauffeursEligibles.sort((a, b) => {
        if (chPrefereId) {
          const aIsPref = a.id === chPrefereId ? 100 : 0;
          const bIsPref = b.id === chPrefereId ? 100 : 0;
          if (aIsPref !== bIsPref) return bIsPref - aIsPref;
        }

        const occA = placesOccupees.get(a.id) || 0;
        const occB = placesOccupees.get(b.id) || 0;
        const remA = a.places - occA;
        const remB = b.places - occB;
        return remB - remA;
      });

      const chauffeurChoisi = chauffeursEligibles[0];
      affectationsCourantes.push({
        eleveId: eleve.id,
        chauffeurId: chauffeurChoisi.id,
        voyageId,
      });

      placesOccupees.set(chauffeurChoisi.id, (placesOccupees.get(chauffeurChoisi.id) || 0) + 1);
      aAjouter--;
      effectue++;
    }
  }

  // Post-optimisation de continuité après ajustement
  const affectationsOptimisees = optimiserContinuiteMatinApresMidi(
    affectationsCourantes,
    eleves,
    chauffeurs,
    setVerrouilles
  );

  const nouveauResultat = construireResultatDepuisAffectations(
    eleves,
    chauffeurs,
    affectationsOptimisees
  );

  const libelleVoyage = VOYAGES.find((v) => v.id === voyageId)?.libelle || voyageId;
  const nouveauTotal = nouveauResultat.parVoyage[voyageId]?.totalEleves || 0;
  const nouveauTaux = Math.round((nouveauTotal / (placesMobilisees || 1)) * 100);

  return {
    nouveauResultat,
    delta,
    effectue,
    message: `✓ Voyage ${libelleVoyage} : ajusté à ${nouveauTaux}% (${nouveauTotal} élèves sur ${placesMobilisees} places mobilisées).`,
  };
};

export const ajusterTousPourcentagesVoyages = (
  resultatActuel: ResultatRepartition,
  eleves: Eleve[],
  chauffeurs: Chauffeur[],
  pourcentagesCibles: Record<string, number>,
  emplacementsVerrouilles: Set<string> | string[] = new Set()
): ResultatRepartition => {
  let res = resultatActuel;
  for (const v of VOYAGES) {
    const cible = pourcentagesCibles[v.id];
    if (typeof cible === 'number') {
      const ajust = ajusterPourcentageVoyage(
        res,
        eleves,
        chauffeurs,
        v.id,
        cible,
        emplacementsVerrouilles
      );
      res = ajust.nouveauResultat;
    }
  }
  return res;
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

              // Filtrer uniquement les élèves que le receveur a le droit de prendre (selon ses zones sur ce voyage)
              const affsCompatibles = affsDonateur.filter((a) => {
                const el = eleves.find((e) => e.id === a.eleveId);
                return el && chauffeurDessertZonePourVoyage(receveur.chauffeur, el.zone, voyageId);
              });

              const aDeplacer = affsCompatibles.slice(-transfertPossible);
              if (aDeplacer.length === 0) return;
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

              donateur.nb -= aDeplacer.length;
              receveur.nb += aDeplacer.length;
              receveur.dispo -= aDeplacer.length;
              totalDeplaces += aDeplacer.length;
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
// AJUSTEMENT ANTI-GASPILLAGE CARBURANT : SEUIL > 60% OU 0
// ============================================================

export interface TransportAjustementSeuil60 {
  chauffeurId: string;
  chauffeurNom: string;
  voyageId: string;
  voyageLibelle: string;
  placesTotales: number;
  placesUtilisees: number;
  tauxPct: number;
}

export interface TransportMisAZeroSeuil60 {
  chauffeurId: string;
  chauffeurNom: string;
  voyageId: string;
  voyageLibelle: string;
  anciensEleves: number;
  placesTotales: number;
  ancienTauxPct: number;
  elevesReassignes: number;
  elevesNonPlaces: number;
}

export interface BilanAjustementSeuil60 {
  transportsAuDessus60: TransportAjustementSeuil60[];
  transportsMisAZero: TransportMisAZeroSeuil60[];
  totalTransportsTraites: number;
  totalTransportsAuDessus60: number;
  totalRotationsEvitees: number;
  totalElevesReassignes: number;
  totalElevesNonPlaces: number;
  economieCarburantEstimeeLitres: number;
  economieCO2Kg: number;
}

/**
 * Ajuste les affectations pour que TOUT voyage d'un chauffeur sans la mention "SANS"
 * atteigne un remplissage de plus de 60%, sinon le mette à 0 pour éviter de faire
 * rouler un transport quasiment vide et gaspiller du carburant.
 */
export const ajusterRemplissageSeuil60OuZero = (
  resultatActuel: ResultatRepartition,
  eleves: Eleve[],
  chauffeurs: Chauffeur[],
  emplacementsVerrouilles: Set<string> | string[] = new Set(),
  chauffeursVerrouilles: Set<string> | string[] = new Set(),
  options?: {
    seuilRatio?: number; // 0.60 par défaut
    strictementSuperieur?: boolean; // true par défaut (> 60%)
  }
): {
  nouveauResultat: ResultatRepartition;
  bilan: BilanAjustementSeuil60;
} => {
  const seuil = options?.seuilRatio ?? 0.60;
  const strict = options?.strictementSuperieur ?? true;
  const setChauffeurs = new Set(chauffeursVerrouilles);
  const setEmplacements = new Set(emplacementsVerrouilles);

  const chauffeursMap = new Map(chauffeurs.map((c) => [c.id, c]));
  const elevesMap = new Map(eleves.map((e) => [e.id, e]));

  let affectationsCourantes = [...resultatActuel.affectations];

  const transportsAuDessus60: TransportAjustementSeuil60[] = [];
  const transportsMisAZero: TransportMisAZeroSeuil60[] = [];
  let totalElevesReassignes = 0;
  let totalElevesNonPlaces = 0;

  const testSatisfaitSeuil = (placesOccupees: number, placesTotales: number): boolean => {
    if (placesTotales <= 0 || placesOccupees <= 0) return false;
    const ratio = placesOccupees / placesTotales;
    return strict ? ratio > seuil : ratio >= seuil;
  };

  VOYAGES.forEach((voyage) => {
    const voyageId = voyage.id;

    // 1. Filtrer les chauffeurs actifs pour ce voyage (SANS la mention "SANS" et non verrouillés)
    const chauffeursActifs = chauffeurs.filter((c) => {
      if (estVoyageSans(c, voyageId)) return false;
      if (estEmplacementVerrouille(c.id, voyageId, setChauffeurs, setEmplacements)) return false;
      return true;
    });

    if (chauffeursActifs.length === 0) return;

    const getPlacesChauffeur = (chId: string) =>
      affectationsCourantes.filter((a) => a.chauffeurId === chId && a.voyageId === voyageId).length;

    // Identifier les élèves disponibles pour ce voyage (non encore assignés sur ce créneau)
    const elevesDejaAssignesMatin = new Set(
      affectationsCourantes.filter((a) => a.voyageId === 'MATIN_1' || a.voyageId === 'MATIN_2').map((a) => a.eleveId)
    );
    const elevesDejaAssignesApresMidi = new Set(
      affectationsCourantes.filter((a) => a.voyageId === 'APRES_MIDI_15H15' || a.voyageId === 'APRES_MIDI_16H00').map((a) => a.eleveId)
    );

    let nonAssignesVoyage = eleves.filter((e) => {
      if (voyageId === 'MATIN_1' || voyageId === 'MATIN_2') {
        return !elevesDejaAssignesMatin.has(e.id);
      }
      if (voyageId === 'APRES_MIDI_15H15') {
        return e.niveau === 1 && !elevesDejaAssignesApresMidi.has(e.id);
      }
      if (voyageId === 'APRES_MIDI_16H00') {
        return e.niveau === 2 && !elevesDejaAssignesApresMidi.has(e.id);
      }
      return false;
    });

    // ÉTAPE A : Élever les chauffeurs proches de > 60% avec des élèves non assignés compatibles
    chauffeursActifs.forEach((c) => {
      let nbOcc = getPlacesChauffeur(c.id);
      if (nbOcc > 0 && !testSatisfaitSeuil(nbOcc, c.places)) {
        const placesCible = Math.ceil(c.places * (strict ? (seuil + 0.001) : seuil));
        const besoin = placesCible - nbOcc;
        if (besoin > 0 && besoin <= (c.places - nbOcc)) {
          const compatibles = nonAssignesVoyage.filter((el) =>
            chauffeurPeutTransporterEleve(c, el, voyageId)
          );
          if (compatibles.length >= besoin) {
            const ajouts = compatibles.slice(0, besoin);
            ajouts.forEach((el) => {
              affectationsCourantes.push({
                eleveId: el.id,
                chauffeurId: c.id,
                voyageId,
              });
              totalElevesReassignes++;
            });
            const idsAjoutes = new Set(ajouts.map((el) => el.id));
            nonAssignesVoyage = nonAssignesVoyage.filter((el) => !idsAjoutes.has(el.id));
          }
        }
      }
    });

    // ÉTAPE B : Consolidation inter-chauffeurs au sein de la zone
    // Transférer des élèves vers les chauffeurs qui peuvent dépasser 60%
    const chauffeursSousSeuil = chauffeursActifs.filter((c) => {
      const nb = getPlacesChauffeur(c.id);
      return nb > 0 && !testSatisfaitSeuil(nb, c.places);
    });
    chauffeursSousSeuil.sort((a, b) => getPlacesChauffeur(b.id) - getPlacesChauffeur(a.id));

    chauffeursSousSeuil.forEach((chReceveur) => {
      let nbReceveur = getPlacesChauffeur(chReceveur.id);
      if (testSatisfaitSeuil(nbReceveur, chReceveur.places)) return;

      const nbCible = Math.ceil(chReceveur.places * (strict ? (seuil + 0.001) : seuil));
      const besoin = nbCible - nbReceveur;
      if (besoin <= 0 || (chReceveur.places - nbReceveur) < besoin) return;

      for (const chDonateur of chauffeursActifs) {
        if (chDonateur.id === chReceveur.id) continue;
        const nbDonateur = getPlacesChauffeur(chDonateur.id);
        const margeDonateur = testSatisfaitSeuil(nbDonateur, chDonateur.places)
          ? nbDonateur - Math.ceil(chDonateur.places * (strict ? (seuil + 0.001) : seuil))
          : nbDonateur;

        if (margeDonateur <= 0) continue;

        const affsDonateur = affectationsCourantes.filter(
          (a) => a.chauffeurId === chDonateur.id && a.voyageId === voyageId
        );
        const compatibles = affsDonateur.filter((a) => {
          const el = elevesMap.get(a.eleveId);
          return el && chauffeurPeutTransporterEleve(chReceveur, el, voyageId);
        });

        const transfertPossible = Math.min(besoin, margeDonateur, compatibles.length);
        if (transfertPossible > 0) {
          const aTransferer = compatibles.slice(0, transfertPossible);
          const idsTransferes = new Set(aTransferer.map((a) => a.eleveId));

          affectationsCourantes = affectationsCourantes.map((aff) => {
            if (aff.voyageId === voyageId && aff.chauffeurId === chDonateur.id && idsTransferes.has(aff.eleveId)) {
              return { ...aff, chauffeurId: chReceveur.id };
            }
            return aff;
          });

          totalElevesReassignes += transfertPossible;
          nbReceveur += transfertPossible;
          if (testSatisfaitSeuil(nbReceveur, chReceveur.places)) break;
        }
      }
    });

    // ÉTAPE C : APPLICATION STRICTE DU SEUIL > 60% OU 0
    // Pour chaque chauffeur sans mention "SANS" :
    // - S'il est > 60% : maintenu et comptabilisé
    // - S'il est à 0 : pas de gaspillage
    // - S'il est entre 1 et <= 60% : le mettre à 0 (réaffecter ses élèves aux autres bus compatibles ou les libérer)
    chauffeursActifs.forEach((ch) => {
      const placesOccupees = getPlacesChauffeur(ch.id);

      if (placesOccupees === 0) {
        return; // Déjà à 0, ne consomme pas de carburant
      }

      if (testSatisfaitSeuil(placesOccupees, ch.places)) {
        transportsAuDessus60.push({
          chauffeurId: ch.id,
          chauffeurNom: ch.nom,
          voyageId,
          voyageLibelle: voyage.libelle,
          placesTotales: ch.places,
          placesUtilisees: placesOccupees,
          tauxPct: Math.round((placesOccupees / ch.places) * 100),
        });
        return;
      }

      // Le transport est sous le seuil de 60% : on le met à 0
      const affsChauffeur = affectationsCourantes.filter(
        (a) => a.chauffeurId === ch.id && a.voyageId === voyageId
      );
      const nbAnciens = affsChauffeur.length;
      const ancienTaux = Math.round((nbAnciens / ch.places) * 100);

      let nbReassignes = 0;
      let nbNonPlaces = 0;

      affsChauffeur.forEach((aff) => {
        const el = elevesMap.get(aff.eleveId);
        let assigneAutre = false;

        if (el) {
          // Chercher un autre chauffeur actif ayant de la place disponible
          const autresCandidats = chauffeursActifs
            .filter((autre) => autre.id !== ch.id)
            .sort((a, b) => getPlacesChauffeur(b.id) - getPlacesChauffeur(a.id));

          for (const autre of autresCandidats) {
            const occAutre = getPlacesChauffeur(autre.id);
            if (occAutre < autre.places && chauffeurPeutTransporterEleve(autre, el, voyageId)) {
              affectationsCourantes = affectationsCourantes.map((a) =>
                a.eleveId === el.id && a.voyageId === voyageId
                  ? { ...a, chauffeurId: autre.id }
                  : a
              );
              nbReassignes++;
              totalElevesReassignes++;
              assigneAutre = true;
              break;
            }
          }
        }

        if (!assigneAutre) {
          // Retirer l'affectation sur ce voyage pour ramener le transport à 0
          affectationsCourantes = affectationsCourantes.filter(
            (a) => !(a.eleveId === aff.eleveId && a.voyageId === voyageId)
          );
          nbNonPlaces++;
          totalElevesNonPlaces++;
        }
      });

      transportsMisAZero.push({
        chauffeurId: ch.id,
        chauffeurNom: ch.nom,
        voyageId,
        voyageLibelle: voyage.libelle,
        anciensEleves: nbAnciens,
        placesTotales: ch.places,
        ancienTauxPct: ancienTaux,
        elevesReassignes: nbReassignes,
        elevesNonPlaces: nbNonPlaces,
      });
    });
  });

  const nouveauResultat = construireResultatDepuisAffectations(eleves, chauffeurs, affectationsCourantes);

  // Estimation des économies :
  // 1 rotation évitée = ~14 km évités = ~2.52 L de carburant épargné (base 18L/100km)
  // Facteur d'émission CO2 diesel : 2.67 kg CO2 / L
  const totalRotationsEvitees = transportsMisAZero.length;
  const economieCarburantEstimeeLitres = Math.round(totalRotationsEvitees * 2.52 * 10) / 10;
  const economieCO2Kg = Math.round(economieCarburantEstimeeLitres * 2.67 * 10) / 10;

  const bilan: BilanAjustementSeuil60 = {
    transportsAuDessus60,
    transportsMisAZero,
    totalTransportsTraites: transportsAuDessus60.length + transportsMisAZero.length,
    totalTransportsAuDessus60: transportsAuDessus60.length,
    totalRotationsEvitees,
    totalElevesReassignes,
    totalElevesNonPlaces,
    economieCarburantEstimeeLitres,
    economieCO2Kg,
  };

  return { nouveauResultat, bilan };
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
