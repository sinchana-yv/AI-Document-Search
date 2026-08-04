'use client';

import React, { useState, useEffect } from 'react';
import DocumentUpload from '@/components/DocumentUpload';
import ChatInterface from '@/components/ChatInterface';
import { FileText, Database, ExternalLink, Cpu, Trash2, Loader2 } from 'lucide-react';

interface DocumentItem {
  filename: string;
}

export default function Home() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/documents/list');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.log('Failed to load uploaded documents list.');
    }
  };

  const deleteDocument = async (filename: string) => {
    setDeletingFile(filename);
    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/documents/${encodeURIComponent(filename)}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        await fetchDocuments();
      }
    } catch (e) {
      console.error('Failed to delete document:', e);
    } finally {
      setDeletingFile(null);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-400 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-base bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                RAG Document Search & AI Chatbot
              </h1>
              <p className="text-[11px] text-slate-400">FastAPI • Pinecone / Vector DB • OpenAI GPT-4o</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              API Online
            </span>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              <span>Swagger API Docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Document Management */}
        <div className="lg:col-span-4 space-y-6">
          {/* Upload Component */}
          <DocumentUpload onDocumentUploaded={fetchDocuments} />

          {/* Uploaded Documents List Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg backdrop-blur-md">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Indexed Documents ({documents.length})
            </h3>

            {documents.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/80 text-center">
                <p className="text-xs text-slate-500">No documents uploaded yet.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs group"
                  >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="font-medium text-slate-300 truncate" title={doc.filename}>{doc.filename}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">
                        Indexed
                      </span>
                      <button
                        onClick={() => deleteDocument(doc.filename)}
                        disabled={deletingFile === doc.filename}
                        title="Delete document"
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 transition disabled:opacity-50"
                      >
                        {deletingFile === doc.filename ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: RAG Chatbot Interface */}
        <div className="lg:col-span-8">
          <ChatInterface />
        </div>
      </div>
    </main>
  );
}
