import React, { useState, useMemo } from 'react';
import { 
  Bus, 
  Filter, 
  ArrowLeft, 
  MapPin, 
  Edit3, 
  Trash2, 
  Plus, 
  Download, 
  RotateCcw, 
  Check, 
  Sparkles, 
  AlertCircle, 
  Info, 
  ChevronDown, 
  X,
  Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Chauffeur, OptionVoyageChauffeur, OPTIONS_VOYAGE_CHAUFFEUR } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Badge } from '../components/ui/badge';
import { normaliserOptionVoyage } from '../utils/repartition';

interface ChauffeursPageProps {
  chauffeurs: Chauffeur[];
  chauffeursInitiaux?: Chauffeur[];
  onUpdateChauffeur?: (updated: Chauffeur) => void;
  onUpdateChauffeurs?: (chauffeurs: Chauffeur[]) => void;
  onResetChauffeurs?: () => void;
  onNavigateToImport: () => void;
  onNavigateToRepartition?: () => void;
  hasRepartition?: boolean;
}

// Couleurs et libellés pour chacune des 7 options autorisées
export const getOptionStyle = (val: string) => {
  const v = normaliserOptionVoyage(val);
  switch (v) {
    case 'N1':
      return {
        selectClass: 'bg-blue-50 text-blue-800 border-blue-200 focus:ring-blue-500',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
        dotClass: 'bg-blue-600',
        shortDesc: 'Niveau 1 (zone chauffeur)',
      };
    case 'N2':
      return {
        selectClass: 'bg-indigo-50 text-indigo-800 border-indigo-200 focus:ring-indigo-500',
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        dotClass: 'bg-indigo-600',
        shortDesc: 'Niveau 2 (zone chauffeur)',
      };
    case 'N1 ET N2':
      return {
        selectClass: 'bg-purple-50 text-purple-900 border-purple-300 focus:ring-purple-500 font-bold',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
        dotClass: 'bg-purple-600',
        shortDesc: 'N1 & N2 (tous niveaux)',
      };
    case 'N1 AIN SEBAA':
      return {
        selectClass: 'bg-amber-50 text-amber-900 border-amber-300 focus:ring-amber-500 font-bold',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
        dotClass: 'bg-amber-600',
        shortDesc: 'Navette N1 vers Ain Sebaa',
      };
    case 'N2 AIN SEBAA':
      return {
        selectClass: 'bg-orange-50 text-orange-900 border-orange-300 focus:ring-orange-500 font-bold',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-300 font-bold',
        dotClass: 'bg-orange-600',
        shortDesc: 'Navette N2 vers Ain Sebaa',
      };
    case 'N1 AIN SEBAA ET N2 AIN SEBAA':
      return {
        selectClass: 'bg-emerald-50 text-emerald-900 border-emerald-300 focus:ring-emerald-500 font-bold',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
        dotClass: 'bg-emerald-600',
        shortDesc: 'Navette N1 & N2 Ain Sebaa',
      };
    case 'SANS':
    default:
      return {
        selectClass: 'bg-gray-100 text-gray-400 border-gray-200 focus:ring-gray-400 font-normal',
        badgeClass: 'bg-gray-100 text-gray-400 border-gray-200 font-normal',
        dotClass: 'bg-gray-300',
        shortDesc: 'Inactif / Au repos',
      };
  }
};

