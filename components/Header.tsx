
import React, { useState, useRef, useEffect } from 'react';
import type { User, Reminder } from '../types';
import { Briefcase, UserCircle, LogOut, Bell, X, Menu } from 'lucide-react';
import { differenceInDays, parseISO, isToday } from 'date-fns';
import { formatCurrency } from '../lib/utils';


interface HeaderProps {
    user: User;
    onLogout: () => void;
    reminders: Reminder[];
    onDismissReminder: (reminderId: number) => void;
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, reminders, onDismissReminder, onMenuClick }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsPopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getReminderText = (dueDate: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = parseISO(dueDate);
        if (isToday(due)) {
            return <span className="font-bold text-amber-400">Vence Hoje</span>;
        }
        const daysDiff = differenceInDays(due, today);
        return `Vence em ${daysDiff} dia${daysDiff > 1 ? 's' : ''}`;
    };

    return (
        <header className="bg-slate-900/70 backdrop-blur-sm border-b border-slate-800 p-4 flex items-center justify-between gap-3 sticky top-0 z-20">
            <div className="flex items-center gap-3">
                <button 
                    onClick={onMenuClick}
                    className="p-1 -ml-1 text-slate-400 hover:text-white lg:hidden"
                    aria-label="Abrir menu"
                >
                    <Menu className="w-7 h-7" />
                </button>
                <div className="flex items-center gap-2">
                    <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 text-brand-400"/>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight truncate max-w-[150px] sm:max-w-none">
                        Caribé Factoring
                    </h1>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div ref={popoverRef} className="relative">
                    <button 
                        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                        className="relative p-2 text-slate-400 hover:text-white rounded-full transition-colors duration-200"
                        aria-label="Notificações"
                    >
                        <Bell className="w-6 h-6" />
                        {reminders.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                                {reminders.length}
                            </span>
                        )}
                    </button>
                    {isPopoverOpen && (
                         <div className="absolute top-12 right-[-60px] sm:right-0 w-[90vw] sm:w-80 max-w-sm bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-30 animate-fade-in-up">
                            <div className="p-3 border-b border-slate-700">
                                <h3 className="font-semibold text-slate-200">Lembretes de Vencimento</h3>
                            </div>
                            <div className="max-h-80 sm:max-h-96 overflow-y-auto">
                               {reminders.length > 0 ? (
                                    <ul>
                                        {reminders.map(reminder => (
                                            <li key={reminder.id} className="p-3 border-b border-slate-700/50 hover:bg-slate-700/50 flex items-start gap-3">
                                                <div className="flex-grow">
                                                    <p className="text-sm font-semibold text-slate-100">{reminder.clientName}</p>
                                                    <p className="text-xs text-slate-400">
                                                        {getReminderText(reminder.dueDate)} - {formatCurrency(reminder.nominalValue)}
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={() => onDismissReminder(reminder.id)}
                                                    className="p-1 text-slate-500 hover:text-red-400"
                                                    aria-label="Dispensar lembrete"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                               ) : (
                                 <p className="p-4 text-center text-sm text-slate-500">Nenhum lembrete novo.</p>
                               )}
                            </div>
                        </div>
                    )}
                </div>
                 <div className="h-8 w-px bg-slate-700 mx-2 hidden sm:block"></div>
                <div className="text-right hidden sm:block">
                    <p className="font-semibold text-slate-200 text-sm">{user.nome}</p>
                    <p className="text-xs text-slate-400">{user.papel}</p>
                </div>
                <UserCircle className="w-8 h-8 sm:w-10 sm:h-10 text-slate-500 hidden sm:block" />
                <button 
                  onClick={onLogout} 
                  className="p-2 text-slate-400 hover:text-red-400 rounded-full transition-colors duration-200" 
                  aria-label="Sair"
                >
                    <LogOut className="w-6 h-6" />
                </button>
            </div>
        </header>
    );
};

export default Header;
