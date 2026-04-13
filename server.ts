import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LABOR_CODE_TEXT = `
  TITRE PREMIER : DISPOSITIONS GENERALES
  Article L.1. Le droit au travail est reconnu à chaque citoyen comme un droit sacré.
  Article L.2. La présente loi est applicable aux relations entre employeurs et travailleurs.
  Article L.4. Le travail forcé ou obligatoire est interdit.
  Article L.36. Engagement à l'essai.
  Article L.38. Durée maximum de l'essai : 6 mois.
  Article L.41. Définition du CDD.
  Article L.42. Renouvellement CDD : une seule fois.
  Article L.44. CDD par écrit, max 2 ans.
  Article L.47. Indemnité fin de CDD : 7% du brut.
  Article L.50. Préavis pour CDI.
  Article L.52. 2 jours de liberté par semaine pendant le préavis.
  Article L.56. Rupture abusive et dommages-intérêts.
  Article L.60. Licenciement pour motif économique.
  Article L.105. Égalité de salaire.
  Article L.114. Paiement en monnaie légale (FCFA).
  Article L.135. Durée légale : 40h/semaine.
  Article L.143. Congé maternité : 14 semaines.
  Article L.147. Repos hebdomadaire obligatoire.
  Article L.148. Congés payés : 2 jours par mois.
`;

const SYSTEM_INSTRUCTION = `
Tu es un expert juridique spécialisé dans le Code du Travail du Sénégal. 
Ton rôle est d'aider les utilisateurs à comprendre leurs droits et obligations en se basant EXCLUSIVEMENT sur le texte du Code du Travail du Sénégal fourni.
Cite les articles spécifiques.
Contenu du code : ${LABOR_CODE_TEXT}
`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Authentication Middleware
  const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = process.env.API_AUTH_TOKEN || "demo-token-123"; // Fallback for demo

    if (!authHeader || authHeader !== `Bearer ${token}`) {
      return res.status(401).json({ error: "Non autorisé. Jeton invalide ou manquant." });
    }
    next();
  };

  // Public Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Sénégal Travail API is running" });
  });

  // Protected Routes
  app.get("/api/code-travail", authenticate, (req, res) => {
    res.json({ content: LABOR_CODE_TEXT });
  });

  app.post("/api/chat", authenticate, async (req, res) => {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "La question est requise." });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const model = "gemini-3-flash-preview";
      
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: question }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.2,
        }
      });

      res.json({ 
        question, 
        answer: response.text || "Désolé, je n'ai pas pu générer de réponse.",
        source: "Code du Travail du Sénégal"
      });
    } catch (error) {
      console.error("API Chat Error:", error);
      res.status(500).json({ error: "Erreur lors de la génération de la réponse." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
