'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/formatters';
import { formatAnalysisTime } from '@/lib/analysisStats';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Calendar,
  MessageSquare,
  CheckCircle2,
  Loader2
} from 'lucide-react';

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
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [sortBy, setSortBy] = useState<
    'createdAt'
    | 'newBalance'
    | 'fileSize'
    | 'analysisTime'
    | 'statementDate'
  >('statementDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const router = useRouter();

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

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as any;
    if (val === 'asc' || val === 'desc') {
      setSortOrder(val);
    } else {
      setSortBy(val);
    }
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const handleRowClick = (pdfId: string) => {
    router.push(`/history/${pdfId}`);
  };

  const filteredPdfs = pdfs.filter(pdf => 
    pdf.originalFilename?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (pdf.statementDate && new Date(pdf.statementDate).toLocaleString('default', { month: 'short', year: 'numeric' }).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2 text-white">Analysis Vault</h2>
            <p className="text-slate-400">Review and manage your previously processed documents and insights.</p>
          </div>
          <div className="mt-6 md:mt-0 flex items-center space-x-3">
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search documents..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-sm rounded-xl pl-9 pr-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow placeholder:text-slate-500" 
              />
            </div>
            <div className="relative">
              <select 
                value={sortBy}
                onChange={handleSortChange}
                className="appearance-none bg-slate-900 border border-slate-700 hover:border-slate-600 text-sm px-4 py-2.5 pr-10 rounded-xl text-slate-200 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="statementDate">Sort by: Date</option>
                <option value="newBalance">Sort by: Amount</option>
                <option value="fileSize">Sort by: Size</option>
                <option value="analysisTime">Sort by: Analysis Time</option>
                <option value="createdAt">Sort by: Upload Date</option>
              </select>
              <Filter className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              <span className="text-slate-300 font-medium">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="text-center py-20 flex flex-col items-center justify-center space-y-4">
               <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
               <p className="text-slate-400">Loading Analysis Vault...</p>
            </div>
          ) : error ? (
            <div className="p-8">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          ) : pdfs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 mb-6">No PDFs have been processed yet.</p>
              <button
                onClick={() => router.push('/?view=upload')}
                className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors font-medium shadow-[0_0_15px_-3px_rgba(99,102,241,0.4)]"
              >
                Analyze Your First File
              </button>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-950/50 border-b border-slate-800/80 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-5">Statement Date</th>
                      <th className="px-6 py-5">Bill Amount</th>
                      <th className="px-6 py-5">Size</th>
                      <th className="px-6 py-5">Analysis Time</th>
                      <th className="px-6 py-5">Upload Date</th>
                      <th className="px-6 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredPdfs.map((pdf) => (
                      <tr 
                        key={pdf.id} 
                        className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => handleRowClick(pdf.id)}
                      >
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-colors">
                              <FileText className="w-4 h-4" />
                            </div>
                            <span className="font-medium text-slate-200">
                               {pdf.statementDate 
                                  ? new Date(pdf.statementDate).toLocaleString('default', { month: 'short', year: 'numeric' })
                                  : '—'
                               }
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className="font-semibold text-white tracking-wide">
                            {pdf.newBalance ? formatCurrency(pdf.newBalance) : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-slate-400 text-sm">
                          {formatFileSize(pdf.fileSize)}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          {pdf.analysisTime ? (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{formatAnalysisTime(pdf.analysisTime)}</span>
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-slate-400 text-sm">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>{formatDate(pdf.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleRowClick(pdf.id) }}
                              className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-all" 
                              title="View Document"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); /* handle download */ }}
                              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-all" 
                              title="Download Report"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); /* handle delete */ }}
                              className="p-2 text-slate-400 hover:text-pink-400 hover:bg-slate-800 rounded-lg transition-all" 
                              title="Delete permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPdfs.length === 0 && (
                   <div className="text-center py-12 text-slate-400">
                     No documents found matching your search.
                   </div>
                )}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-slate-950/30 border-t border-slate-800/80 px-6 py-4 flex items-center justify-between text-sm">
                  <p className="text-slate-400">
                    Showing Page <span className="font-medium text-slate-200">{page}</span> of <span className="font-medium text-slate-200">{totalPages}</span>
                  </p>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button 
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white border-indigo-500/30 transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-indigo-400"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
