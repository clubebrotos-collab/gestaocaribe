
import React from 'react';
import { LayoutDashboard, Users, ArrowRightLeft, FileText, CreditCard, Calculator, UserCircle, X } from 'lucide-react';
import type { User } from '../types';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  clientsCount: number;
  operationsCount: number;
  receiptsCount: number;
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { name: 'Painel de Controle', icon: LayoutDashboard, countKey: null },
  { name: 'Clientes', icon: Users, countKey: 'clients' },
  { name: 'Operações', icon: ArrowRightLeft, countKey: 'operations' },
  { name: 'Recebimentos', icon: CreditCard, countKey: 'receipts' },
  { name: 'Calculadora', icon: Calculator, countKey: null },
  { name: 'Relatórios', icon: FileText, countKey: null },
  { name: 'Usuários', icon: UserCircle, countKey: null },
];

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, clientsCount, operationsCount, receiptsCount, user, isOpen, onClose }) => {
    
  const counts = {
    clients: clientsCount,
    operations: operationsCount,
    receipts: receiptsCount,
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <nav className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col transform transition-transform duration-300 ease-in-out shadow-2xl
        lg:static lg:translate-x-0 lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-200">Caribé Factoring</h2>
            <p className="text-sm text-slate-500">Menu Principal</p>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <ul className="space-y-3 overflow-y-auto flex-1">
          {navItems.map(item => {
            if (item.name === 'Usuários' && user?.papel !== 'Administrador') {
              return null;
            }
            return (
              <li key={item.name}>
                <button
                  onClick={() => {
                      setActivePage(item.name);
                      onClose(); // Close drawer on mobile selection
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors duration-200 group ${
                    activePage === item.name
                      ? 'bg-brand-600 text-white shadow-lg'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="h-6 w-6" />
                    <span className="ml-4 font-semibold">{item.name}</span>
                  </div>
                  {item.countKey && counts[item.countKey as keyof typeof counts] > 0 && (
                     <span className={`text-xs font-bold rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center transition-colors duration-200 ${
                         activePage === item.name
                         ? 'bg-white text-brand-700'
                         : 'bg-slate-700 text-slate-300 group-hover:bg-slate-600'
                     }`}>
                         {counts[item.countKey as keyof typeof counts]}
                     </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-auto text-center text-slate-600 hidden lg:block">
          <p className="text-xs">&copy; {new Date().getFullYear()} Caribé Factoring</p>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
