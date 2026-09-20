import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckSquare,
  Square,
  Zap,
  RotateCcw,
  Info,
  Users,
  Bus,
  ArrowRight,
  TrendingUp,
  Layers,
  Settings2,
  Fuel,
} from 'lucide-react';
import { Chauffeur, Eleve, ResultatRepartition } from '../types';
import {
  RecommandationZoneIA,
  AnalyseZonesIAResultat,
  analyserEtRecommanderZonesIA,
  appliquerRecommandationsZonesAuxChauffeurs,
} from '../utils/optimisationZonesIA';
import { obtenirToutesLesZonesDisponibles } from '../utils/repartition';

export interface VoletRecommandationsZonesIAProps {
  eleves: Eleve[];
  chauffeurs: Chauffeur[];
  resultat: ResultatRepartition;
  emplacementsVerrouilles?: Set<string>;
  pourcentagesVoyages?: Record<string, number>;
  onAppliquerChangementsZones: (
    nouveauxChauffeurs: Chauffeur[],
    recommandationsAppliquees: RecommandationZoneIA[]
  ) => void;
  isOpenParDefaut?: boolean;
}

export const VoletRecommandationsZonesIA: React.FC<VoletRecommandationsZonesIAProps> = ({
  eleves,
  chauffeurs,
  resultat,
  emplacementsVerrouilles,
  onAppliquerChangementsZones,
  isOpenParDefaut = false,
}) => {
  const [estDeplie, setEstDeplie] = useState<boolean>(isOpenParDefaut);
  const [maxZones, setMaxZones] = useState<number>(3);
  const [zoneCommune, setZoneCommune] = useState<string>('ain sebaa');
  const [filtreAction, setFiltreAction] = useState<'TOUS' | 'AJOUTER' | 'ENLEVER' | 'CONTINUITE' | 'ZONE_COMMUNE'>('TOUS');
  const [recsSelectionneesIds, setRecsSelectionneesIds] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // Obtenir la liste des zones pour la sélection
  const zonesDisponibles = useMemo(() => {
    return obtenirToutesLesZonesDisponibles(eleves, chauffeurs);
  }, [eleves, chauffeurs]);

  // Exécuter l'analyse IA dès que les élèves, chauffeurs, résultat ou options changent
  const analyse: AnalyseZonesIAResultat = useMemo(() => {
    return analyserEtRecommanderZonesIA(
      eleves,
      chauffeurs,
      resultat,
      emplacementsVerrouilles,
      {
        maxZonesParChauffeur: maxZones,
        zoneCommune: zoneCommune === 'none' ? undefined : zoneCommune,
      }
    );
  }, [eleves, chauffeurs, resultat, emplacementsVerrouilles, maxZones, zoneCommune]);

  // Initialiser les sélections par défaut sur les recommandations actives
  React.useEffect(() => {
    const ids = new Set(
      analyse.recommandations.filter((r) => r.selectionnee).map((r) => r.id)
    );
    setRecsSelectionneesIds(ids);
  }, [analyse]);

  const recommandationsFiltrees = useMemo(() => {
    return analyse.recommandations.filter((r) => {
      if (filtreAction === 'AJOUTER') return r.action === 'AJOUTER';
      if (filtreAction === 'ENLEVER') return r.action === 'ENLEVER';
      if (filtreAction === 'CONTINUITE') return r.categorie === 'CONTINUITE';
      if (filtreAction === 'ZONE_COMMUNE') return r.isZoneCommune || r.seuil60Concerne;
      return true;
    });
  }, [analyse.recommandations, filtreAction]);

  const toggleSelectRec = (id: string) => {
    setRecsSelectionneesIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    const allIds = new Set(recommandationsFiltrees.map((r) => r.id));
    setRecsSelectionneesIds((prev) => new Set([...prev, ...allIds]));
  };

  const deselectAll = () => {
    setRecsSelectionneesIds((prev) => {
      const next = new Set(prev);
      recommandationsFiltrees.forEach((r) => next.delete(r.id));
      return next;
    });
  };

  const nbSelectionnees = analyse.recommandations.filter((r) => recsSelectionneesIds.has(r.id)).length;
  const nbAjouts = analyse.recommandations.filter((r) => r.action === 'AJOUTER').length;
  const nbRetraits = analyse.recommandations.filter((r) => r.action === 'ENLEVER').length;

  const handleAppliquer = () => {
    const aAppliquer = analyse.recommandations.filter((r) => recsSelectionneesIds.has(r.id));
    if (aAppliquer.length === 0) return;

    setIsApplying(true);
    setTimeout(() => {
      const nouveauxChauffeurs = appliquerRecommandationsZonesAuxChauffeurs(chauffeurs, aAppliquer);
      onAppliquerChangementsZones(nouveauxChauffeurs, aAppliquer);
      setIsApplying(false);
    }, 250);
  };

  return (
    <div
      id="volet-recommandations-zones-ia"
      className="bg-white rounded-2xl border-2 border-purple-200/90 shadow-md overflow-hidden transition-all duration-300"
    >
      {/* ============================================================ */}
      {/* EN-TÊTE DU VOLET (TOUJOURS VISIBLE AVEC RÉSUMÉ ET BOUTON PLIANT) */}
      {/* ============================================================ */}
      <div
        onClick={() => setEstDeplie((prev) => !prev)}
        className="p-4 sm:p-5 bg-gradient-to-r from-purple-50 via-indigo-50/70 to-blue-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-purple-100/40 transition-colors select-none"
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-purple-950 tracking-tight flex items-center gap-2">
                <span>Volet Recommandation & Optimisation IA des Zones</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-200 text-purple-900 border border-purple-300 shadow-2xs">
                {analyse.recommandations.length} proposition{analyse.recommandations.length > 1 ? 's' : ''}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Zone originale préservée
              </span>
            </div>
            <p className="text-xs text-purple-800/90 mt-0.5 line-clamp-1 sm:line-clamp-none">
              Propositions d'ajouts ou de retraits de zones secondaires pour couvrir 100% des élèves et garantir le même chauffeur matin et après-midi.
            </p>
          </div>
        </div>

        {/* Badges synthétiques rapides et bouton de dépliement */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0 self-end md:self-center">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white/90 border border-purple-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <span className="text-emerald-600 font-extrabold">+{nbAjouts} ajouts</span>
            <span className="text-slate-300">|</span>
            <span className="text-amber-600 font-extrabold">-{nbRetraits} retraits</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-xs font-extrabold text-indigo-900 bg-indigo-100/90 px-3 py-1.5 rounded-xl border border-indigo-200">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-700" />
            <span>Continuité visée : {analyse.statistiquesPrevisionnelles.tauxContinuite}%</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEstDeplie((prev) => !prev);
            }}
            className="p-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 transition-colors cursor-pointer"
            title={estDeplie ? 'Replier le volet' : 'Déplier le volet'}
          >
            {estDeplie ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CONTENU DÉPLIÉ DU VOLET D'OPTIMISATION DES ZONES */}
      {/* ============================================================ */}
      {estDeplie && (
        <div className="p-4 sm:p-6 space-y-6 border-t border-purple-100 bg-slate-50/50">
          {/* Synthèse IA & Tableau de bord d'impact */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Carte 1 : Couverture des élèves */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  Couverture globale élèves
                </span>
                <span className="text-[11px] font-mono text-slate-400">Objectif 100%</span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {analyse.statistiquesActuelles.tauxCouverture}%
                  </span>
                  <span className="text-xs text-slate-500 ml-1.5">
                    ({analyse.statistiquesActuelles.elevesAffectes}/{analyse.statistiquesActuelles.totalEleves})
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-400" />
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-600 font-mono">
                    {analyse.statistiquesPrevisionnelles.tauxCouverture}%
                  </span>
                  <span className="text-xs font-bold text-emerald-700 block">
                    {analyse.statistiquesPrevisionnelles.elevesNonAffectes === 0
                      ? '0 non affecté 🎉'
                      : `${analyse.statistiquesPrevisionnelles.elevesNonAffectes} non affecté(s)`}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-slate-600 bg-blue-50/70 p-2 rounded-lg border border-blue-100 flex items-center justify-between">
                <span>Gain net prévu :</span>
                <span className="font-black text-blue-800 font-mono">
                  +{analyse.statistiquesPrevisionnelles.gainNetEleves} élève(s) pris en charge
                </span>
              </div>
            </div>

            {/* Carte 2 : Continuité Même Chauffeur */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Bus className="w-4 h-4 text-purple-600" />
                  Même chauffeur Matin & Après-midi
                </span>
                <span className="text-[11px] font-mono text-slate-400">Règle clé</span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {analyse.statistiquesActuelles.tauxContinuite}%
                  </span>
                  <span className="text-xs text-slate-500 ml-1.5">
                    ({analyse.statistiquesActuelles.elevesMemeChauffeur} élèves)
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-400" />
                <div className="text-right">
                  <span className="text-2xl font-black text-purple-700 font-mono">
                    {analyse.statistiquesPrevisionnelles.tauxContinuite}%
                  </span>
                  <span className="text-xs font-bold text-purple-800 block">
                    {analyse.statistiquesPrevisionnelles.elevesMemeChauffeur} élèves
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-slate-600 bg-purple-50/70 p-2 rounded-lg border border-purple-100 flex items-center justify-between">
                <span>Continuités sécurisées :</span>
                <span className="font-black text-purple-900 font-mono">
                  +{analyse.statistiquesPrevisionnelles.gainNetContinuite} élève(s)
                </span>
              </div>
            </div>

            {/* Carte 3 : Sanctuarisation Zone Originale */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Protection Zone Originale
                </span>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  Sanctuarisée
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                La zone originale de chaque chauffeur reste <strong>toujours prioritaire et intouchable</strong>. Seules les zones secondaires superflues peuvent être enlevées, et seules les zones où le chauffeur a de la capacité libre sont proposées à l'ajout.
              </p>
              <div className="text-[11px] text-emerald-800 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200 font-medium">
                ✓ Aucune zone d'origine de chauffeur n'est compromise.
              </div>
            </div>
          </div>

          {/* Synthèse textuelle de l'IA */}
          <div className="bg-purple-50/90 border border-purple-200 rounded-xl p-3.5 text-xs text-purple-950 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-extrabold uppercase tracking-wide text-[10.5px] text-purple-800 block">
                Diagnostic &amp; Recommandation Globale de l'IA
              </span>
              <p className="leading-relaxed">{analyse.syntheseIA}</p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* PARAMÈTRES IA : PLAFOND DE ZONES & ZONE COMMUNE (AÏN SEBAÂ) */}
          {/* ============================================================ */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <Settings2 className="w-3.5 h-3.5 text-purple-600" />
                Paramètres d'Optimisation IA des Zones
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Ajuste les propositions en direct (Max {maxZones} zones &bull; Hub {zoneCommune.toUpperCase()})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Max Zones */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-blue-600" />
                    <span>Max zones par chauffeur</span>
                  </span>
                  <span className="text-blue-700 font-bold text-xs font-mono">
                    {maxZones} max
                  </span>
                </label>
                <div className="grid grid-cols-5 gap-1 bg-slate-100 p-0.5 rounded-md">
                  {[1, 2, 3, 4, 5].map((nb) => (
                    <button
                      key={nb}
                      type="button"
                      onClick={() => setMaxZones(nb)}
                      className={`py-1 text-xs font-bold rounded transition-colors cursor-pointer text-center ${
                        maxZones === nb
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {nb}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 leading-none pt-0.5">
                  L'IA ne recommandera aucun ajout qui ferait dépasser ce plafond.
                </p>
              </div>

              {/* Zone Commune */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-indigo-600" />
                  <span>Zone commune (Hub de regroupement)</span>
                </label>
                <select
                  value={zoneCommune}
                  onChange={(e) => setZoneCommune(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="ain sebaa">
                    ⭐ AÏN SEBAÂ (Hub Principal Recommandé)
                  </option>
                  {zonesDisponibles
                    .filter((z) => z.nom !== 'ain sebaa')
                    .map((z) => (
                      <option key={z.nom} value={z.nom}>
                        {z.libelle} ({z.countEleves} élèves)
                      </option>
                    ))}
                  <option value="none">-- Aucune zone commune --</option>
                </select>
                <p className="text-[10px] text-slate-500 leading-none pt-0.5">
                  Utilisée pour combler les transports sous les 60% et regrouper les élèves.
                </p>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* BARRE D'ACTIONS ET FILTRES DES RECOMMANDATIONS */}
          {/* ============================================================ */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-b border-slate-200 pb-3">
            {/* Filtres par type */}
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Filtrer :
              </span>
              <button
                type="button"
                onClick={() => setFiltreAction('TOUS')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  filtreAction === 'TOUS'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                Toutes ({analyse.recommandations.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltreAction('CONTINUITE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  filtreAction === 'CONTINUITE'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>Continuité chauffeur</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 font-mono">
                  {analyse.recommandations.filter((r) => r.categorie === 'CONTINUITE').length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFiltreAction('AJOUTER')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  filtreAction === 'AJOUTER'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <Plus className="w-3 h-3" />
                <span>Ajouts de zones ({nbAjouts})</span>
              </button>
              <button
                type="button"
                onClick={() => setFiltreAction('ENLEVER')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  filtreAction === 'ENLEVER'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <Minus className="w-3 h-3" />
                <span>Retraits de zones ({nbRetraits})</span>
              </button>
              {analyse.recommandations.some((r) => r.isZoneCommune || r.seuil60Concerne) && (
                <button
                  type="button"
                  onClick={() => setFiltreAction('ZONE_COMMUNE')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    filtreAction === 'ZONE_COMMUNE'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  <span>Zone Commune ({analyse.recommandations.filter((r) => r.isZoneCommune || r.seuil60Concerne).length})</span>
                </button>
              )}
            </div>

            {/* Actions rapides de sélection & BOUTON D'APPLICATION */}
            <div className="flex items-center flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={selectAll}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Cocher toutes les propositions visibles"
              >
                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Tout cocher</span>
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Décocher toutes les propositions visibles"
              >
                <Square className="w-3.5 h-3.5 text-slate-400" />
                <span>Tout décocher</span>
              </button>

              {/* LE BOUTON D'APPLICATION MAJEUR */}
              <button
                id="btn-appliquer-recommandations-zones-ia"
                type="button"
                onClick={handleAppliquer}
                disabled={isApplying || nbSelectionnees === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                title="Appliquer immédiatement les modifications de zones aux chauffeurs et recalculer la répartition"
              >
                {isApplying ? (
                  <Zap className="w-4 h-4 animate-spin text-amber-300" />
                ) : (
                  <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                )}
                <span>
                  {isApplying
                    ? 'Application et recalcul en cours...'
                    : `Appliquer ${nbSelectionnees} modification(s) de zone à la répartition`}
                </span>
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* LISTE DES RECOMMANDATIONS DÉTAILLÉES */}
          {/* ============================================================ */}
          {recommandationsFiltrees.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200 text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-slate-800 text-sm">
                Aucune recommandation dans cette catégorie.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                La configuration actuelle pour ce filtre est déjà parfaitement optimisée.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {recommandationsFiltrees.map((rec) => {
                const isSelected = recsSelectionneesIds.has(rec.id);
                const isAjout = rec.action === 'AJOUTER';

                return (
                  <div
                    key={rec.id}
                    onClick={() => toggleSelectRec(rec.id)}
                    className={`rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? isAjout
                          ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                          : 'bg-amber-50/40 border-amber-300 shadow-xs'
                        : 'bg-white border-slate-200/80 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Ligne d'en-tête de la recommandation */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelectRec(rec.id);
                            }}
                            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
                          />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-extrabold text-slate-900">
                                {rec.chauffeurNom}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-0.5 ${
                                  isAjout
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                              >
                                {isAjout ? <Plus className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                                {isAjout ? 'Ajouter zone' : 'Enlever zone'}
                              </span>
                              {rec.categorie === 'CONTINUITE' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  Continuité
                                </span>
                              )}
                              {rec.isZoneCommune && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5" />
                                  Hub Commun
                                </span>
                              )}
                              {rec.seuil60Concerne && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
                                  <Fuel className="w-2.5 h-2.5" />
                                  Sauvetage &gt;60%
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                              Zone ciblée : <strong className="text-slate-800 uppercase">{rec.zone}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Voyage concerné */}
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
                          {rec.voyagesLibelles}
                        </span>
                      </div>

                      {/* Motif détaillé */}
                      <p className="text-xs text-slate-700 leading-relaxed bg-white/90 p-2.5 rounded-lg border border-slate-100">
                        {rec.motif}
                      </p>

                      {/* Badge Zone originale protégée */}
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-0.5">
                        <span className="flex items-center gap-1 text-slate-600">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Zone originale préservée :{' '}
                          <strong className="text-slate-800 uppercase">
                            {rec.zoneOriginaleChauffeur || 'Par défaut'}
                          </strong>
                        </span>
                        {rec.gainEstime.placesLibresActuelles > 0 && (
                          <span className="text-slate-500 font-mono">
                            {rec.gainEstime.placesLibresActuelles} pl. libres
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pied de la carte avec gains chiffrés */}
                    <div className="flex items-center justify-between border-t border-slate-200/80 pt-2 text-xs">
                      <div className="flex items-center gap-2">
                        {rec.gainEstime.elevesCouverture > 0 && (
                          <span className="text-emerald-700 font-bold bg-emerald-100/70 px-2 py-0.5 rounded">
                            +{rec.gainEstime.elevesCouverture} élève(s) couvert(s)
                          </span>
                        )}
                        {rec.gainEstime.elevesContinuite > 0 && (
                          <span className="text-purple-700 font-bold bg-purple-100/70 px-2 py-0.5 rounded">
                            +{rec.gainEstime.elevesContinuite} continuité(s)
                          </span>
                        )}
                        {rec.action === 'ENLEVER' && (
                          <span className="text-slate-600 font-medium italic">
                            Désencombrement du circuit
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[11px] font-bold ${
                          isSelected ? 'text-purple-700' : 'text-slate-400'
                        }`}
                      >
                        {isSelected ? '✓ Prêt à appliquer' : 'Désélectionné'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bouton de pied de page pour appliquer facilement */}
          {recommandationsFiltrees.length > 0 && (
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-purple-200 shadow-2xs">
              <div className="text-xs text-slate-600">
                <span>
                  <strong className="text-purple-900">{nbSelectionnees}</strong> modification(s) sélectionnée(s) sur{' '}
                  <strong>{analyse.recommandations.length}</strong>.
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  L'application actualise immédiatement les zones des chauffeurs et recalcule l'ensemble de la répartition avec vos curseurs de remplissage actuels.
                </span>
              </div>
              <button
                type="button"
                onClick={handleAppliquer}
                disabled={isApplying || nbSelectionnees === 0}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                <span>Appliquer à la répartition</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
