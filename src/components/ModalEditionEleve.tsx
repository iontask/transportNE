import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, AlertCircle, MapPin, GraduationCap } from 'lucide-react';
import { Eleve } from '../types';

interface ModalEditionEleveProps {
  isOpen: boolean;
  onClose: () => void;
  eleve?: Eleve | null; // Si null => création d'un nouvel élève
  zonesExistantes: string[];
  onSave: (eleve: Eleve) => void;
}

const ZONES_STANDARDS = [
  'ain sebaa',
  'bernoussi',
  'hay mohemmadi',
  'sidi moumen',
  'azhar',
  'anassi',
  'qods',
];

export const ModalEditionEleve: React.FC<ModalEditionEleveProps> = ({
  isOpen,
  onClose,
  eleve,
  zonesExistantes,
  onSave,
}) => {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [niveau, setNiveau] = useState<1 | 2>(1);
  const [zone, setZone] = useState('ain sebaa');
  const [zoneCustom, setZoneCustom] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);

  // Fusionner les zones uniques
  const toutesLesZones = Array.from(
    new Set([...ZONES_STANDARDS, ...zonesExistantes.map((z) => z.toLowerCase().trim())])
  ).filter(Boolean);

  useEffect(() => {
    if (eleve) {
      setNom(eleve.nom || '');
      setPrenom(eleve.prenom || '');
      setNiveau(eleve.niveau === 2 ? 2 : 1);
      const zoneClean = (eleve.zone || 'ain sebaa').toLowerCase().trim();
      if (toutesLesZones.includes(zoneClean)) {
        setZone(zoneClean);
        setZoneCustom('');
      } else {
        setZone('autre');
        setZoneCustom(eleve.zone);
      }
    } else {
      // Nouvel élève par défaut
      setNom('');
      setPrenom('');
      setNiveau(1);
      setZone('ain sebaa');
      setZoneCustom('');
    }
    setErreur(null);
  }, [eleve, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) {
      setErreur('Le nom de famille (النسب) est obligatoire.');
      return;
    }

    const zoneFinale = (zone === 'autre' ? zoneCustom : zone).trim().toLowerCase();
    if (!zoneFinale) {
      setErreur('La zone de résidence est obligatoire.');
      return;
    }

    const updated: Eleve = {
      id: eleve?.id || `eleve_custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      nom: nom.trim(),
      prenom: prenom.trim(),
      niveau: Number(niveau) === 2 ? 2 : 1,
      zone: zoneFinale,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* En-tête */}
        <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              {eleve ? <GraduationCap className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {eleve ? 'Modifier la fiche élève' : 'Ajouter un nouvel élève'}
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                {eleve ? `Élève ID: #${eleve.id}` : 'Inscription manuelle dans le registre'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erreur && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{erreur}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nom */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>النسب (Nom de famille) *</span>
                <span className="text-[10px] font-normal text-slate-400">Arabe ou Français</span>
              </label>
              <input
                type="text"
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: بنجلون ou Benjelloun"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
            </div>

            {/* Prénom */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>الإسم (Prénom)</span>
                <span className="text-[10px] font-normal text-slate-400">Optionnel</span>
              </label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Ex: آدم ou Adam"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Niveau */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              <span>Niveau scolaire & Horaire de sortie *</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  niveau === 1
                    ? 'border-blue-500 bg-blue-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="niveau"
                  checked={niveau === 1}
                  onChange={() => setNiveau(1)}
                  className="mt-1 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Niveau 1</p>
                  <p className="text-[11px] font-semibold text-blue-700 mt-0.5">Sortie 15h15</p>
                  <p className="text-[10px] text-slate-500">Maternelle & Primaire</p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  niveau === 2
                    ? 'border-purple-500 bg-purple-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="niveau"
                  checked={niveau === 2}
                  onChange={() => setNiveau(2)}
                  className="mt-1 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Niveau 2</p>
                  <p className="text-[11px] font-semibold text-purple-700 mt-0.5">Sortie 16h00</p>
                  <p className="text-[10px] text-slate-500">Collège & Lycée</p>
                </div>
              </label>
            </div>
          </div>

          {/* Zone de résidence */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Zone de résidence *</span>
            </label>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer"
            >
              {toutesLesZones.map((z) => (
                <option key={z} value={z}>
                  {z.toUpperCase()}
                </option>
              ))}
              <option value="autre">Autre zone personnalisée...</option>
            </select>

            {zone === 'autre' && (
              <input
                type="text"
                value={zoneCustom}
                onChange={(e) => setZoneCustom(e.target.value)}
                placeholder="Saisir le nom de la zone..."
                className="w-full mt-2 px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            )}
          </div>

          {/* Pied du formulaire */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{eleve ? 'Enregistrer les modifications' : 'Ajouter l\'élève'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
