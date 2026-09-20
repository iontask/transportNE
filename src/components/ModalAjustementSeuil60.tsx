import React, { useState, useMemo } from 'react';
import {
  X,
  Fuel,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  Info,
  Sliders,
  ShieldCheck,
  MapPin,
  Layers,
  Settings2,
  Check,
} from 'lucide-react';
import { Eleve, Chauffeur, ResultatRepartition } from '../types';
import {
  ajusterRemplissageSeuil60OuZero,
  BilanAjustementSeuil60,
  VOYAGES,
  obtenirToutesLesZonesDisponibles,
  TransportSauveZoneCommuneSeuil60,
} from '../utils/repartition';

interface ModalAjustementSeuil60Props {
  isOpen: boolean;
  onClose: () => void;
  resultat: ResultatRepartition;
  eleves: Eleve[];
  chauffeurs: Chauffeur[];
  emplacementsVerrouilles?: Set<string> | string[];
  chauffeursVerrouilles?: Set<string> | string[];
  onAppliquerAjustement: (
    nouveauResultat: ResultatRepartition,
    bilan: BilanAjustementSeuil60,
    nouveauxChauffeurs?: Chauffeur[]
  ) => void;
  onAnnulerDernierAjustement?: () => void;
  historiqueDisponible?: boolean;
}

