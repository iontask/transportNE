import { Eleve, Chauffeur, ResultatRepartition } from '../types';

export interface ConfigurationTransportJSON {
  version: string;
  nomApplication: string;
  dateExport: string;
  description?: string;
  statistiques?: {
    totalEleves: number;
    totalChauffeurs: number;
    totalPlaces: number;
    repartitionCalculee: boolean;
    nombreChauffeursVerrouilles: number;
    nombreEmplacementsVerrouilles: number;
  };
  eleves: Eleve[];
  chauffeurs: Chauffeur[];
  resultat?: ResultatRepartition | null;
  chauffeursVerrouilles?: string[];
  emplacementsVerrouilles?: string[];
}

export interface ValidationJSONResult {
  valide: boolean;
  erreurs: string[];
  avertissements: string[];
  data?: ConfigurationTransportJSON;
}

/**
 * Exporter la configuration actuelle de l'application au format JSON
 */
export const exporterConfigurationJSON = (
  eleves: Eleve[],
  chauffeurs: Chauffeur[],
  resultat?: ResultatRepartition | null,
  chauffeursVerrouilles: Set<string> | string[] = new Set(),
  emplacementsVerrouilles: Set<string> | string[] = new Set(),
  nomFichierPerso?: string
): void => {
  const totalPlaces = chauffeurs.reduce((acc, c) => acc + (Number(c.places) || 0), 0);
  const arrChauffeursVerrouilles = Array.from(chauffeursVerrouilles);
  const arrEmplacementsVerrouilles = Array.from(emplacementsVerrouilles);

  const config: ConfigurationTransportJSON = {
    version: '1.0',
    nomApplication: 'Transport Scolaire - AIN SEBAA',
    dateExport: new Date().toISOString(),
    description: 'Sauvegarde complète de la configuration : élèves, chauffeurs, verrous et répartition',
    statistiques: {
      totalEleves: eleves.length,
      totalChauffeurs: chauffeurs.length,
      totalPlaces,
      repartitionCalculee: Boolean(resultat),
      nombreChauffeursVerrouilles: arrChauffeursVerrouilles.length,
      nombreEmplacementsVerrouilles: arrEmplacementsVerrouilles.length,
    },
    eleves,
    chauffeurs,
    resultat: resultat || null,
    chauffeursVerrouilles: arrChauffeursVerrouilles,
    emplacementsVerrouilles: arrEmplacementsVerrouilles,
  };

  const jsonString = JSON.stringify(config, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const dateFormatee = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = nomFichierPerso || `configuration_transport_ain_sebaa_${dateFormatee}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Télécharger le modèle de configuration JSON prêt à l'emploi
 */
export const telechargerModeleConfigurationJSON = (): void => {
  const modele: ConfigurationTransportJSON = {
    version: '1.0',
    nomApplication: 'Transport Scolaire - AIN SEBAA',
    dateExport: new Date().toISOString(),
    description: 'Modèle de données JSON d\'exemple pour importer vos élèves, chauffeurs et contraintes',
    statistiques: {
      totalEleves: 6,
      totalChauffeurs: 3,
      totalPlaces: 60,
      repartitionCalculee: false,
      nombreChauffeursVerrouilles: 0,
      nombreEmplacementsVerrouilles: 1,
    },
    eleves: [
      {
        id: 'eleve-001',
        nom: 'العلمي',
        prenom: 'يوسف',
        niveau: 1,
        zone: 'Ain Sebaa',
      },
      {
        id: 'eleve-002',
        nom: 'بنسودة',
        prenom: 'فاطمة الزهراء',
        niveau: 2,
        zone: 'Ain Sebaa',
      },
      {
        id: 'eleve-003',
        nom: 'التازي',
        prenom: 'أمين',
        niveau: 1,
        zone: 'Sidi Bernoussi',
      },
      {
        id: 'eleve-004',
        nom: 'الإدريسي',
        prenom: 'مريم',
        niveau: 2,
        zone: 'Sidi Bernoussi',
      },
      {
        id: 'eleve-005',
        nom: 'العلوي',
        prenom: 'حمزة',
        niveau: 1,
        zone: 'Roches Noires',
      },
      {
        id: 'eleve-006',
        nom: 'الصنهاجي',
        prenom: 'سلمى',
        niveau: 2,
        zone: 'Roches Noires',
      },
    ],
    chauffeurs: [
      {
        id: 'ch-001',
        nom: 'Chauffeur 1 - Hassan',
        places: 20,
        zone: 'Ain Sebaa',
        voyageMatin1: 'N1 ET N2',
        voyageMatin2: 'N1 ET N2',
        voyageApresMidi15h15: 'N1',
        voyageApresMidi16h00: 'N2',
      },
      {
        id: 'ch-002',
        nom: 'Chauffeur 2 - Mohammed',
        places: 20,
        zone: 'Sidi Bernoussi',
        voyageMatin1: 'N1 ET N2',
        voyageMatin2: 'N1 ET N2',
        voyageApresMidi15h15: 'N1',
        voyageApresMidi16h00: 'N2',
      },
      {
        id: 'ch-003',
        nom: 'Chauffeur 3 - Abdellah',
        places: 20,
        zone: 'Roches Noires',
        voyageMatin1: 'N1 ET N2',
        voyageMatin2: 'N1 ET N2',
        voyageApresMidi15h15: 'N1',
        voyageApresMidi16h00: 'N2',
      },
    ],
    resultat: null,
    chauffeursVerrouilles: [],
    emplacementsVerrouilles: ['ch-001_MATIN_2'],
  };

  const jsonString = JSON.stringify(modele, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'modele_configuration_transport_ain_sebaa.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Valider le contenu d'un fichier JSON de configuration importé
 */
export const validerConfigurationJSON = (contenuTexte: string): ValidationJSONResult => {
  const erreurs: string[] = [];
  const avertissements: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(contenuTexte);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      valide: false,
      erreurs: [`Fichier JSON invalide ou syntaxe incorrecte : ${msg}`],
      avertissements: [],
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      valide: false,
      erreurs: ['Le document JSON racine doit être un objet contenant les clés "eleves" et "chauffeurs".'],
      avertissements: [],
    };
  }

  const obj = parsed as Record<string, unknown>;

  // Vérifier la présence des élèves
  if (!('eleves' in obj) || !Array.isArray(obj.eleves)) {
    erreurs.push('La clé "eleves" est manquante ou n\'est pas un tableau.');
  }

  // Vérifier la présence des chauffeurs
  if (!('chauffeurs' in obj) || !Array.isArray(obj.chauffeurs)) {
    erreurs.push('La clé "chauffeurs" est manquante ou n\'est pas un tableau.');
  }

  if (erreurs.length > 0) {
    return { valide: false, erreurs, avertissements };
  }

  // Valider les élèves
  const elevesRaw = obj.eleves as unknown[];
  const elevesValides: Eleve[] = [];
  elevesRaw.forEach((el, idx) => {
    if (typeof el !== 'object' || el === null) {
      erreurs.push(`Élève à la position ${idx + 1} est invalide.`);
      return;
    }
    const e = el as Record<string, unknown>;
    const nom = String(e.nom || '').trim();
    const prenom = String(e.prenom || '').trim();
    const zone = String(e.zone || '').trim();
    const niveauNum = Number(e.niveau);

    if (!nom) {
      erreurs.push(`Élève N°${idx + 1} n'a pas de nom (champ "nom" obligatoire).`);
    }
    if (!zone) {
      avertissements.push(`Élève ${nom || `N°${idx + 1}`} n'a pas de zone définie (attribué à "Ain Sebaa" par défaut).`);
    }

    elevesValides.push({
      id: String(e.id || `el-${Date.now()}-${idx}`),
      nom: nom || 'Nom inconnu',
      prenom: prenom,
      niveau: niveauNum === 1 || niveauNum === 2 ? (niveauNum as 1 | 2) : 1,
      zone: zone || 'Ain Sebaa',
    });
  });

  // Valider les chauffeurs
  const chauffeursRaw = obj.chauffeurs as unknown[];
  const chauffeursValides: Chauffeur[] = [];
  chauffeursRaw.forEach((ch, idx) => {
    if (typeof ch !== 'object' || ch === null) {
      erreurs.push(`Chauffeur à la position ${idx + 1} est invalide.`);
      return;
    }
    const c = ch as Record<string, unknown>;
    const nom = String(c.nom || '').trim();
    const zone = String(c.zone || '').trim();
    const places = Number(c.places);

    if (!nom) {
      erreurs.push(`Chauffeur N°${idx + 1} n'a pas de nom.`);
    }
    if (isNaN(places) || places <= 0) {
      erreurs.push(`Chauffeur "${nom || idx + 1}" doit avoir un nombre de places supérieur à 0.`);
    }

    chauffeursValides.push({
      id: String(c.id || `ch-${Date.now()}-${idx}`),
      nom: nom || `Chauffeur ${idx + 1}`,
      places: isNaN(places) || places <= 0 ? 20 : places,
      zone: zone || 'Ain Sebaa',
      voyageMatin1: String(c.voyageMatin1 || 'N1 ET N2'),
      voyageMatin2: String(c.voyageMatin2 || 'N1 ET N2'),
      voyageApresMidi15h15: String(c.voyageApresMidi15h15 || 'N1'),
      voyageApresMidi16h00: String(c.voyageApresMidi16h00 || 'N2'),
    });
  });

  // Chauffeurs et créneaux verrouillés optionnels
  const chauffeursVerrouilles: string[] = Array.isArray(obj.chauffeursVerrouilles)
    ? (obj.chauffeursVerrouilles as string[]).map(String)
    : [];

  const emplacementsVerrouilles: string[] = Array.isArray(obj.emplacementsVerrouilles)
    ? (obj.emplacementsVerrouilles as string[]).map(String)
    : [];

  const data: ConfigurationTransportJSON = {
    version: String(obj.version || '1.0'),
    nomApplication: String(obj.nomApplication || 'Transport Scolaire - AIN SEBAA'),
    dateExport: String(obj.dateExport || new Date().toISOString()),
    description: obj.description ? String(obj.description) : undefined,
    eleves: elevesValides,
    chauffeurs: chauffeursValides,
    resultat: obj.resultat as ResultatRepartition | null | undefined,
    chauffeursVerrouilles,
    emplacementsVerrouilles,
  };

  return {
    valide: erreurs.length === 0,
    erreurs,
    avertissements,
    data: erreurs.length === 0 ? data : undefined,
  };
};
