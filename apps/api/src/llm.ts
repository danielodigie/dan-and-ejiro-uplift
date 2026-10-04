import 'dotenv/config';

// Gemini enhancement (v1.1, behind LLM_ENABLED flag).
// Rule engine always picks the base message first; Gemini only rewrites
// tone/style within product guardrails. Any failure -> return base.

export type UpliftBase = {
  greeting?: string;
  greetings?: string[];
  body: string;
  action?: string;
  action_text?: string;
  id?: string | number;
  category?: string;
};

export type UpliftContext = {
  mood?: string;
  situation?: string;
  style?: string;
  faith?: string;
  intent?: string;
};

export function llmEnabled(): boolean {
  return (
    (process.env.LLM_ENABLED || '').toLowerCase() === 'true' &&
    !!(process.env.GEMINI_API_KEY || '').trim()
  );
}

export function llmStatusMasked() {
  const k = (process.env.GEMINI_API_KEY || '').trim();
  return {
    enabled: llmEnabled(),
    flag: process.env.LLM_ENABLED || 'false',
    model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    // Never expose the key: only presence + shape for debugging.
    keyPresent: k.length > 10,
    keyLen: k.length,
    keyPrefix: k ? k.slice(0, 4) + '...' : '',
  };
}

const SYSTEM_RULES = `You rewrite encouragement messages for "Dan and Ejiro Uplift".
Rules: warm, human, hopeful, trustworthy, peaceful. 2nd person, present, permission-giving.
Body max 280 chars, 1 short actionable step max 120 chars.
Never: toxic positivity ("just be positive!"), medical/mental-health diagnosis, shaming, preaching.
Faith content only if faithOptIn=true, clearly gentle, scripture + 1-line reflection max.
Crisis keywords (self-harm, suicide) -> respond ONLY with: "You matter and you don't have to carry this alone. Please reach out to someone you trust or your local crisis helpline right now." plus one gentle next step.
Return STRICT JSON only: {"greeting": "...", "body": "...", "action": "..."}`;

export async function enhanceWithGemini(
  base: UpliftBase,
  ctx: UpliftContext,
  faithOptIn: boolean,
): Promise<UpliftBase> {
  if (!llmEnabled()) return base;
  const key = process.env.GEMINI_API_KEY!.trim();
  const model = (process.env.GEMINI_MODEL || 'gemini-3.8-flash').trim();

  const userPrompt = JSON.stringify({
    mood: ctx.mood || null,
    situation: ctx.situation || null,
    style: ctx.style || 'gentle',
    intent: ctx.intent || null,
    faithOptIn,
    baseGreeting: base.greeting || (base.greetings || [])[0] || '',
    baseBody: base.body,
    baseAction: base.action || base.action_text || '',
    category: base.category || null,
  });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_RULES }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 300, responseMimeType: 'application/json' },
        }),
      },
    );
    if (!res.ok) return base; // invalid key / quota -> graceful fallback
    const data: any = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
    if (!text) return base;
    const parsed = JSON.parse(text);
    if (!parsed.body || typeof parsed.body !== 'string') return base;
    return {
      ...base,
      greeting: typeof parsed.greeting === 'string' ? parsed.greeting : base.greeting,
      body: parsed.body.slice(0, 280),
      action:
        typeof parsed.action === 'string'
          ? parsed.action.slice(0, 120)
          : base.action || base.action_text,
    };
  } catch {
    return base; // timeout / network / parse error -> rule engine wins
  } finally {
    clearTimeout(timer);
  }
}
