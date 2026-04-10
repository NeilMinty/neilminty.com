import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS } from '@/lib/tools';

export function Home() {
  useEffect(() => { document.title = 'Neil Minty — DTC Operator Tools'; }, []);
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="max-w-2xl mb-12 pt-4">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-4">
          DTC operator tools
        </h1>
        <p className="text-slate-600 leading-relaxed text-lg">
          Fifteen years of DTC operator work distilled into five calculators. No login, no data upload, no spreadsheet. Enter your numbers, get the answer.
        </p>
        <p className="text-slate-500 leading-relaxed mt-3">
          Built for founders and operators who already know the question. These tools just run the maths.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TOOLS.map((tool, index) => (
          <Link
            key={tool.path}
            to={tool.path}
            className={`group flex flex-col justify-between bg-white border border-slate-200 rounded-lg px-6 py-5 hover:border-slate-300 transition-colors shadow-card${TOOLS.length % 2 !== 0 && index === TOOLS.length - 1 ? ' sm:max-w-[calc(50%-0.75rem)]' : ''}`}
          >
            <div>
              <p className="font-semibold text-slate-900 mb-1.5 group-hover:text-slate-700 transition-colors">
                {tool.name}
              </p>
              <p className="text-sm text-slate-500 leading-relaxed">
                {tool.description}
              </p>
            </div>
            <p className="text-sm text-slate-500 group-hover:text-slate-900 transition-colors mt-4">
              Open tool →
            </p>
          </Link>
        ))}
      </div>

      <footer className="mt-20 pt-8 border-t border-slate-200">
        <p className="text-sm text-slate-400">Neil Minty</p>
      </footer>
    </div>
  );
}
