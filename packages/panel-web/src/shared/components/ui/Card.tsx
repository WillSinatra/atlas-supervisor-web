import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ children, className, ...props }, ref) => (
  <div ref={ref} className={cn('bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm', className)} {...props}>
    {children}
  </div>
));

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, CardProps>(({ children, className, ...props }, ref) => (
  <div ref={ref} className={cn('p-5 border-b border-slate-200 dark:border-slate-700', className)} {...props}>
    {children}
  </div>
));

CardHeader.displayName = 'CardHeader';

export const CardBody = forwardRef<HTMLDivElement, CardProps>(({ children, className, ...props }, ref) => (
  <div ref={ref} className={cn('p-5', className)} {...props}>
    {children}
  </div>
));

CardBody.displayName = 'CardBody';