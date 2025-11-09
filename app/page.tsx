'use client';

import { useState, useRef, useEffect, DragEvent, ChangeEvent, FormEvent } from 'react';

interface PreviewData {
  text: string;
  totalPages: number;
  extractedPages: number;
  downloadUrl: string;
  filename: string;
}

export default function Home() {
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
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setError('');
      } else {
        setError('Please upload a PDF file');
      }
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please upload a PDF file');
      }
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a PDF file');
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
      // Stage 1: Preparing upload
      setProgressStage('Preparing upload...');
      setProgress(10);
      await new Promise(resolve => setTimeout(resolve, 200));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('password', password);

      // Stage 2: Uploading file
      setProgressStage('Uploading file...');
      setProgress(25);

      const response = await fetch('/api/unlock-pdf', {
        method: 'POST',
        body: formData,
      });

      // Stage 3: Unlocking PDF
      setProgressStage('Unlocking PDF...');
      setProgress(50);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unlock PDF');
      }

      // Stage 4: Extracting text
      setProgressStage('Extracting text...');
      setProgress(75);

      // Get JSON response with text preview and download URL
      const data = await response.json();

      // Stage 5: Saving to database
      setProgressStage('Saving to database...');
      setProgress(90);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Complete
      setProgressStage('Complete!');
      setProgress(100);

      setPreviewData({
        text: data.text,
        totalPages: data.totalPages,
        extractedPages: data.extractedPages,
        downloadUrl: data.downloadUrl,
        filename: data.filename,
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred while unlocking the PDF');
    } finally {
      // Stop timer
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              PDF Assist
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Securely unlock password-protected PDF files
            </p>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Drop Zone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Select PDF File
              </label>
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                onClick={handleBrowseClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={loading || !!previewData}
                />

                <svg
                  className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {file ? (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      PDF files only (max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Saved Password Dropdown */}
            {savedPasswords.length > 0 && !previewData && (
              <div>
                <label
                  htmlFor="savedPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                >
                  Use Saved Password
                </label>
                <select
                  id="savedPassword"
                  value={selectedPasswordId}
                  onChange={(e) => handlePasswordSelect(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={loading}
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

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
              >
                PDF Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter PDF password"
                disabled={loading || !!previewData}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* Progress Bar */}
            {loading && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {progressStage}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {(elapsedTime / 1000).toFixed(1)}s
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                  {progress}% complete
                </div>
              </div>
            )}

            {/* Submit Button */}
            {!previewData && !loading && (
              <button
                type="submit"
                disabled={loading || !file || !password}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Unlock PDF
              </button>
            )}
          </form>

          {/* Info Section */}
          {!previewData && (
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                How it works:
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Upload your password-protected PDF file</li>
                <li>• Enter the password to unlock it</li>
                <li>• Preview the text content</li>
                <li>• Download the unlocked PDF</li>
                <li>• All files are processed securely and deleted immediately</li>
              </ul>
            </div>
          )}
        </div>

        {/* Text Preview Section */}
        {previewData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                PDF Content Preview
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Showing pages 1-{previewData.extractedPages} of{' '}
                  {previewData.totalPages}
                </span>
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
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
                {previewData.text}
              </pre>
            </div>

            {/* Save Password Option */}
            {!savePassword && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={savePassword}
                    onChange={(e) => setSavePassword(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Save this password for future use
                  </span>
                </label>
              </div>
            )}

            {savePassword && (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="passwordLabel"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                  >
                    Password Label
                  </label>
                  <input
                    type="text"
                    id="passwordLabel"
                    value={passwordLabel}
                    onChange={(e) => setPasswordLabel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., Work Credit Card"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSavePassword}
                    disabled={!passwordLabel.trim()}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Save Password
                  </button>
                  <button
                    onClick={() => {
                      setSavePassword(false);
                      setPasswordLabel('');
                    }}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-4">
              <button
                onClick={handleDownload}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <span className="flex items-center justify-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download Unlocked PDF
                </span>
              </button>

              <button
                onClick={handleUploadAnother}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Upload Another
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Your files are processed securely and deleted immediately after
            processing.
          </p>
        </div>
      </div>
    </div>
  );
}
