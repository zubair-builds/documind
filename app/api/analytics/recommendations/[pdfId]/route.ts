import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Statement from '@/models/Statement';
import {
  calculateCategoryBreakdown,
  generateRecommendations,
} from '@/lib/analytics';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/recommendations/[pdfId]
 * Get budget recommendations for a specific statement
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { pdfId: string } }
) {
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
    const { pdfId } = params;

    // Connect to database
    await connectDB();

    // Find statement
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
        { error: 'Access denied.' },
        { status: 403 }
      );
    }

    // Get user's other statements for comparison
    const allUserStatements = await Statement.find({
      userId,
      _id: { $ne: statement._id },
    }).lean();

    // Calculate user average if there are other statements
    let userAverage;
    if (allUserStatements.length > 0) {
      const allTransactions = allUserStatements.flatMap((s) => s.transactions);
      const avgCategoryBreakdown = calculateCategoryBreakdown(allTransactions);
      const avgUtilization =
        allUserStatements.reduce(
          (sum, s) => sum + (s.summary.newBalance / s.summary.creditLimit) * 100,
          0
        ) / allUserStatements.length;

      userAverage = {
        categoryBreakdown: avgCategoryBreakdown,
        avgUtilization,
      };
    }

    // Calculate category breakdown for current statement
    const categoryBreakdown = calculateCategoryBreakdown(statement.transactions);

    // Generate recommendations
    const recommendations = generateRecommendations(
      statement.summary,
      statement.transactions,
      categoryBreakdown,
      userAverage
    );

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to generate recommendations',
      },
      { status: 500 }
    );
  }
}

