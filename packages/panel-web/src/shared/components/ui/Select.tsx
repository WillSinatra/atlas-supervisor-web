import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  placeholder?: string;
  options: Array<{ value: string | number; label: string }>;
  leftIcon?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, leftIcon, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>}
        <div className="relative">
          {leftIcon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">{leftIcon}</div>}
          <select
            ref={ref}
            className={cn('input', leftIcon && 'pl-10', error && 'border-red-500 focus:ring-red-500', className)}
            {...props}
          >
            {props.placeholder && <option value="">{props.placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';