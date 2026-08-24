import React from 'react';
import { cn } from '../../utils/cn';

export const Badge = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-surface border border-border text-text',
    primary: 'bg-primary text-primary-text border-transparent',
    accent: 'bg-accent text-deep-brown border-transparent',
    outline: 'border border-text text-text',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
