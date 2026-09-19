import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Users, 
  Bus, 
  Layers, 
  Menu, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  GraduationCap,
  Sparkles,
  FileText,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Lock,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { Eleve, Chauffeur, ResultatRepartition } from '../types';

export type TabType = 'import' | 'repartition' | 'optimisation-ia' | 'listes-chauffeur' | 'listes-voyage' | 'eleves' | 'chauffeurs';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  eleves: Eleve[];
  chauffeurs: Chauffeur[];
  resultat?: ResultatRepartition | null;
  chauffeursVerrouilles?: Set<string>;
  emplacementsVerrouilles?: Set<string>;
  onDeverrouillerTout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  eleves,
  chauffeurs,
  resultat,
  chauffeursVerrouilles = new Set(),
  emplacementsVerrouilles = new Set(),
  onDeverrouillerTout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // État pliable dynamique de la sidebar (mémorisé dans localStorage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sidebar_is_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_is_collapsed', String(next));
      } catch {
        // Ignorer si indisponible
      }
      return next;
    });
  };

  const totalPlaces = chauffeurs.reduce((acc, c) => acc + c.places, 0);
  const totalEleves = eleves.length;
  const hasData = totalEleves > 0 || chauffeurs.length > 0;
  const isDeficit = hasData && totalEleves > totalPlaces;

  // Taux de remplissage moyen dynamique
  const tauxGlobalMoyen = (() => {
    if (!resultat) {
      return chauffeurs.length > 0 && totalPlaces > 0
        ? Math.min(100, Math.round((totalEleves / totalPlaces) * 100))
        : 0;
    }
    const chauffeurStats = Object.values(resultat.parChauffeur || {});
    if (chauffeurStats.length === 0) return 0;
    const sommeTaux = chauffeurStats.reduce((acc, c) => acc + (c.tauxGlobal || 0), 0);
    return Math.round((sommeTaux / chauffeurStats.length) * 100);
  })();

  const nbVerrouillesChauffeurs = chauffeursVerrouilles.size;
  const nbVerrouillesEmplacements = emplacementsVerrouilles.size;
  const totalVerrouilles = nbVerrouillesChauffeurs + nbVerrouillesEmplacements;

  const navItems: Array<{
    id: TabType;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
    disabled?: boolean;
  }> = [
    {
      id: 'import',
      label: 'Import des données',
      description: 'Fichiers Excel élèves & chauffeurs',
      icon: FileSpreadsheet,
      badge: hasData ? `${eleves.length + chauffeurs.length}` : undefined,
    },
    {
      id: 'repartition',
      label: 'Répartition automatique',
      description: resultat 
        ? `${resultat.statistiques.totalAffectations} affectations actives`
        : 'Affectation & équilibrage',
      icon: Sparkles,
      badge: resultat ? 'Calculé' : hasData ? 'Prêt' : undefined,
      badgeColor: resultat ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800',
    },
    {
      id: 'optimisation-ia',
      label: 'Recommandations IA',
      description: 'Carburant, flotte & équité',
      icon: Cpu,
      disabled: !resultat,
      badge: resultat ? '3 Scénarios' : undefined,
      badgeColor: 'bg-purple-100 text-purple-800',
    },
    {
      id: 'listes-chauffeur',
      label: 'Listes par chauffeur',
      description: 'Listes 4 voyages & émargement',
      icon: UserCheck,
      disabled: !resultat,
      badge: resultat ? 'PDF & Excel' : undefined,
      badgeColor: 'bg-indigo-100 text-indigo-800',
    },
    {
      id: 'listes-voyage',
      label: 'Listes par voyage',
      description: 'Vue 4 créneaux (tous chauffeurs)',
      icon: FileText,
      disabled: !resultat,
      badge: resultat ? '4 voyages' : undefined,
      badgeColor: 'bg-purple-100 text-purple-800',
    },
    {
      id: 'eleves',
      label: 'Registre Élèves',
      description: `${eleves.length} élève${eleves.length > 1 ? 's' : ''} inscrit${eleves.length > 1 ? 's' : ''}`,
      icon: Users,
      badge: eleves.length > 0 ? `${eleves.length}` : undefined,
    },
    {
      id: 'chauffeurs',
      label: 'Chauffeurs & Véhicules',
      description: `${chauffeurs.length} chauffeur${chauffeurs.length > 1 ? 's' : ''} (${totalPlaces} places)`,
      icon: Bus,
      badge: chauffeurs.length > 0 ? `${chauffeurs.length}` : undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans">
      {/* Sidebar Desktop Dynamique */}
      <aside 
        className={`hidden md:flex flex-col bg-white border-r border-slate-200 shrink-0 select-none transition-all duration-300 ease-in-out relative ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* Logo & Toggle Collapsible Header */}
        <div className={`p-4 border-b border-slate-200 flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <h1 className="font-bold text-slate-900 text-sm leading-tight truncate">
                  Transport Scolaire
                </h1>
                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mt-0.5 truncate">
                  AIN SEBAA • 2026-2027
                </p>
              </div>
            )}
          </div>

          {/* Bouton Dynamique de Réduction / Déploiement */}
          <button
            type="button"
            onClick={toggleCollapse}
            id="sidebar-toggle-btn"
            className={`p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs ${
              isCollapsed ? 'w-8 h-8 flex items-center justify-center' : ''
            }`}
            title={isCollapsed ? 'Déplier la barre latérale (Sidebar)' : 'Réduire la barre latérale (Sidebar)'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        </div>

        {/* Dynamic Global Summary Widget */}
        {!isCollapsed ? (
          <div className="p-3.5 mx-3 my-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                État du parc
              </span>
              {hasData ? (
                isDeficit ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> Déficit
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Équilibré
                  </span>
                )
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">En attente</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-lg border border-slate-200/70 shadow-2xs">
                <div className="font-extrabold text-slate-900 text-sm">{totalEleves}</div>
                <div className="text-[10px] text-slate-500 font-medium">Élèves</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/70 shadow-2xs">
                <div className="font-extrabold text-slate-900 text-sm">{totalPlaces}</div>
                <div className="text-[10px] text-slate-500 font-medium">Places</div>
              </div>
            </div>

            {/* Jauge dynamique en temps réel si répartition active */}
            {resultat && (
              <div className="pt-2 border-t border-slate-200/70">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-600 font-medium flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-blue-600" /> Taux moyen
                  </span>
                  <span className="font-bold text-slate-900 font-mono">{tauxGlobalMoyen}%</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${
                      tauxGlobalMoyen >= 80 ? 'bg-emerald-500' : tauxGlobalMoyen >= 60 ? 'bg-blue-600' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, tauxGlobalMoyen))}%` }}
                  />
                </div>
              </div>
            )}

            {/* Alerte dynamique : Chauffeurs & Emplacements verrouillés 🔒 */}
            {totalVerrouilles > 0 && (
              <div className="flex flex-col gap-1.5 p-2 bg-amber-50 rounded-lg border border-amber-300 text-amber-900 text-[11px]">
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Verrouillages actifs ({totalVerrouilles})</span>
                  </div>
                  {onDeverrouillerTout && (
                    <button
                      type="button"
                      onClick={onDeverrouillerTout}
                      className="text-[10px] font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                      title="Tout déverrouiller"
                    >
                      Tout libérer
                    </button>
                  )}
                </div>
                <div className="text-[10px] text-amber-800 space-y-0.5 pl-5">
                  {nbVerrouillesChauffeurs > 0 && (
                    <div>• {nbVerrouillesChauffeurs} chauffeur{nbVerrouillesChauffeurs > 1 ? 's' : ''} entier{nbVerrouillesChauffeurs > 1 ? 's' : ''} figé{nbVerrouillesChauffeurs > 1 ? 's' : ''}</div>
                  )}
                  {nbVerrouillesEmplacements > 0 && (
                    <div>• {nbVerrouillesEmplacements} créneau{nbVerrouillesEmplacements > 1 ? 'x' : ''} / emplacement{nbVerrouillesEmplacements > 1 ? 's' : ''} figé{nbVerrouillesEmplacements > 1 ? 's' : ''}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Mini badge en mode replié */
          <div className="p-2 mx-2 my-2 text-center">
            {resultat ? (
              <div 
                className="p-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-center shadow-2xs group relative cursor-pointer"
                onClick={() => onTabChange('repartition')}
                title={`Taux moyen : ${tauxGlobalMoyen}%`}
              >
                <TrendingUp className="w-4 h-4 mx-auto text-blue-600" />
                <span className="text-[10px] font-bold font-mono block mt-0.5">{tauxGlobalMoyen}%</span>
              </div>
            ) : (
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-center">
                <span className="text-[10px] font-bold font-mono block">{totalEleves}</span>
                <span className="text-[8px] uppercase">élèv.</span>
              </div>
            )}

            {totalVerrouilles > 0 && (
              <div 
                className="mt-1.5 p-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 text-center"
                title={`${totalVerrouilles} élément(s) verrouillé(s) 🔒 (${nbVerrouillesChauffeurs} chauffeur(s), ${nbVerrouillesEmplacements} créneau(x))`}
              >
                <Lock className="w-3.5 h-3.5 mx-auto text-amber-700" />
                <span className="text-[9px] font-bold block">{totalVerrouilles}</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation Dynamique */}
        <nav className="flex-1 p-2.5 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {!isCollapsed && (
            <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Navigation
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <div key={item.id} className="relative group">
                <button
                  id={`nav-tab-${item.id}`}
                  onClick={() => !item.disabled && onTabChange(item.id)}
                  disabled={item.disabled}
                  className={`w-full flex items-center rounded-xl transition-all ${
                    isCollapsed 
                      ? 'justify-center p-2.5 my-1' 
                      : 'justify-between p-3'
                  } ${
                    item.disabled
                      ? 'opacity-40 cursor-not-allowed text-slate-400'
                      : isActive
                      ? 'bg-blue-50 text-blue-700 font-medium border border-blue-200/90 shadow-xs cursor-pointer'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 cursor-pointer'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 min-w-0'}`}>
                    <div
                      className={`p-2 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                    </div>
                    {!isCollapsed && (
                      <div className="truncate text-left">
                        <p className={`text-sm ${isActive ? 'font-bold text-blue-900' : 'font-semibold'}`}>
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{item.description}</p>
                      </div>
                    )}
                  </div>

                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        isActive
                          ? 'bg-blue-200/70 text-blue-800'
                          : item.badgeColor || 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Pastille discrète en mode replié */}
                  {isCollapsed && item.badge && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white" />
                  )}
                </button>

                {/* Floating Tooltip Dynamique pour le mode replié */}
                {isCollapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 flex items-center gap-2">
                    <div>
                      <p className="font-bold">{item.label}</p>
                      <p className="text-[11px] text-slate-300 font-normal">{item.description}</p>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500 text-white font-bold ml-1">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer info dynamique */}
        {!isCollapsed ? (
          <div className="p-3.5 border-t border-slate-200 text-xs text-slate-500 bg-slate-50/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Système Aïn Sebaâ</span>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                v2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              4 créneaux horaires, zones et verrouillage direct.
            </p>
          </div>
        ) : (
          <div className="p-3 border-t border-slate-200 text-center text-slate-400">
            <button
              type="button"
              onClick={toggleCollapse}
              className="w-full flex items-center justify-center p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              title="Déplier la sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Header Dynamique */}
      <div className="md:hidden bg-white border-b border-slate-200 p-3.5 sticky top-0 z-30 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm">Transport Scolaire</h1>
            <p className="text-[10px] text-blue-600 font-semibold uppercase">AIN SEBAA • 2026-2027</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalVerrouilles > 0 && (
            <span 
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded-md"
              title={`${totalVerrouilles} verrouillage(s) actif(s) (${nbVerrouillesChauffeurs} chauffeurs, ${nbVerrouillesEmplacements} créneaux)`}
            >
              <Lock className="w-2.5 h-2.5 text-amber-700" />
              {totalVerrouilles}
            </span>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop & Menu Dynamique */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="bg-white border-b border-slate-200 p-4 space-y-2 shadow-xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Menu de Navigation
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!item.disabled) {
                      onTabChange(item.id);
                      setMobileMenuOpen(false);
                    }
                  }}
                  disabled={item.disabled}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors ${
                    item.disabled
                      ? 'opacity-40 cursor-not-allowed text-slate-400'
                      : isActive
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-bold block">{item.label}</span>
                      <span className="text-xs text-slate-400 font-normal">{item.description}</span>
                    </div>
                  </div>
                  {item.badge && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

