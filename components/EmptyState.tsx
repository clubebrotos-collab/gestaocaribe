import React from 'react';
import { PlusCircle } from 'lucide-react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onActionClick?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actionText, onActionClick }) => {
  return (
    <div className="text-center py-12 px-6">
      <div className="mx-auto w-16 h-16 flex items-center justify-center bg-slate-800 rounded-full text-slate-500">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-100">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
      {actionText && onActionClick && (
        <div className="mt-6">
          <button
            type="button"
            onClick={onActionClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-brand-500"
          >
            <PlusCircle className="-ml-1 mr-2 h-5 w-5" />
            {actionText}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
