import * as XLSX from 'xlsx';
import { Eleve, Chauffeur, ResultatRepartition } from '../types';
import { VOYAGES, getElevesChauffeurVoyage, getStatsOptimisationVoyage } from './repartition';

// ============================================================
// EXPORT EXCEL : TOUTES LES AFFECTATIONS
// ============================================================

export const exporterAffectationsExcel = (
  resultat: ResultatRepartition,
  chauffeurs: Chauffeur[],
  eleves: Eleve[]
): void => {
  const elevesMap = new Map(eleves.map((e) => [e.id, e]));
  const chauffeursMap = new Map(chauffeurs.map((c) => [c.id, c]));

  // Feuille 1 : Toutes les affectations
  const affectationsData = resultat.affectations.map((a) => {
    const eleve = elevesMap.get(a.eleveId);
    const chauffeur = chauffeursMap.get(a.chauffeurId);
    return {
      'Chauffeur': chauffeur?.nom || '',
      'Zone chauffeur': chauffeur?.zone.toUpperCase() || '',
      'Voyage': a.voyageId,
      'Nom élève': eleve?.nom || '',
      'Prénom élève': eleve?.prenom || '',
      'Niveau': eleve?.niveau || '',
      'Zone élève': eleve?.zone.toUpperCase() || '',
    };
  });

  const ws1 = XLSX.utils.json_to_sheet(affectationsData);

  // Feuille 2 : Récapitulatif par chauffeur
  const recapData = Object.values(resultat.parChauffeur).map((r) => ({
    'Chauffeur': r.chauffeur.nom,
    'Zone': r.chauffeur.zone.toUpperCase(),
    'Places': r.chauffeur.places,
    'Matin 1': r.voyages['MATIN_1']?.placesUtilisees || 0,
    'Matin 2': r.voyages['MATIN_2']?.placesUtilisees || 0,
    '15h15': r.voyages['APRES_MIDI_15H15']?.placesUtilisees || 0,
    '16h00': r.voyages['APRES_MIDI_16H00']?.placesUtilisees || 0,
    'Total': r.totalEleves,
    'Taux global': `${Math.round(r.tauxGlobal * 100)}%`,
  }));

  const ws2 = XLSX.utils.json_to_sheet(recapData);

  // Feuille 3 : Récapitulatif par voyage (avec taux d'optimisation transports utilisés vs places)
  const voyageData = VOYAGES.map((v) => {
    const vData = resultat.parVoyage[v.id];
    const opt = getStatsOptimisationVoyage(vData);
    return {
      'Voyage': v.libelle,
      'Heure': v.heure,
      'Total élèves': opt.totalEleves,
      'Transports utilisés': opt.nbTransportsUtilises,
      'Places transports utilisés': opt.placesTransportsUtilises,
      'Taux d\'optimisation (%)': `${opt.tauxOptimisation}%`,
      'Places totales flotte': opt.totalPlaces,
    };
  });

  const ws3 = XLSX.utils.json_to_sheet(voyageData);

  // Feuille 4 : Élèves non affectés
  const nonAffectesData = resultat.statistiques.elevesNonAffectes.map((e) => ({
    'Nom': e.nom,
    'Prénom': e.prenom,
    'Niveau': e.niveau,
    'Zone': e.zone.toUpperCase(),
  }));

  const ws4 = XLSX.utils.json_to_sheet(nonAffectesData);

  // Créer le classeur
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Affectations');
  XLSX.utils.book_append_sheet(wb, ws2, 'Récap chauffeurs');
  XLSX.utils.book_append_sheet(wb, ws3, 'Récap voyages');
  XLSX.utils.book_append_sheet(wb, ws4, 'Non affectés');

  // Sauvegarder
  const nomFichier = `affectations_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, nomFichier);
};

// ============================================================
// EXPORT EXCEL : LISTE D'UN CHAUFFEUR
// ============================================================

export const exporterChauffeurExcel = (
  chauffeur: Chauffeur,
  resultat: ResultatRepartition
): void => {
  const wb = XLSX.utils.book_new();

  VOYAGES.forEach((voyage) => {
    const eleves = getElevesChauffeurVoyage(resultat, chauffeur.id, voyage.id);
    if (eleves.length === 0) return;

    const data = eleves.map((e, i) => ({
      'N°': i + 1,
      'Nom': e.nom,
      'Prénom': e.prenom,
      'Niveau': e.niveau,
      'Zone': e.zone.toUpperCase(),
      'Émargement': '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, voyage.id);
  });

  const nomFichier = `chauffeur_${chauffeur.nom.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, nomFichier);
};
