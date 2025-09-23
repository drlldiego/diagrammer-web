/**
 * Breadcrumb Navigation Component
 * Provides navigation between parent and child processes (Sub-processes)
 */
import React from 'react';
import './BreadcrumbNavigation.scss';

export interface BreadcrumbItem {
  id: string;
  name: string;
  type: 'process' | 'subprocess';
}

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
  onNavigate: (item: BreadcrumbItem, index: number) => void;
  className?: string;
}

export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  items,
  onNavigate,
  className = ''
}) => {
  // Don't show breadcrumb if there's only one level
  if (items.length <= 1) {
    return null;
  }

  return (
    <div className={`breadcrumb-navigation ${className}`}>
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          {index > 0 && <span className="breadcrumb-separator">›</span>}
          <button
            className={`breadcrumb-item ${index === items.length - 1 ? 'current' : 'clickable'}`}
            onClick={() => index < items.length - 1 && onNavigate(item, index)}
            disabled={index === items.length - 1}
            title={index === items.length - 1 ? 'Current view' : `Navigate to ${item.name}`}
          >
            {item.name}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};