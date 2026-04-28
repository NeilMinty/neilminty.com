import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS } from '@/lib/tools';

const RESULT_CHIPS = [
  'First purchase: Trail Boot · Retention score 0.74 · Discount dependency: Low',
  'Promotion break-even: +34% volume uplift · Margin at target: No',
  'Margin leakage: Returns 41% · Discounting 38% · Delivery 21%',
  'Returns true cost: £6.23/order · Margin drag: £1.84 · Operational: £0.91',
  'LTV:CAC at 12m: 1.8x · Payback: 7 months · At 24m: 3.1x',
  'Support leakage: £2.10/order · Refund attribution: 34% of total',
  'Taxonomy preview: EN | META | PROS | RETARGETING | SPRING25 | VIDEO',
];

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
          Fifteen years of DTC operator work distilled into seven calculators. No login, no data upload, no spreadsheet. Enter your numbers, get the answer.
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

      <div
        className="relative overflow-hidden my-10"
        style={{
          width: '100vw',
          left: '50%',
          transform: 'translateX(-50%)',
          maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        }}
      >
        <style>{`@keyframes scroll-chips { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
        <div
          className="flex items-center gap-3 py-2"
          style={{ width: 'max-content', animation: 'scroll-chips 55s linear infinite' }}
        >
          {[...RESULT_CHIPS, ...RESULT_CHIPS].map((chip, i) => (
            <span
              key={i}
              className="font-mono text-xs text-slate-500 bg-white border border-slate-200 rounded px-3 py-1.5 whitespace-nowrap shrink-0"
            >
              {chip}
            </span>
          ))}
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
