import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

// JPEG: FF D8 FF, PNG: 89 50 4E 47, WebP: 52 49 46 46 (RIFF)
function detectImageType(buffer: Buffer): string | null {
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return "image/webp";
  return null;
}

export async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  if (buffer.length > MAX_SIZE) {
    throw new Error("Image file exceeds 5MB limit");
  }

  const detectedType = detectImageType(buffer);
  if (!detectedType || !ALLOWED_MIME.includes(mimeType)) {
    throw new Error("Unsupported image format. Use JPEG, PNG, or WebP.");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const base64Data = buffer.toString("base64");

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: detectedType,
        data: base64Data,
      },
    },
    "Extract all text visible in this image. Return only the extracted text content, no commentary or formatting instructions. If no text is visible, respond with 'NO_TEXT_FOUND'.",
  ]);

  const text = result.response.text().trim();
  if (!text || text === "NO_TEXT_FOUND") {
    throw new Error("No text could be extracted from the image");
  }
  return text;
}
