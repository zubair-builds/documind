'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AnalysisProgress from '@/components/AnalysisProgress';
import { formatCurrency } from '@/lib/formatters';
import { formatAnalysisTime } from '@/lib/analysisStats';

interface PdfDetail {
  id: string;
  filename: string;
  originalFilename: string;
  fileSize: number;
  pageCount: number;
  extractedText: string;
  extractedPages: number;
  unlockStatus: string;
  documentType: string;
  processingMetadata: {
    method: string;
    processingTime: number;
    errorMessage?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface StatementSummary {
  name: string;
  statementDate: string;
  dueDate: string;
  newBalance: number;
  minimumPayment: number;
  creditLimit: number;
}

interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  category: string;
}

interface StatementData {
  id: string;
  summary: StatementSummary;
  transactions: Transaction[];
  analysisMetadata: {
    analyzedAt: string;
    processingTime: number;
    success: boolean;
    errorMessage?: string;
  };
}

export default function PdfDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [pdf, setPdf] = useState<PdfDetail | null>(null);
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'statement'>('text');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [analysisStats, setAnalysisStats] = useState<{
    averageTime: number;
    totalAnalyses: number;
  } | null>(null);
  const [analysisTime, setAnalysisTime] = useState<number | null>(null);

  useEffect(() => {
    fetchPdfDetails();
    fetchStatementData();
    fetchAnalysisStats();
  }, []);

  const fetchAnalysisStats = async () => {
    try {
      const response = await fetch('/api/statements/stats');
      if (response.ok) {
        const data = await response.json();
        setAnalysisStats({
          averageTime: data.stats.averageTime,
          totalAnalyses: data.stats.totalAnalyses,
        });
      }
    } catch (err) {
      console.error('Error fetching analysis stats:', err);
    }
  };

