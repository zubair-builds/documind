'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { MessageSquare, X, Bot } from 'lucide-react';
import ChatInterface from '@/components/ChatInterface';

export default function FloatingGlobalChat() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  // Don't render the chat widget if the user is not authenticated or session is loading
  if (status === 'loading' || !session) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Popover */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[90vw] sm:w-[450px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              <span className="font-semibold text-slate-200">Global Knowledge Chat</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="h-[500px] w-full">
            <ChatInterface isGlobal={true} />
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] hover:scale-105 transition-all"
        title="Chat with all your documents"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  );
}
