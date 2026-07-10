import React from 'react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  onBack?: () => void;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  breadcrumbs,
  actions,
  onBack,
  className,
}) => {
  const navigate = useNavigate();

  return (
    <div className={cn('flex items-center justify-between mb-6', className)}>
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex flex-col">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.label}>
                  {idx > 0 && <span className="text-gray-300 dark:text-gray-600">/</span>}
                  {crumb.href ? (
                    <button
                      onClick={() => navigate(crumb.href!)}
                      className="hover:text-primary transition-colors"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-gray-700 dark:text-gray-300">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </div>
  );
};
