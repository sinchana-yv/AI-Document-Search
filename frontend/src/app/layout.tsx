import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RAG AI Document Search Chatbot',
  description: 'Production RAG AI Document Search Chatbot using Next.js, FastAPI, PostgreSQL, Pinecone, and GPT-4.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
