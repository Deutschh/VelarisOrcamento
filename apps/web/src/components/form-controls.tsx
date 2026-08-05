import { RequiredLabel } from "./ui.js";

export function SelectField({
  disabled,
  label,
  options,
  requiredMarker,
  value,
  onChange,
}: {
  disabled?: boolean;
  label: string;
  options: Array<[string, string]>;
  requiredMarker?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
      <RequiredLabel isRequired={Boolean(requiredMarker)}>{label}</RequiredLabel>
      <select
        className="mt-2 h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-border-strong)] focus:bg-[var(--color-surface-strong)] focus:ring-4 focus:ring-[var(--color-accent-soft)] disabled:cursor-not-allowed disabled:opacity-55"
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
    <label className="group inline-flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)] shadow-[var(--shadow-soft)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55">
      <span
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${
          checked
            ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
            : "border-[var(--color-border-strong)] bg-transparent"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full transition ${
            checked ? "bg-[var(--color-text-inverted)]" : "bg-transparent"
          }`}
        />
      </span>

      <input
        checked={checked}
        className="sr-only"
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />

      <span>{label}</span>
    </label>
  );
}
