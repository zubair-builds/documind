'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

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
}

export default function HistoryPage() {
  const { data: session } = useSession();
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchPdfs();
  }, [page]);

  const fetchPdfs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pdfs?page=${page}&limit=10`);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
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
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Filename
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Pages
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Size
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Analysis
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pdfs.map((pdf) => (
                      <tr
                        key={pdf.id}
                        className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                          pdf.documentType === 'statement'
                            ? 'bg-blue-50/30 dark:bg-blue-900/10 border-l-4 border-l-blue-500'
                            : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                          <div className="flex items-center gap-2">
                            {pdf.originalFilename}
                            {pdf.documentType === 'statement' && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full"
                                title="AI Analysis Completed"
                              >
                                <svg
                                  className="w-3 h-3"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                AI
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {pdf.pageCount} ({pdf.extractedPages} extracted)
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {formatFileSize(pdf.fileSize)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded-full ${
                              pdf.unlockStatus === 'success'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {pdf.unlockStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {pdf.documentType === 'statement' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 font-medium">
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
                              Analyzed
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-600">
                              Not analyzed
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(pdf.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/history/${pdf.id}`}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                          >
                            View Details
                          </Link>
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

