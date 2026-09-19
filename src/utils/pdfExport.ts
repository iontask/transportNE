import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Eleve, Chauffeur, ResultatRepartition } from '../types';
import { VOYAGES, getElevesChauffeurVoyage, getStatsOptimisationVoyage } from './repartition';

// ============================================================
// CONFIGURATION GLOBALE
// ============================================================

const ECOLE_NOM = 'École AIN SEBAA';
const ANNEE_SCOLAIRE = '2026-2027';

const VOYAGE_LABELS: Record<string, { titre: string; heure: string }> = {
  MATIN_1: { titre: 'Voyage Matin 1', heure: '8h30' },
  MATIN_2: { titre: 'Voyage Matin 2', heure: '9h15' },
  APRES_MIDI_15H15: { titre: 'Voyage Après-midi', heure: '15h15 (Niveau 1)' },
  APRES_MIDI_16H00: { titre: 'Voyage Après-midi', heure: '16h00 (Niveau 2)' },
};

const STUDENTS_PER_PAGE = 23;

// ============================================================
// UTILITAIRE : RENDU D'UN ÉLÉMENT HTML EN CANVAS HAUTE RÉSOLUTION
// ============================================================

const rendreElementEnCanvas = async (element: HTMLElement): Promise<HTMLCanvasElement> => {
  // S'assurer que les polices web (notamment 'Cairo' pour l'arabe) sont prêtes
  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignorer si l'API document.fonts n'est pas supportée
    }
  }

  // Rendu avec échelle 2 pour une résolution 300 DPI très nette
  return await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    allowTaint: true,
  });
};

// ============================================================
// CRÉATION DE LA PAGE HTML D'UN CHAUFFEUR (FORMAT A4 PORTRAIT)
// ============================================================

interface PageConfig {
  chauffeur: Chauffeur;
  voyageId: string;
  elevesPage: Eleve[];
  startIndex: number;
  totalEleves: number;
  pageNumber: number;
  totalPages: number;
}

