import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Pdf from '@/models/Pdf';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pdfs/[id]
 * Get single PDF document details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const { getAuthenticatedUser } = await import('@/lib/api-auth');
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const pdfId = params.id;

    // Connect to database
    await connectDB();

    // Find PDF document
    const pdf = await Pdf.findById(pdfId).lean();

    if (!pdf) {
      return NextResponse.json(
        { error: 'PDF not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (pdf.userId.toString() !== userId) {
      return NextResponse.json(
        { error: 'Access denied. You do not own this PDF.' },
        { status: 403 }
      );
    }

    // Return full PDF data
    return NextResponse.json({
      success: true,
      pdf: {
        id: pdf._id.toString(),
        filename: pdf.filename,
        originalFilename: pdf.originalFilename,
        fileSize: pdf.fileSize,
        pageCount: pdf.pageCount,
        extractedText: pdf.extractedText,
        extractedPages: pdf.extractedPages,
        unlockStatus: pdf.unlockStatus,
        processingMetadata: pdf.processingMetadata,
        createdAt: pdf.createdAt,
        updatedAt: pdf.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching PDF:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch PDF',
      },
      { status: 500 }
    );
  }
}

