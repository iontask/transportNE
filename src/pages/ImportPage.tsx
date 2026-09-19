import React, { useState } from 'react';
import { 
  Users, 
  Bus, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Download, 
  Sparkles, 
  RefreshCw,
  Info,
  FileJson
} from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { StatCard } from '../components/StatCard';
import { importerEleves, importerChauffeurs, telechargerModeleExcel } from '../utils/excelImport';
import { calculerStatistiques, detecterDeficits, getSampleEleves, getSampleChauffeurs } from '../utils/statistics';
import { Eleve, Chauffeur, ResultatRepartition } from '../types';
import { ModalConfigurationJSON } from '../components/ModalConfigurationJSON';
import { telechargerModeleConfigurationJSON, ConfigurationTransportJSON } from '../utils/configurationJson';

interface ImportPageProps {
  eleves: Eleve[];
  chauffeurs: Chauffeur[];
  resultat?: ResultatRepartition | null;
  chauffeursVerrouilles?: Set<string>;
  emplacementsVerrouilles?: Set<string>;
  onDataImported: (eleves: Eleve[], chauffeurs: Chauffeur[]) => void;
  onAppliquerConfiguration?: (config: ConfigurationTransportJSON) => void;
  onNavigateTab: (tab: 'eleves' | 'chauffeurs' | 'repartition') => void;
}

