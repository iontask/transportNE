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
  Clock,
  Star
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Chauffeur, OptionVoyageChauffeur, OPTIONS_VOYAGE_CHAUFFEUR, Eleve } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Badge } from '../components/ui/badge';
import { 
  normaliserOptionVoyage, 
  normaliserNomZone, 
  obtenirZonesChauffeur,
  obtenirZonesVoyageChauffeur,
  obtenirZoneOriginaleVoyage,
  obtenirToutesZonesChauffeur,
  VOYAGES,
  VOYAGE_KEY_TO_ID
} from '../utils/repartition';
import { ZoneVoyageSelectorField } from '../components/ZoneVoyageSelectorField';

interface ChauffeursPageProps {
  chauffeurs: Chauffeur[];
  eleves?: Eleve[];
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
  eleves = [],
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

  // Gestion des zones par voyage pour édition
  const [editingTab, setEditingTab] = useState<'matin1' | 'matin2' | '15h15' | '16h00'>('matin1');
  const [editingZonesMatin1, setEditingZonesMatin1] = useState<string[]>([]);
  const [editingZonesMatin2, setEditingZonesMatin2] = useState<string[]>([]);
  const [editingZones15h15, setEditingZones15h15] = useState<string[]>([]);
  const [editingZones16h00, setEditingZones16h00] = useState<string[]>([]);
  const [editingZoneOrigMatin1, setEditingZoneOrigMatin1] = useState<string>('');
  const [editingZoneOrigMatin2, setEditingZoneOrigMatin2] = useState<string>('');
  const [editingZoneOrig15h15, setEditingZoneOrig15h15] = useState<string>('');
  const [editingZoneOrig16h00, setEditingZoneOrig16h00] = useState<string>('');
  const [editingZoneOriginaleChauffeur, setEditingZoneOriginaleChauffeur] = useState<string>('');

  // Gestion des zones par voyage pour ajout
  const [newTab, setNewTab] = useState<'matin1' | 'matin2' | '15h15' | '16h00'>('matin1');
  const [newZonesMatin1, setNewZonesMatin1] = useState<string[]>(['ain sebaa']);
  const [newZonesMatin2, setNewZonesMatin2] = useState<string[]>(['ain sebaa']);
  const [newZones15h15, setNewZones15h15] = useState<string[]>(['ain sebaa']);
  const [newZones16h00, setNewZones16h00] = useState<string[]>(['ain sebaa']);
  const [newZoneOrigMatin1, setNewZoneOrigMatin1] = useState<string>('ain sebaa');
  const [newZoneOrigMatin2, setNewZoneOrigMatin2] = useState<string>('ain sebaa');
  const [newZoneOrig15h15, setNewZoneOrig15h15] = useState<string>('ain sebaa');
  const [newZoneOrig16h00, setNewZoneOrig16h00] = useState<string>('ain sebaa');
  const [newZoneOriginaleChauffeur, setNewZoneOriginaleChauffeur] = useState<string>('ain sebaa');

  // Modale rapide pour modifier les zones d'un créneau depuis le tableau
  const [quickZonesModal, setQuickZonesModal] = useState<{
    chauffeurId: string;
    chauffeurNom: string;
    voyageKey: 'voyageMatin1' | 'voyageMatin2' | 'voyageApresMidi15h15' | 'voyageApresMidi16h00';
    voyageId: string;
    voyageLabel: string;
    zones: string[];
    zoneOriginale: string;
  } | null>(null);
  const [quickZonesModalApplyAll, setQuickZonesModalApplyAll] = useState(false);

  // Formulaire d'ajout
  const [newNom, setNewNom] = useState('');
  const [newPlaces, setNewPlaces] = useState<number>(26);
  const [newMatin1, setNewMatin1] = useState<OptionVoyageChauffeur>('N1');
  const [newMatin2, setNewMatin2] = useState<OptionVoyageChauffeur>('N2');
  const [new15h15, setNew15h15] = useState<OptionVoyageChauffeur>('N1');
  const [new16h00, setNew16h00] = useState<OptionVoyageChauffeur>('N2');

  const totalPlaces = useMemo(() => {
    return chauffeurs.reduce((sum, c) => sum + c.places, 0);
  }, [chauffeurs]);

  // Toutes les zones disponibles issues de la liste des élèves (ou des chauffeurs)
  const availableZonesEleves = useMemo(() => {
    const zones = new Set<string>();
    if (eleves && eleves.length > 0) {
      eleves.forEach((e) => {
        const z = normaliserNomZone(e.zone);
        if (z) zones.add(z);
      });
    }
    if (zones.size === 0) {
      chauffeurs.forEach((c) => {
        obtenirToutesZonesChauffeur(c).forEach((z) => zones.add(z));
      });
    }
    return Array.from(zones).filter(Boolean).sort();
  }, [eleves, chauffeurs]);

  const availableZones = useMemo(() => {
    const zones = new Set<string>();
    chauffeurs.forEach((c) => {
      obtenirToutesZonesChauffeur(c).forEach((z) => zones.add(z));
    });
    return Array.from(zones).filter(Boolean).sort();
  }, [chauffeurs]);

