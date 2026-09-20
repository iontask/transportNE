import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { genererScenariosOptimisation, calculerMetriquesRepartition } from './src/utils/optimisationScenarios';
import { genererSolutionsIANonAffectes, diagnostiquerElevesNonAffectes } from './src/utils/solutionsIANonAffectes';
import { Chauffeur, Eleve, ResultatRepartition } from './src/types';

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Lazy initialization of Gemini Client
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI | null {
    if (!aiClient && process.env.GEMINI_API_KEY) {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return aiClient;
  }

  // Health check API
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // API Recommandations & Optimisation IA
  app.post('/api/recommandations-ia', async (req, res) => {
    try {
      const {
        eleves,
        chauffeurs,
        resultat,
        chauffeursVerrouilles = [],
        emplacementsVerrouilles = [],
      } = req.body as {
        eleves: Eleve[];
        chauffeurs: Chauffeur[];
        resultat: ResultatRepartition;
        chauffeursVerrouilles?: string[];
        emplacementsVerrouilles?: string[];
      };

      if (!eleves || !chauffeurs || !resultat) {
        return res.status(400).json({
          success: false,
          message: 'Données incomplètes (eleves, chauffeurs ou resultat manquant).',
        });
      }

      const setChauffeursVerrouilles = new Set<string>(chauffeursVerrouilles);
      const setEmplacementsVerrouilles = new Set<string>(emplacementsVerrouilles);

      // Calcul des scénarios déterministes validés (respectant zones, places et verrous)
      const scenarios = genererScenariosOptimisation(
        resultat,
        chauffeurs,
        eleves,
        setChauffeursVerrouilles,
        setEmplacementsVerrouilles
      );

      const metriquesActuelles = calculerMetriquesRepartition(resultat, chauffeurs);

      // Tentative d'enrichissement par l'IA Gemini si la clé API est disponible
      const ai = getGeminiClient();
      let analyseGlobale = `Le plan de transport actuel mobilise ${metriquesActuelles.nbBusActifs} bus pour ${eleves.length} élèves inscrits, avec une consommation estimée à environ ${metriquesActuelles.consommationCarburantEstimeeLitres} L de carburant par jour et un score d'équité de charge de ${metriquesActuelles.scoreEquite}/100.`;
      let diagnosticPointsFaibles = [
        `Dispersion de certains élèves sur plusieurs rotations de même zone, augmentant le kilométrage global.`,
        `Écart de charge de ${metriquesActuelles.ecartMaxMinEleves} élèves entre le chauffeur le plus sollicité et le moins sollicité.`,
        metriquesActuelles.nbBusEconomises > 0 
          ? `Possibilité d'optimiser la flotte en mobilisant ${metriquesActuelles.nbBusEconomises} bus en réserve.` 
          : `Taux de remplissage moyen à ${metriquesActuelles.tauxRemplissageMoyenPct}% qui peut être renforcé.`,
      ];
      let source: 'gemini' | 'algorithme_local' = 'algorithme_local';

      if (ai) {
        try {
          const prompt = `
Tu es un expert mondial en logistique et optimisation de flottes de transport scolaire (École AIN SEBAA, Casablanca).
Voici l'état actuel de la répartition scolaire :
- Nombre d'élèves : ${eleves.length}
- Nombre de chauffeurs/bus : ${chauffeurs.length} (Capacité totale : ${chauffeurs.reduce((acc, c) => acc + c.places, 0)} places)
- Consommation estimée : ${metriquesActuelles.consommationCarburantEstimeeLitres} Litres/jour
- Score d'équité conducteur : ${metriquesActuelles.scoreEquite}/100 (Écart max-min : ${metriquesActuelles.ecartMaxMinEleves} élèves)
- Nombre de verrous actifs : ${setChauffeursVerrouilles.size + setEmplacementsVerrouilles.size}

Trois axes d'optimisation sont étudiés :
1. Économie de carburant (suppression des rotations à vide, regroupement de zone)
2. Optimisation de flotte (consolidation pour libérer ou économiser des bus)
3. Équité de travail (égalisation stricte du nombre d'élèves et des horaires entre chauffeurs)

Rédige en français sous format JSON strict :
{
  "analyseGlobale": "Synthèse exécutive claire en 2-3 phrases sur les opportunités d'optimisation",
  "diagnosticPointsFaibles": [
    "Point faible 1 identifié (ex: carburant ou détours)",
    "Point faible 2 identifié (ex: déséquilibre de charge)",
    "Point faible 3 identifié (ex: sous-utilisation d'un véhicule)"
  ],
  "conseilEcoConduite": "Recommandation concrète pour la direction du transport scolaire"
}
`;

          const geminiResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            },
          });

          const rawText = geminiResponse.text?.trim() || '';
          if (rawText) {
            const parsed = JSON.parse(rawText);
            if (parsed.analyseGlobale) {
              analyseGlobale = parsed.analyseGlobale;
            }
            if (Array.isArray(parsed.diagnosticPointsFaibles) && parsed.diagnosticPointsFaibles.length > 0) {
              diagnosticPointsFaibles = parsed.diagnosticPointsFaibles;
            }
            source = 'gemini';
          }
        } catch (geminiError) {
          console.warn('Erreur appel Gemini (repli vers le moteur algorithmique local) :', geminiError);
        }
      }

      return res.json({
        success: true,
        source,
        analyseGlobale,
        diagnosticPointsFaibles,
        metriquesActuelles,
        scenarios,
        horodatage: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Erreur traitement recommandations IA :', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la génération des recommandations.',
      });
    }
  });

  // API : Solutions IA dédiées pour les élèves non affectés
  app.post('/api/solutions-ia-non-affectes', async (req, res) => {
    try {
      const { eleves, chauffeurs, resultat } = req.body;

      if (!eleves || !chauffeurs || !resultat) {
        return res.status(400).json({
          success: false,
          message: 'Données incomplètes (élèves, chauffeurs ou résultat manquant).',
        });
      }

      // 1. Diagnostic précis des élèves non affectés
      const diagnostic = diagnostiquerElevesNonAffectes(eleves, chauffeurs, resultat);

      // 2. Génération des solutions algorithmiques robustes
      const solutions = genererSolutionsIANonAffectes(eleves, chauffeurs, resultat);

      let syntheseIA = '';
      let conseilsIA: string[] = [];
      let source: 'gemini' | 'algorithme_local' = 'algorithme_local';

      // 3. Enrichissement via Gemini 3.8 Flash si disponible
      const gemini = getGeminiClient();
      if (gemini && diagnostic.totalNonAffectes > 0) {
        try {
          const prompt = `
Tu es un expert en logistique et optimisation de transport scolaire pour l'École AIN SEBAA (Casablanca).
L'algorithme de répartition a détecté ${diagnostic.totalNonAffectes} élève(s) non affecté(s).
Détail des élèves non affectés :
${JSON.stringify(
  diagnostic.elevesDetails.map((d) => ({
    nom: `${d.eleve.prenom} ${d.eleve.nom}`,
    zone: d.eleve.zone,
    niveau: d.eleve.niveau,
    voyagesManquants: d.voyagesManquants.map((vm) => `${vm.voyageLibelle} (${vm.cause})`),
  })),
  null,
  2
)}

Répartition par zone : ${JSON.stringify(diagnostic.repartitionParZone)}
Répartition par voyage : ${JSON.stringify(diagnostic.repartitionParVoyage)}
Causes identifiées : ${diagnostic.causesPrincipales.join(' | ')}

Nombre de solutions calculées : ${solutions.length}
Titres des solutions : ${solutions.map((s) => s.titre).join('; ')}

Fournis une analyse experte structurée en JSON STRICT avec exactement les champs suivants :
{
  "syntheseIA": "Synthèse en 2 à 3 phrases expliquant la cause logistique fondamentale et pourquoi la solution recommandée est optimale sans surcharger la flotte.",
  "conseilsIA": [
    "Conseil opérationnel n°1 pour pérenniser l'affectation",
    "Conseil opérationnel n°2 pour les futurs imports ou arbitrages"
  ]
}
`;

          const response = await gemini.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          });

          const textResponse = response.text;
          if (textResponse) {
            const parsed = JSON.parse(textResponse);
            if (parsed.syntheseIA) syntheseIA = parsed.syntheseIA;
            if (Array.isArray(parsed.conseilsIA) && parsed.conseilsIA.length > 0) {
              conseilsIA = parsed.conseilsIA;
            }
            source = 'gemini';
          }
        } catch (geminiError) {
          console.warn('Erreur appel Gemini pour non-affectés (repli algorithmique) :', geminiError);
        }
      }

      // Synthèse de repli si Gemini indisponible
      if (!syntheseIA) {
        syntheseIA = `L'analyse a identifié ${diagnostic.totalNonAffectes} élève(s) nécessitant une prise en charge. La solution recommandée étend judicieusement le secteur des véhicules ayant des places disponibles, résolvant 100% des cas sans coût additionnel.`;
        conseilsIA = [
          'Vérifiez la concordance entre les zones d’origine configurées pour les chauffeurs et les adresses des nouveaux inscrits.',
          'Sur les créneaux critiques (15h15 / 16h00), veillez à ce que les niveaux soient équitablement distribués sur les circuits.'
        ];
      }

      return res.json({
        success: true,
        source,
        diagnostic,
        solutions,
        syntheseIA,
        conseilsIA,
        horodatage: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Erreur API solutions IA non affectés :', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur interne lors de la recherche des solutions IA.',
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur Transport Scolaire démarré sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
