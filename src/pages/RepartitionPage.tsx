import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Bus, 
  Printer, 
  ArrowLeft,
  Clock,
  Sparkles,
  Info,
  ChevronRight,
  Download,
  FileText,
  UserCheck,
  Loader2,
  Cpu
} from 'lucide-react';
import { Eleve, Chauffeur, ResultatRepartition } from '../types';
import { repartir, estVoyageSans, obtenirEmplacementsSansVerrouilles } from '../utils/repartition';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/ui/badge';
import { exporterAffectationsExcel } from '../utils/excelExport';
import { exporterToutesListesPDF } from '../utils/pdfExport';
import { 
  transfererEleves, 
  autoEquilibrerTaux,
  ajusterNombreElevesDirect,
  VOYAGES,
  TransfertOptions,
  getStatsOptimisationVoyage
} from '../utils/repartition';
import { 
  ArrowRightLeft,
  RotateCcw,
  Plus,
  Minus,
  Check,
  Zap,
  Sliders,
  AlertCircle,
  Lock,
  Unlock,
  FileJson
} from 'lucide-react';
import { AjustementAffectationsModal } from '../components/AjustementAffectationsModal';
import { CelluleSaisieVoyage } from '../components/CelluleSaisieVoyage';
import { AtelierInterchangeDragDrop } from '../components/AtelierInterchangeDragDrop';
import { ModalImpressionRapport } from '../components/ModalImpressionRapport';
import { ModalConfigurationJSON } from '../components/ModalConfigurationJSON';
import { exporterRapportRecapitulatifPDF } from '../utils/pdfExport';
import { ConfigurationTransportJSON } from '../utils/configurationJson';

interface RepartitionPageProps {
  eleves: Eleve[];
  chauffeurs: Chauffeur[];
  resultat: ResultatRepartition | null;
  onResultat: (resultat: ResultatRepartition) => void;
  onNavigateToImport: () => void;
  onNavigateToListesChauffeur?: () => void;
  onNavigateToListesVoyage?: () => void;
  chauffeursVerrouilles?: Set<string>;
  emplacementsVerrouilles?: Set<string>;
  onToggleVerrouillerChauffeur?: (chauffeurId: string) => void;
  onToggleVerrouillerEmplacement?: (chauffeurId: string, voyageId: string) => void;
  onDeverrouillerTousChauffeurs?: () => void;
  onDeverrouillerTousEmplacements?: () => void;
  onSetEmplacementsVerrouilles?: (emplacements: Set<string>) => void;
  onAppliquerConfiguration?: (config: ConfigurationTransportJSON) => void;
  onNavigateToOptimisationIA?: () => void;
  scenarioActifNom?: string | null;
  onAnnulerDernierScenario?: () => void;
}

