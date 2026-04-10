import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getNoteBySlug } from '@/lib/notes';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function NoteDetail() {
  const { slug } = useParams<{ slug: string }>();
  const note = slug ? getNoteBySlug(slug) : null;

  useEffect(() => {
    if (note) document.title = `${note.title} — Neil Minty`;
    return () => { document.title = 'Neil Minty — DTC Operator Tools'; };
  }, [note]);

  if (!note) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 pt-20">
        <p className="text-slate-500">Note not found.</p>
        <Link to="/notes" className="text-sm text-slate-400 hover:text-slate-600 mt-4 inline-block transition-colors">
          ← Notes
        </Link>
      </div>
    );
  }

  const { Component, title, date } = note;

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="pt-4 pb-6 mb-8 border-b border-slate-200">
        <Link to="/notes" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          ← Notes
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-4 mb-1">{title}</h1>
        <p className="text-sm text-slate-500">{formatDate(date)}</p>
      </div>

      <div className={[
        'prose prose-slate max-w-none',
        'prose-p:text-base prose-p:text-slate-700 prose-p:leading-relaxed',
        'prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-slate-900',
        'prose-h2:text-xl prose-h3:text-lg',
        'prose-strong:text-slate-900 prose-strong:font-semibold',
        'prose-a:text-slate-900 prose-a:font-medium prose-a:no-underline hover:prose-a:underline',
        'prose-ul:text-slate-700 prose-ol:text-slate-700',
        'prose-blockquote:text-slate-600 prose-blockquote:border-slate-300',
      ].join(' ')}>
        <Component />
      </div>
    </div>
  );
}
