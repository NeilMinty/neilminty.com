type Variant = 'neutral' | 'positive' | 'warning' | 'critical';

interface ResultCardProps {
  label: string;
  value: string;
  subtext?: string;
  variant?: Variant;
}

const variantStyles: Record<Variant, { border: string; value: string }> = {
  neutral: { border: 'border-slate-200', value: 'text-slate-900' },
  positive: { border: 'border-slate-200', value: 'text-slate-900' },
  warning: { border: 'border-amber-200', value: 'text-amber-700' },
  critical: { border: 'border-red-200', value: 'text-red-700' },
};

export function ResultCard({
  label,
  value,
  subtext,
  variant = 'neutral',
}: ResultCardProps) {
  const styles = variantStyles[variant];
  return (
    <div
      className={`bg-white border rounded-lg px-5 py-4 shadow-card ${styles.border}`}
    >
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
        {label}
      </p>
      <p className={`text-2xl font-semibold tracking-tight ${styles.value}`}>
        {value}
      </p>
      {subtext && <p className="text-sm text-slate-400 mt-1">{subtext}</p>}
    </div>
  );
}
