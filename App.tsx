
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
import { isPast, isToday, parseISO, differenceInDays, addMonths } from 'date-fns';
import { supabase } from './lib/supabase';
import { useNotification } from './components/Notification';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState('Painel de Controle');
  
  // Data State - Now fetching from Supabase, initialized as empty
  const [clients, setClients] = useState<Client[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [receipts, setReceipts] = useState<Recebimento[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [preselectedClientId, setPreselectedClientId] = useState<number | null>(null);
  const [dismissedReminderIds, setDismissedReminderIds] = useState<number[]>(() => {
      // Keep dismissed reminders in local storage for UX preference
      try {
          const stored = localStorage.getItem('dismissedReminders');
          return stored ? JSON.parse(stored) : [];
      } catch { return []; }
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { addNotification } = useNotification();

  // Save dismissed reminders to local storage
  useEffect(() => {
      localStorage.setItem('dismissedReminders', JSON.stringify(dismissedReminderIds));
  }, [dismissedReminderIds]);

  // FETCH DATA FROM SUPABASE
  const fetchData = useCallback(async () => {
      setIsLoading(true);
      try {
          // 1. Fetch Users
          const { data: usersData, error: usersError } = await supabase.from('users').select('*');
          if (usersError) throw usersError;
          setUsers(usersData || []);

          // 2. Fetch Clients
          const { data: clientsData, error: clientsError } = await supabase.from('clients').select('*');
          if (clientsError) throw clientsError;
          // Sort clients by ID descending for UI consistency
          setClients((clientsData || []).sort((a,b) => b.id - a.id));

          // 3. Fetch Operations (with Client Name via join if possible, but manual mapping is safer given the simple types)
          const { data: opsData, error: opsError } = await supabase.from('operations').select(`
            *,
            clients (nome)
          `);
          if (opsError) throw opsError;

          // Map snake_case DB columns to camelCase TypeScript types
          const mappedOps: Operation[] = (opsData || []).map((op: any) => ({
              id: op.id,
              clientId: op.client_id,
              clientName: op.clients?.nome || 'Cliente Desconhecido',
              type: op.type,
              titleNumber: op.title_number,
              nominalValue: op.nominal_value,
              netValue: op.net_value,
              issueDate: op.issue_date,
              dueDate: op.due_date,
              taxa: op.taxa,
              status: op.status,
              observacoes: op.observacoes
          })).sort((a,b) => b.id - a.id);
          
          // Auto-update overdue status logic
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const updatedOps = mappedOps.map(op => {
             if (op.status === 'aberto') {
                  const dueDate = parseISO(op.dueDate);
                  if (isPast(dueDate) && !isToday(dueDate)) {
                      // If it's overdue in UI but 'aberto' in DB, we should technically update DB,
                      // but for read-performance, we just show it as overdue or rely on backend jobs.
                      // For this app, let's update local state visually. 
                      // Ideally, we would fire an update to Supabase here if we wanted persistence of 'atrasado'.
                      return { ...op, status: 'atrasado' as OperationStatus };
                  }
             }
             return op;
          });

          setOperations(updatedOps);

          // 4. Fetch Receipts
          const { data: receiptsData, error: receiptsError } = await supabase.from('receipts').select('*');
          if (receiptsError) throw receiptsError;

          const mappedReceipts: Recebimento[] = (receiptsData || []).map((r: any) => ({
              id: r.id,
              operationId: r.operation_id,
              data_recebimento: r.data_recebimento,
              valor_total_recebido: r.valor_total_recebido,
              valor_principal_pago: r.valor_principal_pago,
              valor_juros_pago: r.valor_juros_pago,
              forma_pagamento: r.forma_pagamento,
              observacoes: r.observacoes
          })).sort((a,b) => b.id - a.id);

          setReceipts(mappedReceipts);

      } catch (error: any) {
          console.error('Error fetching data:', error);
          addNotification('Erro ao carregar dados do sistema.', 'error');
      } finally {
          setIsLoading(false);
      }
  }, [addNotification]);

  // Initial Fetch
  useEffect(() => {
      fetchData();
  }, [fetchData]);


  const handleLogin = async (email: string, pass: string): Promise<boolean> => {
    // Direct DB query for MVP login (matches README_DB.md structure)
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', pass)
            .single();

        if (error || !data) {
            return false;
        }

        setCurrentUser(data);
        setActivePage('Painel de Controle');
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleAddClient = useCallback(async (clientData: NewClient) => {
    try {
        const { data, error } = await supabase
            .from('clients')
            .insert([{
                nome: clientData.nome,
                cpf_cnpj: clientData.cpf_cnpj,
                email: clientData.email,
                telefone: clientData.telefone,
                endereco: clientData.endereco,
                limite_credito: clientData.limite_credito,
                taxa_juros_mensal: clientData.taxa_juros_mensal,
                data_cadastro: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;

        setClients(prev => [data, ...prev]);
        return data;
    } catch (error: any) {
        console.error("Error adding client:", error);
        
        const msg = `Erro ao adicionar cliente: ${error.message}`;
        addNotification(msg, 'error');
        throw error; // Re-throw to be caught by the form
    }
  }, [addNotification]);

  const handleUpdateClient = useCallback(async (updatedClient: Client) => {
    try {
        const { error } = await supabase
            .from('clients')
            .update({
                nome: updatedClient.nome,
                cpf_cnpj: updatedClient.cpf_cnpj,
                email: updatedClient.email,
                telefone: updatedClient.telefone,
                endereco: updatedClient.endereco,
                limite_credito: updatedClient.limite_credito,
                taxa_juros_mensal: updatedClient.taxa_juros_mensal
            })
            .eq('id', updatedClient.id);

        if (error) throw error;

        setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    } catch (error: any) {
        console.error("Error updating client:", error);
        
        const msg = `Erro ao atualizar cliente: ${error.message}`;
        addNotification(msg, 'error');
    }
  }, [addNotification]);
  
  const handleDeleteClient = useCallback(async (clientId: number) => {
    try {
        // Cascade delete is enabled in SQL, so deleting client deletes operations and receipts automatically in DB.
        // We just need to delete the client.
        const { error } = await supabase.from('clients').delete().eq('id', clientId);
        
        if (error) throw error;

        // Update local state to reflect cascade
        const opsToDelete = operations.filter(op => op.clientId === clientId).map(op => op.id);
        setReceipts(prev => prev.filter(r => !opsToDelete.includes(r.operationId)));
        setOperations(prev => prev.filter(op => op.clientId !== clientId));
        setClients(prev => prev.filter(c => c.id !== clientId));
        
    } catch (error: any) {
        console.error("Error deleting client:", error);
        addNotification(`Erro ao excluir cliente: ${error.message}`, 'error');
    }
  }, [operations, addNotification]);

  const handleAddOperation = useCallback(async (opData: NewOperation) => {
    const client = clients.find(c => c.id === opData.clientId);
    const taxaDecimal = opData.taxa / 100;
    
    // Check if it's a "Parcelamento" with multiple installments
    if (opData.type === 'parcelamento' && opData.installments && opData.installments > 1) {
        const totalNominal = opData.nominalValue;
        const count = opData.installments;
        const baseTitle = opData.titleNumber;
        const nominalPerInstallment = parseFloat((totalNominal / count).toFixed(2));
        
        // Calculate remaining cents for the last installment
        const totalCalculated = nominalPerInstallment * count;
        const diff = parseFloat((totalNominal - totalCalculated).toFixed(2));

        const bulkOperations = [];

        try {
            for (let i = 0; i < count; i++) {
                // Adjust value for last installment if there's rounding difference
                let value = nominalPerInstallment;
                if (i === count - 1) {
                    value += diff;
                }
                
                const interestAmount = value * taxaDecimal;
                const netValue = value + interestAmount;
                const dueDate = addMonths(parseISO(opData.dueDate), i).toISOString().split('T')[0];

                const payload = {
                    type: 'parcelamento',
                    title_number: `${baseTitle}-${i + 1}/${count}`,
                    nominal_value: value,
                    net_value: netValue,
                    issue_date: opData.issueDate,
                    due_date: dueDate,
                    taxa: opData.taxa,
                    status: 'aberto',
                    client_id: (opData.clientId && opData.clientId > 0) ? opData.clientId : null,
                    observacoes: opData.observacoes
                };
                bulkOperations.push(payload);
            }

            const { data, error } = await supabase
                .from('operations')
                .insert(bulkOperations)
                .select();

            if (error) throw error;

            // Map back to local state
            const newOps: Operation[] = (data || []).map((d: any) => ({
                id: d.id,
                clientId: d.client_id || 0,
                clientName: client ? client.nome : 'Cliente Desconhecido',
                type: d.type,
                titleNumber: d.title_number,
                nominalValue: d.nominal_value,
                netValue: d.net_value,
                issueDate: d.issue_date,
                dueDate: d.due_date,
                taxa: d.taxa,
                status: d.status,
                observacoes: d.observacoes
            }));

            setOperations(prev => [...newOps.sort((a,b) => b.id - a.id), ...prev]);
            addNotification(`Parcelamento em ${count}x registrado com sucesso!`, 'success');

        } catch (error: any) {
            console.error("Error adding bulk operations:", error);
            addNotification(`Erro ao registrar parcelamento: ${error.message}`, 'error');
        }

    } else {
        // Standard Single Operation (Cheque/Duplicata/Single Parcelamento)
        const interestAmount = opData.nominalValue * taxaDecimal;
        const netValue = opData.nominalValue + interestAmount;
        
        try {
            const payload: any = {
                type: opData.type,
                title_number: opData.titleNumber,
                nominal_value: opData.nominalValue,
                net_value: netValue,
                issue_date: opData.issueDate,
                due_date: opData.dueDate,
                taxa: opData.taxa,
                status: 'aberto',
                observacoes: opData.observacoes
            };

            if (opData.clientId && opData.clientId > 0) {
                payload.client_id = opData.clientId;
            } else {
                 payload.client_id = null;
            }

            const { data, error } = await supabase
                .from('operations')
                .insert([payload])
                .select()
                .single();

            if (error) throw error;

            const newOperation: Operation = {
                id: data.id,
                clientId: data.client_id || 0,
                clientName: client ? client.nome : 'Cliente Desconhecido', 
                type: data.type,
                titleNumber: data.title_number,
                nominalValue: data.nominal_value,
                netValue: data.net_value,
                issueDate: data.issue_date,
                dueDate: data.due_date,
                taxa: data.taxa,
                status: data.status,
                observacoes: data.observacoes
            };

            setOperations(prev => [newOperation, ...prev]);
            addNotification('Operação registrada com sucesso!', 'success');
        } catch (error: any) {
            console.error("Error adding operation:", error);
            addNotification(`Erro ao registrar operação: ${error.message}`, 'error');
        }
    }
  }, [clients, addNotification]);
  
  const handleDeleteOperation = useCallback(async (operationId: number) => {
    try {
        const { error } = await supabase.from('operations').delete().eq('id', operationId);
        if (error) throw error;

        setReceipts(prev => prev.filter(r => r.operationId !== operationId));
        setOperations(prev => prev.filter(op => op.id !== operationId));
    } catch (error: any) {
        addNotification(`Erro ao excluir operação: ${error.message}`, 'error');
    }
  }, [addNotification]);

  const handleUpdateOperationStatus = useCallback(async (operationId: number, status: OperationStatus) => {
      try {
          const { error } = await supabase
              .from('operations')
              .update({ status: status })
              .eq('id', operationId);
          
          if (error) throw error;

          setOperations(prev => prev.map(op => 
            op.id === operationId ? { ...op, status } : op
        ));
      } catch (error: any) {
          addNotification(`Erro ao atualizar status: ${error.message}`, 'error');
      }
  }, [addNotification]);

  const handleAddReceipt = useCallback(async (receiptData: NewRecebimento) => {
    try {
        // 1. Insert Receipt
        const { data, error } = await supabase
            .from('receipts')
            .insert([{
                operation_id: receiptData.operationId,
                data_recebimento: receiptData.data_recebimento,
                valor_total_recebido: receiptData.valor_total_recebido,
                valor_principal_pago: receiptData.valor_principal_pago,
                valor_juros_pago: receiptData.valor_juros_pago,
                forma_pagamento: receiptData.forma_pagamento,
                observacoes: receiptData.observacoes
            }])
            .select()
            .single();

        if (error) throw error;

        const newReceipt: Recebimento = {
            id: data.id,
            operationId: data.operation_id,
            data_recebimento: data.data_recebimento,
            valor_total_recebido: data.valor_total_recebido,
            valor_principal_pago: data.valor_principal_pago,
            valor_juros_pago: data.valor_juros_pago,
            forma_pagamento: data.forma_pagamento,
            observacoes: data.observacoes
        };

        setReceipts(prev => [newReceipt, ...prev]);

        // 2. Check and Update Operation Status logic
        const operation = operations.find(op => op.id === receiptData.operationId);
        if (operation) {
            
            // Check for Date Extension (Prorrogação)
            if (receiptData.newDueDate) {
                // If extending date, update due date in DB and ensure status is 'aberto'
                const { error: opUpdateError } = await supabase
                    .from('operations')
                    .update({ 
                        due_date: receiptData.newDueDate,
                        status: 'aberto' 
                    })
                    .eq('id', operation.id);

                if (opUpdateError) throw opUpdateError;

                // Update local state
                setOperations(prev => prev.map(op => 
                    op.id === operation.id 
                    ? { ...op, dueDate: receiptData.newDueDate!, status: 'aberto' } 
                    : op
                ));

            } else {
                // Logic Update: Only close operation if PRINCIPAL PAID >= NOMINAL VALUE
                const totalPrincipalPaid = receipts
                    .filter(r => r.operationId === receiptData.operationId)
                    .reduce((sum, r) => sum + r.valor_principal_pago, 0) + receiptData.valor_principal_pago;

                if (totalPrincipalPaid >= operation.nominalValue) {
                     await handleUpdateOperationStatus(operation.id, 'pago');
                }
            }
        }
    } catch (error: any) {
        console.error("Error adding receipt:", error);
        addNotification(`Erro ao registrar recebimento: ${error.message}`, 'error');
    }
  }, [receipts, operations, handleUpdateOperationStatus, addNotification]);

  const handleDeleteReceipt = useCallback(async (receiptId: number) => {
    const receiptToDelete = receipts.find(r => r.id === receiptId);
    if (!receiptToDelete) return;

    try {
        const { error } = await supabase.from('receipts').delete().eq('id', receiptId);
        if (error) throw error;

        setReceipts(prev => prev.filter(r => r.id !== receiptId));

        // Re-evaluate operation status
        const operation = operations.find(op => op.id === receiptToDelete.operationId);
        if (!operation || operation.status !== 'pago') return;

        const remainingReceiptsForOp = receipts.filter(r => r.operationId === receiptToDelete.operationId && r.id !== receiptId);
        const totalPrincipalPaid = remainingReceiptsForOp.reduce((sum, r) => sum + r.valor_principal_pago, 0);

        if (totalPrincipalPaid < operation.nominalValue) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = parseISO(operation.dueDate);
            const isOverdue = isPast(dueDate) && !isToday(dueDate);
            
            const newStatus: OperationStatus = isOverdue ? 'atrasado' : 'aberto';
            
            await handleUpdateOperationStatus(operation.id, newStatus);
        }
    } catch (error: any) {
        addNotification(`Erro ao excluir recebimento: ${error.message}`, 'error');
    }
  }, [receipts, operations, handleUpdateOperationStatus, addNotification]);

  const handleAddUser = useCallback(async (userData: NewUser) => {
      try {
          const { data, error } = await supabase
            .from('users')
            .insert([{
                nome: userData.nome,
                email: userData.email,
                papel: userData.papel,
                password: userData.password
            }])
            .select()
            .single();
        
        if (error) throw error;
        setUsers(prev => [data, ...prev]);

      } catch (error: any) {
          addNotification(`Erro ao adicionar usuário: ${error.message}`, 'error');
      }
  }, [addNotification]);

  const handleUpdateUser = useCallback(async (updatedUser: User) => {
    try {
        const updatePayload: any = {
            nome: updatedUser.nome,
            email: updatedUser.email,
            papel: updatedUser.papel
        };
        // Only update password if provided (non-empty)
        if (updatedUser.password) {
            updatePayload.password = updatedUser.password;
        }

        const { error } = await supabase
            .from('users')
            .update(updatePayload)
            .eq('id', updatedUser.id);

        if (error) throw error;

        setUsers(prev => prev.map(u => {
            if (u.id === updatedUser.id) {
                return updatedUser; // Optimistic update
            }
            return u;
        }));
    } catch (error: any) {
        addNotification(`Erro ao atualizar usuário: ${error.message}`, 'error');
    }
  }, [addNotification]);

  const handleDeleteUser = useCallback(async (userId: number) => {
    if (currentUser && currentUser.id === userId) {
        return false;
    }
    try {
        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (error) throw error;
        setUsers(prev => prev.filter(u => u.id !== userId));
        return true;
    } catch (error: any) {
        addNotification(`Erro ao excluir usuário: ${error.message}`, 'error');
        return false;
    }
  }, [currentUser, addNotification]);

  // Derived States
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
  }, []);

  // Close mobile menu when page changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activePage]);

  const renderPage = () => {
    if (!currentUser) return null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
            </div>
        )
    }

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