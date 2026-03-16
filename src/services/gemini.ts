import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generateSimulation(subject: string, topic: string): Promise<Question[]> {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Gere um simulado de 10 questões de múltipla escolha sobre o assunto "${topic}" da matéria "${subject}", seguindo rigorosamente a matriz de referência do ENEM. 
    Para cada questão:
    1. Identifique a habilidade cobrada da matriz de referência do ENEM (ex: H1, H12).
    2. Forneça uma breve explicação do que essa habilidade avalia.
    3. Cada questão deve ter 5 alternativas (A, B, C, D, E).
    4. A explicação deve ser uma "visão pedagógica" detalhada, explicando por que a alternativa está correta e por que as outras estão incorretas.
    Retorne o resultado estritamente em formato JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING, description: "O enunciado da questão" },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Lista de 5 alternativas"
            },
            correctAnswer: { type: Type.INTEGER, description: "Índice da resposta correta (0-4)" },
            explanation: { type: Type.STRING, description: "Visão pedagógica (explicação detalhada) da resposta" },
            skill: { type: Type.STRING, description: "Código da habilidade (ex: H1)" },
            skillDescription: { type: Type.STRING, description: "Breve explicação da habilidade cobrada" }
          },
          required: ["question", "options", "correctAnswer", "explanation", "skill", "skillDescription"]
        }
      }
    }
  });

  const response = await model;
  const text = response.text;
  if (!text) throw new Error("Falha ao gerar simulado");
  
  return JSON.parse(text) as Question[];
}