  const handleCopyText = async () => {
    if (!pdf?.extractedText) return;

    try {
      await navigator.clipboard.writeText(pdf.extractedText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const fetchPdfDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pdfs/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch PDF details');
      }

      setPdf(data.pdf);
    } catch (err: any) {
      setError(err.message || 'Failed to load PDF details');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatementData = async () => {
    try {
      const response = await fetch(`/api/statements/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setStatement(data.statement);
      }
    } catch (err) {
      // Statement doesn't exist yet, that's okay
      console.log('No statement data found');
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');
    setAnalysisTime(null);

    try {
      const response = await fetch('/api/statements/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pdfId: params.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze statement');
      }

      setStatement(data.statement);
      setAnalysisTime(data.processingTime);
      setActiveTab('statement');
      
      // Refresh PDF data to get updated documentType
      await fetchPdfDetails();
      // Refresh stats
      await fetchAnalysisStats();
    } catch (err: any) {
      setError(err.message || 'Failed to analyze statement');
    } finally {
      setAnalyzing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const formatProcessingTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div>
            <Link
              href="/history"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm mb-2 inline-block"
            >
              ← Back to History
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              PDF Details
            </h1>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Loading PDF details...
              </p>
            </div>
          </div>
        ) : error && !pdf ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        ) : pdf ? (
          <>
            {/* Metadata Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Metadata
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Filename
                  </p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {pdf.originalFilename}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    File Size
                  </p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {formatFileSize(pdf.fileSize)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Total Pages
                  </p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {pdf.pageCount}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Extracted Pages
                  </p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {pdf.extractedPages}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Status
                  </p>
                  <span
                    className={`inline-block px-3 py-1 text-sm rounded-full ${
                      pdf.unlockStatus === 'success'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {pdf.unlockStatus}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Processing Time
                  </p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {formatProcessingTime(pdf.processingMetadata.processingTime)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Created At
                  </p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {formatDate(pdf.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Document Type
                  </p>
                  <span
                    className={`inline-block px-3 py-1 text-sm rounded-full ${
                      pdf.documentType === 'statement'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}
                  >
                    {pdf.documentType}
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-t-lg shadow-xl">
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab('text')}
                  className={`px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === 'text'
                      ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Raw Text
                </button>
                <button
                  onClick={() => setActiveTab('statement')}
                  className={`px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === 'statement'
                      ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Statement Analysis
                  {statement && (
                    <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                  )}
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow-xl p-8">
              {/* Raw Text Tab */}
              {activeTab === 'text' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Extracted Text
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Showing text from pages 1-{pdf.extractedPages} of{' '}
                        {pdf.pageCount}
                      </p>
                    </div>
                    {pdf.extractedText && (
                      <button
                        onClick={handleCopyText}
                        className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        {copySuccess ? (
                          <>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                            Copy Text
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
                      {pdf.extractedText || 'No text extracted'}
                    </pre>
                  </div>
                </div>
              )}

              {/* Statement Analysis Tab */}
              {activeTab === 'statement' && (
                <div>
                  {!statement && !analyzing && (
                    <div className="text-center py-12">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        AI Statement Analysis
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Use Google Gemini AI to extract structured data from this credit card statement
                      </p>
                      {analysisStats && analysisStats.totalAnalyses > 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                          ⏱️ Usually takes ~{formatAnalysisTime(analysisStats.averageTime)}
                          {' '}({analysisStats.totalAnalyses} analyses completed)
                        </p>
                      )}
                      <button
                        onClick={handleAnalyze}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl"
                      >
                        <span className="flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Analyze with AI
                        </span>
                      </button>
                    </div>
                  )}

                  {analyzing && (
                    <div className="py-12 px-8">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
                        Analyzing Statement...
                      </h3>
                      <AnalysisProgress
                        averageTime={analysisStats?.averageTime || 20000}
                      />
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  {statement && (
                    <div className="space-y-6">
                      {/* Analysis Success Message */}
                      {analysisTime && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <p className="text-sm text-green-800 dark:text-green-400">
                            ✅ Analysis completed successfully in {formatAnalysisTime(analysisTime)}
                          </p>
                        </div>
                      )}

                      {/* Summary Card */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-lg p-6 border border-blue-200 dark:border-gray-600">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                          Statement Summary
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              Cardholder Name
                            </p>
                            <p className="text-gray-900 dark:text-white font-semibold">
                              {statement.summary.name}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              Statement Date
                            </p>
                            <p className="text-gray-900 dark:text-white font-semibold">
                              {statement.summary.statementDate}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              Due Date
                            </p>
                            <p className="text-gray-900 dark:text-white font-semibold">
                              {statement.summary.dueDate}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              Bill amount
                            </p>
                            <p className="text-lg text-red-600 dark:text-red-400 font-bold">
                              {formatCurrency(statement.summary.newBalance)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              Minimum Payment
                            </p>
                            <p className="text-gray-900 dark:text-white font-semibold">
                              {formatCurrency(statement.summary.minimumPayment)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              Credit Limit
                            </p>
                            <p className="text-gray-900 dark:text-white font-semibold">
                              {formatCurrency(statement.summary.creditLimit)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Transactions Table */}
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            Transactions ({statement.transactions.length})
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Analysis time: {formatProcessingTime(statement.analysisMetadata.processingTime)}
                          </p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Date
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Description
                                </th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Amount
                                </th>
                                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Type
                                </th>
                                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Category
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {statement.transactions.map((transaction, index) => (
                                <tr
                                  key={index}
                                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                                    {transaction.date}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                                    {transaction.description}
                                  </td>
                                  <td
                                    className={`py-3 px-4 text-sm text-right font-semibold ${
                                      transaction.type === 'DEBIT'
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-green-600 dark:text-green-400'
                                    }`}
                                  >
                                    {transaction.type === 'DEBIT' ? '-' : '+'}
                                    {formatCurrency(transaction.amount)}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span
                                      className={`inline-block px-2 py-1 text-xs rounded-full ${
                                        transaction.type === 'DEBIT'
                                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                      }`}
                                    >
                                      {transaction.type}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                      {transaction.category}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
