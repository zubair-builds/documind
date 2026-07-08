import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI with API key from environment
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);
const EMBEDDING_MODEL = 'gemini-embedding-001';

export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const chunk = text.substring(i, i + chunkSize);
    chunks.push(chunk);
    i += chunkSize - overlap;
  }
  return chunks;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  const embedding = result.embedding;
  return embedding.values;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
