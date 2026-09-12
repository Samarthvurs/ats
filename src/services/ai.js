import Groq from 'groq-sdk';

/**
 * 🔒 SECURITY NOTICE: 
 * For production (10,000+ users), this entire service will be replaced by 
 * a fetch call to a Firebase Cloud Function. This keeps your API key 
 * completely hidden from the client-side bundle.
 */

const getGroqClient = () => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing Groq API Key in .env.local");
  return new Groq({ apiKey, dangerouslyAllowBrowser: true });
};

/**
 * Centralized AI Call Logic
 * Includes exponential backoff for rate limiting and robust JSON cleaning.
 */
export const callGroq = async (messages, options = {}, attempt = 0) => {
  try {
    const groq = getGroqClient();
    
    // Support both string prompts and message arrays
    const formattedMessages = typeof messages === 'string' 
      ? [{ role: "user", content: messages }]
      : messages;

    console.log(`[Groq] Calling ${options.model || "llama-3.1-8b-instant"} with ${formattedMessages.length} messages...`);
    const completion = await groq.chat.completions.create({
      messages: formattedMessages,
      model: options.model || "llama-3.1-8b-instant",
      response_format: options.json ? { type: "json_object" } : undefined,
      temperature: options.temperature ?? 0.7,
    });

    return completion;
  } catch (err) {
    // 429 = Rate Limit. Apply Exponential Backoff (1s, 2s, 4s)
    if (err.status === 429 && attempt < 3) {
      const wait = Math.pow(2, attempt) * 1000;
      console.warn(`[Groq] Rate limited. Retrying in ${wait}ms...`);
      await new Promise(r => setTimeout(r, wait));
      return callGroq(messages, options, attempt + 1);
    }
    
    console.error("Groq Service Error Detailed:", { 
      message: err.message, 
      status: err.status,
      type: err.type,
      config: { model: options.model || "llama-3.1-8b-instant" }
    });
    throw new Error(err.message || "AI Service Unavailable");
  }
};

/**
 * Helper to clean AI responses that might contain markdown backticks
 */
export const cleanJsonResponse = (text) => {
  if (!text) return null;
  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON Parse Error:", text);
    return null;
  }
};
