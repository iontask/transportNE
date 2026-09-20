import React, { useState } from 'react';
import { Layout, TabType } from './components/Layout';
import { ImportPage } from './pages/ImportPage';
import { ElevesPage } from './pages/ElevesPage';
import { ChauffeursPage } from './pages/ChauffeursPage';
import { RepartitionPage } from './pages/RepartitionPage';
import { ListesChauffeurPage } from './pages/ListesChauffeurPage';
import { ListesVoyagePage } from './pages/ListesVoyagePage';
import { OptimisationIAPage } from './pages/OptimisationIAPage';
import { Eleve, Chauffeur, ResultatRepartition } from './types';
import { repartir, obtenirEmplacementsSansVerrouilles } from './utils/repartition';
import { ConfigurationTransportJSON } from './utils/configurationJson';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('import');
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [chauffeursInitiaux, setChauffeursInitiaux] = useState<Chauffeur[]>([]);
  const [resultat, setResultat] = useState<ResultatRepartition | null>(null);
  const [chauffeursVerrouilles, setChauffeursVerrouilles] = useState<Set<string>>(new Set());
  const [emplacementsVerrouilles, setEmplacementsVerrouilles] = useState<Set<string>>(new Set());
  const [historiqueOptimisation, setHistoriqueOptimisation] = useState<ResultatRepartition[]>([]);
  const [scenarioActifNom, setScenarioActifNom] = useState<string | null>(null);

  const handleAppliquerScenario = (nouveauResultat: ResultatRepartition, nomScenario: string) => {
    if (resultat) {
      setHistoriqueOptimisation((prev) => [...prev, resultat]);
    }
    setResultat(nouveauResultat);
    setScenarioActifNom(nomScenario);
  };

  const handleAnnulerDernierScenario = () => {
    if (historiqueOptimisation.length === 0) return;
    const prev = historiqueOptimisation[historiqueOptimisation.length - 1];
    setHistoriqueOptimisation((h) => h.slice(0, h.length - 1));
    setResultat(prev);
    setScenarioActifNom(null);
  };

  const handleToggleVerrouillerChauffeur = (chauffeurId: string) => {
    setChauffeursVerrouilles((prev) => {
      const next = new Set(prev);
      if (next.has(chauffeurId)) {
        next.delete(chauffeurId);
      } else {
        next.add(chauffeurId);
      }
      return next;
    });
  };

  const handleToggleVerrouillerEmplacement = (chauffeurId: string, voyageId: string) => {
    const cle = `${chauffeurId}_${voyageId}`;
    setEmplacementsVerrouilles((prev) => {
      const next = new Set(prev);
      if (next.has(cle)) {
        next.delete(cle);
      } else {
        next.add(cle);
      }
      return next;
    });
  };

  const handleDeverrouillerTousChauffeurs = () => {
    setChauffeursVerrouilles(new Set());
  };

  const handleDeverrouillerTousEmplacements = () => {
    setEmplacementsVerrouilles(new Set());
  };

  const handleSetEmplacementsVerrouilles = (nouveauxEmplacements: Set<string>) => {
    setEmplacementsVerrouilles(nouveauxEmplacements);
  };

  const handleDeverrouillerTout = () => {
    setChauffeursVerrouilles(new Set());
    setEmplacementsVerrouilles(new Set());
  };

  const handleDataImported = (e: Eleve[], c: Chauffeur[]) => {
    setEleves(e);
    setChauffeurs(c);
    setChauffeursInitiaux(c);
    setResultat(null); // Réinitialiser le résultat de répartition lors d'un nouvel import
    setChauffeursVerrouilles(new Set());
    // Initialiser les créneaux 'SANS' avec un 0 verrouillé
    setEmplacementsVerrouilles(obtenirEmplacementsSansVerrouilles(c));
    setActiveTab('repartition'); // Naviguer directement vers la répartition
  };

  const handleResultat = (r: ResultatRepartition) => {
    setResultat(r);
  };

  const handleUpdateEleves = (updatedEleves: Eleve[]) => {
    setEleves(updatedEleves);
    // Si une répartition a déjà été calculée, on la recalcule pour refléter les modifications d'élèves
    if (resultat && chauffeurs.length > 0) {
      const nouveauResultat = repartir(updatedEleves, chauffeurs);
      setResultat(nouveauResultat);
    }
  };

  const handleUpdateChauffeurs = (updatedList: Chauffeur[]) => {
    setChauffeurs(updatedList);
    // Si une répartition a déjà été calculée avec des élèves, on recalcule automatiquement
    if (resultat && eleves.length > 0) {
      const nouveauResultat = repartir(eleves, updatedList);
      setResultat(nouveauResultat);
    }
  };

  const handleUpdateSingleChauffeur = (updated: Chauffeur) => {
    const updatedList = chauffeurs.map((c) => (c.id === updated.id ? updated : c));
    handleUpdateChauffeurs(updatedList);
  };

  const handleResetChauffeurs = () => {
    if (chauffeursInitiaux.length > 0) {
      handleUpdateChauffeurs(chauffeursInitiaux);
    }
  };

  const handleAppliquerConfiguration = (config: ConfigurationTransportJSON) => {
    setEleves(config.eleves);
    setChauffeurs(config.chauffeurs);
    setChauffeursInitiaux(config.chauffeurs);
    if (config.resultat) {
      setResultat(config.resultat);
    } else if (config.eleves.length > 0 && config.chauffeurs.length > 0) {
      const r = repartir(config.eleves, config.chauffeurs);
      setResultat(r);
    } else {
      setResultat(null);
    }
    setChauffeursVerrouilles(new Set(config.chauffeursVerrouilles || []));
    const sansLocks = obtenirEmplacementsSansVerrouilles(config.chauffeurs || []);
    const initialEmplacements = new Set([
      ...(config.emplacementsVerrouilles || []),
      ...Array.from(sansLocks),
    ]);
    setEmplacementsVerrouilles(initialEmplacements);
    setActiveTab('repartition');
  };

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      eleves={eleves}
      chauffeurs={chauffeurs}
      resultat={resultat}
      chauffeursVerrouilles={chauffeursVerrouilles}
      emplacementsVerrouilles={emplacementsVerrouilles}
      onDeverrouillerTout={handleDeverrouillerTout}
    >
      {activeTab === 'import' && (
        <ImportPage
          eleves={eleves}
          chauffeurs={chauffeurs}
          resultat={resultat}
          chauffeursVerrouilles={chauffeursVerrouilles}
          emplacementsVerrouilles={emplacementsVerrouilles}
          onDataImported={handleDataImported}
          onAppliquerConfiguration={handleAppliquerConfiguration}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeTab === 'repartition' && (
        <RepartitionPage
          eleves={eleves}
          chauffeurs={chauffeurs}
          resultat={resultat}
          onResultat={handleResultat}
          onUpdateChauffeurs={setChauffeurs}
          onNavigateToImport={() => setActiveTab('import')}
          onNavigateToListesChauffeur={() => setActiveTab('listes-chauffeur')}
          onNavigateToListesVoyage={() => setActiveTab('listes-voyage')}
          chauffeursVerrouilles={chauffeursVerrouilles}
          emplacementsVerrouilles={emplacementsVerrouilles}
          onToggleVerrouillerChauffeur={handleToggleVerrouillerChauffeur}
          onToggleVerrouillerEmplacement={handleToggleVerrouillerEmplacement}
          onDeverrouillerTousChauffeurs={handleDeverrouillerTousChauffeurs}
          onDeverrouillerTousEmplacements={handleDeverrouillerTousEmplacements}
          onSetEmplacementsVerrouilles={handleSetEmplacementsVerrouilles}
          onAppliquerConfiguration={handleAppliquerConfiguration}
          onNavigateToOptimisationIA={() => setActiveTab('optimisation-ia')}
          scenarioActifNom={scenarioActifNom}
          onAnnulerDernierScenario={handleAnnulerDernierScenario}
        />
      )}

      {activeTab === 'optimisation-ia' && (
        <OptimisationIAPage
          eleves={eleves}
          chauffeurs={chauffeurs}
          resultat={resultat}
          chauffeursVerrouilles={chauffeursVerrouilles}
          emplacementsVerrouilles={emplacementsVerrouilles}
          onAppliquerScenario={handleAppliquerScenario}
          onAnnulerDernierScenario={handleAnnulerDernierScenario}
          historiqueDisponible={historiqueOptimisation.length > 0}
          onNavigateToRepartition={() => setActiveTab('repartition')}
        />
      )}

      {activeTab === 'listes-chauffeur' && resultat && (
        <ListesChauffeurPage
          chauffeurs={chauffeurs}
          resultat={resultat}
          eleves={eleves}
          onNavigateToVoyage={() => setActiveTab('listes-voyage')}
        />
      )}

      {activeTab === 'listes-voyage' && resultat && (
        <ListesVoyagePage
          resultat={resultat}
          eleves={eleves}
          chauffeurs={chauffeurs}
          chauffeursVerrouilles={chauffeursVerrouilles}
          emplacementsVerrouilles={emplacementsVerrouilles}
          onToggleVerrouillerChauffeur={handleToggleVerrouillerChauffeur}
          onToggleVerrouillerEmplacement={handleToggleVerrouillerEmplacement}
          onResultat={handleResultat}
          onNavigateToChauffeur={() => setActiveTab('listes-chauffeur')}
          onNavigateToRepartition={() => setActiveTab('repartition')}
        />
      )}

      {activeTab === 'eleves' && (
        <ElevesPage
          eleves={eleves}
          onNavigateToImport={() => setActiveTab('import')}
          onUpdateEleves={handleUpdateEleves}
        />
      )}

      {activeTab === 'chauffeurs' && (
        <ChauffeursPage
          chauffeurs={chauffeurs}
          eleves={eleves}
          chauffeursInitiaux={chauffeursInitiaux}
          onUpdateChauffeur={handleUpdateSingleChauffeur}
          onUpdateChauffeurs={handleUpdateChauffeurs}
          onResetChauffeurs={handleResetChauffeurs}
          onNavigateToImport={() => setActiveTab('import')}
          onNavigateToRepartition={() => setActiveTab('repartition')}
          hasRepartition={resultat !== null}
        />
      )}
    </Layout>
  );
}
