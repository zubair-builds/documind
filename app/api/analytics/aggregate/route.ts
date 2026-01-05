import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Statement from '@/models/Statement';
import {
  calculateCategoryBreakdown,
  calculateTopMerchants,
  parseStatementMonth,
} from '@/lib/analytics';
import type { MonthlyData, CategorySpending } from '@/types/analytics';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/aggregate
 * Get aggregate analytics across all user statements
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user session
    // Get authenticated user session
    let session = await getServerSession(authOptions);
    let user;

    if (session?.user?.id) {
      user = session.user;
    } else {
      // Fallback: Check for Bearer token
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const { verifyToken } = await import('@/lib/jwt');
        const decoded = verifyToken(token);
        if (decoded) {
          user = { id: decoded.userId, email: decoded.email, name: decoded.name };
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

    // Connect to database
    await connectDB();

    // Get all user's statements sorted by due date ascending (earliest first)
    const statements = await Statement.find({ userId })
      .sort({ 'summary.dueDate': 1 })
      .lean();

    if (statements.length === 0) {
      return NextResponse.json(
        { error: 'No statements found. Please analyze some PDFs first.' },
        { status: 404 }
      );
    }

    // Aggregate data
    let totalSpending = 0;
    let totalCredits = 0;
    let totalTransactions = 0;
    const allTransactions: any[] = [];
    const monthlyData: MonthlyData[] = [];

    // Process each statement
    statements.forEach((statement) => {
      const debits = statement.transactions.filter((t) => t.type === 'DEBIT');
      const credits = statement.transactions.filter((t) => t.type === 'CREDIT');

      const monthSpending = debits.reduce((sum, t) => sum + t.amount, 0);
      const monthCredits = credits.reduce((sum, t) => sum + t.amount, 0);

      totalSpending += monthSpending;
      totalCredits += monthCredits;
      totalTransactions += statement.transactions.length;
      allTransactions.push(...statement.transactions);

      const { month, year, timestamp } = parseStatementMonth(statement.summary.statementDate);
      const categoryBreakdown = calculateCategoryBreakdown(statement.transactions);

      monthlyData.push({
        month,
        year,
        timestamp,
        totalSpending: monthSpending,
        totalCredits: monthCredits,
        categoryBreakdown,
        creditUtilization:
          (statement.summary.newBalance / statement.summary.creditLimit) * 100,
        newBalance: statement.summary.newBalance,
        minimumPayment: statement.summary.minimumPayment,
        dueDate: statement.summary.dueDate,
      });
    });

    monthlyData.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate overall category breakdown
    const overallCategoryBreakdown = calculateCategoryBreakdown(allTransactions);

    // Get top merchants all time
    const topMerchantsAllTime = calculateTopMerchants(allTransactions, 20);

    // Find most used category
    const mostUsedCategory = overallCategoryBreakdown[0]?.category || 'Unknown';

    // Calculate average monthly spending
    const averageMonthlySpending =
      statements.length > 0 ? totalSpending / statements.length : 0;

    return NextResponse.json({
      success: true,
      analytics: {
        summary: {
          totalStatements: statements.length,
          totalSpending,
          totalCredits,
          averageMonthlySpending,
          totalTransactions,
          mostUsedCategory,
        },
        monthlyTrends: monthlyData,
        overallCategoryBreakdown,
        topMerchantsAllTime,
      },
    });
  } catch (error: any) {
    console.error('Error fetching aggregate analytics:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch aggregate analytics',
      },
      { status: 500 }
    );
  }
}

