import React from 'react';

interface CardProps {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  // Updated type to string to support responsive padding classes (e.g., 'p-4 sm:p-6')
  padding?: string;
  footer?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, icon, children, className = '', padding = 'p-6', footer }) => {
  return (
    <div className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg w-full flex flex-col ${className}`}>
      {title && (
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-3">
            {icon}
            <span>{title}</span>
          </h2>
        </div>
      )}
      <div className={`flex-grow ${padding}`}>
        {children}
      </div>
      {footer && (
        <div className="p-4 border-t border-slate-700 bg-slate-800/30 rounded-b-2xl">
            {footer}
        </div>
      )}
    </div>
  );
};

export default Card;