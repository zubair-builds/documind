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

    await connectDB();

    let isIndexed = false;
    let query: any = { userId: user.id };

    if (pdfId) {
      const chunkExists = await PdfChunk.exists({ pdfId });
      isIndexed = !!chunkExists;
      query.pdfId = pdfId;
    } else {
      // Global chat mode: Check if user has at least one PDF indexed
      const { default: Pdf } = await import('@/models/Pdf');
      const userPdfs = await Pdf.find({ userId: user.id }).select('_id').lean();
      if (userPdfs && userPdfs.length > 0) {
        const pdfIds = userPdfs.map((p: any) => p._id);
        const chunkExists = await PdfChunk.exists({ pdfId: { $in: pdfIds } });
        isIndexed = !!chunkExists;
      }
      query.pdfId = { $exists: false };
    }

    // Fetch chat history for this user and this document
    const messages = await ChatMessage.find(query)
      .sort({ createdAt: 1 })
      .select('role content responseTime tokens suggestedQuestions -_id')
      .lean();

    return NextResponse.json({ isIndexed, messages });
  } catch (error: any) {
    console.error('Chat status error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
