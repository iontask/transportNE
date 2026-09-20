// Élève
export interface Eleve {
  id: string;
  nom: string;        // النسب (nom de famille en arabe)
  prenom: string;     // الإسم (prénom en arabe)
  niveau: 1 | 2;
  zone: string;       // ain sebaa, bernoussi, hay mohemmadi, sidi moumen, azhar, anassi, etc.
}

// Options autorisées pour les voyages des chauffeurs
export const OPTIONS_VOYAGE_CHAUFFEUR = [
  'N1',
  'N2',
  'N1 AIN SEBAA',
  'N2 AIN SEBAA',
  'SANS',
  'N1 ET N2',
  'N1 AIN SEBAA ET N2 AIN SEBAA',
] as const;

export type OptionVoyageChauffeur = (typeof OPTIONS_VOYAGE_CHAUFFEUR)[number];

// Chauffeur
export interface Chauffeur {
  id: string;
  nom: string;              // CHAUFFEUR
  zone: string;             // ZONE (libellé principal ou chaîne de zones séparées par virgules)
  zones?: string[];         // Liste des zones par défaut pour ce chauffeur
  places: number;           // PLACES (22, 26, 32)
  voyageMatin1: OptionVoyageChauffeur | string;     // 'N1', 'N2', 'N1 ET N2', 'SANS', etc.
  voyageMatin2: OptionVoyageChauffeur | string;     // 'N1', 'N2', 'N1 ET N2', 'N1 AIN SEBAA ET N2 AIN SEBAA', etc.
  voyageApresMidi15h15: OptionVoyageChauffeur | string; // 'N1', 'N2', 'N1 AIN SEBAA', 'SANS', etc.
  voyageApresMidi16h00: OptionVoyageChauffeur | string; // 'N1', 'N2', 'SANS', etc.

  // ZONES PAR VOYAGE : un voyage peut avoir 1 ou plusieurs zones
  zonesVoyageMatin1?: string[];
  zonesVoyageMatin2?: string[];
  zonesVoyageApresMidi15h15?: string[];
  zonesVoyageApresMidi16h00?: string[];
  zonesParVoyage?: Record<string, string[]>;

  // ZONE ORIGINALE DU CHAUFFEUR ET PAR VOYAGE
  zoneOriginale?: string;                       // Zone d'origine principale du chauffeur
  zoneOriginaleVoyageMatin1?: string;           // Zone originale spécifique au Matin 1
  zoneOriginaleVoyageMatin2?: string;           // Zone originale spécifique au Matin 2
  zoneOriginaleVoyageApresMidi15h15?: string;   // Zone originale spécifique au 15h15
  zoneOriginaleVoyageApresMidi16h00?: string;   // Zone originale spécifique au 16h00
  zonesOriginalesParVoyage?: Record<string, string>; // Dictionnaire clé/ID -> zone originale
}

// Zone
export interface Zone {
  id: string;
  nom: string;        // 'ain sebaa', 'bernoussi', etc.
  libelle: string;    // 'AIN SEBAA', 'BERNOUSSI', etc.
}

// Statistiques
export interface Statistiques {
  totalEleves: number;
  totalChauffeurs: number;
  totalPlaces: number;
  elevesParZone: Record<string, number>;
  elevesParNiveau: Record<number, number>;
  elevesParZoneEtNiveau: Record<string, { niveau1: number; niveau2: number }>;
  chauffeursParZone: Record<string, number>;
  placesParZone: Record<string, number>;
}

// Résultat d'import
export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  warnings: string[];
}

// Affectation élémentaire
export interface AffectationEleve {
  eleveId: string;
  chauffeurId: string;
  voyageId: string;
}

// Alerte
export interface Alerte {
  type: 'SURCHARGE' | 'SOUS_UTILISATION' | 'NON_AFFECTE' | 'DEFICIT_ZONE' | 'ZONE_SANS_CHAUFFEUR' | 'CONTINUITE_CHAUFFEUR';
  message: string;
  severite: 'ERROR' | 'WARNING' | 'INFO';
  details?: any;
}

// Résultat de répartition
export interface ResultatRepartition {
  affectations: AffectationEleve[];
  parChauffeur: Record<string, {
    chauffeur: Chauffeur;
    voyages: Record<string, {
      voyageId: string;
      eleves: Eleve[];
      placesUtilisees: number;
      placesTotales: number;
      tauxRemplissage: number;
    }>;
    totalEleves: number;
    totalPlaces: number;
    tauxGlobal: number;
  }>;
  parVoyage: Record<string, {
    voyageId: string;
    chauffeurs: Array<{
      chauffeur: Chauffeur;
      eleves: Eleve[];
      placesUtilisees: number;
      placesTotales: number;
    }>;
    totalEleves: number;
    totalPlaces: number;
    nbTransportsUtilises?: number;
    placesTransportsUtilises?: number;
    tauxOptimisation?: number;
    placesMoyenneParTransportUtilise?: number;
  }>;
  statistiques: {
    totalEleves: number;
    totalAffectations: number;
    elevesNonAffectes: Eleve[];
    alertes: Alerte[];
    tauxMemeChauffeurMatinApresMidi?: number;
    nbElevesMemeChauffeur?: number;
    nbElevesChauffeurDifferent?: number;
    nbElevesEligiblesContinuite?: number;
    elevesContinuiteDetails?: Array<{
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
    }>;
  };
}
