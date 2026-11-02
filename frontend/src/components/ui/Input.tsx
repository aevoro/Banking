import React, { forwardRef } from 'react';
import { cn } from '@/utils/formatters';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightElement, className, id, ...props }, ref) => {
    const inputId = id || props.name || Math.random().toString(36).substring(2, 9);

    return (
      <div className="w-full flex flex-col gap-2">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-300"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="pointer-events-none absolute left-4 flex items-center text-slate-400 dark:text-slate-500">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full rounded-2xl border bg-white px-4 py-3 text-base text-slate-900 shadow-xs transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 dark:bg-[#0f172a] dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800',
              leftIcon && 'pl-11',
              rightElement && 'pr-14',
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500'
                : 'border-slate-300 focus:border-emerald-500 dark:border-slate-800 dark:focus:border-emerald-400',
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-4 flex items-center">{rightElement}</div>
          )}
        </div>
        {error ? (
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
