'use client';

import React, { useEffect, useState } from 'react';
import { FileText, MessageSquare, Sparkles, Database, ArrowRight, History } from 'lucide-react';

interface DashboardProps {
  user: { name: string; email: string; phone: string } | null;
  documents: { filename: string }[];
  onOpenChat: () => void;
}

export default function Dashboard({ user, documents, onOpenChat }: DashboardProps) {
  const [summary, setSummary] = useState<{ user_name: string; total_documents: number; indexed_chunks: number; chat_messages: number } | null>(null);
  const [chatHistory, setChatHistory] = useState<{ id: string; sender: 'user' | 'assistant'; content: string }[]>([]);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/dashboard/summary`);
        if (res.ok) {
          const data = await res.json();
          setSummary(data);
        }
      } catch (err) {
        console.error('Failed to load dashboard summary', err);
      }
    };

    try {
      const saved = window.localStorage.getItem('rag-chat-history');
      if (saved) {
        const parsed = JSON.parse(saved);
        const recent = parsed.filter((item: any) => item.sender === 'user').slice(-4).reverse();
        setChatHistory(recent);
      }
    } catch (err) {
      console.error('Failed to load chat history for dashboard', err);
    }

    fetchSummary();
  }, []);

  const cards = [
    {
      title: 'Documents',
      value: summary?.total_documents ?? documents.length,
      icon: FileText,
      color: 'from-blue-500 to-cyan-400',
    },
    {
      title: 'Indexed Chunks',
      value: summary?.indexed_chunks ?? 0,
      icon: Database,
      color: 'from-emerald-500 to-lime-400',
    },
    {
      title: 'Chat Messages',
      value: summary?.chat_messages ?? 0,
      icon: MessageSquare,
      color: 'from-fuchsia-500 to-purple-400',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-blue-400">Welcome back</p>
            <h2 className="text-2xl font-semibold text-white">{user?.name || 'Guest User'}</h2>
            <p className="mt-2 text-sm text-slate-400">Your document assistant is ready. Upload content, ask questions, and review your activity from here.</p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-300">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI assistant online
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
              <div className={`inline-flex rounded-xl bg-gradient-to-r ${card.color} p-2 text-white`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-4 text-sm text-slate-400">{card.title}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Recent Documents</h3>
              <p className="text-sm text-slate-400">Your uploaded and indexed documents appear here.</p>
            </div>
            <button
              onClick={onOpenChat}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
            >
              Open Chat <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {documents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-500">
                No documents have been uploaded yet.
              </div>
            ) : (
              documents.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                  <span>{doc.filename}</span>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-600/10 px-2.5 py-1 text-xs text-emerald-300">
                    Ready
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-fuchsia-400" />
            <h3 className="text-lg font-semibold text-white">Recent Chat History</h3>
          </div>
          <p className="mt-1 text-sm text-slate-400">Your recent questions appear here for quick review.</p>

          <div className="mt-5 space-y-3">
            {chatHistory.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-500">
                No chat history yet. Start a conversation from the chat view.
              </div>
            ) : (
              chatHistory.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.sender === 'user' ? 'You' : 'Assistant'}</p>
                  <p className="mt-1 line-clamp-3">{item.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
