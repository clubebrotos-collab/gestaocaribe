
import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { ArrowRightLeft, CheckCircle2, CreditCard, Trash2, Search, ListFilter, Calendar } from 'lucide-react';
import type { Operation, NewOperation, Client, OperationStatus } from '../types';
import { formatDate, formatCurrency } from '../lib/utils';
import { useNotification } from '../components/Notification';
import EmptyState from '../components/EmptyState';

interface OperationsPageProps {
  operations: Operation[];
  clients: Client[];
  onAddOperation: (operation: NewOperation) => void;
  onDeleteOperation: (operationId: number) => void;
  onUpdateOperationStatus: (operationId: number, status: OperationStatus) => void;
  setActivePage: (page: string) => void;
  preselectedClientId: number | null;
  setPreselectedClientId: (id: number | null) => void;
}

const OperationForm: React.FC<{
    clients: Client[];
    operations: Operation[];
    onSubmit: (data: NewOperation) => void;
    onCancel: () => void;
    preselectedClientId: number | null;
    setPreselectedClientId: (id: number | null) => void;
}> = ({ clients, operations, onSubmit, onCancel, preselectedClientId, setPreselectedClientId }) => {
    const [formData, setFormData] = useState<Omit<NewOperation, 'clientId'>>({
        type: 'duplicata',
        titleNumber: '',
        nominalValue: 0,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        taxa: 0,
    });
    const [clientId, setClientId] = useState<string>("");
    const [netValue, setNetValue] = useState(0);
    const [netValueKey, setNetValueKey] = useState(0);

    const [creditInfo, setCreditInfo] = useState<{ limit: number; remaining: number } | null>(null);
    const [creditWarning, setCreditWarning] = useState<string>('');
    const { addNotification } = useNotification();


    React.useEffect(() => {
        if (preselectedClientId) {
            setClientId(String(preselectedClientId));
            setPreselectedClientId(null); // Reset after use
        }
    }, [preselectedClientId, setPreselectedClientId]);

    React.useEffect(() => {
        const { nominalValue, taxa } = formData;
        if (nominalValue > 0 && taxa > 0) {
            const taxaDecimal = taxa / 100;
            // Cálculo ajustado: Valor Líquido = Nominal - (Nominal * Taxa)
            const jurosCalculado = nominalValue * taxaDecimal;
            const calculatedNetValue = nominalValue - jurosCalculado;
            setNetValue(calculatedNetValue);
        } else if (nominalValue > 0) {
            setNetValue(nominalValue);
        } else {
            setNetValue(0);
        }
        setNetValueKey(k => k + 1);
    }, [formData.nominalValue, formData.taxa]);

    React.useEffect(() => {
        if (clientId) {
            const client = clients.find(c => c.id === parseInt(clientId));
            if (client) {
                const currentExposure = operations
                    .filter(op => op.clientId === client.id && (op.status === 'aberto' || op.status === 'atrasado'))
                    .reduce((sum, op) => sum + op.nominalValue, 0);
                const remaining = client.limite_credito - currentExposure;
                setCreditInfo({ limit: client.limite_credito, remaining });
                setFormData(prev => ({ ...prev, taxa: client.taxa_juros_mensal }));
            }
        } else {
            setCreditInfo(null);
            setFormData(prev => ({...prev, taxa: 0}));
        }
    }, [clientId, clients, operations]);

    React.useEffect(() => {
        if (creditInfo && formData.nominalValue > 0 && formData.nominalValue > creditInfo.remaining) {
            setCreditWarning(`Atenção: O valor desta operação excede o limite de crédito restante de ${formatCurrency(creditInfo.remaining)}.`);
        } else {
            setCreditWarning('');
        }
    }, [formData.nominalValue, creditInfo]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'clientId') {
            setClientId(value);
        } else {
            setFormData(prev => ({ 
                ...prev, 
                [name]: name === 'nominalValue' || name === 'taxa' ? parseFloat(value) : value 
            }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientId) {
            addNotification("Por favor, selecione um cliente.", "error");
            return;
        }
        onSubmit({ ...formData, clientId: parseInt(clientId, 10) });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Cliente</label>
                    <select name="clientId" value={clientId} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100" required>
                        <option value="" disabled>Selecione um cliente</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de Título</label>
                    <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100">
                        <option value="duplicata">Duplicata</option>
                        <option value="cheque">Cheque</option>
                    </select>
                </div>
                {creditInfo && (
                    <div className="md:col-span-2 bg-slate-900/50 p-3 rounded-lg text-sm flex justify-around text-center">
                        <div>
                            <p className="text-xs text-slate-400">Limite de Crédito</p>
                            <p className="font-mono text-slate-300">{formatCurrency(creditInfo.limit)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Crédito Restante</p>
                            <p className={`font-bold ${creditInfo.remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(creditInfo.remaining)}</p>
                        </div>
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Número do Título</label>
                    <input name="titleNumber" value={formData.titleNumber} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100" required/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Valor Nominal (R$)</label>
                    <input type="number" step="0.01" name="nominalValue" value={formData.nominalValue} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100" />
                </div>
                 {creditWarning && (
                    <div className="md:col-span-2 text-center text-sm text-amber-400 bg-amber-900/50 p-2 rounded-md">
                        {creditWarning}
                    </div>
                )}
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Data de Emissão</label>
                    <input type="date" name="issueDate" value={formData.issueDate} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Data de Vencimento</label>
                    <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100" required />
                </div>
                 <div className="md:col-span-2 grid grid-cols-2 gap-4 items-end">
                     <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Taxa de Juros (%)</label>
                        <input type="number" step="0.01" name="taxa" value={formData.taxa} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100" />
                    </div>
                     <div key={netValueKey} className="bg-slate-900/50 p-3 rounded-lg text-center animate-flash-bg">
                        <p className="text-sm text-slate-400">Valor Líquido a Pagar</p>
                        <p className="font-bold text-lg text-emerald-400">{formatCurrency(netValue)}</p>
                    </div>
                </div>
            </div>
             <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="bg-slate-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-slate-700 w-full sm:w-auto">Cancelar</button>
                <button type="submit" className="bg-brand-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-brand-700 w-full sm:w-auto">Registrar Operação</button>
            </div>
        </form>
    )
}

const OperationsPage: React.FC<OperationsPageProps> = ({ operations, clients, onAddOperation, onDeleteOperation, onUpdateOperationStatus, setActivePage, preselectedClientId, setPreselectedClientId }) => {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
    const [operationToDelete, setOperationToDelete] = useState<number | null>(null);
    const [operationToUpdateStatus, setOperationToUpdateStatus] = useState<{id: number, status: OperationStatus} | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<OperationStatus | 'todos'>('todos');
    const { addNotification } = useNotification();

    const filteredOperations = useMemo(() => {
        return operations.filter(op => {
            const searchMatch = searchTerm === '' || 
                op.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                op.titleNumber.toLowerCase().includes(searchTerm.toLowerCase());
            
            const statusMatch = statusFilter === 'todos' || op.status === statusFilter;

            return searchMatch && statusMatch;
        });
    }, [operations, searchTerm, statusFilter]);


    const handleFormSubmit = (data: NewOperation) => {
        onAddOperation(data);
        addNotification('Operação registrada com sucesso!', 'success');
        setIsFormModalOpen(false);
    };

    const openDeleteModal = (operationId: number) => {
        setOperationToDelete(operationId);
        setIsConfirmDeleteModalOpen(true);
    };

    const handleDelete = () => {
        if (operationToDelete) {
            onDeleteOperation(operationToDelete);
            addNotification('Operação excluída com sucesso.', 'success');
        }
        setIsConfirmDeleteModalOpen(false);
        setOperationToDelete(null);
    };
    
    const handleStatusChangeRequest = (operationId: number, status: OperationStatus) => {
        const operation = operations.find(op => op.id === operationId);
        if (!operation || operation.status === status) return; // No change

        if (status === 'pago') {
            setOperationToUpdateStatus({ id: operationId, status: 'pago' });
        } else {
            onUpdateOperationStatus(operationId, status);
        }
    };
    
    const handleConfirmStatusUpdate = () => {
        if (operationToUpdateStatus) {
            onUpdateOperationStatus(operationToUpdateStatus.id, operationToUpdateStatus.status);
            addNotification('Status da operação atualizado.', 'info');
        }
        setOperationToUpdateStatus(null);
    };

    const statusClasses = {
        aberto: 'bg-sky-900/50 text-sky-400 border-sky-700/50 focus:ring-sky-500',
        pago: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50 focus:ring-emerald-500',
        atrasado: 'bg-red-900/50 text-red-400 border-red-700/50 focus:ring-red-500',
    };

    return (
         <div className="space-y-6 sm:space-y-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">Operações</h1>
                    <p className="text-slate-400 mt-1">Lançamento e controle de desconto de títulos.</p>
                </div>
                <button onClick={() => setIsFormModalOpen(true)} className="flex items-center justify-center gap-2 bg-brand-600 text-white font-semibold px-5 py-2 rounded-md hover:bg-brand-700 transition w-full sm:w-auto">
                    <ArrowRightLeft className="w-5 h-5" />
                    <span>Nova Operação</span>
                </button>
            </header>
            <Card padding="p-4 sm:p-6">
                 <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente, título..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-600 rounded-md py-2 pl-10 pr-4 text-slate-100 placeholder-slate-500"
                        />
                    </div>
                    <div className="relative">
                        <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                             className="w-full sm:w-48 bg-slate-900/50 border border-slate-600 rounded-md py-2 pl-10 pr-4 text-slate-100 appearance-none"
                        >
                            <option value="todos">Todos Status</option>
                            <option value="aberto">Aberto</option>
                            <option value="pago">Pago</option>
                            <option value="atrasado">Atrasado</option>
                        </select>
                    </div>
                </div>
                
                {/* Desktop View */}
                 <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-slate-700 text-sm text-slate-400">
                            <tr>
                                <th className="p-4">Cliente</th>
                                <th className="p-4">Título</th>
                                <th className="p-4">Vencimento</th>
                                <th className="p-4 text-right">Valor Nominal</th>
                                <th className="p-4 text-right">Valor Líquido</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOperations.length > 0 ? filteredOperations.map(op => (
                                <tr key={op.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4 font-semibold text-slate-100">{op.clientName}</td>
                                    <td className="p-4">
                                        <div className="font-mono text-sm">{op.titleNumber}</div>
                                        <div className="text-xs text-slate-400 capitalize">{op.type}</div>
                                    </td>
                                    <td className="p-4">{formatDate(op.dueDate)}</td>
                                    <td className="p-4 text-right font-mono">{formatCurrency(op.nominalValue)}</td>
                                    <td className="p-4 text-right font-mono text-emerald-400">{formatCurrency(op.netValue)}</td>
                                    <td className="p-4 text-center">
                                         <select
                                            value={op.status}
                                            onChange={(e) => handleStatusChangeRequest(op.id, e.target.value as OperationStatus)}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`capitalize border rounded-full px-2 py-1 text-xs font-medium appearance-none outline-none focus:ring-2 ${statusClasses[op.status]}`}
                                        >
                                            <option className="bg-slate-800 text-slate-300" value="aberto">Aberto</option>
                                            <option className="bg-slate-800 text-slate-300" value="pago">Pago</option>
                                            <option className="bg-slate-800 text-slate-300" value="atrasado">Atrasado</option>
                                        </select>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end items-center gap-1">
                                            {op.status !== 'pago' && (
                                                <button 
                                                    onClick={() => setActivePage('Recebimentos')}
                                                    className="flex items-center gap-1.5 bg-emerald-600/20 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-md hover:bg-emerald-600/40"
                                                >
                                                    <CreditCard className="w-4 h-4"/>
                                                    Receber
                                                </button>
                                            )}
                                            <button onClick={() => openDeleteModal(op.id)} className="p-2 text-slate-400 hover:text-red-400 transition-all duration-200 hover:scale-110" aria-label="Excluir Operação">
                                                <Trash2 className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7}>
                                      <EmptyState 
                                        icon={<ArrowRightLeft className="w-8 h-8" />}
                                        title="Nenhuma operação encontrada"
                                        description="Você ainda não registrou nenhuma operação ou o filtro não retornou resultados."
                                        actionText="Registrar Nova Operação"
                                        onActionClick={() => setIsFormModalOpen(true)}
                                      />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden space-y-4">
                    {filteredOperations.length > 0 ? filteredOperations.map(op => (
                         <div key={op.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-slate-100">{op.clientName}</h3>
                                    <p className="text-sm text-slate-400 font-mono capitalize">{op.type} • {op.titleNumber}</p>
                                </div>
                                <select
                                    value={op.status}
                                    onChange={(e) => handleStatusChangeRequest(op.id, e.target.value as OperationStatus)}
                                    className={`capitalize border rounded-full px-2 py-1 text-xs font-medium appearance-none outline-none focus:ring-2 ${statusClasses[op.status]}`}
                                >
                                    <option className="bg-slate-800 text-slate-300" value="aberto">Aberto</option>
                                    <option className="bg-slate-800 text-slate-300" value="pago">Pago</option>
                                    <option className="bg-slate-800 text-slate-300" value="atrasado">Atrasado</option>
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-900/30 p-3 rounded-md">
                                <div>
                                    <p className="text-xs text-slate-500">Vencimento</p>
                                    <div className="flex items-center gap-1 text-slate-200">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(op.dueDate)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500">Valor Nominal</p>
                                    <p className="font-mono text-slate-200">{formatCurrency(op.nominalValue)}</p>
                                </div>
                                 <div>
                                    <p className="text-xs text-slate-500">Taxa</p>
                                    <p className="text-slate-200">{op.taxa}%</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500">Valor Líquido</p>
                                    <p className="font-mono text-emerald-400 font-semibold">{formatCurrency(op.netValue)}</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/50">
                                {op.status !== 'pago' && (
                                    <button 
                                        onClick={() => setActivePage('Recebimentos')}
                                        className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600/20 text-emerald-400 text-sm font-semibold px-3 py-2 rounded-md hover:bg-emerald-600/40"
                                    >
                                        <CreditCard className="w-4 h-4"/>
                                        Receber
                                    </button>
                                )}
                                <button onClick={() => openDeleteModal(op.id)} className="p-2 bg-slate-700/50 rounded-lg text-red-400 hover:text-red-300 transition-colors">
                                    <Trash2 className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    )) : (
                         <EmptyState 
                            icon={<ArrowRightLeft className="w-8 h-8" />}
                            title="Nenhuma operação encontrada"
                            description="Tente ajustar os filtros ou adicione uma nova operação."
                            actionText="Registrar Nova Operação"
                            onActionClick={() => setIsFormModalOpen(true)}
                          />
                    )}
                </div>
            </Card>

            <ConfirmModal
                isOpen={isConfirmDeleteModalOpen}
                onClose={() => setIsConfirmDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Confirmar Exclusão"
                message="Tem certeza que deseja excluir esta operação? Todos os recebimentos associados também serão removidos. Esta ação não pode ser desfeita."
            />
            
            <ConfirmModal
                isOpen={!!operationToUpdateStatus}
                onClose={() => setOperationToUpdateStatus(null)}
                onConfirm={handleConfirmStatusUpdate}
                title="Confirmar Pagamento"
                message={<p>Tem certeza de que deseja marcar esta operação como <strong className="text-emerald-400">Paga</strong>? Esta ação deve ser usada quando o valor total foi recebido, mas não registrado através da tela de recebimentos.</p>}
                confirmText="Confirmar Pagamento"
                confirmButtonClass="bg-emerald-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-emerald-700"
                icon={<CheckCircle2 className="w-6 h-6 text-emerald-400" />}
            />

            <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title="Registrar Nova Operação">
                <OperationForm 
                    clients={clients} 
                    operations={operations} 
                    onSubmit={handleFormSubmit} 
                    onCancel={() => setIsFormModalOpen(false)}
                    preselectedClientId={preselectedClientId}
                    setPreselectedClientId={setPreselectedClientId}
                />
            </Modal>
        </div>
    );
};

export default OperationsPage;
