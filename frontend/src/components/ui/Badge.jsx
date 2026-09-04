import React from 'react';
import { cn } from '../../utils/cn';

export const Badge = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-surface-secondary border border-border text-txt-secondary',
    primary: 'bg-primary/10 text-primary border border-primary/15',
    accent: 'bg-accent/10 text-accent border border-accent/15',
    outline: 'border border-border-strong text-txt-secondary',
    success: 'bg-success/8 text-success border border-success/12',
    warning: 'bg-warning/8 text-warning border border-warning/12',
    error: 'bg-error/8 text-error border border-error/12',
    info: 'bg-info/8 text-info border border-info/12',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-caption transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
