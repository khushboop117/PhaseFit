// Vercel serverless function: POST /api/chat
// It proxies to OpenAI, Groq, or OpenRouter using server-side keys.

export default async function handler(req, res) {
  // CORS for local dev & prod
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.status(200).end();
    return;
  }
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { provider = "openai", model, messages, temperature = 0.8, max_tokens = 900 } = req.body || {};

    const MAP = {
      openai: {
        url: "https://api.openai.com/v1/chat/completions",
        key: process.env.OPENAI_API_KEY,
        headers: {},
        defaultModel: "gpt-4o-mini",
      },
      groq: {
        url: "https://api.groq.com/openai/v1/chat/completions",
        key: process.env.GROQ_API_KEY,
        headers: {},
        defaultModel: "deepseek-r1-distill-llama-70b", // works well for you
      },
      openrouter: {
        url: "https://openrouter.ai/api/v1/chat/completions",
        key: process.env.OPENROUTER_API_KEY,
        headers: {
          "HTTP-Referer": process.env.APP_ORIGIN || "http://localhost:5173",
          "X-Title": "PhaseFit Demo",
        },
        defaultModel: "openrouter/auto",
      },
    };

    const cfg = MAP[provider];
    if (!cfg) return res.status(400).json({ error: `Unknown provider: ${provider}` });
    if (!cfg.key) return res.status(401).json({ error: `No API key for ${provider}` });

    const payload = {
      model: model || cfg.defaultModel,
      messages,
      temperature,
      max_tokens,
    };

    const r = await fetch(cfg.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.key}`,
        ...cfg.headers,
      },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    if (!r.ok) {
      // Pass upstream error details through
      try {
        res.status(r.status).json(JSON.parse(text));
      } catch {
        res.status(r.status).send(text);
      }
      return;
    }
    // Return provider response as-is (frontend already knows how to read it)
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(text);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
