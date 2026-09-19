import { Eleve, Chauffeur, Statistiques } from '../types';

export const calculerStatistiques = (
  eleves: Eleve[],
  chauffeurs: Chauffeur[]
): Statistiques => {
  const elevesParZone: Record<string, number> = {};
  const elevesParNiveau: Record<number, number> = { 1: 0, 2: 0 };
  const elevesParZoneEtNiveau: Record<string, { niveau1: number; niveau2: number }> = {};
  const chauffeursParZone: Record<string, number> = {};
  const placesParZone: Record<string, number> = {};

  // Élèves
  eleves.forEach(eleve => {
    // Par zone
    elevesParZone[eleve.zone] = (elevesParZone[eleve.zone] || 0) + 1;

    // Par niveau
    elevesParNiveau[eleve.niveau] = (elevesParNiveau[eleve.niveau] || 0) + 1;

    // Par zone et niveau
    if (!elevesParZoneEtNiveau[eleve.zone]) {
      elevesParZoneEtNiveau[eleve.zone] = { niveau1: 0, niveau2: 0 };
    }
    if (eleve.niveau === 1) {
      elevesParZoneEtNiveau[eleve.zone].niveau1++;
    } else {
      elevesParZoneEtNiveau[eleve.zone].niveau2++;
    }
  });

  // Chauffeurs
  chauffeurs.forEach(chauffeur => {
    chauffeursParZone[chauffeur.zone] = (chauffeursParZone[chauffeur.zone] || 0) + 1;
    placesParZone[chauffeur.zone] = (placesParZone[chauffeur.zone] || 0) + chauffeur.places;
  });

  // Assurer que les zones présentes chez les chauffeurs soient aussi dans elevesParZoneEtNiveau
  Object.keys(placesParZone).forEach(zone => {
    if (!elevesParZoneEtNiveau[zone]) {
      elevesParZoneEtNiveau[zone] = { niveau1: 0, niveau2: 0 };
    }
  });

  return {
    totalEleves: eleves.length,
    totalChauffeurs: chauffeurs.length,
    totalPlaces: chauffeurs.reduce((sum, c) => sum + c.places, 0),
    elevesParZone,
    elevesParNiveau,
    elevesParZoneEtNiveau,
    chauffeursParZone,
    placesParZone,
  };
};

// Détecter les déficits par zone
export const detecterDeficits = (
  stats: Statistiques
): Array<{ zone: string; eleves: number; places: number; deficit: number }> => {
  const deficits: Array<{ zone: string; eleves: number; places: number; deficit: number }> = [];

  // Regrouper toutes les zones uniques (élèves ou chauffeurs)
  const allZones = new Set([
    ...Object.keys(stats.elevesParZone),
    ...Object.keys(stats.placesParZone),
  ]);

  allZones.forEach(zone => {
    const eleves = stats.elevesParZone[zone] || 0;
    const places = stats.placesParZone[zone] || 0;
    const deficit = eleves - places;

    if (deficit > 0) {
      deficits.push({ zone, eleves, places, deficit });
    }
  });

  return deficits.sort((a, b) => b.deficit - a.deficit);
};

