import React, { useState } from 'react';

export default function ChatInterface({ pdfId, downloadId }: { pdfId: string; downloadId?: string }) {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isIndexed, setIsIndexed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleIngest = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/chat/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfId, downloadId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize chat');
      setIsIndexed(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfId, message: userMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get response');
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isIndexed) {
    return (
      <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Chat with this PDF</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Enable the AI to read your document so you can ask questions directly about its content.
        </p>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <button
          onClick={handleIngest}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Initializing...
            </>
          ) : (
            'Enable Smart Chat'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6 flex flex-col h-[500px]">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Ask Questions</h3>
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mb-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-sm italic text-center">Chat is ready.<br/>Ask a question about your document.</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`max-w-[85%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-indigo-600 text-white self-end' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 self-start shadow-sm'}`}>
            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="self-start bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-w-[85%] shadow-sm flex items-center gap-2">
             <svg className="animate-spin h-4 w-4 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            <p className="text-sm italic text-gray-500">Retrieving answers...</p>
          </div>
        )}
      </div>
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="e.g. Summarize the main points..."
          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white shadow-sm"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}
