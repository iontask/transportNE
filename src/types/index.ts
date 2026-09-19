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
  zone: string;             // ZONE
  places: number;           // PLACES (22, 26, 32)
  voyageMatin1: OptionVoyageChauffeur | string;     // 'N1', 'N2', 'N1 ET N2', 'SANS', etc.
  voyageMatin2: OptionVoyageChauffeur | string;     // 'N1', 'N2', 'N1 ET N2', 'N1 AIN SEBAA ET N2 AIN SEBAA', etc.
  voyageApresMidi15h15: OptionVoyageChauffeur | string; // 'N1', 'N2', 'N1 AIN SEBAA', 'SANS', etc.
  voyageApresMidi16h00: OptionVoyageChauffeur | string; // 'N1', 'N2', 'SANS', etc.
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
  type: 'SURCHARGE' | 'SOUS_UTILISATION' | 'NON_AFFECTE' | 'DEFICIT_ZONE';
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
  };
}
