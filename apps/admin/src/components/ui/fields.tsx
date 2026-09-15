import { cn } from '@syt/shared';
import { inputClass } from '@syt/ui';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

function FieldShell({ id, label, hint, error, required, fullWidth, children }: FieldShellProps) {
  return (
    <div className={cn('grid min-w-0 content-start gap-1.5', fullWidth && 'md:col-span-2')}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && <span className="text-danger-strong"> *</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-slate-gray">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-danger-strong">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string): string | undefined {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
}

type BaseProps = {
  label: string;
  name: string;
  id?: string;
  hint?: string;
  error?: string;
  fullWidth?: boolean;
};

export type TextInputProps = BaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'name'>;

export function TextInput({ label, name, id, hint, error, fullWidth, className, required, ...props }: TextInputProps) {
  const fieldId = id ?? `field-${name}`;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} fullWidth={fullWidth}>
      <input
        id={fieldId}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        className={cn(inputClass, error && 'border-danger', className)}
        {...props}
      />
    </FieldShell>
  );
}

export type TextAreaProps = BaseProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'name'>;

export function TextArea({ label, name, id, hint, error, fullWidth, className, required, rows = 4, ...props }: TextAreaProps) {
  const fieldId = id ?? `field-${name}`;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} fullWidth={fullWidth}>
      <textarea
        id={fieldId}
        name={name}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        className={cn(inputClass, 'min-h-24', error && 'border-danger', className)}
        {...props}
      />
    </FieldShell>
  );
}

export type SelectFieldProps = BaseProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'name'> & {
    options: { value: string; label: string }[];
  };

export function SelectField({ label, name, id, hint, error, fullWidth, className, required, options, ...props }: SelectFieldProps) {
  const fieldId = id ?? `field-${name}`;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} fullWidth={fullWidth}>
      <select
        id={fieldId}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        className={cn(inputClass, error && 'border-danger', className)}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export interface ToggleFieldProps {
  label: string;
  name: string;
  id?: string;
  description?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}

/** 開關欄位：受控（checked + onChange）或非受控（defaultChecked）皆可 */
export function ToggleField({ label, name, id, description, checked, defaultChecked, disabled, onChange }: ToggleFieldProps) {
  const fieldId = id ?? `toggle-${name}`;
  return (
    <label htmlFor={fieldId} className={cn('flex min-w-0 items-start justify-between gap-4', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-gray">{description}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          id={fieldId}
          name={name}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          onChange={onChange ? (event) => onChange(event.target.checked) : undefined}
        />
        <span
          aria-hidden="true"
          className="h-6 w-11 rounded-full bg-border-gray transition-colors peer-checked:bg-teal-strong peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal peer-disabled:opacity-50"
        />
        <span
          aria-hidden="true"
          className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
  );
}
