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
          Returns, retention, acquisition costs, margin leakage. Founders treat them as marketing variables. They're structural. Marketing spend on top of a broken unit economics model doesn't fix the model. It just makes the bleed faster.
        </p>
        <p className="text-base text-slate-700 leading-relaxed mt-4">
          I work with founder-led DTC brands between £2M and £50M where scale has exposed the structure. Revenue is there. The economics aren't holding.
        </p>
        <p className="text-base text-slate-700 leading-relaxed mt-4">
          Fifteen years owning P&Ls from £10M to £100M+. I come in as an operator, not a consultant — diagnosis first, then rebuild. At ROKA, that meant reversing a −10% DTC trajectory to +25% in a single trading year. At Buddy Brands, 200% revenue growth and launches into the US and German markets. At Magnum Photos, £10M to £22M DTC with a single partnership week generating £4M.
        </p>
        <p className="text-base text-slate-700 leading-relaxed mt-4">
          The work starts with unit economics. Always. What you're spending to acquire, what you're keeping after returns and fulfilment, what your best customers are actually worth. Most of that is knowable within a few weeks if you know where to look.
        </p>
        <p className="text-base text-slate-700 leading-relaxed mt-4">
          The tools on this site exist because the same diagnostic questions come up in every engagement. First purchase probability. Margin leakage. Promotions profitability. Use them.
        </p>

        <div className="mt-8 pt-8 border-t border-slate-200">
          <p className="text-base text-slate-700 leading-relaxed">
            If unit economics are the constraint, get in touch. I'll tell you within one conversation whether I can help.
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
