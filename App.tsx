
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import ClientsPage from './pages/Clients';
import OperationsPage from './pages/Operations';
import ReportsPage from './pages/Reports';
import ReceiptsPage from './pages/Receipts';
import LoginPage from './pages/Login';
import UsersPage from './pages/UsersPage';
import InterestCalculatorPage from './pages/InterestCalculatorPage';
import type { Client, Operation, NewClient, NewOperation, Recebimento, NewRecebimento, User, OperationStatus, Reminder, NewUser } from './types';
import { MOCK_CLIENTS, MOCK_OPERATIONS, MOCK_RECEBIMENTOS, MOCK_USERS } from './lib/mockData';
import { isPast, isToday, parseISO, differenceInDays } from 'date-fns';
import useLocalStorageState from './hooks/useLocalStorageState';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState('Painel de Controle');
  const [clients, setClients] = useLocalStorageState<Client[]>('factoring_clients', MOCK_CLIENTS);
  const [operations, setOperations] = useLocalStorageState<Operation[]>('factoring_operations', MOCK_OPERATIONS);
  const [receipts, setReceipts] = useLocalStorageState<Recebimento[]>('factoring_receipts', MOCK_RECEBIMENTOS);
  const [users, setUsers] = useLocalStorageState<User[]>('factoring_users', MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [preselectedClientId, setPreselectedClientId] = useState<number | null>(null);
  const [dismissedReminderIds, setDismissedReminderIds] = useLocalStorageState<number[]>('dismissedReminders', []);
  
  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setOperations(prevOps => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let hasChanges = false;

      const updatedOps = prevOps.map(op => {
        if (op.status === 'aberto') {
          const dueDate = parseISO(op.dueDate);
          if (isPast(dueDate) && !isToday(dueDate)) {
            hasChanges = true;
            // FIX: Explicitly define the new status type to prevent TypeScript from widening it to `string`.
            const newStatus: OperationStatus = 'atrasado';
            return { ...op, status: newStatus };
          }
        }
        return op;
      });
      // Only return a new array if changes were made to avoid unnecessary re-renders
      return hasChanges ? updatedOps : prevOps;
    });
  }, []); // Run only on component mount

  const handleLogin = (email: string, pass: string): boolean => {
    const user = users.find(u => u.email === email && u.password === pass);
    if (user) {
      setCurrentUser(user);
      setActivePage('Painel de Controle');
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleAddClient = useCallback((clientData: NewClient): Client => {
    const newId = clients.length > 0 ? Math.max(...clients.map(c => c.id)) + 1 : 1;
    const newClient: Client = {
        ...clientData,
        id: newId,
        data_cadastro: new Date().toISOString(),
    };
    setClients(prev => [newClient, ...prev]);
    return newClient;
  }, [clients, setClients]);

  const handleUpdateClient = useCallback((updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
  }, [setClients]);
  
  const handleDeleteClient = useCallback((clientId: number) => {
    const opsToDelete = operations.filter(op => op.clientId === clientId).map(op => op.id);
    
    setReceipts(prev => prev.filter(r => !opsToDelete.includes(r.operationId)));
    setOperations(prev => prev.filter(op => op.clientId !== clientId));
    setClients(prev => prev.filter(c => c.id !== clientId));
  }, [operations, setClients, setOperations, setReceipts]);

  const handleAddOperation = useCallback((opData: NewOperation) => {
    setOperations(prev => {
      const client = clients.find(c => c.id === opData.clientId);
      if (!client) return prev;

      const taxaDecimal = opData.taxa / 100;
      // Adjusted calculation: Nominal - (Nominal * Rate)
      const interestAmount = opData.nominalValue * taxaDecimal;
      const netValue = opData.nominalValue - interestAmount;
      
      const newOperation: Operation = {
        ...opData,
        id: Math.max(0, ...prev.map(o => o.id)) + 1,
        clientName: client.nome,
        netValue: netValue,
        status: 'aberto',
      };
      return [newOperation, ...prev];
    });
  }, [clients, setOperations]);
  
  const handleDeleteOperation = useCallback((operationId: number) => {
    setReceipts(prev => prev.filter(r => r.operationId !== operationId));
    setOperations(prev => prev.filter(op => op.id !== operationId));
  }, [setOperations, setReceipts]);

  const handleUpdateOperationStatus = useCallback((operationId: number, status: OperationStatus) => {
    setOperations(prev => prev.map(op => 
        op.id === operationId ? { ...op, status } : op
    ));
  }, [setOperations]);

  const handleAddReceipt = useCallback((receiptData: NewRecebimento) => {
    setReceipts(prev => {
        const newReceipt: Recebimento = {
            ...receiptData,
            id: Math.max(0, ...prev.map(r => r.id)) + 1,
        };
        return [newReceipt, ...prev];
    });

    setOperations(prevOps => {
        const operation = prevOps.find(op => op.id === receiptData.operationId);
        if (!operation) return prevOps;
        
        const totalPaidForOperation = receipts
            .filter(r => r.operationId === receiptData.operationId)
            .reduce((sum, r) => sum + r.valor_total_recebido, 0) + receiptData.valor_total_recebido;

        if (totalPaidForOperation >= operation.nominalValue) {
             return prevOps.map(op => op.id === receiptData.operationId ? { ...op, status: 'pago' } : op);
        }
        return prevOps;
    });

  }, [receipts, setReceipts, setOperations]);

  const handleDeleteReceipt = useCallback((receiptId: number) => {
    const receiptToDelete = receipts.find(r => r.id === receiptId);
    if (!receiptToDelete) return;
    
    setReceipts(prev => prev.filter(r => r.id !== receiptId));

    const operation = operations.find(op => op.id === receiptToDelete.operationId);
    if (!operation || operation.status !== 'pago') return;

    const remainingReceiptsForOp = receipts.filter(r => r.operationId === receiptToDelete.operationId && r.id !== receiptId);
    const totalPaid = remainingReceiptsForOp.reduce((sum, r) => sum + r.valor_total_recebido, 0);

    if (totalPaid < operation.nominalValue) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = parseISO(operation.dueDate);
        const isOverdue = isPast(dueDate) && !isToday(dueDate);
        
        const newStatus: OperationStatus = isOverdue ? 'atrasado' : 'aberto';

        setOperations(prev => prev.map(op => 
            op.id === operation.id ? { ...op, status: newStatus } : op
        ));
    }
  }, [receipts, operations, setOperations, setReceipts]);

  const handleAddUser = useCallback((userData: NewUser) => {
    setUsers(prev => {
        const newId = prev.length > 0 ? Math.max(...prev.map(u => u.id)) + 1 : 1;
        const newUser: User = { ...userData, id: newId };
        return [newUser, ...prev];
    });
  }, [setUsers]);

  const handleUpdateUser = useCallback((updatedUser: User) => {
    setUsers(prev => prev.map(u => {
        if (u.id === updatedUser.id) {
            const userWithPreservedPassword = {
                ...updatedUser,
                password: updatedUser.password ? updatedUser.password : u.password,
            };
            return userWithPreservedPassword;
        }
        return u;
    }));
  }, [setUsers]);

  const handleDeleteUser = useCallback((userId: number) => {
    if (currentUser && currentUser.id === userId) {
        return false;
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
    return true;
  }, [currentUser, setUsers]);

  const clientsWithOperationCounts = useMemo(() => {
    return clients.map(client => ({
      ...client,
      operationCount: operations.filter(op => op.clientId === client.id).length,
    }));
  }, [clients, operations]);

  const activeReminders = useMemo((): Reminder[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const REMINDER_WINDOW_DAYS = 7;

    return operations
        .filter(op => {
            if (op.status !== 'aberto' || dismissedReminderIds.includes(op.id)) {
                return false;
            }
            const dueDate = parseISO(op.dueDate);
            const daysDiff = differenceInDays(dueDate, today);
            return daysDiff >= 0 && daysDiff <= REMINDER_WINDOW_DAYS;
        })
        .map(op => ({
            id: op.id,
            operationId: op.id,
            clientName: op.clientName,
            dueDate: op.dueDate,
            nominalValue: op.nominalValue,
        }))
        .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
  }, [operations, dismissedReminderIds]);

  const handleDismissReminder = useCallback((reminderId: number) => {
    setDismissedReminderIds(prev => [...prev, reminderId]);
  }, [setDismissedReminderIds]);

  // Close mobile menu when page changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activePage]);

  const renderPage = () => {
    if (!currentUser) return null;

    switch (activePage) {
      case 'Painel de Controle':
        return <Dashboard operations={operations} />;
      case 'Clientes':
        return <ClientsPage 
                  clients={clientsWithOperationCounts}
                  operations={operations}
                  receipts={receipts}
                  onAddClient={handleAddClient}
                  onUpdateClient={handleUpdateClient}
                  onDeleteClient={handleDeleteClient}
                  setActivePage={setActivePage}
                  setPreselectedClientId={setPreselectedClientId}
                />;
      case 'Operações':
        return <OperationsPage 
                  operations={operations} 
                  clients={clients} 
                  onAddOperation={handleAddOperation}
                  onDeleteOperation={handleDeleteOperation}
                  onUpdateOperationStatus={handleUpdateOperationStatus}
                  setActivePage={setActivePage}
                  preselectedClientId={preselectedClientId}
                  setPreselectedClientId={setPreselectedClientId}
                />;
      case 'Recebimentos':
        return <ReceiptsPage
                  receipts={receipts}
                  operations={operations}
                  onAddReceipt={handleAddReceipt}
                  onDeleteReceipt={handleDeleteReceipt}
                />;
      case 'Calculadora':
          return <InterestCalculatorPage clients={clients} operations={operations} />;
      case 'Relatórios':
        return <ReportsPage operations={operations} clients={clients} receipts={receipts} />;
      case 'Usuários':
        return currentUser.papel === 'Administrador' ? (
          <UsersPage
            users={users}
            currentUser={currentUser}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
          />
        ) : (
          <Dashboard operations={operations} />
        );
      default:
        return <Dashboard operations={operations} />;
    }
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 font-sans flex">
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage}
        clientsCount={clients.length}
        operationsCount={operations.length}
        receiptsCount={receipts.length}
        user={currentUser}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <Header 
          user={currentUser} 
          onLogout={handleLogout} 
          reminders={activeReminders}
          onDismissReminder={handleDismissReminder}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;
