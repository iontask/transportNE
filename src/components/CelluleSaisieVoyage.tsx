import React, { useState, useEffect } from 'react';
import { Minus, Plus, Lock, Unlock } from 'lucide-react';

interface CelluleSaisieVoyageProps {
  chauffeurId: string;
  voyageId: string;
  valeur: number;
  capacite: number;
  colorTheme?: 'blue' | 'purple';
  estEmplacementVerrouille?: boolean;
  chauffeurVerrouille?: boolean;
  estOptionSans?: boolean;
  onToggleVerrouillerEmplacement?: (chauffeurId: string, voyageId: string) => void;
  onAjusterDirect: (chauffeurId: string, voyageId: string, nouveauNombre: number) => void;
  onIncrementer: (chauffeurId: string, voyageId: string) => void;
  onDecrementer: (chauffeurId: string, voyageId: string) => void;
}

export const CelluleSaisieVoyage: React.FC<CelluleSaisieVoyageProps> = ({
  chauffeurId,
  voyageId,
  valeur,
  capacite,
  colorTheme = 'blue',
  estEmplacementVerrouille = false,
  chauffeurVerrouille = false,
  estOptionSans = false,
  onToggleVerrouillerEmplacement,
  onAjusterDirect,
  onIncrementer,
  onDecrementer,
}) => {
  const [valeurTexte, setValeurTexte] = useState<string>(valeur.toString());
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // Synchroniser la valeur si elle change depuis une autre source
  useEffect(() => {
    if (!isFocused) {
      setValeurTexte(valeur.toString());
    }
  }, [valeur, isFocused]);

  const isDepassement = valeur > capacite;
  const isPlein = valeur >= capacite;
  const isVide = valeur === 0;
  const isProtege = chauffeurVerrouille || estEmplacementVerrouille;

  const validerChangement = () => {
    if (isProtege) return;
    const parsed = parseInt(valeurTexte.trim(), 10);
    if (isNaN(parsed)) {
      setValeurTexte(valeur.toString());
      return;
    }
    const bornee = Math.max(0, Math.min(capacite, parsed));
    setValeurTexte(bornee.toString());
    if (bornee !== valeur) {
      onAjusterDirect(chauffeurId, voyageId, bornee);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setValeurTexte(valeur.toString());
      e.currentTarget.blur();
    }
  };

  const bgCell = colorTheme === 'blue' ? 'bg-blue-50/20' : 'bg-purple-50/20';
  const hoverBtnColor = colorTheme === 'blue' ? 'hover:bg-blue-100 hover:text-blue-700' : 'hover:bg-purple-100 hover:text-purple-700';

  return (
    <td className={`py-2 px-2 text-center ${bgCell}`}>
      <div className="flex flex-col items-center justify-center gap-0.5">
        <div 
          className={`inline-flex items-center justify-center gap-0.5 p-0.5 rounded-lg border shadow-2xs transition-all ${
            estEmplacementVerrouille
              ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-300/70'
              : chauffeurVerrouille
              ? 'bg-amber-50/50 border-amber-200'
              : 'bg-white/90 border-gray-200/90 hover:border-gray-300'
          }`}
        >
          {/* Cadenas individuel pour cet emplacement / voyage */}
          {onToggleVerrouillerEmplacement && (
            <button
              type="button"
              onClick={() => onToggleVerrouillerEmplacement(chauffeurId, voyageId)}
              className={`w-5 h-5.5 rounded flex items-center justify-center transition-all cursor-pointer ${
                estEmplacementVerrouille
                  ? 'text-amber-700 bg-amber-100 hover:bg-amber-200'
                  : chauffeurVerrouille
                  ? 'text-amber-500 hover:text-amber-700 opacity-60'
                  : 'text-gray-300 hover:text-amber-600 hover:bg-amber-50'
              }`}
              title={
                chauffeurVerrouille
                  ? 'Chauffeur déjà verrouillé en totalité 🔒'
                  : estEmplacementVerrouille
                  ? (estOptionSans && valeur === 0
                      ? 'Créneau configuré SANS rotation (0 élève verrouillé 🔒). Cliquez pour déverrouiller et permettre l’affectation d’élèves.'
                      : `Emplacement VERROUILLÉ 🔒 (${valeur} élèves figés). Aucun élève ne sera ajouté ni retiré lors de l’ajustement des autres. Cliquez pour déverrouiller.`)
                  : (estOptionSans && valeur === 0
                      ? 'Créneau SANS déverrouillé 🔓. Cliquez pour reverrouiller à 0.'
                      : `Cliquer pour verrouiller cet emplacement (${valeur} élèves) et empêcher tout ajout/retrait.`)
              }
            >
              {estEmplacementVerrouille ? (
                <Lock className="w-3 h-3 text-amber-700 stroke-[2.5]" />
              ) : chauffeurVerrouille ? (
                <Lock className="w-2.5 h-2.5 text-amber-500 stroke-[2]" />
              ) : (
                <Unlock className="w-2.5 h-2.5 stroke-[2]" />
              )}
            </button>
          )}

          {/* Bouton Réduire -1 */}
          <button
            type="button"
            onClick={() => onDecrementer(chauffeurId, voyageId)}
            disabled={isVide || isProtege}
            className={`w-5 h-5.5 rounded flex items-center justify-center text-gray-400 transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed ${
              isVide || isProtege ? '' : 'hover:text-red-600 hover:bg-red-50'
            }`}
            title={
              isProtege
                ? 'Déverrouillez le cadenas pour modifier cet effectif'
                : 'Retirer 1 élève (redistribué équitablement)'
            }
          >
            <Minus className="w-3 h-3 stroke-[2.5]" />
          </button>

          {/* Saisie directe du chiffre */}
          <div className="relative flex items-center">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={valeurTexte}
              readOnly={isProtege}
              onChange={(e) => {
                if (isProtege) return;
                // N'autoriser que les chiffres
                const v = e.target.value.replace(/[^0-9]/g, '');
                setValeurTexte(v);
              }}
              onFocus={() => {
                if (!isProtege) setIsFocused(true);
              }}
              onBlur={() => {
                setIsFocused(false);
                validerChangement();
              }}
              onKeyDown={handleKeyDown}
              className={`w-8 h-5.5 text-center font-mono text-xs font-bold rounded focus:outline-none transition-all ${
                isFocused
                  ? 'bg-blue-50 text-blue-900 border border-blue-500 ring-1 ring-blue-400'
                  : estEmplacementVerrouille
                  ? 'text-amber-900 bg-amber-100/70 border border-amber-300 cursor-default'
                  : chauffeurVerrouille
                  ? 'text-amber-800 bg-amber-50/50 cursor-default'
                  : isDepassement
                  ? 'text-red-600 bg-red-50 border border-red-200'
                  : isVide
                  ? 'text-gray-300 hover:text-gray-600'
                  : 'text-gray-900 hover:bg-gray-100/70'
              }`}
              title={
                isProtege
                  ? (estOptionSans && valeur === 0
                      ? 'Créneau SANS verrouillé à 0 🔒. Cliquez sur le cadenas pour déverrouiller et autoriser la saisie.'
                      : `Emplacement verrouillé 🔒 (${valeur} élève(s)). Cliquez sur le cadenas pour déverrouiller.`)
                  : `Saisir un nombre d'élèves (0 à ${capacite}) puis valider avec Entrée`
              }
            />
          </div>

          {/* Bouton Ajouter +1 */}
          <button
            type="button"
            onClick={() => onIncrementer(chauffeurId, voyageId)}
            disabled={isPlein || isProtege}
            className={`w-5 h-5.5 rounded flex items-center justify-center text-gray-400 transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed ${
              isPlein || isProtege ? '' : hoverBtnColor
            }`}
            title={
              isProtege
                ? 'Déverrouillez le cadenas pour ajouter des élèves'
                : 'Ajouter 1 élève (prélevé équitablement)'
            }
          >
            <Plus className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>

        {/* Indicateur subtil si configuré SANS dans le tableau des chauffeurs */}
        {estOptionSans && valeur === 0 && (
          <span 
            className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none"
            title="Voyage configuré 'SANS' dans le tableau des chauffeurs (0 verrouillé initialement)"
          >
            SANS
          </span>
        )}
      </div>
    </td>
  );
};
