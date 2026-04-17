import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeTMTResult(
  testType: string,
  timeInSeconds: number,
  errors: number,
  level?: number
) {
  const prompt = `
    Analyze the following Trail Making Test (TMT) result:
    - Test Type: ${testType}
    - Level: ${level || 'N/A'}
    - Time: ${timeInSeconds} seconds
    - Errors: ${errors}

    Based on the following clinical guidelines:
    - TMT-A measures visual attention, processing speed, and motor tracking.
    - TMT-B measures cognitive flexibility, working memory, and executive function.
    - Long time suggests slow processing or weak attention.
    - Many errors suggest weak executive function or memory.
    - A large difference between A and B indicates weak cognitive flexibility.

    Provide a professional but encouraging interpretation in Arabic, as the user is likely an Arabic speaker.
    Return the response in JSON format with 'interpretation' and 'recommendations' fields.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            interpretation: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["interpretation", "recommendations"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      interpretation: "عذراً، تعذر تحليل النتائج حالياً.",
      recommendations: ["يرجى المحاولة مرة أخرى لاحقاً."]
    };
  }
}
