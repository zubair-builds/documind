import { format, parseISO } from 'date-fns';
import type {
  CategorySpending,
  MerchantSpending,
  DailySpending,
  BudgetRecommendation,
  SingleStatementAnalytics,
} from '@/types/analytics';
import type { Transaction } from '@/types';

// Category color mapping
const CATEGORY_COLORS: { [key: string]: string } = {
  Dining: '#ef4444',
  Shopping: '#f59e0b',
  Groceries: '#10b981',
  Travel: '#3b82f6',
  Utilities: '#8b5cf6',
  Entertainment: '#ec4899',
  Payment: '#22c55e',
  Fees: '#dc2626',
  Other: '#6b7280',
};

/**
 * Calculate spending by category
 */
export function calculateCategoryBreakdown(
  transactions: Transaction[]
): CategorySpending[] {
  const categoryMap = new Map<string, { amount: number; count: number }>();

  // Only count DEBIT transactions for spending
  const debitTransactions = transactions.filter((t) => t.type === 'DEBIT');
  const totalDebitAmount = debitTransactions.reduce((sum, t) => sum + t.amount, 0);

  debitTransactions.forEach((transaction) => {
    const existing = categoryMap.get(transaction.category) || {
      amount: 0,
      count: 0,
    };
    categoryMap.set(transaction.category, {
      amount: existing.amount + transaction.amount,
      count: existing.count + 1,
    });
  });

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalDebitAmount > 0 ? (data.amount / totalDebitAmount) * 100 : 0,
      transactionCount: data.count,
      color: CATEGORY_COLORS[category] || CATEGORY_COLORS.Other,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Get top merchants by spending
 */
export function calculateTopMerchants(
  transactions: Transaction[],
  limit: number = 10
): MerchantSpending[] {
  const merchantMap = new Map<string, { amount: number; count: number }>();

  // Only count DEBIT transactions
  transactions
    .filter((t) => t.type === 'DEBIT')
    .forEach((transaction) => {
      const merchant = `${transaction.description} (${transaction.category || '-'})`;
      const existing = merchantMap.get(merchant) || { amount: 0, count: 0 };
      merchantMap.set(merchant, {
        amount: existing.amount + transaction.amount,
        count: existing.count + 1,
      });
    });

  return Array.from(merchantMap.entries())
    .map(([merchant, data]) => ({
      merchant,
      amount: data.amount,
      transactionCount: data.count,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

/**
 * Calculate daily spending
 */
export function calculateDailySpending(
  transactions: Transaction[]
): DailySpending[] {
  const dailyMap = new Map<string, { debit: number; credit: number }>();

  transactions.forEach((transaction) => {
    const existing = dailyMap.get(transaction.date) || {
      debit: 0,
      credit: 0,
    };
    if (transaction.type === 'DEBIT') {
      existing.debit += transaction.amount;
    } else {
      existing.credit += transaction.amount;
    }
    dailyMap.set(transaction.date, existing);
  });

  return Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      debitAmount: data.debit,
      creditAmount: data.credit,
      netAmount: data.debit - data.credit,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generate budget recommendations for a single statement
 */
export function generateRecommendations(
  summary: {
    name: string;
    newBalance: number;
    minimumPayment: number;
    creditLimit: number;
  },
  transactions: Transaction[],
  categoryBreakdown: CategorySpending[],
  userAverage?: { categoryBreakdown: CategorySpending[]; avgUtilization: number }
): BudgetRecommendation[] {
  const recommendations: BudgetRecommendation[] = [];

  // Calculate credit utilization
  const utilizationRatio = (summary.newBalance / summary.creditLimit) * 100;

  // Credit Utilization Recommendations
  if (utilizationRatio > 70) {
    const targetBalance = summary.creditLimit * 0.3;
    const paymentNeeded = summary.newBalance - targetBalance;
    recommendations.push({
      type: 'utilization',
      priority: 'high',
      title: 'High Credit Utilization',
      message: `Your credit utilization is ${utilizationRatio.toFixed(1)}%, which may negatively impact your credit score.`,
      actionable: `Consider paying down Rs ${paymentNeeded.toFixed(0)} to reach the recommended 30% utilization.`,
      impact: 'Improving credit utilization can increase your credit score by 20-50 points.',
    });
  } else if (utilizationRatio > 30) {
    recommendations.push({
      type: 'utilization',
      priority: 'medium',
      title: 'Moderate Credit Utilization',
      message: `Your credit utilization is ${utilizationRatio.toFixed(1)}%. Aim for under 30% for optimal credit health.`,
      actionable: `Pay down Rs ${(summary.newBalance - summary.creditLimit * 0.3).toFixed(0)} to reach 30%.`,
      impact: 'Lower utilization improves creditworthiness.',
    });
  } else {
    recommendations.push({
      type: 'positive',
      priority: 'low',
      title: 'Excellent Credit Utilization',
      message: `Your credit utilization is ${utilizationRatio.toFixed(1)}%, well within the healthy range!`,
      actionable: 'Keep maintaining this low utilization to build strong credit.',
      impact: 'Your responsible credit usage is helping your credit score.',
    });
  }

  // Category Spending Recommendations
  categoryBreakdown.forEach((cat) => {
    if (cat.percentage > 40) {
      const targetAmount = cat.amount * 0.7; // Suggest 30% reduction
      const savings = cat.amount - targetAmount;
      recommendations.push({
        type: 'category',
        priority: 'high',
        title: `High ${cat.category} Spending`,
        message: `${cat.category} accounts for ${cat.percentage.toFixed(1)}% of your spending (Rs ${cat.amount.toFixed(0)}).`,
        actionable: `Consider reducing ${cat.category} expenses by 30% to save ~Rs ${savings.toFixed(0)}/month.`,
        impact: `This would lower your ${cat.category} budget to Rs ${targetAmount.toFixed(0)}.`,
      });
    }
  });

  // Compare to user average if available
  if (userAverage && userAverage.categoryBreakdown.length > 0) {
    categoryBreakdown.forEach((current) => {
      const avg = userAverage.categoryBreakdown.find(
        (c) => c.category === current.category
      );
      if (avg && current.amount > avg.amount * 1.5) {
        // 50% increase
        const increase = ((current.amount - avg.amount) / avg.amount) * 100;
        recommendations.push({
          type: 'spending',
          priority: 'medium',
          title: `Unusual ${current.category} Spending`,
          message: `Your ${current.category} spending is ${increase.toFixed(0)}% higher than your average.`,
          actionable: `Review recent ${current.category} transactions to identify any unusual purchases.`,
          impact: `Returning to average would save Rs ${(current.amount - avg.amount).toFixed(0)}.`,
        });
      }
    });
  }

  // Payment Efficiency
  const totalDebits = transactions
    .filter((t) => t.type === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalCredits = transactions
    .filter((t) => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0);

  if (totalCredits > summary.minimumPayment * 2) {
    recommendations.push({
      type: 'positive',
      priority: 'low',
      title: 'Great Payment Behavior!',
      message: `You paid Rs ${totalCredits.toFixed(0)}, which is ${(totalCredits / summary.minimumPayment).toFixed(1)}x the minimum payment.`,
      actionable: 'Continue making above-minimum payments to reduce interest charges.',
      impact: 'Paying more than the minimum saves on interest and reduces debt faster.',
    });
  } else if (totalCredits <= summary.minimumPayment) {
    recommendations.push({
      type: 'utilization',
      priority: 'high',
      title: 'Minimum Payment Only',
      message: 'You are only paying the minimum payment, which maximizes interest charges.',
      actionable: `Try to pay at least Rs ${(summary.minimumPayment * 2).toFixed(0)} to reduce your balance faster.`,
      impact: 'Paying only the minimum can take years to pay off and cost thousands in interest.',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );
}

/**
 * Calculate summary statistics for single statement
 */
export function calculateSingleStatementSummary(
  transactions: Transaction[],
  creditLimit: number,
  newBalance: number
) {
  const debits = transactions.filter((t) => t.type === 'DEBIT');
  const credits = transactions.filter((t) => t.type === 'CREDIT');

  const totalSpending = debits.reduce((sum, t) => sum + t.amount, 0);
  const totalCredits = credits.reduce((sum, t) => sum + t.amount, 0);
  const netSpending = totalSpending - totalCredits;

  const categories = new Set(transactions.map((t) => t.category));
  const avgTransaction = transactions.length > 0 ? totalSpending / debits.length : 0;
  const creditUtilization = (newBalance / creditLimit) * 100;

  return {
    totalSpending,
    totalCredits,
    netSpending,
    averageTransaction: avgTransaction,
    categoryCount: categories.size,
    transactionCount: transactions.length,
    creditUtilization,
  };
}

/**
 * Parse month from statement date
 */
export function parseStatementMonth(statementDate: string): { month: string; year: number; timestamp: number } {
  try {
    // Try to parse common date formats
    const date = new Date(statementDate);
    if (!isNaN(date.getTime())) {
      return {
        month: format(date, 'MMM yyyy'),
        year: date.getFullYear(),
        timestamp: date.getTime(),
      };
    }
  } catch (e) {
    console.error('Error parsing date:', e);
  }

  // Fallback to current date
  const now = new Date();
  return {
    month: format(now, 'MMM yyyy'),
    year: now.getFullYear(),
    timestamp: now.getTime(),
  };
}

