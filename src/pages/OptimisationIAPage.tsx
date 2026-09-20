import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Fuel, 
  Bus, 
  Scale, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle, 
  RefreshCw, 
  TrendingDown, 
  ShieldAlert, 
  Lock, 
  Layers, 
  RotateCcw,
  Check,
  ChevronRight,
  Info,
  Sliders,
  Cpu,
  ArrowUpRight
} from 'lucide-react';
import { Chauffeur, Eleve, ResultatRepartition } from '../types';
import { 
  ScenarioOptimisation, 
  RecommandationsIAResponse,
  calculerMetriquesRepartition,
  genererScenariosOptimisation 
} from '../utils/optimisationScenarios';
import { VoletRecommandationsZonesIA } from '../components/VoletRecommandationsZonesIA';
import { RecommandationZoneIA } from '../utils/optimisationZonesIA';
import { repartir, optimiserContinuiteMatinApresMidi, construireResultatDepuisAffectations, BilanAjustementSeuil60 } from '../utils/repartition';
import { ModalAjustementSeuil60 } from '../components/ModalAjustementSeuil60';

interface OptimisationIAPageProps {
  eleves: Eleve[];
  chauffeurs: Chauffeur[];
  resultat: ResultatRepartition | null;
  chauffeursVerrouilles: Set<string>;
  emplacementsVerrouilles: Set<string>;
  onAppliquerScenario: (nouveauResultat: ResultatRepartition, nomScenario: string) => void;
  onAnnulerDernierScenario?: () => void;
  historiqueDisponible?: boolean;
  onNavigateToRepartition: () => void;
  onUpdateChauffeurs?: (chauffeurs: Chauffeur[]) => void;
  onResultat?: (resultat: ResultatRepartition) => void;
}

