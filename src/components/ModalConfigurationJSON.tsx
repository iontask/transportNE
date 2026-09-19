import React, { useState, useRef } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  FileJson, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Users, 
  Bus, 
  Layers,
  Sparkles,
  FileCode,
  Check,
  RefreshCw
} from 'lucide-react';
import { Eleve, Chauffeur, ResultatRepartition } from '../types';
import { 
  ConfigurationTransportJSON,
  exporterConfigurationJSON, 
  telechargerModeleConfigurationJSON, 
  validerConfigurationJSON 
} from '../utils/configurationJson';

interface ModalConfigurationJSONProps {
  isOpen: boolean;
  onClose: () => void;
  eleves: Eleve[];
  chauffeurs: Chauffeur[];
  resultat?: ResultatRepartition | null;
  chauffeursVerrouilles?: Set<string>;
  emplacementsVerrouilles?: Set<string>;
  onAppliquerConfiguration: (config: ConfigurationTransportJSON) => void;
}

export const ModalConfigurationJSON: React.FC<ModalConfigurationJSONProps> = ({
  isOpen,
  onClose,
  eleves,
  chauffeurs,
  resultat,
  chauffeursVerrouilles = new Set(),
  emplacementsVerrouilles = new Set(),
  onAppliquerConfiguration,
}) => {
  const [ongletActif, setOngletActif] = useState<'exporter' | 'importer' | 'modele'>('importer');
  const [fichierImporte, setFichierImporte] = useState<File | null>(null);
  const [contenuTexteJSON, setContenuTexteJSON] = useState<string>('');
  const [configValidee, setConfigValidee] = useState<ConfigurationTransportJSON | null>(null);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [avertissements, setAvertissements] = useState<string[]>([]);
  const [succesMessage, setSuccesMessage] = useState<string | null>(null);
  const [nomFichierExport, setNomFichierExport] = useState<string>(
    `configuration_transport_ain_sebaa_${new Date().toISOString().split('T')[0]}.json`
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const totalPlaces = chauffeurs.reduce((acc, c) => acc + (Number(c.places) || 0), 0);
  const nbChauffeursVerrouilles = chauffeursVerrouilles.size;
  const nbEmplacementsVerrouilles = emplacementsVerrouilles.size;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      traiterFichier(file);
    }
  };

  const traiterFichier = (file: File) => {
    setFichierImporte(file);
    setErreurs([]);
    setAvertissements([]);
    setSuccesMessage(null);
    setConfigValidee(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setContenuTexteJSON(content);
      const validation = validerConfigurationJSON(content);
      if (validation.valide && validation.data) {
        setConfigValidee(validation.data);
        setAvertissements(validation.avertissements);
      } else {
        setErreurs(validation.erreurs);
        setAvertissements(validation.avertissements);
      }
    };
    reader.onerror = () => {
      setErreurs(['Impossible de lire le fichier sélectionné.']);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      traiterFichier(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleConfirmerImport = () => {
    if (!configValidee) return;
    onAppliquerConfiguration(configValidee);
    setSuccesMessage(`Configuration chargée avec succès (${configValidee.eleves.length} élèves, ${configValidee.chauffeurs.length} chauffeurs) !`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleExporter = () => {
    exporterConfigurationJSON(
      eleves,
      chauffeurs,
      resultat,
      chauffeursVerrouilles,
      emplacementsVerrouilles,
      nomFichierExport
    );
    setSuccesMessage('Fichier JSON téléchargé avec succès !');
    setTimeout(() => setSuccesMessage(null), 3000);
  };

  const handleTelechargerModele = () => {
    telechargerModeleConfigurationJSON();
    setSuccesMessage('Modèle JSON exemple téléchargé avec succès !');
    setTimeout(() => setSuccesMessage(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 my-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête de la modale */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>Gestion de Configuration JSON</span>
                <span className="text-[11px] font-semibold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                  Import / Export
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Sauvegardez, chargez ou préparez vos données complètes en format JSON structuré
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation par onglets */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setOngletActif('importer')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              ongletActif === 'importer'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importer une configuration</span>
          </button>

          <button
            type="button"
            onClick={() => setOngletActif('exporter')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              ongletActif === 'exporter'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter la configuration</span>
          </button>

          <button
            type="button"
            onClick={() => setOngletActif('modele')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              ongletActif === 'modele'
                ? 'border-amber-600 text-amber-700 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Modèle JSON exemple</span>
          </button>
        </div>

        {/* Notification de succès */}
        {succesMessage && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{succesMessage}</span>
          </div>
        )}

        {/* Contenu des onglets */}
        <div className="p-5 overflow-y-auto max-h-[70vh] space-y-4">
          {/* ONGLET 1 : IMPORTER JSON */}
          {ongletActif === 'importer' && (
            <div className="space-y-4">
              <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 text-xs text-blue-900">
                <p className="font-semibold mb-1">💡 Restauration instantanée :</p>
                <p className="text-blue-800/90 leading-relaxed">
                  L'importation d'une configuration JSON charge en un clic la liste complète des élèves, 
                  le tableau des chauffeurs, les créneaux verrouillés ainsi que le calcul de répartition précédent si présent.
                </p>
              </div>

              {/* Zone Drag and Drop */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-blue-50/20"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json,application/json"
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {fichierImporte ? fichierImporte.name : 'Cliquez pour choisir un fichier .json ou glissez-le ici'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Format attendu : configuration de transport scolaire (.json)
                </p>
              </div>

              {/* Aperçu de la configuration détectée */}
              {configValidee && (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase text-emerald-900 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Fichier valide détecté
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      Version {configValidee.version}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-lg border border-emerald-200 text-center">
                      <span className="text-[10px] text-slate-500 block">Élèves</span>
                      <strong className="text-sm text-slate-900">{configValidee.eleves.length}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-emerald-200 text-center">
                      <span className="text-[10px] text-slate-500 block">Chauffeurs</span>
                      <strong className="text-sm text-slate-900">{configValidee.chauffeurs.length}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-emerald-200 text-center">
                      <span className="text-[10px] text-slate-500 block">Verrous créneaux</span>
                      <strong className="text-sm text-slate-900">{configValidee.emplacementsVerrouilles?.length || 0}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-emerald-200 text-center">
                      <span className="text-[10px] text-slate-500 block">Répartition incluse</span>
                      <strong className="text-sm text-slate-900">{configValidee.resultat ? 'Oui' : 'Non'}</strong>
                    </div>
                  </div>

                  {configValidee.description && (
                    <p className="text-xs text-slate-600 italic">
                      « {configValidee.description} »
                    </p>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmerImport}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Appliquer cette configuration dans l'application</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Erreurs bloquantes */}
              {erreurs.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Erreurs bloquantes de validation :</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-rose-800 space-y-0.5">
                    {erreurs.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Avertissements non bloquants */}
              {avertissements.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Avertissements :</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5">
                    {avertissements.map((av, i) => (
                      <li key={i}>{av}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ONGLET 2 : EXPORTER JSON */}
          {ongletActif === 'exporter' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Contenu qui sera exporté :
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Élèves enregistrés</span>
                    <strong className="text-sm text-blue-700">{eleves.length}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Chauffeurs & bus</span>
                    <strong className="text-sm text-emerald-700">{chauffeurs.length} ({totalPlaces} pl.)</strong>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Chauffeurs verrouillés</span>
                    <strong className="text-sm text-amber-700">{nbChauffeursVerrouilles}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Créneaux verrouillés</span>
                    <strong className="text-sm text-amber-700">{nbEmplacementsVerrouilles}</strong>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nom du fichier à exporter :
                  </label>
                  <input
                    type="text"
                    value={nomFichierExport}
                    onChange={(e) => setNomFichierExport(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleExporter}
                disabled={eleves.length === 0 && chauffeurs.length === 0}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger la configuration actuelle (.json)</span>
              </button>
            </div>
          )}

          {/* ONGLET 3 : MODÈLE JSON */}
          {ongletActif === 'modele' && (
            <div className="space-y-4">
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2 text-xs text-amber-950">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 text-sm">
                  <FileCode className="w-4 h-4 text-amber-700" />
                  <span>Modèle de configuration JSON complet</span>
                </div>
                <p className="leading-relaxed">
                  Ce modèle officiel contient la structure exacte attendue par l'application : 
                  les champs obligatoires pour les élèves (nom en arabe ou français, prénom, zone, niveau 1 ou 2), 
                  les chauffeurs (nom, zone, capacité en places), ainsi que les verrous de créneaux.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleTelechargerModele}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger le modèle JSON exemple</span>
                  </button>
                </div>
              </div>

              {/* Exemple de structure visualisable */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Extrait du format JSON :
                </span>
                <pre className="bg-slate-900 text-slate-200 p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 leading-normal">
{`{
  "version": "1.0",
  "nomApplication": "Transport Scolaire - AIN SEBAA",
  "eleves": [
    {
      "id": "eleve-001",
      "nom": "العلمي",
      "prenom": "يوسف",
      "niveau": 1,
      "zone": "Ain Sebaa",
      "telephone": "0612345678"
    }
  ],
  "chauffeurs": [
    {
      "id": "ch-001",
      "nom": "Chauffeur 1 - Hassan",
      "places": 20,
      "zone": "Ain Sebaa"
    }
  ],
  "emplacementsVerrouilles": ["ch-001_MATIN_2"]
}`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Pied de la modale */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTelechargerModele}
            className="text-xs font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Télécharger le modèle JSON</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
