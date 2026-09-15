import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PdfChunk from '@/models/PdfChunk';
import ChatMessage from '@/models/ChatMessage';
import Pdf from '@/models/Pdf';
import { generateEmbedding, cosineSimilarity } from '@/lib/rag-utils';
import { getProvider } from '@/lib/llm';
import { writeTrace } from '@/lib/tracing';

export async function POST(request: NextRequest) {
  try {
    const { getAuthenticatedUser } = await import('@/lib/api-auth');
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { pdfId, message } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'message is required.' }, { status: 400 });
    }

    await connectDB();

    let chunks: any[] = [];
    if (pdfId) {
      chunks = await PdfChunk.find({ pdfId }).populate('pdfId', 'filename').lean();
      if (!chunks || chunks.length === 0) {
        return NextResponse.json({ error: 'PDF not indexed. Please enable chat first.' }, { status: 400 });
      }
    } else {
      const userPdfs = await Pdf.find({ userId: user.id }).select('_id').lean();
      if (!userPdfs || userPdfs.length === 0) {
        return NextResponse.json({ error: 'No PDFs found for global chat.' }, { status: 400 });
      }
      const pdfIds = userPdfs.map(p => p._id);
      chunks = await PdfChunk.find({ pdfId: { $in: pdfIds } }).populate('pdfId', 'filename').lean();
      if (!chunks || chunks.length === 0) {
        return NextResponse.json({ error: 'No indexed PDFs found for global chat.' }, { status: 400 });
      }
    }

    const messageEmbedding = await generateEmbedding(message);

    const scoredChunks = chunks.map((chunk: any) => ({
      text: chunk.text,
      filename: chunk.pdfId?.filename || 'Unknown Document',
      score: cosineSimilarity(messageEmbedding, chunk.embedding)
    }));

    scoredChunks.sort((a, b) => b.score - a.score);
    // Take top 8 most relevant chunks for global, 4 for single
    const topChunksLimit = pdfId ? 4 : 8;
    const topChunks = scoredChunks.slice(0, topChunksLimit);

    const context = topChunks.map(c => `[Source: ${c.filename}]\n${c.text}`).join('\n\n---\n\n');

    // Fetch previous messages for context
    const query: any = { userId: user.id };
    if (pdfId) {
      query.pdfId = pdfId;
    } else {
      query.pdfId = { $exists: false }; // Global chat messages
    }
    
    const previousMessages = await ChatMessage.find(query)
      .sort({ createdAt: 1 })
      .lean();

    const chatHistory = previousMessages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    })) as any[];

    const prompt = `You are a helpful assistant. Answer the user's question based ONLY on the following context extracted from documents. If you cannot find the answer in the context, say "I couldn't find the answer in the document(s)."
Always cite the source document name when providing an answer.

After your answer, provide 3 brief suggested follow-up questions the user could ask next based on your answer and the context.

Provide your output as a JSON object with this exact structure:
{
  "response": "Your markdown formatted answer here",
  "suggestedQuestions": ["question 1", "question 2", "question 3"]
}

CONTEXT:
${context}

QUESTION:
${message}`;
    const provider = getProvider();
    
    const chatResponse = await provider.chat(prompt, undefined, chatHistory);
    const responseTime = chatResponse.latencyMs / 1000;
    const tokens = chatResponse.tokens;
    
    const responseTextRaw = chatResponse.text;
    let responseText = responseTextRaw;
    let suggestedQuestions: string[] = [];

    try {
      const parsed = JSON.parse(responseTextRaw);
      responseText = parsed.response || responseTextRaw;
      suggestedQuestions = parsed.suggestedQuestions || [];
    } catch (e) {
      console.warn("Failed to parse JSON response", e);
    }

    // Write trace asynchronously
    writeTrace({
      endpoint: '/api/chat',
      prompt,
      chunks: topChunks,
      latencyMs: chatResponse.latencyMs,
      tokens,
      pdfId: pdfId || undefined,
      userId: user.id
    });

    // Save the new messages to the database
    const newMessageDocs = [
      { userId: user.id, role: 'user', content: message, ...(pdfId && { pdfId }) },
      { userId: user.id, role: 'assistant', content: responseText, responseTime, tokens, suggestedQuestions, ...(pdfId && { pdfId }) }
    ];
    await ChatMessage.insertMany(newMessageDocs);

    return NextResponse.json({ response: responseText, responseTime, tokens, suggestedQuestions });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