export const RepartitionPage: React.FC<RepartitionPageProps> = ({
  eleves,
  chauffeurs,
  resultat,
  onResultat,
  onNavigateToImport,
  onNavigateToListesChauffeur,
  onNavigateToListesVoyage,
  onNavigateToOptimisationIA,
  scenarioActifNom,
  onAnnulerDernierScenario,
  chauffeursVerrouilles: externalChauffeursVerrouilles,
  emplacementsVerrouilles: externalEmplacementsVerrouilles,
  onToggleVerrouillerChauffeur: externalToggleVerrouiller,
  onToggleVerrouillerEmplacement: externalToggleVerrouillerEmplacement,
  onDeverrouillerTousChauffeurs: externalDeverrouillerTous,
  onDeverrouillerTousEmplacements: externalDeverrouillerTousEmplacements,
  onSetEmplacementsVerrouilles: externalSetEmplacementsVerrouilles,
  onAppliquerConfiguration,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [modeVueRepartition, setModeVueRepartition] = useState<'tableau' | 'dragdrop'>('tableau');

  // États pour les ajustements en temps réel
  const [historique, setHistorique] = useState<ResultatRepartition[]>([]);
  const [isModalTransfertOpen, setIsModalTransfertOpen] = useState(false);
  const [chauffeurModalId, setChauffeurModalId] = useState<string>('');
  const [voyageModalId, setVoyageModalId] = useState<string>('APRES_MIDI_15H15');
  const [messageFlash, setMessageFlash] = useState<{ texte: string; type: 'success' | 'info' } | null>(null);

  // Ensemble des chauffeurs verrouillés (cadenas global 🔒)
  const [localChauffeursVerrouilles, setLocalChauffeursVerrouilles] = useState<Set<string>>(new Set());
  const chauffeursVerrouilles = externalChauffeursVerrouilles ?? localChauffeursVerrouilles;

  // Ensemble des emplacements individuels verrouillés (clé : `${chauffeurId}_${voyageId}`)
  const [localEmplacementsVerrouilles, setLocalEmplacementsVerrouilles] = useState<Set<string>>(new Set());
  const emplacementsVerrouilles = externalEmplacementsVerrouilles ?? localEmplacementsVerrouilles;

  // Option : verrouiller automatiquement un emplacement lors de la saisie d'un chiffre
  const [autoVerrouillerApresSaisie, setAutoVerrouillerApresSaisie] = useState<boolean>(true);

  // Modales d'impression et de configuration JSON
  const [isModalImpressionOpen, setIsModalImpressionOpen] = useState<boolean>(false);
  const [isModalConfigOpen, setIsModalConfigOpen] = useState<boolean>(false);
  const [isExportingRapportDirectPDF, setIsExportingRapportDirectPDF] = useState<boolean>(false);

  const handleExportRapportDirectPDF = async () => {
    if (!resultat) return;
    try {
      setIsExportingRapportDirectPDF(true);
      await exporterRapportRecapitulatifPDF(
        resultat,
        chauffeurs,
        eleves,
        chauffeursVerrouilles,
        emplacementsVerrouilles
      );
      afficherFlash('✓ Rapport officiel A4 Paysage généré et téléchargé en PDF.', 'success');
    } catch (err) {
      console.error('Erreur export direct rapport PDF:', err);
      afficherFlash('Erreur lors de la génération du rapport PDF.', 'info');
    } finally {
      setIsExportingRapportDirectPDF(false);
    }
  };

  const toggleVerrouillerChauffeur = (chauffeurId: string) => {
    const ch = chauffeurs.find((c) => c.id === chauffeurId);
    if (externalToggleVerrouiller) {
      externalToggleVerrouiller(chauffeurId);
      const isCurrentlyLocked = chauffeursVerrouilles.has(chauffeurId);
      if (isCurrentlyLocked) {
        afficherFlash(
          `🔓 Chauffeur ${ch?.nom || ''} déverrouillé. Il pourra à nouveau recevoir ou donner des élèves lors des équilibrages.`,
          'info'
        );
      } else {
        afficherFlash(
          `🔒 Chauffeur ${ch?.nom || ''} VERROUILLÉ ! Ses effectifs sont désormais figés et protégés contre les modifications des autres.`,
          'success'
        );
      }
    } else {
      setLocalChauffeursVerrouilles((prev) => {
        const next = new Set(prev);
        if (next.has(chauffeurId)) {
          next.delete(chauffeurId);
          afficherFlash(
            `🔓 Chauffeur ${ch?.nom || ''} déverrouillé. Il pourra à nouveau recevoir ou donner des élèves lors des équilibrages.`,
            'info'
          );
        } else {
          next.add(chauffeurId);
          afficherFlash(
            `🔒 Chauffeur ${ch?.nom || ''} VERROUILLÉ ! Ses effectifs sont désormais figés et protégés contre les modifications des autres.`,
            'success'
          );
        }
        return next;
      });
    }
  };

  const toggleVerrouillerEmplacement = (chauffeurId: string, voyageId: string) => {
    const cle = `${chauffeurId}_${voyageId}`;
    const ch = chauffeurs.find((c) => c.id === chauffeurId);
    const voyageLibelle = VOYAGES.find((v) => v.id === voyageId)?.libelle || voyageId;
    const isCurrentlyLocked = emplacementsVerrouilles.has(cle);

    if (externalToggleVerrouillerEmplacement) {
      externalToggleVerrouillerEmplacement(chauffeurId, voyageId);
    } else {
      setLocalEmplacementsVerrouilles((prev) => {
        const next = new Set(prev);
        if (next.has(cle)) {
          next.delete(cle);
        } else {
          next.add(cle);
        }
        return next;
      });
    }

    if (isCurrentlyLocked) {
      afficherFlash(
        `🔓 Créneau déverrouillé : ${ch?.nom || 'Chauffeur'} (${voyageLibelle}) est à nouveau ajustable lors des rééquilibrages.`,
        'info'
      );
    } else {
      afficherFlash(
        `🔒 Créneau VERROUILLÉ ! ${ch?.nom || 'Chauffeur'} (${voyageLibelle}) est figé : aucun élève ne lui sera ajouté ou retiré en modifiant les autres.`,
        'success'
      );
    }
  };

  const deverrouillerTousChauffeurs = () => {
    if (externalDeverrouillerTous) {
      externalDeverrouillerTous();
    } else {
      setLocalChauffeursVerrouilles(new Set());
    }
    afficherFlash('🔓 Tous les chauffeurs entiers ont été déverrouillés.', 'info');
  };

  const deverrouillerTousEmplacements = () => {
    if (externalDeverrouillerTousEmplacements) {
      externalDeverrouillerTousEmplacements();
    } else {
      setLocalEmplacementsVerrouilles(new Set());
    }
    afficherFlash('🔓 Tous les créneaux/emplacements ajustés ont été déverrouillés.', 'info');
  };

  const deverrouillerTout = () => {
    deverrouillerTousChauffeurs();
    deverrouillerTousEmplacements();
    afficherFlash('🔓 Tous les verrous (chauffeurs et créneaux) ont été retirés.', 'info');
  };

  // Initialisation automatique : verrouiller initialement les créneaux configurés "SANS" à 0
  const initialisationSansEffectueeRef = useRef<boolean>(false);
  useEffect(() => {
    if (chauffeurs.length > 0 && !initialisationSansEffectueeRef.current) {
      initialisationSansEffectueeRef.current = true;
      const sansLocks = obtenirEmplacementsSansVerrouilles(chauffeurs);
      if (sansLocks.size > 0) {
        const fusion = new Set([...Array.from(emplacementsVerrouilles), ...Array.from(sansLocks)]);
        if (fusion.size !== emplacementsVerrouilles.size) {
          if (externalSetEmplacementsVerrouilles) {
            externalSetEmplacementsVerrouilles(fusion);
          } else {
            setLocalEmplacementsVerrouilles(fusion);
          }
        }
      }
    }
  }, [chauffeurs]);

  const verrouillerToutesCellulesSans = () => {
    const sansLocks = obtenirEmplacementsSansVerrouilles(chauffeurs);
    const fusion = new Set([...Array.from(emplacementsVerrouilles), ...Array.from(sansLocks)]);
    if (externalSetEmplacementsVerrouilles) {
      externalSetEmplacementsVerrouilles(fusion);
    } else {
      setLocalEmplacementsVerrouilles(fusion);
    }
    afficherFlash(`🔒 ${sansLocks.size} créneau(x) configuré(s) 'SANS' verrouillé(s) à 0.`, 'info');
  };

  const afficherFlash = (texte: string, type: 'success' | 'info' = 'success') => {
    setMessageFlash({ texte, type });
    setTimeout(() => setMessageFlash(null), 4500);
  };

  const handleExportPDFComplet = async () => {
    if (!resultat) return;
    try {
      setIsExportingPDF(true);
      await exporterToutesListesPDF(resultat, chauffeurs);
    } catch (err) {
      console.error('Erreur export PDF complet:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const lancerRepartition = () => {
    setIsLoading(true);
    // Court délai fluide pour l'expérience utilisateur
    setTimeout(() => {
      const res = repartir(eleves, chauffeurs);
      setHistorique([]);
      onResultat(res);
      // Verrouiller initialement les cellules "SANS" avec 0 au compteur d'affectation
      const sansLocks = obtenirEmplacementsSansVerrouilles(chauffeurs);
      if (externalSetEmplacementsVerrouilles) {
        externalSetEmplacementsVerrouilles(sansLocks);
      } else {
        setLocalEmplacementsVerrouilles(sansLocks);
      }
      setIsLoading(false);
      afficherFlash('Répartition initiale calculée avec succès (cellules SANS verrouillées à 0)', 'success');
    }, 350);
  };

  // Annuler le dernier ajustement
  const handleAnnulerDernierAjustement = () => {
    if (historique.length === 0) return;
    const prev = historique[historique.length - 1];
    setHistorique((h) => h.slice(0, h.length - 1));
    onResultat(prev);
    afficherFlash('Dernier ajustement annulé. Affectations restaurées.', 'info');
  };

  // Appliquer un transfert manuel depuis la modale
  const handleAppliquerTransfert = (options: TransfertOptions) => {
    if (!resultat) return;
    setHistorique((h) => [...h, resultat]);

    const source = chauffeurs.find((c) => c.id === options.sourceChauffeurId);
    const dest = chauffeurs.find((c) => c.id === options.destinationChauffeurId);

    const nouveau = transfererEleves(resultat, eleves, chauffeurs, options);
    onResultat(nouveau);

    const sourceTaux = Math.round((nouveau.parChauffeur[options.sourceChauffeurId]?.tauxGlobal || 0) * 100);
    const destTaux = Math.round((nouveau.parChauffeur[options.destinationChauffeurId]?.tauxGlobal || 0) * 100);

    afficherFlash(
      `✓ Élèves déplacés de ${source?.nom || 'Source'} (${sourceTaux}%) vers ${dest?.nom || 'Dest'} (${destTaux}%) sur ce voyage.`,
      'success'
    );
  };

  // Auto-équilibrer en 1 clic pour résoudre les taux de 50%
  const handleAutoEquilibrer = () => {
    if (!resultat) return;
    setHistorique((h) => [...h, resultat]);

    const { nouveauResultat, totalDeplaces } = autoEquilibrerTaux(
      resultat,
      eleves,
      chauffeurs,
      chauffeursVerrouilles,
      emplacementsVerrouilles
    );
    onResultat(nouveauResultat);

    if (totalDeplaces > 0) {
      afficherFlash(
        `⚡ Équilibrage réussi : ${totalDeplaces} élève(s) replacé(s) en temps réel. Les taux des chauffeurs ont été harmonisés !`,
        'success'
      );
    } else {
      afficherFlash(
        `Les affectations sont déjà équilibrées ou aucune permutation supplémentaire n'est possible sans activer de nouvelles rotations.`,
        'info'
      );
    }
  };

  // Saisie directe d'un chiffre dans la cellule du tableau avec répartition équitable
  const handleSaisieDirecte = (chauffeurId: string, voyageId: string, nouveauNombre: number) => {
    if (!resultat) return;
    setHistorique((h) => [...h, resultat]);

    const res = ajusterNombreElevesDirect(
      resultat,
      eleves,
      chauffeurs,
      chauffeurId,
      voyageId,
      nouveauNombre,
      chauffeursVerrouilles,
      emplacementsVerrouilles
    );

    if (res.succes) {
      onResultat(res.nouveauResultat);

      // Si l'option de verrouillage automatique après ajustement est activée
      if (autoVerrouillerApresSaisie) {
        const cle = `${chauffeurId}_${voyageId}`;
        if (!emplacementsVerrouilles.has(cle)) {
          if (externalToggleVerrouillerEmplacement) {
            externalToggleVerrouillerEmplacement(chauffeurId, voyageId);
          } else {
            setLocalEmplacementsVerrouilles((prev) => new Set(prev).add(cle));
          }
        }
      }

      afficherFlash(res.message, 'success');
    } else {
      afficherFlash(res.message, 'info');
    }
  };

  // Transfert rapide unitaire (+1 ou -1) avec le même moteur d'équité
  const handleTransfertRapideUnitaire = (
    chauffeurId: string,
    voyageId: string,
    action: 'retirer' | 'ajouter'
  ) => {
    if (!resultat) return;
    const chStats = resultat.parChauffeur[chauffeurId];
    if (!chStats) return;

    const placesActuelles = chStats.voyages[voyageId]?.placesUtilisees || 0;
    const nouveauNombre = action === 'retirer' ? placesActuelles - 1 : placesActuelles + 1;

    handleSaisieDirecte(chauffeurId, voyageId, nouveauNombre);
  };

  const ouvrirModalPourChauffeur = (chId: string, vId: string = 'APRES_MIDI_15H15') => {
    setChauffeurModalId(chId);
    setVoyageModalId(vId);
    setIsModalTransfertOpen(true);
  };

  const totalPlaces = chauffeurs.reduce((s, c) => s + c.places, 0);

  // Statistiques d'optimisation précises par voyage (transports utilisés vs places)
  const statsM1 = getStatsOptimisationVoyage(resultat?.parVoyage['MATIN_1']);
  const statsM2 = getStatsOptimisationVoyage(resultat?.parVoyage['MATIN_2']);
  const statsS15 = getStatsOptimisationVoyage(resultat?.parVoyage['APRES_MIDI_15H15']);
  const statsS16 = getStatsOptimisationVoyage(resultat?.parVoyage['APRES_MIDI_16H00']);

  // Identifier les chauffeurs sous-utilisés (taux <= 55%)
  const chauffeursSousUtilises = resultat
    ? Object.values(resultat.parChauffeur).filter((r) => r.tauxGlobal <= 0.55)
    : [];

  return (
    <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Répartition automatique
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Affectation équilibrée des élèves par chauffeur, zone et voyage (2026-2027)
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateToImport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-xs cursor-pointer transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Modifier les données importées
        </button>
      </div>

      {/* Bannière de Scénario IA Actif */}
      {scenarioActifNom && resultat && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950 shadow-sm animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  Optimisation IA Appliquée
                </span>
                <span className="text-xs text-emerald-600">Grille mise à jour</span>
              </div>
              <p className="text-sm font-bold text-emerald-900 mt-0.5">
                Scénario : « {scenarioActifNom} »
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onNavigateToOptimisationIA && (
              <button
                type="button"
                onClick={onNavigateToOptimisationIA}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                Changer de scénario
              </button>
            )}

            {onAnnulerDernierScenario && (
              <button
                type="button"
                onClick={onAnnulerDernierScenario}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors"
                title="Rétablir la répartition précédente"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                Annuler l'optimisation
              </button>
            )}
          </div>
        </div>
      )}

      {/* État si aucune donnée n'est chargée */}
      {eleves.length === 0 || chauffeurs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Données requises non disponibles</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Pour exécuter l'algorithme de répartition, vous devez avoir chargé au moins une liste d'élèves et un tableau de chauffeurs.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToImport}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Aller à la page d'importation
          </button>
        </div>
      ) : (
        <>
          {/* Résumé des données disponibles avant / après calcul */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Élèves à répartir"
              value={eleves.length}
              subtitle="Inscrits au transport"
              icon={Users}
              color="blue"
            />
            <StatCard
              title="Chauffeurs disponibles"
              value={chauffeurs.length}
              subtitle="Véhicules opérationnels"
              icon={Bus}
              color="green"
            />
            <StatCard
              title="Capacité totale"
              value={totalPlaces}
              subtitle="Places par rotation simple"
              icon={Bus}
              color="purple"
            />
          </div>

          {/* Section d'action : Bouton de lancement */}
          <div className="bg-gradient-to-br from-blue-50/70 via-white to-slate-50 p-6 sm:p-8 rounded-2xl border border-blue-100/80 shadow-xs flex flex-col items-center text-center space-y-4">
            <div className="max-w-md">
              <h3 className="text-base font-bold text-gray-900">
                {resultat ? 'Répartition calculée' : 'Prêt pour le calcul des affectations'}
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                L'algorithme priorise la zone d'affectation du chauffeur, puis les élèves d'Aïn Sebaâ, en respectant les horaires de sortie (15h15 pour Niveau 1, 16h00 pour Niveau 2).
              </p>
            </div>

            <button
              id="btn-lancer-repartition"
              type="button"
              onClick={lancerRepartition}
              disabled={isLoading}
              className="px-7 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-sm sm:text-base shadow-md shadow-blue-500/25 transition-all cursor-pointer transform active:scale-95"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Calcul de répartition en cours...
                </>
              ) : resultat ? (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Recalculer la répartition
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  Lancer la répartition automatique
                </>
              )}
            </button>
          </div>

          {/* Résultats de la répartition */}
          {resultat && (
            <div className="space-y-8 animate-fadeIn">
              {/* Alertes & Diagnostics */}
              {resultat.statistiques.alertes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Alertes et diagnostics ({resultat.statistiques.alertes.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {resultat.statistiques.alertes.map((alerte, i) => {
                      const isError = alerte.severite === 'ERROR';
                      const isWarning = alerte.severite === 'WARNING';
                      return (
                        <div
                          key={i}
                          className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                            isError
                              ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                              : isWarning
                              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                              : 'bg-blue-50/80 border-blue-200 text-blue-900'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isError ? (
                              <AlertTriangle className="w-4 h-4 text-rose-600" />
                            ) : isWarning ? (
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                            ) : (
                              <Info className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                isError
                                  ? 'bg-rose-200/80 text-rose-950'
                                  : isWarning
                                  ? 'bg-amber-200/80 text-amber-950'
                                  : 'bg-blue-200/80 text-blue-950'
                              }`}>
                                {alerte.type.replace('_', ' ')}
                              </span>
                              <span className="text-xs font-semibold">{alerte.message}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Statistiques clés post-répartition */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  title="Élèves affectés"
                  value={resultat.statistiques.totalAffectations}
                  subtitle="Total des places attribuées"
                  icon={CheckCircle2}
                  color="green"
                />
                <StatCard
                  title="Élèves non affectés"
                  value={resultat.statistiques.elevesNonAffectes.length}
                  subtitle={
                    resultat.statistiques.elevesNonAffectes.length === 0
                      ? 'Tous les élèves sont pris en charge'
                      : 'Nécessitent un ajustement de rotation'
                  }
                  icon={AlertTriangle}
                  color={resultat.statistiques.elevesNonAffectes.length > 0 ? 'red' : 'green'}
                />
                <StatCard
                  title="Taux de remplissage global"
                  value={`${Math.round(
                    (resultat.statistiques.totalAffectations /
                      (chauffeurs.reduce((s, c) => s + c.places, 0) * 2 || 1)) *
                      100
                  )}%`}
                  subtitle="Moyenne matin & après-midi"
                  icon={Bus}
                  color="purple"
                />
              </div>

              {/* Raccourcis vers les listes et exports */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-blue-950 text-sm sm:text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Listes d'embarquement & Documents officiels prêts</span>
                  </h3>
                  <p className="text-xs text-blue-800">
                    Les affectations sont calculées. Vous pouvez consulter les listes nominatives avec émargement ou télécharger les documents PDF et Excel.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {onNavigateToOptimisationIA && (
                    <button
                      type="button"
                      onClick={onNavigateToOptimisationIA}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      title="Ouvrir le volet de recommandations et d'optimisation des trajets par IA"
                    >
                      <Cpu className="w-4 h-4" />
                      <span>Recommandations IA</span>
                    </button>
                  )}
                  {onNavigateToListesChauffeur && (
                    <button
                      type="button"
                      onClick={onNavigateToListesChauffeur}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Listes par chauffeur</span>
                    </button>
                  )}
                  {onNavigateToListesVoyage && (
                    <button
                      type="button"
                      onClick={onNavigateToListesVoyage}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Listes par voyage</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleExportPDFComplet}
                    disabled={isExportingPDF}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Télécharger l'ensemble des fiches chauffeurs au format PDF A4 avec émargement"
                  >
                    {isExportingPDF ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>{isExportingPDF ? 'Génération PDF...' : 'PDF Complet'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exporterAffectationsExcel(resultat, chauffeurs, eleves)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    title="Télécharger le classeur Excel complet"
                  >
                    <Download className="w-4 h-4" />
                    <span>Excel Global</span>
                  </button>
                </div>
              </div>

              {/* Taux d'Optimisation en Pourcentage par Voyage (Transports Utilisés vs Places) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span>Taux d'optimisation par voyage</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Calcul en pourcentage : (Nombre d'élèves transportés) ÷ (Nombre total de places des transports utilisés)
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      Flotte : {chauffeurs.length} bus ({chauffeurs.reduce((s, c) => s + c.places, 0)} pl.)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {VOYAGES.map((v) => {
                    const stats = getStatsOptimisationVoyage(resultat.parVoyage[v.id]);
                    const isHigh = stats.tauxOptimisation >= 80;
                    const isMedium = stats.tauxOptimisation >= 50;

                    return (
                      <div
                        key={v.id}
                        className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 transition-colors"
                      >
                        {/* En-tête de la carte */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="truncate">
                            <span className="text-xs font-bold text-slate-900 block truncate">{v.libelle}</span>
                            <span className="text-[10px] font-medium text-slate-500">{v.heure}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-xs font-black font-mono shrink-0 border ${
                              isHigh
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isMedium
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {stats.tauxOptimisation}%
                          </span>
                        </div>

                        {/* Jauge visuelle */}
                        <div className="space-y-1">
                          <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isHigh
                                  ? 'bg-emerald-500'
                                  : isMedium
                                  ? 'bg-blue-600'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, stats.tauxOptimisation)}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium px-0.5">
                            <span>0%</span>
                            <span>{stats.tauxOptimisation}% optimisé</span>
                            <span>100%</span>
                          </div>
                        </div>

                        {/* Détails du calcul */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-200/60 text-xs">
                          <div className="bg-white rounded-lg p-2 border border-slate-200/60">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                              Transports utilisés
                            </span>
                            <span className="text-xs font-bold text-slate-900 font-mono">
                              {stats.nbTransportsUtilises} bus
                            </span>
                          </div>
                          <div className="bg-white rounded-lg p-2 border border-slate-200/60">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                              Places mobilisées
                            </span>
                            <span className="text-xs font-bold text-slate-900 font-mono">
                              {stats.placesTransportsUtilises} pl.
                            </span>
                          </div>
                        </div>

                        {/* Formule explicite */}
                        <div className="text-[10.5px] text-slate-600 bg-white rounded-lg p-2 border border-slate-200/70 flex items-center justify-between">
                          <span className="font-semibold text-slate-800">
                            Élèves : <strong>{stats.totalEleves}</strong>
                          </span>
                          <span className="text-[10px] font-mono text-blue-700 font-bold">
                            {stats.totalEleves} ÷ {stats.placesTransportsUtilises || 1} = {stats.tauxOptimisation}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notification Flash des actions */}
              {messageFlash && (
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-xs animate-fadeIn ${
                    messageFlash.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-sm font-medium">
                    {messageFlash.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <Info className="w-5 h-5 text-blue-600 shrink-0" />
                    )}
                    <span>{messageFlash.texte}</span>
                  </div>
                  {historique.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAnnulerDernierAjustement}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors shadow-2xs cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Annuler
                    </button>
                  )}
                </div>
              )}

              {/* Sélecteur de mode post-répartition : Tableau vs Atelier Drag & Drop */}
              <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModeVueRepartition('tableau')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      modeVueRepartition === 'tableau'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Tableau de bord & Réglage direct</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModeVueRepartition('dragdrop')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      modeVueRepartition === 'dragdrop'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4 text-amber-300" />
                    <span>Atelier Drag & Drop (Interchanger élèves)</span>
                    <span className="text-[10px] bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-md font-extrabold uppercase">
                      Même Zone
                    </span>
                  </button>
                </div>
                <p className="text-xs text-slate-500 italic px-2">
                  {modeVueRepartition === 'dragdrop'
                    ? 'Glissez un élève sur un autre pour les permuter (condition : même zone)'
                    : 'Ajustez les effectifs directement avec équilibrage équitable'}
                </p>
              </div>

              {modeVueRepartition === 'dragdrop' ? (
                <AtelierInterchangeDragDrop
                  resultat={resultat}
                  eleves={eleves}
                  chauffeurs={chauffeurs}
                  chauffeursVerrouilles={chauffeursVerrouilles}
                  emplacementsVerrouilles={emplacementsVerrouilles}
                  onMettreAJourResultat={(nouveauResultat) => {
                    setHistorique((prev) => [...prev, resultat]);
                    onResultat(nouveauResultat);
                  }}
                  onToggleVerrouiller={toggleVerrouillerChauffeur}
                  onToggleVerrouillerEmplacement={toggleVerrouillerEmplacement}
                />
              ) : (
                <>
                  {/* Bandeau d'optimisation : Chauffeurs à 50% */}
                  <div className="bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-indigo-500/10 border border-amber-300/80 rounded-2xl p-5 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900">
                        Ajustement des taux d'affectation en temps réel
                      </h3>
                      {chauffeursSousUtilises.length > 0 && (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                          {chauffeursSousUtilises.length} chauffeur{chauffeursSousUtilises.length > 1 ? 's' : ''} à ~50%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 max-w-3xl leading-relaxed">
                      {chauffeursSousUtilises.length > 0 ? (
                        <>
                          Certains chauffeurs (<strong className="text-gray-900">{chauffeursSousUtilises.map((c) => c.chauffeur.nom).join(', ')}</strong>) ont une charge de 50%. Vous pouvez rééquilibrer en déplaçant des élèves d'un chauffeur vers un autre ou utiliser l'auto-équilibrage.
                        </>
                      ) : (
                        <>
                          Vous pouvez affiner à tout moment le pourcentage des affectations en déplaçant des élèves de plus ou de moins entre chauffeurs en temps réel.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {historique.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAnnulerDernierAjustement}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        title="Restaurer l'état précédent"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Annuler ({historique.length})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleAutoEquilibrer}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      title="Déplacer automatiquement des élèves vers les chauffeurs sous-utilisés (50%) au sein de leur zone (en respectant les créneaux verrouillés)"
                    >
                      <Zap className="w-4 h-4 fill-amber-200 text-amber-200" />
                      <span>Auto-équilibrer les taux</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => ouvrirModalPourChauffeur(chauffeursSousUtilises[0]?.chauffeur.id || chauffeurs[0]?.id || '')}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>Ajuster manuellement</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tableau récapitulatif par chauffeur */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900">
                        Récapitulatif des rotations par chauffeur
                      </h3>
                      {(chauffeursVerrouilles.size > 0 || emplacementsVerrouilles.size > 0) && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md shadow-2xs">
                          <Lock className="w-3 h-3 text-amber-700" />
                          {chauffeursVerrouilles.size} chauffeur(s), {emplacementsVerrouilles.size} créneau(x) figé(s)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 max-w-3xl leading-relaxed">
                      <span className="font-semibold text-blue-700">Saisie directe :</span> tapez directement un chiffre dans une cellule puis validez (Entrée) ou utilisez <span className="font-semibold text-gray-700">[-]</span> / <span className="font-semibold text-gray-700">[+]</span>.
                      <span className="inline-block mx-2 text-gray-300">|</span>
                      <span className="font-semibold text-amber-700">Verrouillage des créneaux 🔒 :</span> cliquez sur le <strong className="text-amber-900">cadenas individuel</strong> de chaque case pour verrouiller spécifiquement cette partie. Aucun élève ne sera ajouté ni retiré de ce créneau quand vous ajusterez les autres !
                    </p>

                    {/* Option Verrouillage Automatique */}
                    <div className="mt-2.5 flex items-center gap-2">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors">
                        <input
                          type="checkbox"
                          checked={autoVerrouillerApresSaisie}
                          onChange={(e) => setAutoVerrouillerApresSaisie(e.target.checked)}
                          className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500 cursor-pointer"
                        />
                        <span className="inline-flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-600" />
                          Verrouiller automatiquement l'emplacement lors de l'ajustement en chiffres
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {emplacementsVerrouilles.size > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 rounded-lg shadow-2xs">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{emplacementsVerrouilles.size} créneau(x) figé(s)</span>
                        <button
                          type="button"
                          onClick={deverrouillerTousEmplacements}
                          className="ml-1 text-amber-800 hover:text-amber-950 underline text-[11px] font-bold cursor-pointer"
                          title="Déverrouiller tous les emplacements individuels"
                        >
                          Libérer
                        </button>
                      </div>
                    )}

                    {chauffeursVerrouilles.size > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 rounded-lg shadow-2xs">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{chauffeursVerrouilles.size} chauffeur(s) figé(s)</span>
                        <button
                          type="button"
                          onClick={deverrouillerTousChauffeurs}
                          className="ml-1 text-amber-800 hover:text-amber-950 underline text-[11px] font-bold cursor-pointer"
                          title="Déverrouiller tous les chauffeurs"
                        >
                          Libérer
                        </button>
                      </div>
                    )}

                    {(chauffeursVerrouilles.size > 0 || emplacementsVerrouilles.size > 0) && (
                      <button
                        type="button"
                        onClick={deverrouillerTout}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg cursor-pointer transition-colors shadow-2xs"
                        title="Déverrouiller tous les chauffeurs et créneaux"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        Tout déverrouiller
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={verrouillerToutesCellulesSans}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer transition-colors shadow-2xs"
                      title="Verrouiller automatiquement tous les créneaux configurés 'SANS' à 0 élève"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      Verrouiller 'SANS' à 0
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsModalImpressionOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg cursor-pointer transition-colors shadow-2xs"
                      title="Aperçu, impression et export officiel du rapport A4"
                    >
                      <Printer className="w-3.5 h-3.5 text-gray-600" />
                      Imprimer le rapport
                    </button>

                    <button
                      type="button"
                      onClick={handleExportRapportDirectPDF}
                      disabled={isExportingRapportDirectPDF}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
                      title="Télécharger directement le rapport récapitulatif officiel A4 Paysage en PDF"
                    >
                      {isExportingRapportDirectPDF ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      Rapport PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsModalConfigOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg cursor-pointer transition-colors shadow-2xs"
                      title="Sauvegarder ou importer la configuration complète en JSON (avec modèle téléchargeable)"
                    >
                      <FileJson className="w-3.5 h-3.5 text-amber-600" />
                      Configuration JSON
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="py-3 px-2 text-center text-xs font-bold text-amber-700 uppercase tracking-wider w-12" title="Cadenas de verrouillage">
                          <Lock className="w-3.5 h-3.5 mx-auto text-amber-600" />
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Chauffeur
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Zone
                        </th>
                        <th className="py-3 px-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Places
                        </th>
                        <th className="py-3 px-4 text-center text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50/50">
                          <div className="flex flex-col items-center gap-0.5">
                            <span>Matin 1</span>
                            <span className="text-[10px] font-normal text-gray-500">08:30</span>
                            <span 
                              className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200"
                              title={`Taux d'optimisation : ${statsM1.totalEleves} élèves / ${statsM1.placesTransportsUtilises} places de ${statsM1.nbTransportsUtilises} transports utilisés`}
                            >
                              Opt. {statsM1.tauxOptimisation}% ({statsM1.nbTransportsUtilises} bus)
                            </span>
                          </div>
                        </th>
                        <th className="py-3 px-4 text-center text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50/50">
                          <div className="flex flex-col items-center gap-0.5">
                            <span>Matin 2</span>
                            <span className="text-[10px] font-normal text-gray-500">09:15</span>
                            <span 
                              className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200"
                              title={`Taux d'optimisation : ${statsM2.totalEleves} élèves / ${statsM2.placesTransportsUtilises} places de ${statsM2.nbTransportsUtilises} transports utilisés`}
                            >
                              Opt. {statsM2.tauxOptimisation}% ({statsM2.nbTransportsUtilises} bus)
                            </span>
                          </div>
                        </th>
                        <th className="py-3 px-4 text-center text-xs font-bold text-purple-700 uppercase tracking-wider bg-purple-50/50">
                          <div className="flex flex-col items-center gap-0.5">
                            <span>15h15</span>
                            <span className="text-[10px] font-normal text-gray-500">Niveau 1</span>
                            <span 
                              className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200"
                              title={`Taux d'optimisation : ${statsS15.totalEleves} élèves / ${statsS15.placesTransportsUtilises} places de ${statsS15.nbTransportsUtilises} transports utilisés`}
                            >
                              Opt. {statsS15.tauxOptimisation}% ({statsS15.nbTransportsUtilises} bus)
                            </span>
                          </div>
                        </th>
                        <th className="py-3 px-4 text-center text-xs font-bold text-purple-700 uppercase tracking-wider bg-purple-50/50">
                          <div className="flex flex-col items-center gap-0.5">
                            <span>16h00</span>
                            <span className="text-[10px] font-normal text-gray-500">Niveau 2</span>
                            <span 
                              className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200"
                              title={`Taux d'optimisation : ${statsS16.totalEleves} élèves / ${statsS16.placesTransportsUtilises} places de ${statsS16.nbTransportsUtilises} transports utilisés`}
                            >
                              Opt. {statsS16.tauxOptimisation}% ({statsS16.nbTransportsUtilises} bus)
                            </span>
                          </div>
                        </th>
                        <th className="py-3 px-4 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="py-3 px-4 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">
                          Taux global
                        </th>
                        <th className="py-3 px-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {Object.values(resultat.parChauffeur).map((r) => {
                        const m1 = r.voyages['MATIN_1']?.placesUtilisees || 0;
                        const m2 = r.voyages['MATIN_2']?.placesUtilisees || 0;
                        const s15 = r.voyages['APRES_MIDI_15H15']?.placesUtilisees || 0;
                        const s16 = r.voyages['APRES_MIDI_16H00']?.placesUtilisees || 0;
                        const pct = Math.round(r.tauxGlobal * 100);
                        const isUnderUtilized = pct <= 55;
                        const isLocked = chauffeursVerrouilles.has(r.chauffeur.id);

                        return (
                          <tr 
                            key={r.chauffeur.id} 
                            className={`transition-colors ${
                              isLocked
                                ? 'bg-amber-50/60 hover:bg-amber-50/80 border-l-4 border-l-amber-500'
                                : isUnderUtilized
                                ? 'bg-amber-50/20 hover:bg-amber-50/50'
                                : 'hover:bg-gray-50/60'
                            }`}
                          >
                            {/* Colonne Cadenas de verrouillage */}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => toggleVerrouillerChauffeur(r.chauffeur.id)}
                                className={`w-8 h-8 rounded-lg border inline-flex items-center justify-center transition-all cursor-pointer ${
                                  isLocked
                                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs hover:bg-amber-600 ring-2 ring-amber-300/60'
                                    : 'text-gray-300 hover:text-amber-700 hover:bg-amber-50 border-gray-200 hover:border-amber-300'
                                }`}
                                title={
                                  isLocked
                                    ? `🔒 ${r.chauffeur.nom} est VERROUILLÉ : ses effectifs sont figés et protégés. Cliquez pour déverrouiller.`
                                    : `🔓 Cliquer pour verrouiller ${r.chauffeur.nom} afin qu'il ne soit plus impacté par les modifications des autres.`
                                }
                              >
                                {isLocked ? (
                                  <Lock className="w-4 h-4 stroke-[2.5]" />
                                ) : (
                                  <Unlock className="w-4 h-4 stroke-[1.75]" />
                                )}
                              </button>
                            </td>

                            <td className="py-3.5 px-4 font-bold text-gray-900 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                  isLocked
                                    ? 'bg-amber-200 text-amber-900 ring-1 ring-amber-400'
                                    : isUnderUtilized
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {r.chauffeur.nom.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span>{r.chauffeur.nom}</span>
                                  {isLocked && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded shadow-2xs">
                                      <Lock className="w-2.5 h-2.5 text-amber-700" />
                                      FIGÉ
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs font-bold uppercase tracking-wide text-slate-700 whitespace-nowrap">
                              <span className="bg-slate-100 px-2 py-0.5 rounded">
                                {r.chauffeur.zone}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-semibold text-gray-700">
                              {r.chauffeur.places}
                            </td>

                            {/* Matin 1 */}
                            <CelluleSaisieVoyage
                              chauffeurId={r.chauffeur.id}
                              voyageId="MATIN_1"
                              valeur={m1}
                              capacite={r.chauffeur.places}
                              colorTheme="blue"
                              estEmplacementVerrouille={emplacementsVerrouilles.has(`${r.chauffeur.id}_MATIN_1`)}
                              chauffeurVerrouille={isLocked}
                              estOptionSans={estVoyageSans(r.chauffeur, 'MATIN_1')}
                              onToggleVerrouillerEmplacement={toggleVerrouillerEmplacement}
                              onAjusterDirect={handleSaisieDirecte}
                              onIncrementer={(chId, vId) => handleTransfertRapideUnitaire(chId, vId, 'ajouter')}
                              onDecrementer={(chId, vId) => handleTransfertRapideUnitaire(chId, vId, 'retirer')}
                            />

                            {/* Matin 2 */}
                            <CelluleSaisieVoyage
                              chauffeurId={r.chauffeur.id}
                              voyageId="MATIN_2"
                              valeur={m2}
                              capacite={r.chauffeur.places}
                              colorTheme="blue"
                              estEmplacementVerrouille={emplacementsVerrouilles.has(`${r.chauffeur.id}_MATIN_2`)}
                              chauffeurVerrouille={isLocked}
                              estOptionSans={estVoyageSans(r.chauffeur, 'MATIN_2')}
                              onToggleVerrouillerEmplacement={toggleVerrouillerEmplacement}
                              onAjusterDirect={handleSaisieDirecte}
                              onIncrementer={(chId, vId) => handleTransfertRapideUnitaire(chId, vId, 'ajouter')}
                              onDecrementer={(chId, vId) => handleTransfertRapideUnitaire(chId, vId, 'retirer')}
                            />

                            {/* 15h15 */}
                            <CelluleSaisieVoyage
                              chauffeurId={r.chauffeur.id}
                              voyageId="APRES_MIDI_15H15"
                              valeur={s15}
                              capacite={r.chauffeur.places}
                              colorTheme="purple"
                              estEmplacementVerrouille={emplacementsVerrouilles.has(`${r.chauffeur.id}_APRES_MIDI_15H15`)}
                              chauffeurVerrouille={isLocked}
                              estOptionSans={estVoyageSans(r.chauffeur, 'APRES_MIDI_15H15')}
                              onToggleVerrouillerEmplacement={toggleVerrouillerEmplacement}
                              onAjusterDirect={handleSaisieDirecte}
                              onIncrementer={(chId, vId) => handleTransfertRapideUnitaire(chId, vId, 'ajouter')}
                              onDecrementer={(chId, vId) => handleTransfertRapideUnitaire(chId, vId, 'retirer')}
                            />

                            {/* 16h00 */}
                            <CelluleSaisieVoyage
                              chauffeurId={r.chauffeur.id}
                              voyageId="APRES_MIDI_16H00"
                              valeur={s16}
                              capacite={r.chauffeur.places}
                              colorTheme="purple"
                              estEmplacementVerrouille={emplacementsVerrouilles.has(`${r.chauffeur.id}_APRES_MIDI_16H00`)}
                              chauffeurVerrouille={isLocked}
                              estOptionSans={estVoyageSans(r.chauffeur, 'APRES_MIDI_16H00')}
                              onToggleVerrouillerEmplacement={toggleVerrouillerEmplacement}
                              onAjusterDirect={handleSaisieDirecte}
                              onIncrementer={(chId, vId) => handleTransfertRapideUnitaire(chId, vId, 'ajouter')}
                              onDecrementer={(chId, vId) => handleTransfertRapideUnitaire(chId, vId, 'retirer')}
                            />

                            <td className="py-3.5 px-4 text-right font-bold text-gray-950 font-mono">
                              {r.totalEleves}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                {isUnderUtilized && (
                                  <span title="Taux de 50% : capacité sous-utilisée">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                  </span>
                                )}
                                <Badge
                                  variant={pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'secondary'}
                                  className={`font-mono text-xs font-bold ${
                                    isUnderUtilized ? 'bg-amber-100 text-amber-900 border-amber-300' : ''
                                  }`}
                                >
                                  {pct}%
                                </Badge>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => ouvrirModalPourChauffeur(r.chauffeur.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                                title="Déplacer des élèves vers ou depuis ce chauffeur"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                                <span>Ajuster</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={3} className="py-3 px-4 text-left font-bold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span>Taux d'optimisation par voyage</span>
                          </div>
                          <span className="text-[10px] font-normal text-slate-500 block">
                            Calcul : Élèves ÷ Places des transports utilisés
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-600 text-xs">
                          {totalPlaces} pl.
                        </td>
                        {/* Matin 1 */}
                        <td className="py-3 px-4 text-center bg-blue-50/30">
                          <div className="font-extrabold text-blue-950 text-xs">{statsM1.totalEleves} él.</div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {statsM1.nbTransportsUtilises} bus ({statsM1.placesTransportsUtilises} pl.)
                          </div>
                          <div className="mt-1">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black font-mono border ${
                              statsM1.tauxOptimisation >= 80 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                              statsM1.tauxOptimisation >= 50 ? 'bg-blue-100 text-blue-800 border-blue-200' :
                              'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {statsM1.tauxOptimisation}% opt.
                            </span>
                          </div>
                        </td>
                        {/* Matin 2 */}
                        <td className="py-3 px-4 text-center bg-blue-50/30">
                          <div className="font-extrabold text-blue-950 text-xs">{statsM2.totalEleves} él.</div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {statsM2.nbTransportsUtilises} bus ({statsM2.placesTransportsUtilises} pl.)
                          </div>
                          <div className="mt-1">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black font-mono border ${
                              statsM2.tauxOptimisation >= 80 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                              statsM2.tauxOptimisation >= 50 ? 'bg-blue-100 text-blue-800 border-blue-200' :
                              'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {statsM2.tauxOptimisation}% opt.
                            </span>
                          </div>
                        </td>
                        {/* 15h15 */}
                        <td className="py-3 px-4 text-center bg-purple-50/30">
                          <div className="font-extrabold text-purple-950 text-xs">{statsS15.totalEleves} él.</div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {statsS15.nbTransportsUtilises} bus ({statsS15.placesTransportsUtilises} pl.)
                          </div>
                          <div className="mt-1">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black font-mono border ${
                              statsS15.tauxOptimisation >= 80 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                              statsS15.tauxOptimisation >= 50 ? 'bg-purple-100 text-purple-800 border-purple-200' :
                              'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {statsS15.tauxOptimisation}% opt.
                            </span>
                          </div>
                        </td>
                        {/* 16h00 */}
                        <td className="py-3 px-4 text-center bg-purple-50/30">
                          <div className="font-extrabold text-purple-950 text-xs">{statsS16.totalEleves} él.</div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {statsS16.nbTransportsUtilises} bus ({statsS16.placesTransportsUtilises} pl.)
                          </div>
                          <div className="mt-1">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black font-mono border ${
                              statsS16.tauxOptimisation >= 80 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                              statsS16.tauxOptimisation >= 50 ? 'bg-purple-100 text-purple-800 border-purple-200' :
                              'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {statsS16.tauxOptimisation}% opt.
                            </span>
                          </div>
                        </td>
                        {/* Total */}
                        <td className="py-3 px-4 text-right font-black text-gray-950 font-mono text-sm">
                          {resultat.statistiques.totalAffectations}
                        </td>
                        {/* Taux global moyen */}
                        <td className="py-3 px-4 text-right">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black font-mono bg-slate-200 text-slate-900 border border-slate-300">
                            {Math.round(
                              ((statsM1.tauxOptimisation + statsM2.tauxOptimisation + statsS15.tauxOptimisation + statsS16.tauxOptimisation) / 4)
                            )}% moy.
                          </span>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Détails par voyage */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Répartition détaillée par voyage
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.values(resultat.parVoyage).map((voyage) => {
                    const voyageLibelles: Record<string, { titre: string; heure: string; niveau: string }> = {
                      MATIN_1: { titre: 'Matin 1', heure: '08:30', niveau: 'Tous niveaux' },
                      MATIN_2: { titre: 'Matin 2 (Rotation)', heure: '09:15', niveau: 'Aïn Sebaâ & Rotations' },
                      APRES_MIDI_15H15: { titre: 'Après-midi (15h15)', heure: '15:15', niveau: 'Niveau 1 uniquement' },
                      APRES_MIDI_16H00: { titre: 'Après-midi (16h00)', heure: '16:00', niveau: 'Niveau 2 uniquement' },
                    };
                    const meta = voyageLibelles[voyage.voyageId] || { titre: voyage.voyageId, heure: '—', niveau: '' };
                    const opt = getStatsOptimisationVoyage(voyage);

                    return (
                      <div
                        key={voyage.voyageId}
                        className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-900 text-sm">{meta.titre}</h4>
                              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                {meta.heure}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{meta.niveau}</p>
                          </div>
                          <div className="flex items-center gap-2.5 self-start sm:self-auto">
                            <div className="text-right">
                              <div className="text-xs text-gray-700 font-semibold">
                                {opt.totalEleves} élèves / {opt.placesTransportsUtilises} pl.
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {opt.nbTransportsUtilises} bus mobilisés
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono border ${
                              opt.tauxOptimisation >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              opt.tauxOptimisation >= 50 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {opt.tauxOptimisation}% opt.
                            </span>
                          </div>
                        </div>

                        {/* Bandeau indicateur du calcul d'optimisation */}
                        <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Bus className="w-3.5 h-3.5 text-blue-600" />
                            <span><strong>{opt.nbTransportsUtilises}</strong> transports utilisés</span>
                            <span className="text-slate-300">•</span>
                            <span><strong>{opt.placesTransportsUtilises}</strong> places mobilisées</span>
                          </div>
                          <div className="text-[11px] text-blue-800 font-medium">
                            Calcul : {opt.totalEleves} ÷ {opt.placesTransportsUtilises || 1} = <strong className="font-bold font-mono">{opt.tauxOptimisation}%</strong>
                          </div>
                        </div>

                        {/* Liste des chauffeurs assignés à ce voyage */}
                        <div className="space-y-2">
                          {voyage.chauffeurs.length === 0 ? (
                            <p className="text-xs text-gray-400 italic py-2">Aucun chauffeur programmé sur ce voyage.</p>
                          ) : (
                            voyage.chauffeurs.map((ch) => (
                              <div
                                key={ch.chauffeur.id}
                                className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-gray-50/70 border border-gray-100"
                              >
                                <div className="flex items-center gap-2">
                                  <Bus className="w-3.5 h-3.5 text-gray-500" />
                                  <span className="font-bold text-gray-800">{ch.chauffeur.nom}</span>
                                  <span className="text-[10px] text-gray-400 font-semibold uppercase">
                                    ({ch.chauffeur.zone})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900">
                                    {ch.placesUtilisees} / {ch.placesTotales} places
                                  </span>
                                  <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full ${
                                        ch.placesUtilisees > ch.placesTotales
                                          ? 'bg-red-500'
                                          : ch.placesUtilisees === ch.placesTotales
                                          ? 'bg-emerald-500'
                                          : 'bg-blue-500'
                                      }`}
                                      style={{
                                        width: `${Math.min(100, Math.round((ch.placesUtilisees / (ch.placesTotales || 1)) * 100))}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              </>
            )}
              {/* Modal d'ajustement en temps réel */}
              {resultat && isModalTransfertOpen && (
                <AjustementAffectationsModal
                  isOpen={isModalTransfertOpen}
                  onClose={() => setIsModalTransfertOpen(false)}
                  resultat={resultat}
                  eleves={eleves}
                  chauffeurs={chauffeurs}
                  sourceChauffeurIdInitial={chauffeurModalId}
                  voyageIdInitial={voyageModalId}
                  chauffeurIdsVerrouilles={chauffeursVerrouilles}
                  emplacementsVerrouilles={emplacementsVerrouilles}
                  onAppliquerTransfert={handleAppliquerTransfert}
                />
              )}

              {/* Modal Impression & Rapport officiel A4 */}
              {resultat && (
                <ModalImpressionRapport
                  isOpen={isModalImpressionOpen}
                  onClose={() => setIsModalImpressionOpen(false)}
                  resultat={resultat}
                  chauffeurs={chauffeurs}
                  eleves={eleves}
                  chauffeursVerrouilles={chauffeursVerrouilles}
                  emplacementsVerrouilles={emplacementsVerrouilles}
                />
              )}

              {/* Modal Configuration JSON (Export, Import, Modèle) */}
              <ModalConfigurationJSON
                isOpen={isModalConfigOpen}
                onClose={() => setIsModalConfigOpen(false)}
                eleves={eleves}
                chauffeurs={chauffeurs}
                resultat={resultat}
                chauffeursVerrouilles={chauffeursVerrouilles}
                emplacementsVerrouilles={emplacementsVerrouilles}
                onAppliquerConfiguration={(cfg) => {
                  if (onAppliquerConfiguration) {
                    onAppliquerConfiguration(cfg);
                  } else {
                    if (cfg.resultat) {
                      onResultat(cfg.resultat);
                    }
                  }
                  afficherFlash(`✓ Configuration JSON appliquée (${cfg.eleves.length} élèves, ${cfg.chauffeurs.length} chauffeurs).`, 'success');
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
