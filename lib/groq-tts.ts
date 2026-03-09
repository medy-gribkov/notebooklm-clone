const TTS_URL = "https://api.groq.com/openai/v1/audio/speech";

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not configured");
  return key;
}

export async function generateSpeech(
  text: string,
  voice = "troy"
): Promise<ArrayBuffer> {
  if (text.length > 10_000) {
    text = text.slice(0, 10_000);
  }

  const controller = new AbortController();
  /* v8 ignore next -- @preserve */
  const timeout = setTimeout(() => controller.abort(), 30_000);

  const res = await fetch(TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "canopylabs/orpheus-v1-english",
      input: text,
      voice,
      response_format: "mp3",
    }),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq TTS failed (${res.status}): ${body.slice(0, 200)}`);
  }

  return res.arrayBuffer();
}
