import React from 'react';
import { cn } from '../../utils/cn';

export const Button = React.forwardRef(({
  className,
  variant = 'primary',
  size = 'medium',
  type = 'button',
  children,
  ...props
}, ref) => {
  const variants = {
    primary: 'bg-primary text-primary-text hover:opacity-90 shadow-sm border border-transparent',
    secondary: 'bg-secondary text-secondary-text hover:opacity-90 shadow-sm border border-transparent',
    accent: 'bg-accent text-deep-brown font-medium hover:opacity-90 shadow-sm border border-transparent',
    outline: 'bg-surface border border-border text-text hover:bg-border/50',
    ghost: 'hover:bg-border/50 text-text',
    danger: 'bg-status-error text-white hover:opacity-90 shadow-sm border border-transparent',
  };

  const sizes = {
    small: 'px-2 py-1 text-small',
    medium: 'px-3 py-1.5 text-medium',
    large: 'px-4 py-2 text-large',
    icon: 'p-1.5',
  };

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 dark:focus:ring-offset-background disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
