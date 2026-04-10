import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS } from '@/lib/tools';

export function Home() {
  useEffect(() => { document.title = 'Neil Minty — DTC Operator Tools'; }, []);
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="max-w-2xl mb-14">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-4">
          DTC operator tools
        </h1>
        <p className="text-slate-600 leading-relaxed text-lg">
          I work on commercial strategy and growth for DTC brands. These tools
          turn the unit economics questions operators run in spreadsheets into
          instant, shareable calculators — margins, CAC payback, promotion
          profitability, and the numbers that determine whether a brand is
          actually building value.
        </p>
        <p className="text-slate-500 leading-relaxed mt-3">
          Built for founders, operators, and investors who need to run the
          numbers without the overhead.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TOOLS.map((tool) => (
          <Link
            key={tool.path}
            to={tool.path}
            className="group bg-white border border-slate-200 rounded-lg px-6 py-5 hover:border-slate-300 transition-colors shadow-card"
          >
            <p className="font-semibold text-slate-900 mb-1.5 group-hover:text-slate-700 transition-colors">
              {tool.name}
            </p>
            <p className="text-sm text-slate-500 leading-relaxed">
              {tool.description}
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