// Données d'exemple complètes pour tests rapides
export const getSampleEleves = (): Eleve[] => [
  { id: 'el-1', nom: 'العلمي', prenom: 'يوسف', niveau: 1, zone: 'ain sebaa' },
  { id: 'el-2', nom: 'بناني', prenom: 'فاطمة الزهراء', niveau: 2, zone: 'ain sebaa' },
  { id: 'el-3', nom: 'الإدريسي', prenom: 'أحمد', niveau: 1, zone: 'bernoussi' },
  { id: 'el-4', nom: 'التازي', prenom: 'مريم', niveau: 2, zone: 'bernoussi' },
  { id: 'el-5', nom: 'شقرون', prenom: 'مهدي', niveau: 1, zone: 'hay mohammadi' },
  { id: 'el-6', nom: 'الفاسي', prenom: 'سارة', niveau: 2, zone: 'sidi moumen' },
  { id: 'el-7', nom: 'المرابط', prenom: 'حمزة', niveau: 1, zone: 'azhar' },
  { id: 'el-8', nom: 'الصباحي', prenom: 'سلمى', niveau: 2, zone: 'anassi' },
  { id: 'el-9', nom: 'العلوي', prenom: 'آدم', niveau: 1, zone: 'ain sebaa' },
  { id: 'el-10', nom: 'بوعبيد', prenom: 'هدى', niveau: 2, zone: 'ain sebaa' },
  { id: 'el-11', nom: 'المتوكل', prenom: 'ياسين', niveau: 1, zone: 'ain sebaa' },
  { id: 'el-12', nom: 'الصنهاجي', prenom: 'آية', niveau: 2, zone: 'ain sebaa' },
  { id: 'el-13', nom: 'اليعقوبي', prenom: 'ريان', niveau: 1, zone: 'bernoussi' },
  { id: 'el-14', nom: 'الكتاني', prenom: 'خديجة', niveau: 2, zone: 'bernoussi' },
  { id: 'el-15', nom: 'الوزاني', prenom: 'أنس', niveau: 1, zone: 'hay mohammadi' },
  { id: 'el-16', nom: 'القادري', prenom: 'زينب', niveau: 2, zone: 'sidi moumen' },
  { id: 'el-17', nom: 'برادة', prenom: 'عمر', niveau: 1, zone: 'sidi moumen' },
  { id: 'el-18', nom: 'الشرايبي', prenom: 'ريم', niveau: 2, zone: 'azhar' },
  { id: 'el-19', nom: 'الناصري', prenom: 'كريم', niveau: 1, zone: 'anassi' },
  { id: 'el-20', nom: 'الجباري', prenom: 'هبة', niveau: 2, zone: 'ain sebaa' },
  { id: 'el-21', nom: 'الخياري', prenom: 'سفيان', niveau: 1, zone: 'ain sebaa' },
  { id: 'el-22', nom: 'المنصوري', prenom: 'إيناس', niveau: 2, zone: 'bernoussi' },
  { id: 'el-23', nom: 'السقاط', prenom: 'طارق', niveau: 1, zone: 'hay mohammadi' },
  { id: 'el-24', nom: 'الدرقاوي', prenom: 'ليلى', niveau: 2, zone: 'hay mohammadi' },
  { id: 'el-25', nom: 'الحسني', prenom: 'وليد', niveau: 1, zone: 'sidi moumen' },
  { id: 'el-26', nom: 'الصويري', prenom: 'صفاء', niveau: 2, zone: 'sidi moumen' },
  { id: 'el-27', nom: 'بوزيد', prenom: 'بلال', niveau: 1, zone: 'azhar' },
  { id: 'el-28', nom: 'العراقي', prenom: 'غيثة', niveau: 2, zone: 'azhar' },
];

export const getSampleChauffeurs = (): Chauffeur[] => [
  {
    id: 'ch-1',
    nom: 'Mohamed Alami',
    zone: 'ain sebaa',
    places: 26,
    voyageMatin1: 'N1',
    voyageMatin2: 'N2',
    voyageApresMidi15h15: 'N1 AIN SEBAA',
    voyageApresMidi16h00: 'N2',
  },
  {
    id: 'ch-2',
    nom: 'Hassan Berrada',
    zone: 'ain sebaa',
    places: 32,
    voyageMatin1: 'N1 ET N2',
    voyageMatin2: 'N1 AIN SEBAA ET N2 AIN SEBAA',
    voyageApresMidi15h15: 'N1',
    voyageApresMidi16h00: 'N2',
  },
  {
    id: 'ch-3',
    nom: 'Said Tazi',
    zone: 'bernoussi',
    places: 22,
    voyageMatin1: 'N1',
    voyageMatin2: 'N2',
    voyageApresMidi15h15: 'N1',
    voyageApresMidi16h00: 'N2',
  },
  {
    id: 'ch-4',
    nom: 'Rachid Bennani',
    zone: 'hay mohammadi',
    places: 26,
    voyageMatin1: 'N1',
    voyageMatin2: 'SANS',
    voyageApresMidi15h15: 'N1',
    voyageApresMidi16h00: 'SANS',
  },
  {
    id: 'ch-5',
    nom: 'Abdellah Naciri',
    zone: 'sidi moumen',
    places: 26,
    voyageMatin1: 'N1',
    voyageMatin2: 'N2',
    voyageApresMidi15h15: 'N1',
    voyageApresMidi16h00: 'N2',
  },
  {
    id: 'ch-6',
    nom: 'Omar Zahiri',
    zone: 'azhar',
    places: 22,
    voyageMatin1: 'N1',
    voyageMatin2: 'N2',
    voyageApresMidi15h15: 'N1',
    voyageApresMidi16h00: 'N2',
  },
  {
    id: 'ch-7',
    nom: 'Khalid Amrani',
    zone: 'anassi',
    places: 22,
    voyageMatin1: 'N1',
    voyageMatin2: 'SANS',
    voyageApresMidi15h15: 'N1',
    voyageApresMidi16h00: 'SANS',
  },
];
