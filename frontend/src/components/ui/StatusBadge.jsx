import React from 'react';
import { Badge } from './Badge';
import { cn } from '../../utils/cn';

const statusConfig = {
  HEALTHY: { bg: 'bg-status-healthy/10', text: 'text-status-healthy', border: 'border-status-healthy/20', icon: 'bg-status-healthy' },
  ATTENTION: { bg: 'bg-status-attention/10', text: 'text-status-attention', border: 'border-status-attention/20', icon: 'bg-status-attention' },
  UNDERPERFORMING: { bg: 'bg-status-warning/10', text: 'text-status-warning', border: 'border-status-warning/20', icon: 'bg-status-warning' },
  OFFLINE: { bg: 'bg-status-error/10', text: 'text-status-error', border: 'border-status-error/20', icon: 'bg-status-error' },
  ERROR: { bg: 'bg-status-error/10', text: 'text-status-error', border: 'border-status-error/20', icon: 'bg-status-error' },
  WEATHER_RELATED: { bg: 'bg-status-info/10', text: 'text-status-info', border: 'border-status-info/20', icon: 'bg-status-info' },
  PENDING: { bg: 'bg-status-neutral/10', text: 'text-status-neutral', border: 'border-status-neutral/20', icon: 'bg-status-neutral' },
  DEFAULT: { bg: 'bg-surface', text: 'text-text', border: 'border-border', icon: 'bg-border' },
};

const mapStatus = (status) => {
  const normalized = String(status).toUpperCase();
  if (normalized.includes('HEALTHY') || normalized.includes('ACTIVE') || normalized.includes('ACKNOWLEDGED')) return 'HEALTHY';
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
        'border gap-1.5 px-2 py-0.5', 
        config.bg, 
        config.text, 
        config.border, 
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.icon)} aria-hidden="true" />
      {status}
    </Badge>
  );
};
