import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Statement from '@/models/Statement';

export const dynamic = 'force-dynamic';

/**
 * GET /api/statements/[pdfId]
 * Get statement data by PDF ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { pdfId: string } }
) {
  try {
    // Get authenticated user session
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
    const { pdfId } = params;

    // Connect to database
    await connectDB();

    // Find statement by pdfId
    const statement = await Statement.findOne({ pdfId }).lean();

    if (!statement) {
      return NextResponse.json(
        { error: 'Statement not found. Please analyze the PDF first.' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (statement.userId.toString() !== userId) {
      return NextResponse.json(
        { error: 'Access denied. You do not own this statement.' },
        { status: 403 }
      );
    }

    // Return statement data
    return NextResponse.json({
      success: true,
      statement: {
        id: statement._id.toString(),
        summary: statement.summary,
        transactions: statement.transactions,
        analysisMetadata: statement.analysisMetadata,
        createdAt: statement.createdAt,
        updatedAt: statement.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching statement:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch statement',
      },
      { status: 500 }
    );
  }
}

