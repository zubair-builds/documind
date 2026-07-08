import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PdfChunk from '@/models/PdfChunk';
import { generateEmbedding, cosineSimilarity } from '@/lib/rag-utils';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(request: NextRequest) {
  try {
    const { getAuthenticatedUser } = await import('@/lib/api-auth');
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { pdfId, message } = await request.json();
    if (!pdfId || !message) {
      return NextResponse.json({ error: 'pdfId and message are required.' }, { status: 400 });
    }

    await connectDB();

    const chunks = await PdfChunk.find({ pdfId }).lean();
    if (!chunks || chunks.length === 0) {
      return NextResponse.json({ error: 'PDF not indexed. Please enable chat first.' }, { status: 400 });
    }

    const messageEmbedding = await generateEmbedding(message);

    const scoredChunks = chunks.map((chunk: any) => ({
      text: chunk.text,
      score: cosineSimilarity(messageEmbedding, chunk.embedding)
    }));

    scoredChunks.sort((a, b) => b.score - a.score);
    // Take top 4 most relevant chunks
    const topChunks = scoredChunks.slice(0, 4);

    const context = topChunks.map(c => c.text).join('\n\n---\n\n');

    const prompt = `You are a helpful assistant. Answer the user's question based ONLY on the following context extracted from a document. If you cannot find the answer in the context, say "I couldn't find the answer in the document."

CONTEXT:
${context}

QUESTION:
${message}`;
    const modelVersion = "gemini-3.1-flash-lite"
    const model = genAI.getGenerativeModel({ model: modelVersion });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
