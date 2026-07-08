'use client';

import { useState, useRef, useEffect, DragEvent, ChangeEvent, FormEvent, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';
import { 
  ShieldCheck, 
  MessageSquare, 
  Zap, 
  UploadCloud, 
  Lock, 
  Unlock, 
  FileText, 
  ChevronRight,
  CheckCircle2,
  X,
  Database,
  Layers,
  Clock,
  ArrowLeft,
  TrendingUp,
  DollarSign,
  AlertCircle,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';

interface PreviewData {
  text: string;
  totalPages: number;
  extractedPages: number;
  downloadUrl: string;
  filename: string;
  pdfId: string;
  downloadId: string;
}

function PageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialView = searchParams.get('view') || 'landing';
  const [view, setView] = useState(initialView);
  const [activeDetailsTab, setActiveDetailsTab] = useState('chat');

  // Sync view when searchParams change (from Header)
  useEffect(() => {
    const v = searchParams.get('view');
    if (v) setView(v);
  }, [searchParams]);

  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [savedPasswords, setSavedPasswords] = useState<any[]>([]);
  const [selectedPasswordId, setSelectedPasswordId] = useState('');
  const [savePassword, setSavePassword] = useState(false);
  const [passwordLabel, setPasswordLabel] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch saved passwords on component mount
  useEffect(() => {
    fetchSavedPasswords();
  }, []);

  // Fetch passwords when a file is selected (in case user logged in after page load)
  useEffect(() => {
    if (file && savedPasswords.length === 0) {
      fetchSavedPasswords();
    }
  }, [file, savedPasswords.length]);

  const fetchSavedPasswords = async () => {
    try {
      const response = await fetch('/api/passwords');
      if (response.ok) {
        const data = await response.json();
        setSavedPasswords(data.passwords || []);
      }
    } catch (err) {
      console.error('Error fetching saved passwords:', err);
    }
  };

  const handlePasswordSelect = async (passwordId: string) => {
    if (!passwordId) {
      setSelectedPasswordId('');
      return;
    }

    try {
      const response = await fetch(`/api/passwords/${passwordId}/decrypt`);
      if (response.ok) {
        const data = await response.json();
        setPassword(data.password);
        setSelectedPasswordId(passwordId);
      }
    } catch (err) {
      console.error('Error decrypting password:', err);
      setError('Failed to load saved password');
    }
  };

  const handleSavePassword = async () => {
    if (!password || !passwordLabel.trim()) {
      return;
    }

    try {
      const response = await fetch('/api/passwords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          label: passwordLabel,
          password: password,
        }),
      });

      if (response.ok) {
        await fetchSavedPasswords();
        setSavePassword(false);
        setPasswordLabel('');
      }
    } catch (err) {
      console.error('Error saving password:', err);
    }
  };

  const handleCopyText = async () => {
    if (!previewData?.text) return;

    try {
      await navigator.clipboard.writeText(previewData.text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const droppedFile = files[0];
      const isValidFile = droppedFile.type === 'application/pdf' || 
                         droppedFile.type === 'text/csv' ||
                         droppedFile.name.endsWith('.pdf') ||
                         droppedFile.name.endsWith('.csv');
      if (isValidFile) {
        setFile(droppedFile);
        setError('');
      } else {
        setError('Please upload a PDF or CSV file');
      }
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      const isValidFile = selectedFile.type === 'application/pdf' || 
                         selectedFile.type === 'text/csv' ||
                         selectedFile.name.endsWith('.pdf') ||
                         selectedFile.name.endsWith('.csv');
      if (isValidFile) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please upload a PDF or CSV file');
      }
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a PDF or CSV file');
      return;
    }

    if (!password) {
      setError('Please enter the password');
      return;
    }

    setLoading(true);
    setError('');
    setPreviewData(null);
    setProgress(0);
    setElapsedTime(0);
    
    // Start timer
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    try {
      setProgressStage('Preparing upload...');
      setProgress(10);
      await new Promise(resolve => setTimeout(resolve, 200));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('password', password);

      setProgressStage('Uploading file...');
      setProgress(25);

      const response = await fetch('/api/unlock-pdf', {
        method: 'POST',
        body: formData,
      });

      setProgressStage('Unlocking PDF...');
      setProgress(50);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unlock PDF');
      }

      setProgressStage('Extracting text...');
      setProgress(75);

      const data = await response.json();

      setProgressStage('Saving to database...');
      setProgress(90);
      await new Promise(resolve => setTimeout(resolve, 300));

      setProgressStage('Complete!');
      setProgress(100);

      setPreviewData({
        text: data.text,
        totalPages: data.totalPages,
        extractedPages: data.extractedPages,
        downloadUrl: data.downloadUrl,
        filename: data.filename,
        pdfId: data.pdfId,
        downloadId: data.downloadId,
      });
      
      setView('chat'); // Automatically switch to chat view
    } catch (err: any) {
      setError(err.message || 'An error occurred while unlocking the PDF');
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!previewData) return;
    try {
      const response = await fetch(previewData.downloadUrl);
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = previewData.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to download PDF');
    }
  };

  const handleUploadAnother = () => {
    setFile(null);
    setPassword('');
    setError('');
    setPreviewData(null);
    setView('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <main>
      {view === 'landing' && (
        <div className="animate-in fade-in duration-500">
          {/* Hero Section */}
          <section className="relative overflow-hidden pt-20 pb-32">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[500px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none"></div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700 mb-8">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-medium text-slate-300">Gemini AI Powered Assistant</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
                Unlock PDFs. <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                  Converse with your Data.
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
                Stop scrolling through endless pages. Securely unlock password-protected PDF files 
                and let our intelligent AI instantly analyze, summarize, and answer any question 
                about your documents. 
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                <button 
                  onClick={() => {
                    setView('upload');
                    router.push('/?view=upload');
                  }}
                  className="w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-full bg-white text-slate-900 hover:bg-slate-100 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] flex items-center justify-center"
                >
                  Try it for Free <ChevronRight className="ml-2 w-5 h-5" />
                </button>
                <p className="text-sm text-slate-500 mt-4 sm:mt-0 sm:ml-4">Max 10MB.</p>
              </div>
            </div>
          </section>

          {/* Features/Marketing Section */}
          <section className="py-24 bg-slate-900/50 border-t border-slate-800/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold mb-4">How DocuMind Supercharges Your Workflow</h2>
                <p className="text-slate-400">The smartest way to interact with secure documents.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Lock className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Bank-Level Unlocking</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Upload your password-protected PDF. We securely unlock it in milliseconds. Passwords are never stored, ensuring your sensitive data remains entirely yours.
                  </p>
                </div>
                
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Instant AI Analysis</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Our generative AI immediately scans and comprehends your entire document. Say goodbye to Ctrl+F. Get summaries and extract key insights instantly.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-pink-500/50 transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-6 h-6 text-pink-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Chat with your PDF</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Ask questions in natural language. "What is the total revenue on page 4?" or "Summarize the legal risks." The AI responds intelligently based solely on your file.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {view === 'upload' && (
        <div className="max-w-3xl mx-auto px-4 py-20 animate-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-2">Unlock & Analyze Document</h2>
            <p className="text-slate-400">Upload your secure PDF to begin the AI conversation.</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            {/* Dropzone */}
            {!file ? (
              <div 
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer group ${
                  isDragging 
                    ? 'border-indigo-500 bg-indigo-500/10' 
                    : 'border-slate-700 hover:border-indigo-500 hover:bg-slate-800/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf,text/csv,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={loading}
                />
                <div className="w-16 h-16 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Click to upload or drag and drop</h3>
                <p className="text-sm text-slate-500">PDF or CSV files (max 10MB)</p>
              </div>
            ) : (
              <div className="border border-slate-700 bg-slate-800/50 rounded-2xl p-6 flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-indigo-500/20 rounded-lg">
                    <FileText className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-200">{file.name}</p>
                    <p className="text-sm text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="text-slate-400 hover:text-white p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Form Section */}
            <form onSubmit={handleSubmit} className={`transition-all duration-500 ${file ? 'opacity-100 h-auto' : 'opacity-50 pointer-events-none h-auto'}`}>
              <div className="space-y-5 mt-8">
                
                {savedPasswords.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Use Saved Password</label>
                    <select 
                      value={selectedPasswordId}
                      onChange={(e) => handlePasswordSelect(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                    >
                      <option value="">-- Select Saved Password --</option>
                      {savedPasswords.map((pwd) => (
                        <option key={pwd.id} value={pwd.id}>
                          {pwd.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">File Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter the password to unlock it"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {loading && (
                  <div className="space-y-3 mt-6">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300 font-medium">{progressStage}</span>
                      <span className="text-slate-400">{(elapsedTime / 1000).toFixed(1)}s</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-3 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <button 
                  disabled={!file || !password || loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl px-4 py-4 mt-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Unlocking & Analyzing...
                    </span>
                  ) : (
                    <>
                      <Unlock className="w-5 h-5" />
                      <span>Unlock & Prepare Chat</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Privacy Note */}
          <div className="mt-8 flex items-start space-x-3 text-sm text-slate-500 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <p>Your privacy is our priority. Files are processed securely in memory, and passwords are never logged. Documents are instantly deleted from our servers after your session ends.</p>
          </div>
        </div>
      )}

      {view === 'chat' && previewData && (
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col animate-in fade-in duration-500">
          
          {/* Header */}
          <button 
            onClick={() => setView('history')}
            className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center mb-6 transition-colors group w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-1 transition-transform" /> 
            Back to History
          </button>
          
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-3xl font-bold text-white">Document Intelligence</h2>
            <div className="flex space-x-3">
              <button 
                onClick={handleDownload}
                className="text-sm font-medium bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 px-4 py-2 rounded-xl transition-colors"
              >
                Download PDF
              </button>
              <button 
                onClick={handleUploadAnother}
                className="text-sm text-slate-300 hover:text-white px-4 py-2 bg-slate-800 rounded-xl transition-colors"
              >
                Upload New
              </button>
            </div>
          </div>

          {/* Premium Metadata Section */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-sm mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <Database className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-semibold text-white">Metadata</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-4">
              <div>
                <p className="text-sm text-slate-500 mb-1 font-medium">Filename</p>
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <p className="text-slate-200 font-medium truncate max-w-[150px]" title={previewData.filename}>
                    {previewData.filename}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1 font-medium">File Size</p>
                <p className="text-slate-200 font-medium">{file ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1 font-medium">Total Pages</p>
                <p className="text-slate-200 font-medium">{previewData.totalPages}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1 font-medium">Extracted Pages</p>
                <p className="text-slate-200 font-medium">{previewData.extractedPages}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1 font-medium">Status</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  success
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1 font-medium">Processing Time</p>
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-slate-200 font-medium">{elapsedTime > 0 ? (elapsedTime / 1000).toFixed(1) + 's' : 'N/A'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1 font-medium">Created At</p>
                <p className="text-slate-200 font-medium">{new Date().toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1 font-medium">Document Type</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Financial Statement
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-8 border-b border-slate-800/80 mb-8">
            <button 
              onClick={() => setActiveDetailsTab('chat')}
              className={`pb-4 text-sm font-medium transition-colors relative flex items-center ${activeDetailsTab === 'chat' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <SparklesIcon className={`w-4 h-4 mr-1.5 ${activeDetailsTab === 'chat' ? 'text-indigo-400' : 'text-slate-500'}`} />
              Smart Chat
              {activeDetailsTab === 'chat' && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-indigo-500 rounded-t-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span>}
            </button>
            <button 
              onClick={() => setActiveDetailsTab('analysis')}
              className={`pb-4 text-sm font-medium transition-colors relative flex items-center ${activeDetailsTab === 'analysis' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Statement Analysis
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-2"></span>
              {activeDetailsTab === 'analysis' && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></span>}
            </button>
            <button 
              onClick={() => setActiveDetailsTab('raw')}
              className={`pb-4 text-sm font-medium transition-colors relative ${activeDetailsTab === 'raw' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Raw Text
              {activeDetailsTab === 'raw' && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></span>}
            </button>
          </div>

          {/* Smart Chat Section */}
          {activeDetailsTab === 'chat' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
               <ChatInterface pdfId={previewData.pdfId} downloadId={previewData.downloadId} />
            </div>
          )}

          {/* Statement Analysis */}
          {activeDetailsTab === 'analysis' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden group shadow-xl">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                    <TrendingUp className="w-24 h-24 text-emerald-500 transform translate-x-4 -translate-y-4" />
                  </div>
                  <div className="flex items-center space-x-3 mb-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                    <p className="text-slate-400 font-medium">Total Inflows</p>
                  </div>
                  <h4 className="text-3xl font-bold text-white mb-2 relative z-10 tracking-tight">$24,500.00</h4>
                  <div className="flex items-center text-sm relative z-10">
                    <span className="text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" /> +12.5%
                    </span>
                    <span className="text-slate-500 ml-2">vs last period</span>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden group shadow-xl">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                    <DollarSign className="w-24 h-24 text-pink-500 transform translate-x-4 -translate-y-4" />
                  </div>
                  <div className="flex items-center space-x-3 mb-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20 shadow-[0_0_15px_-3px_rgba(236,72,153,0.3)]">
                      <DollarSign className="w-5 h-5 text-pink-400" />
                    </div>
                    <p className="text-slate-400 font-medium">Total Outflows</p>
                  </div>
                  <h4 className="text-3xl font-bold text-white mb-2 relative z-10 tracking-tight">$18,230.50</h4>
                  <div className="flex items-center text-sm relative z-10">
                    <span className="text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" /> -2.4%
                    </span>
                    <span className="text-slate-500 ml-2">vs last period</span>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden group shadow-xl">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                    <Database className="w-24 h-24 text-indigo-500 transform translate-x-4 -translate-y-4" />
                  </div>
                  <div className="flex items-center space-x-3 mb-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)]">
                      <Database className="w-5 h-5 text-indigo-400" />
                    </div>
                    <p className="text-slate-400 font-medium">Net Cash Flow</p>
                  </div>
                  <h4 className="text-3xl font-bold text-white mb-2 relative z-10 tracking-tight">$6,269.50</h4>
                  <div className="flex items-center text-sm relative z-10">
                    <span className="text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" /> +5.1%
                    </span>
                    <span className="text-slate-500 ml-2">vs last period</span>
                  </div>
                </div>
              </div>

              {/* Main Area */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Chart Area */}
                <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-lg text-white">Expense Breakdown</h3>
                    <div className="p-2 bg-slate-800/50 rounded-lg">
                      <PieChartIcon className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="flex-1 w-full min-h-[250px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Housing', value: 4500 },
                            { name: 'Food', value: 2100 },
                            { name: 'Transport', value: 1200 },
                            { name: 'Utilities', value: 800 },
                            { name: 'Other', value: 1500 },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {[
                            '#6366f1', // indigo-500
                            '#8b5cf6', // purple-500
                            '#ec4899', // pink-500
                            '#10b981', // emerald-500
                            '#f59e0b', // amber-500
                          ].map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '16px', color: '#f1f5f9', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                          itemStyle={{ color: '#f1f5f9', fontWeight: 500 }}
                          formatter={(value: number) => [`$${value}`, 'Amount']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col mt-2">
                      <span className="text-xs text-slate-500 font-medium">Top Category</span>
                      <span className="font-bold text-white">Housing</span>
                    </div>
                  </div>
                </div>

                {/* Anomalies Table */}
                <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-3xl overflow-hidden backdrop-blur-sm flex flex-col shadow-xl">
                  <div className="p-6 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center space-x-3">
                       <AlertCircle className="w-5 h-5 text-amber-400" />
                       <h3 className="font-semibold text-lg text-white">Identified Anomalies & Flags</h3>
                    </div>
                    <span className="bg-amber-500/10 text-amber-400 text-xs font-medium px-2.5 py-1 rounded-full border border-amber-500/20 shadow-[0_0_10px_-2px_rgba(245,158,11,0.2)]">
                      3 Action Items
                    </span>
                  </div>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                          <th className="px-6 py-4 font-medium">Date</th>
                          <th className="px-6 py-4 font-medium">Description</th>
                          <th className="px-6 py-4 font-medium">Category</th>
                          <th className="px-6 py-4 font-medium text-right">Amount</th>
                          <th className="px-6 py-4 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 text-sm">
                        <tr className="hover:bg-slate-800/30 transition-colors group">
                          <td className="px-6 py-4 text-slate-300">Oct 12, 2025</td>
                          <td className="px-6 py-4 font-medium text-white group-hover:text-indigo-400 transition-colors">Apple Store</td>
                          <td className="px-6 py-4 text-slate-400">Electronics</td>
                          <td className="px-6 py-4 text-right font-medium text-slate-200">-$1,299.00</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Flagged: Unusually High
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-800/30 transition-colors group">
                          <td className="px-6 py-4 text-slate-300">Oct 18, 2025</td>
                          <td className="px-6 py-4 font-medium text-white group-hover:text-indigo-400 transition-colors">Whole Foods</td>
                          <td className="px-6 py-4 text-slate-400">Groceries</td>
                          <td className="px-6 py-4 text-right font-medium text-slate-200">-$245.50</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                              Standard
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-800/30 transition-colors group">
                          <td className="px-6 py-4 text-slate-300">Oct 21, 2025</td>
                          <td className="px-6 py-4 font-medium text-white group-hover:text-indigo-400 transition-colors">Uber</td>
                          <td className="px-6 py-4 text-slate-400">Transport</td>
                          <td className="px-6 py-4 text-right font-medium text-slate-200">-$34.20</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                              Standard
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-800/30 transition-colors group">
                          <td className="px-6 py-4 text-slate-300">Oct 25, 2025</td>
                          <td className="px-6 py-4 font-medium text-white group-hover:text-indigo-400 transition-colors">Unknown Vendor</td>
                          <td className="px-6 py-4 text-slate-400">Uncategorized</td>
                          <td className="px-6 py-4 text-right font-medium text-slate-200">-$150.00</td>
                          <td className="px-6 py-4">
                             <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-pink-500/10 text-pink-400 border border-pink-500/20">
                              Missing Category
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Raw Text Section */}
          {activeDetailsTab === 'raw' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg">Raw Text Extract</h3>
                  <button
                      onClick={handleCopyText}
                      className="text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-slate-300"
                    >
                      {copySuccess ? 'Copied!' : 'Copy Text'}
                  </button>
                </div>
                <div className="bg-slate-950 rounded-xl p-4 h-[400px] overflow-y-auto border border-slate-800">
                  <pre className="whitespace-pre-wrap text-sm text-slate-300 font-mono">
                    {previewData.text}
                  </pre>
                </div>
                
                {/* Save Password Option */}
                {!savePassword ? (
                  <div className="mt-6 pt-6 border-t border-slate-800">
                    <label className="flex items-center cursor-pointer text-slate-300 hover:text-white w-fit">
                      <input
                        type="checkbox"
                        checked={savePassword}
                        onChange={(e) => setSavePassword(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm">Save this password for future use</span>
                    </label>
                  </div>
                ) : (
                  <div className="mt-6 pt-6 border-t border-slate-800 space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Password Label</label>
                      <input
                        type="text"
                        value={passwordLabel}
                        onChange={(e) => setPasswordLabel(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., Work Credit Card"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleSavePassword}
                        disabled={!passwordLabel.trim()}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2 rounded-xl transition-colors"
                      >
                        Save Password
                      </button>
                      <button
                        onClick={() => {
                          setSavePassword(false);
                          setPasswordLabel('');
                        }}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>}>
      <PageContent />
    </Suspense>
  );
}

// Quick tiny helper icon to make the Smart Chat tab look extra premium
function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
    </svg>
  );
}