export const ModalAjustementSeuil60: React.FC<ModalAjustementSeuil60Props> = ({
  isOpen,
  onClose,
  resultat,
  eleves,
  chauffeurs,
  emplacementsVerrouilles = new Set(),
  chauffeursVerrouilles = new Set(),
  onAppliquerAjustement,
  onAnnulerDernierAjustement,
  historiqueDisponible = false,
}) => {
  const [strict, setStrict] = useState<boolean>(true);
  const [seuilPct, setSeuilPct] = useState<number>(60);
  const [maxZones, setMaxZones] = useState<number>(3);
  const [zoneCommune, setZoneCommune] = useState<string>('ain sebaa');
  const [autoriserExtension, setAutoriserExtension] = useState<boolean>(true);
  const [ongletActif, setOngletActif] = useState<'apercu' | 'sauves' | 'details'>('apercu');

  // Obtenir toutes les zones disponibles pour la sélection
  const zonesDisponibles = useMemo(() => {
    return obtenirToutesLesZonesDisponibles(eleves, chauffeurs);
  }, [eleves, chauffeurs]);

  // Calculer la prévisualisation en temps réel du bilan
  const { nouveauResultat, bilan } = useMemo(() => {
    return ajusterRemplissageSeuil60OuZero(
      resultat,
      eleves,
      chauffeurs,
      emplacementsVerrouilles,
      chauffeursVerrouilles,
      {
        seuilRatio: seuilPct / 100,
        strictementSuperieur: strict,
        maxZonesParChauffeur: maxZones,
        zoneCommune: zoneCommune === 'none' ? null : zoneCommune,
        autoriserExtensionZoneCommune: autoriserExtension && zoneCommune !== 'none',
      }
    );
  }, [
    resultat,
    eleves,
    chauffeurs,
    emplacementsVerrouilles,
    chauffeursVerrouilles,
    seuilPct,
    strict,
    maxZones,
    zoneCommune,
    autoriserExtension,
  ]);

  if (!isOpen) return null;

  const handleConfirmer = () => {
    onAppliquerAjustement(nouveauResultat, bilan, bilan.nouveauxChauffeurs);
    onClose();
  };

  const nbSauves = bilan.transportsSauvesParZoneCommune?.length || 0;

  return (
    <div
      id="modal-ajustement-seuil-60"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* En-tête */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-200 shrink-0">
              <Fuel className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Ajustement Anti-Gaspillage Carburant
                </h2>
                <span className="bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  Seuil &gt; {seuilPct}% ou 0
                </span>
                <span className="bg-blue-400/20 text-blue-200 border border-blue-400/30 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  Max {maxZones} zone(s)
                </span>
                {zoneCommune !== 'none' && (
                  <span className="bg-indigo-400/20 text-indigo-200 border border-indigo-400/30 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Hub : {zoneCommune.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
                Règle : Tout voyage actif d'un transport sans la mention <strong>« SANS »</strong> doit atteindre un taux de remplissage de <strong>plus de {seuilPct}%</strong>, sinon il est <strong>mis à 0</strong> pour éviter de faire rouler un transport quasiment vide et gaspiller du carburant.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-emerald-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps défilable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800">
          {/* Cartes d'impact écologique et logistique */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold mb-1">
                <Fuel className="w-3.5 h-3.5 text-emerald-600" />
                <span>Carburant épargné</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-900 font-mono">
                ~{bilan.economieCarburantEstimeeLitres} L
              </div>
              <p className="text-[10px] text-emerald-700 mt-0.5">
                Sur la base de ~2,5 L par rotation évitée
              </p>
            </div>

            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-blue-800 text-xs font-bold mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>Rotations évitées</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-900 font-mono">
                {bilan.totalRotationsEvitees}
              </div>
              <p className="text-[10px] text-blue-700 mt-0.5">
                Transports quasi-vides ramenés à 0
              </p>
            </div>

            <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-teal-800 text-xs font-bold mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Transports &gt; {seuilPct}%</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-teal-900 font-mono">
                {bilan.totalTransportsAuDessus60}
              </div>
              <p className="text-[10px] text-teal-700 mt-0.5">
                Rotations validées et rentables
              </p>
            </div>

            <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-indigo-800 text-xs font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Sauvés via hub commun</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-indigo-900 font-mono">
                {nbSauves}
              </div>
              <p className="text-[10px] text-indigo-700 mt-0.5">
                Bus complétés sans être annulés
              </p>
            </div>
          </div>

          {/* Panneau de configuration des paramètres d'ajustement */}
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Paramètres d'Ajustement des Zones &amp; Seuil 60%
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Simulation recalculée en temps réel
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Paramètre 1 : Seuil de remplissage */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-slate-500" />
                  <span>Condition de seuil</span>
                </label>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setStrict(true)}
                    className={`flex-1 py-1 px-2 text-xs font-bold rounded-md transition-colors cursor-pointer text-center ${
                      strict
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Strictement supérieur à 60% (> 60%)"
                  >
                    &gt; {seuilPct}% (Strict)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStrict(false)}
                    className={`flex-1 py-1 px-2 text-xs font-bold rounded-md transition-colors cursor-pointer text-center ${
                      !strict
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Supérieur ou égal à 60% (>= 60%)"
                  >
                    &ge; {seuilPct}%
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  En dessous de ce seuil, le voyage passe à 0 pour éviter le gaspillage.
                </p>
              </div>

              {/* Paramètre 2 : Maximum de zones par chauffeur */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-blue-600" />
                    <span>Max zones par chauffeur</span>
                  </span>
                  <span className="text-blue-700 font-mono font-bold text-xs">
                    {maxZones} zone{maxZones > 1 ? 's' : ''}
                  </span>
                </label>
                <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-lg">
                  {[1, 2, 3, 4, 5].map((nb) => (
                    <button
                      key={nb}
                      type="button"
                      onClick={() => setMaxZones(nb)}
                      className={`py-1 text-xs font-bold rounded-md transition-colors cursor-pointer text-center ${
                        maxZones === nb
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                      title={`${nb} zone(s) maximum par chauffeur par voyage`}
                    >
                      {nb}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Plafond pour éviter les tournées trop longues et dispersées.
                </p>
              </div>

              {/* Paramètre 3 : Zone commune (ex: Aïn Sebaâ) */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-indigo-600" />
                  <span>Zone commune de regroupement</span>
                </label>
                <select
                  value={zoneCommune}
                  onChange={(e) => setZoneCommune(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
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
                <p className="text-[10px] text-slate-500 leading-tight">
                  Zone partagée utilisable pour combler les transports sous 60%.
                </p>
              </div>
            </div>

            {/* Interrupteur d'autorisation d'extension */}
            {zoneCommune !== 'none' && (
              <div className="flex items-center gap-2.5 bg-indigo-50/70 border border-indigo-200 rounded-lg p-2.5 text-xs">
                <input
                  type="checkbox"
                  id="chk-autoriser-zone-commune"
                  checked={autoriserExtension}
                  onChange={(e) => setAutoriserExtension(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <label
                  htmlFor="chk-autoriser-zone-commune"
                  className="text-slate-800 cursor-pointer font-medium select-none"
                >
                  <strong>Autoriser l'extension vers la zone commune ({zoneCommune.toUpperCase()}) :</strong>{' '}
                  Permet d'ajouter cette zone aux chauffeurs sous les 60% pour éviter qu'ils ne soient annulés (dans la limite de <strong>{maxZones} zones</strong> max).
                </label>
              </div>
            )}
          </div>

          {/* Onglets d'affichage */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setOngletActif('apercu')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  ongletActif === 'apercu'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Vue par voyage ({VOYAGES.length})
              </button>
              <button
                type="button"
                onClick={() => setOngletActif('sauves')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  ongletActif === 'sauves'
                    ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Sauvés par zone commune ({nbSauves})</span>
              </button>
              <button
                type="button"
                onClick={() => setOngletActif('details')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  ongletActif === 'details'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Transports mis à 0 ({bilan.transportsMisAZero.length})
              </button>
            </div>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              {bilan.totalElevesReassignes} élève(s) réaffecté(s)
            </span>
          </div>

          {/* Contenu de l'onglet Aperçu par voyage */}
          {ongletActif === 'apercu' && (
            <div className="space-y-4">
              {VOYAGES.map((v) => {
                const positifs = bilan.transportsAuDessus60.filter((t) => t.voyageId === v.id);
                const zeros = bilan.transportsMisAZero.filter((t) => t.voyageId === v.id);
                const sauvesVoyage = bilan.transportsSauvesParZoneCommune?.filter((s) => s.voyageId === v.id) || [];

                return (
                  <div
                    key={v.id}
                    className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{v.libelle}</span>
                        <span className="text-xs text-slate-500">({v.heure})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          {positifs.length} transport(s) &gt; {seuilPct}%
                        </span>
                        {sauvesVoyage.length > 0 && (
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {sauvesVoyage.length} sauvé(s)
                          </span>
                        )}
                        {zeros.length > 0 && (
                          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                            {zeros.length} mis à 0
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Transports validés > 60% */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                        <span className="font-bold text-slate-700 text-[11px] block uppercase tracking-wider">
                          Transports actifs (&gt; {seuilPct}%) :
                        </span>
                        {positifs.length === 0 ? (
                          <span className="text-slate-400 italic text-[11px]">
                            Aucun transport actif au-dessus de {seuilPct}%
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {positifs.map((p) => {
                              const estSauve = sauvesVoyage.some((s) => s.chauffeurId === p.chauffeurId);
                              return (
                                <div
                                  key={p.chauffeurId}
                                  className="flex items-center justify-between text-slate-700 bg-slate-50 px-2 py-1 rounded"
                                >
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="font-medium truncate">{p.chauffeurNom}</span>
                                    {estSauve && (
                                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1 py-0.2 rounded shrink-0">
                                        +Zone commune
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono font-bold text-emerald-700">
                                    {p.placesUtilisees}/{p.placesTotales} ({p.tauxPct}%)
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Transports mis à 0 */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                        <span className="font-bold text-slate-700 text-[11px] block uppercase tracking-wider">
                          Transports ramenés à 0 (Gaspillage évité) :
                        </span>
                        {zeros.length === 0 ? (
                          <span className="text-slate-400 italic text-[11px]">
                            Aucun transport quasi-vide à couper
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {zeros.map((z) => (
                              <div
                                key={z.chauffeurId}
                                className="flex items-center justify-between text-slate-700 bg-amber-50/70 border border-amber-200/60 px-2 py-1 rounded"
                              >
                                <span className="font-medium truncate">{z.chauffeurNom}</span>
                                <span className="text-amber-800 text-[11px] font-bold">
                                  {z.anciensEleves} él. ({z.ancienTauxPct}%) &rarr; 0 él.
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Contenu de l'onglet Transports sauvés par la zone commune */}
          {ongletActif === 'sauves' && (
            <div className="space-y-3">
              {nbSauves === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
                  <p className="font-bold text-slate-800">
                    Aucun transport n'a nécessité l'intégration de la zone commune
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Soit les transports dépassent déjà le seuil avec leurs propres zones, soit les chauffeurs concernés ont déjà atteint la limite maximale de {maxZones} zone(s).
                  </p>
                </div>
              ) : (
                <div className="border border-indigo-200 rounded-xl overflow-hidden bg-white">
                  <div className="p-3 bg-indigo-50/80 border-b border-indigo-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      {nbSauves} transport(s) sauvés de l'annulation grâce à la zone commune
                    </span>
                    <span className="text-[11px] text-indigo-700 font-semibold">
                      Limite respectée : &le; {maxZones} zones max
                    </span>
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                      <tr>
                        <th className="p-3">Chauffeur</th>
                        <th className="p-3">Voyage</th>
                        <th className="p-3">Remplissage avant</th>
                        <th className="p-3">Élèves ajoutés (Hub)</th>
                        <th className="p-3">Remplissage final</th>
                        <th className="p-3">Nb Zones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bilan.transportsSauvesParZoneCommune.map((s) => (
                        <tr key={`${s.chauffeurId}_${s.voyageId}`} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{s.chauffeurNom}</td>
                          <td className="p-3 text-slate-600">{s.voyageLibelle}</td>
                          <td className="p-3 font-mono text-amber-700 font-medium">
                            {s.placesOccupeesAvant} / {s.placesTotales} pl. ({Math.round((s.placesOccupeesAvant / s.placesTotales) * 100)}%)
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded font-bold text-[11px]">
                              +{s.elevesAjoutesZoneCommune} élèves ({s.zoneCommune})
                            </span>
                          </td>
                          <td className="p-3 font-mono text-emerald-700 font-bold">
                            {s.placesOccupeesApres} / {s.placesTotales} pl. ({s.tauxFinalPct}%)
                          </td>
                          <td className="p-3">
                            <span className="text-slate-600 font-medium">
                              {s.nbZonesFinales} / {maxZones} max
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Contenu de l'onglet Détails */}
          {ongletActif === 'details' && (
            <div className="space-y-3">
              {bilan.transportsMisAZero.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-800">
                    Aucun transport sous-rempli sous {seuilPct}% !
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Tous les chauffeurs effectuant des voyages sans la mention « SANS » dépassent déjà le seuil requis.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                      <tr>
                        <th className="p-3">Chauffeur</th>
                        <th className="p-3">Voyage</th>
                        <th className="p-3">Ancien remplissage</th>
                        <th className="p-3">Nouveau statut</th>
                        <th className="p-3">Réaffectation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bilan.transportsMisAZero.map((z) => (
                        <tr key={`${z.chauffeurId}_${z.voyageId}`} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{z.chauffeurNom}</td>
                          <td className="p-3 text-slate-600">{z.voyageLibelle}</td>
                          <td className="p-3 font-mono text-amber-700 font-bold">
                            {z.anciensEleves} / {z.placesTotales} pl. ({z.ancienTauxPct}%)
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                              0 élève (Économie carburant)
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">
                            {z.elevesReassignes > 0 ? (
                              <span className="text-blue-700 font-semibold">
                                {z.elevesReassignes} élève(s) replacé(s)
                              </span>
                            ) : (
                              <span className="text-slate-400">Aucun transfert</span>
                            )}
                            {z.elevesNonPlaces > 0 && (
                              <span className="text-amber-700 block text-[10px]">
                                ({z.elevesNonPlaces} non replacé(s))
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Note informative */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Sécurité &amp; Traçabilité :</strong> L'application de cet ajustement sauvegarde l'état actuel de votre répartition. Vous pourrez annuler à tout instant avec le bouton <strong>« Annuler »</strong>. Les créneaux et chauffeurs verrouillés avec un cadenas restent strictement protégés.
            </p>
          </div>
        </div>

        {/* Pied de page avec actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {historiqueDisponible && onAnnulerDernierAjustement && (
              <button
                type="button"
                onClick={onAnnulerDernierAjustement}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Annuler le dernier ajustement</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={handleConfirmer}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs sm:text-sm font-black transition-all shadow-md hover:shadow-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Fuel className="w-4 h-4 text-emerald-200" />
              <span>Appliquer l'ajustement (&gt; {seuilPct}% ou 0)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

