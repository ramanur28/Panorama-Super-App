import React from 'react';

interface Props {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  accentColor?: string;
  isCurrency?: boolean;
}

export const formatIDR = (num: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
};

export const MetricCard: React.FC<Props> = ({
  title,
  value,
  icon,
  subtitle,
  accentColor = 'var(--color-primary)',
  isCurrency = false,
}) => {
  const displayVal = typeof value === 'number' && isCurrency ? formatIDR(value) : value;

  return (
    <div
      className="metric-card"
      style={{ '--accent-color': accentColor } as React.CSSProperties}
    >
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        <div className="metric-icon-wrap">{icon}</div>
      </div>
      <div className="metric-value">{displayVal}</div>
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
    </div>
  );
};
