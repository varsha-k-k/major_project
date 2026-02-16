import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
// Simple in-memory cache to avoid repeat calls for identical queries
const cache = new Map();

function setCache(key, value, ttlMs = 1000 * 60 * 5) {
  const expires = Date.now() + ttlMs;
  cache.set(key, { value, expires });
}

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function processGuestQuery(query) {
  const normalized = (query || "").trim().toLowerCase();

  // 1) Fast rule-based replies to cut API usage
  if (normalized.includes("room") || normalized.includes("available")) {
    return { intent: "availability", response: "Yes, we have rooms available. Would you like to book one?" };
  }
  if (normalized.includes("price") || normalized.includes("cost")) {
    return { intent: "pricing", response: "Room prices depend on the room type. Please tell me which room you prefer." };
  }
  if (normalized.includes("book")) {
    return { intent: "booking", response: "Sure — please tell me the room type and dates you'd like to book." };
  }

  // 2) Check cache
  const cacheKey = `guestq:${normalized}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  // 3) Prepare prompt
  const prompt = `You are a hotel assistant. Classify the user intent and respond naturally. ` +
    `Possible intents: availability, pricing, booking, cancellation, general. ` +
    `User query: "${query}" ` +
    `Return JSON like: { "intent": "...", "response": "..." }`;

  // 4) Model routing: prefer cheaper model; allow override with PREMIUM_AI_MODEL env var
  const cheapModel = process.env.AI_CHEAP_MODEL || "gpt-3.5-turbo";
  const premiumModel = process.env.AI_PREMIUM_MODEL || "gpt-4o-mini";
  const usePremium = process.env.USE_PREMIUM_AI === "true";
  const modelToUse = usePremium ? premiumModel : cheapModel;

  const maxRetries = 2;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const completion = await openai.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: "system", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      const text = completion?.choices?.[0]?.message?.content ?? "";

      try {
        const parsed = JSON.parse(text);
        setCache(cacheKey, parsed);
        return parsed;
      } catch (e) {
        const fallback = { intent: "general", response: text };
        setCache(cacheKey, fallback);
        return fallback;
      }

    } catch (err) {
      attempt++;
      // Respect Retry-After header if present
      try {
        const retryAfter = err?.headers?.get ? err.headers.get("retry-after") : null;
        if (retryAfter) {
          const wait = Number(retryAfter) * 1000;
          await sleep(wait);
          continue;
        }
      } catch (_) {}

      // If quota exhausted, return a friendly fallback immediately
      if (err?.code === "insufficient_quota" || err?.error?.type === "insufficient_quota") {
        console.error("OpenAI quota error:", err?.message || err);
        const fallback = {
          intent: "general",
          response: "Sorry — our AI assistant is temporarily unavailable due to service limits. Our staff will assist you shortly."
        };
        setCache(cacheKey, fallback, 1000 * 60); // cache for 1 minute
        return fallback;
      }

      // Exponential backoff for transient errors
      if (attempt <= maxRetries) {
        const backoff = Math.pow(2, attempt) * 500;
        await sleep(backoff);
        continue;
      }

      console.error("OpenAI request failed after retries:", err);
      return { intent: "general", response: "Sorry, I couldn't answer right now. Please try again later." };
    }
  }

  // Final fallback (shouldn't reach here)
  return { intent: "general", response: "Sorry, something went wrong." };
}
