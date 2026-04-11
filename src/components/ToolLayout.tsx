import { useEffect } from 'react';

const DEFAULT_META_DESCRIPTION =
  'Free DTC operator tools for founders and growth operators. Calculate promotion profitability, margin leakage, returns cost, LTV:CAC ratio, and first purchase retention strength.';

interface ToolLayoutProps {
  title: string;
  description: string;
  metaDescription?: string;
  children: React.ReactNode;
}

export function ToolLayout({ title, description, metaDescription, children }: ToolLayoutProps) {
  useEffect(() => {
    document.title = `${title} | Neil Minty`;
    return () => { document.title = 'Neil Minty — DTC Operator Tools'; };
  }, [title]);

  useEffect(() => {
    const tag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!tag) return;
    const prev = tag.content;
    tag.content = metaDescription ?? DEFAULT_META_DESCRIPTION;
    return () => { tag.content = prev; };
  }, [metaDescription]);
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8 pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
          {title}
        </h1>
        <p className="text-slate-500 leading-relaxed">{description}</p>
      </div>
      {children}
    </div>
  );
}
