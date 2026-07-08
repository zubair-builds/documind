import React, { useState, useEffect, useRef } from 'react';
import { Bot, User, Copy, ThumbsUp, ThumbsDown, Loader2, ArrowUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatInterface({ pdfId, downloadId }: { pdfId: string; downloadId?: string }) {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isIndexed, setIsIndexed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat state from local storage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(`chatState_${pdfId}`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.messages) setMessages(parsed.messages);
        if (parsed.isIndexed) setIsIndexed(parsed.isIndexed);
      } catch (e) {
        console.error('Failed to parse saved chat state', e);
      }
    }
  }, [pdfId]);

  // Save chat state to local storage when it changes
  useEffect(() => {
    if (isIndexed || messages.length > 0) {
      localStorage.setItem(`chatState_${pdfId}`, JSON.stringify({ messages, isIndexed }));
    }
  }, [pdfId, messages, isIndexed]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
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

  const handleCopy = async (content: string, idx: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isIndexed) {
    return (
      <div className="flex flex-col h-[600px] bg-slate-900/30 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl relative items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
          <Bot className="w-10 h-10 text-indigo-400" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">Initialize Document Intelligence</h3>
        <p className="text-slate-400 mb-8 max-w-md">
          Enable the AI to securely index your document. This allows for lightning-fast answers and deep contextual understanding.
        </p>
        {error && <p className="text-pink-400 text-sm mb-4 bg-pink-500/10 px-4 py-2 rounded-lg border border-pink-500/20">{error}</p>}
        <button
          onClick={handleIngest}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-slate-400 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)] flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
               <Loader2 className="w-5 h-5 animate-spin" />
               Processing Document...
            </>
          ) : (
            'Enable Smart Chat'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-slate-900/30 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl relative">
      {/* Subtle Top Gradient for depth */}
      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-slate-900/80 to-transparent pointer-events-none z-10"></div>
      
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scroll-smooth z-0">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
             <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4 border border-slate-700/50">
               <Bot className="w-8 h-8 text-indigo-400" />
             </div>
             <p className="font-medium text-slate-300">Document indexed successfully.</p>
             <p className="text-sm">Ask a question to start the conversation.</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex items-start space-x-4 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
            
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
              msg.role === 'assistant' 
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
                : 'bg-slate-800 border border-slate-700'
            }`}>
              {msg.role === 'assistant' ? <Bot className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-slate-300" />}
            </div>
            
            {/* Message Bubble */}
            <div className={`max-w-[85%] rounded-3xl p-5 ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-sm shadow-[0_4px_20px_-4px_rgba(99,102,241,0.4)]' 
                : 'bg-gradient-to-b from-slate-900/60 to-slate-900/30 border border-slate-700/50 text-slate-300 rounded-tl-sm shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl'
            }`}>
              <div className="text-[15px] prose prose-invert max-w-none">
                {msg.role === 'assistant' ? (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p className="leading-relaxed mb-4 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="space-y-2 mb-4 list-disc list-inside marker:text-indigo-500 ml-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="space-y-2 mb-4 list-decimal list-inside marker:text-indigo-500 ml-1" {...props} />,
                      li: ({node, ...props}) => (
                        <li className="leading-relaxed text-slate-300">
                          {props.children}
                        </li>
                      ),
                      strong: ({node, ...props}) => <strong className="text-white font-semibold" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-white mb-3 mt-6 first:mt-0" {...props} />,
                      h4: ({node, ...props}) => <h4 className="text-base font-semibold text-white mb-2 mt-4 first:mt-0" {...props} />,
                      code: ({node, inline, ...props}: any) => 
                        inline ? (
                          <code className="bg-slate-800/80 text-indigo-300 px-1.5 py-0.5 rounded font-mono text-sm" {...props} />
                        ) : (
                          <div className="bg-slate-950/80 rounded-xl p-4 mb-4 border border-slate-800 overflow-x-auto">
                            <code className="font-mono text-sm text-slate-300" {...props} />
                          </div>
                        ),
                      table: ({node, ...props}) => (
                        <div className="overflow-x-auto mb-4 border border-slate-700/50 rounded-xl">
                          <table className="w-full text-left border-collapse" {...props} />
                        </div>
                      ),
                      th: ({node, ...props}) => <th className="px-4 py-3 bg-slate-900/80 font-medium text-white border-b border-slate-700/50" {...props} />,
                      td: ({node, ...props}) => <td className="px-4 py-3 border-b border-slate-700/50 last:border-0" {...props} />
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>

              {/* AI Action Bar */}
              {msg.role === 'assistant' && (
                <div className="flex items-center space-x-2 mt-5 pt-3 border-t border-slate-800/80 text-slate-500">
                  <button onClick={() => handleCopy(msg.content, idx)} className="p-1.5 hover:bg-slate-800 hover:text-slate-300 rounded-md transition-all flex items-center" title="Copy text">
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> <span className="text-xs font-medium">{copiedIndex === idx ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <div className="flex-1"></div>
                  <button className="p-1.5 hover:bg-slate-800 hover:text-emerald-400 rounded-md transition-all" title="Helpful">
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 hover:bg-slate-800 hover:text-pink-400 rounded-md transition-all" title="Not helpful">
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-slate-900/80 border border-slate-700/50 text-slate-300 rounded-3xl rounded-tl-sm shadow-xl backdrop-blur-md p-5 flex items-center space-x-3">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              <span className="text-sm italic">Analyzing document...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className="px-4 py-2 mx-4 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-sm rounded-xl mb-4">{error}</div>}
      
      {/* Input Area */}
      <div className="p-4 bg-slate-900/80 backdrop-blur-md border-t border-slate-800 z-20">
        <form onSubmit={handleSend} className="relative flex items-center max-w-5xl mx-auto">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Summarize the main points..."
            className="w-full bg-slate-950/50 border border-slate-700 rounded-2xl pl-5 pr-14 py-4 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-200 transition-all placeholder:text-slate-500"
            disabled={loading}
          />
          <button 
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-2 p-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white rounded-xl transition-all disabled:cursor-not-allowed shadow-[0_0_15px_-3px_rgba(99,102,241,0.4)] flex items-center justify-center"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
