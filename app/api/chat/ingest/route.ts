import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PdfChunk from '@/models/PdfChunk';
import Pdf from '@/models/Pdf';
import { getFilePathByDownloadId } from '@/lib/file-utils';
import { extractFullTextFromPdf } from '@/lib/text-extractor';
import { chunkText, generateEmbedding } from '@/lib/rag-utils';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { getAuthenticatedUser } = await import('@/lib/api-auth');
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const { downloadId, pdfId } = await request.json();
    if (!pdfId) {
      return NextResponse.json({ error: 'pdfId is required.' }, { status: 400 });
    }

    await connectDB();

    // Check if chunks already exist
    const existingChunks = await PdfChunk.countDocuments({ pdfId });
    if (existingChunks > 0) {
      return NextResponse.json({ success: true, message: 'PDF already indexed.', chunksProcessed: existingChunks });
    }

    let textToProcess = '';

    // First try the temporary physical file if we have a downloadId
    if (downloadId) {
      const pdfPath = getFilePathByDownloadId(downloadId);
      if (existsSync(pdfPath)) {
        const textResult = await extractFullTextFromPdf(pdfPath);
        if (textResult.success && textResult.text) {
          textToProcess = textResult.text;
        }
      }
    }

    // If file isn't found (e.g. older history PDF), fallback to the extracted text saved in the database
    if (!textToProcess) {
      const pdfDoc = await Pdf.findById(pdfId).lean();
      if (!pdfDoc || !pdfDoc.extractedText) {
        return NextResponse.json({ error: 'PDF file not found and no text available in history.' }, { status: 404 });
      }
      textToProcess = pdfDoc.extractedText;
    }

    // Use smaller chunks for better RAG precision
    const chunks = chunkText(textToProcess, 1000, 200);
    
    // Process embeddings sequentially to avoid rate limiting
    for (let i = 0; i < chunks.length; i++) {
      const chunkStr = chunks[i];
      const embedding = await generateEmbedding(chunkStr);
      await PdfChunk.create({
        pdfId,
        chunkIndex: i,
        text: chunkStr,
        embedding,
      });
    }

    return NextResponse.json({ success: true, chunksProcessed: chunks.length });
  } catch (error: any) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
