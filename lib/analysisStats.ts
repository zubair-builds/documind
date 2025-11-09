/**
 * Calculate average processing time from statements
 */
export function calculateAverageTime(
  statements: Array<{ analysisMetadata?: { processingTime: number; success: boolean } }>
): number {
  const successfulStatements = statements.filter(
    (s) => s.analysisMetadata?.success
  );

  if (successfulStatements.length === 0) return 0;

  const sum = successfulStatements.reduce(
    (total, s) => total + (s.analysisMetadata?.processingTime || 0),
    0
  );

  return Math.round(sum / successfulStatements.length);
}

/**
 * Get fastest and slowest analysis times
 */
export function getFastestSlowest(
  statements: Array<{ analysisMetadata?: { processingTime: number; success: boolean } }>
): { fastest: number; slowest: number } {
  const successfulTimes = statements
    .filter((s) => s.analysisMetadata?.success)
    .map((s) => s.analysisMetadata?.processingTime || 0);

  if (successfulTimes.length === 0) {
    return { fastest: 0, slowest: 0 };
  }

  return {
    fastest: Math.min(...successfulTimes),
    slowest: Math.max(...successfulTimes),
  };
}

/**
 * Calculate success rate percentage
 */
export function getSuccessRate(
  statements: Array<{ analysisMetadata?: { success: boolean } }>
): { rate: number; successCount: number; failureCount: number } {
  const total = statements.length;

  if (total === 0) {
    return { rate: 100, successCount: 0, failureCount: 0 };
  }

  const successCount = statements.filter(
    (s) => s.analysisMetadata?.success
  ).length;
  const failureCount = total - successCount;
  const rate = (successCount / total) * 100;

  return {
    rate: Math.round(rate * 10) / 10,
    successCount,
    failureCount,
  };
}

/**
 * Format trend data for charts (group by date)
 */
export function getTrendData(
  statements: Array<{
    analysisMetadata?: { processingTime: number; success: boolean };
    createdAt: Date | string;
  }>
): Array<{ date: string; averageTime: number; count: number }> {
  const trendMap = new Map<string, { sum: number; count: number }>();

  statements.forEach((statement) => {
    if (statement.analysisMetadata?.success) {
      const date =
        typeof statement.createdAt === 'string'
          ? statement.createdAt
          : statement.createdAt.toISOString();
      const dateKey = date.split('T')[0];

      const existing = trendMap.get(dateKey) || { sum: 0, count: 0 };
      trendMap.set(dateKey, {
        sum: existing.sum + (statement.analysisMetadata.processingTime || 0),
        count: existing.count + 1,
      });
    }
  });

  return Array.from(trendMap.entries())
    .map(([date, data]) => ({
      date,
      averageTime: Math.round(data.sum / data.count),
      count: data.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Format milliseconds to readable time format
 */
export function formatAnalysisTime(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  }

  const seconds = Math.floor(milliseconds / 1000);

  if (seconds < 60) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Get current stage based on elapsed time
 */
export function getCurrentStage(
  elapsedMs: number,
  averageMs: number
): {
  stage: 'connecting' | 'analyzing' | 'saving';
  label: string;
  percentage: number;
} {
  // Stage 1: First 2 seconds - Connecting
  if (elapsedMs < 2000) {
    return {
      stage: 'connecting',
      label: 'Connecting to AI...',
      percentage: Math.min((elapsedMs / 2000) * 10, 10),
    };
  }

  // Use average time for estimation (default to 20s if no average)
  const estimatedTotal = averageMs > 0 ? averageMs : 20000;

  // Stage 3: Last 1 second before estimated completion - Saving
  if (elapsedMs >= estimatedTotal - 1000) {
    const savingProgress = Math.min(
      ((elapsedMs - (estimatedTotal - 1000)) / 1000) * 10,
      10
    );
    return {
      stage: 'saving',
      label: 'Saving Results...',
      percentage: 90 + savingProgress,
    };
  }

  // Stage 2: Middle stage - Analyzing
  const analyzingDuration = estimatedTotal - 3000; // 2s connecting + 1s saving
  const analyzingElapsed = elapsedMs - 2000;
  const analyzingProgress = Math.min(
    (analyzingElapsed / analyzingDuration) * 80,
    80
  );

  return {
    stage: 'analyzing',
    label: 'Analyzing Document...',
    percentage: 10 + analyzingProgress,
  };
}

