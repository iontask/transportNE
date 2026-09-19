import React, { useState } from 'react';
import { FileText, Download, Users, Bus, Clock, ArrowRight, Printer, Loader2, ArrowRightLeft, Zap } from 'lucide-react';
import { Eleve, Chauffeur, ResultatRepartition } from '../types';
import { VOYAGES, getStatsOptimisationVoyage } from '../utils/repartition';
import { exporterVoyagePDF } from '../utils/pdfExport';
import { AtelierInterchangeDragDrop } from '../components/AtelierInterchangeDragDrop';

interface ListesVoyagePageProps {
  resultat: ResultatRepartition;
  eleves?: Eleve[];
  chauffeurs?: Chauffeur[];
  chauffeursVerrouilles?: Set<string>;
  emplacementsVerrouilles?: Set<string>;
  onToggleVerrouillerChauffeur?: (chauffeurId: string) => void;
  onToggleVerrouillerEmplacement?: (chauffeurId: string, voyageId: string) => void;
  onResultat?: (nouveauResultat: ResultatRepartition) => void;
  onNavigateToChauffeur?: () => void;
  onNavigateToRepartition?: () => void;
}

export const ListesVoyagePage: React.FC<ListesVoyagePageProps> = ({
  resultat,
  eleves,
  chauffeurs,
  chauffeursVerrouilles = new Set(),
  emplacementsVerrouilles = new Set(),
  onToggleVerrouillerChauffeur,
  onToggleVerrouillerEmplacement,
  onResultat,
  onNavigateToChauffeur,
  onNavigateToRepartition,
}) => {
  const [modeVue, setModeVue] = useState<'liste' | 'dragdrop'>('liste');
  const [selectedVoyageId, setSelectedVoyageId] = useState<string>('MATIN_1');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const voyageData = resultat.parVoyage[selectedVoyageId];
  const voyage = VOYAGES.find((v) => v.id === selectedVoyageId) || VOYAGES[0];

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      await exporterVoyagePDF(resultat, selectedVoyageId);
    } catch (err) {
      console.error('Erreur export voyage PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Listes par voyage
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Consultez tous les chauffeurs et leurs élèves pour chacun des 4 créneaux horaires.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onNavigateToChauffeur && (
            <button
              type="button"
              onClick={onNavigateToChauffeur}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>Vue par chauffeur</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 shrink-0" />
            )}
            <span>{isExporting ? 'Génération PDF...' : 'Export PDF du voyage'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-gray-500" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {/* Barre de commutation entre Liste nominative et Atelier Drag & Drop */}
      {eleves && chauffeurs && onResultat && (
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModeVue('liste')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                modeVue === 'liste'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Listes d'embarquement nominatives</span>
            </button>
            <button
              type="button"
              onClick={() => setModeVue('dragdrop')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                modeVue === 'dragdrop'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4 text-amber-300" />
              <span>Interchanger des élèves (Drag & Drop)</span>
              <span className="text-[10px] bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-md font-extrabold uppercase">
                Même Zone
              </span>
            </button>
          </div>
          {onNavigateToRepartition && (
            <button
              type="button"
              onClick={onNavigateToRepartition}
              className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
            >
              Tableau de répartition complet →
            </button>
          )}
        </div>
      )}

      {modeVue === 'dragdrop' && eleves && chauffeurs && onResultat ? (
        <AtelierInterchangeDragDrop
          resultat={resultat}
          eleves={eleves}
          chauffeurs={chauffeurs}
          chauffeursVerrouilles={chauffeursVerrouilles}
          emplacementsVerrouilles={emplacementsVerrouilles}
          onToggleVerrouiller={onToggleVerrouillerChauffeur}
          onToggleVerrouillerEmplacement={onToggleVerrouillerEmplacement}
          onMettreAJourResultat={onResultat}
        />
      ) : (
        <>
          {/* Onglets des voyages */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {VOYAGES.map((v) => {
          const isSelected = selectedVoyageId === v.id;
          const count = resultat.parVoyage[v.id]?.totalEleves || 0;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedVoyageId(v.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{v.libelle} — {v.heure}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                isSelected ? 'bg-blue-800 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Statistiques du voyage sélectionné */}
      {voyageData && (() => {
        const opt = getStatsOptimisationVoyage(voyageData);
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Élèves transportés</p>
                <p className="text-2xl font-black text-gray-900 tracking-tight">
                  {opt.totalEleves}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Transports utilisés</p>
                <p className="text-2xl font-black text-gray-900 tracking-tight">
                  {opt.nbTransportsUtilises} <span className="text-xs font-semibold text-gray-500">bus ({opt.placesTransportsUtilises} pl.)</span>
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-amber-100 p-4 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 fill-amber-500" />
              </div>
              <div>
                <p className="text-xs text-amber-700 font-bold uppercase tracking-wider">Taux d'optimisation</p>
                <p className="text-2xl font-black text-gray-900 tracking-tight">
                  {opt.tauxOptimisation}%
                </p>
                <span className="text-[10px] text-gray-400 font-mono block">
                  {opt.totalEleves} ÷ {opt.placesTransportsUtilises || 1} pl.
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Capacité totale</p>
                <p className="text-2xl font-black text-gray-900 tracking-tight">
                  {opt.totalPlaces} <span className="text-xs font-semibold text-gray-400">places flotte</span>
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Liste des cartes chauffeurs */}
      <div className="space-y-4">
        {voyageData?.chauffeurs
          .filter((c) => c.eleves.length > 0)
          .map((c) => {
            const taux = Math.round((c.eleves.length / Math.max(1, c.chauffeur.places)) * 100);
            return (
              <div key={c.chauffeur.id} className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-black text-sm">
                      {c.chauffeur.nom.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                        <span>Chauffeur : {c.chauffeur.nom}</span>
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Zone de référence : <span className="font-bold text-blue-700 uppercase">{c.chauffeur.zone}</span> • 
                        Capacité véhicule : <strong className="text-gray-800">{c.chauffeur.places} places</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-medium">Occupation</p>
                      <p className="text-base font-black text-blue-600">
                        {c.eleves.length} / {c.chauffeur.places}
                        <span className="text-xs font-semibold text-gray-500 ml-1">({taux}%)</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">
                    Élèves transportés ({c.eleves.length}) :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {c.eleves.map((eleve) => (
                      <div
                        key={eleve.id || `${eleve.nom}_${eleve.prenom}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                          eleve.niveau === 1
                            ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                            : 'bg-purple-50/80 border-purple-200 text-purple-900'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                          eleve.niveau === 1 ? 'bg-blue-200 text-blue-800' : 'bg-purple-200 text-purple-800'
                        }`}>
                          {eleve.niveau}
                        </span>
                        <span dir="rtl" className="font-arabic font-bold text-sm">
                          {eleve.nom} {eleve.prenom}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold shrink-0">
                          ({eleve.zone})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

        {(!voyageData || voyageData.chauffeurs.filter((c) => c.eleves.length > 0).length === 0) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Bus className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700">Aucun chauffeur avec des élèves affectés pour ce voyage.</p>
            <p className="text-xs text-gray-400 mt-1">Vérifiez les configurations de voyage de vos chauffeurs ou lancez la répartition.</p>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};