export const ImportPage: React.FC<ImportPageProps> = ({ 
  eleves: currentEleves, 
  chauffeurs: currentChauffeurs, 
  resultat,
  chauffeursVerrouilles = new Set(),
  emplacementsVerrouilles = new Set(),
  onDataImported,
  onAppliquerConfiguration,
  onNavigateTab
}) => {
  const [elevesFile, setElevesFile] = useState<File | null>(null);
  const [chauffeursFile, setChauffeursFile] = useState<File | null>(null);
  const [eleves, setEleves] = useState<Eleve[]>(currentEleves);
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>(currentChauffeurs);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [isModalJSONOpen, setIsModalJSONOpen] = useState(false);

  const handleImport = async () => {
    setIsLoading(true);
    setErrors([]);
    setWarnings([]);
    setImportSuccessMessage(null);

    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    let importedEleves: Eleve[] = eleves;
    let importedChauffeurs: Chauffeur[] = chauffeurs;

    if (elevesFile) {
      const result = await importerEleves(elevesFile);
      if (result.success) {
        importedEleves = result.data;
        setEleves(result.data);
      }
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    if (chauffeursFile) {
      const result = await importerChauffeurs(chauffeursFile);
      if (result.success) {
        importedChauffeurs = result.data;
        setChauffeurs(result.data);
      }
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    setErrors(allErrors);
    setWarnings(allWarnings);
    setIsLoading(false);

    if (importedEleves.length > 0 || importedChauffeurs.length > 0) {
      onDataImported(importedEleves, importedChauffeurs);
      if (allErrors.length === 0) {
        setImportSuccessMessage(
          `Importation réussie : ${importedEleves.length} élèves et ${importedChauffeurs.length} chauffeurs pris en compte.`
        );
      }
    }
  };

  const handleLoadSampleData = () => {
    const sampleEleves = getSampleEleves();
    const sampleChauffeurs = getSampleChauffeurs();
    setEleves(sampleEleves);
    setChauffeurs(sampleChauffeurs);
    setErrors([]);
    setWarnings([]);
    setImportSuccessMessage('Jeu de données de démonstration chargé avec succès ! (28 élèves, 7 chauffeurs)');
    onDataImported(sampleEleves, sampleChauffeurs);
  };

  const stats = eleves.length > 0 && chauffeurs.length > 0
    ? calculerStatistiques(eleves, chauffeurs)
    : null;

  const deficits = stats ? detecterDeficits(stats) : [];

  return (
    <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header section with Action tools */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Import des données
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Importez les fichiers Excel des élèves et des chauffeurs pour configurer le transport scolaire
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="btn-load-sample"
            onClick={handleLoadSampleData}
            className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            Charger données de test
          </button>
          
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => telechargerModeleExcel('eleves')}
              title="Télécharger le modèle Excel pour élèves"
              className="px-3 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              Modèle Élèves
            </button>
            <button
              type="button"
              onClick={() => telechargerModeleExcel('chauffeurs')}
              title="Télécharger le modèle Excel pour chauffeurs"
              className="px-3 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              Modèle Chauffeurs
            </button>
            <button
              type="button"
              onClick={telechargerModeleConfigurationJSON}
              title="Télécharger le modèle de configuration JSON officiel pour transport scolaire"
              className="px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span>Modèle JSON</span>
            </button>
            <button
              type="button"
              onClick={() => setIsModalJSONOpen(true)}
              title="Importer ou exporter la configuration globale en JSON"
              className="px-3 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-600" />
              <span>Config JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bannière Dédiée Configuration JSON Globale */}
      <div className="bg-gradient-to-r from-amber-50/90 via-slate-50 to-blue-50/90 p-5 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <FileJson className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Configuration Complète en JSON</h3>
              <span className="text-[10px] font-bold bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                Sauvegarde globale
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Enregistrez ou restaurez d'un simple clic l'état complet du système : liste des élèves, parc des chauffeurs, 
              verrous de sécurité et calculs de répartition. Un fichier modèle prêt à l'emploi est également disponible.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={telechargerModeleConfigurationJSON}
            className="px-3 py-2 text-xs font-semibold text-amber-900 bg-white hover:bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Télécharger le modèle de configuration JSON officiel"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span>Modèle JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalJSONOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Importer / Exporter JSON</span>
          </button>
        </div>
      </div>

      {/* Upload Dropzones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">1. Liste des élèves</h2>
                <p className="text-xs text-gray-500">Colonnes : النسب, الإسم, niveau, zone</p>
              </div>
            </div>
            {eleves.length > 0 && (
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                {eleves.length} élève{eleves.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <FileDropzone
            id="dropzone-eleves"
            label="Fichier élèves (.xlsx)"
            description="Prend en charge les en-têtes arabes (النسب, الإسم) et latins"
            onFileSelect={setElevesFile}
            file={elevesFile}
            onClear={() => setElevesFile(null)}
          />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Bus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">2. Tableau des chauffeurs</h2>
                <p className="text-xs text-gray-500">Colonnes : CHAUFFEUR, ZONE, PLACES, VOYAGES</p>
              </div>
            </div>
            {chauffeurs.length > 0 && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {chauffeurs.length} chauffeur{chauffeurs.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <FileDropzone
            id="dropzone-chauffeurs"
            label="Fichier chauffeurs (.xlsx)"
            description="Capacités (22, 26, 32 places) et horaires de voyage"
            onFileSelect={setChauffeursFile}
            file={chauffeursFile}
            onClear={() => setChauffeursFile(null)}
          />
        </div>
      </div>

      {/* Action Button */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          id="btn-analyser"
          onClick={handleImport}
          disabled={(!elevesFile && !chauffeursFile) || isLoading}
          className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm
            hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed
            flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Analyse des fichiers en cours...
            </>
          ) : (
            <>
              <span>Analyser les données</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {(eleves.length > 0 || chauffeurs.length > 0) && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('eleves')}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg cursor-pointer"
            >
              Voir tableau élèves →
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('chauffeurs')}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg cursor-pointer"
            >
              Voir tableau chauffeurs →
            </button>
          </div>
        )}
      </div>

      {/* Success Notification */}
      {importSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-900 text-sm">{importSuccessMessage}</p>
          </div>
        </div>
      )}

      {/* Errors list */}
      {errors.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-rose-900 text-sm">Erreurs bloquantes lors de la lecture</p>
              <ul className="list-disc list-inside text-xs text-rose-700 mt-2 space-y-1">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Warnings list */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">Avertissements de validation ({warnings.length})</p>
              <ul className="list-disc list-inside text-xs text-amber-800 mt-2 space-y-1 max-h-40 overflow-y-auto">
                {warnings.slice(0, 8).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {warnings.length > 8 && (
                  <li className="font-semibold text-amber-900">... et {warnings.length - 8} autres avertissements</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Statistics & Analysis Display */}
      {stats && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Statistiques globales</h2>
            <span className="text-xs text-gray-500">Calculé en temps réel</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              id="stat-eleves"
              title="Total élèves"
              value={stats.totalEleves}
              icon={Users}
              color="blue"
              subtitle={`${Object.keys(stats.elevesParZone).length} zones desservies`}
            />
            <StatCard
              id="stat-chauffeurs"
              title="Total chauffeurs"
              value={stats.totalChauffeurs}
              icon={Bus}
              color="green"
              subtitle="Flotte active"
            />
            <StatCard
              id="stat-places"
              title="Total places"
              value={stats.totalPlaces}
              icon={Bus}
              color="purple"
              subtitle={`Ratio : ${(stats.totalPlaces / (stats.totalEleves || 1)).toFixed(2)} place/élève`}
            />
            <StatCard
              id="stat-niveaux"
              title="Niveau 1 / Niveau 2"
              value={`${stats.elevesParNiveau[1] || 0} / ${stats.elevesParNiveau[2] || 0}`}
              icon={Users}
              color="orange"
              subtitle="15h15 (N1) vs 16h00 (N2)"
            />
          </div>

          {/* Table of zones */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Répartition & Capacité par zone
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Comparatif entre effectifs d'élèves inscrits et places offertes par les chauffeurs
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> OK
                </span>
                <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-1 rounded-md font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" /> Déficit
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Zone
                    </th>
                    <th scope="col" className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Niveau 1
                    </th>
                    <th scope="col" className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Niveau 2
                    </th>
                    <th scope="col" className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Total Élèves
                    </th>
                    <th scope="col" className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Chauffeurs
                    </th>
                    <th scope="col" className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Capacité Places
                    </th>
                    <th scope="col" className="text-right py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {Object.entries(stats.elevesParZoneEtNiveau).map(([zone, data]) => {
                    const places = stats.placesParZone[zone] || 0;
                    const nbChauffeurs = stats.chauffeursParZone[zone] || 0;
                    const total = data.niveau1 + data.niveau2;
                    const deficit = total - places;
                    return (
                      <tr key={zone} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-6 font-semibold text-gray-900 uppercase text-sm">
                          {zone}
                        </td>
                        <td className="text-right py-3.5 px-4 text-sm text-gray-600">
                          {data.niveau1}
                        </td>
                        <td className="text-right py-3.5 px-4 text-sm text-gray-600">
                          {data.niveau2}
                        </td>
                        <td className="text-right py-3.5 px-4 font-bold text-gray-900 text-sm">
                          {total}
                        </td>
                        <td className="text-right py-3.5 px-4 text-sm text-gray-600">
                          {nbChauffeurs}
                        </td>
                        <td className="text-right py-3.5 px-4 text-sm font-semibold text-gray-800">
                          {places}
                        </td>
                        <td className="text-right py-3.5 px-6">
                          {deficit > 0 ? (
                            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full text-xs font-bold border border-rose-200">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Déficit {deficit} place{deficit > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Équilibré ({places - total} libre{places - total > 1 ? 's' : ''})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deficits alert box */}
          {deficits.length > 0 ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                <div className="space-y-2 flex-1">
                  <h4 className="font-bold text-rose-900 text-sm sm:text-base">
                    Zones en déficit de places ({deficits.length})
                  </h4>
                  <p className="text-xs text-rose-800">
                    Les zones suivantes nécessiteront des rotations supplémentaires de chauffeurs lors de la phase de répartition :
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {deficits.map((d) => (
                      <div key={d.zone} className="bg-white/80 border border-rose-200 p-2.5 rounded-lg text-xs">
                        <span className="font-bold text-rose-950 uppercase">{d.zone}</span> :{' '}
                        <span className="text-rose-900">
                          <strong>{d.eleves}</strong> élèves pour <strong>{d.places}</strong> places
                        </span>
                        <span className="block font-bold text-rose-700 mt-0.5">
                          → Déficit de {d.deficit} élève{d.deficit > 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-emerald-900 text-sm">
                  Capacité globale suffisante
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Toutes les zones disposent de suffisamment de places directes pour les élèves inscrits.
                </p>
              </div>
            </div>
          )}

          {/* Algorithmic Next Step notice */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-900 space-y-1">
                <p className="font-bold text-blue-950 text-sm">
                  Module 2 disponible : Algorithme de Répartition Automatique
                </p>
                <p className="leading-relaxed">
                  Les données des élèves et chauffeurs sont validées. Lancez la répartition pour affecter automatiquement les élèves selon les zones, les 4 voyages et les quotas de places.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('repartition')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Accéder à la répartition</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de gestion de la configuration JSON */}
      <ModalConfigurationJSON
        isOpen={isModalJSONOpen}
        onClose={() => setIsModalJSONOpen(false)}
        eleves={eleves}
        chauffeurs={chauffeurs}
        resultat={resultat}
        chauffeursVerrouilles={chauffeursVerrouilles}
        emplacementsVerrouilles={emplacementsVerrouilles}
        onAppliquerConfiguration={(cfg) => {
          setEleves(cfg.eleves);
          setChauffeurs(cfg.chauffeurs);
          if (onAppliquerConfiguration) {
            onAppliquerConfiguration(cfg);
          } else {
            onDataImported(cfg.eleves, cfg.chauffeurs);
          }
          setImportSuccessMessage(`Configuration JSON appliquée avec succès (${cfg.eleves.length} élèves, ${cfg.chauffeurs.length} chauffeurs) !`);
        }}
      />
    </div>
  );
};
