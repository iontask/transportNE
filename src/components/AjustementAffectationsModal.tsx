import React, { useState, useMemo } from 'react';
import { 
  X, 
  ArrowRight, 
  Users, 
  Bus, 
  Clock, 
  Sparkles, 
  Check, 
  AlertCircle,
  TrendingUp,
  UserPlus,
  ArrowRightLeft,
  ChevronDown,
  Filter
} from 'lucide-react';
import { Chauffeur, Eleve, ResultatRepartition } from '../types';
import { VOYAGES, TransfertOptions } from '../utils/repartition';
import { Badge } from './ui/badge';

interface AjustementAffectationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultat: ResultatRepartition;
  chauffeurs: Chauffeur[];
  eleves: Eleve[];
  onAppliquerTransfert: (options: TransfertOptions) => void;
  initialChauffeurId?: string;
  initialVoyageId?: string;
  sourceChauffeurIdInitial?: string;
  voyageIdInitial?: string;
  chauffeurIdsVerrouilles?: Set<string>;
  emplacementsVerrouilles?: Set<string>;
}

export const AjustementAffectationsModal: React.FC<AjustementAffectationsModalProps> = ({
  isOpen,
  onClose,
  resultat,
  chauffeurs,
  eleves,
  onAppliquerTransfert,
  initialChauffeurId,
  initialVoyageId,
  sourceChauffeurIdInitial,
  voyageIdInitial,
  chauffeurIdsVerrouilles,
  emplacementsVerrouilles,
}) => {
  const initChId = sourceChauffeurIdInitial || initialChauffeurId || chauffeurs[0]?.id || '';
  const initVId = voyageIdInitial || initialVoyageId || 'APRES_MIDI_15H15';

  const [selectedVoyageId, setSelectedVoyageId] = useState<string>(initVId);
  const [sourceChauffeurId, setSourceChauffeurId] = useState<string>(initChId);
  const [destChauffeurId, setDestChauffeurId] = useState<string>('');
  const [nombreEleves, setNombreEleves] = useState<number>(1);
  const [modeSelection, setModeSelection] = useState<'quantite' | 'individuel'>('quantite');
  const [selectedEleveIds, setSelectedEleveIds] = useState<string[]>([]);
  const [filtreRecherche, setFiltreRecherche] = useState('');

  // Initialisation du chauffeur destination logique quand source change
  React.useEffect(() => {
    if (!sourceChauffeurId) return;
    const source = chauffeurs.find((c) => c.id === sourceChauffeurId);
    if (!source) return;

    // Trouver un chauffeur de la même zone avec un taux plus faible ou de la place
    const memeZone = chauffeurs.filter(
      (c) => c.id !== sourceChauffeurId && c.zone?.toLowerCase() === source.zone?.toLowerCase()
    );
    if (memeZone.length > 0) {
      // Prioriser celui qui a le moins d'élèves sur ce voyage
      memeZone.sort((a, b) => {
        const nbA = resultat.parChauffeur[a.id]?.voyages[selectedVoyageId]?.placesUtilisees || 0;
        const nbB = resultat.parChauffeur[b.id]?.voyages[selectedVoyageId]?.placesUtilisees || 0;
        return nbA - nbB;
      });
      setDestChauffeurId(memeZone[0].id);
    } else {
      const autre = chauffeurs.find((c) => c.id !== sourceChauffeurId);
      if (autre) setDestChauffeurId(autre.id);
    }
  }, [sourceChauffeurId, selectedVoyageId, chauffeurs, resultat]);

  // Réinitialiser la sélection individuelle
  React.useEffect(() => {
    setSelectedEleveIds([]);
    setNombreEleves(1);
  }, [sourceChauffeurId, selectedVoyageId]);

  const sourceChauffeur = chauffeurs.find((c) => c.id === sourceChauffeurId);
  const destChauffeur = chauffeurs.find((c) => c.id === destChauffeurId);

  const elevesSourceVoyage = useMemo(() => {
    if (!sourceChauffeurId) return [];
    const ids = resultat.affectations
      .filter((a) => a.chauffeurId === sourceChauffeurId && a.voyageId === selectedVoyageId)
      .map((a) => a.eleveId);
    const elevesMap = new Map(eleves.map((e) => [e.id, e]));
    return ids.map((id) => elevesMap.get(id)!).filter(Boolean);
  }, [resultat, sourceChauffeurId, selectedVoyageId, eleves]);

  const maxTransferable = elevesSourceVoyage.length;

  const elevesSourceFiltres = useMemo(() => {
    if (!filtreRecherche.trim()) return elevesSourceVoyage;
    const q = filtreRecherche.toLowerCase();
    return elevesSourceVoyage.filter(
      (e) =>
        e.nom.toLowerCase().includes(q) ||
        e.prenom.toLowerCase().includes(q) ||
        e.zone.toLowerCase().includes(q)
    );
  }, [elevesSourceVoyage, filtreRecherche]);

  // Simulation en direct
  const nbTransfertReel =
    modeSelection === 'individuel'
      ? selectedEleveIds.length
      : Math.min(nombreEleves, maxTransferable);

  // Stats actuelles
  const sourceStatsActuelles = resultat.parChauffeur[sourceChauffeurId];
  const destStatsActuelles = destChauffeurId ? resultat.parChauffeur[destChauffeurId] : null;

  const sourceNbVoyageActuel =
    sourceStatsActuelles?.voyages[selectedVoyageId]?.placesUtilisees || 0;
  const destNbVoyageActuel =
    destStatsActuelles?.voyages[selectedVoyageId]?.placesUtilisees || 0;

  // Stats simulées
  const sourceTotalSimule = (sourceStatsActuelles?.totalEleves || 0) - nbTransfertReel;
  const destTotalSimule = (destStatsActuelles?.totalEleves || 0) + nbTransfertReel;

  const sourceTauxSimule = sourceStatsActuelles
    ? Math.min(1, Math.max(0, sourceTotalSimule / (sourceStatsActuelles.totalPlaces || 1)))
    : 0;
  const destTauxSimule = destStatsActuelles
    ? Math.min(1, Math.max(0, destTotalSimule / (destStatsActuelles.totalPlaces || 1)))
    : 0;

  const handleValider = () => {
    if (!sourceChauffeurId || !destChauffeurId || nbTransfertReel <= 0) return;

    onAppliquerTransfert({
      sourceChauffeurId,
      destinationChauffeurId: destChauffeurId,
      voyageId: selectedVoyageId,
      nombre: modeSelection === 'quantite' ? nbTransfertReel : undefined,
      eleveIds: modeSelection === 'individuel' ? selectedEleveIds : undefined,
    });
    onClose();
  };

  const toggleEleveSelection = (id: string) => {
    setSelectedEleveIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectTousFiltres = () => {
    setSelectedEleveIds(elevesSourceFiltres.map((e) => e.id));
  };

  const deselectTous = () => {
    setSelectedEleveIds([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* En-tête */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                Ajustement des affectations en temps réel
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Déplacez des élèves d'un chauffeur vers un autre pour équilibrer les taux de remplissage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-gray-800">
          {/* Étape 1 : Choix du Voyage / Créneau */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Choisir le créneau horaire à ajuster</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {VOYAGES.map((v) => {
                const isSelected = selectedVoyageId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVoyageId(v.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 bg-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-gray-900">{v.libelle}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{v.heure}</div>
                    <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                      {v.niveau ? `Niveau ${v.niveau}` : 'Tous niveaux'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Étape 2 : Chauffeur Source & Chauffeur Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Chauffeur Donneur (Source) */}
            <div className="bg-rose-50/40 border border-rose-200/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Chauffeur Donneur</span>
                  <span className="text-[10px] font-normal text-rose-600">(élèves en moins)</span>
                </span>
                <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                  {sourceNbVoyageActuel} élève(s)
                </span>
              </div>

              <select
                value={sourceChauffeurId}
                onChange={(e) => setSourceChauffeurId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {chauffeurs.map((c) => {
                  const stat = resultat.parChauffeur[c.id];
                  const nb = stat?.voyages[selectedVoyageId]?.placesUtilisees || 0;
                  const taux = Math.round((stat?.tauxGlobal || 0) * 100);
                  const isChLocked = chauffeurIdsVerrouilles?.has(c.id);
                  const isSlotLocked = emplacementsVerrouilles?.has(`${c.id}_${selectedVoyageId}`);
                  const lockPrefix = isChLocked
                    ? '🔒 [CHAUFFEUR FIGÉ] '
                    : isSlotLocked
                    ? '🔒 [CRÉNEAU FIGÉ] '
                    : '';
                  return (
                    <option key={c.id} value={c.id}>
                      {lockPrefix}{c.nom} ({c.zone}) - {nb} élève(s) sur ce voyage - Taux {taux}%
                    </option>
                  );
                })}
              </select>

              {sourceChauffeur && (
                <div className="text-xs text-rose-900/80 flex items-center justify-between pt-1">
                  <span>Zone : <strong>{sourceChauffeur.zone}</strong></span>
                  <span>Capacité : <strong>{sourceChauffeur.places} places</strong></span>
                </div>
              )}
            </div>

            {/* Chauffeur Receveur (Destination) */}
            <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Chauffeur Receveur</span>
                  <span className="text-[10px] font-normal text-emerald-600">(élèves en plus)</span>
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  {destNbVoyageActuel} élève(s)
                </span>
              </div>

              <select
                value={destChauffeurId}
                onChange={(e) => setDestChauffeurId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">Sélectionner un chauffeur receveur...</option>
                {chauffeurs
                  .filter((c) => c.id !== sourceChauffeurId)
                  .map((c) => {
                    const stat = resultat.parChauffeur[c.id];
                    const nb = stat?.voyages[selectedVoyageId]?.placesUtilisees || 0;
                    const dispo = Math.max(0, c.places - nb);
                    const taux = Math.round((stat?.tauxGlobal || 0) * 100);
                    const memeZone =
                      sourceChauffeur &&
                      c.zone?.toLowerCase() === sourceChauffeur.zone?.toLowerCase();
                    const isChLocked = chauffeurIdsVerrouilles?.has(c.id);
                    const isSlotLocked = emplacementsVerrouilles?.has(`${c.id}_${selectedVoyageId}`);
                    const lockPrefix = isChLocked
                      ? '🔒 [CHAUFFEUR FIGÉ] '
                      : isSlotLocked
                      ? '🔒 [CRÉNEAU FIGÉ] '
                      : '';
                    return (
                      <option key={c.id} value={c.id}>
                        {lockPrefix}{c.nom} ({c.zone}) {memeZone ? '★ Même zone' : ''} - Actuel: {nb}/{c.places} ({dispo} libres) - Taux {taux}%
                      </option>
                    );
                  })}
              </select>

              {destChauffeur && (
                <div className="text-xs text-emerald-900/80 flex items-center justify-between pt-1">
                  <span>Zone : <strong>{destChauffeur.zone}</strong></span>
                  <span>Places libres : <strong>{Math.max(0, destChauffeur.places - destNbVoyageActuel)}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Étape 3 : Mode de transfert (Quantité rapide ou sélection précise) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                3. Sélection des élèves à déplacer
              </label>
              <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-xs">
                <button
                  type="button"
                  onClick={() => setModeSelection('quantite')}
                  className={`px-3 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                    modeSelection === 'quantite'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Transfert rapide par nombre
                </button>
                <button
                  type="button"
                  onClick={() => setModeSelection('individuel')}
                  className={`px-3 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                    modeSelection === 'individuel'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sélection nominative
                </button>
              </div>
            </div>

            {modeSelection === 'quantite' ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Nombre d'élèves à déplacer vers {destChauffeur?.nom || 'le receveur'} :
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNombreEleves((n) => Math.max(1, n - 5))}
                      disabled={nombreEleves <= 1}
                      className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => setNombreEleves((n) => Math.max(1, n - 1))}
                      disabled={nombreEleves <= 1}
                      className="w-7 h-7 flex items-center justify-center font-bold bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="font-mono text-base font-bold text-gray-900 w-10 text-center">
                      {Math.min(nombreEleves, maxTransferable)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNombreEleves((n) => Math.min(maxTransferable, n + 1))}
                      disabled={nombreEleves >= maxTransferable}
                      className="w-7 h-7 flex items-center justify-center font-bold bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setNombreEleves((n) => Math.min(maxTransferable, n + 5))}
                      disabled={nombreEleves >= maxTransferable}
                      className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
                    >
                      +5
                    </button>
                  </div>
                </div>

                {maxTransferable > 0 && (
                  <div className="space-y-1">
                    <input
                      type="range"
                      min={1}
                      max={maxTransferable}
                      value={Math.min(nombreEleves, maxTransferable)}
                      onChange={(e) => setNombreEleves(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-gray-500">
                      <span>1 élève</span>
                      <span>{Math.floor(maxTransferable / 2)} élèves (50%)</span>
                      <span>{maxTransferable} élèves (Tous)</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Filtrer par nom, prénom, classe, adresse..."
                      value={filtreRecherche}
                      onChange={(e) => setFiltreRecherche(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <Filter className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                  </div>
                  <button
                    type="button"
                    onClick={selectTousFiltres}
                    className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg"
                  >
                    Tout cocher ({elevesSourceFiltres.length})
                  </button>
                  <button
                    type="button"
                    onClick={deselectTous}
                    className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg"
                  >
                    Effacer
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {elevesSourceFiltres.length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-500">
                      Aucun élève trouvé sur ce créneau pour ce chauffeur.
                    </div>
                  ) : (
                    elevesSourceFiltres.map((eleve) => {
                      const isSelected = selectedEleveIds.includes(eleve.id);
                      return (
                        <div
                          key={eleve.id}
                          onClick={() => toggleEleveSelection(eleve.id)}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-medium'
                              : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-100/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-gray-300 text-blue-600"
                            />
                            <div>
                              <div className="font-bold">
                                {eleve.nom} {eleve.prenom}
                              </div>
                              <div className="text-[10px] text-gray-500">
                                Niveau {eleve.niveau} • Zone {eleve.zone}
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">
                            {eleve.zone}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Étape 4 : Simulation de l'impact en temps réel (Avant / Après) */}
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Impact en temps réel ({nbTransfertReel} élève(s) déplacé(s))</span>
              </span>
              <span className="text-xs text-blue-200">
                Mise à jour instantanée des taux
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Donneur Avant / Après */}
              <div className="bg-white/10 rounded-xl p-3 space-y-2 border border-white/10">
                <div className="text-xs font-semibold text-rose-300">
                  {sourceChauffeur?.nom || 'Chauffeur Donneur'}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">Sur ce créneau :</span>
                  <span className="font-mono">
                    <span className="text-gray-400 line-through mr-1.5">{sourceNbVoyageActuel}</span>
                    <ArrowRight className="w-3 h-3 inline text-gray-400 mx-1" />
                    <span className="font-bold text-white">
                      {sourceNbVoyageActuel - nbTransfertReel}
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">Total élèves :</span>
                  <span className="font-mono">
                    <span className="text-gray-400 line-through mr-1.5">
                      {sourceStatsActuelles?.totalEleves || 0}
                    </span>
                    <ArrowRight className="w-3 h-3 inline text-gray-400 mx-1" />
                    <span className="font-bold text-white">{sourceTotalSimule}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                  <span className="text-gray-300 font-bold">Nouveau Taux global :</span>
                  <span className="font-mono font-bold text-amber-300">
                    {Math.round(sourceTauxSimule * 100)}%
                  </span>
                </div>
              </div>

              {/* Receveur Avant / Après */}
              <div className="bg-white/10 rounded-xl p-3 space-y-2 border border-white/10">
                <div className="text-xs font-semibold text-emerald-300">
                  {destChauffeur?.nom || 'Chauffeur Receveur'}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">Sur ce créneau :</span>
                  <span className="font-mono">
                    <span className="text-gray-400 line-through mr-1.5">{destNbVoyageActuel}</span>
                    <ArrowRight className="w-3 h-3 inline text-gray-400 mx-1" />
                    <span className="font-bold text-emerald-300">
                      {destNbVoyageActuel + nbTransfertReel}
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">Total élèves :</span>
                  <span className="font-mono">
                    <span className="text-gray-400 line-through mr-1.5">
                      {destStatsActuelles?.totalEleves || 0}
                    </span>
                    <ArrowRight className="w-3 h-3 inline text-gray-400 mx-1" />
                    <span className="font-bold text-emerald-300">{destTotalSimule}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                  <span className="text-gray-300 font-bold">Nouveau Taux global :</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {Math.round(destTauxSimule * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleValider}
            disabled={!destChauffeurId || nbTransfertReel <= 0}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Valider le déplacement de {nbTransfertReel} élève(s)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
