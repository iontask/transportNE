import React, { useState, useMemo } from 'react';
import { 
  X, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  Search, 
  Filter, 
  ArrowRight, 
  Sparkles, 
  RotateCcw,
  Bus,
  Check
} from 'lucide-react';
import { ResultatRepartition } from '../types';

interface ModalContinuiteDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  resultat: ResultatRepartition;
  onOptimiserContinuite?: () => void;
}

export const ModalContinuiteDetails: React.FC<ModalContinuiteDetailsProps> = ({
  isOpen,
  onClose,
  resultat,
  onOptimiserContinuite,
}) => {
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<'TOUS' | 'MEME' | 'DIFFERENT'>('TOUS');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [justOptimized, setJustOptimized] = useState(false);

  const stats = resultat.statistiques;
  const taux = stats.tauxMemeChauffeurMatinApresMidi ?? 100;
  const nbMeme = stats.nbElevesMemeChauffeur ?? 0;
  const nbDiff = stats.nbElevesChauffeurDifferent ?? 0;
  const totalEligibles = stats.nbElevesEligiblesContinuite ?? 0;
  const details = stats.elevesContinuiteDetails || [];

  const handleOptimiser = () => {
    if (!onOptimiserContinuite) return;
    setIsOptimizing(true);
    setTimeout(() => {
      onOptimiserContinuite();
      setIsOptimizing(false);
      setJustOptimized(true);
      setTimeout(() => setJustOptimized(false), 3000);
    }, 400);
  };

  const detailsFiltres = useMemo(() => {
    return details.filter((d) => {
      if (filtreStatut === 'MEME' && !d.memeChauffeur) return false;
      if (filtreStatut === 'DIFFERENT' && d.memeChauffeur) return false;

      if (!recherche.trim()) return true;
      const q = recherche.toLowerCase();
      return (
        d.nomComplet.toLowerCase().includes(q) ||
        d.zone.toLowerCase().includes(q) ||
        d.chauffeurMatinNom.toLowerCase().includes(q) ||
        d.chauffeurApresMidiNom.toLowerCase().includes(q)
      );
    });
  }, [details, filtreStatut, recherche]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div 
        className="relative flex flex-col w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Règle : Même Chauffeur Matin & Après-midi
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  taux >= 90 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : taux >= 70
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {taux}% de respect
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Les élèves transportés le matin doivent être reconduits par le même chauffeur l'après-midi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Métriques clés */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-200">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900">{nbMeme}</div>
              <div className="text-xs text-slate-500 font-medium">Même chauffeur (Matin & Soir)</div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className={`p-2 rounded-lg ${nbDiff > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900">{nbDiff}</div>
              <div className="text-xs text-slate-500 font-medium">Chauffeur différent</div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xl font-extrabold text-slate-900">{totalEligibles}</div>
              <div className="text-xs text-slate-500 font-medium">Élèves avec rotation A/R</div>
            </div>
            {onOptimiserContinuite && (
              <button
                type="button"
                onClick={handleOptimiser}
                disabled={isOptimizing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {justOptimized ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    Optimisé !
                  </>
                ) : (
                  <>
                    <RotateCcw className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
                    Réoptimiser
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Barre de filtres & recherche */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher élève, zone, chauffeur..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <span className="text-xs text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filtrer :
            </span>
            <button
              type="button"
              onClick={() => setFiltreStatut('TOUS')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filtreStatut === 'TOUS'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous ({details.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltreStatut('DIFFERENT')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filtreStatut === 'DIFFERENT'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Différents ({nbDiff})
            </button>
            <button
              type="button"
              onClick={() => setFiltreStatut('MEME')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filtreStatut === 'MEME'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Même chauffeur ({nbMeme})
            </button>
          </div>
        </div>

        {/* Liste détaillée */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
          {detailsFiltres.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Aucun élève ne correspond aux critères.</p>
              {recherche && (
                <button
                  type="button"
                  onClick={() => setRecherche('')}
                  className="mt-2 text-xs text-blue-600 hover:underline cursor-pointer"
                >
                  Effacer la recherche
                </button>
              )}
            </div>
          ) : (
            detailsFiltres.map((detail) => {
              const isDiff = !detail.memeChauffeur;
              return (
                <div
                  key={detail.eleveId}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isDiff
                      ? 'bg-white border-amber-200 hover:border-amber-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Infos élève */}
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        isDiff ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {detail.niveau === 1 ? 'N1' : 'N2'}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                          {detail.nomComplet}
                          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-normal">
                            {detail.zone}
                          </span>
                        </div>
                        {detail.motifDifference && isDiff && (
                          <div className="text-xs text-amber-700 font-medium mt-0.5 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-500" />
                            {detail.motifDifference}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Comparaison Matin vs Après-midi */}
                    <div className="flex items-center gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-mono text-[10px] uppercase">
                          {detail.voyageMatin === 'MATIN_1' ? 'Matin 1 (8h30)' : 'Matin 2 (9h15)'} :
                        </span>
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <Bus className="w-3 h-3 text-slate-500" />
                          {detail.chauffeurMatinNom}
                        </span>
                      </div>

                      <ArrowRight className={`w-3.5 h-3.5 ${isDiff ? 'text-amber-500' : 'text-emerald-500'}`} />

                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-mono text-[10px] uppercase">
                          {detail.voyageApresMidi === 'APRES_MIDI_15H15' ? '15h15' : '16h00'} :
                        </span>
                        <span className={`font-semibold flex items-center gap-1 ${
                          isDiff ? 'text-amber-700 font-bold' : 'text-slate-800'
                        }`}>
                          <Bus className="w-3 h-3 text-slate-500" />
                          {detail.chauffeurApresMidiNom}
                        </span>
                      </div>

                      <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isDiff
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isDiff ? 'Différent' : 'Même'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pied de page */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Affichage de <span className="font-bold text-slate-700">{detailsFiltres.length}</span> sur {details.length} élève(s) avec transport aller et retour.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
