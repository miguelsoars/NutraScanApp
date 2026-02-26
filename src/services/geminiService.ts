import { GoogleGenAI, Type } from "@google/genai";

let _apiKey: string = (import.meta as any).env?.VITE_GEMINI_API_KEY || localStorage.getItem('NUTRASCAN_GEMINI_API_KEY') || '';
let ai: GoogleGenAI | null = _apiKey ? new GoogleGenAI({ apiKey: _apiKey }) : null;

export const hasGeminiKey = () => Boolean(_apiKey);

export const setGeminiApiKey = (key: string) => {
  _apiKey = (key || '').trim();
  if (!_apiKey) {
    localStorage.removeItem('NUTRASCAN_GEMINI_API_KEY');
    ai = null;
    return;
  }
  localStorage.setItem('NUTRASCAN_GEMINI_API_KEY', _apiKey);
  ai = new GoogleGenAI({ apiKey: _apiKey });
};

const ensureAI = () => {
  if (!ai) {
    throw new Error('Configure a chave da IA (Gemini) nas configurações do app para ativar a análise.');
  }
  return ai;
};

export interface FoodItem {
  name: string;
  weight: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodAnalysis {
  items: FoodItem[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export const analyzeFoodImage = async (base64Image: string, description?: string): Promise<FoodAnalysis> => {
  const response = await ensureAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `Analise esta refeição e retorne os dados nutricionais estimados em formato JSON. 
            Se houver uma descrição, use-a para refinar a análise: "${description || 'Nenhuma descrição fornecida'}".
            Retorne um objeto com a lista de itens e os totais.`,
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1],
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                weight: { type: Type.NUMBER, description: "Peso estimado em gramas" },
                calories: { type: Type.NUMBER },
                protein: { type: Type.NUMBER },
                carbs: { type: Type.NUMBER },
                fat: { type: Type.NUMBER },
              },
              required: ["name", "weight", "calories", "protein", "carbs", "fat"],
            },
          },
          totals: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fat: { type: Type.NUMBER },
            },
            required: ["calories", "protein", "carbs", "fat"],
          },
        },
        required: ["items", "totals"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
};

export const analyzeMealImpact = async (totals: any, goal: string): Promise<string> => {
  const response = await ensureAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analise o impacto desta refeição (${totals.calories}kcal, ${totals.protein}g prot, ${totals.carbs}g carb, ${totals.fat}g gord) no objetivo de "${goal}". 
    Seja breve, direto e motivador. Máximo 3 linhas. Não use asteriscos.`,
  });

  return response.text || "Análise indisponível no momento.";
};

export const generateNutraInsights = async (diaryEntries: any[]): Promise<any[]> => {
  const response = await ensureAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Com base nas últimas refeições do usuário: ${JSON.stringify(diaryEntries.slice(0, 10))}, 
    identifique 3 padrões ou insights nutricionais importantes.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          insights: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["success", "warning", "info"] },
              },
              required: ["title", "description", "type"],
            },
          },
        },
        required: ["insights"],
      },
    },
  });

  const data = JSON.parse(response.text || '{"insights": []}');
  return data.insights;
};

export const getDietStrategy = async (profile: any, recentDiary: any[]): Promise<{ strategy: string, explanation: string, recommendedFoods: string[], recommendedTargets: { calories: number, protein: number, carbs: number, fat: number } }> => {
  const response = await ensureAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Com base no perfil do usuário: ${JSON.stringify(profile)} 
    e nos registros alimentares dos últimos 7 dias: ${JSON.stringify(recentDiary)}, 
    defina a melhor estratégia dietética atual (Bulking, Bulking Leve, Cutting ou Manutenção).
    Explique o porquê de forma técnica e direta.
    Sugira 5 alimentos específicos e direcionados para esta fase, explicando brevemente o benefício de cada um.
    Além disso, recomende as metas diárias ideais (calorias, proteínas, carboidratos e gorduras) para este usuário.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          strategy: { type: Type.STRING, description: "Bulking, Bulking Leve, Cutting ou Manutenção" },
          explanation: { type: Type.STRING },
          recommendedFoods: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          },
          recommendedTargets: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fat: { type: Type.NUMBER }
            },
            required: ["calories", "protein", "carbs", "fat"]
          }
        },
        required: ["strategy", "explanation", "recommendedFoods", "recommendedTargets"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const getMealSuggestions = async (remainingMacros: any, goal: string): Promise<string> => {
  const response = await ensureAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `O usuário ainda precisa consumir: ${remainingMacros.calories}kcal, ${remainingMacros.protein}g prot, ${remainingMacros.carbs}g carb, ${remainingMacros.fat}g gord. 
    Seu objetivo é "${goal}". 
    Sugira 2 opções de refeições rápidas e saudáveis para bater essas metas. Seja breve. Não use asteriscos.`,
  });

  return response.text || "Sugestão indisponível.";
};
