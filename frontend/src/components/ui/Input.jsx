import React from 'react';
import { cn } from '../../utils/cn';

export const Input = React.forwardRef(({
  className,
  type = 'text',
  label,
  error,
  ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="text-small font-medium text-text">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-8 w-full rounded border border-border bg-surface px-3 py-1 text-medium text-text placeholder:text-text-muted transition-colors focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-status-error focus:ring-status-error focus:border-status-error',
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-small text-status-error">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
