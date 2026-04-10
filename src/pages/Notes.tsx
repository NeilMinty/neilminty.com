import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllNotes } from '@/lib/notes';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function Notes() {
  useEffect(() => { document.title = 'Notes — Neil Minty'; }, []);
  const notes = getAllNotes();

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-10 pb-6 border-b border-slate-200 pt-4">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Notes</h1>
      </div>
      {notes.length === 0 ? (
        <p className="text-slate-500">No notes yet.</p>
      ) : (
        <ul>
          {notes.map((note) => (
            <li key={note.slug}>
              <Link
                to={`/notes/${note.slug}`}
                className="flex items-baseline justify-between py-3.5 border-b border-slate-100 group no-underline"
              >
                <span className="text-slate-900 font-medium group-hover:text-slate-500 transition-colors">
                  {note.title}
                </span>
                <span className="text-sm text-slate-400 shrink-0 ml-8">
                  {formatDate(note.date)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
