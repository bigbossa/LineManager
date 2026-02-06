import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Contact } from "../types";

const createClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing. Please select one using the settings.");
    // In a real app, handle this gracefully. For this demo, we assume the environment injects it or the user selects it.
    // The main App component handles the key selection UI.
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generatePersonalizedBulk = async (
  baseMessage: string,
  contacts: Contact[]
): Promise<{ contactId: string; message: string }[]> => {
  const ai = createClient();
  if (!ai) throw new Error("API Key not found");

  // Define the expected output schema
  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        contactId: { type: Type.STRING },
        message: { type: Type.STRING },
      },
      required: ["contactId", "message"],
    },
  };

  // Construct a prompt that includes the context of all users
  // We process in batches if the list is huge, but for this demo, we do one batch.
  const usersContext = contacts.map(c => ({
    id: c.id,
    name: c.name,
    tier: c.tier,
    interests: c.interests.join(", "),
  }));

  const prompt = `
    You are a professional LINE Official Account marketing copywriter.
    
    Task: Rewrite the following 'Base Message' for each user in the provided 'User List'.
    
    Base Message: "${baseMessage}"
    
    Guidelines:
    1. Maintain the core information of the base message.
    2. Adjust the tone and content to match the user's 'tier' and 'interests'.
    3. Use the user's name naturally.
    4. Keep it concise (suitable for a chat bubble).
    5. Returns a JSON array where each object has 'contactId' (matching the user input) and the new 'message'.
    6. If the user's name implies Thai origin or the context is Thai, write in Thai. Otherwise English. (For this demo, assume Thai context if names are Thai).

    User List:
    ${JSON.stringify(usersContext)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    if (!text) return [];

    const parsed = JSON.parse(text);
    return parsed as { contactId: string; message: string }[];
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};