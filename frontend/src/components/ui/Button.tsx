import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/formatters';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-2xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const variants = {
    primary:
      'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 shadow-sm dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300 dark:shadow-md dark:shadow-emerald-950/40',
    secondary:
      'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-[#1e293b] dark:text-slate-100 dark:hover:bg-[#28354f] dark:border dark:border-slate-700/70',
    outline:
      'border border-slate-300 bg-transparent text-slate-800 hover:bg-slate-100 dark:border-slate-700/80 dark:text-slate-200 dark:hover:bg-slate-800/60',
    ghost:
      'bg-transparent text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/60',
    danger:
      'bg-rose-600 text-white hover:bg-rose-500 shadow-sm hover:shadow active:bg-rose-700',
  };

  const sizes = {
    sm: 'text-sm px-4 py-2 gap-2 h-9',
    md: 'text-base px-5 py-2.5 gap-2.5 h-11',
    lg: 'text-lg px-6 py-3.5 gap-3 h-13',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-current" aria-hidden="true" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
};
