import React, { useState } from 'react';
import { MapPin, X, AlertCircle, Sparkles, Plus, Star } from 'lucide-react';
import { normaliserNomZone } from '../utils/repartition';

export interface ZoneVoyageSelectorFieldProps {
  label: string;
  subLabel?: string;
  zones: string[];
  onChangeZones: (newZones: string[]) => void;
  availableZonesEleves: string[];
  accentColor?: 'blue' | 'indigo' | 'purple' | 'amber' | 'emerald';
  onCopyAll?: () => void;
  zoneOriginale?: string;
  onChangeZoneOriginale?: (newZoneOriginale: string) => void;
}

export const ZoneVoyageSelectorField: React.FC<ZoneVoyageSelectorFieldProps> = ({
  label,
  subLabel,
  zones,
  onChangeZones,
  availableZonesEleves,
  accentColor = 'blue',
  onCopyAll,
  zoneOriginale,
  onChangeZoneOriginale,
}) => {
  const [customInput, setCustomInput] = useState('');

  const currentZoneOrigNorm = zoneOriginale ? normaliserNomZone(zoneOriginale) : (zones.length > 0 ? normaliserNomZone(zones[0]) : '');

  const handleSetOriginale = (zoneToSet: string) => {
    const norm = normaliserNomZone(zoneToSet);
    if (!norm) return;

    // S'assurer que la zone est dans la liste des zones, en première position
    const otherZones = zones.filter((z) => normaliserNomZone(z) !== norm);
    const updatedZones = [zoneToSet.trim().toLowerCase(), ...otherZones];
    onChangeZones(updatedZones);

    if (onChangeZoneOriginale) {
      onChangeZoneOriginale(norm);
    }
  };

  const handleAddCustom = (val?: string) => {
    const raw = (val !== undefined ? val : customInput).trim().toLowerCase();
    if (!raw) return;
    const normalized = normaliserNomZone(raw);
    if (!zones.map(normaliserNomZone).includes(normalized)) {
      onChangeZones([...zones, raw]);
      if (!zoneOriginale && zones.length === 0 && onChangeZoneOriginale) {
        onChangeZoneOriginale(normalized);
      }
    }
    if (val === undefined) {
      setCustomInput('');
    }
  };

  const handleToggleZone = (zoneToToggle: string) => {
    const norm = normaliserNomZone(zoneToToggle);
    if (zones.map(normaliserNomZone).includes(norm)) {
      const remaining = zones.filter((z) => normaliserNomZone(z) !== norm);
      onChangeZones(remaining);
      if (currentZoneOrigNorm === norm && onChangeZoneOriginale) {
        onChangeZoneOriginale(remaining.length > 0 ? normaliserNomZone(remaining[0]) : '');
      }
    } else {
      const added = [...zones, zoneToToggle.trim().toLowerCase()];
      onChangeZones(added);
      if ((!zoneOriginale || zones.length === 0) && onChangeZoneOriginale) {
        onChangeZoneOriginale(norm);
      }
    }
  };

  const handleRemoveZone = (idxToRemove: number) => {
    const removedZone = zones[idxToRemove];
    const remaining = zones.filter((_, idx) => idx !== idxToRemove);
    onChangeZones(remaining);
    if (removedZone && normaliserNomZone(removedZone) === currentZoneOrigNorm && onChangeZoneOriginale) {
      onChangeZoneOriginale(remaining.length > 0 ? normaliserNomZone(remaining[0]) : '');
    }
  };

  const colorStyles = {
    blue: {
      badge: 'bg-blue-50 text-blue-900 border-blue-200',
      activeBtn: 'bg-blue-600 text-white shadow-2xs border-blue-700',
      icon: 'text-blue-600',
      count: 'bg-blue-100 text-blue-800',
    },
    indigo: {
      badge: 'bg-indigo-50 text-indigo-900 border-indigo-200',
      activeBtn: 'bg-indigo-600 text-white shadow-2xs border-indigo-700',
      icon: 'text-indigo-600',
      count: 'bg-indigo-100 text-indigo-800',
    },
    purple: {
      badge: 'bg-purple-50 text-purple-900 border-purple-200',
      activeBtn: 'bg-purple-600 text-white shadow-2xs border-purple-700',
      icon: 'text-purple-600',
      count: 'bg-purple-100 text-purple-800',
    },
    amber: {
      badge: 'bg-amber-50 text-amber-900 border-amber-200',
      activeBtn: 'bg-amber-600 text-white shadow-2xs border-amber-700',
      icon: 'text-amber-600',
      count: 'bg-amber-100 text-amber-800',
    },
    emerald: {
      badge: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      activeBtn: 'bg-emerald-600 text-white shadow-2xs border-emerald-700',
      icon: 'text-emerald-600',
      count: 'bg-emerald-100 text-emerald-800',
    },
  }[accentColor] || {
    badge: 'bg-blue-50 text-blue-900 border-blue-200',
    activeBtn: 'bg-blue-600 text-white shadow-2xs border-blue-700',
    icon: 'text-blue-600',
    count: 'bg-blue-100 text-blue-800',
  };

  // Liste combinée pour la sélection de la zone originale
  const allSelectableZones = Array.from(
    new Set([...zones.map(normaliserNomZone), ...availableZonesEleves.map(normaliserNomZone)].filter(Boolean))
  ).sort();

  return (
    <div className="space-y-2.5 bg-slate-50/90 p-3.5 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <label className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
          <MapPin className={`w-3.5 h-3.5 ${colorStyles.icon}`} />
          <span>{label}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${colorStyles.count}`}>
            {zones.length} zone{zones.length > 1 ? 's' : ''}
          </span>
        </label>
        {onCopyAll && (
          <button
            type="button"
            onClick={onCopyAll}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
            title="Copier ces zones sur les 4 voyages de ce chauffeur"
          >
            <span>📋 Appliquer aux 4 voyages</span>
          </button>
        )}
      </div>

      {subLabel && <p className="text-[11px] text-gray-500">{subLabel}</p>}

      {/* SÉLECTEUR DE LA ZONE ORIGINALE DU VOYAGE */}
      <div className="p-2 bg-gradient-to-r from-amber-50/90 to-yellow-50/80 rounded-lg border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500 shrink-0" />
          <div>
            <span className="text-xs font-bold text-amber-950 block leading-tight">
              Zone originale du voyage :
            </span>
            <span className="text-[10px] text-amber-800">
              Zone principale prioritaire d'embarquement pour cette rotation
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={currentZoneOrigNorm}
            onChange={(e) => handleSetOriginale(e.target.value)}
            className="text-xs font-bold text-slate-800 uppercase bg-white border border-amber-300 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer shadow-2xs min-w-[140px]"
          >
            <option value="" disabled>-- Choisir la zone originale --</option>
            {allSelectableZones.map((z) => (
              <option key={z} value={z}>
                ★ {z.toUpperCase()}
              </option>
            ))}
          </select>
          {currentZoneOrigNorm && (
            <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded border border-amber-300">
              {currentZoneOrigNorm}
            </span>
          )}
        </div>
      </div>

      {/* Badges des zones actuellement sélectionnées pour ce voyage */}
      <div className="min-h-[38px] p-2 bg-white rounded-lg border border-gray-200 flex flex-wrap items-center gap-1.5 shadow-2xs">
        {zones.length === 0 ? (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium py-0.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Aucune zone affectée à ce voyage. Sélectionnez des zones parmi celles des élèves ci-dessous.</span>
          </div>
        ) : (
          zones.map((z, idx) => {
            const isOriginale = normaliserNomZone(z) === currentZoneOrigNorm;
            return (
              <span
                key={`${z}-${idx}`}
                title={isOriginale ? "Zone originale prioritaire du voyage" : undefined}
                className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border transition-all ${
                  isOriginale
                    ? 'bg-amber-100 text-amber-950 border-amber-300 ring-1 ring-amber-400 font-black shadow-2xs'
                    : colorStyles.badge
                }`}
              >
                {isOriginale && (
                  <Star className="w-3 h-3 text-amber-600 fill-amber-500 shrink-0" />
                )}
                <span>{z}</span>
                {isOriginale ? (
                  <span className="text-[9px] font-extrabold text-amber-800 bg-amber-200/80 px-1 rounded ml-0.5">
                    ORIGINALE
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetOriginale(z)}
                    title={`Définir ${z.toUpperCase()} comme zone originale de ce voyage`}
                    className="p-0.5 hover:bg-amber-100 text-gray-400 hover:text-amber-700 rounded transition-colors cursor-pointer"
                  >
                    <Star className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveZone(idx)}
                  title={`Retirer la zone ${z.toUpperCase()}`}
                  className="p-0.5 hover:bg-rose-100 hover:text-rose-700 rounded transition-colors cursor-pointer text-gray-400 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })
        )}
      </div>

      {/* Suggestion interactive des zones issues de la liste des élèves */}
      <div className="space-y-1 pt-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-gray-700 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Zones des élèves inscrits (cliquez pour ajouter / retirer) :</span>
          </span>
          <span className="text-[10px] text-gray-400 font-medium">
            {availableZonesEleves.length} zone(s)
          </span>
        </div>
        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-white rounded-lg border border-gray-200">
          {availableZonesEleves.length === 0 ? (
            <span className="text-[11px] text-gray-400 italic">Aucune zone d'élèves disponible</span>
          ) : (
            availableZonesEleves.map((z) => {
              const isSelected = zones.map(normaliserNomZone).includes(normaliserNomZone(z));
              const isOrig = normaliserNomZone(z) === currentZoneOrigNorm;
              return (
                <button
                  key={z}
                  type="button"
                  onClick={() => handleToggleZone(z)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                    isOrig
                      ? 'bg-amber-500 text-white shadow-2xs border border-amber-600 font-black'
                      : isSelected
                      ? colorStyles.activeBtn
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                  }`}
                  title={isSelected ? `Retirer ${z.toUpperCase()} de ce voyage` : `Ajouter ${z.toUpperCase()} à ce voyage`}
                >
                  {isOrig && <Star className="w-2.5 h-2.5 fill-current" />}
                  <span>{isSelected ? `✓ ${z}` : `+ ${z}`}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Saisie d'une zone personnalisée */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <input
          type="text"
          placeholder="Ou saisir une zone personnalisée..."
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCustom();
            }
          }}
          className="flex-1 px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-xs uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => handleAddCustom()}
          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg border border-gray-300 cursor-pointer flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          <span>Ajouter</span>
        </button>
      </div>
    </div>
  );
};
