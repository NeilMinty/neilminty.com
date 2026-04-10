interface SectionLabelProps {
  children: React.ReactNode;
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}
