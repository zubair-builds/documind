import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PdfChunk from '@/models/PdfChunk';
import ChatMessage from '@/models/ChatMessage';

export async function GET(request: NextRequest) {
  try {
    const { getAuthenticatedUser } = await import('@/lib/api-auth');
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const pdfId = request.nextUrl.searchParams.get('pdfId');
    if (!pdfId) {
      return NextResponse.json({ error: 'pdfId is required.' }, { status: 400 });
    }

    await connectDB();

    // Check if the document has been indexed
    const chunkExists = await PdfChunk.exists({ pdfId });
    const isIndexed = !!chunkExists;

    // Fetch chat history for this user and this document
    const messages = await ChatMessage.find({ pdfId, userId: user.id })
      .sort({ createdAt: 1 })
      .select('role content responseTime tokens -_id')
      .lean();

    return NextResponse.json({ isIndexed, messages });
  } catch (error: any) {
    console.error('Chat status error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
