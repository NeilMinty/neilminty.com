import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS } from '@/lib/tools';

export function Home() {
  useEffect(() => {
    document.title = 'Neil Minty — DTC Operator Tools';
    const tag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const prev = tag?.content;
    if (tag) tag.content = 'Free DTC operator tools for founders and growth operators. No login, no data upload, no spreadsheet.';
    return () => { if (tag && prev !== undefined) tag.content = prev; };
  }, []);
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="flex flex-col md:flex-row gap-10 mb-12 pt-4">
        <img
          src="/images/neil-minty.jpg"
          alt="Neil Minty"
          className="h-64 w-full object-cover object-top md:h-auto md:w-[280px] md:flex-shrink-0 rounded-lg self-start"
        />
        <div className="flex flex-col justify-center">
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-4">
            DTC operator tools
          </h1>
          <p className="text-slate-600 leading-relaxed text-lg">
            Fifteen years of DTC operator work distilled into five calculators. No login, no data upload, no spreadsheet. Enter your numbers, get the answer.
          </p>
          <p className="text-slate-500 leading-relaxed mt-3">
            Built for founders and operators who already know the question. These tools just run the maths.
          </p>
          <p className="text-sm text-slate-500 mt-4">
            Neil Minty — growth and ecommerce operator.
          </p>
          <div className="mt-6 text-center">
            <a
              href="mailto:neil@personaify.io"
              className="inline-block px-6 py-3 bg-slate-900 text-white text-sm font-medium rounded hover:bg-slate-800 transition-colors"
            >
              Get in touch
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {TOOLS.map((tool, index) => (
          <Link
            key={tool.path}
            to={tool.path}
            className={`group flex flex-col justify-between bg-white border border-slate-200 rounded-lg px-6 py-5 hover:border-slate-300 transition-colors shadow-card sm:col-span-2${index === TOOLS.length - 1 ? ' sm:col-start-1' : ''}`}
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
