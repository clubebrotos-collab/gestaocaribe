import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  addNotification: (message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

const ICONS: Record<NotificationType, React.ReactElement> = {
  success: <CheckCircle className="w-6 h-6 text-emerald-400" />,
  error: <XCircle className="w-6 h-6 text-red-400" />,
  info: <Info className="w-6 h-6 text-sky-400" />,
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (message: string, type: NotificationType) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="fixed top-5 right-5 z-[100] space-y-3 w-full max-w-sm">
        {notifications.map(notification => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onDismiss={removeNotification}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: number) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(notification.id);
        }, 5000);

        return () => clearTimeout(timer);
    }, [notification, onDismiss]);

    return (
        <div className="max-w-sm w-full bg-slate-800 border border-slate-700 shadow-2xl rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 animate-fade-in-up">
            <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                       {ICONS[notification.type]}
                    </div>
                    <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-slate-100">
                           {notification.message}
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex border-l border-slate-700">
                <button
                    onClick={() => onDismiss(notification.id)}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-slate-400 hover:text-slate-100 focus:outline-none"
                    aria-label="Fechar"
                >
                    <X className="w-5 h-5"/>
                </button>
            </div>
        </div>
    );
};