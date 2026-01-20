import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Pdf from '@/models/Pdf';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pdfs/check-duplicate
 *
 * Accepts a precomputed content hash from the client and checks whether
 * the authenticated user has already uploaded a PDF with the same content.
 *
 * Request body (JSON):
 * {
 *   "hash": "sha256-hex-string"
 * }
 *
 * Response (200):
 * {
 *   "success": true,
 *   "isDuplicate": boolean,
 *   "pdf": { ... } | null
 * }
 */
export async function POST(request: NextRequest) {
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

    // Connect to database
    await connectDB();

    const body = await request.json().catch(() => null);

    if (!body || typeof body.hash !== 'string' || body.hash.trim() === '') {
      return NextResponse.json(
        { error: 'Missing or invalid hash in request body.' },
        { status: 400 }
      );
    }

    const hash = body.hash.trim();

    const existingPdf = await Pdf.findOne({ userId, contentHash: hash })
      .select('_id filename originalFilename createdAt')
      .lean();

    if (!existingPdf) {
      return NextResponse.json({
        success: true,
        isDuplicate: false,
        pdf: null,
      });
    }

    return NextResponse.json({
      success: true,
      isDuplicate: true,
      pdf: {
        id: existingPdf._id,
        filename: existingPdf.filename,
        originalFilename: existingPdf.originalFilename,
        createdAt: existingPdf.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error checking PDF duplicate:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to check duplicate PDF',
      },
      { status: 500 }
    );
  }
}

