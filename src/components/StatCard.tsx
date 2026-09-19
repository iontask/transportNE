import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  id?: string;
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  subtitle?: string;
}

const colorClasses = {
  blue: 'bg-blue-50/70 text-blue-900 border-blue-200/80 icon-text-blue-600',
  green: 'bg-emerald-50/70 text-emerald-900 border-emerald-200/80 icon-text-emerald-600',
  orange: 'bg-amber-50/70 text-amber-900 border-amber-200/80 icon-text-amber-600',
  red: 'bg-rose-50/70 text-rose-900 border-rose-200/80 icon-text-rose-600',
  purple: 'bg-purple-50/70 text-purple-900 border-purple-200/80 icon-text-purple-600',
};

const iconBgClasses = {
  blue: 'bg-blue-100/80 text-blue-700',
  green: 'bg-emerald-100/80 text-emerald-700',
  orange: 'bg-amber-100/80 text-amber-700',
  red: 'bg-rose-100/80 text-rose-700',
  purple: 'bg-purple-100/80 text-purple-700',
};

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  icon: Icon,
  color = 'blue',
  subtitle,
}) => {
  return (
    <div
      id={id}
      className={`rounded-xl border p-5 transition-shadow hover:shadow-sm ${colorClasses[color]} bg-white shadow-xs`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</p>
          <p className="text-2xl lg:text-3xl font-bold tracking-tight text-gray-900 mt-1.5">{value}</p>
          {subtitle && (
            <p className="text-xs mt-1.5 text-gray-500 font-medium">{subtitle}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${iconBgClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
