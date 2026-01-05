import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
    // Get authenticated user session
    let session = await getServerSession(authOptions);
    let user;

    if (session?.user?.id) {
      user = session.user;
    } else {
      // Fallback: Check for Bearer token for mobile app
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const { verifyToken } = await import('@/lib/jwt');
        const decoded = verifyToken(token);
        if (decoded) {
          user = { id: decoded.userId, email: decoded.email, name: decoded.name } as any;
        }
      }
    }

    if (!user || !user.id) {
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

