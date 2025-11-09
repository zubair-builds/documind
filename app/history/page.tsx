'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/formatters';
import { formatAnalysisTime } from '@/lib/analysisStats';
import { useRouter } from 'next/navigation';

interface PdfDocument {
  id: string;
  filename: string;
  originalFilename: string;
  pageCount: number;
  extractedPages: number;
  unlockStatus: string;
  documentType?: string;
  fileSize: number;
  createdAt: string;
  statementDate?: string | null;
  newBalance?: number | null;
  analysisTime?: number | null;
}

export default function HistoryPage() {
  const { data: session } = useSession();
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<
    'createdAt'
    | 'newBalance'
    | 'fileSize'
    | 'analysisTime'
    | 'statementDate'
  >('statementDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchPdfs();
  }, [page, sortBy, sortOrder]);

  const fetchPdfs = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/pdfs/with-statements?page=${page}&limit=10&sortBy=${sortBy}&sortOrder=${sortOrder}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch PDFs');
      }

      setPdfs(data.pdfs);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to load PDF history');
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (
    newSortBy:
      | 'createdAt'
      | 'newBalance'
      | 'fileSize'
      | 'analysisTime'
      | 'statementDate'
  ) => {
    setSortBy(newSortBy);
    setPage(1); // Reset to first page when sorting changes
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const router = useRouter();
  const handleRowClick = (pdfId: string) => {
    router.push(`/history/${pdfId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              PDF History
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              View all your processed PDFs
            </p>
          </div>

          {session && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium text-gray-900 dark:text-white">
                  {session.user.name}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href="/"
                  className="px-4 py-2 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600"
                >
                  Upload PDF
                </Link>
                <Link
                  href="/analytics"
                  className="px-4 py-2 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600"
                >
                  Analytics
                </Link>
                <Link
                  href="/passwords"
                  className="px-4 py-2 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600"
                >
                  Passwords
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Loading PDFs...
              </p>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : pdfs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No PDFs processed yet
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Upload Your First PDF
              </Link>
            </div>
          ) : (
            <>
              {/* Sort Options */}
              <div className="flex justify-end items-center mb-4">
                <label
                  htmlFor="sort-by"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2"
                >
                  Sort by:
                </label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) =>
                    handleSortChange(
                      e.target.value as
                        | 'createdAt'
                        | 'newBalance'
                        | 'fileSize'
                        | 'analysisTime'
                        | 'statementDate'
                    )
                  }
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="statementDate">Statement Date</option>
                  <option value="newBalance">Bill Amount</option>
                  <option value="fileSize">File Size</option>
                  <option value="analysisTime">Analysis Time</option>
                  <option value="createdAt">Upload Date</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="ml-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Statement Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Bill amount
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Size
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Analysis Time
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Upload Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pdfs.map((pdf) => (
                      <tr
                        key={pdf.id}
                        onClick={() => handleRowClick(pdf.id)}
                        className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${pdf.documentType === 'statement'
                            ? 'bg-blue-50/30 dark:bg-blue-900/10 border-l-4 border-l-blue-500'
                            : ''
                          }`}
                      >
                        <td className="py-3 px-4 text-sm">
                          {pdf.statementDate ? (
                            <span className="font-semibold">
                              {new Date(pdf.statementDate).toLocaleString('default', { month: 'short', year: 'numeric' })}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600">
                              —
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {pdf.newBalance ? (
                            <span className="font-semibold">
                              {formatCurrency(pdf.newBalance)}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600">
                              —
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {formatFileSize(pdf.fileSize)}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {pdf.analysisTime ? (
                            <span className="font-semibold">
                              {formatAnalysisTime(pdf.analysisTime)}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600">
                              —
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(pdf.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-300 dark:border-gray-600"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-300 dark:border-gray-600"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