  const filteredChauffeurs = useMemo(() => {
    if (selectedZone === 'all') return chauffeurs;
    return chauffeurs.filter((c) => obtenirToutesZonesChauffeur(c).includes(selectedZone));
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

  // Ouverture du formulaire d'édition avec chargement des zones de chaque voyage
  const handleOpenEdit = (ch: Chauffeur) => {
    setEditingChauffeur({ ...ch });
    setEditingZonesMatin1(obtenirZonesVoyageChauffeur(ch, 'MATIN_1'));
    setEditingZonesMatin2(obtenirZonesVoyageChauffeur(ch, 'MATIN_2'));
    setEditingZones15h15(obtenirZonesVoyageChauffeur(ch, 'APRES_MIDI_15H15'));
    setEditingZones16h00(obtenirZonesVoyageChauffeur(ch, 'APRES_MIDI_16H00'));

    setEditingZoneOrigMatin1(obtenirZoneOriginaleVoyage(ch, 'MATIN_1'));
    setEditingZoneOrigMatin2(obtenirZoneOriginaleVoyage(ch, 'MATIN_2'));
    setEditingZoneOrig15h15(obtenirZoneOriginaleVoyage(ch, 'APRES_MIDI_15H15'));
    setEditingZoneOrig16h00(obtenirZoneOriginaleVoyage(ch, 'APRES_MIDI_16H00'));
    setEditingZoneOriginaleChauffeur(ch.zoneOriginale || ch.zone || 'ain sebaa');

    setEditingTab('matin1');
    setIsEditModalOpen(true);
  };

  // Copier les zones d'un voyage vers les 3 autres voyages
  const handleCopyZonesAcrossAll = (sourceZones: string[], mode: 'edit' | 'new', sourceZoneOrig?: string) => {
    const copy = [...sourceZones];
    if (mode === 'edit') {
      setEditingZonesMatin1([...copy]);
      setEditingZonesMatin2([...copy]);
      setEditingZones15h15([...copy]);
      setEditingZones16h00([...copy]);
      if (sourceZoneOrig) {
        setEditingZoneOrigMatin1(sourceZoneOrig);
        setEditingZoneOrigMatin2(sourceZoneOrig);
        setEditingZoneOrig15h15(sourceZoneOrig);
        setEditingZoneOrig16h00(sourceZoneOrig);
      }
    } else {
      setNewZonesMatin1([...copy]);
      setNewZonesMatin2([...copy]);
      setNewZones15h15([...copy]);
      setNewZones16h00([...copy]);
      if (sourceZoneOrig) {
        setNewZoneOrigMatin1(sourceZoneOrig);
        setNewZoneOrigMatin2(sourceZoneOrig);
        setNewZoneOrig15h15(sourceZoneOrig);
        setNewZoneOrig16h00(sourceZoneOrig);
      }
    }
    showToast(`Zones appliquées aux 4 voyages (${copy.length} zone(s)).`);
  };

  // Ouverture du formulaire d'ajout
  const handleOpenAdd = () => {
    setNewNom('');
    setNewPlaces(26);
    setNewMatin1('N1');
    setNewMatin2('N2');
    setNew15h15('N1');
    setNew16h00('N2');
    const initialZone = availableZonesEleves.length > 0 ? [availableZonesEleves[0]] : ['ain sebaa'];
    const initOrig = initialZone[0];
    setNewZonesMatin1([...initialZone]);
    setNewZonesMatin2([...initialZone]);
    setNewZones15h15([...initialZone]);
    setNewZones16h00([...initialZone]);
    setNewZoneOrigMatin1(initOrig);
    setNewZoneOrigMatin2(initOrig);
    setNewZoneOrig15h15(initOrig);
    setNewZoneOrig16h00(initOrig);
    setNewZoneOriginaleChauffeur(initOrig);
    setNewTab('matin1');
    setIsAddModalOpen(true);
  };

  // Ajout d'un nouveau chauffeur
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNom.trim()) return;

    let cleanM1 = Array.from(new Set(newZonesMatin1.map(normaliserNomZone).filter(Boolean)));
    let cleanM2 = Array.from(new Set(newZonesMatin2.map(normaliserNomZone).filter(Boolean)));
    let clean15 = Array.from(new Set(newZones15h15.map(normaliserNomZone).filter(Boolean)));
    let clean16 = Array.from(new Set(newZones16h00.map(normaliserNomZone).filter(Boolean)));

    const normOrigM1 = newZoneOrigMatin1 ? normaliserNomZone(newZoneOrigMatin1) : (cleanM1[0] || 'ain sebaa');
    const normOrigM2 = newZoneOrigMatin2 ? normaliserNomZone(newZoneOrigMatin2) : (cleanM2[0] || 'ain sebaa');
    const normOrig15 = newZoneOrig15h15 ? normaliserNomZone(newZoneOrig15h15) : (clean15[0] || 'ain sebaa');
    const normOrig16 = newZoneOrig16h00 ? normaliserNomZone(newZoneOrig16h00) : (clean16[0] || 'ain sebaa');

    if (normOrigM1 && !cleanM1.includes(normOrigM1)) cleanM1 = [normOrigM1, ...cleanM1];
    if (normOrigM2 && !cleanM2.includes(normOrigM2)) cleanM2 = [normOrigM2, ...cleanM2];
    if (normOrig15 && !clean15.includes(normOrig15)) clean15 = [normOrig15, ...clean15];
    if (normOrig16 && !clean16.includes(normOrig16)) clean16 = [normOrig16, ...clean16];

    const allZones = Array.from(new Set([...cleanM1, ...cleanM2, ...clean15, ...clean16]));
    const finalAllZones = allZones.length > 0 ? allZones : ['ain sebaa'];

    const newChauffeur: Chauffeur = {
      id: 'ch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      nom: newNom.trim(),
      places: Number(newPlaces) || 26,
      zoneOriginale: newZoneOriginaleChauffeur || normOrigM1,
      zoneOriginaleVoyageMatin1: normOrigM1,
      zoneOriginaleVoyageMatin2: normOrigM2,
      zoneOriginaleVoyageApresMidi15h15: normOrig15,
      zoneOriginaleVoyageApresMidi16h00: normOrig16,
      zonesOriginalesParVoyage: {
        'MATIN_1': normOrigM1,
        'MATIN_2': normOrigM2,
        'APRES_MIDI_15H15': normOrig15,
        'APRES_MIDI_16H00': normOrig16,
      },
      voyageMatin1: newMatin1,
      voyageMatin2: newMatin2,
      voyageApresMidi15h15: new15h15,
      voyageApresMidi16h00: new16h00,
      zonesVoyageMatin1: cleanM1.length > 0 ? cleanM1 : finalAllZones,
      zonesVoyageMatin2: cleanM2.length > 0 ? cleanM2 : finalAllZones,
      zonesVoyageApresMidi15h15: clean15.length > 0 ? clean15 : finalAllZones,
      zonesVoyageApresMidi16h00: clean16.length > 0 ? clean16 : finalAllZones,
      zonesParVoyage: {
        'MATIN_1': cleanM1.length > 0 ? cleanM1 : finalAllZones,
        'MATIN_2': cleanM2.length > 0 ? cleanM2 : finalAllZones,
        'APRES_MIDI_15H15': clean15.length > 0 ? clean15 : finalAllZones,
        'APRES_MIDI_16H00': clean16.length > 0 ? clean16 : finalAllZones,
      },
      zones: finalAllZones,
      zone: finalAllZones.join(', '),
    };

    if (onUpdateChauffeurs) {
      onUpdateChauffeurs([...chauffeurs, newChauffeur]);
    }

    setIsAddModalOpen(false);
    showToast(`Chauffeur ${newChauffeur.nom} ajouté avec succès avec ses zones par voyage.`);
  };

