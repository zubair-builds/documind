import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Pdf from '@/models/Pdf';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pdfs
 * Get list of user's PDF documents with pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Connect to database
    await connectDB();

    // Get pagination parameters from URL
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await Pdf.countDocuments({ userId });

    // Fetch user's PDFs with pagination, sorted by creation date (newest first)
    const pdfs = await Pdf.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        '_id filename originalFilename pageCount extractedPages unlockStatus documentType fileSize createdAt'
      )
      .lean();

    return NextResponse.json({
      success: true,
      pdfs: pdfs.map((pdf) => ({
        id: pdf._id.toString(),
        filename: pdf.filename,
        originalFilename: pdf.originalFilename,
        pageCount: pdf.pageCount,
        extractedPages: pdf.extractedPages,
        unlockStatus: pdf.unlockStatus,
        documentType: pdf.documentType,
        fileSize: pdf.fileSize,
        createdAt: pdf.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching PDFs:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch PDFs',
      },
      { status: 500 }
    );
  }
}

