import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { genererScenariosOptimisation, calculerMetriquesRepartition } from './src/utils/optimisationScenarios';
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