  // Enregistrement rapide depuis la modale directe du tableau
  const handleSaveQuickZones = () => {
    if (!quickZonesModal) return;
    const target = chauffeurs.find((c) => c.id === quickZonesModal.chauffeurId);
    if (!target) return;

    let cleanedZones = Array.from(
      new Set(quickZonesModal.zones.map(normaliserNomZone).filter(Boolean))
    );
    const chosenOrig = quickZonesModal.zoneOriginale ? normaliserNomZone(quickZonesModal.zoneOriginale) : (cleanedZones[0] || '');
    if (chosenOrig && !cleanedZones.includes(chosenOrig)) {
      cleanedZones = [chosenOrig, ...cleanedZones];
    } else if (chosenOrig) {
      cleanedZones = [chosenOrig, ...cleanedZones.filter((z) => z !== chosenOrig)];
    }

    const voyageKey = quickZonesModal.voyageKey;
    const voyageId = quickZonesModal.voyageId;

    let updated: Chauffeur;
    if (quickZonesModalApplyAll) {
      updated = {
        ...target,
        zoneOriginale: chosenOrig || target.zoneOriginale,
        zoneOriginaleVoyageMatin1: chosenOrig,
        zoneOriginaleVoyageMatin2: chosenOrig,
        zoneOriginaleVoyageApresMidi15h15: chosenOrig,
        zoneOriginaleVoyageApresMidi16h00: chosenOrig,
        zonesOriginalesParVoyage: {
          'MATIN_1': chosenOrig,
          'MATIN_2': chosenOrig,
          'APRES_MIDI_15H15': chosenOrig,
          'APRES_MIDI_16H00': chosenOrig,
        },
        zonesVoyageMatin1: [...cleanedZones],
        zonesVoyageMatin2: [...cleanedZones],
        zonesVoyageApresMidi15h15: [...cleanedZones],
        zonesVoyageApresMidi16h00: [...cleanedZones],
        zonesParVoyage: {
          'MATIN_1': [...cleanedZones],
          'MATIN_2': [...cleanedZones],
          'APRES_MIDI_15H15': [...cleanedZones],
          'APRES_MIDI_16H00': [...cleanedZones],
        },
        zones: [...cleanedZones],
        zone: cleanedZones.join(', '),
      };
    } else {
      const zM1 = voyageKey === 'voyageMatin1' ? cleanedZones : obtenirZonesVoyageChauffeur(target, 'MATIN_1');
      const zM2 = voyageKey === 'voyageMatin2' ? cleanedZones : obtenirZonesVoyageChauffeur(target, 'MATIN_2');
      const z15 = voyageKey === 'voyageApresMidi15h15' ? cleanedZones : obtenirZonesVoyageChauffeur(target, 'APRES_MIDI_15H15');
      const z16 = voyageKey === 'voyageApresMidi16h00' ? cleanedZones : obtenirZonesVoyageChauffeur(target, 'APRES_MIDI_16H00');
      const allUnion = Array.from(new Set([...zM1, ...zM2, ...z15, ...z16]));

      const origM1 = voyageKey === 'voyageMatin1' ? chosenOrig : obtenirZoneOriginaleVoyage(target, 'MATIN_1');
      const origM2 = voyageKey === 'voyageMatin2' ? chosenOrig : obtenirZoneOriginaleVoyage(target, 'MATIN_2');
      const orig15 = voyageKey === 'voyageApresMidi15h15' ? chosenOrig : obtenirZoneOriginaleVoyage(target, 'APRES_MIDI_15H15');
      const orig16 = voyageKey === 'voyageApresMidi16h00' ? chosenOrig : obtenirZoneOriginaleVoyage(target, 'APRES_MIDI_16H00');

      updated = {
        ...target,
        zoneOriginaleVoyageMatin1: origM1,
        zoneOriginaleVoyageMatin2: origM2,
        zoneOriginaleVoyageApresMidi15h15: orig15,
        zoneOriginaleVoyageApresMidi16h00: orig16,
        zonesOriginalesParVoyage: {
          ...(target.zonesOriginalesParVoyage || {}),
          [voyageId]: chosenOrig,
          [voyageKey]: chosenOrig,
          'MATIN_1': origM1,
          'MATIN_2': origM2,
          'APRES_MIDI_15H15': orig15,
          'APRES_MIDI_16H00': orig16,
        },
        zonesVoyageMatin1: zM1,
        zonesVoyageMatin2: zM2,
        zonesVoyageApresMidi15h15: z15,
        zonesVoyageApresMidi16h00: z16,
        zonesParVoyage: {
          ...(target.zonesParVoyage || {}),
          [voyageId]: cleanedZones,
          [voyageKey]: cleanedZones,
          'MATIN_1': zM1,
          'MATIN_2': zM2,
          'APRES_MIDI_15H15': z15,
          'APRES_MIDI_16H00': z16,
        },
        zones: allUnion,
        zone: allUnion.join(', '),
      };
    }

    if (onUpdateChauffeur) {
      onUpdateChauffeur(updated);
    } else if (onUpdateChauffeurs) {
      const updatedList = chauffeurs.map((c) => (c.id === updated.id ? updated : c));
      onUpdateChauffeurs(updatedList);
    }

    setQuickZonesModal(null);
    setQuickZonesModalApplyAll(false);
    showToast(`Zones du voyage ${quickZonesModal.voyageLabel} mises à jour pour ${target.nom} (${cleanedZones.length} zone(s)).`);
  };

