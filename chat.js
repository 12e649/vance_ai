export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  const apiKey = process.env.RUNWARE_API_KEY;
  const model = process.env.RUNWARE_TEXT_MODEL;
  if (!apiKey) return res.status(500).json({ error: "RUNWARE_API_KEY is missing in Vercel Environment Variables." });
  if (!model) return res.status(500).json({ error: "RUNWARE_TEXT_MODEL is missing. Set it to a text model AIR ID available in your Runware account." });
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const safeMessages = messages
    .filter(m => ["user", "assistant"].includes(m?.role) && typeof m?.content === "string")
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content.slice(0, 6000) }));
  if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== "user") {
    return res.status(400).json({ error: "Please send a question." });
  }
  try {
    const response = await fetch("https://api.runware.ai/v1", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify([{
        taskType: "textInference",
        taskUUID: crypto.randomUUID(),
        model,
        messages: safeMessages
      }])
    });
    const data = await response.json();
    if (!response.ok || data.error || !Array.isArray(data.data)) {
      return res.status(502).json({ error: data.error?.message || data.errors?.[0]?.message || "Runware text request failed. Check your model AIR ID and account." });
    }
    const result = data.data.find(item => item.taskType === "textInference");
    if (!result?.text) return res.status(502).json({ error: "The selected model returned no text." });
    return res.status(200).json({ reply: result.text });
  } catch {
    return res.status(500).json({ error: "Could not connect to Runware. Please try again." });
  }
}
