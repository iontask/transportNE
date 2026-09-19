import React, { useState, useMemo } from 'react';
import { FileText, Download, Printer, ChevronDown, Users, Bus, ArrowRight, Loader2 } from 'lucide-react';
import { Chauffeur, ResultatRepartition, Eleve } from '../types';
import { VOYAGES, getElevesChauffeurVoyage } from '../utils/repartition';
import { 
  exporterListePDF, 
  exporterToutesListesChauffeurPDF, 
  exporterToutesListesPDF 
} from '../utils/pdfExport';
import { exporterChauffeurExcel, exporterAffectationsExcel } from '../utils/excelExport';

interface ListesChauffeurPageProps {
  chauffeurs: Chauffeur[];
  resultat: ResultatRepartition;
  eleves?: Eleve[];
  onNavigateToVoyage?: () => void;
}

export const ListesChauffeurPage: React.FC<ListesChauffeurPageProps> = ({
  chauffeurs,
  resultat,
  eleves = [],
  onNavigateToVoyage,
}) => {
  const [selectedChauffeurId, setSelectedChauffeurId] = useState<string>(
    chauffeurs[0]?.id || ''
  );
  const [selectedVoyageId, setSelectedVoyageId] = useState<string>('MATIN_1');
  const [exportingState, setExportingState] = useState<string | null>(null);

  // Synchronize selected chauffeur if current one is not valid
  const currentChauffeurId = chauffeurs.some((c) => c.id === selectedChauffeurId)
    ? selectedChauffeurId
    : chauffeurs[0]?.id || '';

  const selectedChauffeur = chauffeurs.find((c) => c.id === currentChauffeurId);

  const elevesVoyage = useMemo(() => {
    if (!selectedChauffeur) return [];
    return getElevesChauffeurVoyage(resultat, selectedChauffeur.id, selectedVoyageId);
  }, [resultat, selectedChauffeur, selectedVoyageId]);

  const handleExportPDF = async () => {
    if (!selectedChauffeur) return;
    try {
      setExportingState('single');
      await exporterListePDF(selectedChauffeur, selectedVoyageId, elevesVoyage);
    } catch (err) {
      console.error('Erreur export PDF:', err);
    } finally {
      setExportingState(null);
    }
  };

  const handleExportToutesListes = async () => {
    if (!selectedChauffeur) return;
    try {
      setExportingState('chauffeur');
      await exporterToutesListesChauffeurPDF(selectedChauffeur, resultat);
    } catch (err) {
      console.error('Erreur export PDF chauffeur:', err);
    } finally {
      setExportingState(null);
    }
  };

  const handleExportTousChauffeursPDF = async () => {
    try {
      setExportingState('all');
      await exporterToutesListesPDF(resultat, chauffeurs);
    } catch (err) {
      console.error('Erreur export PDF tous:', err);
    } finally {
      setExportingState(null);
    }
  };

  const handleExportExcel = () => {
    if (!selectedChauffeur) return;
    exporterChauffeurExcel(selectedChauffeur, resultat);
  };

  const handleExportGlobalExcel = () => {
    exporterAffectationsExcel(resultat, chauffeurs, eleves);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!chauffeurs || chauffeurs.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-center py-16">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-800">Aucun chauffeur disponible</h2>
        <p className="text-gray-500 text-sm mt-1">Veuillez d'abord importer des données et exécuter la répartition.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Listes par chauffeur
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Consultez, imprimez et exportez les listes d'élèves par chauffeur et par voyage avec émargement.
          </p>
        </div>

        {onNavigateToVoyage && (
          <button
            type="button"
            onClick={onNavigateToVoyage}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>Voir vue par voyage</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Sélecteurs Chauffeur et Voyage */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
            Chauffeur & Véhicule
          </label>
          <div className="relative">
            <select
              value={currentChauffeurId}
              onChange={(e) => setSelectedChauffeurId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white appearance-none cursor-pointer pr-10"
            >
              {chauffeurs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} — Zone {c.zone.toUpperCase()} ({c.places} places)
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
            Voyage & Horaire
          </label>
          <div className="relative">
            <select
              value={selectedVoyageId}
              onChange={(e) => setSelectedVoyageId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white appearance-none cursor-pointer pr-10"
            >
              {VOYAGES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.libelle} — {v.heure} {v.niveau ? `(Niveau ${v.niveau})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Barre des boutons d'actions et exports */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={handleExportPDF}
          disabled={elevesVoyage.length === 0 || exportingState !== null}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
          title="Exporter la liste affichée en PDF A4 portrait avec émargement"
        >
          {exportingState === 'single' ? (
            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
          ) : (
            <FileText className="w-4 h-4 shrink-0" />
          )}
          <span>{exportingState === 'single' ? 'Génération PDF...' : 'Export PDF (cette liste)'}</span>
        </button>

        <button
          type="button"
          onClick={handleExportToutesListes}
          disabled={exportingState !== null}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-700 text-white rounded-xl text-xs font-semibold hover:bg-red-800 active:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
          title="Exporter tous les 4 voyages de ce chauffeur dans un seul PDF"
        >
          {exportingState === 'chauffeur' ? (
            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
          ) : (
            <FileText className="w-4 h-4 shrink-0" />
          )}
          <span>{exportingState === 'chauffeur' ? 'Génération PDF (4 voyages)...' : 'Export PDF (4 voyages chauffeur)'}</span>
        </button>

        <button
          type="button"
          onClick={handleExportTousChauffeursPDF}
          disabled={exportingState !== null}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-700 text-white rounded-xl text-xs font-semibold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
          title="Exporter un document complet contenant tous les chauffeurs et tous les voyages"
        >
          {exportingState === 'all' ? (
            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
          ) : (
            <FileText className="w-4 h-4 shrink-0" />
          )}
          <span>{exportingState === 'all' ? 'Génération PDF complet...' : 'Export PDF (tous chauffeurs)'}</span>
        </button>

        <button
          type="button"
          onClick={handleExportExcel}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition-all shadow-xs cursor-pointer"
          title="Exporter les feuilles de ce chauffeur en Excel"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>Export Excel chauffeur</span>
        </button>

        <button
          type="button"
          onClick={handleExportGlobalExcel}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-all shadow-xs cursor-pointer"
          title="Exporter le classeur complet de toutes les affectations et récapitulatifs"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>Export Excel global</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white text-gray-700 border border-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-50 active:bg-gray-100 transition-all shadow-xs cursor-pointer ml-auto"
        >
          <Printer className="w-4 h-4 shrink-0 text-gray-500" />
          <span>Imprimer</span>
        </button>
      </div>

      {/* Informations de synthèse du chauffeur sélectionné */}
      {selectedChauffeur && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>Chauffeur : {selectedChauffeur.nom}</span>
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <span className="font-medium text-gray-700">
                    Zone : <span className="uppercase text-blue-700 font-bold">{selectedChauffeur.zone}</span>
                  </span>
                  <span>•</span>
                  <span>Capacité max : <strong className="text-gray-900">{selectedChauffeur.places} places</strong></span>
                  <span>•</span>
                  <span>
                    Voyage : <strong className="text-gray-900">{VOYAGES.find((v) => v.id === selectedVoyageId)?.libelle} ({VOYAGES.find((v) => v.id === selectedVoyageId)?.heure})</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200/80 text-right sm:min-w-[170px]">
              <p className="text-xs text-gray-500 font-medium">Élèves sur ce voyage</p>
              <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-blue-600 tracking-tight">
                  {elevesVoyage.length}
                </span>
                <span className="text-xs text-gray-400 font-bold">/ {selectedChauffeur.places} places</span>
              </div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div 
                  className={`h-full transition-all ${
                    elevesVoyage.length > selectedChauffeur.places 
                      ? 'bg-red-500' 
                      : elevesVoyage.length === selectedChauffeur.places 
                      ? 'bg-emerald-500' 
                      : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(100, Math.round((elevesVoyage.length / Math.max(1, selectedChauffeur.places)) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tableau des élèves avec émargement */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Liste des passagers ({elevesVoyage.length} élève{elevesVoyage.length > 1 ? 's' : ''})
            </h3>
          </div>
          <span className="text-xs text-gray-400 italic">
            Format prêt pour signature et émargement
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3.5 text-center w-12">N°</th>
                <th className="px-4 py-3.5 text-right">
                  <span dir="rtl" className="font-arabic font-bold text-sm text-gray-800">النسب</span>{' '}
                  <span className="text-xs font-normal text-gray-400 lowercase">(nom)</span>
                </th>
                <th className="px-4 py-3.5 text-right">
                  <span dir="rtl" className="font-arabic font-bold text-sm text-gray-800">الإسم</span>{' '}
                  <span className="text-xs font-normal text-gray-400 lowercase">(prénom)</span>
                </th>
                <th className="px-4 py-3.5 text-center w-24">Niveau</th>
                <th className="px-4 py-3.5 text-center">Zone</th>
                <th className="px-4 py-3.5 text-center w-40">Émargement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {elevesVoyage.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <p className="font-semibold text-gray-600 text-sm">Aucun élève affecté à ce voyage pour ce chauffeur</p>
                    <p className="text-xs text-gray-400 mt-1">Sélectionnez un autre voyage ou un autre chauffeur pour afficher la liste.</p>
                  </td>
                </tr>
              ) : (
                elevesVoyage.map((eleve, index) => (
                  <tr key={eleve.id || `${eleve.nom}_${eleve.prenom}_${index}`} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-center font-bold text-gray-400">
                      {index + 1}
                    </td>
                    <td dir="rtl" className="px-4 py-2.5 text-right font-bold text-gray-950 font-arabic text-base">
                      {eleve.nom}
                    </td>
                    <td dir="rtl" className="px-4 py-2.5 text-right font-semibold text-gray-800 font-arabic text-base">
                      {eleve.prenom || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        eleve.niveau === 1
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        N{eleve.niveau}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs font-bold text-gray-600 uppercase">
                      {eleve.zone}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="h-7 w-28 mx-auto border-b-2 border-dashed border-gray-300 rounded-xs" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
