export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  color?: string;
}

export interface MerchantSpending {
  merchant: string;
  amount: number;
  transactionCount: number;
}

export interface DailySpending {
  date: string;
  debitAmount: number;
  creditAmount: number;
  netAmount: number;
}

export interface MonthlyData {
  month: string;
  year: number;
  totalSpending: number;
  totalCredits: number;
  categoryBreakdown: CategorySpending[];
  creditUtilization: number;
  newBalance: number;
  minimumPayment: number;
}

export interface BudgetRecommendation {
  type: 'spending' | 'utilization' | 'category' | 'positive';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actionable: string;
  impact?: string;
}

export interface SingleStatementAnalytics {
  summary: {
    totalSpending: number;
    totalCredits: number;
    netSpending: number;
    averageTransaction: number;
    categoryCount: number;
    transactionCount: number;
    creditUtilization: number;
  };
  categoryBreakdown: CategorySpending[];
  dailySpending: DailySpending[];
  topMerchants: MerchantSpending[];
  recommendations: BudgetRecommendation[];
}

export interface AggregateAnalytics {
  summary: {
    totalStatements: number;
    totalSpending: number;
    totalCredits: number;
    averageMonthlySpending: number;
    totalTransactions: number;
    mostUsedCategory: string;
  };
  monthlyTrends: MonthlyData[];
  overallCategoryBreakdown: CategorySpending[];
  topMerchantsAllTime: MerchantSpending[];
  recommendations: BudgetRecommendation[];
}

