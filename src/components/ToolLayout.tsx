interface ToolLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function ToolLayout({ title, description, children }: ToolLayoutProps) {
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
