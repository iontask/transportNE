import * as XLSX from 'xlsx';
import { Eleve, Chauffeur, ImportResult } from '../types';
import { normaliserOptionVoyage } from './repartition';

// Générer un ID unique
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Normaliser le nom de zone
export const normaliserZone = (zone: string): string => {
  return zone
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

// Importer les élèves depuis un fichier Excel
export const importerEleves = async (
  file: File
): Promise<ImportResult<Eleve>> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const eleves: Eleve[] = [];

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { success: false, data: [], errors: ['Le fichier Excel ne contient aucune feuille de calcul'], warnings };
    }
    const firstSheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

    if (!jsonData || jsonData.length === 0) {
      return { success: false, data: [], errors: ['La feuille Excel est vide'], warnings };
    }

    // Détecter la ligne d'en-tête (chercher 'النسب' ou 'niveau' ou 'zone')
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && Array.isArray(row) && row.some(cell => {
        const str = String(cell || '').toLowerCase();
        return str.includes('النسب') || 
               str.includes('نسب') ||
               str.includes('niveau') ||
               str.includes('zone') ||
               str.includes('nom');
      })) {
        headerRowIndex = i;
        break;
      }
    }

    const headers = (jsonData[headerRowIndex] || []) as string[];
    const rows = jsonData.slice(headerRowIndex + 1);

    // Trouver les index des colonnes
    const findColumnIndex = (keywords: string[]): number => {
      return headers.findIndex(h => 
        keywords.some(k => String(h || '').toLowerCase().includes(k.toLowerCase()))
      );
    };

    const nomIndex = findColumnIndex(['النسب', 'nom', 'نسب']);
    const prenomIndex = findColumnIndex(['الإسم', 'الاسم', 'prenom', 'prénom', 'اسم']);
    const niveauIndex = findColumnIndex(['niveau', 'مستوى']);
    const zoneIndex = findColumnIndex(['zone', 'منطقة']);

    if (nomIndex === -1) errors.push('Colonne "النسب" (Nom) non trouvée dans l\'en-tête');
    if (niveauIndex === -1) errors.push('Colonne "niveau" (ou "مستوى") non trouvée');
    if (zoneIndex === -1) errors.push('Colonne "zone" (ou "منطقة") non trouvée');

    if (errors.length > 0) {
      return { success: false, data: [], errors, warnings };
    }

    // Parcourir les lignes
    rows.forEach((row: any[], index: number) => {
      if (!row || !Array.isArray(row) || row.length === 0) return;

      const nom = String(row[nomIndex] ?? '').trim();
      const prenom = prenomIndex >= 0 ? String(row[prenomIndex] ?? '').trim() : '';
      const niveauRaw = row[niveauIndex];
      const zoneRaw = String(row[zoneIndex] ?? '').trim();

      // Ignorer les lignes complètement vides
      if (!nom && !prenom && !zoneRaw) return;

      // Valider le niveau
      const parsedNiveau = parseInt(String(niveauRaw).trim());
      if (parsedNiveau !== 1 && parsedNiveau !== 2) {
        warnings.push(`Ligne ${index + headerRowIndex + 2} (${nom || 'Sans nom'}): niveau invalide "${niveauRaw}" (doit être 1 ou 2)`);
        return;
      }

      // Valider la zone
      if (!zoneRaw) {
        warnings.push(`Ligne ${index + headerRowIndex + 2} (${nom || 'Sans nom'}): zone vide`);
        return;
      }

      eleves.push({
        id: generateId(),
        nom,
        prenom,
        niveau: parsedNiveau as 1 | 2,
        zone: normaliserZone(zoneRaw),
      });
    });

    if (eleves.length === 0) {
      errors.push('Aucun élève valide n\'a été extrait du fichier.');
      return { success: false, data: [], errors, warnings };
    }

    return {
      success: true,
      data: eleves,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [`Erreur de lecture du fichier: ${error instanceof Error ? error.message : String(error)}`],
      warnings,
    };
  }
};

