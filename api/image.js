export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  const apiKey = process.env.RUNWARE_API_KEY;
  const model = process.env.RUNWARE_IMAGE_MODEL || "runware:400@1";
  if (!apiKey) return res.status(500).json({ error: "RUNWARE_API_KEY is missing in Vercel Environment Variables." });
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim().slice(0, 2000) : "";
  if (!prompt) return res.status(400).json({ error: "Please describe the image you want." });
  try {
    const response = await fetch("https://api.runware.ai/v1", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify([{
        taskType: "imageInference",
        taskUUID: crypto.randomUUID(),
        model,
        positivePrompt: prompt,
        width: 1024,
        height: 1024,
        numberResults: 1
      }])
    });
    const data = await response.json();
    if (!response.ok || data.error || !Array.isArray(data.data)) {
      return res.status(502).json({ error: data.error?.message || data.errors?.[0]?.message || "Runware image request failed. Check your model AIR ID and account." });
    }
    const result = data.data.find(item => item.taskType === "imageInference" && item.imageURL);
    if (!result) return res.status(502).json({ error: "No image URL was returned. Try a different image model." });
    return res.status(200).json({ imageURL: result.imageURL });
  } catch {
    return res.status(500).json({ error: "Could not connect to Runware. Please try again." });
  }
}
