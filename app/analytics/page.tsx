'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type {
  CategorySpending,
  MerchantSpending,
  DailySpending,
  MonthlyData,
  BudgetRecommendation,
} from '@/types/analytics';
import { formatAnalysisTime } from '@/lib/analysisStats';
import { formatCurrency } from '@/lib/formatters';

interface PdfOption {
  id: string;
  statementDate: string;
  filename: string;
}

export default function AnalyticsPage() {
  const [viewMode, setViewMode] = useState<'single' | 'aggregate' | 'analysis'>('aggregate');
  const [selectedPdfId, setSelectedPdfId] = useState<string>('');
  const [pdfOptions, setPdfOptions] = useState<PdfOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Single statement data
  const [singleAnalytics, setSingleAnalytics] = useState<any>(null);
  const [singleRecommendations, setSingleRecommendations] = useState<
    BudgetRecommendation[]
  >([]);

  // Aggregate data
  const [aggregateAnalytics, setAggregateAnalytics] = useState<any>(null);

  // Analysis statistics
  const [analysisStats, setAnalysisStats] = useState<any>(null);

  useEffect(() => {
    fetchPdfOptions();
  }, []);

  useEffect(() => {
    if (viewMode === 'aggregate') {
      fetchAggregateAnalytics();
    } else if (viewMode === 'analysis') {
      fetchAnalysisStats();
    } else if (selectedPdfId) {
      fetchSingleAnalytics(selectedPdfId);
    }
  }, [viewMode, selectedPdfId]);

  const fetchAnalysisStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/statements/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch analysis statistics');
      }
      const data = await response.json();
      setAnalysisStats(data.stats);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchPdfOptions = async () => {
    try {
      // Fetch PDFs with statements, sorted by due date ascending
      const response = await fetch('/api/pdfs/with-statements?limit=100&sortBy=dueDate&sortOrder=asc');
      const data = await response.json();
      if (data.success && data.pdfs) {
        // Filter only analyzed statements (those with documentType='statement')
        const analyzed = data.pdfs.filter((pdf: any) => pdf.documentType === 'statement');
        setPdfOptions(analyzed);
        if (analyzed.length > 0 && !selectedPdfId) {
          setSelectedPdfId(analyzed[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching PDF options:', err);
    }
  };

  const fetchSingleAnalytics = async (pdfId: string) => {
    setLoading(true);
    setError('');
    try {
      const [analyticsRes, recommendationsRes] = await Promise.all([
        fetch(`/api/analytics/single/${pdfId}`),
        fetch(`/api/analytics/recommendations/${pdfId}`),
      ]);

      if (!analyticsRes.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const analyticsData = await analyticsRes.json();
      setSingleAnalytics(analyticsData.analytics);

      if (recommendationsRes.ok) {
        const recommendationsData = await recommendationsRes.json();
        setSingleRecommendations(recommendationsData.recommendations || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchAggregateAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/analytics/aggregate');
      if (!response.ok) {
        throw new Error('Failed to fetch aggregate analytics');
      }
      const data = await response.json();
      setAggregateAnalytics(data.analytics);
    } catch (err: any) {
      setError(err.message || 'Failed to load aggregate analytics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Financial Analytics
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Insights and recommendations from your statements
            </p>
          </div>
        </div>

        {/* View Mode Toggle and Statement Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('aggregate')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'aggregate'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow'
                  : 'text-gray-600 dark:text-gray-400'
                  }`}
              >
                All Statements
              </button>
              <button
                onClick={() => setViewMode('single')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'single'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow'
                  : 'text-gray-600 dark:text-gray-400'
                  }`}
              >
                Single Statement
              </button>
              <button
                onClick={() => setViewMode('analysis')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'analysis'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow'
                  : 'text-gray-600 dark:text-gray-400'
                  }`}
              >
                AI Analysis Stats
              </button>
            </div>

            {/* Statement Selector */}
            {viewMode === 'single' && (
              <select
                value={selectedPdfId}
                onChange={(e) => setSelectedPdfId(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                disabled={pdfOptions.length === 0}
              >
                {pdfOptions.length === 0 ? (
                  <option>No analyzed statements</option>
                ) : (
                  pdfOptions.map((pdf) => {
                    const d = new Date(pdf.statementDate);
                    const formattedDate = d.toLocaleString('default', { month: 'short', year: 'numeric' });
                    return (
                      <option key={pdf.id} value={pdf.id}>
                        {formattedDate}
                      </option>
                    )
                  })
                )}
              </select>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Loading analytics...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        ) : viewMode === 'single' && singleAnalytics ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Total Spending
                </p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(singleAnalytics.summary.totalSpending)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Total Credits
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(singleAnalytics.summary.totalCredits)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Avg Transaction
                </p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(singleAnalytics.summary.averageTransaction)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Credit Utilization
                </p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {singleAnalytics.summary.creditUtilization.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Category Breakdown Pie Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Spending by Category
              </h2>
              <div className="flex flex-col md:flex-row items-center justify-center">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={singleAnalytics.categoryBreakdown}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      fill="#8884d8"
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                    >
                      {singleAnalytics.categoryBreakdown.map((entry: CategorySpending, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#333', border: '1px solid #555', borderRadius: '5px' }}
                      labelStyle={{ color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 md:mt-0 md:ml-8">
                  {singleAnalytics.categoryBreakdown.map((cat: CategorySpending) => (
                    <div key={cat.category} className="flex items-center gap-3 mb-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: cat.color }}
                      ></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {cat.category}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {cat.transactionCount} transactions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(cat.amount)}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {cat.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Daily Spending Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Spending Timeline
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={singleAnalytics.dailySpending}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#333', border: '1px solid #555', borderRadius: '5px' }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="debitAmount" stroke="#ef4444" name="Debits" />
                  <Line type="monotone" dataKey="creditAmount" stroke="#22c55e" name="Credits" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Top Merchants */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Top Merchants
              </h2>
              <div className="space-y-3">
                {singleAnalytics.topMerchants.map((merchant: MerchantSpending, index: number) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {merchant.merchant}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {merchant.transactionCount} transactions
                      </p>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(merchant.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Budget Recommendations */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Budget Recommendations
              </h2>
              <div className="space-y-4">
                {singleRecommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`p-6 rounded-lg border-l-4 ${rec.priority === 'high'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                      : rec.priority === 'medium'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                        : 'bg-green-50 dark:bg-green-900/20 border-green-500'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {rec.title}
                      </h3>
                      <span
                        className={`px-3 py-1 text-xs rounded-full ${rec.priority === 'high'
                          ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                          : rec.priority === 'medium'
                            ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
                            : 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                          }`}
                      >
                        {rec.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {rec.message}
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      💡 {rec.actionable}
                    </p>
                    {rec.impact && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {rec.impact}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : viewMode === 'aggregate' && aggregateAnalytics ? (
          <>
            {/* Aggregate Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Total Statements
                </p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {aggregateAnalytics.summary.totalStatements}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Total Spending
                </p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(aggregateAnalytics.summary.totalSpending)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Avg Monthly Spending
                </p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(aggregateAnalytics.summary.averageMonthlySpending)}
                </p>
              </div>
            </div>

            {/* Monthly Trends Line Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Monthly Spending Trends
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={aggregateAnalytics.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dueDate"
                    tickFormatter={(date) => new Date(date).toLocaleDateString('default', { month: 'short', year: 'numeric' })}
                  />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value: number, name: string, props) => [formatCurrency(value), props.payload.month]} contentStyle={{ backgroundColor: 'black', color: 'white', borderRadius: '5px', padding: '5px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="totalSpending" stroke="#3b82f6" name="Total Spending" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Overall Category Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Overall Category Breakdown
              </h2>
              <div className="flex flex-col md:flex-row items-center justify-center">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={aggregateAnalytics.overallCategoryBreakdown}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      fill="#8884d8"
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                    >
                      {aggregateAnalytics.overallCategoryBreakdown.map((entry: CategorySpending, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#333', border: '1px solid #555', borderRadius: '5px' }}
                      labelStyle={{ color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 md:mt-0 md:ml-8">
                  {aggregateAnalytics.overallCategoryBreakdown.map((cat: CategorySpending) => (
                    <div key={cat.category} className="flex items-center gap-3 mb-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: cat.color }}
                      ></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {cat.category}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {cat.transactionCount} transactions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(cat.amount)}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {cat.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Merchants All Time */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Top Merchants (All Time)
              </h2>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={aggregateAnalytics.topMerchantsAllTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="merchant" angle={-45} textAnchor="end" height={220} />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} width={150} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#333', border: '1px solid #555', borderRadius: '5px' }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : viewMode === 'analysis' && analysisStats ? (
          <>
            {/* Analysis Statistics View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Total Analyses Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Total Analyses
                  </h3>
                  <div className="text-3xl">📊</div>
                </div>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {analysisStats.totalAnalyses}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Statements analyzed
                </p>
              </div>

              {/* Average Time Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Average Time
                  </h3>
                  <div className="text-3xl">⏱️</div>
                </div>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatAnalysisTime(analysisStats.averageTime)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Per analysis
                </p>
              </div>

              {/* Fastest Analysis Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Fastest
                  </h3>
                  <div className="text-3xl">⚡</div>
                </div>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {formatAnalysisTime(analysisStats.fastestTime)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Best time
                </p>
              </div>

              {/* Slowest Analysis Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Slowest
                  </h3>
                  <div className="text-3xl">🐌</div>
                </div>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {formatAnalysisTime(analysisStats.slowestTime)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Longest time
                </p>
              </div>
            </div>

            {/* Success Rate Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Success Rate
              </h3>
              <div className="flex items-center gap-8">
                <div className="flex-1">
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200 dark:text-green-400 dark:bg-green-900/30">
                          Success Rate
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-semibold inline-block text-green-600 dark:text-green-400">
                          {analysisStats.successRate}%
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                      <div
                        style={{ width: `${analysisStats.successRate}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500 transition-all duration-500"
                      ></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {analysisStats.successCount}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Successful
                      </p>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {analysisStats.failureCount}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Failed
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Time Trend Chart */}
            {analysisStats.trendData && analysisStats.trendData.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Analysis Time Trend (Last 30 Days)
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={analysisStats.trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(1)}s`} />
                    <Tooltip formatter={(value: number) => formatAnalysisTime(value)} contentStyle={{ backgroundColor: 'black', color: 'white', borderRadius: '5px', padding: '5px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="averageTime" stroke="#3b82f6" name="Average Time" />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-4">
                  Shows average analysis time per day
                </p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mt-6 border border-blue-200 dark:border-blue-800">
              <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">
                💡 About Analysis Statistics
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-2">
                <li>• These metrics track the performance of AI-powered statement analysis</li>
                <li>• Analysis times depend on document complexity and AI service load</li>
                <li>• Success rate indicates how many analyses completed without errors</li>
                <li>• Trend chart helps identify if analysis times are improving over time</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                {viewMode === 'single'
                  ? 'Please select a statement to view analytics'
                  : viewMode === 'analysis'
                    ? 'No analysis statistics available yet. Analyze some statements to see statistics.'
                    : 'No analyzed statements found'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

