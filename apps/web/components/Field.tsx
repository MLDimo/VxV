import type { ReactNode } from "react";

/** A form's field under its label. */
export function Field({
  label,
  className = "",
  children,
}: {
  label: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm text-lavender">{label}</span>
      {children}
    </label>
  );
}

/** The reason an officer gives for an action: required, and kept in the journal with it. */
export function ReasonField({
  label = "Motif",
  placeholder,
  className,
}: {
  /** "Motif de la correction". */
  label?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Field label={`${label} (visible dans le journal)`} className={className}>
      <input name="reason" required className="field" placeholder={placeholder} />
    </Field>
  );
}

/** The options of a list, each value with its label. */
export function Options({ options }: { options: readonly (readonly [value: string | number, label: ReactNode])[] }) {
  return options.map(([value, label]) => (
    <option key={value} value={value}>
      {label}
    </option>
  ));
}
