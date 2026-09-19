import React, { useState, useMemo } from 'react';
import { 
  ArrowRightLeft, 
  Clock, 
  MapPin, 
  Lock, 
  Unlock, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw, 
  Users, 
  Bus, 
  GripVertical,
  HelpCircle,
  Filter,
  Layers,
  Sparkles
} from 'lucide-react';
import { Eleve, Chauffeur, ResultatRepartition } from '../types';
import { 
  VOYAGES, 
  interchangerElevesMemeZone, 
  deplacerEleveVersChauffeurMemeZone 
} from '../utils/repartition';

interface AtelierInterchangeDragDropProps {
  resultat: ResultatRepartition;
  eleves: Eleve[];
  chauffeurs: Chauffeur[];
  chauffeursVerrouilles?: Set<string>;
  emplacementsVerrouilles?: Set<string>;
  onMettreAJourResultat: (nouveauResultat: ResultatRepartition) => void;
  onToggleVerrouiller?: (chauffeurId: string) => void;
  onToggleVerrouillerEmplacement?: (chauffeurId: string, voyageId: string) => void;
}

export const AtelierInterchangeDragDrop: React.FC<AtelierInterchangeDragDropProps> = ({
  resultat,
  eleves,
  chauffeurs,
  chauffeursVerrouilles = new Set(),
  emplacementsVerrouilles = new Set(),
  onMettreAJourResultat,
  onToggleVerrouiller,
  onToggleVerrouillerEmplacement,
}) => {
  const [selectedVoyageId, setSelectedVoyageId] = useState<string>('MATIN_1');
  const [zoneFiltre, setZoneFiltre] = useState<string>('all');
  const [draggedEleveId, setDraggedEleveId] = useState<string | null>(null);
  const [draggedSourceChauffeurId, setDraggedSourceChauffeurId] = useState<string | null>(null);
  const [draggedZone, setDraggedZone] = useState<string | null>(null);
  const [hoveredEleveId, setHoveredEleveId] = useState<string | null>(null);
  const [hoveredChauffeurId, setHoveredChauffeurId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ texte: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [historiqueResultats, setHistoriqueResultats] = useState<ResultatRepartition[]>([]);

  const mapEleves = useMemo(() => new Map(eleves.map((e) => [e.id, e])), [eleves]);

  const afficherNotification = (texte: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ texte, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.texte === texte ? null : curr));
    }, 5500);
  };

  const handleAnnuler = () => {
    if (historiqueResultats.length === 0) return;
    const precedent = historiqueResultats[historiqueResultats.length - 1];
    setHistoriqueResultats((prev) => prev.slice(0, -1));
    onMettreAJourResultat(precedent);
    afficherNotification('Action annulée : état précédent restauré.', 'info');
  };

  // Liste des zones disponibles pour le filtre
  const zonesDisponibles = useMemo(() => {
    const setZ = new Set<string>();
    chauffeurs.forEach((c) => c.zone && setZ.add(c.zone.toLowerCase().trim()));
    eleves.forEach((e) => e.zone && setZ.add(e.zone.toLowerCase().trim()));
    return Array.from(setZ).sort();
  }, [chauffeurs, eleves]);

  // Récupérer les données du voyage sélectionné
  const voyageData = resultat.parVoyage[selectedVoyageId];
  const voyageMeta = VOYAGES.find((v) => v.id === selectedVoyageId) || VOYAGES[0];

  // Chauffeurs concernés sur ce voyage
  const chauffeursFiltres = useMemo(() => {
    if (!voyageData) return [];
    return voyageData.chauffeurs.filter((c) => {
      if (zoneFiltre === 'all') return true;
      const zoneChauffeur = (c.chauffeur.zone || '').toLowerCase().trim();
      const aDesElevesDansZone = c.eleves.some(
        (el) => (el.zone || '').toLowerCase().trim() === zoneFiltre
      );
      return zoneChauffeur === zoneFiltre || aDesElevesDansZone;
    });
  }, [voyageData, zoneFiltre]);

  // GESTION DU DRAG & DROP
  const handleDragStart = (e: React.DragEvent, eleve: Eleve, chauffeurId: string) => {
    setDraggedEleveId(eleve.id);
    setDraggedSourceChauffeurId(chauffeurId);
    setDraggedZone((eleve.zone || '').trim().toLowerCase());
    e.dataTransfer.setData('text/plain', JSON.stringify({ eleveId: eleve.id, chauffeurId, zone: eleve.zone }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedEleveId(null);
    setDraggedSourceChauffeurId(null);
    setDraggedZone(null);
    setHoveredEleveId(null);
    setHoveredChauffeurId(null);
  };

  // Déposer sur un autre élève pour INTERCHANGER
  const handleDropSurEleve = (e: React.DragEvent, targetEleve: Eleve, targetChauffeurId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedEleveId) return;

    if (draggedEleveId === targetEleve.id) {
      handleDragEnd();
      return;
    }

    const draggedEleve = mapEleves.get(draggedEleveId);
    if (!draggedEleve) {
      handleDragEnd();
      return;
    }

    const zoneSource = (draggedEleve.zone || '').trim().toLowerCase();
    const zoneCible = (targetEleve.zone || '').trim().toLowerCase();

    // VÉRIFICATION STRICTE DE LA MÊME ZONE
    if (zoneSource !== zoneCible) {
      afficherNotification(
        `⛔ Interchange refusé : "${draggedEleve.nom}" est en zone ${draggedEleve.zone.toUpperCase()} alors que "${targetEleve.nom}" est en zone ${targetEleve.zone.toUpperCase()}. L'interchange par Drag & Drop exige impérativement que les deux élèves soient dans la MÊME ZONE !`,
        'error'
      );
      handleDragEnd();
      return;
    }

    // Sauvegarder dans l'historique avant d'appliquer
    setHistoriqueResultats((prev) => [...prev, resultat]);

    const res = interchangerElevesMemeZone(
      resultat,
      eleves,
      chauffeurs,
      draggedEleveId,
      targetEleve.id,
      selectedVoyageId,
      chauffeursVerrouilles,
      emplacementsVerrouilles
    );

    if (res.succes && res.nouveauResultat) {
      onMettreAJourResultat(res.nouveauResultat);
      afficherNotification(res.message, 'success');
    } else {
      afficherNotification(res.message, 'error');
    }

    handleDragEnd();
  };

  // Déposer sur la carte d'un chauffeur pour déplacer l'élève
  const handleDropSurChauffeur = (e: React.DragEvent, targetChauffeur: Chauffeur) => {
    e.preventDefault();
    if (!draggedEleveId) return;

    if (draggedSourceChauffeurId === targetChauffeur.id) {
      handleDragEnd();
      return;
    }

    const draggedEleve = mapEleves.get(draggedEleveId);
    if (!draggedEleve) {
      handleDragEnd();
      return;
    }

    const zoneSource = (draggedEleve.zone || '').trim().toLowerCase();
    const zoneChauffeur = (targetChauffeur.zone || '').trim().toLowerCase();

    // VÉRIFICATION STRICTE DE LA MÊME ZONE
    if (zoneSource !== zoneChauffeur) {
      afficherNotification(
        `⛔ Déplacement refusé : L'élève "${draggedEleve.nom}" réside en zone "${draggedEleve.zone.toUpperCase()}", alors que le bus de "${targetChauffeur.nom}" dessert la zone "${targetChauffeur.zone.toUpperCase()}". Vous ne pouvez affecter un élève qu'à un chauffeur de sa propre zone.`,
        'error'
      );
      handleDragEnd();
      return;
    }

    // Sauvegarder dans l'historique
    setHistoriqueResultats((prev) => [...prev, resultat]);

    const res = deplacerEleveVersChauffeurMemeZone(
      resultat,
      eleves,
      chauffeurs,
      draggedEleveId,
      targetChauffeur.id,
      selectedVoyageId,
      chauffeursVerrouilles,
      emplacementsVerrouilles
    );

    if (res.succes && res.nouveauResultat) {
      onMettreAJourResultat(res.nouveauResultat);
      afficherNotification(res.message, 'success');
    } else {
      afficherNotification(res.message, 'error');
    }

    handleDragEnd();
  };

  return (
    <div className="space-y-6">
      {/* Bandeau d'aide & Règle Métier */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-5 shadow-lg border border-blue-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 text-blue-300">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Atelier Drag & Drop d'interchange d'élèves
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Règle : Même Zone Requise
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-1 max-w-3xl leading-relaxed">
                <strong>Comment interchanger :</strong> Glissez un élève avec votre souris et relâchez-le directement <strong>sur un autre élève</strong> pour échanger leurs places entre chauffeurs, ou sur la boîte d'un bus pour le transférer.
                <span className="block mt-0.5 text-amber-300 font-semibold">
                  ⚠️ Condition obligatoire : Les deux élèves doivent impérativement appartenir à la <u>même zone de résidence</u>.
                </span>
              </p>
            </div>
          </div>

          {historiqueResultats.length > 0 && (
            <button
              type="button"
              onClick={handleAnnuler}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Annuler dernier échange ({historiqueResultats.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Flash */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <Clock className="w-5 h-5 text-blue-600 shrink-0" />
            )}
            <span>{notification.texte}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs font-bold underline opacity-70 hover:opacity-100 cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Barre de contrôle : Sélecteur de Voyage & Filtre de Zone */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Sélecteur des 4 créneaux de voyages */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-600" /> Créneau :
          </span>
          {VOYAGES.map((v) => {
            const isActif = selectedVoyageId === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVoyageId(v.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActif
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {v.libelle} ({v.heure})
              </button>
            );
          })}
        </div>

        {/* Filtre par zone */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <label htmlFor="filtre-zone-dnd" className="text-xs font-bold text-slate-600">
            Filtrer par zone :
          </label>
          <select
            id="filtre-zone-dnd"
            value={zoneFiltre}
            onChange={(e) => setZoneFiltre(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
          >
            <option value="all">Toutes les zones ({zonesDisponibles.length})</option>
            {zonesDisponibles.map((z) => (
              <option key={z} value={z}>
                {z.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Guide visuel pendant le glissement */}
      {draggedEleveId && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-900 font-semibold shadow-2xs animate-pulse">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>
              Glissement en cours : Relâchez sur un élève ou un bus ayant le badge{' '}
              <span className="bg-amber-200 px-2 py-0.5 rounded font-bold uppercase text-amber-950">
                {draggedZone}
              </span>{' '}
              pour valider l'échange.
            </span>
          </div>
          <span className="text-[11px] text-amber-700">Les zones différentes seront refusées</span>
        </div>
      )}

      {/* Grille des chauffeurs et de leurs élèves */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {chauffeursFiltres.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
            <Bus className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-sm">Aucun chauffeur programmé pour ce voyage avec ce filtre de zone.</p>
          </div>
        ) : (
          chauffeursFiltres.map((c) => {
            const ch = c.chauffeur;
            const isChauffeurLocked = chauffeursVerrouilles.has(ch.id);
            const isEmplacementLocked = emplacementsVerrouilles.has(`${ch.id}_${selectedVoyageId}`);
            const isLocked = isChauffeurLocked || isEmplacementLocked;
            const occupation = c.eleves.length;
            const places = ch.places;
            const pct = places > 0 ? Math.round((occupation / places) * 100) : 0;
            const zoneChauffeurNorm = (ch.zone || '').trim().toLowerCase();

            const isChauffeurCompatible = draggedZone === zoneChauffeurNorm;
            const isChauffeurHovered = hoveredChauffeurId === ch.id;

            return (
              <div
                key={ch.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!hoveredChauffeurId || hoveredChauffeurId !== ch.id) {
                    setHoveredChauffeurId(ch.id);
                  }
                }}
                onDragLeave={() => {
                  if (hoveredChauffeurId === ch.id) {
                    setHoveredChauffeurId(null);
                  }
                }}
                onDrop={(e) => handleDropSurChauffeur(e, ch)}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs flex flex-col overflow-hidden ${
                  isLocked ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                } ${
                  draggedEleveId && isChauffeurHovered
                    ? isChauffeurCompatible
                    ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/30'
                    : 'ring-2 ring-rose-500 border-rose-500 bg-rose-50/30'
                    : ''
                }`}
              >
                {/* En-tête de la carte chauffeur */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-sm shrink-0">
                      {ch.nom.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-slate-900 truncate">{ch.nom}</h4>
                        {isChauffeurLocked && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300" title="Chauffeur entièrement figé">
                            CHAUFFEUR FIGÉ
                          </span>
                        )}
                        {!isChauffeurLocked && isEmplacementLocked && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300" title="Ce créneau est figé">
                            CRÉNEAU FIGÉ
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {ch.zone}
                      </span>
                    </div>
                  </div>

                  {/* Cadenas et places */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {occupation} / {places}
                    </span>
                    {onToggleVerrouillerEmplacement ? (
                      <button
                        type="button"
                        onClick={() => onToggleVerrouillerEmplacement(ch.id, selectedVoyageId)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isEmplacementLocked || isChauffeurLocked
                            ? 'bg-amber-100 border-amber-300 text-amber-900'
                            : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                        }`}
                        title={
                          isChauffeurLocked
                            ? 'Chauffeur verrouillé en totalité'
                            : isEmplacementLocked
                            ? 'Ce créneau est verrouillé 🔒 (cliquez pour déverrouiller)'
                            : 'Verrouiller ce créneau pour ce chauffeur'
                        }
                      >
                        {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-700" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                    ) : onToggleVerrouiller ? (
                      <button
                        type="button"
                        onClick={() => onToggleVerrouiller(ch.id)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isLocked
                            ? 'bg-amber-100 border-amber-300 text-amber-900'
                            : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                        }`}
                        title={isLocked ? 'Chauffeur verrouillé (cliquez pour déverrouiller)' : 'Verrouiller ce chauffeur'}
                      >
                        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Jauge de remplissage */}
                <div className="w-full bg-slate-100 h-1">
                  <div
                    className={`h-full transition-all duration-300 ${
                      pct > 100 ? 'bg-rose-500' : pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-blue-600' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>

                {/* Zone de liste des élèves assignés */}
                <div className="p-3 flex-1 flex flex-col gap-2 max-h-96 overflow-y-auto">
                  {c.eleves.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      Aucun élève affecté. Déposez un élève de la zone "{ch.zone}" ici.
                    </div>
                  ) : (
                    c.eleves.map((eleve) => {
                      const isDragged = draggedEleveId === eleve.id;
                      const isHovered = hoveredEleveId === eleve.id;
                      const zoneEleveNorm = (eleve.zone || '').trim().toLowerCase();
                      const isCompatibleZone = draggedZone === zoneEleveNorm;

                      return (
                        <div
                          key={eleve.id}
                          draggable={!isLocked}
                          onDragStart={(e) => handleDragStart(e, eleve, ch.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (hoveredEleveId !== eleve.id) {
                              setHoveredEleveId(eleve.id);
                            }
                          }}
                          onDragLeave={(e) => {
                            e.stopPropagation();
                            if (hoveredEleveId === eleve.id) {
                              setHoveredEleveId(null);
                            }
                          }}
                          onDrop={(e) => handleDropSurEleve(e, eleve, ch.id)}
                          className={`group relative p-2.5 rounded-xl border transition-all select-none ${
                            isLocked
                              ? 'cursor-not-allowed bg-slate-50 border-slate-200 opacity-90'
                              : 'cursor-grab active:cursor-grabbing hover:shadow-xs'
                          } ${
                            isDragged
                              ? 'opacity-40 border-dashed border-blue-400 bg-blue-50'
                              : isHovered && draggedEleveId
                              ? isCompatibleZone
                                ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-400 shadow-md scale-[1.02]'
                                : 'bg-rose-100 border-rose-500 ring-2 ring-rose-400 shadow-md'
                              : eleve.niveau === 1
                              ? 'bg-blue-50/60 border-blue-200/90 text-blue-950'
                              : 'bg-purple-50/60 border-purple-200/90 text-purple-950'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <GripVertical className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                              <div className="min-w-0">
                                <p dir="rtl" className="font-arabic font-bold text-sm text-slate-950 truncate">
                                  {eleve.nom} {eleve.prenom}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Badge Niveau */}
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  eleve.niveau === 1
                                    ? 'bg-blue-200 text-blue-900'
                                    : 'bg-purple-200 text-purple-900'
                                }`}
                              >
                                N{eleve.niveau}
                              </span>

                              {/* Badge Zone */}
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 uppercase">
                                {eleve.zone}
                              </span>
                            </div>
                          </div>

                          {/* Message interactif au survol pendant le drag */}
                          {isHovered && draggedEleveId && (
                            <div
                              className={`mt-1.5 pt-1.5 border-t text-[10px] font-bold flex items-center justify-between ${
                                isCompatibleZone
                                  ? 'border-emerald-300 text-emerald-800'
                                  : 'border-rose-300 text-rose-800'
                              }`}
                            >
                              <span>
                                {isCompatibleZone
                                  ? '⇄ Relâcher pour interchanger (Même zone)'
                                  : '⛔ Zone différente : Interchange refusé'}
                              </span>
                              <span className="uppercase">{eleve.zone}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Zone de drop bas de carte */}
                <div className="p-2 border-t border-slate-100 bg-slate-50 text-center text-[11px] text-slate-400 font-medium">
                  Zone cible : <span className="font-bold text-slate-600 uppercase">{ch.zone}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
