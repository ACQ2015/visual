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

    const prompt =
      "I have a master visual design that needs adapting to different social media formats. " +
      "Marked elements in the image:\n" + zoneDesc + "\n\n" +
      "Formats needed: " + formatsDesc + "\n\n" +
      "For each format give a clear practical adaptation guide for a designer covering:\n" +
      "1. How to crop/resize the background\n" +
      "2. Where to reposition the logo (keep same relative position, scale proportionally)\n" +
      "3. How to resize and reflow text (font size, line breaks, safe zones)\n" +
      "4. Any other important layout adjustments\n\n" +
      "Be specific with percentages and pixel values. " +
      "Return ONLY raw JSON: {\"overview\": \"brief notes\", \"formats\": [{\"name\": \"format name\", \"guide\": \"step by step instructions\"}]}. " +
      "No markdown, no backticks, English only.";

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1200,
      system: "You are an expert art director specializing in social media design adaptations. Give precise, actionable instructions. Return only raw JSON. No markdown. No backticks.",
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
          { type: "text", text: prompt }
        ]
      }]
    });

    const raw = response.content.filter(b => b.type === "text").map(b => b.text).join("");
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1) throw new Error("No JSON in response");

    const result = JSON.parse(raw.slice(start, end + 1));
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
