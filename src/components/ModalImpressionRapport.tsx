import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { ResultatRepartition, Chauffeur, Eleve } from '../types';
import { exporterRapportRecapitulatifPDF } from '../utils/pdfExport';

interface ModalImpressionRapportProps {
  isOpen: boolean;
  onClose: () => void;
  resultat: ResultatRepartition;
  chauffeurs: Chauffeur[];
  eleves: Eleve[];
  chauffeursVerrouilles?: Set<string>;
  emplacementsVerrouilles?: Set<string>;
}

export const ModalImpressionRapport: React.FC<ModalImpressionRapportProps> = ({
  isOpen,
  onClose,
  resultat,
  chauffeurs,
  eleves,
  chauffeursVerrouilles = new Set(),
  emplacementsVerrouilles = new Set(),
}) => {
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [printFeedback, setPrintFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const totalPlaces = chauffeurs.reduce((acc, c) => acc + (Number(c.places) || 0), 0);
  const totalEleves = eleves.length;
  const tauxGlobal = totalPlaces > 0 ? Math.round((totalEleves / totalPlaces) * 100) : 0;
  const nbVerrous = chauffeursVerrouilles.size + emplacementsVerrouilles.size;
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleTelechargerPDF = async () => {
    try {
      setIsExportingPDF(true);
      setPrintFeedback(null);
      await exporterRapportRecapitulatifPDF(
        resultat,
        chauffeurs,
        eleves,
        chauffeursVerrouilles,
        emplacementsVerrouilles
      );
      setPrintFeedback({
        type: 'success',
        message: 'Le rapport récapitulatif PDF officiel a été généré et téléchargé avec succès !',
      });
    } catch (err) {
      console.error('Erreur export PDF rapport:', err);
      setPrintFeedback({
        type: 'error',
        message: 'Une erreur est survenue lors de la génération du PDF.',
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleImprimer = () => {
    setPrintFeedback(null);
    try {
      // Tenter l'impression native du navigateur
      window.print();
      setPrintFeedback({
        type: 'success',
        message: 'Boîte de dialogue d\'impression ouverte.',
      });
    } catch (err) {
      console.warn('Impression bloquée par la sandbox iframe :', err);
      setPrintFeedback({
        type: 'warning',
        message: 'L\'impression directe est restreinte par le navigateur dans cette vue intégrée. Téléchargement automatique du document PDF pour impression immédiate...',
      });
      // Fallback automatique vers le téléchargement du PDF officiel
      handleTelechargerPDF();
    }
  };

  // Calcul des totaux colonnes
  let totalM1 = 0;
  let totalM2 = 0;
  let totalS15 = 0;
  let totalS16 = 0;
  let totalAssigne = 0;

  Object.values(resultat.parChauffeur).forEach((r) => {
    totalM1 += r.voyages['MATIN_1']?.placesUtilisees || 0;
    totalM2 += r.voyages['MATIN_2']?.placesUtilisees || 0;
    totalS15 += r.voyages['APRES_MIDI_15H15']?.placesUtilisees || 0;
    totalS16 += r.voyages['APRES_MIDI_16H00']?.placesUtilisees || 0;
    totalAssigne += r.totalEleves;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 my-4 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête de la modale */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>Impression & Export du Rapport Général</span>
                <span className="text-[11px] font-semibold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/30">
                  Format A4
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Aperçu fidèle du document officiel prêt pour impression ou téléchargement PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTelechargerPDF}
              disabled={isExportingPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {isExportingPDF ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Génération PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger PDF (A4)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleImprimer}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bannière de notification si message */}
        {printFeedback && (
          <div className={`px-5 py-2.5 flex items-center gap-2 text-xs font-medium shrink-0 ${
            printFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
              : printFeedback.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-b border-amber-200'
              : 'bg-rose-50 text-rose-900 border-b border-rose-200'
          }`}>
            {printFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{printFeedback.message}</span>
          </div>
        )}

        {/* Zone de prévisualisation imprimable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70">
          <div 
            id="zone-rapport-imprimable"
            className="bg-white mx-auto shadow-md border border-slate-300 rounded-lg p-6 sm:p-8 max-w-4xl text-slate-900"
          >
            {/* En-tête officiel du document */}
            <div className="border-b-2 border-blue-700 pb-4 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Royaume du Maroc — Ministère de l'Éducation Nationale
                </p>
                <h1 className="text-xl font-black text-blue-900 tracking-tight mt-0.5">
                  École AIN SEBAA
                </h1>
                <p className="text-xs font-semibold text-slate-600">
                  Direction du Transport Scolaire • Année Scolaire 2026-2027
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="inline-block bg-blue-50 border border-blue-200 text-blue-800 font-extrabold text-xs px-3 py-1 rounded-md">
                  TABLEAU GÉNÉRAL DES ROTATIONS
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Édité le {dateStr}
                </p>
              </div>
            </div>

            {/* Statistiques clés */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Élèves Inscrits</span>
                <span className="text-base font-black text-blue-800">{totalEleves} élèves</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Capacité Flotte</span>
                <span className="text-base font-black text-emerald-700">{totalPlaces} places ({chauffeurs.length} bus)</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Taux Remplissage</span>
                <span className={`text-base font-black ${tauxGlobal <= 60 ? 'text-amber-700' : 'text-blue-800'}`}>
                  {tauxGlobal}%
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Verrous de sécurité</span>
                <span className="text-base font-black text-slate-700">
                  {nbVerrous > 0 ? `🔒 ${nbVerrous} verrou(s)` : '0 actif'}
                </span>
              </div>
            </div>

            {/* Tableau principal récapitulatif */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-blue-800 text-white font-bold">
                    <th className="border border-blue-700 p-2 text-center w-8">N°</th>
                    <th className="border border-blue-700 p-2 text-left">Chauffeur</th>
                    <th className="border border-blue-700 p-2 text-center">Zone</th>
                    <th className="border border-blue-700 p-2 text-center">Capacité</th>
                    <th className="border border-blue-700 p-2 text-center bg-blue-700">Matin 1 (8h30)</th>
                    <th className="border border-blue-700 p-2 text-center bg-blue-700">Matin 2 (9h15)</th>
                    <th className="border border-blue-700 p-2 text-center bg-purple-800">15h15 (N1)</th>
                    <th className="border border-blue-700 p-2 text-center bg-purple-800">16h00 (N2)</th>
                    <th className="border border-blue-700 p-2 text-center bg-slate-900">Total Élèves</th>
                    <th className="border border-blue-700 p-2 text-center">Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(resultat.parChauffeur).map((r, idx) => {
                    const m1 = r.voyages['MATIN_1']?.placesUtilisees || 0;
                    const m2 = r.voyages['MATIN_2']?.placesUtilisees || 0;
                    const s15 = r.voyages['APRES_MIDI_15H15']?.placesUtilisees || 0;
                    const s16 = r.voyages['APRES_MIDI_16H00']?.placesUtilisees || 0;
                    const pct = Math.round(r.tauxGlobal * 100);

                    const isChLocked = chauffeursVerrouilles.has(r.chauffeur.id);
                    const isM1Locked = emplacementsVerrouilles.has(`${r.chauffeur.id}_MATIN_1`);
                    const isM2Locked = emplacementsVerrouilles.has(`${r.chauffeur.id}_MATIN_2`);
                    const isS15Locked = emplacementsVerrouilles.has(`${r.chauffeur.id}_APRES_MIDI_15H15`);
                    const isS16Locked = emplacementsVerrouilles.has(`${r.chauffeur.id}_APRES_MIDI_16H00`);

                    return (
                      <tr 
                        key={r.chauffeur.id}
                        className={isChLocked ? 'bg-amber-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                      >
                        <td className="border border-slate-300 p-1.5 text-center text-slate-500 font-medium">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 p-1.5 font-bold text-slate-900">
                          {isChLocked && <span className="text-amber-600 mr-1">🔒</span>}
                          {r.chauffeur.nom}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 uppercase text-[11px]">
                          {r.chauffeur.zone}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-semibold">
                          {r.chauffeur.places}
                        </td>
                        <td className={`border border-slate-300 p-1.5 text-center font-bold text-blue-900 ${isM1Locked ? 'bg-amber-100/70' : ''}`}>
                          {isM1Locked && <span className="text-amber-600 text-[10px] mr-0.5">🔒</span>}
                          {m1}
                        </td>
                        <td className={`border border-slate-300 p-1.5 text-center font-bold text-blue-900 ${isM2Locked ? 'bg-amber-100/70' : ''}`}>
                          {isM2Locked && <span className="text-amber-600 text-[10px] mr-0.5">🔒</span>}
                          {m2}
                        </td>
                        <td className={`border border-slate-300 p-1.5 text-center font-bold text-purple-900 ${isS15Locked ? 'bg-amber-100/70' : ''}`}>
                          {isS15Locked && <span className="text-amber-600 text-[10px] mr-0.5">🔒</span>}
                          {s15}
                        </td>
                        <td className={`border border-slate-300 p-1.5 text-center font-bold text-purple-900 ${isS16Locked ? 'bg-amber-100/70' : ''}`}>
                          {isS16Locked && <span className="text-amber-600 text-[10px] mr-0.5">🔒</span>}
                          {s16}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-black bg-slate-100 text-slate-900">
                          {r.totalEleves}
                        </td>
                        <td className={`border border-slate-300 p-1.5 text-center font-bold ${pct <= 55 ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totaux */}
                  <tr className="bg-slate-200 font-bold text-slate-900">
                    <td colSpan={3} className="border border-slate-400 p-2 text-right uppercase text-[11px]">
                      Totaux Généraux :
                    </td>
                    <td className="border border-slate-400 p-2 text-center">
                      {totalPlaces}
                    </td>
                    <td className="border border-slate-400 p-2 text-center text-blue-900 font-extrabold">
                      {totalM1}
                    </td>
                    <td className="border border-slate-400 p-2 text-center text-blue-900 font-extrabold">
                      {totalM2}
                    </td>
                    <td className="border border-slate-400 p-2 text-center text-purple-900 font-extrabold">
                      {totalS15}
                    </td>
                    <td className="border border-slate-400 p-2 text-center text-purple-900 font-extrabold">
                      {totalS16}
                    </td>
                    <td className="border border-slate-400 p-2 text-center text-slate-900 font-black">
                      {totalAssigne}
                    </td>
                    <td className="border border-slate-400 p-2 text-center">
                      {tauxGlobal}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Cadres de signature et visa officiel */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200">
              <div className="border border-dashed border-slate-400 rounded-lg p-4 h-24 flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Visa du Responsable du Transport Scolaire :
                </span>
                <span className="text-[10px] text-slate-400">Date et signature</span>
              </div>
              <div className="border border-dashed border-slate-400 rounded-lg p-4 h-24 flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Cachet et Signature de la Direction de l'Établissement :
                </span>
                <span className="text-[10px] text-slate-400">Pour accord et application</span>
              </div>
            </div>

            {/* Pied de page du document */}
            <div className="mt-6 pt-3 border-t border-slate-200 flex justify-between text-[10px] text-slate-500">
              <span>École AIN SEBAA — Direction des Services Généraux</span>
              <span>Document officiel de gestion des flux scolaires</span>
            </div>
          </div>
        </div>

        {/* Pied de la modale */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Document prêt pour émargement, archivage et distribution aux chauffeurs.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={handleTelechargerPDF}
              disabled={isExportingPDF}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger PDF (A4 Paysage)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
