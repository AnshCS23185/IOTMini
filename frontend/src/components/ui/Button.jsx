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
    primary: 'bg-[#B86F50] text-white hover:bg-[#C67C5C] border border-[#B86F50] font-medium shadow-none',
    secondary: 'bg-secondary text-white hover:brightness-110 border border-secondary font-medium',
    accent: 'bg-accent text-white font-medium hover:brightness-105 border border-accent',
    outline: 'bg-transparent border border-border text-txt hover:bg-surface-hover font-medium',
    ghost: 'bg-transparent text-txt hover:bg-surface-hover font-medium',
    danger: 'bg-error text-white hover:brightness-110 border border-error font-medium',
  };

  const sizes = {
    small: 'h-[32px] px-3 text-small rounded-lg gap-1.5',
    medium: 'h-[38px] px-3.5 text-body-sm rounded-lg font-medium gap-1.5',
    large: 'h-[42px] px-5 text-body rounded-lg font-medium gap-2',
    icon: 'h-[36px] w-[36px] rounded-lg',
  };

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center transition-colors focus:outline-none disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap',
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