export const ChauffeursPage: React.FC<ChauffeursPageProps> = ({ 
  chauffeurs, 
  chauffeursInitiaux = [],
  onUpdateChauffeur,
  onUpdateChauffeurs,
  onResetChauffeurs,
  onNavigateToImport,
  onNavigateToRepartition,
  hasRepartition = false,
}) => {
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [lastModifiedChauffeurId, setLastModifiedChauffeurId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Modales
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingChauffeur, setEditingChauffeur] = useState<Chauffeur | null>(null);
  const [deletingChauffeur, setDeletingChauffeur] = useState<Chauffeur | null>(null);

  // Formulaire d'ajout
  const [newNom, setNewNom] = useState('');
  const [newZone, setNewZone] = useState('ain sebaa');
  const [newPlaces, setNewPlaces] = useState<number>(26);
  const [newMatin1, setNewMatin1] = useState<OptionVoyageChauffeur>('N1');
  const [newMatin2, setNewMatin2] = useState<OptionVoyageChauffeur>('N2');
  const [new15h15, setNew15h15] = useState<OptionVoyageChauffeur>('N1');
  const [new16h00, setNew16h00] = useState<OptionVoyageChauffeur>('N2');

  const totalPlaces = useMemo(() => {
    return chauffeurs.reduce((sum, c) => sum + c.places, 0);
  }, [chauffeurs]);

  const availableZones = useMemo(() => {
    const zones = new Set(chauffeurs.map((c) => (c.zone || '').trim().toLowerCase()));
    return Array.from(zones).filter(Boolean).sort();
  }, [chauffeurs]);

  const filteredChauffeurs = useMemo(() => {
    if (selectedZone === 'all') return chauffeurs;
    return chauffeurs.filter((c) => (c.zone || '').trim().toLowerCase() === selectedZone);
  }, [chauffeurs, selectedZone]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Mise à jour rapide d'un voyage directement depuis le tableau
  const handleVoyageChange = (
    chauffeurId: string, 
    voyageKey: 'voyageMatin1' | 'voyageMatin2' | 'voyageApresMidi15h15' | 'voyageApresMidi16h00', 
    newValue: OptionVoyageChauffeur
  ) => {
    const target = chauffeurs.find((c) => c.id === chauffeurId);
    if (!target) return;

    const updatedChauffeur: Chauffeur = {
      ...target,
      [voyageKey]: newValue,
    };

    if (onUpdateChauffeur) {
      onUpdateChauffeur(updatedChauffeur);
    } else if (onUpdateChauffeurs) {
      const updatedList = chauffeurs.map((c) => (c.id === chauffeurId ? updatedChauffeur : c));
      onUpdateChauffeurs(updatedList);
    }

    setLastModifiedChauffeurId(chauffeurId);
    setTimeout(() => setLastModifiedChauffeurId(null), 1800);
    showToast(`Planning de ${target.nom} mis à jour : ${newValue}`);
  };

  // Enregistrement de la modification complète du chauffeur
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChauffeur) return;

    const updated = {
      ...editingChauffeur,
      nom: editingChauffeur.nom.trim(),
      zone: editingChauffeur.zone.trim().toLowerCase(),
      places: Number(editingChauffeur.places) || 22,
      voyageMatin1: normaliserOptionVoyage(editingChauffeur.voyageMatin1),
      voyageMatin2: normaliserOptionVoyage(editingChauffeur.voyageMatin2),
      voyageApresMidi15h15: normaliserOptionVoyage(editingChauffeur.voyageApresMidi15h15),
      voyageApresMidi16h00: normaliserOptionVoyage(editingChauffeur.voyageApresMidi16h00),
    };

    if (onUpdateChauffeur) {
      onUpdateChauffeur(updated);
    } else if (onUpdateChauffeurs) {
      const updatedList = chauffeurs.map((c) => (c.id === updated.id ? updated : c));
      onUpdateChauffeurs(updatedList);
    }

    setIsEditModalOpen(false);
    setEditingChauffeur(null);
    showToast(`Chauffeur ${updated.nom} mis à jour avec succès.`);
  };

  // Ajout d'un nouveau chauffeur
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNom.trim()) return;

    const newChauffeur: Chauffeur = {
      id: 'ch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      nom: newNom.trim(),
      zone: newZone.trim().toLowerCase() || 'ain sebaa',
      places: Number(newPlaces) || 26,
      voyageMatin1: newMatin1,
      voyageMatin2: newMatin2,
      voyageApresMidi15h15: new15h15,
      voyageApresMidi16h00: new16h00,
    };

    if (onUpdateChauffeurs) {
      onUpdateChauffeurs([...chauffeurs, newChauffeur]);
    }

    setIsAddModalOpen(false);
    setNewNom('');
    setNewPlaces(26);
    showToast(`Chauffeur ${newChauffeur.nom} ajouté avec succès.`);
  };

  // Suppression d'un chauffeur
  const handleConfirmDelete = () => {
    if (!deletingChauffeur) return;
    if (onUpdateChauffeurs) {
      const updatedList = chauffeurs.filter((c) => c.id !== deletingChauffeur.id);
      onUpdateChauffeurs(updatedList);
    }
    showToast(`Chauffeur ${deletingChauffeur.nom} supprimé.`);
    setDeletingChauffeur(null);
  };

  // Export Excel du tableau des chauffeurs
  const handleExportExcel = () => {
    const rows = chauffeurs.map((c) => ({
      CHAUFFEUR: c.nom,
      ZONE: c.zone.toUpperCase(),
      PLACES: c.places,
      'MATIN 1': normaliserOptionVoyage(c.voyageMatin1),
      'MATIN 2': normaliserOptionVoyage(c.voyageMatin2),
      '15H15': normaliserOptionVoyage(c.voyageApresMidi15h15),
      '16H00': normaliserOptionVoyage(c.voyageApresMidi16h00),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chauffeurs');
    XLSX.writeFile(wb, `tableau_chauffeurs_modifie_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Composant du sélecteur inline d'option de voyage
  const renderInlineVoyageSelect = (
    chauffeur: Chauffeur,
    voyageKey: 'voyageMatin1' | 'voyageMatin2' | 'voyageApresMidi15h15' | 'voyageApresMidi16h00'
  ) => {
    const currentValue = normaliserOptionVoyage(chauffeur[voyageKey]);
    const style = getOptionStyle(currentValue);

    return (
      <div className="relative inline-block w-full max-w-[170px]">
        <select
          value={currentValue}
          onChange={(e) => handleVoyageChange(chauffeur.id, voyageKey, e.target.value as OptionVoyageChauffeur)}
          aria-label={`Modifier créneau ${voyageKey} pour ${chauffeur.nom}`}
          className={`w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 pr-7 border transition-all cursor-pointer shadow-2xs appearance-none ${style.selectClass}`}
          title={`${chauffeur.nom} - ${style.shortDesc}`}
        >
          {OPTIONS_VOYAGE_CHAUFFEUR.map((opt) => (
            <option key={opt} value={opt} className="bg-white text-gray-900 font-semibold py-1">
              {opt}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-gray-500">
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  };

  const columns: Column<Chauffeur>[] = [
    {
      key: 'index',
      header: 'N°',
      className: 'w-12 text-gray-400 font-mono text-xs text-center',
      render: (row) => {
        const idx = chauffeurs.findIndex((c) => c.id === row.id) + 1;
        return <span>#{idx}</span>;
      },
    },
    {
      key: 'nom',
      header: 'Chauffeur',
      className: 'font-bold text-gray-900 min-w-[150px]',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black shrink-0 border border-emerald-200">
            {row.nom.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="text-sm font-bold text-gray-900 block leading-tight">{row.nom}</span>
            {lastModifiedChauffeurId === row.id && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 animate-pulse">
                <Check className="w-3 h-3" /> Modifié
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'zone',
      header: 'Zone',
      className: 'text-center min-w-[110px]',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
          <MapPin className="w-3 h-3 text-slate-500" />
          {row.zone}
        </span>
      ),
    },
    {
      key: 'places',
      header: 'Capacité',
      className: 'text-center w-24',
      render: (row) => (
        <span className="inline-block text-xs font-black text-emerald-900 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300">
          {row.places} pl.
        </span>
      ),
    },
    {
      key: 'voyageMatin1',
      header: 'Matin 1 (08h30)',
      className: 'min-w-[160px]',
      render: (row) => renderInlineVoyageSelect(row, 'voyageMatin1'),
    },
    {
      key: 'voyageMatin2',
      header: 'Matin 2 (09h15)',
      className: 'min-w-[160px]',
      render: (row) => renderInlineVoyageSelect(row, 'voyageMatin2'),
    },
    {
      key: 'voyageApresMidi15h15',
      header: '15h15 (N1)',
      className: 'min-w-[160px]',
      render: (row) => renderInlineVoyageSelect(row, 'voyageApresMidi15h15'),
    },
    {
      key: 'voyageApresMidi16h00',
      header: '16h00 (N2)',
      className: 'min-w-[160px]',
      render: (row) => renderInlineVoyageSelect(row, 'voyageApresMidi16h00'),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-center w-24',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => {
              setEditingChauffeur({ ...row });
              setIsEditModalOpen(true);
            }}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            title="Modifier le profil et le planning complet de ce chauffeur"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeletingChauffeur(row)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Supprimer ce chauffeur du tableau"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast de notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-gray-700 animate-in fade-in slide-in-from-bottom-2 duration-200 text-xs sm:text-sm font-medium">
          <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Tableau des chauffeurs
            </h1>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-300">
              {chauffeurs.length} chauffeur{chauffeurs.length > 1 ? 's' : ''} • {totalPlaces} places au total
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Modifiez directement les voyages de chaque chauffeur entre : <strong>N1, N2, N1 AIN SEBAA, N2 AIN SEBAA, SANS, N1 ET N2, N1 AIN SEBAA ET N2 AIN SEBAA</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau chauffeur
          </button>

          {chauffeursInitiaux.length > 0 && onResetChauffeurs && (
            <button
              type="button"
              onClick={onResetChauffeurs}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl shadow-xs cursor-pointer transition-colors"
              title="Réinitialiser le tableau aux valeurs initiales d'importation"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
              Réinitialiser
            </button>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={chauffeurs.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            title="Télécharger le tableau actuel des chauffeurs sous format Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            Export Excel
          </button>

          <button
            type="button"
            onClick={onNavigateToImport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Page d'import
          </button>
        </div>
      </div>

      {chauffeurs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Bus className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Aucun chauffeur importé</h3>
            <p className="text-xs text-gray-500 mt-1">
              Veuillez importer le tableau Excel des chauffeurs ou en ajouter un manuellement.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onNavigateToImport}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Aller à l'importation
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Ajouter manuellement
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Bandeau d'information et synchronisation */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-blue-950">
                  Modification directe dans les colonnes du tableau
                </p>
                <p className="text-blue-700 mt-0.5">
                  Cliquez directement sur les listes déroulantes de chaque rotation pour choisir l'une des 7 configurations autorisées. Les modifications sont synchronisées instantanément.
                </p>
              </div>
            </div>

            {hasRepartition && onNavigateToRepartition && (
              <button
                type="button"
                onClick={onNavigateToRepartition}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shrink-0 shadow-xs cursor-pointer"
              >
                <span>Voir la répartition à jour</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            )}
          </div>

          {/* Filtres et statistiques */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                <Filter className="w-4 h-4 text-gray-400" />
                <span>Filtrer par zone :</span>
              </div>
              <select
                id="filter-chauffeur-zone"
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="text-xs bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="all">Toutes les zones ({chauffeurs.length} chauffeurs)</option>
                {availableZones.map((z) => {
                  const count = chauffeurs.filter((c) => (c.zone || '').trim().toLowerCase() === z).length;
                  const pl = chauffeurs.filter((c) => (c.zone || '').trim().toLowerCase() === z).reduce((s, c) => s + c.places, 0);
                  return (
                    <option key={z} value={z}>
                      {z.toUpperCase()} ({count} chauffeur{count > 1 ? 's' : ''} • {pl} places)
                    </option>
                  );
                })}
              </select>

              {selectedZone !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedZone('all')}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer underline"
                >
                  Réinitialiser le filtre
                </button>
              )}
            </div>

            <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
              <span>Capacité filtrée :</span>
              <strong className="text-gray-900 font-black bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                {filteredChauffeurs.reduce((s, c) => s + c.places, 0)} places
              </strong>
            </div>
          </div>

          {/* Tableau interactif */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <DataTable
              id="table-chauffeurs"
              data={filteredChauffeurs}
              columns={columns}
              searchable={true}
              searchPlaceholder="Rechercher par chauffeur, zone ou capacité..."
              searchKeys={['nom', 'zone', 'places']}
              pageSize={15}
              emptyMessage="Aucun chauffeur ne correspond à vos critères de recherche"
            />
          </div>

          {/* Guide des 7 configurations de voyage */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Guide des 7 configurations autorisées pour les voyages</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1">
                <span className="inline-block px-2 py-0.5 rounded font-black text-blue-800 bg-blue-100 border border-blue-300">
                  N1
                </span>
                <p className="font-bold text-gray-900">Niveau 1 (Zone du chauffeur)</p>
                <p className="text-gray-600">Transporte uniquement les élèves de niveau 1 de sa zone attitrée.</p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1">
                <span className="inline-block px-2 py-0.5 rounded font-black text-indigo-800 bg-indigo-100 border border-indigo-300">
                  N2
                </span>
                <p className="font-bold text-gray-900">Niveau 2 (Zone du chauffeur)</p>
                <p className="text-gray-600">Transporte uniquement les élèves de niveau 2 de sa zone attitrée.</p>
              </div>

              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1">
                <span className="inline-block px-2 py-0.5 rounded font-black text-purple-900 bg-purple-100 border border-purple-300">
                  N1 ET N2
                </span>
                <p className="font-bold text-gray-900">Tous Niveaux (Zone du chauffeur)</p>
                <p className="text-gray-600">Transporte à la fois le Niveau 1 et le Niveau 2 de sa zone.</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                <span className="inline-block px-2 py-0.5 rounded font-medium text-gray-500 bg-gray-200 border border-gray-300">
                  SANS
                </span>
                <p className="font-bold text-gray-900">Chauffeur inactif</p>
                <p className="text-gray-600">Le chauffeur n'effectue aucun transport sur ce créneau (au repos).</p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                <span className="inline-block px-2 py-0.5 rounded font-black text-amber-900 bg-amber-100 border border-amber-300">
                  N1 AIN SEBAA
                </span>
                <p className="font-bold text-gray-900">Navette N1 Ain Sebaa</p>
                <p className="text-gray-600">Transporte en priorité les élèves de Niveau 1 de la zone de l'école Ain Sebaa.</p>
              </div>

              <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200 space-y-1">
                <span className="inline-block px-2 py-0.5 rounded font-black text-orange-900 bg-orange-100 border border-orange-300">
                  N2 AIN SEBAA
                </span>
                <p className="font-bold text-gray-900">Navette N2 Ain Sebaa</p>
                <p className="text-gray-600">Transporte en priorité les élèves de Niveau 2 de la zone de l'école Ain Sebaa.</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1 col-span-1 sm:col-span-2">
                <span className="inline-block px-2 py-0.5 rounded font-black text-emerald-900 bg-emerald-100 border border-emerald-300">
                  N1 AIN SEBAA ET N2 AIN SEBAA
                </span>
                <p className="font-bold text-gray-900">Navette Complète Ain Sebaa (N1 + N2)</p>
                <p className="text-gray-600">Renfort complet transportant tous les élèves (N1 & N2) de la zone Ain Sebaa.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL : Modification complète du chauffeur */}
      {isEditModalOpen && editingChauffeur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  Modifier le chauffeur : {editingChauffeur.nom}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingChauffeur(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nom du chauffeur</label>
                <input
                  type="text"
                  required
                  value={editingChauffeur.nom}
                  onChange={(e) => setEditingChauffeur({ ...editingChauffeur, nom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Zone assignée</label>
                  <input
                    type="text"
                    required
                    value={editingChauffeur.zone}
                    onChange={(e) => setEditingChauffeur({ ...editingChauffeur, zone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="ex: ain sebaa, bernoussi..."
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Capacité (places)</label>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    required
                    value={editingChauffeur.places}
                    onChange={(e) => setEditingChauffeur({ ...editingChauffeur, places: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-3">
                <p className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Configurations des 4 voyages :
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-gray-600 mb-1">Matin 1 (08h30)</label>
                    <select
                      value={normaliserOptionVoyage(editingChauffeur.voyageMatin1)}
                      onChange={(e) => setEditingChauffeur({ ...editingChauffeur, voyageMatin1: e.target.value as OptionVoyageChauffeur })}
                      className="w-full text-xs font-semibold px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {OPTIONS_VOYAGE_CHAUFFEUR.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-gray-600 mb-1">Matin 2 (09h15)</label>
                    <select
                      value={normaliserOptionVoyage(editingChauffeur.voyageMatin2)}
                      onChange={(e) => setEditingChauffeur({ ...editingChauffeur, voyageMatin2: e.target.value as OptionVoyageChauffeur })}
                      className="w-full text-xs font-semibold px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {OPTIONS_VOYAGE_CHAUFFEUR.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-gray-600 mb-1">Après-midi 15h15 (N1)</label>
                    <select
                      value={normaliserOptionVoyage(editingChauffeur.voyageApresMidi15h15)}
                      onChange={(e) => setEditingChauffeur({ ...editingChauffeur, voyageApresMidi15h15: e.target.value as OptionVoyageChauffeur })}
                      className="w-full text-xs font-semibold px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {OPTIONS_VOYAGE_CHAUFFEUR.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-gray-600 mb-1">Après-midi 16h00 (N2)</label>
                    <select
                      value={normaliserOptionVoyage(editingChauffeur.voyageApresMidi16h00)}
                      onChange={(e) => setEditingChauffeur({ ...editingChauffeur, voyageApresMidi16h00: e.target.value as OptionVoyageChauffeur })}
                      className="w-full text-xs font-semibold px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {OPTIONS_VOYAGE_CHAUFFEUR.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingChauffeur(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : Ajouter un nouveau chauffeur */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  Ajouter un nouveau chauffeur
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nom du chauffeur</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Youssef Mansouri"
                  value={newNom}
                  onChange={(e) => setNewNom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Zone assignée</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: ain sebaa, bernoussi..."
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Capacité (places)</label>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    required
                    value={newPlaces}
                    onChange={(e) => setNewPlaces(parseInt(e.target.value) || 26)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-3">
                <p className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  Configurations initiales des voyages :
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-gray-600 mb-1">Matin 1 (08h30)</label>
                    <select
                      value={newMatin1}
                      onChange={(e) => setNewMatin1(e.target.value as OptionVoyageChauffeur)}
                      className="w-full text-xs font-semibold px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {OPTIONS_VOYAGE_CHAUFFEUR.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-gray-600 mb-1">Matin 2 (09h15)</label>
                    <select
                      value={newMatin2}
                      onChange={(e) => setNewMatin2(e.target.value as OptionVoyageChauffeur)}
                      className="w-full text-xs font-semibold px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {OPTIONS_VOYAGE_CHAUFFEUR.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-gray-600 mb-1">Après-midi 15h15 (N1)</label>
                    <select
                      value={new15h15}
                      onChange={(e) => setNew15h15(e.target.value as OptionVoyageChauffeur)}
                      className="w-full text-xs font-semibold px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {OPTIONS_VOYAGE_CHAUFFEUR.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-gray-600 mb-1">Après-midi 16h00 (N2)</label>
                    <select
                      value={new16h00}
                      onChange={(e) => setNew16h00(e.target.value as OptionVoyageChauffeur)}
                      className="w-full text-xs font-semibold px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {OPTIONS_VOYAGE_CHAUFFEUR.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Ajouter au tableau
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : Confirmation de suppression */}
      {deletingChauffeur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-gray-900">
                Supprimer {deletingChauffeur.nom} ?
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Ce chauffeur ({deletingChauffeur.places} places, zone {deletingChauffeur.zone.toUpperCase()}) sera retiré de la liste et ne recevra plus d'élèves.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingChauffeur(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
