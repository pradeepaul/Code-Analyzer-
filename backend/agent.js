import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { analyzeCodebase } from "./analyzer.js";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});


export async function runAgent() {
  const metrics = await analyzeCodebase("../src");

  const prompt = `
You are a technical debt analysis agent.

Given these metrics:
- Large Components: ${JSON.stringify(metrics.largeComponents)}
- Duplicates: ${metrics.duplicates}
- Unused Components: ${JSON.stringify(metrics.unusedComponents)}
- Performance: ${JSON.stringify(metrics.performance)}

Provide:
1. Summary of issues.
2. Recommended fixes.
3. Example refactor code where applicable.
4. try to give response in html so i can preview
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return response.text;
  } catch (err) {
    console.error("Gemini Error:", err);
    throw err;
  }
}