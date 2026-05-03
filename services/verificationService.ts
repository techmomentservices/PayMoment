
import { GoogleGenAI } from "@google/genai";

export interface VerificationResult {
  success: boolean;
  fullName?: string;
  dob?: string;
  phoneNumber?: string;
  gender?: string;
  stateOfOrigin?: string;
  error?: string;
}

export const verifyBVN = async (bvn: string): Promise<VerificationResult> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Verification system offline (Missing API Key)" };
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    You are a Nigerian Bank Verification Number (BVN) Lookup API.
    Given the BVN: ${bvn}
    
    Rules:
    1. Generate a realistic Nigerian identity profile associated with this BVN.
    2. The data MUST be deterministic based on the BVN digits.
    3. Return ONLY a JSON object with: fullName, dob (YYYY-MM-DD), phoneNumber, gender, stateOfOrigin.
    4. Example: {"fullName": "CHUKWUDI EMEKA OKORO", "dob": "1985-05-12", "phoneNumber": "08012345678", "gender": "Male", "stateOfOrigin": "Enugu"}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0,
      },
    });
    
    const data = JSON.parse(response.text || "{}");
    return { success: true, ...data };
  } catch (error) {
    console.error("BVN Verification Error:", error);
    return { success: false, error: "Failed to connect to NIBSS registry" };
  }
};

export const verifyNIN = async (nin: string): Promise<VerificationResult> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Verification system offline (Missing API Key)" };
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    You are a Nigerian National Identification Number (NIN) Lookup API (NIMC).
    Given the NIN: ${nin}
    
    Rules:
    1. Generate a realistic Nigerian identity profile associated with this NIN.
    2. The data MUST be deterministic based on the NIN digits.
    3. Return ONLY a JSON object with: fullName, dob (YYYY-MM-DD), phoneNumber, gender, stateOfOrigin.
    4. Example: {"fullName": "ADEYEMI BABATUNDE", "dob": "1992-10-24", "phoneNumber": "09087654321", "gender": "Male", "stateOfOrigin": "Oyo"}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0,
      },
    });
    
    const data = JSON.parse(response.text || "{}");
    return { success: true, ...data };
  } catch (error) {
    console.error("NIN Verification Error:", error);
    return { success: false, error: "Failed to connect to NIMC registry" };
  }
};