const creerHtmlPageChauffeur = (config: PageConfig): HTMLElement => {
  const { chauffeur, voyageId, elevesPage, startIndex, totalEleves, pageNumber, totalPages } = config;
  const voyage = VOYAGE_LABELS[voyageId] || { titre: voyageId, heure: '' };
  const dateStr = new Date().toLocaleDateString('fr-FR');

  const container = document.createElement('div');
  container.style.width = '794px';
  container.style.minHeight = '1123px';
  container.style.height = '1123px';
  container.style.boxSizing = 'border-box';
  container.style.padding = '24px 30px 20px 30px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif";
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'space-between';

  // Corps principal (En-tête + Infos + Tableau)
  const mainContent = document.createElement('div');

  // 1. Bandeau En-tête bleu institutionnel
  const header = document.createElement('div');
  header.style.backgroundColor = '#1e40af';
  header.style.borderRadius = '6px';
  header.style.padding = '12px 18px';
  header.style.color = '#ffffff';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.innerHTML = `
    <div>
      <div style="font-size: 19px; font-weight: 800; letter-spacing: -0.2px;">${ECOLE_NOM}</div>
      <div style="font-size: 11px; opacity: 0.9; margin-top: 2px;">Année scolaire ${ANNEE_SCOLAIRE}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 13px; font-weight: 700;">Liste de transport scolaire</div>
      <div style="font-size: 11px; opacity: 0.85; margin-top: 2px;">Document généré le ${dateStr}</div>
    </div>
  `;
  mainContent.appendChild(header);

  // 2. Bloc d'informations Chauffeur & Voyage
  const infoBlock = document.createElement('div');
  infoBlock.style.display = 'flex';
  infoBlock.style.justifyContent = 'space-between';
  infoBlock.style.alignItems = 'flex-end';
  infoBlock.style.marginTop = '14px';
  infoBlock.style.marginBottom = '8px';
  infoBlock.innerHTML = `
    <div>
      <div style="font-size: 15px; font-weight: 800; color: #0f172a;">
        Chauffeur : <span style="color: #1e40af;">${chauffeur.nom}</span>
      </div>
      <div style="font-size: 12px; color: #475569; margin-top: 3px;">
        Zone : <strong style="color: #0f172a; text-transform: uppercase;">${chauffeur.zone}</strong> &nbsp;•&nbsp; 
        Véhicule : <strong style="color: #0f172a;">${chauffeur.places} places</strong>
      </div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 14px; font-weight: 800; color: #0f172a;">
        ${voyage.titre} — ${voyage.heure}
      </div>
      <div style="font-size: 12px; color: #475569; margin-top: 3px;">
        Élèves : <strong style="color: #1e40af;">${totalEleves}</strong> / ${chauffeur.places} places
      </div>
    </div>
  `;
  mainContent.appendChild(infoBlock);

  // Séparateur bleu
  const divider = document.createElement('div');
  divider.style.height = '2px';
  divider.style.backgroundColor = '#1e40af';
  divider.style.marginBottom = '12px';
  divider.style.borderRadius = '1px';
  mainContent.appendChild(divider);

  // 3. Tableau avec support natif des caractères arabes
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = '11.5px';

  // Ligne d'en-tête du tableau
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr style="background-color: #1e40af; color: #ffffff;">
      <th style="padding: 7px 4px; text-align: center; width: 38px; font-size: 11px; font-weight: 700; border: 1px solid #1e40af;">N°</th>
      <th style="padding: 7px 10px; text-align: right; width: 195px; font-size: 12px; font-weight: 700; border: 1px solid #1e40af;">
        <span dir="rtl" style="font-family: 'Cairo', sans-serif;">النسب</span> <span style="font-size: 10px; font-weight: 400; opacity: 0.9;">(Nom)</span>
      </th>
      <th style="padding: 7px 10px; text-align: right; width: 195px; font-size: 12px; font-weight: 700; border: 1px solid #1e40af;">
        <span dir="rtl" style="font-family: 'Cairo', sans-serif;">الإسم</span> <span style="font-size: 10px; font-weight: 400; opacity: 0.9;">(Prénom)</span>
      </th>
      <th style="padding: 7px 4px; text-align: center; width: 65px; font-size: 11px; font-weight: 700; border: 1px solid #1e40af;">Niveau</th>
      <th style="padding: 7px 6px; text-align: center; width: 110px; font-size: 11px; font-weight: 700; border: 1px solid #1e40af;">Zone</th>
      <th style="padding: 7px 6px; text-align: center; width: 120px; font-size: 11px; font-weight: 700; border: 1px solid #1e40af;">Émargement</th>
    </tr>
  `;
  table.appendChild(thead);

  // Lignes des élèves
  const tbody = document.createElement('tbody');
  if (elevesPage.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="6" style="padding: 30px; text-align: center; color: #64748b; font-style: italic; border: 1px solid #e2e8f0;">
        Aucun élève affecté sur ce créneau horaire
      </td>
    `;
    tbody.appendChild(emptyRow);
  } else {
    elevesPage.forEach((eleve, index) => {
      const row = document.createElement('tr');
      const isEven = index % 2 === 0;
      row.style.backgroundColor = isEven ? '#ffffff' : '#f8fafc';

      row.innerHTML = `
        <td style="padding: 5px 4px; text-align: center; color: #64748b; font-size: 11px; font-weight: 600; border: 1px solid #e2e8f0;">
          ${startIndex + index + 1}
        </td>
        <td dir="rtl" style="padding: 5px 10px; text-align: right; font-weight: 700; color: #0f172a; font-size: 13px; font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; border: 1px solid #e2e8f0;">
          ${eleve.nom || '—'}
        </td>
        <td dir="rtl" style="padding: 5px 10px; text-align: right; font-weight: 600; color: #1e293b; font-size: 13px; font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; border: 1px solid #e2e8f0;">
          ${eleve.prenom || '—'}
        </td>
        <td style="padding: 5px 4px; text-align: center; border: 1px solid #e2e8f0;">
          <span style="display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 10px; font-weight: 700; background-color: ${
            eleve.niveau === 1 ? '#dbeafe' : '#f3e8ff'
          }; color: ${eleve.niveau === 1 ? '#1e40af' : '#6b21a8'};">
            N${eleve.niveau}
          </span>
        </td>
        <td style="padding: 5px 6px; text-align: center; font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase; border: 1px solid #e2e8f0;">
          ${eleve.zone || '—'}
        </td>
        <td style="padding: 5px 6px; text-align: center; border: 1px solid #e2e8f0;">
          <div style="height: 18px; width: 85%; margin: 0 auto; border-bottom: 1px dashed #cbd5e1;"></div>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  table.appendChild(tbody);
  mainContent.appendChild(table);
  container.appendChild(mainContent);

  // 4. Pied de page (Signature & Pagination)
  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.justifyContent = 'space-between';
  footer.style.alignItems = 'center';
  footer.style.paddingTop = '10px';
  footer.style.borderTop = '1px solid #e2e8f0';
  footer.style.fontSize = '11px';
  footer.style.color = '#64748b';
  footer.innerHTML = `
    <div>Signature chauffeur : ____________________________</div>
    <div>Page ${pageNumber} / ${totalPages}</div>
  `;
  container.appendChild(footer);

  return container;
};

// ============================================================
// EXPORT PDF D'UNE LISTE (CHAUFFEUR + VOYAGE)
// ============================================================

export const exporterListePDF = async (
  chauffeur: Chauffeur,
  voyageId: string,
  eleves: Eleve[]
): Promise<void> => {
  // Conteneur DOM temporaire hors-champ
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-9999px';
  host.style.top = '0';
  host.style.zIndex = '-9999';
  document.body.appendChild(host);

  try {
    const totalPages = Math.max(1, Math.ceil(eleves.length / STUDENTS_PER_PAGE));
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const startIndex = pageIdx * STUDENTS_PER_PAGE;
      const elevesPage = eleves.slice(startIndex, startIndex + STUDENTS_PER_PAGE);

      const pageElement = creerHtmlPageChauffeur({
        chauffeur,
        voyageId,
        elevesPage,
        startIndex,
        totalEleves: eleves.length,
        pageNumber: pageIdx + 1,
        totalPages,
      });

      host.innerHTML = '';
      host.appendChild(pageElement);

      const canvas = await rendreElementEnCanvas(pageElement);
      const imgData = canvas.toDataURL('image/jpeg', 0.96);

      if (pageIdx > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    const nomFichier = `liste_${chauffeur.nom.replace(/\s+/g, '_')}_${voyageId}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(nomFichier);
  } finally {
    if (document.body.contains(host)) {
      document.body.removeChild(host);
    }
  }
};

// ============================================================
// EXPORT PDF DE TOUTES LES LISTES D'UN CHAUFFEUR (4 VOYAGES)
// ============================================================

export const exporterToutesListesChauffeurPDF = async (
  chauffeur: Chauffeur,
  resultat: ResultatRepartition
): Promise<void> => {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-9999px';
  host.style.top = '0';
  host.style.zIndex = '-9999';
  document.body.appendChild(host);

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let isFirstPage = true;

    for (const voyage of VOYAGES) {
      const eleves = getElevesChauffeurVoyage(resultat, chauffeur.id, voyage.id);
      if (eleves.length === 0) continue;

      const totalPages = Math.max(1, Math.ceil(eleves.length / STUDENTS_PER_PAGE));

      for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const startIndex = pageIdx * STUDENTS_PER_PAGE;
        const elevesPage = eleves.slice(startIndex, startIndex + STUDENTS_PER_PAGE);

        const pageElement = creerHtmlPageChauffeur({
          chauffeur,
          voyageId: voyage.id,
          elevesPage,
          startIndex,
          totalEleves: eleves.length,
          pageNumber: pageIdx + 1,
          totalPages,
        });

        host.innerHTML = '';
        host.appendChild(pageElement);

        const canvas = await rendreElementEnCanvas(pageElement);
        const imgData = canvas.toDataURL('image/jpeg', 0.96);

        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;

        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }
    }

    const nomFichier = `listes_${chauffeur.nom.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(nomFichier);
  } finally {
    if (document.body.contains(host)) {
      document.body.removeChild(host);
    }
  }
};

// ============================================================
// EXPORT PDF GROUPÉ (TOUS LES CHAUFFEURS)
// ============================================================

export const exporterToutesListesPDF = async (
  resultat: ResultatRepartition,
  chauffeurs: Chauffeur[]
): Promise<void> => {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-9999px';
  host.style.top = '0';
  host.style.zIndex = '-9999';
  document.body.appendChild(host);

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let isFirstPage = true;

    for (const chauffeur of chauffeurs) {
      for (const voyage of VOYAGES) {
        const eleves = getElevesChauffeurVoyage(resultat, chauffeur.id, voyage.id);
        if (eleves.length === 0) continue;

        const totalPages = Math.max(1, Math.ceil(eleves.length / STUDENTS_PER_PAGE));

        for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
          const startIndex = pageIdx * STUDENTS_PER_PAGE;
          const elevesPage = eleves.slice(startIndex, startIndex + STUDENTS_PER_PAGE);

          const pageElement = creerHtmlPageChauffeur({
            chauffeur,
            voyageId: voyage.id,
            elevesPage,
            startIndex,
            totalEleves: eleves.length,
            pageNumber: pageIdx + 1,
            totalPages,
          });

          host.innerHTML = '';
          host.appendChild(pageElement);

          const canvas = await rendreElementEnCanvas(pageElement);
          const imgData = canvas.toDataURL('image/jpeg', 0.96);

          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;

          pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        }
      }
    }

    const nomFichier = `toutes_les_listes_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(nomFichier);
  } finally {
    if (document.body.contains(host)) {
      document.body.removeChild(host);
    }
  }
};

