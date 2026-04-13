import { useEffect } from 'react';

export function About() {
  useEffect(() => {
    document.title = 'About — Neil Minty';
    const tag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const prev = tag?.content;
    if (tag) tag.content = 'Neil Minty — fractional growth and ecommerce operator working with founder-led DTC brands between £2M and £50M.';
    return () => { if (tag && prev !== undefined) tag.content = prev; };
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      {/* Two-column hero */}
      <div className="flex flex-col md:flex-row md:items-center gap-10 pt-4">
        <img
          src="/images/neil-minty.jpg"
          alt="Neil Minty"
          className="w-full h-[300px] md:h-auto md:w-[280px] md:flex-shrink-0 rounded-lg object-cover object-top"
        />
        <div className="flex flex-col justify-center">
          <h1 className="text-2xl font-semibold text-slate-900">Neil Minty</h1>
          <p className="text-base text-slate-500 mt-1">Fractional growth and ecommerce operator</p>
          <div className="mt-4 text-center">
            <button
              onClick={() => { window.location.href = 'mail' + 'to:neil@person' + 'aify.io'; }}
              className="bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Let's talk
            </button>
          </div>
        </div>
      </div>

      {/* Body copy */}
      <div className="max-w-2xl mt-12">
        <p className="text-base text-slate-700 leading-relaxed mt-4">
          Most brands don't have a growth problem. They have an economics problem.
        </p>
        <p className="text-base text-slate-700 leading-relaxed mt-4">
          I work with founder-led DTC brands between £2M and £50M where scale has exposed structural weaknesses that marketing alone can't fix. Returns, retention, acquisition costs, and margin leakage get treated as marketing variables. They're structural. My work focuses on fixing the structure.
        </p>
        <p className="text-base text-slate-700 leading-relaxed mt-4">
          Fifteen years owning P&Ls from £10M to £100M+. I embed as a fractional or interim operator to stabilise performance, rebuild acquisition economics, and implement scalable DTC infrastructure. Proof of work includes scaling digital revenue 100%+ across multiple businesses with board-level P&L accountability, rebuilding underperforming growth engines starting from a unit economics diagnosis rather than and supporting 200% revenue growth at a DTC consumables brand during my tenure.
        </p>
        <p className="text-base text-slate-700 leading-relaxed mt-4">
          The tools on this site exist because the same diagnostic questions come up in every engagement. They're free to use.
        </p>

        <div className="mt-8 pt-8 border-t border-slate-200">
          <p className="text-base text-slate-700 leading-relaxed">
            If you're running a DTC brand and unit economics are the constraint, get in touch. I'll tell you within one conversation whether I can help.
          </p>
          <div className="mt-4 text-center">
            <button
              onClick={() => { window.location.href = 'mail' + 'to:neil@person' + 'aify.io'; }}
              className="bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Let's talk
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
