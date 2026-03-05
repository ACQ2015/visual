import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { imageBase64, zoneDesc, formatsDesc } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "No image provided" });

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1200,
      system: "You are an expert art director. Return only raw JSON, no markdown, no backticks.",
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
          { type: "text", text: `Analyze this design and give adaptation instructions for: ${formatsDesc}. Marked zones: ${zoneDesc}. Return JSON: {"overview": "notes", "formats": [{"name": "format", "guide": "instructions"}]}` }
        ]
      }]
    });

    const raw = response.content.filter(b => b.type === "text").map(b => b.text).join("");
    const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
    const result = JSON.parse(raw.slice(start, end + 1));
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