// Importer les chauffeurs depuis un fichier Excel
export const importerChauffeurs = async (
  file: File
): Promise<ImportResult<Chauffeur>> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const chauffeurs: Chauffeur[] = [];

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { success: false, data: [], errors: ['Le fichier Excel ne contient aucune feuille de calcul'], warnings };
    }
    const firstSheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

    if (!jsonData || jsonData.length === 0) {
      return { success: false, data: [], errors: ['La feuille Excel est vide'], warnings };
    }

    // Détecter la ligne d'en-tête
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && Array.isArray(row) && row.some(cell => {
        const str = String(cell || '').toUpperCase();
        return str.includes('CHAUFFEUR') || str.includes('PLACES');
      })) {
        headerRowIndex = i;
        break;
      }
    }

    const headers = (jsonData[headerRowIndex] || []) as string[];
    const rows = jsonData.slice(headerRowIndex + 1);

    const findColumnIndex = (keywords: string[]): number => {
      return headers.findIndex(h => 
        keywords.some(k => String(h || '').toUpperCase().includes(k.toUpperCase()))
      );
    };

    const chauffeurIndex = findColumnIndex(['CHAUFFEUR', 'NOM']);
    const zoneIndex = findColumnIndex(['ZONE']);
    const placesIndex = findColumnIndex(['PLACES', 'PLACE', 'CAPACITE']);
    const matin1Index = findColumnIndex(['MATIN 1', 'MATIN1', 'M1']);
    const matin2Index = findColumnIndex(['MATIN 2', 'MATIN2', 'M2']);
    const apresMidi15h15Index = findColumnIndex(['15H15', '15H']);
    const apresMidi16h00Index = findColumnIndex(['16H00', '16H']);

    if (chauffeurIndex === -1) errors.push('Colonne "CHAUFFEUR" non trouvée');
    if (zoneIndex === -1) errors.push('Colonne "ZONE" non trouvée');
    if (placesIndex === -1) errors.push('Colonne "PLACES" non trouvée');

    if (errors.length > 0) {
      return { success: false, data: [], errors, warnings };
    }

    rows.forEach((row: any[], index: number) => {
      if (!row || !Array.isArray(row) || row.length === 0) return;

      const nom = String(row[chauffeurIndex] ?? '').trim();
      const zone = String(row[zoneIndex] ?? '').trim();
      const placesRaw = row[placesIndex];

      if (!nom && !zone) return;

      const places = parseInt(String(placesRaw));
      if (isNaN(places) || places <= 0) {
        warnings.push(`Ligne ${index + headerRowIndex + 2} (${nom || 'Sans nom'}): nombre de places invalide "${placesRaw}"`);
        return;
      }

      chauffeurs.push({
        id: generateId(),
        nom,
        zone: normaliserZone(zone),
        places,
        voyageMatin1: normaliserOptionVoyage(matin1Index >= 0 ? row[matin1Index] : 'SANS'),
        voyageMatin2: normaliserOptionVoyage(matin2Index >= 0 ? row[matin2Index] : 'SANS'),
        voyageApresMidi15h15: normaliserOptionVoyage(apresMidi15h15Index >= 0 ? row[apresMidi15h15Index] : 'SANS'),
        voyageApresMidi16h00: normaliserOptionVoyage(apresMidi16h00Index >= 0 ? row[apresMidi16h00Index] : 'SANS'),
      });
    });

    if (chauffeurs.length === 0) {
      errors.push('Aucun chauffeur valide n\'a été extrait du fichier.');
      return { success: false, data: [], errors, warnings };
    }

    return {
      success: true,
      data: chauffeurs,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [`Erreur de lecture du fichier: ${error instanceof Error ? error.message : String(error)}`],
      warnings,
    };
  }
};

// Fonction utilitaire pour exporter/télécharger un fichier modèle Excel
export const telechargerModeleExcel = (type: 'eleves' | 'chauffeurs') => {
  const wb = XLSX.utils.book_new();

  if (type === 'eleves') {
    const data = [
      ['النسب', 'الإسم', 'niveau', 'zone'],
      ['العلمي', 'يوسف', 1, 'ain sebaa'],
      ['بناني', 'فاطمة الزهراء', 2, 'ain sebaa'],
      ['الإدريسي', 'أحمد', 1, 'bernoussi'],
      ['التازي', 'مريم', 2, 'bernoussi'],
      ['شقرون', 'مهدي', 1, 'hay mohammadi'],
      ['الفاسي', 'سارة', 2, 'sidi moumen'],
      ['المرابط', 'حمزة', 1, 'azhar'],
      ['الصباحي', 'سلمى', 2, 'anassi'],
      ['العلوي', 'آدم', 1, 'ain sebaa'],
      ['بوعبيد', 'هدى', 2, 'ain sebaa'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Eleves');
    XLSX.writeFile(wb, 'modele_eleves.xlsx');
  } else {
    const data = [
      ['CHAUFFEUR', 'ZONE', 'PLACES', 'MATIN 1', 'MATIN 2', '15H15', '16H00'],
      ['Mohamed Alami', 'ain sebaa', 26, '1', '2', '1 AIN SEBAA', '2'],
      ['Hassan Berrada', 'ain sebaa', 32, '1 ET 2', '1 ET 2 AIN SEBAA', '1', '2'],
      ['Said Tazi', 'bernoussi', 22, '1', '2', '1', '2'],
      ['Rachid Bennani', 'hay mohammadi', 26, '1', 'SANS', '1', 'SANS'],
      ['Abdellah Naciri', 'sidi moumen', 26, '1', '2', '1', '2'],
      ['Omar Zahiri', 'azhar', 22, '1', '2', '1', '2'],
      ['Khalid Amrani', 'anassi', 22, '1', 'SANS', '1', 'SANS'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Chauffeurs');
    XLSX.writeFile(wb, 'modele_chauffeurs.xlsx');
  }
};
