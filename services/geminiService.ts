
import { GoogleGenAI } from "@google/genai";
import { Transaction, BudgetCategory } from "../types";

export const analyzeFinances = async (query: string, transactions: Transaction[], budgetCategories: BudgetCategory[] = []) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Gemini API Key is missing. Please check your environment variables.");
    return "I'm currently unable to access my intelligence core. Please ensure the API Key is configured.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const transactionContext = JSON.stringify(transactions.map(t => ({
    title: t.title,
    amount: t.amount,
    type: t.type,
    category: t.category,
    date: t.timestamp
  })));

  const budgetContext = budgetCategories.length > 0 
    ? `The user has defined the following custom budget categories: ${JSON.stringify(budgetCategories.map(b => ({
        name: b.name,
        limit: b.limit,
        spent: b.spent
      })))}`
    : "The user hasn't defined any custom budget categories yet. Suggest they set some up for better tracking.";

  const systemInstruction = `
    You are PayAI, the intelligent assistant for PayMoment, a premium Nigerian fintech app.
    Your goal is to help users manage their finances better locally and globally.
    You have access to their recent transactions: ${transactionContext}.
    ${budgetContext}
    
    GUIDELINES:
    - Use the custom budget categories to provide personalized insights. If they are over budget in a category, give advice.
    - Mention specific category names if relevant to the user query.
    - Keep responses concise, friendly, and helpful. Use Nigerian context where appropriate (e.g., mention "Naira" or "NGN").
    - If they ask about international transfers, explain that PayMoment handles Global Wires to 100+ countries.
    - If they ask about receiving dollars, mention their "Receive USD" account details in the Global section.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
    return response.text || "I'm sorry, I couldn't process that right now.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "PayAI is currently resting. Please try again in a bit.";
  }
};
