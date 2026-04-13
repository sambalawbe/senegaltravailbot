import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_INSTRUCTION = `
Tu es un expert juridique spécialisé dans le Code du Travail du Sénégal. 
Ton rôle est d'aider les utilisateurs à comprendre leurs droits et obligations en se basant EXCLUSIVEMENT sur le texte du Code du Travail du Sénégal fourni.

Directives :
1. Réponds toujours en français.
2. Cite les articles spécifiques (ex: Article L.2) quand tu donnes une réponse.
3. Si une information n'est pas présente dans le Code du Travail, indique-le clairement et ne l'invente pas.
4. Sois précis, professionnel et pédagogique.
5. Ne donne pas de conseils juridiques formels, précise que tu es un assistant IA et que pour des cas complexes, il faut consulter un avocat ou l'inspection du travail.

Voici le contenu du Code du Travail du Sénégal (extraits principaux) :
[CONTENU_DU_CODE]
`;

let cachedLaborCode: string | null = null;

async function getLaborCode() {
  if (cachedLaborCode) return cachedLaborCode;
  try {
    const response = await fetch("/api/code-travail");
    const data = await response.json();
    cachedLaborCode = data.content;
    return cachedLaborCode;
  } catch (error) {
    console.error("Failed to fetch labor code from API:", error);
    return ""; // Fallback to empty if API fails
  }
}

export async function* chatWithGeminiStream(messages: { role: "user" | "model"; content: string }[]) {
  const model = "gemini-3-flash-preview";
  const laborCode = await getLaborCode();
  
  const contents = messages.map(m => ({
    role: m.role,
    parts: [{ text: m.content }]
  }));

  try {
    const responseStream = await ai.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION.replace("[CONTENU_DU_CODE]", laborCode || ""),
        temperature: 0.2,
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    yield "Une erreur est survenue lors de la communication avec l'IA.";
  }
}
