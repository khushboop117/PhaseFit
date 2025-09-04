export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { model = "gpt-4o-mini", messages, temperature = 0.8, max_tokens = 900 } = req.body;

    // Use either OPENAI_API_KEY or fallback to VITE_OPENAI_API_KEY
    const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "Missing OpenAI API key" });
    }

    console.log("Chat API invoked");
    console.log("Model:", model);
    console.log("API key present:", !!apiKey);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("Non-JSON response from OpenAI:", raw);
      return res.status(500).json({ error: "Invalid response from OpenAI" });
    }

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return res.status(response.status).json({ error: data.error?.message || "Provider error" });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("API route error:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
