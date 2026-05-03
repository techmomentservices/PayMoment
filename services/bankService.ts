
import { GoogleGenAI } from "@google/genai";

export interface AccountEnquiryResult {
  success: boolean;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  kycLevel?: number;
  bvnLinked?: boolean;
  error?: string;
}

/**
 * Simulates a NIBSS (Nigeria Inter-Bank Settlement System) Name Enquiry.
 * In a production environment, this would call a banking switch or an aggregator like Paystack/Flutterwave.
 */
export const performNameEnquiry = async (accountNumber: string, bankCode: string): Promise<AccountEnquiryResult> => {
  const timeoutPromise = new Promise<AccountEnquiryResult>((_, reject) =>
    setTimeout(() => reject(new Error("Request Timeout")), 25000)
  );

  const enquiryPromise = (async (): Promise<AccountEnquiryResult> => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        console.warn("Gemini API key not found. Falling back to deterministic name generation.");
        return generateDeterministicName(accountNumber, bankCode);
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        CRITICAL MISSION: Resolve the REAL legal account name for this Nigerian bank account.
        Account Number: ${accountNumber}
        Bank: ${bankCode}
        
        You are acting as the live NIBSS (Nigeria Inter-Bank Settlement System) verification gateway.
        
        Instructions:
        1. Use your search tool to find the ACTUAL registered name for this specific account number and bank.
        2. Look for public business registrations (CAC), government payroll records, professional listings, or public transaction receipts.
        3. If you find a real match, return that EXACT name.
        4. If no public record exists, use your knowledge of Nigerian naming patterns and the account number to generate a highly realistic, deterministic name.
        5. The name should consist of a Surname and at least one First Name (e.g., "OKOROAFOR CHUKWUDI").
        6. Return ONLY a JSON object with: accountName (UPPERCASE), kycLevel (1, 2, or 3), bvnLinked (boolean).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          temperature: 0,
        },
      });
      
      const data = JSON.parse(response.text || "{}");
      if (!data.accountName) throw new Error("Invalid AI response");

      return { 
        success: true, 
        accountName: data.accountName,
        accountNumber,
        bankName: bankCode,
        kycLevel: data.kycLevel || 1,
        bvnLinked: data.bvnLinked ?? false
      };
    } catch (error) {
      console.error("NIBSS Enquiry Error, falling back to deterministic:", error);
      return generateDeterministicName(accountNumber, bankCode);
    }
  })();

  try {
    return await Promise.race([enquiryPromise, timeoutPromise]);
  } catch (error) {
    console.error("Enquiry failed or timed out, falling back to deterministic:", error);
    return generateDeterministicName(accountNumber, bankCode);
  }
};

/**
 * Generates a realistic, deterministic name based on the account number.
 * Used as a fallback when the live banking switch (AI) is unavailable.
 */
const generateDeterministicName = (accountNumber: string, bankCode: string): AccountEnquiryResult => {
  const surnames = ["OKOROAFOR", "ADEYEMI", "BABATUNDE", "OKONJO", "DANJUMA", "EZEKWESILI", "BALOGUN", "ADENIJI", "CHUKWUMA", "NWOSU"];
  const firstNames = ["CHUKWUDI", "OLUWASEUN", "NGOZI", "IBRAHIM", "OLUMIDE", "CHINELO", "TUNDE", "FUNKE", "EMMANUEL", "AISHATU"];
  
  const seed = parseInt(accountNumber.slice(-4)) || 0;
  const surname = surnames[seed % surnames.length];
  const firstName = firstNames[(seed + 7) % firstNames.length];
  
  return {
    success: true,
    accountName: `${surname} ${firstName}`,
    accountNumber,
    bankName: bankCode,
    kycLevel: (seed % 3) + 1,
    bvnLinked: seed % 2 === 0
  };
};
