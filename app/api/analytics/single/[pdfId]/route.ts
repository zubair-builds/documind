import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Statement from '@/models/Statement';
import {
  calculateCategoryBreakdown,
  calculateTopMerchants,
  calculateDailySpending,
  calculateSingleStatementSummary,
} from '@/lib/analytics';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/single/[pdfId]
 * Get analytics data for a single statement
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { pdfId: string } }
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

    // Calculate analytics
    const categoryBreakdown = calculateCategoryBreakdown(statement.transactions);
    const topMerchants = calculateTopMerchants(statement.transactions, 10);
    const dailySpending = calculateDailySpending(statement.transactions);
    const summary = calculateSingleStatementSummary(
      statement.transactions,
      statement.summary.creditLimit,
      statement.summary.newBalance
    );

    return NextResponse.json({
      success: true,
      analytics: {
        summary,
        categoryBreakdown,
        dailySpending,
        topMerchants,
        statementInfo: {
          name: statement.summary.name,
          statementDate: statement.summary.statementDate,
          dueDate: statement.summary.dueDate,
          newBalance: statement.summary.newBalance,
          minimumPayment: statement.summary.minimumPayment,
          creditLimit: statement.summary.creditLimit,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch analytics',
      },
      { status: 500 }
    );
  }
}

