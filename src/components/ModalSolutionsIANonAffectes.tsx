import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Check, 
  X, 
  AlertTriangle, 
  Bus, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  Lightbulb, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  UserX, 
  Cpu, 
  Zap, 
  Layers
} from 'lucide-react';
import { Chauffeur, Eleve, ResultatRepartition } from '../types';
import { 
  SolutionIANonAffectes, 
  DiagnosticNonAffectes, 
  diagnostiquerElevesNonAffectes, 
  genererSolutionsIANonAffectes 
} from '../utils/solutionsIANonAffectes';

interface ModalSolutionsIANonAffectesProps {
  isOpen: boolean;
  onClose: () => void;
  eleves: Eleve[];
  chauffeurs: Chauffeur[];
  resultat: ResultatRepartition;
  onAppliquerSolution: (solution: SolutionIANonAffectes) => void;
}

export const ModalSolutionsIANonAffectes: React.FC<ModalSolutionsIANonAffectesProps> = ({
  isOpen,
  onClose,
  eleves,
  chauffeurs,
  resultat,
  onAppliquerSolution,
}) => {
  const [solutions, setSolutions] = useState<SolutionIANonAffectes[]>([]);
  const [diagnostic, setDiagnostic] = useState<DiagnosticNonAffectes | null>(null);
  const [syntheseIA, setSyntheseIA] = useState<string>('');
  const [conseilsIA, setConseilsIA] = useState<string[]>([]);
  const [sourceAudit, setSourceAudit] = useState<'gemini' | 'algorithme_local'>('algorithme_local');
  const [chargement, setChargement] = useState<boolean>(false);
  const [solutionSelectionneeId, setSolutionSelectionneeId] = useState<string>('');
  const [afficherDetailsEleves, setAfficherDetailsEleves] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const chargerSolutions = async () => {
      setChargement(true);
      // Pré-génération locale immédiate
      const diagLocal = diagnostiquerElevesNonAffectes(eleves, chauffeurs, resultat);
      const solLocales = genererSolutionsIANonAffectes(eleves, chauffeurs, resultat);
      setDiagnostic(diagLocal);
      setSolutions(solLocales);
      if (solLocales.length > 0) {
        setSolutionSelectionneeId(solLocales[0].id);
      }

      // Requête serveur pour enrichissement IA Gemini
      try {
        const res = await fetch('/api/solutions-ia-non-affectes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eleves, chauffeurs, resultat }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            if (data.solutions && data.solutions.length > 0) {
              setSolutions(data.solutions);
              setSolutionSelectionneeId((prev) => prev || data.solutions[0].id);
            }
            if (data.diagnostic) {
              setDiagnostic(data.diagnostic);
            }
            if (data.syntheseIA) {
              setSyntheseIA(data.syntheseIA);
            }
            if (data.conseilsIA) {
              setConseilsIA(data.conseilsIA);
            }
            if (data.source) {
              setSourceAudit(data.source);
            }
          }
        }
      } catch (err) {
        console.warn('Utilisation du moteur de résolution IA local :', err);
      } finally {
        setChargement(false);
      }
    };

    chargerSolutions();
  }, [isOpen, eleves, chauffeurs, resultat]);

  if (!isOpen) return null;

  const solutionSelectionnee = solutions.find((s) => s.id === solutionSelectionneeId) || solutions[0];

  const handleConfirmerApplication = (sol: SolutionIANonAffectes) => {
    onAppliquerSolution(sol);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-purple-100 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Modale */}
        <div className="bg-linear-to-r from-purple-900 via-indigo-900 to-blue-900 text-white p-5 sm:p-6 flex items-start justify-between relative shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 text-purple-200 shrink-0">
              <Sparkles className="w-6 h-6 text-purple-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Solutions IA : Résolution des Élèves Non Affectés
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  <Cpu className="w-3 h-3" />
                  {sourceAudit === 'gemini' ? 'Gemini 3.8 Flash' : 'Moteur Logistique IA'}
                </span>
              </div>
              <p className="text-sm text-purple-200 mt-1 max-w-2xl">
                L'intelligence artificielle analyse les capacités des bus, les proximités géographiques et vous propose des solutions concrètes applicables en un clic.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps défilable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/50">
          {/* Diagnostic rapide */}
          {diagnostic && (
            <div className="bg-white rounded-xl border border-amber-200 p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                    <UserX className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                      Constat : {diagnostic.totalNonAffectes} élève(s) sans place attribuée
                    </h3>
                    <p className="text-xs text-gray-500">
                      Sur un total de {eleves.length} élèves inscrits au service de transport
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAfficherDetailsEleves(!afficherDetailsEleves)}
                    className="text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>{afficherDetailsEleves ? 'Masquer la liste' : 'Voir les élèves orphelins'}</span>
                    {afficherDetailsEleves ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Badges de zones concernées */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Zones touchées :</span>
                {Object.entries(diagnostic.repartitionParZone).map(([zone, nb]) => (
                  <span
                    key={zone}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200"
                  >
                    <MapPin className="w-3 h-3 text-amber-600" />
                    <span>{zone}</span>
                    <span className="bg-amber-200/70 text-amber-950 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                      {nb}
                    </span>
                  </span>
                ))}
              </div>

              {/* Liste détaillée dépliable des élèves */}
              {afficherDetailsEleves && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Détail des élèves non affectés et causes :
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                    {diagnostic.elevesDetails.map((det) => (
                      <div
                        key={det.eleve.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex flex-col justify-between gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900">{det.eleve.prenom} {det.eleve.nom}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-blue-100 text-blue-800">
                            Niveau {det.eleve.niveau}
                          </span>
                        </div>
                        <div className="text-gray-500 text-[11px] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span>Zone : <strong>{det.eleve.zone}</strong></span>
                        </div>
                        <div className="text-[11px] text-red-600 mt-0.5">
                          {det.voyagesManquants.map((vm) => (
                            <div key={vm.voyageId} className="flex items-center gap-1">
                              <span className="font-semibold">• {vm.voyageLibelle} :</span>
                              <span className="truncate">{vm.descriptionCause}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Synthèse IA Gemini */}
          {syntheseIA && (
            <div className="bg-linear-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-xl border border-purple-200 p-4 sm:p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-600 text-white rounded-lg shrink-0 mt-0.5 shadow-xs">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-purple-950 text-sm">
                      Analyse Logistique & Recommandation IA
                    </h4>
                    {chargement && (
                      <RefreshCw className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-purple-900 leading-relaxed">
                    {syntheseIA}
                  </p>
                  {conseilsIA.length > 0 && (
                    <div className="pt-2 border-t border-purple-200/60 mt-2 space-y-1">
                      <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block">
                        Conseils d'application :
                      </span>
                      {conseilsIA.map((conseil, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs text-purple-800">
                          <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>{conseil}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section Sélection de Solutions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                Solutions IA disponibles ({solutions.length})
              </h3>
              <span className="text-xs text-gray-500 font-medium">
                Sélectionnez une solution pour visualiser son plan d'action
              </span>
            </div>

            {solutions.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="font-semibold">Aucun élève non affecté détecté.</p>
                <p className="text-xs text-gray-400 mt-1">Tous les élèves sont déjà pris en charge par un véhicule.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {solutions.map((sol, index) => {
                  const estSelectionnee = sol.id === solutionSelectionneeId;
                  const estRecommandee = sol.type === 'recommandee';

                  return (
                    <div
                      key={sol.id}
                      onClick={() => setSolutionSelectionneeId(sol.id)}
                      className={`relative rounded-xl border-2 transition-all p-4 sm:p-5 bg-white cursor-pointer ${
                        estSelectionnee
                          ? 'border-purple-600 ring-2 ring-purple-100 shadow-md'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/20 shadow-xs'
                      }`}
                    >
                      {/* En-tête de la solution */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-950 text-base">
                              {sol.titre}
                            </span>
                            <span
                              className={`text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                                estRecommandee
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : sol.badgeColor === 'blue'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                                  : 'bg-purple-50 text-purple-800 border-purple-300'
                              }`}
                            >
                              {sol.badgeLabel}
                            </span>
                            {estRecommandee && (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                                <ShieldCheck className="w-3.5 h-3.5" /> Recommandé
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">{sol.sousTitre}</p>
                        </div>

                        {/* Taux de résolution */}
                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <div className="text-right">
                            <div className="text-xs font-bold text-emerald-700">
                              {sol.nbElevesResolus} / {sol.totalElevesNonAffectes} élèves résolus
                            </div>
                            <div className="text-[10px] text-gray-400">
                              Taux : {sol.pourcentageResolution}%
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs font-mono border border-emerald-300">
                            {sol.pourcentageResolution}%
                          </div>
                        </div>
                      </div>

                      {/* Explication & Actions */}
                      <div className="mt-3 space-y-3">
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {sol.description}
                        </p>

                        {/* Liste des actions précises */}
                        <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/80 space-y-2">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-purple-600" />
                            Actions d'ajustement prévues ({sol.actions.length}) :
                          </span>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {sol.actions.map((act, aIdx) => (
                              <div
                                key={aIdx}
                                className="text-xs text-slate-800 flex items-start gap-2 bg-white p-2 rounded border border-slate-200/60 shadow-2xs"
                              >
                                <ArrowRight className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-gray-900">{act.description}</span>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    Élève(s) concerné(s) : <span className="font-medium text-slate-700">{act.nomsEleves.join(', ')}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Bouton direct d'application pour cette solution */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <Bus className="w-3.5 h-3.5 text-blue-600" />
                            <span>Bus mobilisés : <strong>{sol.impactFlotte.busImpactesNoms.join(', ') || 'Flotte actuelle'}</strong></span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmerApplication(sol);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-linear-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-sm hover:shadow transition-all cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Appliquer cette solution</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer avec bouton principal d'application */}
        <div className="bg-white border-t border-gray-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-600 text-center sm:text-left">
            {solutionSelectionnee ? (
              <span>
                Solution sélectionnée : <strong className="text-gray-900">{solutionSelectionnee.titre}</strong> ({solutionSelectionnee.nbElevesResolus} élèves pris en charge)
              </span>
            ) : (
              <span>Sélectionnez une solution ci-dessus</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={!solutionSelectionnee || solutions.length === 0}
              onClick={() => {
                if (solutionSelectionnee) {
                  handleConfirmerApplication(solutionSelectionnee);
                }
              }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-black text-white bg-linear-to-r from-purple-700 via-indigo-700 to-blue-700 hover:from-purple-800 hover:via-indigo-800 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Appliquer la solution IA sélectionnée</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
