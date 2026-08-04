'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, BookOpen, ChevronDown, ChevronUp, Sparkles, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

export interface SourceCitation {
  text: string;
  filename: string;
  page: number;
  score: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') {
      return [
        {
          id: 'welcome',
          sender: 'assistant',
          content: 'Hello! Upload a document on the left sidebar and ask me any question about its contents.',
        },
      ];
    }

    try {
      const saved = window.localStorage.getItem('rag-chat-history');
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }

    return [
      {
        id: 'welcome',
        sender: 'assistant',
        content: 'Hello! Upload a document on the left sidebar and ask me any question about its contents.',
      },
    ];
  });
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'speaking' | 'thinking'>('idle');
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (audioEnabled) {
      const timer = window.setTimeout(() => {
        speakText('Hello! I am your voice assistant. Ask me anything about your uploaded document.');
      }, 400);
      return () => window.clearTimeout(timer);
    }
  }, [audioEnabled]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (typeof window !== 'undefined') {
        window.speechSynthesis?.cancel();
      }
    };
  }, []);

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const speakText = (text: string) => {
    if (!audioEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => {
      setIsSpeaking(true);
      setVoiceStatus('speaking');
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setVoiceStatus('idle');
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setVoiceStatus('idle');
    };
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionCtor = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setInputQuery('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setVoiceStatus('idle');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setInputQuery(transcript);
      setIsListening(false);
      setVoiceStatus('thinking');
      recognition.stop();
      void submitMessage(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceStatus('idle');
    };

    recognition.onend = () => {
      setIsListening(false);
      setVoiceStatus('idle');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setVoiceStatus('listening');
  };

  const submitMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessageText = text.trim();
    const userMsgId = Date.now().toString();

    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      content: userMessageText,
    };

    setMessages((prev) => {
      const next = [...prev, userMessage];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('rag-chat-history', JSON.stringify(next));
      }
      return next;
    });
    setInputQuery('');
    setIsLoading(true);
    setVoiceStatus('thinking');

    try {
      const response = await fetch('http://localhost:8000/api/v1/chat/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessageText,
          top_k: 4,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to get answer from RAG backend.');
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: data.answer,
        sources: data.sources,
      };

      setMessages((prev) => {
        const next = [...prev, assistantMsg];
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('rag-chat-history', JSON.stringify(next));
        }
        return next;
      });
      if (audioEnabled) {
        speakText(data.answer);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: `Error: ${err.message || 'Failed to query the document assistant.'}`,
      };
      setMessages((prev) => {
        const next = [...prev, errorMsg];
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('rag-chat-history', JSON.stringify(next));
        }
        return next;
      });
    } finally {
      setIsLoading(false);
      setVoiceStatus('idle');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await submitMessage(inputQuery);
  };

  const formatAssistantContent = (content: string) => {
    const lines = content
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return [];
    }

    const formatted: Array<{ type: 'paragraph' | 'list'; text?: string; items?: string[] }> = [];
    let currentList: string[] = [];

    const flushList = () => {
      if (currentList.length > 0) {
        formatted.push({ type: 'list', items: currentList });
        currentList = [];
      }
    };

    lines.forEach((line) => {
      if (/^[-*•]\s+/.test(line)) {
        currentList.push(line.replace(/^[-*•]\s+/, ''));
        return;
      }

      flushList();
      formatted.push({ type: 'paragraph', text: line });
    });

    flushList();
    return formatted;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">AI Document Assistant</h2>
            <p className="text-xs text-slate-400">Retrieval-Augmented Generation (RAG) System</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-[11px] font-medium border ${
          isListening ? 'bg-red-600/20 border-red-500/40 text-red-300' :
          isSpeaking ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300' :
          'bg-slate-800 border-slate-700 text-slate-400'
        }`}>
          {isListening ? 'Listening…' : isSpeaking ? 'Speaking…' : voiceStatus === 'thinking' ? 'Thinking…' : audioEnabled ? 'Voice On' : 'Voice Off'}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 max-w-3xl ${
              msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Content Bubble */}
            <div className="space-y-2 max-w-[85%]">
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none shadow-md'
                }`}
              >
                {msg.sender === 'assistant' ? (
                  <div className="space-y-2">
                    {formatAssistantContent(msg.content).map((segment, index) => (
                      segment.type === 'list' ? (
                        <ul key={`${msg.id}-list-${index}`} className="list-disc pl-5 space-y-1 text-sm">
                          {segment.items?.map((item, itemIndex) => (
                            <li key={`${msg.id}-item-${itemIndex}`}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p key={`${msg.id}-text-${index}`} className="whitespace-pre-wrap leading-relaxed">
                          {segment.text}
                        </p>
                      )
                    ))}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                )}
              </div>

              {/* Source Citations Accordion */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 rounded-xl bg-slate-950/50 border border-slate-800 p-3">
                  <button
                    onClick={() => toggleSources(msg.id)}
                    className="flex items-center justify-between w-full text-xs font-medium text-blue-400 hover:text-blue-300 transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Retrieved Document Sources ({msg.sources.length})
                    </span>
                    {expandedSources[msg.id] ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {expandedSources[msg.id] && (
                    <div className="mt-3 space-y-2 border-t border-slate-800/80 pt-2">
                      {msg.sources.map((src, idx) => (
                        <div key={idx} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-xs">
                          <div className="flex items-center justify-between text-slate-400 font-mono mb-1 text-[11px]">
                            <span className="text-emerald-400">📄 {src.filename} (Page {src.page})</span>
                            <span className="text-slate-500">Score: {(src.score * 100).toFixed(1)}%</span>
                          </div>
                          <p className="text-slate-300 italic line-clamp-3 bg-slate-950/40 p-2 rounded border border-slate-800/60">
                            "{src.text}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-4 max-w-3xl">
            <div className="w-8 h-8 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]" />
              <span className="text-xs text-slate-400 ml-2 font-medium">Searching documents & generating answer...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-950/80 flex gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask a question about your uploaded documents..."
          className="flex-1 bg-slate-900 border border-slate-700/80 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 transition placeholder-slate-500"
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={toggleListening}
          className={`px-3 py-3 rounded-xl border transition ${isListening ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-blue-500 hover:text-blue-400'}`}
          disabled={isLoading}
          aria-label="Toggle voice input"
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={() => {
            setAudioEnabled((prev) => {
              const next = !prev;
              if (!next) {
                window.speechSynthesis?.cancel();
                setIsSpeaking(false);
                setVoiceStatus('idle');
              }
              return next;
            });
          }}
          className={`px-3 py-3 rounded-xl border transition ${audioEnabled ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-blue-500 hover:text-blue-400'}`}
          aria-label="Toggle audio output"
        >
          {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-medium text-sm flex items-center gap-2 transition shadow-lg shadow-blue-600/20"
        >
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
