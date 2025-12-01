
import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-800 border-t sm:border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col animate-fade-in-up">
        <header className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
          <h2 id="modal-title" className="text-xl font-semibold text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-full p-2 sm:p-1 transition-all duration-200 hover:rotate-90 bg-slate-800/50 sm:bg-transparent"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </header>
        <div className="flex-grow overflow-y-auto p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
