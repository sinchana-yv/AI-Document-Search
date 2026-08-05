'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface UploadedDoc {
  filename: string;
  chunks_count?: number;
}

interface DocumentUploadProps {
  onDocumentUploaded: () => void;
}

export default function DocumentUpload({ onDocumentUploaded }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/api/v1/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to upload document.');
      }

      setStatusMessage({
        type: 'success',
        text: `Uploaded "${data.filename}" (${data.chunks_count} chunks embedded).`,
      });

      if (onDocumentUploaded) {
        onDocumentUploaded();
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error uploading document.',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 shadow-lg backdrop-blur-md">
      <h2 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
        <Upload className="w-5 h-5 text-blue-400" />
        Upload Documents
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        Supported formats: PDF, DOCX, TXT, MD. Documents will be chunked & stored for AI retrieval.
      </p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 bg-slate-900/40 hover:bg-slate-800/80 group"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          accept=".pdf,.docx,.doc,.txt,.md"
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <span className="text-sm font-medium text-slate-300">Processing & embedding...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <FileText className="w-8 h-8 text-slate-400 group-hover:text-blue-400 transition" />
            <span className="text-sm font-medium text-slate-300 group-hover:text-white">
              Drag & drop file here or <span className="text-blue-400 underline">browse</span>
            </span>
            <span className="text-xs text-slate-500">Max file size 25MB</span>
          </div>
        )}
      </div>

      {statusMessage && (
        <div
          className={`mt-4 p-3 rounded-lg flex items-start gap-2.5 text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/70 border border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/70 border border-rose-800/80 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
}
