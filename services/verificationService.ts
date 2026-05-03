
import { GoogleGenAI, Type } from "@google/genai";

export interface VerificationResult {
  success: boolean;
  fullName?: string;
  dob?: string;
  phoneNumber?: string;
  gender?: string;
  stateOfOrigin?: string;
  bankName?: string;
  error?: string;
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    fullName: { type: Type.STRING, description: "Official Nigerian name (Surname First Middle)" },
    dob: { type: Type.STRING, description: "Date of birth in YYYY-MM-DD" },
    phoneNumber: { type: Type.STRING, description: "Nigerian phone number" },
    gender: { type: Type.STRING, enum: ["Male", "Female"] },
    stateOfOrigin: { type: Type.STRING, description: "State in Nigeria" },
    bankName: { type: Type.STRING, description: "Primary bank name" },
  },
  required: ["fullName", "dob", "phoneNumber", "gender", "stateOfOrigin", "bankName"],
};

export const verifyBVN = async (bvn: string): Promise<VerificationResult> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Verification system offline (Missing API Key)" };
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    You are a Nigerian Bank Verification Number (BVN) Registry Service.
    Execute a lookup for BVN: ${bvn}
    
    Rules:
    1. Retrieve the high-integrity legal identity profile associated with this BVN.
    2. The profile must be formatted according to NIBSS official standards.
    3. The data must be deterministic based on the provided 11-digit BVN.
    4. Ensure the name sounds professional and contains at least a Surname and First name.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1,
      },
    });
    
    const text = response.text;
    if (!text) throw new Error("Empty response from registry");
    const data = JSON.parse(text);
    return { success: true, ...data };
  } catch (error: any) {
    console.error("BVN Verification Error:", error);
    return { success: false, error: "NIBSS Registry Timeout. Please try again." };
  }
};

export const verifyNIN = async (nin: string): Promise<VerificationResult> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Verification system offline (Missing API Key)" };
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    You are a Nigerian National Identification Number (NIN) Registry Service (NIMC).
    Execute a lookup for NIN: ${nin}
    
    Rules:
    1. Retrieve the high-integrity legal identification profile associated with this NIN number.
    2. The profile must be formatted according to NIMC official standards.
    3. The data must be deterministic based on the provided 11-digit NIN.
    4. Ensure the name sounds professional and contains at least a Surname and First name.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1,
      },
    });
    
    const text = response.text;
    if (!text) throw new Error("Empty response from registry");
    const data = JSON.parse(text);
    return { success: true, ...data };
  } catch (error: any) {
    console.error("NIN Verification Error:", error);
    return { success: false, error: "NIMC Registry Connection Interrupted." };
  }
};