export const OptimisationIAPage: React.FC<OptimisationIAPageProps> = ({
  eleves,
  chauffeurs,
  resultat,
  chauffeursVerrouilles,
  emplacementsVerrouilles,
  onAppliquerScenario,
  onAnnulerDernierScenario,
  historiqueDisponible = false,
  onNavigateToRepartition,
  onUpdateChauffeurs,
  onResultat,
}) => {
  const [scenarios, setScenarios] = useState<ScenarioOptimisation[]>([]);
  const [analyseGlobale, setAnalyseGlobale] = useState<string>('');
  const [diagnosticPointsFaibles, setDiagnosticPointsFaibles] = useState<string[]>([]);
  const [sourceAudit, setSourceAudit] = useState<'gemini' | 'algorithme_local'>('algorithme_local');
  const [chargement, setChargement] = useState<boolean>(false);
  const [scenarioSelectionneId, setScenarioSelectionneId] = useState<string>('carburant');
  const [scenarioAppliqueId, setScenarioAppliqueId] = useState<string | null>(null);
  const [messageSucces, setMessageSucces] = useState<string | null>(null);
  const [isModalSeuil60Open, setIsModalSeuil60Open] = useState<boolean>(false);

  const handleAppliquerAjustementSeuil60 = (
    nouveauResultat: ResultatRepartition,
    bilan: BilanAjustementSeuil60
  ) => {
    onAppliquerScenario(
      nouveauResultat,
      `Ajustement Seuil > 60% ou 0 (${bilan.totalRotationsEvitees} rotations évitées, ~${bilan.economieCarburantEstimeeLitres}L économisés)`
    );
    setMessageSucces(
      `Règle >60% ou 0 appliquée : ${bilan.totalRotationsEvitees} rotation(s) quasi-vide(s) mise(s) à 0, ~${bilan.economieCarburantEstimeeLitres} L de carburant épargnés !`
    );
  };

  const handleAppliquerChangementsZones = (
    nouveauxChauffeurs: Chauffeur[],
    recommandationsAppliquees: RecommandationZoneIA[]
  ) => {
    if (!resultat) return;
    if (onUpdateChauffeurs) {
      onUpdateChauffeurs(nouveauxChauffeurs);
    }
    const nouveauResultat = repartir(eleves, nouveauxChauffeurs);
    const affectationsOptimisees = optimiserContinuiteMatinApresMidi(
      nouveauResultat.affectations,
      eleves,
      nouveauxChauffeurs,
      emplacementsVerrouilles
    );
    const resultatFinal = construireResultatDepuisAffectations(
      eleves,
      nouveauxChauffeurs,
      affectationsOptimisees
    );

    if (onResultat) {
      onResultat(resultatFinal);
    } else {
      onAppliquerScenario(resultatFinal, 'Ajustement stratégique des zones IA');
    }

    const nbAjouts = recommandationsAppliquees.filter((r) => r.action === 'AJOUTER').length;
    const nbRetraits = recommandationsAppliquees.filter((r) => r.action === 'ENLEVER').length;

    setMessageSucces(
      `✓ ${recommandationsAppliquees.length} modification(s) de zones appliquées (${nbAjouts} ajouts, ${nbRetraits} retraits) ! Couverture élèves et continuité chauffeur recalculées.`
    );
  };

  // Charger les recommandations via l'API serveur ou le moteur local
  const chargerRecommandations = async () => {
    if (!resultat || eleves.length === 0 || chauffeurs.length === 0) return;
    setChargement(true);
    setMessageSucces(null);

    try {
      const response = await fetch('/api/recommandations-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eleves,
          chauffeurs,
          resultat,
          chauffeursVerrouilles: Array.from(chauffeursVerrouilles),
          emplacementsVerrouilles: Array.from(emplacementsVerrouilles),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.scenarios) {
          setScenarios(data.scenarios);
          setAnalyseGlobale(data.analyseGlobale || '');
          setDiagnosticPointsFaibles(data.diagnosticPointsFaibles || []);
          setSourceAudit(data.source || 'gemini');
          setChargement(false);
          return;
        }
      }
    } catch (err) {
      console.warn('API serveur inaccessible, calcul local des scénarios :', err);
    }

    // Repli de secours déterministe immédiat
    const scenariosLocaux = genererScenariosOptimisation(
      resultat,
      chauffeurs,
      eleves,
      chauffeursVerrouilles,
      emplacementsVerrouilles
    );
    const metriquesActuelles = calculerMetriquesRepartition(resultat, chauffeurs);

    setScenarios(scenariosLocaux);
    setSourceAudit('algorithme_local');
    setAnalyseGlobale(
      `Analyse logistique de la flotte (École AIN SEBAA) : ${metriquesActuelles.nbBusActifs} bus en circulation pour ${eleves.length} élèves. L'audit révèle des opportunités directes de regroupement géographique et de lissage de charge de travail entre chauffeurs.`
    );
    setDiagnosticPointsFaibles([
      `Surconsommation liée à des rotations doublons sur certaines zones adjacentes.`,
      `Écart de charge de travail de ${metriquesActuelles.ecartMaxMinEleves} élèves entre conducteurs.`,
      `Taux de remplissage moyen perfectible sans dépasser les capacités sécuritaires.`,
    ]);
    setChargement(false);
  };

  useEffect(() => {
    chargerRecommandations();
  }, [resultat]);

  if (!resultat) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Aucune répartition à optimiser</h2>
        <p className="text-slate-600 mb-6 max-w-md mx-auto text-sm">
          Veuillez d'abord générer la répartition initiale des élèves dans l'onglet « Répartition » pour permettre à l'IA d'analyser les trajets et l'équité.
        </p>
        <button
          onClick={onNavigateToRepartition}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
        >
          Aller à la Répartition
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const metriquesActuelles = calculerMetriquesRepartition(resultat, chauffeurs);
  const scenarioActif = scenarios.find((s) => s.id === scenarioSelectionneId) || scenarios[0];

  const handleAppliquer = (scenario: ScenarioOptimisation) => {
    onAppliquerScenario(scenario.resultatSimule, scenario.titre);
    setScenarioAppliqueId(scenario.id);
    setMessageSucces(`Le scénario « ${scenario.titre} » a été appliqué avec succès à votre répartition !`);
    // Naviguer automatiquement vers la grille de répartition pour visualiser les changements
    onNavigateToRepartition();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* En-tête de la page */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Cpu className="w-3.5 h-3.5" />
              Intelligence Logistique
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              sourceAudit === 'gemini' 
                ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              <Sparkles className="w-3 h-3" />
              {sourceAudit === 'gemini' ? 'Moteur Gemini 3.8 Flash' : 'Moteur Heuristique Multi-Critères'}
            </span>
            {(chauffeursVerrouilles.size > 0 || emplacementsVerrouilles.size > 0) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <Lock className="w-3 h-3" />
                {chauffeursVerrouilles.size + emplacementsVerrouilles.size} verrou(s) préservé(s)
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Volet de Recommandations & Optimisation IA
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Optimisez vos trajets en carburant, maîtrisez le nombre de transports mobilisés et assurez une équité de charge exemplaire entre tous vos chauffeurs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsModalSeuil60Open(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title="Ajustement anti-gaspillage : Mettre les voyages sans la mention 'SANS' à plus de 60% de remplissage par transport, sinon à 0 pour économiser le carburant"
          >
            <Fuel className="w-3.5 h-3.5 text-emerald-200" />
            <span>Règle &gt; 60% sinon 0</span>
          </button>

          {historiqueDisponible && onAnnulerDernierScenario && (
            <button
              onClick={onAnnulerDernierScenario}
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium transition-colors shadow-sm"
              title="Restaurer la répartition précédant l'application du dernier scénario"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Annuler l'optimisation
            </button>
          )}

          <button
            onClick={chargerRecommandations}
            disabled={chargement}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${chargement ? 'animate-spin' : ''}`} />
            {chargement ? 'Calcul en cours...' : 'Relancer l\'audit IA'}
          </button>
        </div>
      </div>

      {/* Message de succès après application */}
      {messageSucces && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-3 text-emerald-800 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            {messageSucces}
          </div>
          <button
            onClick={onNavigateToRepartition}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
          >
            Voir la grille
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bannière de Diagnostic & Analyse Globale */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md border border-slate-700 relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Diagnostic Opérationnel Synthétique
              </span>
              <p className="text-base text-slate-100 font-medium mt-1 leading-relaxed max-w-4xl">
                {analyseGlobale || 'Analyse en cours de génération...'}
              </p>
            </div>
          </div>

          {diagnosticPointsFaibles.length > 0 && (
            <div className="pt-2 border-t border-slate-700/60 grid grid-cols-1 md:grid-cols-3 gap-3">
              {diagnosticPointsFaibles.map((point, idx) => (
                <div key={idx} className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    !
                  </div>
                  <p className="text-xs text-slate-300 leading-snug">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Volet Recommandation et Optimisation IA des Zones */}
      {resultat && (
        <VoletRecommandationsZonesIA
          eleves={eleves}
          chauffeurs={chauffeurs}
          resultat={resultat}
          emplacementsVerrouilles={emplacementsVerrouilles}
          onAppliquerChangementsZones={handleAppliquerChangementsZones}
          isOpenParDefaut={true}
        />
      )}

      {/* Cartes d'Indicateurs Actuels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Carburant */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Consommation Estimée</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metriquesActuelles.consommationCarburantEstimeeLitres} L</span>
            <span className="text-xs text-slate-500">/ jour</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span className="font-semibold text-slate-700">~{Math.round(metriquesActuelles.consommationCarburantEstimeeLitres * 2.67)} kg</span> de CO2 émis par jour
          </div>
        </div>

        {/* Flotte */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mobilisation Flotte</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bus className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metriquesActuelles.nbBusActifs}</span>
            <span className="text-xs text-slate-500">/ {metriquesActuelles.nbBusTotal} bus en service</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Remplissage moyen : <span className="font-semibold text-slate-700">{metriquesActuelles.tauxRemplissageMoyenPct}%</span>
          </div>
        </div>

        {/* Équité Conducteurs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Score d'Équité</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metriquesActuelles.scoreEquite}</span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Écart max-min : <span className="font-semibold text-slate-700">{metriquesActuelles.ecartMaxMinEleves} élèves</span>
          </div>
        </div>

        {/* Verrous & Contraintes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verrous de Sécurité</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {chauffeursVerrouilles.size + emplacementsVerrouilles.size}
            </span>
            <span className="text-xs text-slate-500">éléments figés</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 truncate">
            {chauffeursVerrouilles.size} chauffeur(s) & {emplacementsVerrouilles.size} créneau(x)
          </div>
        </div>
      </div>

      {/* Sélecteur d'Onglets de Scénarios */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            Scénarios d'Optimisation Proposés par l'IA
          </h2>
          <span className="text-xs text-slate-500">Sélectionnez un scénario pour visualiser son impact</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarios.map((sc) => {
            const estActif = sc.id === scenarioSelectionneId;
            const estApplique = sc.id === scenarioAppliqueId;

            return (
              <div
                key={sc.id}
                onClick={() => setScenarioSelectionneId(sc.id)}
                className={`cursor-pointer rounded-2xl p-5 border text-left transition-all duration-200 relative ${
                  estActif 
                    ? 'bg-blue-50/50 border-blue-500 shadow-md ring-2 ring-blue-500/20' 
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                {estApplique && (
                  <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <Check className="w-3 h-3" />
                    Actif
                  </span>
                )}

                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    sc.id === 'carburant' ? 'bg-amber-100 text-amber-700' :
                    sc.id === 'flotte' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {sc.id === 'carburant' && <Fuel className="w-5 h-5" />}
                    {sc.id === 'flotte' && <Bus className="w-5 h-5" />}
                    {sc.id === 'equite' && <Scale className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">
                      {sc.titre}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {sc.id === 'carburant' ? 'Moins de km & CO2' :
                       sc.id === 'flotte' ? 'Moins de bus requis' : 'Charge équitable'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Économie Carburant :</span>
                    <span className="font-bold text-emerald-700">+{sc.metriques.economieCarburantPct}% ({sc.metriques.economieCarburantLitres} L)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Bus en réserve :</span>
                    <span className="font-bold text-blue-700">{sc.metriques.nbBusEconomises} bus</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Score Équité :</span>
                    <span className="font-bold text-purple-700">{sc.metriques.scoreEquite}/100</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Détail Complet du Scénario Sélectionné & Bouton d'Application */}
      {scenarioActif && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Header du scénario actif */}
          <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  scenarioActif.id === 'carburant' ? 'bg-amber-100 text-amber-800' :
                  scenarioActif.id === 'flotte' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  Scénario Recommandé
                </span>
                <span className="text-xs text-slate-500">• {scenarioActif.sousTitre}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {scenarioActif.titre}
              </h3>
              <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
                {scenarioActif.description}
              </p>
            </div>

            {/* Bouton d'application proéminent */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => handleAppliquer(scenarioActif)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Appliquer ce scénario
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Tableau comparatif Avant vs Après */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Bilan Comparatif : Situation Actuelle vs Scénario Proposé
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Métrique 1 : Carburant */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500 font-medium mb-1">Consommation journalière</div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-slate-400 line-through">{metriquesActuelles.consommationCarburantEstimeeLitres} L</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {Math.max(1, Math.round((metriquesActuelles.consommationCarburantEstimeeLitres - scenarioActif.metriques.economieCarburantLitres) * 10) / 10)} L
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg py-1 px-2 text-center">
                    Économie de {scenarioActif.metriques.economieCarburantLitres} L ({scenarioActif.metriques.economieCarburantPct}%)
                  </div>
                </div>

                {/* Métrique 2 : Flotte mobilisée */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500 font-medium mb-1">Bus en circulation requise</div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-slate-400 line-through">{metriquesActuelles.nbBusActifs} bus</span>
                    <span className="text-lg font-bold text-blue-600">
                      {scenarioActif.metriques.nbBusActifs} bus
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg py-1 px-2 text-center">
                    {scenarioActif.metriques.nbBusEconomises} bus en réserve / maintenance
                  </div>
                </div>

                {/* Métrique 3 : Équité et charge */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500 font-medium mb-1">Écart max de charge conducteurs</div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-slate-400 line-through">{metriquesActuelles.ecartMaxMinEleves} élèves</span>
                    <span className="text-lg font-bold text-purple-600">
                      {scenarioActif.metriques.ecartMaxMinEleves} élèves
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-purple-700 bg-purple-50 rounded-lg py-1 px-2 text-center">
                    Score d'équité : {scenarioActif.metriques.scoreEquite}/100
                  </div>
                </div>
              </div>
            </div>

            {/* Points forts */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Bénéfices et Garanties Logistiques
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {scenarioActif.pointsForts.map((pt, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modifications opérationnelles précises */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                <span>Détail des Ajustements d'Affectation Proposés</span>
                <span className="text-[11px] font-normal text-slate-400">
                  {scenarioActif.actionsRecommandees.length} ajustement(s) planifié(s)
                </span>
              </h4>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                {scenarioActif.actionsRecommandees.map((action, idx) => (
                  <div key={idx} className="p-3.5 bg-white hover:bg-slate-50 flex items-start gap-3 text-xs">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 font-bold mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-800 font-medium">
                        {action.description}
                      </p>
                      {action.voyageNom && (
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-600">
                            {action.voyageNom}
                          </span>
                          {action.sourceChauffeurNom && action.cibleChauffeurNom && (
                            <span>
                              {action.sourceChauffeurNom} ➔ {action.cibleChauffeurNom}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajustement Seuil > 60% ou 0 (Carburant) */}
      {resultat && (
        <ModalAjustementSeuil60
          isOpen={isModalSeuil60Open}
          onClose={() => setIsModalSeuil60Open(false)}
          resultat={resultat}
          eleves={eleves}
          chauffeurs={chauffeurs}
          emplacementsVerrouilles={emplacementsVerrouilles}
          chauffeursVerrouilles={chauffeursVerrouilles}
          onAppliquerAjustement={handleAppliquerAjustementSeuil60}
          onAnnulerDernierAjustement={onAnnulerDernierScenario}
          historiqueDisponible={historiqueDisponible}
        />
      )}
    </div>
  );
};