// ============================================================
// EXPORT PDF D'UN VOYAGE (PAYSAGE / TOUS CHAUFFEURS DU VOYAGE)
// ============================================================

export const exporterVoyagePDF = async (
  resultat: ResultatRepartition,
  voyageId: string
): Promise<void> => {
  const voyage = VOYAGE_LABELS[voyageId] || { titre: voyageId, heure: '' };
  const voyageData = resultat.parVoyage[voyageId];
  if (!voyageData) return;

  const dateStr = new Date().toLocaleDateString('fr-FR');
  const chauffeursActifs = voyageData.chauffeurs.filter((c) => c.eleves.length > 0);

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-9999px';
  host.style.top = '0';
  host.style.zIndex = '-9999';
  document.body.appendChild(host);

  try {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Page A4 Paysage : 1123px x 794px à 96 DPI
    const container = document.createElement('div');
    container.style.width = '1123px';
    container.style.minHeight = '794px';
    container.style.boxSizing = 'border-box';
    container.style.padding = '24px 30px 20px 30px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#0f172a';
    container.style.fontFamily = "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif";
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.justifyContent = 'space-between';

    const mainContent = document.createElement('div');

    // En-tête bandeau
    const header = document.createElement('div');
    header.style.backgroundColor = '#1e40af';
    header.style.borderRadius = '6px';
    header.style.padding = '12px 20px';
    header.style.color = '#ffffff';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.innerHTML = `
      <div>
        <div style="font-size: 20px; font-weight: 800;">${ECOLE_NOM} — ${voyage.titre} (${voyage.heure})</div>
        <div style="font-size: 11.5px; opacity: 0.9; margin-top: 2px;">Année scolaire ${ANNEE_SCOLAIRE}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 13px; font-weight: 700;">Récapitulatif général du créneau</div>
        <div style="font-size: 11px; opacity: 0.85; margin-top: 2px;">Document généré le ${dateStr}</div>
      </div>
    `;
    mainContent.appendChild(header);

    // Statistiques voyage
    const opt = getStatsOptimisationVoyage(voyageData);
    const statsBlock = document.createElement('div');
    statsBlock.style.display = 'flex';
    statsBlock.style.gap = '16px';
    statsBlock.style.marginTop = '12px';
    statsBlock.style.marginBottom = '12px';

    statsBlock.innerHTML = `
      <div style="background-color: #f1f5f9; padding: 8px 14px; border-radius: 8px; font-size: 11.5px;">
        Total élèves : <strong style="color: #1e40af; font-size: 14px;">${opt.totalEleves}</strong>
      </div>
      <div style="background-color: #f1f5f9; padding: 8px 14px; border-radius: 8px; font-size: 11.5px;">
        Transports utilisés : <strong style="color: #0284c7; font-size: 14px;">${opt.nbTransportsUtilises} bus (${opt.placesTransportsUtilises} pl.)</strong>
      </div>
      <div style="background-color: #f1f5f9; padding: 8px 14px; border-radius: 8px; font-size: 11.5px;">
        Taux d'optimisation : <strong style="color: #059669; font-size: 14px;">${opt.tauxOptimisation}%</strong> <span style="font-size: 10px; color: #64748b;">(${opt.totalEleves} / ${opt.placesTransportsUtilises || 1})</span>
      </div>
      <div style="background-color: #f1f5f9; padding: 8px 14px; border-radius: 8px; font-size: 11.5px;">
        Capacité totale flotte : <strong style="color: #7c3aed; font-size: 14px;">${opt.totalPlaces} places</strong>
      </div>
    `;
    mainContent.appendChild(statsBlock);

    // Tableau des chauffeurs
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '11px';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr style="background-color: #1e40af; color: #ffffff;">
        <th style="padding: 7px 4px; text-align: center; width: 35px; border: 1px solid #1e40af;">N°</th>
        <th style="padding: 7px 10px; text-align: left; width: 140px; border: 1px solid #1e40af;">Chauffeur</th>
        <th style="padding: 7px 8px; text-align: center; width: 110px; border: 1px solid #1e40af;">Zone</th>
        <th style="padding: 7px 6px; text-align: center; width: 65px; border: 1px solid #1e40af;">Places</th>
        <th style="padding: 7px 6px; text-align: center; width: 65px; border: 1px solid #1e40af;">Élèves</th>
        <th style="padding: 7px 10px; text-align: left; border: 1px solid #1e40af;">Liste des élèves</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    chauffeursActifs.forEach((c, index) => {
      const row = document.createElement('tr');
      row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';

      const elevesBadges = c.eleves
        .map((e) => `
          <span style="display: inline-block; background-color: ${e.niveau === 1 ? '#eff6ff' : '#faf5ff'}; border: 1px solid ${e.niveau === 1 ? '#bfdbfe' : '#e9d5ff'}; padding: 2px 7px; border-radius: 6px; margin: 2px 3px; font-size: 11px;">
            <strong dir="rtl" style="font-family: 'Cairo', sans-serif; color: ${e.niveau === 1 ? '#1e40af' : '#6b21a8'}; font-weight: 700;">${e.nom} ${e.prenom}</strong>
            <span style="font-size: 9px; color: #64748b; font-weight: 600; text-transform: uppercase;">(${e.zone})</span>
          </span>
        `)
        .join('');

      row.innerHTML = `
        <td style="padding: 6px 4px; text-align: center; color: #64748b; font-weight: 600; border: 1px solid #e2e8f0;">
          ${index + 1}
        </td>
        <td style="padding: 6px 10px; font-weight: 700; color: #0f172a; border: 1px solid #e2e8f0;">
          ${c.chauffeur.nom}
        </td>
        <td style="padding: 6px 8px; text-align: center; font-weight: 600; text-transform: uppercase; color: #475569; border: 1px solid #e2e8f0;">
          ${c.chauffeur.zone}
        </td>
        <td style="padding: 6px 6px; text-align: center; font-weight: 600; border: 1px solid #e2e8f0;">
          ${c.chauffeur.places}
        </td>
        <td style="padding: 6px 6px; text-align: center; font-weight: 800; color: #1e40af; border: 1px solid #e2e8f0;">
          ${c.eleves.length}
        </td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">
          <div style="display: flex; flex-wrap: wrap; align-items: center;">
            ${elevesBadges}
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    mainContent.appendChild(table);
    container.appendChild(mainContent);

    // Pied de page
    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.justifyContent = 'space-between';
    footer.style.alignItems = 'center';
    footer.style.paddingTop = '10px';
    footer.style.borderTop = '1px solid #e2e8f0';
    footer.style.fontSize = '11px';
    footer.style.color = '#64748b';
    footer.innerHTML = `
      <div>${ECOLE_NOM} — Direction du Transport Scolaire</div>
      <div>Page 1 / 1</div>
    `;
    container.appendChild(footer);

    host.innerHTML = '';
    host.appendChild(container);

    const canvas = await rendreElementEnCanvas(container);
    const imgData = canvas.toDataURL('image/jpeg', 0.96);

    pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');

    const nomFichier = `voyage_${voyageId}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(nomFichier);
  } finally {
    if (document.body.contains(host)) {
      document.body.removeChild(host);
    }
  }
};

// ============================================================
// EXPORT DU RAPPORT GÉNÉRAL RÉCAPITULATIF (FORMAT A4 PAYSAGE)
// ============================================================

export const exporterRapportRecapitulatifPDF = async (
  resultat: ResultatRepartition,
  chauffeurs: Chauffeur[],
  eleves: Eleve[],
  chauffeursVerrouilles: Set<string> | string[] = new Set(),
  emplacementsVerrouilles: Set<string> | string[] = new Set()
): Promise<void> => {
  const setChauffeursVerrouilles = new Set(chauffeursVerrouilles);
  const setEmplacementsVerrouilles = new Set(emplacementsVerrouilles);

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-9999px';
  host.style.top = '0';
  host.style.zIndex = '-1000';
  document.body.appendChild(host);

  try {
    const container = document.createElement('div');
    container.style.width = '1123px'; // A4 Landscape à 96 DPI
    container.style.minHeight = '794px';
    container.style.boxSizing = 'border-box';
    container.style.padding = '22px 28px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#0f172a';
    container.style.fontFamily = "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif";
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.justifyContent = 'space-between';

    const mainContent = document.createElement('div');

    // En-tête officiel
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.borderBottom = '2px solid #1e40af';
    header.style.paddingBottom = '10px';
    header.style.marginBottom = '12px';

    const dateStr = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    header.innerHTML = `
      <div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700;">
          Royaume du Maroc — Ministère de l'Éducation Nationale
        </div>
        <div style="font-size: 20px; font-weight: 900; color: #1e40af; margin-top: 2px;">
          ${ECOLE_NOM}
        </div>
        <div style="font-size: 11px; color: #475569; font-weight: 600;">
          Direction des Services de Transport Scolaire • Année Scolaire ${ANNEE_SCOLAIRE}
        </div>
      </div>
      <div style="text-align: right;">
        <div style="display: inline-block; background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 4px 12px; border-radius: 8px; font-weight: 800; font-size: 13px;">
          RAPPORT DE SYNTHÈSE DES ROTATIONS
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
          Généré le ${dateStr}
        </div>
      </div>
    `;
    mainContent.appendChild(header);

    // Métriques globales
    const totalPlaces = chauffeurs.reduce((acc, c) => acc + (Number(c.places) || 0), 0);
    const totalEleves = eleves.length;
    const tauxGlobal = totalPlaces > 0 ? Math.round((totalEleves / totalPlaces) * 100) : 0;
    const nbVerrouilles = setChauffeursVerrouilles.size + setEmplacementsVerrouilles.size;

    const statsRow = document.createElement('div');
    statsRow.style.display = 'grid';
    statsRow.style.gridTemplateColumns = 'repeat(4, 1fr)';
    statsRow.style.gap = '10px';
    statsRow.style.marginBottom = '12px';

    statsRow.innerHTML = `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 12px;">
        <div style="font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase;">Élèves Inscrits</div>
        <div style="font-size: 18px; font-weight: 800; color: #1e40af;">${totalEleves} élèves</div>
      </div>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 12px;">
        <div style="font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase;">Capacité Flotte</div>
        <div style="font-size: 18px; font-weight: 800; color: #059669;">${totalPlaces} places (${chauffeurs.length} chauffeurs)</div>
      </div>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 12px;">
        <div style="font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase;">Taux Moyen Remplissage</div>
        <div style="font-size: 18px; font-weight: 800; color: ${tauxGlobal <= 60 ? '#d97706' : '#1e40af'};">${tauxGlobal}%</div>
      </div>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 12px;">
        <div style="font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase;">Sécurité & Verrous</div>
        <div style="font-size: 18px; font-weight: 800; color: ${nbVerrouilles > 0 ? '#b45309' : '#475569'};">
          ${nbVerrouilles > 0 ? `🔒 ${nbVerrouilles} verrou(s)` : 'Aucun verrou'}
        </div>
      </div>
    `;
    mainContent.appendChild(statsRow);

    // Tableau Récapitulatif
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '11px';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr style="background-color: #1e40af; color: #ffffff;">
        <th style="padding: 7px 5px; text-align: center; width: 35px; border: 1px solid #1e40af;">N°</th>
        <th style="padding: 7px 8px; text-align: left; width: 170px; border: 1px solid #1e40af;">Chauffeur</th>
        <th style="padding: 7px 8px; text-align: center; width: 120px; border: 1px solid #1e40af;">Zone</th>
        <th style="padding: 7px 6px; text-align: center; width: 70px; border: 1px solid #1e40af;">Capacité</th>
        <th style="padding: 7px 6px; text-align: center; width: 95px; border: 1px solid #1e40af; background-color: #1d4ed8;">Matin 1 (8h30)</th>
        <th style="padding: 7px 6px; text-align: center; width: 95px; border: 1px solid #1e40af; background-color: #1d4ed8;">Matin 2 (9h15)</th>
        <th style="padding: 7px 6px; text-align: center; width: 95px; border: 1px solid #1e40af; background-color: #6b21a8;">15h15 (N1)</th>
        <th style="padding: 7px 6px; text-align: center; width: 95px; border: 1px solid #1e40af; background-color: #6b21a8;">16h00 (N2)</th>
        <th style="padding: 7px 6px; text-align: center; width: 85px; border: 1px solid #1e40af; background-color: #0f172a;">Total Élèves</th>
        <th style="padding: 7px 6px; text-align: center; width: 75px; border: 1px solid #1e40af;">Taux</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    let sommeM1 = 0;
    let sommeM2 = 0;
    let sommeS15 = 0;
    let sommeS16 = 0;
    let sommeTotal = 0;

    Object.values(resultat.parChauffeur).forEach((r, idx) => {
      const m1 = r.voyages['MATIN_1']?.placesUtilisees || 0;
      const m2 = r.voyages['MATIN_2']?.placesUtilisees || 0;
      const s15 = r.voyages['APRES_MIDI_15H15']?.placesUtilisees || 0;
      const s16 = r.voyages['APRES_MIDI_16H00']?.placesUtilisees || 0;
      const pct = Math.round(r.tauxGlobal * 100);

      sommeM1 += m1;
      sommeM2 += m2;
      sommeS15 += s15;
      sommeS16 += s16;
      sommeTotal += r.totalEleves;

      const isChLocked = setChauffeursVerrouilles.has(r.chauffeur.id);
      const isM1Locked = setEmplacementsVerrouilles.has(`${r.chauffeur.id}_MATIN_1`);
      const isM2Locked = setEmplacementsVerrouilles.has(`${r.chauffeur.id}_MATIN_2`);
      const isS15Locked = setEmplacementsVerrouilles.has(`${r.chauffeur.id}_APRES_MIDI_15H15`);
      const isS16Locked = setEmplacementsVerrouilles.has(`${r.chauffeur.id}_APRES_MIDI_16H00`);

      const tr = document.createElement('tr');
      tr.style.backgroundColor = isChLocked ? '#fef3c7' : idx % 2 === 0 ? '#ffffff' : '#f8fafc';

      tr.innerHTML = `
        <td style="padding: 5px 4px; text-align: center; color: #64748b; font-weight: 600; border: 1px solid #e2e8f0;">
          ${idx + 1}
        </td>
        <td style="padding: 5px 8px; font-weight: 700; color: #0f172a; border: 1px solid #e2e8f0;">
          ${isChLocked ? '🔒 ' : ''}${r.chauffeur.nom}
        </td>
        <td style="padding: 5px 8px; text-align: center; font-weight: 600; text-transform: uppercase; color: #475569; border: 1px solid #e2e8f0;">
          ${r.chauffeur.zone}
        </td>
        <td style="padding: 5px 6px; text-align: center; font-weight: 600; border: 1px solid #e2e8f0;">
          ${r.chauffeur.places}
        </td>
        <td style="padding: 5px 6px; text-align: center; font-weight: 700; color: #1e40af; border: 1px solid #e2e8f0; background-color: ${isM1Locked ? '#fef9c3' : 'transparent'};">
          ${isM1Locked ? '🔒 ' : ''}${m1}
        </td>
        <td style="padding: 5px 6px; text-align: center; font-weight: 700; color: #1e40af; border: 1px solid #e2e8f0; background-color: ${isM2Locked ? '#fef9c3' : 'transparent'};">
          ${isM2Locked ? '🔒 ' : ''}${m2}
        </td>
        <td style="padding: 5px 6px; text-align: center; font-weight: 700; color: #6b21a8; border: 1px solid #e2e8f0; background-color: ${isS15Locked ? '#fef9c3' : 'transparent'};">
          ${isS15Locked ? '🔒 ' : ''}${s15}
        </td>
        <td style="padding: 5px 6px; text-align: center; font-weight: 700; color: #6b21a8; border: 1px solid #e2e8f0; background-color: ${isS16Locked ? '#fef9c3' : 'transparent'};">
          ${isS16Locked ? '🔒 ' : ''}${s16}
        </td>
        <td style="padding: 5px 6px; text-align: center; font-weight: 900; color: #0f172a; border: 1px solid #cbd5e1; background-color: #f1f5f9;">
          ${r.totalEleves}
        </td>
        <td style="padding: 5px 6px; text-align: center; font-weight: 700; color: ${pct <= 55 ? '#b45309' : '#059669'}; border: 1px solid #e2e8f0;">
          ${pct}%
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Ligne de totaux
    const trTotal = document.createElement('tr');
    trTotal.style.backgroundColor = '#e2e8f0';
    trTotal.style.fontWeight = '800';
    trTotal.innerHTML = `
      <td colspan="3" style="padding: 7px 10px; text-align: right; color: #0f172a; border: 1px solid #cbd5e1;">
        TOTAUX GLOBAUX :
      </td>
      <td style="padding: 7px 6px; text-align: center; color: #0f172a; border: 1px solid #cbd5e1;">
        ${totalPlaces}
      </td>
      <td style="padding: 7px 6px; text-align: center; color: #1e40af; border: 1px solid #cbd5e1;">
        ${sommeM1}
      </td>
      <td style="padding: 7px 6px; text-align: center; color: #1e40af; border: 1px solid #cbd5e1;">
        ${sommeM2}
      </td>
      <td style="padding: 7px 6px; text-align: center; color: #6b21a8; border: 1px solid #cbd5e1;">
        ${sommeS15}
      </td>
      <td style="padding: 7px 6px; text-align: center; color: #6b21a8; border: 1px solid #cbd5e1;">
        ${sommeS16}
      </td>
      <td style="padding: 7px 6px; text-align: center; color: #0f172a; border: 1px solid #cbd5e1; font-weight: 900;">
        ${sommeTotal}
      </td>
      <td style="padding: 7px 6px; text-align: center; color: #0f172a; border: 1px solid #cbd5e1;">
        ${tauxGlobal}%
      </td>
    `;
    tbody.appendChild(trTotal);

    table.appendChild(tbody);
    mainContent.appendChild(table);

    // Blocs de signature
    const signaturesBlock = document.createElement('div');
    signaturesBlock.style.display = 'grid';
    signaturesBlock.style.gridTemplateColumns = '1fr 1fr';
    signaturesBlock.style.gap = '40px';
    signaturesBlock.style.marginTop = '18px';
    signaturesBlock.style.paddingTop = '10px';

    signaturesBlock.innerHTML = `
      <div style="border: 1px dashed #94a3b8; border-radius: 8px; padding: 12px; height: 65px;">
        <div style="font-size: 11px; font-weight: 700; color: #334155;">Visa du Responsable du Transport Scolaire :</div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 3px;">Date et signature</div>
      </div>
      <div style="border: 1px dashed #94a3b8; border-radius: 8px; padding: 12px; height: 65px;">
        <div style="font-size: 11px; font-weight: 700; color: #334155;">Cachet et Signature de la Direction de l'Établissement :</div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 3px;">Pour accord et mise en circulation</div>
      </div>
    `;
    mainContent.appendChild(signaturesBlock);

    container.appendChild(mainContent);

    // Pied de page
    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.justifyContent = 'space-between';
    footer.style.alignItems = 'center';
    footer.style.paddingTop = '8px';
    footer.style.borderTop = '1px solid #e2e8f0';
    footer.style.fontSize = '10px';
    footer.style.color = '#64748b';
    footer.innerHTML = `
      <div>${ECOLE_NOM} — Direction des Services Généraux & Transport Scolaire</div>
      <div>Page 1 / 1 — Document officiel confidentiel</div>
    `;
    container.appendChild(footer);

    host.innerHTML = '';
    host.appendChild(container);

    const canvas = await rendreElementEnCanvas(container);
    const imgData = canvas.toDataURL('image/jpeg', 0.96);

    pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');

    const nomFichier = `rapport_recapitulatif_transport_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(nomFichier);
  } finally {
    if (document.body.contains(host)) {
      document.body.removeChild(host);
    }
  }
};

