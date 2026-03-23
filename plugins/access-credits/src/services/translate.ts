/**
 * Lightweight translation service using LibreTranslate API.
 * Falls back gracefully if the API is unavailable.
 */

export interface TranslateService {
  detectLanguage(text: string): Promise<string>;
  translate(text: string, source: string, target: string): Promise<string>;
}

export function createTranslateService(apiUrl?: string): TranslateService {
  const baseUrl = (apiUrl || "https://libretranslate.com").replace(/\/+$/, "");

  return {
    async detectLanguage(text: string): Promise<string> {
      try {
        const res = await fetch(`${baseUrl}/detect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: text.slice(0, 500) }),
        });
        if (!res.ok) return "en";
        const data = await res.json() as Array<{ language: string; confidence: number }>;
        return data?.[0]?.language || "en";
      } catch {
        return "en";
      }
    },

    async translate(text: string, source: string, target: string): Promise<string> {
      if (source === target) return text;
      try {
        const res = await fetch(`${baseUrl}/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: text, source, target, format: "text" }),
        });
        if (!res.ok) return text;
        const data = await res.json() as { translatedText: string };
        return data?.translatedText || text;
      } catch {
        return text;
      }
    },
  };
}
