import React from 'react';
import { cn } from '@/utils/formatters';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all dark:border-slate-800/80 dark:bg-[#111827]/85 dark:backdrop-blur-md',
        hoverable &&
          'hover:border-slate-300 hover:shadow-md dark:hover:border-slate-700/80 hover:-translate-y-0.5 transition-transform duration-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
