import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  confirmButtonClass?: string;
  icon?: React.ReactNode;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText, confirmButtonClass, icon }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      aria-labelledby="confirm-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md flex flex-col animate-fade-in-up">
        <header className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 id="confirm-modal-title" className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            {icon || <AlertTriangle className="w-6 h-6 text-amber-400" />}
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-full p-1 transition-all duration-200 hover:rotate-90"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </header>
        <div className="p-6">
            <div className="text-slate-300">{message}</div>
        </div>
        <footer className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 p-4 bg-slate-800/50 rounded-b-2xl border-t border-slate-700">
            <button type="button" onClick={onClose} className="bg-slate-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-slate-700 w-full sm:w-auto">
                Cancelar
            </button>
            <button type="button" onClick={onConfirm} className={(confirmButtonClass || "bg-red-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-red-700") + " w-full sm:w-auto"}>
                {confirmText || 'Confirmar Exclusão'}
            </button>
        </footer>
      </div>
    </div>
  );
};

export default ConfirmModal;