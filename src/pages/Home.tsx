import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS } from '@/lib/tools';

export function Home() {
  useEffect(() => {
    document.title = 'Neil Minty — DTC Operator Tools';
    const tag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const prev = tag?.content;
    if (tag) tag.content = 'Free DTC operator tools for founders and growth operators. Calculate LTV:CAC, promotion profitability, margin leakage, returns cost, and more. No login required.';
    return () => { if (tag && prev !== undefined) tag.content = prev; };
  }, []);
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="max-w-2xl mb-12 pt-4">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-4">
          DTC operator tools
        </h1>
        <p className="text-slate-500 leading-relaxed">
          Fifteen years of DTC operator work distilled into a growing suite of calculators. No login, no data upload, no spreadsheet. Enter your numbers, get the answer.
        </p>
        <p className="text-slate-500 leading-relaxed mt-3">
          Built for founders and operators who already know the question. Free to use.
        </p>
        <div className="mt-6">
          <a
            href="#tools"
            className="inline-block px-6 py-3 bg-slate-900 text-white text-sm font-medium rounded hover:bg-slate-800 transition-colors"
          >
            See all tools ↓
          </a>
        </div>
      </div>

      <div className="mb-12 border border-slate-200 rounded-lg bg-white shadow-card">
        <div className="px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Example output</p>
            <p className="text-xs text-slate-400">First Purchase Predictor</p>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">8 SKUs · 6 months of orders · Mid-range fashion brand</p>
        </div>
        <div>
          <table className="w-full text-sm table-fixed sm:table-auto">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-2 pr-2 sm:py-2.5 sm:pl-5 sm:pr-3 text-left text-xs uppercase tracking-widest font-semibold text-slate-300 w-6 sm:w-8">#</th>
                <th className="py-2 px-1.5 sm:py-2.5 sm:px-3 text-left text-xs uppercase tracking-widest font-semibold text-slate-300">Product</th>
                <th className="py-2 px-1.5 sm:py-2.5 sm:px-3 text-right text-xs uppercase tracking-widest font-semibold text-slate-300 whitespace-nowrap">Retention</th>
                <th className="py-2 px-1.5 sm:py-2.5 sm:px-3 text-right text-xs uppercase tracking-widest font-semibold text-slate-300 whitespace-nowrap">Volume</th>
                <th className="py-2.5 pl-3 pr-5 text-right text-xs uppercase tracking-widest font-semibold text-slate-300 hidden sm:table-cell">Disc. dependency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2 pr-2 sm:py-3 sm:pl-5 sm:pr-3 text-slate-400 tabular-nums">1</td>
                <td className="py-2 px-1.5 sm:py-3 sm:px-3 font-medium text-slate-900">Merino Crew Neck</td>
                <td className="py-2 px-1.5 sm:py-3 sm:px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">0.81</td>
                <td className="py-2 px-1.5 sm:py-3 sm:px-3 text-right text-slate-600 whitespace-nowrap">High</td>
                <td className="py-3 pl-3 pr-5 text-right text-slate-600 hidden sm:table-cell">Low</td>
              </tr>
              <tr>
                <td className="py-2 pr-2 sm:py-3 sm:pl-5 sm:pr-3 text-slate-400 tabular-nums">2</td>
                <td className="py-2 px-1.5 sm:py-3 sm:px-3 font-medium text-slate-900">Canvas Tote</td>
                <td className="py-2 px-1.5 sm:py-3 sm:px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">0.74</td>
                <td className="py-2 px-1.5 sm:py-3 sm:px-3 text-right text-slate-600 whitespace-nowrap">Medium</td>
                <td className="py-3 pl-3 pr-5 text-right text-slate-600 hidden sm:table-cell">Low</td>
              </tr>
              <tr>
                <td className="py-2 pr-2 sm:py-3 sm:pl-5 sm:pr-3 text-slate-400 tabular-nums">3</td>
                <td className="py-2 px-1.5 sm:py-3 sm:px-3 font-medium text-slate-900">Wool Overshirt</td>
                <td className="py-2 px-1.5 sm:py-3 sm:px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">0.68</td>
                <td className="py-2 px-1.5 sm:py-3 sm:px-3 text-right text-slate-600 whitespace-nowrap">Low</td>
                <td className="py-3 pl-3 pr-5 text-right text-amber-600 hidden sm:table-cell">Medium</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 border-t border-slate-100">
          <p className="text-sm text-slate-500 italic leading-relaxed">Acquire on the Merino Crew Neck. High retention, no discount crutch, enough volume to trust the signal.</p>
        </div>
      </div>

      <div id="tools" className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {TOOLS.map((tool) => (
          <Link
            key={tool.path}
            to={tool.path}
            className="group flex flex-col justify-between bg-white border border-slate-200 rounded-lg px-6 py-5 hover:border-slate-300 transition-colors shadow-card sm:col-span-2"
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
              {tool.cta}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-16 pt-10 border-t border-slate-200">
        <div className="bg-white border border-slate-200 rounded-lg px-6 py-8 shadow-card">
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-2">
            Growth Engine
          </h2>
          <p className="text-slate-500 leading-relaxed mb-6">
            These tools are the lightweight version. Growth Engine is what they connect to — a multi-agent commercial intelligence platform that tracks retention, margin, acquisition, and pricing continuously, connected to your Shopify and Klaviyo data.
          </p>
          <div className="text-center">
            <a
              href="https://demo.neilminty.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded hover:bg-slate-800 transition-colors"
            >
              Explore the demo →
            </a>
          </div>
        </div>
      </div>

      <footer className="mt-16 py-8 border-t border-slate-200">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-sm text-slate-400">© Neil Minty {new Date().getFullYear()}</p>
          <Link
            to="/about"
            className="text-sm text-slate-400 hover:text-slate-600 no-underline hover:underline transition-colors"
          >
            About
          </Link>
        </div>
      </footer>
    </div>
  );
}
