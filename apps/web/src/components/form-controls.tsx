export function SelectField({
  disabled,
  label,
  options,
  value,
  onChange,
}: {
  disabled?: boolean;
  label: string;
  options: Array<[string, string]>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm text-white/70">
      {label}
      <select
        className="mt-2 h-11 w-full rounded-md border border-white/15 bg-[#15171d] px-3 text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/15 disabled:cursor-not-allowed disabled:opacity-55"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CheckboxField({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex min-h-11 items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/75 transition hover:bg-white/[0.06] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55">
      <input
        checked={checked}
        className="h-4 w-4 accent-emerald-300"
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
