import pdfParse from "pdf-parse";

export async function extractText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);

  if (!data.text || data.text.trim().length === 0) {
    throw new Error(
      "No text layer found. Scanned PDFs are not supported. Please upload a PDF with selectable text."
    );
  }

  return data.text;
}
