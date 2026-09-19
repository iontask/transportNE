import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Filter, 
  ArrowLeft, 
  GraduationCap, 
  MapPin, 
  UserPlus, 
  Pencil, 
  Trash2, 
  CheckCircle2, 
  LayoutGrid, 
  List, 
  Table2, 
  Compass, 
  ChevronRight,
  Search,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Eleve } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Badge } from '../components/ui/badge';
import { ModalEditionEleve } from '../components/ModalEditionEleve';

interface ElevesPageProps {
  eleves: Eleve[];
  onNavigateToImport: () => void;
  onUpdateEleves?: (nouveauxEleves: Eleve[]) => void;
}

type ModeVue = 'liste' | 'zones' | 'niveaux' | 'matrice';

export const ElevesPage: React.FC<ElevesPageProps> = ({ 
  eleves, 
  onNavigateToImport,
  onUpdateEleves,
}) => {
  const [modeVue, setModeVue] = useState<ModeVue>('liste');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedNiveau, setSelectedNiveau] = useState<string>('all');
  const [searchTexte, setSearchTexte] = useState<string>('');

  // Modale d'édition / création
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eleveEnEdition, setEleveEnEdition] = useState<Eleve | null>(null);
  const [eleveASupprimer, setEleveASupprimer] = useState<Eleve | null>(null);

  // Message flash
  const [messageFlash, setMessageFlash] = useState<{ texte: string; type: 'success' | 'info' | 'error' } | null>(null);

  const afficherFlash = (texte: string, type: 'success' | 'info' | 'error' = 'success') => {
    setMessageFlash({ texte, type });
    setTimeout(() => {
      setMessageFlash((curr) => (curr?.texte === texte ? null : curr));
    }, 4500);
  };

  const availableZones = useMemo(() => {
    const zones = new Set(eleves.map((e) => (e.zone || '').trim().toLowerCase()));
    return Array.from(zones).filter(Boolean).sort();
  }, [eleves]);

  const filteredEleves = useMemo(() => {
    return eleves.filter((e) => {
      const matchZone = selectedZone === 'all' || (e.zone || '').toLowerCase() === selectedZone.toLowerCase();
      const matchNiveau = selectedNiveau === 'all' || String(e.niveau) === selectedNiveau;
      const matchSearch = !searchTexte.trim() || 
        (e.nom && e.nom.toLowerCase().includes(searchTexte.toLowerCase())) ||
        (e.prenom && e.prenom.toLowerCase().includes(searchTexte.toLowerCase())) ||
        (e.zone && e.zone.toLowerCase().includes(searchTexte.toLowerCase()));
      return matchZone && matchNiveau && matchSearch;
    });
  }, [eleves, selectedZone, selectedNiveau, searchTexte]);

  // Groupement par Zone
  const statsParZone = useMemo(() => {
    const record: Record<string, { total: number; n1: number; n2: number; eleves: Eleve[] }> = {};
    availableZones.forEach((z) => {
      record[z] = { total: 0, n1: 0, n2: 0, eleves: [] };
    });

    eleves.forEach((e) => {
      const z = (e.zone || '').trim().toLowerCase() || 'inconnue';
      if (!record[z]) {
        record[z] = { total: 0, n1: 0, n2: 0, eleves: [] };
      }
      record[z].total++;
      if (e.niveau === 1) record[z].n1++;
      else record[z].n2++;
      record[z].eleves.push(e);
    });

    return record;
  }, [eleves, availableZones]);

  // Groupement par Niveau
  const statsParNiveau = useMemo(() => {
    const n1Eleves = eleves.filter((e) => e.niveau === 1);
    const n2Eleves = eleves.filter((e) => e.niveau === 2);

    const zonesN1: Record<string, number> = {};
    const zonesN2: Record<string, number> = {};

    n1Eleves.forEach((e) => {
      const z = (e.zone || '').trim().toLowerCase();
      zonesN1[z] = (zonesN1[z] || 0) + 1;
    });

    n2Eleves.forEach((e) => {
      const z = (e.zone || '').trim().toLowerCase();
      zonesN2[z] = (zonesN2[z] || 0) + 1;
    });

    return {
      n1: { total: n1Eleves.length, eleves: n1Eleves, zones: zonesN1 },
      n2: { total: n2Eleves.length, eleves: n2Eleves, zones: zonesN2 },
    };
  }, [eleves]);

  // Actions CRUD
  const handleOuvrirAjout = () => {
    setEleveEnEdition(null);
    setIsModalOpen(true);
  };

  const handleOuvrirEdition = (eleve: Eleve) => {
    setEleveEnEdition(eleve);
    setIsModalOpen(true);
  };

  const handleSauvegarderEleve = (eleveModifie: Eleve) => {
    if (!onUpdateEleves) return;
    const existe = eleves.some((e) => e.id === eleveModifie.id);
    let nouvelleListe: Eleve[];
    if (existe) {
      nouvelleListe = eleves.map((e) => (e.id === eleveModifie.id ? eleveModifie : e));
      afficherFlash(`✓ Fiche élève "${eleveModifie.nom} ${eleveModifie.prenom}" mise à jour avec succès.`);
    } else {
      nouvelleListe = [eleveModifie, ...eleves];
      afficherFlash(`✓ Nouvel élève "${eleveModifie.nom} ${eleveModifie.prenom}" ajouté dans la zone ${eleveModifie.zone.toUpperCase()}.`);
    }
    onUpdateEleves(nouvelleListe);
  };

  const handleConfirmerSuppression = () => {
    if (!eleveASupprimer || !onUpdateEleves) return;
    const nouvelleListe = eleves.filter((e) => e.id !== eleveASupprimer.id);
    onUpdateEleves(nouvelleListe);
    afficherFlash(`Élève "${eleveASupprimer.nom} ${eleveASupprimer.prenom}" supprimé du registre.`, 'info');
    setEleveASupprimer(null);
  };

  const columns: Column<Eleve>[] = [
    {
      key: 'index',
      header: 'N°',
      className: 'w-14 text-gray-400 font-mono text-xs',
      render: (row) => {
        const idx = eleves.findIndex((e) => e.id === row.id) + 1;
        return <span>#{idx}</span>;
      },
    },
    {
      key: 'nom',
      header: 'النسب (Nom de famille)',
      className: 'font-semibold font-arabic text-base text-gray-900',
      render: (row) => (
        <span dir="rtl" className="inline-block font-bold text-gray-950 text-base">
          {row.nom}
        </span>
      ),
    },
    {
      key: 'prenom',
      header: 'الإسم (Prénom)',
      className: 'font-semibold font-arabic text-base text-gray-800',
      render: (row) => (
        <span dir="rtl" className="inline-block text-gray-900 text-base">
          {row.prenom || '—'}
        </span>
      ),
    },
    {
      key: 'niveau',
      header: 'Niveau & Sortie',
      className: 'text-center',
      render: (row) => (
        <Badge
          variant={row.niveau === 1 ? 'default' : 'secondary'}
          className={
            row.niveau === 1
              ? 'bg-blue-100 text-blue-800 border-blue-200 font-bold'
              : 'bg-purple-100 text-purple-800 border-purple-200 font-bold'
          }
        >
          Niveau {row.niveau} {row.niveau === 1 ? '(15h15)' : '(16h00)'}
        </Badge>
      ),
    },
    {
      key: 'zone',
      header: 'Zone de résidence',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
          <MapPin className="w-3 h-3 text-slate-500" />
          {row.zone}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right w-28',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleOuvrirEdition(row)}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            title="Modifier cet élève"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setEleveASupprimer(row)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Supprimer cet élève"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Registre des élèves
            </h1>
            <span className="text-xs font-bold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-full border border-blue-200">
              {eleves.length} élève{eleves.length > 1 ? 's' : ''} enregistré{eleves.length > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Gérez, éditez, filtrez et analysez les élèves par niveaux scolaires et zones de résidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleOuvrirAjout}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Ajouter un élève</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToImport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Importer Excel
          </button>
        </div>
      </div>

      {/* Notification flash */}
      {messageFlash && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200 ${
            messageFlash.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : messageFlash.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{messageFlash.texte}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessageFlash(null)}
            className="text-xs font-bold underline opacity-70 hover:opacity-100 cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Barre de navigation des modes de vue : Niveaux et Zones */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">Vues :</span>
          
          <button
            type="button"
            onClick={() => setModeVue('liste')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              modeVue === 'liste'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Liste détaillée & Édition</span>
          </button>

          <button
            type="button"
            onClick={() => setModeVue('zones')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              modeVue === 'zones'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Vue par Zones ({availableZones.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setModeVue('niveaux')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              modeVue === 'niveaux'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Vue par Niveaux (N1 vs N2)</span>
          </button>

          <button
            type="button"
            onClick={() => setModeVue('matrice')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              modeVue === 'matrice'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Table2 className="w-4 h-4" />
            <span>Matrice Zones × Niveaux</span>
          </button>
        </div>

        {/* Compteur d'élèves Niveau 1 / 2 */}
        <div className="flex items-center gap-2 text-xs font-semibold px-2">
          <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-1 rounded-lg">
            N1 (15h15) : {statsParNiveau.n1.total}
          </span>
          <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2 py-1 rounded-lg">
            N2 (16h00) : {statsParNiveau.n2.total}
          </span>
        </div>
      </div>

      {eleves.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Aucun élève enregistré</h3>
            <p className="text-xs text-gray-500 mt-1">
              Vous pouvez importer un fichier Excel ou ajouter un premier élève manuellement.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleOuvrirAjout}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Ajouter un élève
            </button>
            <button
              type="button"
              onClick={onNavigateToImport}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Importer Excel
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* MODE 1 : LISTE DÉTAILLÉE AVEC ÉDITION                      */}
          {/* ========================================================= */}
          {modeVue === 'liste' && (
            <div className="space-y-4">
              {/* Quick filter bar */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span>Filtres :</span>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="filter-zone" className="text-xs text-gray-500 font-medium">Zone :</label>
                  <select
                    id="filter-zone"
                    value={selectedZone}
                    onChange={(e) => setSelectedZone(e.target.value)}
                    className="text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Toutes les zones ({eleves.length})</option>
                    {availableZones.map((z) => (
                      <option key={z} value={z}>
                        {z.toUpperCase()} ({eleves.filter((e) => (e.zone || '').toLowerCase() === z).length})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="filter-niveau" className="text-xs text-gray-500 font-medium">Niveau :</label>
                  <select
                    id="filter-niveau"
                    value={selectedNiveau}
                    onChange={(e) => setSelectedNiveau(e.target.value)}
                    className="text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Tous les niveaux</option>
                    <option value="1">Niveau 1 - Sortie 15h15 ({statsParNiveau.n1.total})</option>
                    <option value="2">Niveau 2 - Sortie 16h00 ({statsParNiveau.n2.total})</option>
                  </select>
                </div>

                {(selectedZone !== 'all' || selectedNiveau !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedZone('all');
                      setSelectedNiveau('all');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline ml-auto"
                  >
                    Réinitialiser filtres
                  </button>
                )}
              </div>

              {/* Table */}
              <DataTable
                id="table-eleves"
                data={filteredEleves}
                columns={columns}
                searchable={true}
                searchPlaceholder="Rechercher par nom, prénom ou zone..."
                searchKeys={['nom', 'prenom', 'zone']}
                pageSize={15}
                emptyMessage="Aucun élève ne correspond aux critères de recherche"
              />
            </div>
          )}

          {/* ========================================================= */}
          {/* MODE 2 : VUE PAR ZONES                                     */}
          {/* ========================================================= */}
          {modeVue === 'zones' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {availableZones.map((zoneKey) => {
                  const dataZone = statsParZone[zoneKey];
                  if (!dataZone) return null;

                  return (
                    <div
                      key={zoneKey}
                      className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col"
                    >
                      {/* En-tête de la zone */}
                      <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-gray-900 uppercase">
                              {zoneKey}
                            </h3>
                            <p className="text-xs text-gray-500 font-medium">
                              {dataZone.total} élève{dataZone.total > 1 ? 's' : ''} au total
                            </p>
                          </div>
                        </div>

                        {/* Badges de répartition */}
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                            N1 (15h15) : {dataZone.n1}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                            N2 (16h00) : {dataZone.n2}
                          </span>
                        </div>
                      </div>

                      {/* Liste des élèves de la zone */}
                      <div className="p-4 flex-1 max-h-80 overflow-y-auto space-y-2">
                        {dataZone.eleves.map((el) => (
                          <div
                            key={el.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-gray-50 hover:bg-gray-100/80 border border-gray-100 text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                  el.niveau === 1
                                    ? 'bg-blue-200 text-blue-800'
                                    : 'bg-purple-200 text-purple-800'
                                }`}
                              >
                                {el.niveau}
                              </span>
                              <span dir="rtl" className="font-arabic font-bold text-sm text-gray-900">
                                {el.nom} {el.prenom}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOuvrirEdition(el)}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Modifier cet élève"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODE 3 : VUE PAR NIVEAUX                                   */}
          {/* ========================================================= */}
          {modeVue === 'niveaux' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Niveau 1 */}
              <div className="bg-white rounded-2xl border border-blue-200 shadow-xs overflow-hidden flex flex-col">
                <div className="p-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl">
                      N1
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">Niveau 1 (Maternelle & Primaire)</h3>
                      <p className="text-xs text-blue-100 mt-0.5">
                        Horaire de sortie unique : <strong className="text-white">15h15</strong>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white">{statsParNiveau.n1.total}</p>
                    <p className="text-[11px] text-blue-200 font-semibold uppercase tracking-wider">élèves</p>
                  </div>
                </div>

                <div className="p-5 space-y-4 flex-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Répartition par zone de résidence (Niveau 1) :
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {Object.entries(statsParNiveau.n1.zones).map(([zone, count]) => (
                      <div
                        key={zone}
                        className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex flex-col justify-between"
                      >
                        <span className="text-[11px] font-bold uppercase text-blue-900 truncate">
                          {zone}
                        </span>
                        <span className="text-lg font-black text-blue-700 mt-1">
                          {count} <span className="text-xs font-normal text-blue-600">élèves</span>
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-500 mb-2">
                      Aperçu des élèves Niveau 1 ({statsParNiveau.n1.total}) :
                    </p>
                    <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                      {statsParNiveau.n1.eleves.map((el) => (
                        <div
                          key={el.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs"
                        >
                          <span dir="rtl" className="font-arabic font-bold text-gray-900">
                            {el.nom} {el.prenom}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                              {el.zone}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOuvrirEdition(el)}
                              className="text-gray-400 hover:text-blue-600"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Niveau 2 */}
              <div className="bg-white rounded-2xl border border-purple-200 shadow-xs overflow-hidden flex flex-col">
                <div className="p-5 bg-gradient-to-r from-purple-600 to-purple-700 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl">
                      N2
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">Niveau 2 (Collège & Lycée)</h3>
                      <p className="text-xs text-purple-100 mt-0.5">
                        Horaire de sortie unique : <strong className="text-white">16h00</strong>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white">{statsParNiveau.n2.total}</p>
                    <p className="text-[11px] text-purple-200 font-semibold uppercase tracking-wider">élèves</p>
                  </div>
                </div>

                <div className="p-5 space-y-4 flex-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Répartition par zone de résidence (Niveau 2) :
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {Object.entries(statsParNiveau.n2.zones).map(([zone, count]) => (
                      <div
                        key={zone}
                        className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex flex-col justify-between"
                      >
                        <span className="text-[11px] font-bold uppercase text-purple-900 truncate">
                          {zone}
                        </span>
                        <span className="text-lg font-black text-purple-700 mt-1">
                          {count} <span className="text-xs font-normal text-purple-600">élèves</span>
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-500 mb-2">
                      Aperçu des élèves Niveau 2 ({statsParNiveau.n2.total}) :
                    </p>
                    <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                      {statsParNiveau.n2.eleves.map((el) => (
                        <div
                          key={el.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs"
                        >
                          <span dir="rtl" className="font-arabic font-bold text-gray-900">
                            {el.nom} {el.prenom}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                              {el.zone}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOuvrirEdition(el)}
                              className="text-gray-400 hover:text-purple-600"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODE 4 : MATRICE CROISÉE ZONES × NIVEAUX                  */}
          {/* ========================================================= */}
          {modeVue === 'matrice' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-4 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Table2 className="w-5 h-5 text-blue-600" />
                    Matrice croisée de distribution (Zones de résidence × Niveaux)
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Visualisez les effectifs combinés indispensables au dimensionnement des bus de chaque zone.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200 text-xs text-gray-600 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Zone de résidence</th>
                      <th className="py-3 px-4 text-center text-blue-700 bg-blue-50/50">
                        Niveau 1 (15h15)
                      </th>
                      <th className="py-3 px-4 text-center text-purple-700 bg-purple-50/50">
                        Niveau 2 (16h00)
                      </th>
                      <th className="py-3 px-4 text-right">Total Zone</th>
                      <th className="py-3 px-4 text-right">% du total école</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {availableZones.map((z) => {
                      const st = statsParZone[z] || { total: 0, n1: 0, n2: 0 };
                      const part = eleves.length > 0 ? Math.round((st.total / eleves.length) * 100) : 0;

                      return (
                        <tr key={z} className="hover:bg-gray-50/80 transition-colors font-medium">
                          <td className="py-3.5 px-4 font-bold text-gray-900 uppercase flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {z}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-blue-700 bg-blue-50/20 font-mono text-sm">
                            {st.n1}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-purple-700 bg-purple-50/20 font-mono text-sm">
                            {st.n2}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-gray-900 font-mono text-sm">
                            {st.total}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <span className="font-semibold text-gray-600">{part}%</span>
                              <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full"
                                  style={{ width: `${part}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-gray-300 font-bold text-xs text-gray-950">
                      <td className="py-3 px-4 uppercase font-black">TOTAL GÉNÉRAL ÉCOLE</td>
                      <td className="py-3 px-4 text-center text-blue-800 font-black text-sm font-mono">
                        {statsParNiveau.n1.total}
                      </td>
                      <td className="py-3 px-4 text-center text-purple-800 font-black text-sm font-mono">
                        {statsParNiveau.n2.total}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-base text-gray-950 font-mono">
                        {eleves.length}
                      </td>
                      <td className="py-3 px-4 text-right font-black">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal d'édition / création d'un élève */}
      <ModalEditionEleve
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eleve={eleveEnEdition}
        zonesExistantes={availableZones}
        onSave={handleSauvegarderEleve}
      />

      {/* Modale de confirmation de suppression */}
      {eleveASupprimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Confirmer la suppression</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Êtes-vous sûr de vouloir retirer l'élève{' '}
              <strong className="text-slate-900 font-arabic">
                {eleveASupprimer.nom} {eleveASupprimer.prenom}
              </strong>{' '}
              (Zone : <span className="uppercase font-bold">{eleveASupprimer.zone}</span>) du registre ?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEleveASupprimer(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmerSuppression}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
