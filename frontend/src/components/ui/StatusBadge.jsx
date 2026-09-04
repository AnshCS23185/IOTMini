import React from 'react';
import { Badge } from './Badge';
import { cn } from '../../utils/cn';

const statusConfig = {
  HEALTHY: { 
    bg: 'bg-green-500/10', 
    text: 'text-green-600 dark:text-[#4ADE80]', 
    border: 'border-green-500/25', 
    dot: 'bg-green-500 dark:bg-[#4ADE80]' 
  },
  ATTENTION: { 
    bg: 'bg-amber-500/10', 
    text: 'text-amber-600 dark:text-[#FBBF24]', 
    border: 'border-amber-500/25', 
    dot: 'bg-amber-500 dark:bg-[#FBBF24]' 
  },
  UNDERPERFORMING: { 
    bg: 'bg-red-500/10', 
    text: 'text-red-600 dark:text-[#F87171]', 
    border: 'border-red-500/25', 
    dot: 'bg-red-500 dark:bg-[#F87171]' 
  },
  OFFLINE: { 
    bg: 'bg-neutral-500/10', 
    text: 'text-neutral-700 dark:text-[#D4D4D4]', 
    border: 'border-neutral-500/25', 
    dot: 'bg-neutral-400 dark:bg-neutral-400' 
  },
  ERROR: { 
    bg: 'bg-red-500/10', 
    text: 'text-red-600 dark:text-[#F87171]', 
    border: 'border-red-500/25', 
    dot: 'bg-red-500 dark:bg-[#F87171]' 
  },
  WEATHER_RELATED: { 
    bg: 'bg-sky-500/10', 
    text: 'text-sky-600 dark:text-[#6C8F8A]', 
    border: 'border-sky-500/25', 
    dot: 'bg-sky-500 dark:bg-[#6C8F8A]' 
  },
  PENDING: { 
    bg: 'bg-neutral-500/10', 
    text: 'text-neutral-700 dark:text-[#D4D4D4]', 
    border: 'border-neutral-500/25', 
    dot: 'bg-neutral-400 dark:bg-neutral-400' 
  },
  ACTIVE: {
    bg: 'bg-green-500/10', 
    text: 'text-green-600 dark:text-[#4ADE80]', 
    border: 'border-green-500/25', 
    dot: 'bg-green-500 dark:bg-[#4ADE80]' 
  },
  DEFAULT: { 
    bg: 'bg-surface-secondary', 
    text: 'text-txt-secondary', 
    border: 'border-border', 
    dot: 'bg-border-strong' 
  },
};

const mapStatus = (status) => {
  const normalized = String(status).toUpperCase();
  if (normalized.includes('HEALTHY') || normalized.includes('ACKNOWLEDGED')) return 'HEALTHY';
  if (normalized === 'ACTIVE') return 'ACTIVE';
  if (normalized.includes('WEATHER')) return 'WEATHER_RELATED';
  if (normalized.includes('ATTENTION') || normalized.includes('SHADING')) return 'ATTENTION';
  if (normalized.includes('UNDERPERFORMING') || normalized.includes('LOSS')) return 'UNDERPERFORMING';
  if (normalized.includes('PENDING') || normalized.includes('NO_SOLAR') || normalized.includes('NO_DATA')) return 'PENDING';
  if (normalized.includes('OFFLINE')) return 'OFFLINE';
  if (normalized.includes('ERROR') || normalized.includes('FAILED')) return 'ERROR';
  return 'DEFAULT';
};

export const StatusBadge = ({ status, className }) => {
  const mapped = mapStatus(status);
  const config = statusConfig[mapped] || statusConfig.DEFAULT;

  return (
    <Badge 
      className={cn(
        'gap-1.5 px-2 py-0.5 text-caption font-medium border', 
        config.bg, 
        config.text, 
        config.border, 
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dot)} aria-hidden="true" />
      <span>{status}</span>
    </Badge>
  );
};
