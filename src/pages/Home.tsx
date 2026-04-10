import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS } from '@/lib/tools';

export function Home() {
  useEffect(() => { document.title = 'Neil Minty — DTC Operator Tools'; }, []);
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="flex flex-col md:flex-row gap-10 mb-12 pt-4">
        <img
          src="/images/neil-minty.jpg"
          alt="Neil Minty"
          className="w-full h-[300px] md:h-auto md:w-[280px] md:flex-shrink-0 rounded-lg object-cover object-top self-start"
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
            Neil Minty — fractional growth and ecommerce operator.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
        {TOOLS.slice(0, -1).map((tool) => (
          <Link
            key={tool.path}
            to={tool.path}
            className="group flex flex-col justify-between h-full bg-white border border-slate-200 rounded-lg px-6 py-5 hover:border-slate-300 transition-colors shadow-card"
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
      <div className="mt-4">
        {(() => {
          const tool = TOOLS[TOOLS.length - 1];
          return (
            <Link
              key={tool.path}
              to={tool.path}
              className="group flex flex-col justify-between bg-white border border-slate-200 rounded-lg px-6 py-5 hover:border-slate-300 transition-colors shadow-card w-full sm:w-[calc(50%-0.5rem)]"
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
          );
        })()}
      </div>

      <section id="about" className="border-t border-slate-200 mt-16 pt-16">
        <h2 className="text-2xl font-semibold text-slate-900">About</h2>
        <p className="text-base text-slate-700 leading-relaxed max-w-2xl mt-4">
          Most brands don't have a growth problem. They have an economics problem.
        </p>
        <p className="text-base text-slate-700 leading-relaxed max-w-2xl mt-4">
          I work with founder-led DTC brands between £2M and £50M where scale has exposed structural weaknesses that marketing alone can't fix. Returns, retention, acquisition costs, and margin leakage get treated as marketing variables. They're structural. My work focuses on fixing the structure.
        </p>
        <p className="text-base text-slate-700 leading-relaxed max-w-2xl mt-4">
          Fifteen years owning P&Ls from £10M to £100M+. I embed as a fractional or interim operator to stabilise performance, rebuild acquisition economics, and implement scalable DTC infrastructure. The engagements have included reversing a −10% DTC trajectory at a premium sports eyewear brand, growing a subscription food business through US and German market launches, and taking a photography archive from £10M to £22M in direct revenue.
        </p>
        <p className="text-base text-slate-700 leading-relaxed max-w-2xl mt-4">
          The tools on this site exist because the same diagnostic questions come up in every engagement. They're free to use.
        </p>
        <div className="mt-8">
          <p className="text-base text-slate-700 leading-relaxed max-w-2xl">
            If you're running a DTC brand and unit economics are the constraint, get in touch. I'll tell you within one conversation whether I can help.
          </p>
          <a
            href="mailto:neil@personaify.io"
            className="inline-block mt-3 text-base font-medium text-slate-900 no-underline hover:underline"
          >
            neil@personaify.io
          </a>
        </div>
      </section>

      <footer className="mt-16 py-8 border-t border-slate-200">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-sm text-slate-400">© Neil Minty {new Date().getFullYear()}</p>
          <a
            href="/#about"
            className="text-sm text-slate-400 hover:text-slate-600 no-underline hover:underline transition-colors"
          >
            About
          </a>
        </div>
      </footer>
    </div>
  );
}
