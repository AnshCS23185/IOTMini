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
        <label className="text-caption uppercase tracking-wider font-semibold text-txt-muted">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={cn(
          'input-base',
          error && 'border-error focus:ring-error/15 focus:border-error',
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-caption text-error">{error}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
