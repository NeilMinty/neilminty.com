interface InputFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'number' | 'text' | 'email';
  prefix?: string;
  suffix?: string;
  hint?: string;
  placeholder?: string;
}

export function InputField({
  label,
  value,
  onChange,
  type = 'number',
  prefix,
  suffix,
  hint,
  placeholder,
}: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="flex items-stretch border border-slate-200 rounded bg-white focus-within:border-slate-400 transition-colors">
        {prefix && (
          <span className="px-3 text-sm text-slate-500 border-r border-slate-200 flex items-center bg-slate-50 rounded-l select-none shrink-0">
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm text-slate-900 bg-transparent outline-none min-w-0"
        />
        {suffix && (
          <span className="px-3 text-sm text-slate-500 border-l border-slate-200 flex items-center bg-slate-50 rounded-r select-none shrink-0">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