  // Enregistrement de la modification complète du chauffeur
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChauffeur) return;

    let cleanM1 = Array.from(new Set(editingZonesMatin1.map(normaliserNomZone).filter(Boolean)));
    let cleanM2 = Array.from(new Set(editingZonesMatin2.map(normaliserNomZone).filter(Boolean)));
    let clean15 = Array.from(new Set(editingZones15h15.map(normaliserNomZone).filter(Boolean)));
    let clean16 = Array.from(new Set(editingZones16h00.map(normaliserNomZone).filter(Boolean)));

    const normOrigM1 = editingZoneOrigMatin1 ? normaliserNomZone(editingZoneOrigMatin1) : (cleanM1[0] || 'ain sebaa');
    const normOrigM2 = editingZoneOrigMatin2 ? normaliserNomZone(editingZoneOrigMatin2) : (cleanM2[0] || 'ain sebaa');
    const normOrig15 = editingZoneOrig15h15 ? normaliserNomZone(editingZoneOrig15h15) : (clean15[0] || 'ain sebaa');
    const normOrig16 = editingZoneOrig16h00 ? normaliserNomZone(editingZoneOrig16h00) : (clean16[0] || 'ain sebaa');

    if (normOrigM1 && !cleanM1.includes(normOrigM1)) cleanM1 = [normOrigM1, ...cleanM1];
    if (normOrigM2 && !cleanM2.includes(normOrigM2)) cleanM2 = [normOrigM2, ...cleanM2];
    if (normOrig15 && !clean15.includes(normOrig15)) clean15 = [normOrig15, ...clean15];
    if (normOrig16 && !clean16.includes(normOrig16)) clean16 = [normOrig16, ...clean16];

    const allZones = Array.from(new Set([...cleanM1, ...cleanM2, ...clean15, ...clean16]));
    const finalAllZones = allZones.length > 0 ? allZones : ['ain sebaa'];

    const updated: Chauffeur = {
      ...editingChauffeur,
      nom: editingChauffeur.nom.trim(),
      places: Number(editingChauffeur.places) || 22,
      zoneOriginale: editingZoneOriginaleChauffeur || normOrigM1,
      zoneOriginaleVoyageMatin1: normOrigM1,
      zoneOriginaleVoyageMatin2: normOrigM2,
      zoneOriginaleVoyageApresMidi15h15: normOrig15,
      zoneOriginaleVoyageApresMidi16h00: normOrig16,
      zonesOriginalesParVoyage: {
        'MATIN_1': normOrigM1,
        'MATIN_2': normOrigM2,
        'APRES_MIDI_15H15': normOrig15,
        'APRES_MIDI_16H00': normOrig16,
      },
      voyageMatin1: normaliserOptionVoyage(editingChauffeur.voyageMatin1),
      voyageMatin2: normaliserOptionVoyage(editingChauffeur.voyageMatin2),
      voyageApresMidi15h15: normaliserOptionVoyage(editingChauffeur.voyageApresMidi15h15),
      voyageApresMidi16h00: normaliserOptionVoyage(editingChauffeur.voyageApresMidi16h00),
      zonesVoyageMatin1: cleanM1.length > 0 ? cleanM1 : finalAllZones,
      zonesVoyageMatin2: cleanM2.length > 0 ? cleanM2 : finalAllZones,
      zonesVoyageApresMidi15h15: clean15.length > 0 ? clean15 : finalAllZones,
      zonesVoyageApresMidi16h00: clean16.length > 0 ? clean16 : finalAllZones,
      zonesParVoyage: {
        'MATIN_1': cleanM1.length > 0 ? cleanM1 : finalAllZones,
        'MATIN_2': cleanM2.length > 0 ? cleanM2 : finalAllZones,
        'APRES_MIDI_15H15': clean15.length > 0 ? clean15 : finalAllZones,
        'APRES_MIDI_16H00': clean16.length > 0 ? clean16 : finalAllZones,
      },
      zones: finalAllZones,
      zone: finalAllZones.join(', '),
    };

    if (onUpdateChauffeur) {
      onUpdateChauffeur(updated);
    } else if (onUpdateChauffeurs) {
      const updatedList = chauffeurs.map((c) => (c.id === updated.id ? updated : c));
      onUpdateChauffeurs(updatedList);
    }

    setIsEditModalOpen(false);
    setEditingChauffeur(null);
    showToast(`Chauffeur ${updated.nom} mis à jour avec les zones et la zone originale par voyage.`);
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
      ZONES: obtenirZonesChauffeur(c).map((z) => z.toUpperCase()).join(', '),
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

  // Composant du sélecteur inline d'option de voyage + affichage/gestion des zones
  const renderInlineVoyageSelect = (
    chauffeur: Chauffeur,
    voyageKey: 'voyageMatin1' | 'voyageMatin2' | 'voyageApresMidi15h15' | 'voyageApresMidi16h00'
  ) => {
    const currentValue = normaliserOptionVoyage(chauffeur[voyageKey]);
    const style = getOptionStyle(currentValue);
    const voyageId = VOYAGE_KEY_TO_ID[voyageKey] || 'MATIN_1';
    const voyageZones = obtenirZonesVoyageChauffeur(chauffeur, voyageId);
    const voyageOrigine = obtenirZoneOriginaleVoyage(chauffeur, voyageId);
    const voyageMeta = VOYAGES.find((v) => v.id === voyageId) || {
      id: voyageId,
      libelle: voyageKey,
      heure: '',
    };

    return (
      <div className="space-y-1.5 min-w-[170px] py-1">
        <div className="relative inline-block w-full">
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

        {/* Zones spécifiques affectées à ce voyage */}
        <div className="flex flex-wrap items-center gap-1">
          {voyageZones.length === 0 ? (
            <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              Sans zone
            </span>
          ) : (
            voyageZones.map((z) => {
              const isOrig = normaliserNomZone(z) === normaliserNomZone(voyageOrigine);
              return (
                <span
                  key={z}
                  title={isOrig ? `Zone originale prioritaire pour ce voyage` : `Zone desservie`}
                  className={`inline-flex items-center gap-0.5 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                    isOrig
                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-black shadow-2xs'
                      : 'text-slate-700 bg-slate-100 border-slate-200'
                  }`}
                >
                  {isOrig ? (
                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600 shrink-0" />
                  ) : (
                    <MapPin className="w-2 h-2 text-blue-500 shrink-0" />
                  )}
                  {z}
                </span>
              );
            })
          )}
          <button
            type="button"
            onClick={() => {
              setQuickZonesModal({
                chauffeurId: chauffeur.id,
                chauffeurNom: chauffeur.nom,
                voyageKey,
                voyageId,
                voyageLabel: `${voyageMeta.libelle} (${voyageMeta.heure})`,
                zones: [...voyageZones],
                zoneOriginale: voyageOrigine,
              });
              setQuickZonesModalApplyAll(false);
            }}
            className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 transition-colors cursor-pointer"
            title={`Gérer les zones et la zone originale de ${chauffeur.nom} pour ce voyage`}
          >
            <Plus className="w-2.5 h-2.5" />
            <span>Zones ({voyageZones.length})</span>
          </button>
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
      header: 'Toutes les zones',
      className: 'min-w-[180px]',
      render: (row) => {
        const zonesList = obtenirToutesZonesChauffeur(row);
        const origPrincipale = row.zoneOriginale || zonesList[0];
        return (
          <div className="flex flex-wrap items-center gap-1 py-1">
            {origPrincipale && (
              <span
                title="Zone d'origine principale"
                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 shadow-2xs"
              >
                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600 shrink-0" />
                {origPrincipale}
              </span>
            )}
            {zonesList.filter(z => normaliserNomZone(z) !== normaliserNomZone(origPrincipale)).map((z) => (
              <span
                key={z}
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300"
              >
                <MapPin className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                {z}
              </span>
            ))}
            {zonesList.length === 0 && (
              <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Aucune zone
              </span>
            )}
            <button
              type="button"
              onClick={() => handleOpenEdit(row)}
              className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 cursor-pointer transition-colors"
              title="Configurer les zones et zones originales par voyage"
            >
              <Edit3 className="w-2.5 h-2.5" />
              <span>Détails</span>
            </button>
          </div>
        );
      },
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
      className: 'min-w-[200px]',
      render: (row) => renderInlineVoyageSelect(row, 'voyageMatin1'),
    },
    {
      key: 'voyageMatin2',
      header: 'Matin 2 (09h15)',
      className: 'min-w-[200px]',
      render: (row) => renderInlineVoyageSelect(row, 'voyageMatin2'),
    },
    {
      key: 'voyageApresMidi15h15',
      header: '15h15 (N1)',
      className: 'min-w-[200px]',
      render: (row) => renderInlineVoyageSelect(row, 'voyageApresMidi15h15'),
    },
    {
      key: 'voyageApresMidi16h00',
      header: '16h00 (N2)',
      className: 'min-w-[200px]',
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
            onClick={() => handleOpenEdit(row)}
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
            onClick={handleOpenAdd}
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
              onClick={handleOpenAdd}
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
                  const count = chauffeurs.filter((c) => obtenirZonesChauffeur(c).includes(z)).length;
                  const pl = chauffeurs.filter((c) => obtenirZonesChauffeur(c).includes(z)).reduce((s, c) => s + c.places, 0);
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

      {/* MODAL : Modification complète du chauffeur (zones par voyage) */}
      {isEditModalOpen && editingChauffeur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">
                    Modifier le chauffeur : {editingChauffeur.nom}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Définissez les zones desservies pour chaque voyage individuel
                  </p>
                </div>
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

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Capacité assise (places)</label>
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

                <div>
                  <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    <span>Zone d'origine générale</span>
                  </label>
                  <input
                    type="text"
                    value={editingZoneOriginaleChauffeur}
                    onChange={(e) => setEditingZoneOriginaleChauffeur(e.target.value)}
                    placeholder="ex: ain sebaa"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-bold text-amber-900 bg-amber-50/50"
                  />
                </div>
              </div>

              {/* Onglets des 4 voyages pour configurer les zones */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Configuration des zones par voyage :</span>
                  </label>
                  <span className="text-[10px] text-gray-500">
                    Sélectionnez un voyage ci-dessous pour lui attribuer ses zones et sa zone originale
                  </span>
                </div>

                {/* Barre d'onglets de voyage */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {VOYAGES.map((v) => {
                    const tabKey = (
                      v.id === 'MATIN_1' ? 'matin1' :
                      v.id === 'MATIN_2' ? 'matin2' :
                      v.id === 'APRES_MIDI_15H15' ? '15h15' : '16h00'
                    ) as 'matin1' | 'matin2' | '15h15' | '16h00';

                    const zoneCount = (
                      tabKey === 'matin1' ? editingZonesMatin1.length :
                      tabKey === 'matin2' ? editingZonesMatin2.length :
                      tabKey === '15h15' ? editingZones15h15.length : editingZones16h00.length
                    );

                    const origZone = (
                      tabKey === 'matin1' ? editingZoneOrigMatin1 :
                      tabKey === 'matin2' ? editingZoneOrigMatin2 :
                      tabKey === '15h15' ? editingZoneOrig15h15 : editingZoneOrig16h00
                    );

                    const isActive = editingTab === tabKey;

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setEditingTab(tabKey)}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-white text-blue-700 shadow-xs border border-blue-200'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                        }`}
                      >
                        <span className="truncate">{v.libelle}</span>
                        <span className="text-[10px] text-gray-500 font-medium">{v.heure}</span>
                        <span className={`mt-0.5 text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                          zoneCount > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {zoneCount} zone{zoneCount > 1 ? 's' : ''}
                        </span>
                        {origZone && (
                          <span className="text-[9px] font-bold text-amber-700 truncate max-w-full">
                            ★ {origZone}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Contenu de l'onglet actif : Option de voyage + Sélecteur de zones */}
                {editingTab === 'matin1' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 p-2.5 bg-blue-50/60 rounded-xl border border-blue-200">
                      <div>
                        <span className="font-bold text-gray-800 text-xs block">Option Matin 1 (08h30)</span>
                        <span className="text-[11px] text-gray-500">Niveau d'élèves pris en charge</span>
                      </div>
                      <select
                        value={normaliserOptionVoyage(editingChauffeur.voyageMatin1)}
                        onChange={(e) => setEditingChauffeur({ ...editingChauffeur, voyageMatin1: e.target.value as OptionVoyageChauffeur })}
                        className="text-xs font-semibold px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                      >
                        {OPTIONS_VOYAGE_CHAUFFEUR.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <ZoneVoyageSelectorField
                      label="Zones pour Matin 1 (08h30)"
                      subLabel="Ce chauffeur ne transportera au Matin 1 que les élèves situés dans ces zones."
                      zones={editingZonesMatin1}
                      onChangeZones={setEditingZonesMatin1}
                      zoneOriginale={editingZoneOrigMatin1}
                      onChangeZoneOriginale={setEditingZoneOrigMatin1}
                      availableZonesEleves={availableZonesEleves}
                      accentColor="blue"
                      onCopyAll={() => handleCopyZonesAcrossAll(editingZonesMatin1, 'edit', editingZoneOrigMatin1)}
                    />
                  </div>
                )}

                {editingTab === 'matin2' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-200">
                      <div>
                        <span className="font-bold text-gray-800 text-xs block">Option Matin 2 (09h15)</span>
                        <span className="text-[11px] text-gray-500">Niveau d'élèves pris en charge</span>
                      </div>
                      <select
                        value={normaliserOptionVoyage(editingChauffeur.voyageMatin2)}
                        onChange={(e) => setEditingChauffeur({ ...editingChauffeur, voyageMatin2: e.target.value as OptionVoyageChauffeur })}
                        className="text-xs font-semibold px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 cursor-pointer bg-white"
                      >
                        {OPTIONS_VOYAGE_CHAUFFEUR.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <ZoneVoyageSelectorField
                      label="Zones pour Matin 2 (09h15)"
                      subLabel="Ce chauffeur ne transportera au Matin 2 que les élèves situés dans ces zones."
                      zones={editingZonesMatin2}
                      onChangeZones={setEditingZonesMatin2}
                      zoneOriginale={editingZoneOrigMatin2}
                      onChangeZoneOriginale={setEditingZoneOrigMatin2}
                      availableZonesEleves={availableZonesEleves}
                      accentColor="indigo"
                      onCopyAll={() => handleCopyZonesAcrossAll(editingZonesMatin2, 'edit', editingZoneOrigMatin2)}
                    />
                  </div>
                )}

                {editingTab === '15h15' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 p-2.5 bg-purple-50/60 rounded-xl border border-purple-200">
                      <div>
                        <span className="font-bold text-gray-800 text-xs block">Option Après-midi 15h15 (N1)</span>
                        <span className="text-[11px] text-gray-500">Niveau d'élèves pris en charge</span>
                      </div>
                      <select
                        value={normaliserOptionVoyage(editingChauffeur.voyageApresMidi15h15)}
                        onChange={(e) => setEditingChauffeur({ ...editingChauffeur, voyageApresMidi15h15: e.target.value as OptionVoyageChauffeur })}
                        className="text-xs font-semibold px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 cursor-pointer bg-white"
                      >
                        {OPTIONS_VOYAGE_CHAUFFEUR.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <ZoneVoyageSelectorField
                      label="Zones pour 15h15 (Niveau 1)"
                      subLabel="Ce chauffeur ne transportera à 15h15 que les élèves situés dans ces zones."
                      zones={editingZones15h15}
                      onChangeZones={setEditingZones15h15}
                      zoneOriginale={editingZoneOrig15h15}
                      onChangeZoneOriginale={setEditingZoneOrig15h15}
                      availableZonesEleves={availableZonesEleves}
                      accentColor="purple"
                      onCopyAll={() => handleCopyZonesAcrossAll(editingZones15h15, 'edit', editingZoneOrig15h15)}
                    />
                  </div>
                )}

                {editingTab === '16h00' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 p-2.5 bg-amber-50/60 rounded-xl border border-amber-200">
                      <div>
                        <span className="font-bold text-gray-800 text-xs block">Option Après-midi 16h00 (N2)</span>
                        <span className="text-[11px] text-gray-500">Niveau d'élèves pris en charge</span>
                      </div>
                      <select
                        value={normaliserOptionVoyage(editingChauffeur.voyageApresMidi16h00)}
                        onChange={(e) => setEditingChauffeur({ ...editingChauffeur, voyageApresMidi16h00: e.target.value as OptionVoyageChauffeur })}
                        className="text-xs font-semibold px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 cursor-pointer bg-white"
                      >
                        {OPTIONS_VOYAGE_CHAUFFEUR.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <ZoneVoyageSelectorField
                      label="Zones pour 16h00 (Niveau 2)"
                      subLabel="Ce chauffeur ne transportera à 16h00 que les élèves situés dans ces zones."
                      zones={editingZones16h00}
                      onChangeZones={setEditingZones16h00}
                      zoneOriginale={editingZoneOrig16h00}
                      onChangeZoneOriginale={setEditingZoneOrig16h00}
                      availableZonesEleves={availableZonesEleves}
                      accentColor="amber"
                      onCopyAll={() => handleCopyZonesAcrossAll(editingZones16h00, 'edit', editingZoneOrig16h00)}
                    />
                  </div>
                )}
              </div>

              {/* Aperçu global des zones couvertes */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
                <span className="font-bold text-gray-700 block">
                  Résumé des zones cumulées couvertes par ce chauffeur :
                </span>
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set([...editingZonesMatin1, ...editingZonesMatin2, ...editingZones15h15, ...editingZones16h00])).map((z) => (
                    <span key={z} className="px-2 py-0.5 rounded bg-white border border-gray-300 font-bold uppercase text-gray-800">
                      {z}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 shrink-0">
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

      {/* MODAL : Ajouter un nouveau chauffeur (zones par voyage) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">
                    Ajouter un nouveau chauffeur
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Attribuez des zones spécifiques pour chaque voyage
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Capacité assise (places)</label>
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

                <div>
                  <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    <span>Zone d'origine par défaut</span>
                  </label>
                  <input
                    type="text"
                    value={newZoneOriginaleChauffeur}
                    onChange={(e) => setNewZoneOriginaleChauffeur(e.target.value)}
                    placeholder="ex: ain sebaa"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase font-bold text-amber-900 bg-amber-50/50"
                  />
                </div>
              </div>

              {/* Onglets des 4 voyages */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Configuration des zones par voyage :</span>
                  </label>
                  <span className="text-[10px] text-gray-500">
                    Sélectionnez un voyage ci-dessous pour lui attribuer ses zones et sa zone originale
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {VOYAGES.map((v) => {
                    const tabKey = (
                      v.id === 'MATIN_1' ? 'matin1' :
                      v.id === 'MATIN_2' ? 'matin2' :
                      v.id === 'APRES_MIDI_15H15' ? '15h15' : '16h00'
                    ) as 'matin1' | 'matin2' | '15h15' | '16h00';

                    const zoneCount = (
                      tabKey === 'matin1' ? newZonesMatin1.length :
                      tabKey === 'matin2' ? newZonesMatin2.length :
                      tabKey === '15h15' ? newZones15h15.length : newZones16h00.length
                    );

                    const origZone = (
                      tabKey === 'matin1' ? newZoneOrigMatin1 :
                      tabKey === 'matin2' ? newZoneOrigMatin2 :
                      tabKey === '15h15' ? newZoneOrig15h15 : newZoneOrig16h00
                    );

                    const isActive = newTab === tabKey;

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setNewTab(tabKey)}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                        }`}
                      >
                        <span className="truncate">{v.libelle}</span>
                        <span className="text-[10px] text-gray-500 font-medium">{v.heure}</span>
                        <span className={`mt-0.5 text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                          zoneCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {zoneCount} zone{zoneCount > 1 ? 's' : ''}
                        </span>
                        {origZone && (
                          <span className="text-[9px] font-bold text-amber-700 truncate max-w-full">
                            ★ {origZone}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Contenu onglet actif Nouveau Chauffeur */}
                {newTab === 'matin1' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 p-2.5 bg-blue-50/60 rounded-xl border border-blue-200">
                      <div>
                        <span className="font-bold text-gray-800 text-xs block">Option Matin 1 (08h30)</span>
                        <span className="text-[11px] text-gray-500">Niveau d'élèves pris en charge</span>
                      </div>
                      <select
                        value={newMatin1}
                        onChange={(e) => setNewMatin1(e.target.value as OptionVoyageChauffeur)}
                        className="text-xs font-semibold px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                      >
                        {OPTIONS_VOYAGE_CHAUFFEUR.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <ZoneVoyageSelectorField
                      label="Zones pour Matin 1 (08h30)"
                      subLabel="Zones desservies par ce nouveau chauffeur lors de la première rotation matinale."
                      zones={newZonesMatin1}
                      onChangeZones={setNewZonesMatin1}
                      zoneOriginale={newZoneOrigMatin1}
                      onChangeZoneOriginale={setNewZoneOrigMatin1}
                      availableZonesEleves={availableZonesEleves}
                      accentColor="blue"
                      onCopyAll={() => handleCopyZonesAcrossAll(newZonesMatin1, 'new', newZoneOrigMatin1)}
                    />
                  </div>
                )}

                {newTab === 'matin2' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-200">
                      <div>
                        <span className="font-bold text-gray-800 text-xs block">Option Matin 2 (09h15)</span>
                        <span className="text-[11px] text-gray-500">Niveau d'élèves pris en charge</span>
                      </div>
                      <select
                        value={newMatin2}
                        onChange={(e) => setNewMatin2(e.target.value as OptionVoyageChauffeur)}
                        className="text-xs font-semibold px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 cursor-pointer bg-white"
                      >
                        {OPTIONS_VOYAGE_CHAUFFEUR.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <ZoneVoyageSelectorField
                      label="Zones pour Matin 2 (09h15)"
                      subLabel="Zones desservies par ce nouveau chauffeur lors de la deuxième rotation matinale."
                      zones={newZonesMatin2}
                      onChangeZones={setNewZonesMatin2}
                      zoneOriginale={newZoneOrigMatin2}
                      onChangeZoneOriginale={setNewZoneOrigMatin2}
                      availableZonesEleves={availableZonesEleves}
                      accentColor="indigo"
                      onCopyAll={() => handleCopyZonesAcrossAll(newZonesMatin2, 'new', newZoneOrigMatin2)}
                    />
                  </div>
                )}

                {newTab === '15h15' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 p-2.5 bg-purple-50/60 rounded-xl border border-purple-200">
                      <div>
                        <span className="font-bold text-gray-800 text-xs block">Option Après-midi 15h15 (N1)</span>
                        <span className="text-[11px] text-gray-500">Niveau d'élèves pris en charge</span>
                      </div>
                      <select
                        value={new15h15}
                        onChange={(e) => setNew15h15(e.target.value as OptionVoyageChauffeur)}
                        className="text-xs font-semibold px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 cursor-pointer bg-white"
                      >
                        {OPTIONS_VOYAGE_CHAUFFEUR.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <ZoneVoyageSelectorField
                      label="Zones pour 15h15 (Niveau 1)"
                      subLabel="Zones desservies par ce nouveau chauffeur à la sortie de 15h15."
                      zones={newZones15h15}
                      onChangeZones={setNewZones15h15}
                      zoneOriginale={newZoneOrig15h15}
                      onChangeZoneOriginale={setNewZoneOrig15h15}
                      availableZonesEleves={availableZonesEleves}
                      accentColor="purple"
                      onCopyAll={() => handleCopyZonesAcrossAll(newZones15h15, 'new', newZoneOrig15h15)}
                    />
                  </div>
                )}

                {newTab === '16h00' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 p-2.5 bg-amber-50/60 rounded-xl border border-amber-200">
                      <div>
                        <span className="font-bold text-gray-800 text-xs block">Option Après-midi 16h00 (N2)</span>
                        <span className="text-[11px] text-gray-500">Niveau d'élèves pris en charge</span>
                      </div>
                      <select
                        value={new16h00}
                        onChange={(e) => setNew16h00(e.target.value as OptionVoyageChauffeur)}
                        className="text-xs font-semibold px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 cursor-pointer bg-white"
                      >
                        {OPTIONS_VOYAGE_CHAUFFEUR.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <ZoneVoyageSelectorField
                      label="Zones pour 16h00 (Niveau 2)"
                      subLabel="Zones desservies par ce nouveau chauffeur à la sortie de 16h00."
                      zones={newZones16h00}
                      onChangeZones={setNewZones16h00}
                      zoneOriginale={newZoneOrig16h00}
                      onChangeZoneOriginale={setNewZoneOrig16h00}
                      availableZonesEleves={availableZonesEleves}
                      accentColor="amber"
                      onCopyAll={() => handleCopyZonesAcrossAll(newZones16h00, 'new', newZoneOrig16h00)}
                    />
                  </div>
                )}
              </div>

              {/* Aperçu global des zones pour le nouveau chauffeur */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
                <span className="font-bold text-gray-700 block">
                  Résumé des zones cumulées couvertes :
                </span>
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set([...newZonesMatin1, ...newZonesMatin2, ...newZones15h15, ...newZones16h00])).map((z) => (
                    <span key={z} className="px-2 py-0.5 rounded bg-white border border-gray-300 font-bold uppercase text-gray-800">
                      {z}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 shrink-0">
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

      {/* MODAL RAPIDE : Édition des zones pour un voyage spécifique depuis le tableau */}
      {quickZonesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">
                    Zones de {quickZonesModal.chauffeurNom}
                  </h3>
                  <p className="text-xs font-semibold text-blue-700">
                    Voyage : {quickZonesModal.voyageLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickZonesModal(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <ZoneVoyageSelectorField
                label={`Zones affectées au voyage (${quickZonesModal.voyageLabel})`}
                subLabel="L'algorithme de répartition n'affectera à ce chauffeur QUE les élèves de ces zones pour ce voyage précis. La zone originale aura la priorité."
                zones={quickZonesModal.zones}
                onChangeZones={(newZ) => setQuickZonesModal({ ...quickZonesModal, zones: newZ })}
                zoneOriginale={quickZonesModal.zoneOriginale}
                onChangeZoneOriginale={(newOrig) => setQuickZonesModal({ ...quickZonesModal, zoneOriginale: newOrig })}
                availableZonesEleves={availableZonesEleves}
                accentColor="blue"
              />

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={quickZonesModalApplyAll}
                    onChange={(e) => setQuickZonesModalApplyAll(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Appliquer également ces zones et la zone originale aux 3 autres voyages de ce chauffeur</span>
                </label>
                <p className="text-[10px] text-gray-500 mt-1 pl-6">
                  Pratique si ce chauffeur garde le même secteur géographique et la même zone prioritaire pour tous ses voyages.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setQuickZonesModal(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickZones}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Enregistrer les zones
                </button>
              </div>
            </div>
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
