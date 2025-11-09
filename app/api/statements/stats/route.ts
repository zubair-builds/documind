import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Statement from '@/models/Statement';

export const dynamic = 'force-dynamic';

/**
 * GET /api/statements/stats
 * Get aggregate analysis statistics for the user
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

    // Fetch all user's statements
    const statements = await Statement.find({ userId })
      .select('analysisMetadata createdAt')
      .sort({ createdAt: 1 })
      .lean();

    if (statements.length === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          totalAnalyses: 0,
          averageTime: 0,
          fastestTime: 0,
          slowestTime: 0,
          successRate: 100,
          successCount: 0,
          failureCount: 0,
          trendData: [],
        },
      });
    }

    // Calculate statistics
    const processingTimes = statements
      .filter((s) => s.analysisMetadata?.success)
      .map((s) => s.analysisMetadata.processingTime);

    const totalAnalyses = statements.length;
    const successCount = statements.filter(
      (s) => s.analysisMetadata?.success
    ).length;
    const failureCount = totalAnalyses - successCount;
    const successRate = (successCount / totalAnalyses) * 100;

    const averageTime =
      processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) /
          processingTimes.length
        : 0;

    const fastestTime =
      processingTimes.length > 0 ? Math.min(...processingTimes) : 0;
    const slowestTime =
      processingTimes.length > 0 ? Math.max(...processingTimes) : 0;

    // Generate trend data (group by date)
    const trendMap = new Map<string, { sum: number; count: number }>();

    statements.forEach((statement) => {
      if (statement.analysisMetadata?.success) {
        const dateKey = new Date(statement.createdAt)
          .toISOString()
          .split('T')[0];
        const existing = trendMap.get(dateKey) || { sum: 0, count: 0 };
        trendMap.set(dateKey, {
          sum: existing.sum + statement.analysisMetadata.processingTime,
          count: existing.count + 1,
        });
      }
    });

    const trendData = Array.from(trendMap.entries())
      .map(([date, data]) => ({
        date,
        averageTime: data.sum / data.count,
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      stats: {
        totalAnalyses,
        averageTime: Math.round(averageTime),
        fastestTime: Math.round(fastestTime),
        slowestTime: Math.round(slowestTime),
        successRate: Math.round(successRate * 10) / 10,
        successCount,
        failureCount,
        trendData,
      },
    });
  } catch (error: any) {
    console.error('Error fetching analysis stats:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch statistics',
      },
      { status: 500 }
    );
  }
}

